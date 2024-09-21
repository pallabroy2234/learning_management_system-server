import {IRegistrationBody} from "../types/types";
import {Secret, sign} from "jsonwebtoken";
import * as dotenv from 'dotenv';

dotenv.config();

interface IActivationToken {
    token: string,
    activationCode: string
}


export const createActivationToken = (user: IRegistrationBody): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = sign({user, activationCode}, process.env.JWT_ACTIVATION_SECRET as Secret, {expiresIn: "2m"})
    return {token, activationCode}
}