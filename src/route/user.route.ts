import express from "express";
import {handleRegisterUser} from "../controller/user.controller";

export const userRouter = express.Router();


userRouter.post("/register", handleRegisterUser)