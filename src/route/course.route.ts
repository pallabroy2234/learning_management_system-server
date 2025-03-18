import express from "express";
import {
	handleAddQuestion, handleAddReview,
	handleCreateCourse, handleDeleteCourseByAdmin, handleGenerateVideoUrl,
	handleGetAllCourses,
	handleGetCourseContent, handleGetCoursesByAdmin,
	handleGetSingleCourseAdmin, handleGetSingleCourseUser,
	handleQuestionReply, handleReviewReply,
	handleUpdateCourse
} from "../controller/course.controller";
import {
	addAnswerValidator,
	addQuestionValidator,
	addReviewValidator,
	createCourseValidator, validateReviewReply
} from "../validator/course.validator";
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
	handleCreateCourse
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
	handleUpdateCourse
);


/**
 * @description          - get single course for user
 * @route                - /api/v1/course/get-course/user/:id
 * @method               - GET
 * @access               - Public(only not purchased courses)
* */



courseRoute.get("/get-course/user/:id", handleGetSingleCourseUser);

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

/**
 * @description          - add question to course
 * @route                - /api/v1/course/add-question
 * @method               - PUT
 * @access               - Private
 * */

courseRoute.put("/add-question", isAuthenticated, addQuestionValidator, runValidator(422), handleAddQuestion);


/**
 * @description          - add answer to question
 * @route                - /api/v1/course/add-answer
 * @method               - PUT
 * @access               - Private
 * */

courseRoute.put("/add-answer", isAuthenticated, addAnswerValidator, runValidator(422), handleQuestionReply);

/**
 * @description          - add review to course
 * @route                - /api/v1/course/add-review/:id
 * @method               - PUT
 * @access               - Private
 * */

courseRoute.put("/add-review/:id", isAuthenticated, addReviewValidator, runValidator(422), handleAddReview);

/**
 * @description          - handle review reply
 * @route                - /api/v1/course/review-reply
 * @method               - PUT
 * @access               - Private(only access by admin)
 * */

courseRoute.put("/review-reply", isAuthenticated, authorizeRole("admin"), validateReviewReply, runValidator(422), handleReviewReply);


/**
 * @description          - get all courses for admin
 * @route                - /api/v1/course/get-all-courses/admin
 * @method               - GET
 * @access               - Private(admin)
 * */

courseRoute.get("/get-all-courses/admin", isAuthenticated, authorizeRole("admin"), handleGetCoursesByAdmin);



/**
 * @description          - get single course for admin
 * @route                - /api/v1/course/get-course/admin/:id
 * @method               - GET
 * @access               - Private(admin)
 *
* */

courseRoute.get("/get-course/admin/:id", isAuthenticated, authorizeRole("admin"), handleGetSingleCourseAdmin);

/**
 * @description          - delete course by admin
 * @route                - /api/v1/course/course-delete/:id
 * @method               - DELETE
 * @access               - Private(admin)
 * */

courseRoute.delete("/course-delete/:id", isAuthenticated, authorizeRole("admin"), handleDeleteCourseByAdmin);


/**
 * @description          - generate video url
 * @route                - /api/v1/course/getVdoCipherOTP
 * @method               - POST
* */

courseRoute.post("/getVdoCipherOTP", handleGenerateVideoUrl);