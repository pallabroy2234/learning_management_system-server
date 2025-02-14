import {Request, Response, NextFunction} from "express";
import {CatchAsyncError} from "./catchAsyncError";
import {ErrorHandler} from "../utils/ErrorHandler";
import {JwtPayload, verify} from "jsonwebtoken";
import {client_base_url, jwt_access_token_secret} from "../secret/secret";
import {User} from "../model/user.model";
import {deleteImage} from "./multer";


/**
 * @description       - Check if user is authenticated
 * @middleware         - isAuthenticated
 * @access            - Private
 * */
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {

		const access_token = req.cookies.access_token;

		if (!access_token) {
			return next(new ErrorHandler("Please login first", 401));
		}

		const decode = verify(access_token, jwt_access_token_secret as string) as JwtPayload;

		if (!decode) {
			return next(new ErrorHandler("Session expired. Please log in again.", 401));
		}

		// const key = `user:${(decode as JwtPayload)._id}`;
		// const user = await redisCache.get(key);

		const user = await User.findOne({_id: decode._id});

		if (!user) {
			return next(new ErrorHandler("User not found", 404));
		}

		// set user in req object
		req.user = user;
		next();
	} catch (err: any) {
		if (err.name === "TokenExpiredError") {
			return next(new ErrorHandler("Session expired. Please log in again.", 401));
		}
		return next(err);
	}
});


/**
 * @description       - Check if user is logged out
 * @middleware         - isLoggedOut
 * @access            - Public
 * */
export const isLoggedOut = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const access_token = req.cookies.access_token;

		if (access_token) {
			return next(new ErrorHandler("You are already logged in", 400));
		}
		next();
	} catch (error) {
		next(error);
	}
};

/**
 * @description       - Check if user is authorized
 * @middleware         - authorizeRole
 * @access            - Private
 * @middleware         - authorizeRole
 * */
export const authorizeRole = (...roles: string[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (!roles.includes((req.user as any).role || "")) {
			// if any error and has file delete the file || image
			if (req.file) {
				deleteImage(req.file?.path);
			}
			return next(new ErrorHandler(`Forbidden. Only ${roles} can access this route`, 403));
		}
		next();
	};
};


// ------------------------ OAuth middleware -------------------------------->

export const isOAuthLoggedIn = (req: Request, res: Response, next: NextFunction) => {
	const accessToken = req.cookies.access_token;
	const refreshToken = req.cookies.refresh_token;
	if (accessToken || refreshToken) {
		const message = encodeURIComponent("You are already logged in");
		return res.redirect(`${client_base_url}/auth/failure?error=${message}`);
	}
	next();
};


// export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         // Extract access and refresh tokens from cookies
//         const access_token = req.cookies.access_token;
//         const refresh_token = req.cookies.refresh_token;
//
//         if (!access_token) {
//             return next(new ErrorHandler("Please login first", 401));
//         }
//
//         let decoded: JwtPayload | null = null;
//
//         try {
//             // Try to verify the access token
//             decoded = verify(access_token, jwt_access_token_secret as string) as JwtPayload;
//         } catch (err: any) {
//             // Handle expired access token scenario
//             if (err.name === "TokenExpiredError" && refresh_token) {
//                 // If access token is expired but refresh token exists, try to refresh the access token
//                 return  handleUpdateAccessToken(req, res, next);
//             } else {
//                 return next(new ErrorHandler("Session expired. Please log in again.", 401));
//             }
//         }
//
//         // If the access token is valid, continue
//         if (decoded) {
//             const key = `user:${decoded._id}`;
//             const user = await redisCache.get(key);
//
//             if (!user) {
//                 return next(new ErrorHandler("User not found", 404));
//             }
//
//             // Set the user object in the request
//             req.user = JSON.parse(user);
//             return next();
//         }
//     } catch (err: any) {
//         return next(err);
//     }
// });