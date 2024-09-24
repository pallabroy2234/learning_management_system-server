import passport from "passport";
import {NextFunction, Request, Response} from "express";
import {createToken} from "../utils/jsonwebtoken";
import {redisCache} from "../config/redis";


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
    passport.authenticate('google', {session: false}, async (err: any, user: any, info: any) => {
        if (err) {
            if (err.name === 'TokenError') {
                return res.status(400).json({
                    success: false,
                    message: "Invalid token.Try again !",
                });
            }
            return next(err);
        }

        // user info store in cache
        const cacheKey = `user:${user._id}`;
        await redisCache.set(cacheKey, JSON.stringify(user));

        // generate token
        createToken(user, res);
        res.status(200).json({
            success: true,
            message: "Logged in successfully",
        })
    })(req, res, next);
}

