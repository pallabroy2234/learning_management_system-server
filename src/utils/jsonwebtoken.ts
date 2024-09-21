import {IRegistrationBody} from "../types/types";
import {Secret, sign} from "jsonwebtoken";
import * as dotenv from 'dotenv';
import {Response} from "express";
import {IUser} from "../model/user.model";

dotenv.config();

interface IActivationToken {
    token: string,
    activationCode: string
}

// create activation token

export const createActivationToken = (user: IRegistrationBody): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = sign({user, activationCode}, process.env.JWT_ACTIVATION_SECRET as Secret, {expiresIn: "2m"})
    return {token, activationCode}
}

interface ITokenOptions {
    expiresIn: Date,
    maxAge: number,
    httpOnly: boolean,
    sameSite: "strict" | "lax" | "none" | undefined,
    sucre?: boolean
}


// Utility function to parse expiration time
const parseExpiryTime = (time: string): number => {
    const unit = time.slice(-1); // Get the last character
    const value = parseInt(time.slice(0, -1), 10); // Get the numeric part

    switch (unit) {
        case 's': // seconds
            return value;
        case 'm': // minutes
            return value * 60;
        case 'h': // hours
            return value * 3600;
        case 'd': // days
            return value * 86400;
        case 'y': // years
            return value * 31536000; // Approximate year length in seconds
        default:
            throw new Error('Invalid time format');
    }
};


// creat access token
export const createToken = (user: IUser, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();

    // Parse environment variable strings into seconds
    const accessTokenExpiresIn = parseExpiryTime(process.env.JWT_ACCESS_TOKEN_EXPIRE || "5m");
    const refreshTokenExpiresIn = parseExpiryTime(process.env.JWT_REFRESH_TOKEN_EXPIRE || "7d");


    // Access token options
    const accessTokenOptions: ITokenOptions = {
        expiresIn: new Date(Date.now() + accessTokenExpiresIn * 1000),
        maxAge: accessTokenExpiresIn * 1000,
        httpOnly: true,
        sameSite: "lax"
    };

    // Refresh token options
    const refreshTokenOptions: ITokenOptions = {
        expiresIn: new Date(Date.now() + refreshTokenExpiresIn * 1000),
        maxAge: refreshTokenExpiresIn * 1000,
        httpOnly: true,
        sameSite: "lax"
    };

    // Only set secure flag in production
    if (process.env.NODE_ENV === "production") {
        accessTokenOptions.sucre = true;
    }

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);


    // Return tokens
    return {accessToken, refreshToken};
}
