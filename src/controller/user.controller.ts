import {Request, Response, NextFunction} from "express";
import {IUser, User} from "../model/user.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import {sendMail} from "../mails/sendMail";
import {
    IActivationRequest,
    ICreatePassword,
    ILoginRequest,
    IRegistrationBody,
    IUpdatePassword,
    IUpdateUserInfo
} from "../@types/types";
import {createActivationToken, createToken} from "../utils/jsonwebtoken";
import logger from "../config/logger";
import {JwtPayload, verify} from "jsonwebtoken";
import {redisCache} from "../config/redis";
import {jwt_activation_secret, jwt_refresh_token_secret} from "../secret/secret";
import {v2 as cloudinary} from "cloudinary";
import {deleteImage} from "../middleware/multer";
import {deleteImageFromCloudinary} from "../utils/cloudinary";


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
            message: `Login successfully`
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

        // if password is empty then return error
        if (!isExists.password) {
            return next(new ErrorHandler("Invalid credentials", 400))
        }


        const isPasswordMatch = await isExists.comparePassword(password);
        if (!isPasswordMatch) {
            return next(new ErrorHandler("Incorrect password", 400))
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
        logger.error(`handleLogin:${err.message}`)
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

        const userId = (req.user as any)._id || "";
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


/**
 * @description         - Get user info
 * @path                - /api/v1/user/user-info
 * @method              - GET
 * @access              - Private
 * */

export const handleGetUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = (req.user as any)._id || "";
        const key = `user:${id}`;

        const keyExists = await redisCache.exists(key);

        let user;

        if (keyExists === 1) {
            const data = await redisCache.get(key);
            user = JSON.parse(data!);
        } else {
            user = await User.findOne({_id: id})
            if (!user) {
                return next(new ErrorHandler("User not found", 404))
            }
            await redisCache.set(key, JSON.stringify(user));
        }
        return res.status(200).json({
            success: true,
            message: "User info fetched successfully",
            payload: user
        })
    } catch (err: any) {
        logger.error(`handleGetUserInfo:${err.message}`)
        return next(err)
    }

})


/**
 * @description         - Update user info
 * @path                - /api/v1/user/update-info
 * @method              - PUT
 * @access              - Private
 * @body                - {name: string, email: string}
 * */
export const handleUpdateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allowedField: string[] = ["name", "email"];
        const id = (req.user as IUser)._id

        const isUserExists = await User.findById(id);

        if (!isUserExists) {
            return next(new ErrorHandler("User not found", 404))
        }

        let updates: Record<string, string> = {};

        for (let key in req.body) {
            if (allowedField.includes(key)) {
                updates[key as keyof IUpdateUserInfo] = req.body[key];
            } else {
                return next(new ErrorHandler(`Field: ${key} is not allowed`, 400))
            }
        }


        // Check if updates object is empty
        if (Object.keys(updates).length === 0) {
            return next(new ErrorHandler("No fields to update", 400))
        }


        //  check email already exists
        if (updates.email) {
            const isEmailExists = await User.findOne({email: updates.email});
            if (isEmailExists) {
                return next(new ErrorHandler("Email already exists", 409))
            }
        }

        const updateUserInfo = await User.findByIdAndUpdate(id, updates, {new: true})

        // cache updated
        const cacheKey = `user:${id}`;
        await redisCache.set(cacheKey, JSON.stringify(updateUserInfo));

        return res.status(200).json({
            success: true,
            message: "Updated successfully",
        })
    } catch (err: any) {
        logger.error(`handleUpdateUserInfo:${err.message}`)
        return next(err)
    }
})


/**
 * @description         - Update password
 * @path                - /api/v1/user/update-password
 * @method              - PUT
 * @access              - Private
 * @body                - {oldPassword: string, newPassword: string}
 * */
export const handleUpdatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const {oldPassword, newPassword} = req.body as IUpdatePassword;

        let user = await User.findOne({_id: (req.user as IUser)._id}).select("+password");


        if (!user) {
            return next(new ErrorHandler("User not found", 404))
        }


        if (!user.password) {
            return next(new ErrorHandler("Invalid credentials", 400))
        }

        // compare old password
        const isPasswordMatch = await user.comparePassword(oldPassword as string);

        if (!isPasswordMatch) {
            return next(new ErrorHandler("Incorrect old password", 400))
        }


        // update password
        user.password = newPassword
        await user.save()

        // cache updated
        const cacheKey = `user:${user._id}`;
        await redisCache.set(cacheKey, JSON.stringify(user));

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        })
    } catch (err: any) {
        console.log(err)
        logger.error(`handleUpdatePassword:${err.message}`)
        return next(err)
    }
})


/**
 * @description         - Create password(only for social login)
 * @path                - /api/v1/user/create-password
 * @method              - POST
 * @access              - Private
 * @body                - {newPassword: string, confirmPassword: string}
 * */

export const handleCreatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {newPassword, confirmPassword} = req.body as ICreatePassword;
        const id = (req.user as IUser)._id;

        const user = await User.findOne({_id: id}).select("+password");
        if (!user) {
            return next(new ErrorHandler("User not found", 404))
        }

        if (user.password) {
            return next(new ErrorHandler("You already have password", 400))
        }


        user.password = newPassword;
        await user.save();

        //     cache update
        const cacheKey = `user:${user._id}`;
        await redisCache.set(cacheKey, JSON.stringify(user));

        return res.status(200).json({
            success: true,
            message: "Password created successfully"
        })
    } catch (err: any) {
        logger.error(`handleCreatePassword:${err.message}`)
        return next(err)
    }
})



/**
 * @description         - Update avatar
 * @path                - /api/v1/user/update-avatar
 * @method              - PUT
 * @access              - Private
 * @body                - {avatar: string}
* */
export const handleUpdateAvatar = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {avatar: string} = req.body;
        const user = req.user as IUser;

        let isExists = await User.findOne({_id: user._id});
        if (!isExists) {
            return next(new ErrorHandler("User not found", 404))
        }


        const avatar = req.file

        let url = ""
        let public_id = ""


        if (avatar) {
            try {
                if (user.avatar.public_id) {
                    const deleteImage = await deleteImageFromCloudinary(user.avatar.public_id)
                    if (deleteImage instanceof ErrorHandler) {
                        return next(deleteImage)
                    }
                }
                const result = await cloudinary.uploader.upload(avatar.path, {
                    folder: "lms/avatar",
                    width: 150,
                })
                url = result.secure_url;
                public_id = result.public_id;
                // after successfully upload image delete image from local storage
                deleteImage(avatar.path)
            } catch (err: any) {
                return next(new ErrorHandler("Failed to upload image", 400))
            }
        }


        // update avatar in data base
        isExists.avatar = {
            url,
            public_id
        }

        const updateAvatar = await isExists.save()
        if (!updateAvatar) {
            return next(new ErrorHandler("Failed to update avatar", 400))
        }


        // cache update
        const cacheKey = `user:${user._id}`;
        await redisCache.set(cacheKey, JSON.stringify(updateAvatar));


        return res.status(200).json({
            success: true,
            message: "Avatar updated successfully",
        })
    } catch (err: any) {
        logger.error(`handleUpdateProfileImage:${err.message}`)
        return next(err)
    }
})