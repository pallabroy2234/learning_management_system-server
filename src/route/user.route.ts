import express from "express";
import {
    handleActivateUser, handleGetUserInfo,
    handleLogin,
    handleLogout,
    handleRegisterUser,
    handleUpdateAccessToken
} from "../controller/user.controller";
import {userActiveValidator, userLoginValidator, userRegisterValidator} from "../validator/user.validator";
import {runValidation} from "../validator";
import {isAuthenticated, isLoggedOut} from "../middleware/auth";


export const userRouter = express.Router();


/**
 * @description       - User registration route
 * @path             - /api/v1/user/register
 * @method            - POST
 * @access            - Public
 * @handler           - handleRegisterUser
 *
 * */
userRouter.post("/register", userRegisterValidator, runValidation(422), handleRegisterUser)


/**
 * @description       - Activate user route
 * @path             - /api/v1/user/activate-user
 * @method            - POST
 * @access            - Public
 * @handler           - handleActivateUser
 *
 * */

userRouter.post("/activate-user", userActiveValidator, runValidation(422), handleActivateUser)

/**
 * @description       - User login route
 * @path             - /api/v1/user/login
 * @method            - POST
 * @access            - Public
 * @handler           - handleLogin
 * */

userRouter.post("/login", userLoginValidator, runValidation(422), isLoggedOut, handleLogin)


/**
 * @description         - User logout route
 * @path                - /api/v1/user/logout
 * @method              - GET
 * @access              - Private
 * @handler             - handleLogout
 *
 * */

userRouter.get("/logout", isAuthenticated, handleLogout)


/**
 * @description         - Refresh access token route
 * @path                - /api/v1/user/refresh
 * @method              - GET
 * @access              - Private
 * @handler             - handleUpdateAccessToken
 *
 * */

userRouter.get("/refresh", handleUpdateAccessToken)


/**
 * @description         - Get user info
 * @path                - /api/v1/user/user-info
 * @method              - GET
 * @access              - Private
 * */

userRouter.get("/user-info", isAuthenticated, handleGetUserInfo)