import express from "express";
import {handleCreateCourse} from "../controller/course.controller";
import {createCourseValidator} from "../validator/course.validator";
import {runValidation} from "../validator";
import {isAuthenticated} from "../middleware/auth";
import {upload} from "../middleware/multer";


export const courseRoute = express.Router();



/**
 * @description          - create a course
 * @route                - /api/v1/course/create
 * @method               - POST
 * @access               - Private
 *
* */

courseRoute.post("/create", upload.single("thumbnail"), isAuthenticated, createCourseValidator, runValidation(422), handleCreateCourse)