import {Request, Response, NextFunction} from "express";
import {IUser, User} from "../model/user.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import * as dotenv from 'dotenv';
import {sendMail} from "../mails/sendMail";
import {IRegistrationBody} from "../types/types";
import {createActivationToken} from "../utils/jsonwebtoken";
import logger from "../config/logger";
import {verify} from "jsonwebtoken";

dotenv.config();


/**
 * @description       - Create new user
 * @path             - /api/v1/user/register
 * */

// register user
export const handleRegisterUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {name, email, password} = req.body as IRegistrationBody;

        //    check email already exists
        const isEmailExists = await User.findOne({email});

        if (isEmailExists) {
            return next(new ErrorHandler("Email already exists", 400))
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


// activation user REQUEST BODY

export interface IActivationRequest {
    activation_token: string
    activation_code: string
}

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
            return next(new ErrorHandler("Email already exists", 400))
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

