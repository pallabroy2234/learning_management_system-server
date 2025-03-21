import { Request, Response, NextFunction } from "express";
import { IUser, User } from "../model/user.model";
import { ErrorHandler } from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import { sendMail } from "../mails/sendMail";
import {
  IActivationRequest,
  ICreatePassword,
  ILoginRequest,
  IRegistrationBody,
  IUpdatePassword,
  IUpdateUserInfo,
} from "../@types/types";
import { createActivationToken, createToken } from "../utils/jsonwebtoken";
import logger from "../config/logger";
import { JwtPayload, verify } from "jsonwebtoken";
import { redisCache } from "../config/redis";
import {
  jwt_activation_secret,
  jwt_refresh_token_secret,
} from "../secret/secret";
import { v2 as cloudinary } from "cloudinary";
import { deleteImage } from "../middleware/multer";
import { deleteImageFromCloudinary } from "../utils/cloudinary";
import mongoose, { Types } from "mongoose";
import { Order } from "../model/order.model";
import { Course } from "../model/course.model";
import { Notification } from "../model/notification.model";
import { startSession, ObjectId } from "mongoose";

/**
 * @description       - Create new user
 * @path             - /api/v1/user/register
 * @method            - POST
 * @access            - Public
 * @body             - {name: string, email: string, password: string}
 * */

// register user
export const handleRegisterUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body as IRegistrationBody;

      //    check email already exists
      const isEmailExists = await User.findOne({ email });

      if (isEmailExists) {
        return next(new ErrorHandler("Email already exists", 409));
      }
      //  activation token
      const activationToken = createActivationToken({
        name,
        email,
        password,
      } as IRegistrationBody);

      //   activation code to send email
      try {
        await sendMail({
          email: email,
          subject: "Activate your account",
          data: { name, activationCode: activationToken.activationCode },
          template: "activationMail",
        });

        return res.status(201).json({
          success: true,
          // message: `Please check your email: ${email} to activate your account`
          message: `Activation sent to ${email}`,
          activationCode: activationToken.token,
        });
      } catch (err: any) {
        logger.error(`handleRegisterUser:${err.message}`);
        return next(new ErrorHandler("Something went wrong", 400));
      }
    } catch (err: any) {
      logger.error(`handleRegisterUser:${err.message}`);
      return next(
        new ErrorHandler("Something went wrong. Please try again later", 400),
      );
    }
  },
);

/**
 * @description       - Activate user
 * @path             - /api/v1/user/activate-user
 * @method            - POST
 * @access            - Public
 * @body             - {activation_token: string, activation_code: string}
 * */
export const handleActivateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      //   verify activation token
      const newUser = verify(
        activation_token,
        jwt_activation_secret as string,
      ) as {
        user: IUser;
        activationCode: string;
      };

      //   check activation code
      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      // if activation code is correct then create new user

      const { name, email, password } = newUser.user;
      //  check user exits
      const isUserExists = await User.findOne({ email });

      if (isUserExists) {
        return next(new ErrorHandler("Email already exists", 409));
      }

      //   if user not exists then create new user
      const user = await User.create({
        name,
        email,
        password,
        avatar: {
          public_id: "",
          url: "",
        },
      });

      // if user not created and error occurs
      if (!user) {
        return next(new ErrorHandler("Something went wrong", 400));
      }

      // * invalidate cache
      const analytics = await redisCache.keys("analytics:user-*");
      if (analytics.length) {
        await redisCache.del(analytics);
      }

      return res.status(201).json({
        success: true,
        message: `Account activated successfully`,
      });
    } catch (err: any) {
      return next(err);
    }
  },
);

/**
 * @description         - Login user
 * @path                - /api/v1/user/login
 * @method              - POST
 * @access              - Public
 * @body                - {email: string, password: string}
 *
 * */

