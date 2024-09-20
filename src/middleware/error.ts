import {ErrorHandler} from "../utils/ErrorHandler";
import {NextFunction, Response, Request} from "express";


export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // ! wrong mongodb id error
    if (err.name === "CastError") {
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 404);
    }

    // ! Duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);
    }

    // ! Validation error (e.g., mongoose schema validation)
    if (err.name === "ValidationError") {
        const message = Object.values(err.errors).map((value: any) => value.message).join(", ");
        err = new ErrorHandler(message, 400);
    }

    // ! Missing required fields or invalid data type
    if (err.name === "TypeError") {
        const message = `Type error: ${err.message}`;
        err = new ErrorHandler(message, 400);
    }

    // ! wrong jwt error
    if (err.name === "JsonWebTokenError") {
        const message = "Json Web Token is invalid. Try again!!!";
        err = new ErrorHandler(message, 400);
    }

    // !  jwt expired error
    if (err.name === "TokenExpiredError") {
        const message = "Json Web Token is expired. Try again!!!";
        err = new ErrorHandler(message, 400);
    }

    return res.status(err.statusCode).json({
        success: false,
        message: err.message
    })

}