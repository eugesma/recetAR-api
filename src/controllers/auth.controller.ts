import { Request, Response } from 'express';
import * as JWT from 'jsonwebtoken';
import { env, httpCodes } from '../config/config';
import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';

import IUser from '../interfaces/user.interface';
import User from '../models/user.model';
import IRole from '../interfaces/role.interface';
import Role from '../models/role.model';
import { renderHTML, MailOptions, sendMail } from '../utils/roboSender/sendEmail';

class AuthController {

  public register = async (req: Request, res: Response): Promise<Response> => {
    try {
      const { username, email, enrollment, cuil, businessName, password, roleType } = req.body;
      const newUser = new User({ username, email, password, enrollment, cuil, businessName });
      const role: IRole = await Role.schema.methods.findByRoleOrCreate(roleType);
      newUser.roles.push(role);
      role.users.push(newUser);
      await newUser.save();
      await role.save();
      this.sendEmailNewUser(newUser);
      return res.status(200).json({
        newUser
      });

    } catch (e) {
      let errors: { [key: string]: string } = {};
      Object.keys(e.errors).forEach(prop => {
        errors[prop] = e.errors[prop].message;
      });
      return res.status(422).json(errors);
    }
  }

  public resetPassword = async (req: Request, res: Response): Promise<Response> => {
    const { _id } = req.user as IUser;
    const { oldPassword, newPassword } = req.body;
    try {
      const user: IUser | null = await User.findOne({ _id });
      if (!user) return res.status(404).json('No se ha encontrado el usuario');
      const isMatch: boolean = await User.schema.methods.isValidPassword(user, oldPassword);
      if (!isMatch) return res.status(401).json({ message: 'Su contraseña actual no coincide con nuestros registros' });

      await user.update({ password: newPassword });
      return res.status(200).json('Se ha modificado la contraseña correctamente!');
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public recoverPassword = async (req: Request, res: Response): Promise<Response> => {
    const { authenticationToken, newPassword } = req.body;
    try {
      const user: IUser | null = await User.findOne({ authenticationToken: authenticationToken });
      if (!user) return res.status(404).json('No se ha encontrado el usuario');

      await user.update({ password: newPassword });
      return res.status(200).json('Se ha modificado la contraseña correctamente!');
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public login = async (req: Request, res: Response): Promise<Response> => {
    const { _id } = req.user as IUser;
    try {

      const user: IUser | null = await User.findOne({ _id }).populate({ path: 'roles', select: 'role' });

      if (user) {
        const roles: string | string[] = [];
        await Promise.all(user.roles.map(async (role) => {
          roles.push(role.role);
        }));
        const token = this.signInToken(user._id, user.username, user.businessName, roles);

        const refreshToken = uuidv4();
        await User.updateOne({ _id: user._id }, { refreshToken: refreshToken });
        return res.status(200).json({
          jwt: token,
          refreshToken: refreshToken
        });
      }

      return res.status(httpCodes.EXPECTATION_FAILED).json('Debe iniciar sesión');//in the case that not found user
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public logout = async (req: Request, res: Response): Promise<Response> => {
    const { refreshToken } = req.body;
    try {
      await User.findOneAndUpdate({ refreshToken: refreshToken }, { refreshToken: '' });
      return res.status(204).json('Logged out successfully!');
    } catch (err) {
      console.log(err);
      return res.status(500).json("Server error");
    }
  }

  public refresh = async (req: Request, res: Response): Promise<Response> => {
    const refreshToken = req.body.refreshToken;
    try {
      const user: IUser | null = await User.findOne({ refreshToken: refreshToken }).populate({ path: 'roles', select: 'role' });

      if (user) {
        // in next version, should embed roles information
        const roles: string | string[] = [];
        await Promise.all(user.roles.map(async (role) => {
          roles.push(role.role);
        }));

        const token = this.signInToken(user._id, user.username, user.businessName, roles);

        // generate a new refresh_token
        const refreshToken = uuidv4();
        await User.updateOne({ _id: user._id }, { refreshToken: refreshToken });
        return res.status(200).json({
          jwt: token,
          refreshToken: refreshToken
        });
      }

      return res.status(httpCodes.EXPECTATION_FAILED).json('Debe iniciar sesión');//in the case that not found user

    } catch (err) {
      console.log(err);
      return res.status(500).json('Server error');
    }

  }

  public updateUser = async (req: Request, res: Response): Promise<Response> => {
    // "email", "password", "username", "enrollment", "cuil", "businessName",
    // son los campos que permitiremos actualizar.
    const { id } = req.params;
    const values: any = {};
    try {

      _(req.body).forEach((value: string, key: string) => {
        if (!_.isEmpty(value) && _.includes(["email", "password", "username", "enrollment", "cuil", "businessName"], key)) {
          values[key] = value;
        }
      });
      const opts: any = { runValidators: true, new: true, context: 'query' };
      const user: IUser | null = await User.findOneAndUpdate({ _id: id }, values, opts).select("username email cuil enrollment businessName");

      return res.status(200).json(user);
    } catch (e) {
      // formateamos los errores de validacion
      if (e.name !== 'undefined' && e.name === 'ValidationError') {
        let errors: { [key: string]: string } = {};
        Object.keys(e.errors).forEach(prop => {
          errors[prop] = e.errors[prop].message;
        });
        return res.status(422).json(errors);
      }
      console.log(e);
      return res.status(500).json("Server Error");
    }
  }

  public getUser = async (req: Request, res: Response): Promise<Response> => {
    // obtenemos los datos del usuario, buscando por: "email" / "username" / "cuil"
    const { email, username, cuil } = req.body;
    try {
      const users: IUser[] | null = await User.find({
        $or: [{ "email": email }, { "username": username }, { "cuil": cuil }]
      }).select("username email cuil enrollment, businessName");

      if (!users) return res.status(400).json('Usuario no encontrado');

      return res.status(200).json(users);
    } catch (err) {
      console.log(err);
      return res.status(500).json("Server Error");
    }
  }

  public assignRole = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const { roleId } = req.body;
    try {
      const role: IRole | null = await Role.findOne({ _id: roleId });
      if (role) {
        await User.findByIdAndUpdate({ _id: id }, {
          roles: role
        });
      }
      const user: IUser | null = await User.findOne({ _id: id });
      return res.status(200).json(user);
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  /* modificar toke */
  public getToken = async (req: Request, res: Response): Promise<Response> => {
    const { username } = req.body;

    try {
      const user: IUser | null = await User.findOne({ username: username }).populate({ path: 'roles', select: 'role' });
      if (!user) {
        return res.status(422).json({ message: "Usuario no encontrado." });
      }
      // in next version, should embed roles information
      const roles: string | string[] = [];
      await Promise.all(user.roles.map(async (role) => {
        roles.push(role.role);
      }));

      const token = JWT.sign({
        iss: "recetar.andes",
        sub: user._id,
        usrn: user.username,
        bsname: user.businessName,
        rl: roles,
        iat: new Date().getTime()
      }, (process.env.JWT_SECRET || env.JWT_SECRET), {
        algorithm: 'HS256'
      });
      return res.status(200).json({ jwt: token });
    } catch (err) {
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  private signInToken = (userId: string, username: string, businessName: string, role: string | string[]): any => {
    const token = JWT.sign({
      iss: "recetar.andes",
      sub: userId,
      usrn: username,
      bsname: businessName,
      rl: role,
      iat: new Date().getTime(),
      exp: new Date().setDate(new Date().getDate() + env.TOKEN_LIFETIME)
    }, (process.env.JWT_SECRET || env.JWT_SECRET), {
      algorithm: 'HS256'
    });
    return token;
  }

  /**
 * Envía un link para recuperar la contraseña en caso qeu sea un usuario temporal con email (fuera de onelogin).
 * AuthUser
 */
  public setValidationTokenAndNotify = async (username: string) => {
    try {
      let usuario: any = await User.findOne({ username });
      if (usuario) {
        usuario.authenticationToken = uuidv4();
        await usuario.save();

        const extras: any = {
          titulo: 'Recuperación de contraseña',
          usuario,
          url: `${process.env.APP_DOMAIN}/auth/recovery-password/${usuario.authenticationToken}`,
        };
        const htmlToSend = await renderHTML('emails/recover-password.html', extras);
        const options: MailOptions = {
          from: `${process.env.EMAIL_USERNAME}`,
          to: usuario.email.toString(),
          subject: 'Recuperación de contraseña',
          text: '',
          html: htmlToSend,
          attachments: null
        };

        await sendMail(options);
        return usuario;
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  public sendEmailNewUser = async (newUser: any) => {
    const extras: any = {
      titulo: 'Nuevo usuario',
      usuario: newUser,
    };
    const htmlToSend = await renderHTML('emails/new-user.html', extras);
    const options: MailOptions = {
      from: `${process.env.EMAIL_HOST}`,
      to: newUser.email.toString(),
      subject: 'Nuevo Usuario RecetAR',
      text: '',
      html: htmlToSend,
      attachments: null
    };
    await sendMail(options);
  }

}

export default new AuthController();
