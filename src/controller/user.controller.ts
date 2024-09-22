import {Request, Response, NextFunction} from "express";
import {IUser, User} from "../model/user.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import {sendMail} from "../mails/sendMail";
import {IActivationRequest, ILoginRequest, IRegistrationBody} from "../types/types";
import {createActivationToken, createToken} from "../utils/jsonwebtoken";
import logger from "../config/logger";
import {JwtPayload, verify} from "jsonwebtoken";
import {redisCache} from "../config/redis";
import {jwt_activation_secret, jwt_refresh_token_secret} from "../secret/secret";


/**
 * @description       - Create new user
 * @path             - /api/v1/user/register
 * @method            - POST
 * @access            - Public
 * @body             - {name: string, email: string, password: string}
 * */

// register user
export const handleRegisterUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {name, email, password} = req.body as IRegistrationBody;

        //    check email already exists
        const isEmailExists = await User.findOne({email});

        if (isEmailExists) {
            return next(new ErrorHandler("Email already exists", 409))
        }
        //  activation token
        const activationToken = createActivationToken({name, email, password} as IRegistrationBody);

        //   activation code to send email
        try {
            await sendMail({
                email: email,
                subject: "Active your account",
                data: {name, activationCode: activationToken.activationCode}
            })

            return res.status(201).json({
                success: true,
                message: `Please check your email: ${email} to activate your account`,
                activationCode: activationToken.token
            })

        } catch (err: any) {
            logger.error(`handleRegisterUser:${err.message}`)
            return next(new ErrorHandler("Something went wrong", 400))
        }
    } catch (err: any) {
        logger.error(`handleRegisterUser:${err.message}`)
        return next(new ErrorHandler("Something went wrong. Please try again later", 400))
    }
})


/**
 * @description       - Activate user
 * @path             - /api/v1/user/activate-user
 * @method            - POST
 * @access            - Public
 * @body             - {activation_token: string, activation_code: string}
 * */
export const handleActivateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {activation_token, activation_code} = req.body as IActivationRequest;

        //   verify activation token
        const newUser = verify(activation_token, jwt_activation_secret as string) as {
            user: IUser;
            activationCode: string;
        };

        //   check activation code
        if (newUser.activationCode !== activation_code) {
            return next(new ErrorHandler("Invalid activation code", 400))
        }

        // if activation code is correct then create new user

        const {name, email, password} = newUser.user
        //  check user exits
        const isUserExists = await User.findOne({email});

        if (isUserExists) {
            return next(new ErrorHandler("Email already exists", 409))
        }

        //   if user not exists then create new user
        const user = await User.create({
            name,
            email,
            password
        })

        // if user not created and error occurs
        if (!user) {
            return next(new ErrorHandler("Something went wrong", 400))
        }

        return res.status(201).json({
            success: true,
            message: `Welcome ${name} your account has been created successfully`
        })
    } catch (err: any) {
        return next(err)
    }
})


/**
 * @description         - Login user
 * @path                - /api/v1/user/login
 * @method              - POST
 * @access              - Public
 * @body                - {email: string, password: string}
 *
 * */

export const handleLogin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {email, password} = req.body as ILoginRequest;

        // check user Exists
        const isExists = await User.findOne({email}).select("+password");
        if (!isExists) {
            return next(new ErrorHandler("Invalid credentials", 400))
        }

        const isPasswordMatch = await isExists.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Wrong password", 400))
        }
        // generate token
        const {accessToken} = createToken(isExists, res);


        //  ! remove password from user object
        // Destructure to remove the password from the user object
        const {password: _, ...userWithoutPassword} = isExists.toObject();

        const key = `user:${userWithoutPassword._id}`;
        const keyExists = await redisCache.exists(key);
        if (!keyExists) {
            await redisCache.set(key, JSON.stringify(userWithoutPassword));
        }

        return res.status(200).json({
            success: true,
            message: "Login successfully",
            payload: userWithoutPassword,
            accessToken,
        })
    } catch (err: any) {
        return next(err)
    }
})


/**
 * @description         - Logout user
 * @path                - /api/v1/user/logout
 * @method              - GET
 * @access              - Private
 * */
export const handleLogout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", {maxAge: 1});
        res.cookie("refresh_token", "", {maxAge: 1});

        const userId = req.user?._id || ""
        const key = `user:${userId}`;

        const keyExists = await redisCache.exists(key);

        // invalidate the user session
        if (keyExists === 1) {
            await redisCache.del(key);
        }

        return res.status(200).json({
            success: true,
            message: "Logout successfully"
        })
    } catch (err: any) {
        logger.error(`handleLogout:${err.message}`)
        return next(err)
    }
})


/**
 * @description         - Refresh access token
 * @path                - /api/v1/user/refresh
 * @method              - GET
 * @access              - Private
 *
 * */
export const handleUpdateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {refresh_token} = req.cookies;

        if (!refresh_token) {
            return next(new ErrorHandler("Please login first", 401))
        }

        const decoded = verify(refresh_token, jwt_refresh_token_secret as string) as JwtPayload;
        if (!decoded) {
            return next(new ErrorHandler("Invalid token", 400))
        }

        const user = await User.findOne({_id: decoded._id});
        if (!user) {
            return next(new ErrorHandler("User not found", 404))
        }

        // generate new access token
        const {accessToken} = createToken(user, res)

        return res.status(200).json({
            success: true,
            message: "Access token updated successfully",
            payload: accessToken
        })
    } catch (err: any) {
        logger.error(`handleUpdateAccessToken:${err.message}`)
        return next(err)
    }
})











