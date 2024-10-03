import {NextFunction, Request, Response} from "express";
import {ErrorHandler} from "../utils/ErrorHandler";
import {v2 as cloudinary} from "cloudinary";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import logger from "../config/logger";
import {Course, ICourse, IReview} from "../model/course.model";
import {deleteImage} from "../middleware/multer";
import {redisCache} from "../config/redis";
import {allowedFields, filterAllowedFields} from "../service/course.service";
import {deleteImageFromCloudinary, imageUpload} from "../utils/cloudinary";
import {IUser} from "../model/user.model";
import {IAddQuestionData, IAddReview, IQuestionReply, IReviewReply} from "../@types/types";
import {sendMail} from "../mails/sendMail";
import {Notification} from "../model/notification.model";
import {Types} from "mongoose";

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
					folder: "lms/course-thumbnail"
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

		// invalidate cache for all course keys
		const keys = await redisCache.keys("course:*");
		if (keys.length > 0) {
			await redisCache.del(keys);
		}

		return res.status(201).json({
			success: true,
			message: "Course created successfully"
		});
	} catch (err: any) {
		logger.error(`Error creating course: ${err.message}`);
		return next(err);
	}
});

/**
 * @description          - update a course
 * @route                - /api/v1/course/update/:id
 * @method               - PUT
 * @access               - Private(admin)
 *
 * */
export const handleUpdateCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const courseId = req.params.id;
		const data = req.body;
		const {result: updateField, invalidFields} = filterAllowedFields(allowedFields, data);

		if (invalidFields.length > 0) {
			return next(new ErrorHandler(`Invalid fields: ${invalidFields.join(", ")}`, 400));
		}

		const thumbnailExists = await Course.findById(courseId).select("thumbnail _id");
		if (!thumbnailExists) {
			return next(new ErrorHandler("Course not found", 404));
		}

		const thumbnail = req.file;

		let tempData = {
			public_id: "",
			url: ""
		};

		/**
		 * @note - Deletes the existing thumbnail if a new one is provided,
		 *                or if no thumbnail is included in the request body.
		 *                This ensures that the previous thumbnail is removed
		 *                when no replacement is specified.
		 */
		if (thumbnail || thumbnailExists?.thumbnail.public_id) {
			if (thumbnailExists?.thumbnail.public_id) {
				const deleteThumbnail = await deleteImageFromCloudinary(thumbnailExists?.thumbnail.public_id);
				if (deleteThumbnail instanceof ErrorHandler) {
					return next(deleteThumbnail);
				}
			}
		}

		if (thumbnail) {
			const result = await imageUpload({
				path: thumbnail.path,
				folder: "lms/course-thumbnail"
			});
			if (result instanceof ErrorHandler) {
				return next(result);
			}
			tempData = {
				public_id: result.public_id,
				url: result.url
			};
		}

		const update = await Course.findByIdAndUpdate(
			courseId,
			{
				$set: {
					...updateField,
					thumbnail: tempData
				}
			},
			{new: true}
		);
		if (!update) {
			return next(new ErrorHandler("Failed to update course", 400));
		}

		// invalidate cache for all course keys
		const keys = await redisCache.keys("course:*");
		if (keys.length > 0) {
			await redisCache.del(keys);
		}

		return res.status(200).json({
			success: true,
			message: "Updated successfully"
		});
	} catch (err: any) {
		logger.error(`Error updating course: ${err.message}`);
		return next(err);
	}
});

/**
 * @description          - get a single course
 * @route                - /api/v1/course/get-course/:id
 * @method               - GET
 * @access               - Public(only not purchased courses)
 * */
export const handleGetSingleCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const courseId = req.params.id;
		const cacheKey = `course:${courseId}`;

		let course;
		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			course = JSON.parse(data!);
		} else {
			course = await Course.findById(courseId).select(
				"-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
			);

			if (!course) {
				return next(new ErrorHandler("Course not found", 404));
			}
			// store in cache
			await redisCache.set(cacheKey, JSON.stringify(course));
		}
		return res.status(200).json({
			success: true,
			message: "Course retrieved successfully",
			payload: course
		});
	} catch (err: any) {
		logger.error(`Error getting course: ${err.message}`);
		return next(err);
	}
});

