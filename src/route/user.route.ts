import express from "express";
import {
    handleActivateUser, handleCreatePassword, handleGetUserInfo,
    handleLogin,
    handleLogout,
    handleRegisterUser,
    handleUpdateAccessToken, handleUpdateAvatar, handleUpdatePassword, handleUpdateUserInfo
} from "../controller/user.controller";
import {
    createPasswordValidator, updateAvatarValidator,
    updatePasswordValidator,
    updateUserInfoValidator,
    userActiveValidator,
    userLoginValidator,
    userRegisterValidator
} from "../validator/user.validator";
import {runValidator} from "../validator";
import {isAuthenticated, isLoggedOut} from "../middleware/auth";
import {upload} from "../middleware/multer";


export const userRouter = express.Router();


/**
 * @description       - User registration route
 * @path             - /api/v1/user/register
 * @method            - POST
 * @access            - Public
 * @handler           - handleRegisterUser
 *
 * */
userRouter.post("/register", userRegisterValidator, runValidator(422), handleRegisterUser)


/**
 * @description       - Activate user route
 * @path             - /api/v1/user/activate-user
 * @method            - POST
 * @access            - Public
 * @handler           - handleActivateUser
 *
 * */

userRouter.post("/activate-user", userActiveValidator, runValidator(422), handleActivateUser)

/**
 * @description       - User login route
 * @path             - /api/v1/user/login
 * @method            - POST
 * @access            - Public
 * @handler           - handleLogin
 * */

userRouter.post("/login", userLoginValidator, runValidator(422), isLoggedOut, handleLogin)


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


/**
 * @description         - Update user info
 * @path                - /api/v1/user/update-info
 * @method              - PUT
 * @access              - Private
 * */

userRouter.put("/update-info", isAuthenticated, updateUserInfoValidator, runValidator(422), handleUpdateUserInfo)


/**
 * @description         - Update user password
 * @path                - /api/v1/user/update-password
 * @method              - PUT
 * @access              - Private
 *
 * */

userRouter.put("/update-password", isAuthenticated, updatePasswordValidator, runValidator(422), handleUpdatePassword)


/**
 * @description         - Create password(for social login user)
 * @path                - /api/v1/user/create-password
 * @method              - POST
 * @access              - Private
 *
 * */

userRouter.post("/create-password", isAuthenticated, createPasswordValidator, runValidator(422), handleCreatePassword)


/**
 * @description         - Update user avatar
 * @path                - /api/v1/user/update-avatar
 * @method              - POST
 * @access              - Private
 *
 * */

userRouter.post("/update-avatar", upload.single("avatar"), isAuthenticated, updateAvatarValidator, runValidator(422), handleUpdateAvatar)






