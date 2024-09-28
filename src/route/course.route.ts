import express from "express";
import {
	handleCreateCourse,
	handleGetAllCourses,
	handleGetCourseContent,
	handleGetSingleCourse,
	handleUpdateCourse,
} from "../controller/course.controller";
import {createCourseValidator} from "../validator/course.validator";
import {runValidator} from "../validator";
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

courseRoute.post(
	"/create",
	upload.single("thumbnail"),
	isAuthenticated,
	authorizeRole("admin"),
	createCourseValidator,
	runValidator(422),
	handleCreateCourse,
);

/**
 * @description          - update a course
 * @route                - /api/v1/course/update/:id
 * @method               - PUT
 * @access               - Private(admin)
 * */

courseRoute.put(
	"/update/:id",
	upload.single("thumbnail"),
	isAuthenticated,
	authorizeRole("admin"),
	createCourseValidator,
	runValidator(422),
	handleUpdateCourse,
);

/**
 * @description          - get a single course
 * @route                - /api/v1/course/get-course/:id
 * @method               - GET
 * @access               - Public
 * */

courseRoute.get("/get-course/:id", handleGetSingleCourse);

/**
 * @description          - get all courses
 * @route                - /api/v1/course/get-courses/all
 * @method               - GET
 * @access               - Public(only not purchased courses)
 * */

courseRoute.get("/get-courses/all", handleGetAllCourses);

/**
 * @description          - get course content
 * @route                - /api/v1/course/get-course-content/:id
 * @method               - GET
 * @access               - Private(only purchased courses)
* */

courseRoute.get("/get-course-content/:id", isAuthenticated, handleGetCourseContent);
