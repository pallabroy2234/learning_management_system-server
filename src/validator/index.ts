import {validationResult} from "express-validator";
import {NextFunction, Response, Request} from "express";
import {deleteImage} from "../middleware/multer";

export const runValidation = (statusCode = 422) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                // * If there are errors, delete the image from the request
                const image = req.file;
                if (image) {
                    deleteImage(image.path);
                }
                return res.status(statusCode).json({
                    success: false,
                    message: errors.array()[0].msg,
                });
            }
            return next(); // Move next() call outside if statement to ensure it's called even if there are no errors
        } catch (error) {
            next(error);
        }
    };
};