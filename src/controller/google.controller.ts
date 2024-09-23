import passport from "passport";
import {NextFunction, Request, Response} from "express";
import {createToken} from "../utils/jsonwebtoken";


/**
 * @description       - Handle google login
 * @route             - GET /auth/google
 * @access            - Public
 * */
export const handleGoogleLogin = passport.authenticate('google');


/**
 * @description       - Handle google callback
 * @route             - GET /auth/google/callback
 * @access            - Public
 *
 * */
export const handleGoogleCallback = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', {session: false, failureRedirect: "/login"}, (err: any, user: any, info: any) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/login');
        }
        // generate token
        createToken(user, res);
        res.status(200).json({
            success: true,
            message: "User logged in successfully",
        })
    })(req, res, next);
}

