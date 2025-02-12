import express from "express";


const passportRoute = express.Router();
import {googleAuth, googleAuthCallback, handleGoogleCallback} from "../controller/passport.controller";


passportRoute.get("/google", googleAuth);
passportRoute.get("/google/callback", googleAuthCallback, handleGoogleCallback);

export default passportRoute;