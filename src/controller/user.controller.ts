import {Request, Response, NextFunction} from "express";
import {User} from "../model/user.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import * as dotenv from 'dotenv';
import {sendMail} from "../mails/sendMail";
import {IRegistrationBody} from "../types/types";
import {createActivationToken} from "../utils/jsonwebtoken";
import logger from "../config/logger";

dotenv.config();


/**
 * @description       - Create new user
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

        //  ejs html
        // const html = await renderFile(join(__dirname, "../mails/activation.mail.ejs"), {userName:name, activationCode})
        try {
            await sendMail({
                email: email,
                subject: "Active your account",
                template: "activation.mail.ejs",
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

