import express, {Response, Request, NextFunction} from "express";
import cors from "cors";
import morgan from "morgan";
import {errorMiddleware} from "./middleware/error";
import cookieParser from "cookie-parser";
import {cloud_api_key, cloud_api_secret, cloud_name, origin} from "./secret/secret";
import passport from "./config/passport";
import {handleGoogleCallback, handleGoogleLogin} from "./controller/google.controller";
import {v2 as cloudinary} from "cloudinary";

// import routes
import {userRouter} from "./route/user.route";
import {courseRoute} from "./route/course.route";
import {orderRoute} from "./route/order.route";
import {notificationRouter} from "./route/notificaiton.route";
import {analyticsRoute} from "./route/analytics.route";
import {layoutRoute} from "./route/layout.route";


export const app = express();


// body parser
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true}));

// cookie parser
app.use(cookieParser());

// morgan
app.use(morgan("dev"));

// cors -> cross origin resource sharing
app.use(cors({
	origin: [origin as string]
}));


// passport
app.use(passport.initialize());


// routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/notification", notificationRouter);
app.use("/api/v1/analytics", analyticsRoute);
app.use("/api/v1/layout", layoutRoute);

// google auth routes
app.get("/auth/google", handleGoogleLogin);
app.get("/auth/google/callback", handleGoogleCallback);


// * cloudinary config

cloudinary.config({
	cloud_name: cloud_name as string,
	api_key: cloud_api_key as string,
	api_secret: cloud_api_secret as string
});


// unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
	const err = new Error(`Route not found - ${req.originalUrl}`) as any;
	err.statusCode = 404;
	next(err);
});

// ! error middleware
app.use(errorMiddleware);