/**
 * @description          - get all courses
 * @route                - /api/v1/course/get-courses/all
 * @method               - GET
 * @access               - Public(only not purchased courses)
 * */
export const handleGetAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const cacheKey = "course:all";
		let course = [];

		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			course = JSON.parse(data!);
		} else {
			course = await Course.find({})
				.select("-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links")
				.sort({createdAt: -1});

			// store in cache
			await redisCache.set(cacheKey, JSON.stringify(course));
		}
		console.log(course);
		return res.status(200).json({
			success: true,
			message: "Courses retrieved successfully",
			payload: course || []
		});
	} catch (err: any) {
		logger.error(`Error getting all courses: ${err.message}`);
		return next(err);
	}
});

/**
 * @description          - get course content
 * @route                - /api/v1/course/get-course-content/:id
 * @method               - GET
 * @access               - Private(only purchased courses)
 *
 * */
export const handleGetCourseContent = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const courseId = req.params.id;
		const user = req.user as IUser;
		const cacheKey = `course:${courseId}-${user._id}:content`;

		const courseExists = user.courses.some((course: any) => course._id.toString() === courseId.toString());
		console.log(courseExists);

		if (!courseExists) {
			return next(new ErrorHandler("You need to purchase this course to access it", 400));
		}
		let content;

		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			content = JSON.parse(data!);
		} else {
			const course = await Course.findById(courseId);
			if (!course) {
				return next(new ErrorHandler("The course you are trying to access does not exist.", 404));
			}
			content = course?.courseData;
			// 		store in cache
			await redisCache.set(cacheKey, JSON.stringify(content));
		}
		return res.status(200).json({
			success: true,
			message: "Course data retrieved successfully",
			payload: content
		});
	} catch (err: any) {
		logger.error(`Error getting course data: ${err.message}`);
		return next(err);
	}
});

/**
 * @description        - add question to course
 * @route              - /api/v1/course/add-question
 * @method             - PUT
 * @access             - Private
 *
 * */
export const handleAddQuestion = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {question, courseId, contentId} = req.body as IAddQuestionData;
		const user = req.user as IUser;

		const course = await Course.findById(courseId);
		if (!course) {
			return next(new ErrorHandler("Course not exists", 404));
		}

		const courseContent = course?.courseData.find((item: any) => item._id.toString() === contentId.toString());
		if (!courseContent) {
			return next(new ErrorHandler("Course lesson not exists", 404));
		}

		const newQuestion: any = {
			user: user._id,
			question,
			questionReplies: []
		};

		courseContent.questions.push(newQuestion);

		const updatedCourse = await course.save();
		if (!updatedCourse) {
			return next(new ErrorHandler("Failed to add question", 400));
		}


		//  create notification for admin
		await Notification.create({
			userId: new Types.ObjectId(user._id),
			title: "New Question Received",
			message: `${user.name} has asked a question on ${courseContent.title}`
		});


		// invalidate cache for all course keys and also notification keys
		const keys = [...(await redisCache.keys("course:*")), ...(await redisCache.keys("notification:*"))];
		if (keys.length > 0) {
			await redisCache.del(keys);
		}

		return res.status(200).json({
			success: true,
			message: "Question added successfully",
			payload: course
		});
	} catch (err: any) {
		logger.error(`Error adding question: ${err.message}`);
		return next(err);
	}
});

/**
 * @description          - add answer to question
 * @route                - /api/v1/course/add-answer
 * @method               - PUT
 * @access               - Private
 *
 * */
