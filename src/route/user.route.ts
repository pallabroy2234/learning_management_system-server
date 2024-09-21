import express from "express";
import {handleActivateUser, handleRegisterUser} from "../controller/user.controller";
import {userRegisterValidator} from "../validator/user.validator";
import {runValidation} from "../validator";

export const userRouter = express.Router();


userRouter.post("/register", userRegisterValidator, runValidation(422), handleRegisterUser)


userRouter.post("/activate-user", handleActivateUser)