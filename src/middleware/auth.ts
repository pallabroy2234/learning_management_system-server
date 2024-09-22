import {Request, Response, NextFunction} from "express";
import {CatchAsyncError} from "./catchAsyncError";
import {ErrorHandler} from "../utils/ErrorHandler";
import {JwtPayload, verify} from "jsonwebtoken";
import {redisCache} from "../config/redis";


export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const access_token = req.cookies.access_token;

        if (!access_token) {
            return next(new ErrorHandler("Please login first", 401));
        }

        const decode = verify(access_token, process.env.JWT_ACCESS_TOKEN_SECRET as string) as JwtPayload;

        if (!decode) {
            return next(new ErrorHandler("Session expired. Please log in again.", 401));
        }

        const key = `user:${(decode as JwtPayload)._id}`;

        const user = await redisCache.get(key);

        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }

        // set user in req object
        req.user = JSON.parse(user);
        next()
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            return next(new ErrorHandler("Session expired. Please log in again.", 401))
        }
        return next(err)
    }
})