export const handleQuestionReply = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {answer, courseId, contentId, questionId} = req.body as IQuestionReply;

		const user = req.user as IUser;

		const course: any = await Course.findById(courseId).populate({
			path: "courseData.questions.user",
			select: "name email"
		});

		if (!course) {
			return next(new ErrorHandler("Course not exists", 404));
		}

		const courseContent = course?.courseData.find((item: any) => item._id.toString() === contentId.toString());
		if (!courseContent) {
			return next(new ErrorHandler("Course lesson not exists", 404));
		}

		const question = courseContent.questions.find((item: any) => item._id.toString() === questionId.toString());
		if (!question) {
			return next(new ErrorHandler("Question not exists", 404));
		}

		//    create new answer
		const newAnswer: any = {
			user: user._id,
			answer
		};

		question.questionReplies?.push(newAnswer);

		const updatedCourse = await course.save();
		if (!updatedCourse) {
			return next(new ErrorHandler("Failed to add answer", 400));
		}


		if (user._id.toString() === question.user._id.toString()) {
			// 	create notification
			await Notification.create({
				userId: new Types.ObjectId(user._id),
				title: "You got a reply",
				message: `${user.name} has replied on your answer on ${courseContent.title}`
			});
		} else {
			const data = {
				name: question.user.name,
				title: courseContent.title
			};

			try {
				await sendMail({
					email: question.user.email,
					subject: "Question Reply",
					data,
					template: "question-reply"
				});
			} catch (err: any) {
				logger.error(`Error sending email: ${err.message}`);
				return next(new ErrorHandler("Failed to send email", 500));
			}
		}

		// invalidate cache for all course keys and also notification keys
		const keys = [...(await redisCache.keys("course:*")), ...(await redisCache.keys("notification:*"))];
		if (keys.length > 0) {
			await redisCache.del(keys);
		}

		return res.status(200).json({
			success: true,
			message: "Your answer has been added successfully",
			payload: course
		});
	} catch (err: any) {
		logger.error(`Error adding answer: ${err.message}`);
		return next(err);
	}
});


/**
 * @description          - add review to course
 * @route                - /api/v1/course/add-review/:id
 * @method               - PUT
 * @access               - Private
 * */
export const handleAddReview = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {review, rating} = req.body as IAddReview;
		const user = req.user as IUser;
		const courseId = req.params.id;

		// check if user purchased the course  || if purchased then add review
		const courseExists = user.courses.some((course: any) => course._id.toString() === courseId.toString());

		if (!courseExists) {
			return next(new ErrorHandler("You need to buy this course before leaving a review.", 400));
		}

		const course = await Course.findById(courseId);
		if (!course) {
			return next(new ErrorHandler("Course not exists", 400));
		}

		const newReview: any = {
			user: user,
			rating: rating,
			review: review

		};

		course.reviews.push(newReview);

		// 	calculating average rating
		let initial = 0;
		course.reviews.forEach((review: any) => {
			initial += review.rating;
		});
		course.rating = initial / course.reviews.length;


		// 	save course
		const save = await course.save();
		if (!save) {
			return next(new ErrorHandler("Failed to add review", 400));
		}


		// 	prepared  notification message
		const notification = {
			title: "New Review Received",
			message: `${user.name} has given a review on ${course.name}`
		};

		// create notification

		return res.status(200).json({
			success: true,
			message: "Thanks for your review!",
			payload: course
		});
	} catch (err: any) {
		logger.error(`Error adding review: ${err.message}`);
		return next(err);
	}
});


/**
 * @description          - handle review reply
 * @route                - /api/v1/course/review-reply
 * @method               - PUT
 * @access               - Private(only reply admin)
 * */
export const handleReviewReply = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {reply, reviewId, courseId} = req.body as IReviewReply;
		const user = req.user as IUser;

		const course = await Course.findById(courseId).populate({
			path: "reviews.user",
			select: "name email avatar role createdAt updatedAt	"
		}) as ICourse;

		// 	check if course exists or not
		if (!course) {
			return next(new ErrorHandler("Course not exists", 404));
		}

		const review = course.reviews.find((item: any) => item._id.toString() === reviewId.toString());
		if (!review) {
			return next(new ErrorHandler("Review not exists", 404));
		}

		const newReply: any = {
			user: user._id,
			reply: reply
		};

		review.reviewReplies.push(newReply);

		const updatedCourse = await course.save();
		if (!updatedCourse) {
			return next(new ErrorHandler("Failed to add review reply", 400));
		}

		// * Re-populate the review replies with the user information for the reply
		await updatedCourse.populate({
			path: "reviews.reviewReplies.user",
			select: "name email avatar role createdAt updatedAt"
		});

		// invalidate cache for all course keys
		const keys = await redisCache.keys("course:*");
		if (keys.length > 0) {
			await redisCache.del(keys);
		}


		return res.status(200).json({
			success: true,
			message: "Reply added successfully",
			payload: course
		});
	} catch (err: any) {
		console.log(err);
		logger.error(`Error adding review reply: ${err.message}`);
		return next(err);
	}
});
