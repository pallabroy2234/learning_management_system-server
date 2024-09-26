import express from "express";
import {handleCreateCourse} from "../controller/course.controller";
import {createCourseValidator} from "../validator/course.validator";
import {runValidation} from "../validator";
import {authorizeRole, isAuthenticated} from "../middleware/auth";
import {upload} from "../middleware/multer";


export const courseRoute = express.Router();


/**
 * @description          - create a course
 * @route                - /api/v1/course/create
 * @method               - POST
 * @access               - Private(admin)
 *
 * */

courseRoute.post("/create", upload.single("thumbnail"), isAuthenticated, authorizeRole("admin"), createCourseValidator, runValidation(422), handleCreateCourse)