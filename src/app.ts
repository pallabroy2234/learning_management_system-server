import express, {Response, Request, NextFunction} from 'express';
import cors from 'cors';
import morgan from 'morgan';
import {errorMiddleware} from "./middleware/error";
import cookieParser from "cookie-parser";
import {origin} from "./secret/secret";
import passport from "./config/passport";
import {handleGoogleCallback, handleGoogleLogin} from "./controller/google.controller";


// import routes
import {userRouter} from "./route/user.route";


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
    origin: [origin as string],
}))


// passport
app.use(passport.initialize());


// routes
app.use("/api/v1/user", userRouter)

// google auth routes
app.get('/auth/google', handleGoogleLogin);
app.get('/auth/google/callback', handleGoogleCallback)


// unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route not found - ${req.originalUrl}`) as any
    err.statusCode = 404;
    next(err);
})

// ! error middleware
app.use(errorMiddleware)