import {Request, Response, NextFunction} from "express";
import {IUser, User} from "../model/user.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import * as dotenv from 'dotenv';
import {sendMail} from "../mails/sendMail";
import {IActivationRequest, ILoginRequest, IRegistrationBody} from "../types/types";
import {createActivationToken, createToken} from "../utils/jsonwebtoken";
import logger from "../config/logger";
import {verify} from "jsonwebtoken";

dotenv.config();


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
        const newUser = verify(activation_token, process.env.JWT_ACTIVATION_SECRET as string) as {
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
        //   generate token
        const {accessToken} = createToken(isExists, res);

        //  ! remove password from user object
        // Destructure to remove the password from the user object
        const {password: _, ...userWithoutPassword} = isExists.toObject();

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