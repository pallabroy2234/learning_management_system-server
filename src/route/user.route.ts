import express from "express";
import {handleActivateUser, handleRegisterUser} from "../controller/user.controller";
import {userActiveValidator, userRegisterValidator} from "../validator/user.validator";
import {runValidation} from "../validator";

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