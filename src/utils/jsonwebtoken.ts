import {IRegistrationBody} from "../types/types";
import {Secret, sign} from "jsonwebtoken";
import {Response} from "express";
import {IUser} from "../model/user.model";
import {jwt_access_token_expire, jwt_activation_secret, jwt_refresh_token_expire, node_env} from "../secret/secret";



interface IActivationToken {
    token: string,
    activationCode: string
}

// create activation token

export const createActivationToken = (user: IRegistrationBody): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = sign({user, activationCode}, jwt_activation_secret as Secret, {expiresIn: "2m"})
    return {token, activationCode}
}

interface ITokenOptions {
    expires?: Date,
    maxAge: number,
    httpOnly: boolean,
    sameSite: "strict" | "lax" | "none" | undefined,
    sucre?: boolean
}


// creat access token
export const createToken = (user: IUser, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();


    const accessTokenExpiresIn = parseInt(jwt_access_token_expire || "300")
    const refreshTokenExpiresIn = parseInt(jwt_refresh_token_expire || "1200")


    // Access token options
    const accessTokenOptions: ITokenOptions = {
        expires: new Date(Date.now() + accessTokenExpiresIn * 60 * 60 * 1000),
        maxAge: accessTokenExpiresIn * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax"
    };

    // Refresh token options
    const refreshTokenOptions: ITokenOptions = {
        expires: new Date(Date.now() + refreshTokenExpiresIn * 24 * 60 * 60 * 1000),
        maxAge: refreshTokenExpiresIn * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax"
    };

    // Only set secure flag in production
    if (node_env === "production") {
        accessTokenOptions.sucre = true;
    }

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);

    // Return tokens
    return {accessToken, refreshToken};
}
