import express, {Response, Request, NextFunction} from 'express';
import cors from 'cors';
import morgan from 'morgan';

import dotenv from 'dotenv';
import {errorMiddleware} from "./middleware/error";

// import routes
import {userRouter} from "./route/user.route";
import cookieParser from "cookie-parser";

dotenv.config();
export const app = express();


// body parser
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true}));

// cookie parser
app.use(cookieParser())

// morgan
app.use(morgan("dev"))

// cors -> cross origin resource sharing
app.use(cors({
    origin: [process.env.ORIGIN as string],
}))

// routes
app.use("/api/v1/user", userRouter)


// testing api
app.get("/test", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is working"
    })
})


// unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route not found - ${req.originalUrl}`) as any
    err.statusCode = 404;
    next(err);
})

// ! error middleware
app.use(errorMiddleware)