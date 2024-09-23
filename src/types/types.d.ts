import {IUser} from "../model/user.model";
import {Request} from "express";

export interface IRegistrationBody {
    name: string,
    email: string,
    password: string
    avatar?: string
}

export interface IActivationRequest {
    activation_token: string
    activation_code: string
}

export interface ILoginRequest {
    email: string
    password: string
}

export interface IUpdateUserInfo {
    name?: string,
    email?: string,
}


declare global {
    namespace Express {
        interface Request {
            user?: IUser
            _id?: string
            role?: string
        }
    }
}