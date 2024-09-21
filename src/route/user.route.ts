import express from "express";
import {handleActivateUser, handleRegisterUser} from "../controller/user.controller";

export const userRouter = express.Router();


userRouter.post("/register", handleRegisterUser)


userRouter.post("/activate-user", handleActivateUser)