export const handleLogin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;

      // check user Exists
      const isExists = await User.findOne({ email }).select("+password");

      if (!isExists) {
        return next(new ErrorHandler("Invalid credentials", 400));
      }

      // if password is empty then return error
      if (!isExists.password) {
        return next(new ErrorHandler("Invalid credentials", 400));
      }

      const isPasswordMatch = await isExists.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Incorrect password", 400));
      }

      // generate token
      const { accessToken } = createToken(isExists, res);

      //  ! remove password from user object
      // Destructure to remove the password from the user object
      const { password: _, ...userWithoutPassword } = isExists.toObject();

      // * invalidate or update cache
      const key = `user:${userWithoutPassword._id}`;
      await redisCache.set(
        key,
        JSON.stringify(userWithoutPassword),
        "EX",
        60 * 60 * 24 * 7,
      ); // 7 days

      return res.status(200).json({
        success: true,
        message: "Login successfully",
        payload: userWithoutPassword,
        accessToken,
      });
    } catch (err: any) {
      logger.error(`handleLogin:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Logout user
 * @path                - /api/v1/user/logout
 * @method              - GET
 * @access              - Private
 * */
export const handleLogout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      const userId = (req.user as any)._id || "";
      const cacheKy = `user:${userId}`;

      // invalidate cache
      if (await redisCache.exists(cacheKy)) {
        await redisCache.del(cacheKy);
      }

      return res.status(200).json({
        success: true,
        message: "Logout successfully",
      });
    } catch (err: any) {
      logger.error(`handleLogout:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Refresh access token
 * @path                - /api/v1/user/refresh
 * @method              - GET
 * @access              - Private
 *
 * */
export const handleUpdateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refresh_token } = req.cookies;

      if (!refresh_token) {
        return next(new ErrorHandler("Please login first", 401));
      }

      const decoded = verify(
        refresh_token,
        jwt_refresh_token_secret as string,
      ) as JwtPayload;
      if (!decoded) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      const user = await User.findOne({ _id: decoded._id });
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // generate new access token
      const { accessToken } = createToken(user, res);

      return res.status(200).json({
        success: true,
        message: "Access token updated successfully",
        payload: accessToken,
      });
    } catch (err: any) {
      logger.error(`handleUpdateAccessToken:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Get user info
 * @path                - /api/v1/user/user-info
 * @method              - GET
 * @access              - Private
 * */

export const handleGetUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.user as any)._id || "";
      const cacheKey = `user:${id}`;

      let user: Omit<IUser, "password"> | IUser | null;

      if (await redisCache.exists(cacheKey)) {
        const data = await redisCache.get(cacheKey);
        user = JSON.parse(data!);
      } else {
        const isUserExists = await User.findOne({ _id: id }).select(
          "+password",
        );
        if (!isUserExists) {
          return next(new ErrorHandler("User not found", 401));
        } else {
          if (
            isUserExists?.provider === "google" ||
            (isUserExists?.provider === "github" && !isUserExists.password)
          ) {
            user = isUserExists;
            await redisCache.set(cacheKey, JSON.stringify(user));
          } else {
            const { password, ...userWithOutPassword } = isUserExists;
            user = userWithOutPassword;
            await redisCache.set(cacheKey, JSON.stringify(userWithOutPassword));
          }
        }
      }
      return res.status(200).json({
        success: true,
        message: "User info fetched successfully",
        payload: user,
      });
    } catch (err: any) {
      logger.error(`handleGetUserInfo:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Update user info
 * @path                - /api/v1/user/update-info
 * @method              - PUT
 * @access              - Private
 * @body                - {name: string, email: string}
 * */
export const handleUpdateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const allowedField: string[] = ["name", "email"];
      const allowedField: string[] = ["name"];
      const id = (req.user as IUser)._id;

      const isUserExists = await User.findById(id);

      if (!isUserExists) {
        return next(new ErrorHandler("User not found", 404));
      }

      let updates: Record<string, string> = {};

      for (let key in req.body) {
        if (allowedField.includes(key)) {
          updates[key as keyof IUpdateUserInfo] = req.body[key];
        } else {
          return next(
            new ErrorHandler(`Field: ${key} is not allowed for updating`, 400),
          );
        }
      }

      // Check if updates object is empty
      if (Object.keys(updates).length === 0) {
        return next(new ErrorHandler("No fields to update", 400));
      }

      //  check email already exists

      // if (updates.email) {
      // 	const isEmailExists = await User.findOne({email: updates.email});
      // 	if (isEmailExists) {
      // 		return next(new ErrorHandler("Email already exists", 409));
      // 	}
      // }

      const updateUserInfo = await User.findByIdAndUpdate(id, updates, {
        new: true,
      });
      if (!updateUserInfo) {
        return next(new ErrorHandler("Failed to update user info", 400));
      }

      // invalidate cache
      const userCacheKey = `user:${updateUserInfo._id}`;
      await redisCache.set(
        userCacheKey,
        JSON.stringify(updateUserInfo),
        "EX",
        60 * 60 * 24 * 7,
      ); // 7 days
      const keys = await redisCache.keys("user:admin-*");
      if (keys.length > 0) {
        await redisCache.del(keys);
      }

      return res.status(200).json({
        success: true,
        message: "Updated successfully",
        payload: updateUserInfo,
      });
    } catch (err: any) {
      logger.error(`handleUpdateUserInfo:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Update password
 * @path                - /api/v1/user/update-password
 * @method              - PUT
 * @access              - Private
 * @body                - {oldPassword: string, newPassword: string}
 * */
export const handleUpdatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      let user = await User.findOne({ _id: (req.user as IUser)._id }).select(
        "+password",
      );

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (!user.password) {
        return next(new ErrorHandler("Invalid credentials", 400));
      }

      // compare old password
      const isPasswordMatch = await user.comparePassword(oldPassword as string);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Incorrect old password", 400));
      }

      // update password
      user.password = newPassword;
      const savedPassword = await user.save();

      const { password: _, ...userWithOutPassword } = savedPassword.toObject();

      // * invalidate cache
      const userCacheKey = `user:${user._id}`;
      await redisCache.set(
        userCacheKey,
        JSON.stringify(userWithOutPassword),
        "EX",
        60 * 60 * 24 * 7,
      ); // 7 days
      const cacheKeys = await redisCache.keys("user:admin-*");
      if (cacheKeys.length > 0) {
        await redisCache.del(cacheKeys);
      }
      return res.status(200).json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (err: any) {
      logger.error(`handleUpdatePassword:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Create password(only for social login)
 * @path                - /api/v1/user/create-password
 * @method              - POST
 * @access              - Private
 * @body                - {newPassword: string, confirmPassword: string}
 * */

export const handleCreatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { confirmPassword } = req.body as ICreatePassword;
      const id = (req.user as IUser)._id;

      const user = await User.findOne({ _id: id }).select("+password");
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (user.password) {
        return next(new ErrorHandler("You already have password", 400));
      }

      user.password = confirmPassword;
      const savePassword = await user.save();

      const { password: _, ...userWithOutPassword } = savePassword.toObject();

      // * invalidate cache
      const userCacheKey = `user:${user._id}`;
      await redisCache.set(
        userCacheKey,
        JSON.stringify(userWithOutPassword),
        "EX",
        60 * 60 * 24 * 7,
      ); // 7 days
      const cacheKeys = await redisCache.keys("user:admin-*");
      if (cacheKeys.length > 0) {
        await redisCache.del(cacheKeys);
      }

      return res.status(200).json({
        success: true,
        message: "Password created successfully",
      });
    } catch (err: any) {
      logger.error(`handleCreatePassword:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Update avatar
 * @path                - /api/v1/user/update-avatar
 * @method              - PUT
 * @access              - Private
 * @body                - {avatar: string}
 * */
export const handleUpdateAvatar = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      let isExists = await User.findOne({ _id: user._id });
      if (!isExists) {
        return next(new ErrorHandler("User not found", 404));
      }

      const avatar = req.file;

      let url = "";
      let public_id = "";

      if (avatar) {
        try {
          if (user.avatar.public_id) {
            const deleteImage = await deleteImageFromCloudinary(
              user.avatar.public_id,
            );
            if (deleteImage instanceof ErrorHandler) {
              return next(deleteImage);
            }
          }
          const result = await cloudinary.uploader.upload(avatar.path, {
            folder: "lms/avatar",
            width: 150,
          });
          url = result.secure_url;
          public_id = result.public_id;
          // after successfully upload image delete image from local storage
          deleteImage(avatar.path);
        } catch (err: any) {
          return next(new ErrorHandler("Failed to upload image", 400));
        }
      }

      // update avatar in data base
      isExists.avatar = {
        url,
        public_id,
      };

      const updateAvatar = await isExists.save();
      if (!updateAvatar) {
        return next(new ErrorHandler("Failed to update avatar", 400));
      }

      // cache update
      const userCacheKey = `user:${user._id}`;
      await redisCache.set(
        userCacheKey,
        JSON.stringify(updateAvatar),
        "EX",
        60 * 60 * 24 * 7,
      ); // 7 days
      const cacheKeys = await redisCache.keys("user:admin-*");
      if (cacheKeys.length > 0) {
        await redisCache.del(cacheKeys);
      }

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
      });
    } catch (err: any) {
      logger.error(`handleUpdateProfileImage:${err.message}`);
      return next(err);
    }
  },
);

/**
 *  @description         - Get all users
 *  @path                - /api/v1/user/get-all-users
 *  @method              - GET
 *  @access              - Private(only admin)
 * */
export const handleGetAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as IUser;
      const cacheKey = `user:admin-${user._id}`;
      let users: IUser[] = [];

      if (await redisCache.exists(cacheKey)) {
        const data = await redisCache.get(cacheKey);
        users = JSON.parse(data!);
      } else {
        users = await User.find({}).sort({ createdAt: -1 });
        await redisCache.set(
          cacheKey,
          JSON.stringify(users),
          "EX",
          60 * 60 * 24 * 7,
        ); // 7 days
      }
      return res.status(200).json({
        success: true,
        message: "All users fetched successfully",
        payload: users,
      });
    } catch (err: any) {
      logger.error(`handleGetAllUsers:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Update user role
 * @path                - /api/v1/user/update-role/admin
 * @method              - PUT
 * @access              - Private(only admin)
 * */
export const handleUpdateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const { id, role } = req.body as { id: Types.ObjectId; role: string };
      const {email, role} = req.body as {email: string; role: string};


      const user = await User.findOne({email});
      if (!user) {
        return next(new ErrorHandler("User not exists", 404));
      }

      if (user.role === role) {
        return next(new ErrorHandler(`Role already ${role}`, 400));
      }
      user.role = role;
      await user.save();

      // * invalidate cache
      const userCacheKey = `user:${user._id}`;
      await redisCache.set(
        userCacheKey,
        JSON.stringify(user),
        "EX",
        60 * 60 * 24 * 7,
      ); // 7 days
      const keys = await redisCache.keys("user:admin-*");
      if (keys.length > 0) {
        await redisCache.del(keys);
      }
      return res.status(200).json({
        success: true,
        message: "Role updated successfully",
      });
    } catch (err: any) {
      logger.error(`handleUpdateUserRole:${err.message}`);
      return next(err);
    }
  },
);

/**
 * @description         - Delete user
 * @path                - /api/v1/user/delete-user/:id
 * @method              - DELETE
 * @access              - Private(only admin)
 * */
export const handleDeleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const session = await startSession(); // Start session for transaction

    try {
      const { id } = req.params as { id: string };

      if (!mongoose.isValidObjectId(id)) {
        return next(new ErrorHandler("Invalid	id", 400));
      }

      // * Start transaction
      session.startTransaction();

      const user = await User.findById(id).session(session);
      if (!user) {
        return next(new ErrorHandler("User not exists", 404));
      }

      // delete avatar from cloudinary

      if (user.avatar.public_id) {
        const deleteAvatar = await deleteImageFromCloudinary(
          user.avatar.public_id,
        );
        if (deleteAvatar instanceof ErrorHandler) {
          return next(deleteAvatar);
        }
      }

      // Delete related data in a transaction
      await Order.deleteMany({ userId: id }).session(session);
      await Course.updateMany({}, { $pull: { reviews: { user: id } } }).session(
        session,
      );
      await Course.updateMany(
        {},
        { $pull: { "courseData.$[].questions": { user: id } } },
      ).session(session);
      await Notification.deleteMany({ userId: id }).session(session);

      await User.deleteOne({ _id: id }).session(session);

      // Commit the transaction
      await session.commitTransaction();

      // invalidate cache
      const keys = [
        ...(await redisCache.keys("notification:*")),
        ...(await redisCache.keys("order:*")),
        ...(await redisCache.keys("course:*")),
        ...(await redisCache.keys("user:admin-*")),
      ];
      if (keys.length > 0) {
        await redisCache.del(keys);
      }
      if (await redisCache.exists(`user:${user._id}`)) {
        await redisCache.del(`user:${user._id}`);
      }

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (err: any) {
      await session.abortTransaction(); // Rollback transaction if something goes wrong
      logger.error(`handleDeleteUser:${err.message}`);
      return next(err);
    } finally {
      await session.endSession(); // End session
    }
  },
);
