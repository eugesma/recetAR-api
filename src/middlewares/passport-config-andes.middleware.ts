import {Request, Response, NextFunction} from 'express';
import passport from 'passport';
import passportJwt from 'passport-jwt';
import { env, httpCodes } from '../config/config';
import User from '../models/user.model';
import IUser from '../interfaces/user.interface';

const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;

// Config passport JWT strategy
// We will use Bearer token to authenticate
// This configuration checks:
//  -token expiration
//  -user exists
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: (process.env.JWT_SECRET || env.JWT_SECRET)
}, async (payload, done: (err?: any, user?: IUser | boolean, info?: {code: number, message: string}) => any | Response) => {
    try{
        // find the user specified in token
        const user = await User.findOne({ _id: payload.sub }).select('_id');

        // if user doesn't exists, handle it
        if(!user){
            return done(null, false, {code: httpCodes.EXPECTATION_FAILED, message: 'Debe iniciar sesión'});
        }

        // otherwise, return the user
        done(null, user);
    }catch(err){
        console.log('in error');
        done(err, false);
    }
}));



const authenticationMiddleware = (req: Request, res: Response, next: NextFunction, authenticationType: string) => {
    passport.authenticate(authenticationType, {session: false}, (err, user: IUser | boolean, info?: {code: number, message: string}): any | Response => {
        try{

            if (err) return next(err)

            if(typeof(info) !== 'undefined') return res.status(info.code).json({message: info.message});

            req.user = user;
            next();
        }catch(error){
            if(error.code == 'ERR_HTTP_INVALID_STATUS_CODE') return res.status(httpCodes.EXPECTATION_FAILED).json({message: 'Debe iniciar sesión'});

            return res.status(500).json('Server Error')
        }
    })(req, res, next);

};

export const checkAuthAndes = (req: Request, res: Response, next: NextFunction) => {
    authenticationMiddleware(req, res, next, 'jwt');
}
