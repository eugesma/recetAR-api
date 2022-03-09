import { Router } from 'express';
import { passportMiddlewareLocal, checkAuth } from '../middlewares/passport-config.middleware';
import authController from '../controllers/auth.controller';

class AuthRoutes {

  constructor(private router: Router = Router()) { }

  routes(): Router {

    this.router.post('/login', passportMiddlewareLocal, authController.login);
    this.router.get('/jwt-login', checkAuth, authController.login);
    // this.router.post('/register', authController.register);
    this.router.post('/logout', authController.logout);
    this.router.post('/refresh', authController.refresh);
    this.router.post('/recovery-password', authController.recoverPassword);
    this.router.post('/setValidationTokenAndNotify', async (req, res, next) => {
      try {
        const username = req.body.usuario;
        if (username) {
          const user = await authController.setValidationTokenAndNotify(username);
          if(user) {
            return res.json( { status: 'ok', msg: 'Se ha enviado un correo a su casilla!'});
          } else {
            return res.json( { status: 'notfound', msg: 'Usuario no encontrado! Por favor revise sus datos'});
          }
        }
        return next(403);

      } catch (error) {
        return next(error);
      }
    });

    return this.router;
  }
}

const authRoutes: AuthRoutes = new AuthRoutes();
export default authRoutes.routes();
