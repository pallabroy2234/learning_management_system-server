import express, {Response, Request, NextFunction} from 'express';
import cors from 'cors';

import dotenv from 'dotenv';
import {errorMiddleware} from "./middleware/error";

dotenv.config();
export const app = express();


// body parser
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true}));

// cors -> cross origin resource sharing
app.use(cors({
    origin: [process.env.ORIGIN as string],
}))

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