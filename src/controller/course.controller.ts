import {Request, Response, NextFunction} from "express";
import {ErrorHandler} from "../utils/ErrorHandler";
import {v2 as cloudinary} from "cloudinary";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import logger from "../config/logger";
import {Course, ICourse} from "../model/course.model";
import {deleteImage} from "../middleware/multer";


/**
 * @description          - create a course
 * @route                - /api/v1/course/create
 * @method               - POST
 * @access               - Private
 *
 * */
export const handleCreateCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Store course data
        let tempData = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            estimatedPrice: req.body.estimatedPrice,
            tags: req.body.tags,
            level: req.body.level,
            thumbnail: {
                public_id: "",
                url: ""
            },
            demoUrl: req.body.demoUrl,
            benefits: req.body.benefits,
            prerequisites: req.body.prerequisites,
            courseData: [...req.body.courseData]
        } as ICourse;


        // Handle thumbnail upload
        const thumbnail = req.file;


        if (thumbnail) {
            try {
                const result = await cloudinary.uploader.upload(thumbnail.path, {
                    folder: "lms/course-thumbnail",
                });
                tempData.thumbnail.public_id = result.public_id;
                tempData.thumbnail.url = result.secure_url;
                deleteImage(thumbnail.path); // Remove image from local after upload
            } catch (err: any) {
                logger.error(`Error uploading thumbnail: ${err.message}`);
                return next(new ErrorHandler(err.message, 500));
            }
        }


        // Create course
        const course = await Course.create(tempData);
        if (!course) {
            return next(new ErrorHandler("Failed to create course", 400));
        }

        return res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: course
        });
    } catch (err: any) {
        logger.error(`Error creating course: ${err.message}`);
        return next(err);
    }
});