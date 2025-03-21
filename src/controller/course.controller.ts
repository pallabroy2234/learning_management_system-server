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
import mongoose, {Types} from "mongoose";
import axios from "axios";
import {vdoCipher_key} from "../secret/secret";

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

		// invalidate cache
		const key = [...(await redisCache.keys("course:*")), ...(await redisCache.keys("analytics:course-*"))];
		if (key.length > 0) {
			await redisCache.del(key);
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
		const { thumbnail:previousThumbnail, ...bodyWithoutThumbnail } = req.body;

		const thumbnail = req.file;

		// 1. Validate Course Existence
		const course = await Course.findById(courseId);
		if (!course) return next(new ErrorHandler("Course not found", 404));

		// 2. Initialize Update Data
		const updateData: any = {};

		// 3. Define Allowed Fields Structure
		const allowedFields = {
			topLevel: ['name', 'description', 'price', 'estimatedPrice', 'tags', 'level', 'demoUrl'],
			nested: {
				benefits: ['title'],
				prerequisites: ['title'],
				courseData: ['title', 'videoDescription', 'videoUrl', 'videoSection', 'videoLength', 'videoPlayer', 'links', 'suggestion']
			}
		};

		// 4. Process Top-Level Fields
		allowedFields.topLevel.forEach(field => {
			if (bodyWithoutThumbnail[field] !== undefined) {
				updateData[field] = bodyWithoutThumbnail[field];
			}
		});

		// 5. Process Nested Fields with Security Filtering
		Object.keys(allowedFields.nested).forEach(nestedField => {
			if (bodyWithoutThumbnail[nestedField]) {
				updateData[nestedField] = bodyWithoutThumbnail[nestedField].map((item: any) => {
					const filteredItem: any = {};
					allowedFields.nested[nestedField as keyof typeof allowedFields.nested].forEach(subField => {
						if (item[subField] !== undefined) filteredItem[subField] = item[subField];
					});
					return filteredItem;
				});
			}
		});

		// 6. Special Handling for Complex Nested Structures (Links in CourseData)
		if (updateData.courseData) {
			updateData.courseData = updateData.courseData.map((data: any) => ({
				...data,
				links: data.links?.map((link: any) => ({
					title: link.title,
					url: link.url
				})) || []
			}));
		}



		// 8. Thumbnail Management
		if (!thumbnail && course.thumbnail?.public_id && previousThumbnail === "null") {
			await deleteImageFromCloudinary(course.thumbnail.public_id);
			updateData.thumbnail = null;
		}

		if (thumbnail) {
			if (course.thumbnail?.public_id) await deleteImageFromCloudinary(course.thumbnail.public_id);
			const uploadResult = await imageUpload({
				path: thumbnail.path,
				folder: "lms/course-thumbnail"
			});
			if (uploadResult instanceof ErrorHandler) return next(uploadResult);
			updateData.thumbnail = { public_id: uploadResult.public_id, url: uploadResult.url };
		}

		// 9. Database Update with Validation
		const updatedCourse = await Course.findByIdAndUpdate(
			courseId,
			{ $set: updateData },
			{ new: true, runValidators: true, context: 'query' }
		);

		if (!updatedCourse) return next(new ErrorHandler("Failed to update course", 400));

		// 10. Cache Invalidation
		const cacheKeys = await redisCache.keys("course:*");
		if (cacheKeys.length > 0) await redisCache.del(cacheKeys);

		res.status(200).json({
			success: true,
			message: "Course updated successfully",
		});

	} catch (err: any) {
		logger.error(`Course Update Error: ${err.message}`);
		return next(new ErrorHandler(`Update Failed: ${err.message}`, 500));
	}
});





// export const handleUpdateCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
// 	try {
// 		const courseId = req.params.id;
//
//
// 		const {name, description, price,estimatedPrice,thumbnail:previousThumbnail,tags,level,demoUrl,benefits,prerequisites,courseData} = req.body
//
//
//
//
//
//
// 		const thumbnailExists = await Course.findById(courseId).select("thumbnail _id");
//
// 		if (!thumbnailExists) {
// 			return next(new ErrorHandler("Course not found", 404));
// 		}
//
// 		const thumbnail = req.file;
//
// 		let tempData = {
// 			public_id: "",
// 			url: ""
// 		};
//
// 		/**
// 		 * @note - Deletes the existing thumbnail if a new one is provided,
// 		 *                or if no thumbnail is included in the request body.
// 		 *                This ensures that the previous thumbnail is removed
// 		 *                when no replacement is specified.
// 		 */
// 		if (thumbnail) {
// 			if (thumbnailExists?.thumbnail.public_id) {
// 				const deleteThumbnail = await deleteImageFromCloudinary(thumbnailExists?.thumbnail.public_id);
// 				if (deleteThumbnail instanceof ErrorHandler) {
// 					return next(deleteThumbnail);
// 				}
// 			}
// 		}
//
// 		if (thumbnail) {
// 			const result = await imageUpload({
// 				path: thumbnail.path,
// 				folder: "lms/course-thumbnail"
// 			});
// 			if (result instanceof ErrorHandler) {
// 				return next(result);
// 			}
// 			tempData = {
// 				public_id: result.public_id,
// 				url: result.url
// 			};
// 		}
//
// 		const update = await Course.findByIdAndUpdate(
// 			courseId,
// 			{
// 				$set: {
// 					thumbnail: tempData
// 				}
// 			},
// 			{new: true}
// 		);
// 		if (!update) {
// 			return next(new ErrorHandler("Failed to update course", 400));
// 		}
//
// 		// invalidate cache for all course keys
// 		const keys = await redisCache.keys("course:*");
// 		if (keys.length > 0) {
// 			await redisCache.del(keys);
// 		}
//
// 		return res.status(200).json({
// 			success: true,
// 			message: "Updated successfully"
// 		});
// 	} catch (err: any) {
// 		logger.error(`Error updating course: ${err.message}`);
// 		return next(err);
// 	}
// });

 /**
  * @description          - get single course by id
  * @route                - /api/v1/course/get-course/admin/:id
  * @method               - GET
  * @access               - Private(admin)
  *
 * */
export const handleGetSingleCourseAdmin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const courseId = req.params.id;
		const cacheKey = `course:${courseId}`;

		let course;
		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			course = JSON.parse(data!);
		} else {
			course = await Course.findById(courseId);

			if (!course) {
				return next(new ErrorHandler("Course not found", 404));
			}
			// store in cache
			await redisCache.set(cacheKey, JSON.stringify(course), "EX", 60 * 60 * 24 * 7); // 7 days
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
 * @description          - get single course by id
 * @route                - /api/v1/course/get-course/user/:id
 * @method               - GET
 * @access               - Public(only not purchased courses)
 * */
export const handleGetSingleCourseUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const courseId = req.params.id;
		const cacheKey = `course:${courseId}`;

		let course;
		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			course = JSON.parse(data!);
			console.log(course);
		} else {
			course = await Course.findById(courseId).select(
				"-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
			);

			if (!course) {
				return next(new ErrorHandler("Course not found", 404));
			}
			// store in cache
			await redisCache.set(cacheKey, JSON.stringify(course), "EX", 60 * 60 * 24 * 7); // 7 days
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
			await redisCache.set(cacheKey, JSON.stringify(course), "EX", 60 * 60 * 24 * 7); // 7 days
		}

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
			await redisCache.set(cacheKey, JSON.stringify(content), "EX", 60 * 60 * 24 * 7); // 7 days
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

		//  if user role is "user" than check if user purchased the course or not | if user role is "admin" then allow all
		if (user.role === "user") {
			const courseExists = user.courses.some((course: any) => course.courseId.toString() === courseId.toString());
			if (!courseExists) {
				return next(new ErrorHandler("You need to buy this course before leaving a question.", 400));
			}
		}


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

		courseContent.questions.unshift(newQuestion);

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
			payload: updatedCourse
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

		const course = await Course.findById(courseId);

		if (!course) {
			return next(new ErrorHandler("Course not exists", 404));
		}


		//  if user role is "user" than check if user purchased the course or not | if user role is "admin" then allow all
		if (user.role === "user") {
			const courseExists = user.courses.some((course: any) => course.courseId.toString() === courseId.toString());
			if (!courseExists) {
				return next(new ErrorHandler("You need to buy this course before leaving a question reply.", 400));
			}
		}


		const courseContent = course?.courseData.find((item: any) => item._id.toString() === contentId.toString());
		if (!courseContent) {
			return next(new ErrorHandler("Course lesson not exists", 404));
		}

		const question = courseContent.questions.find((item: any) => item._id.toString() === questionId.toString());
		if (!question) {
			return next(new ErrorHandler("Question not exists", 404));
		}

		// create new answer
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


		const course = await Course.findById(courseId);
		if (!course) {
			return next(new ErrorHandler("Course not exists", 400));
		}


		//  if user role is "user" than check if user purchased the course or not | if user role is "admin" then allow all
		if (user.role === "user") {
			const courseExists = user.courses.some((course: any) => course.courseId.toString() === courseId.toString());
			if (!courseExists) {
				return next(new ErrorHandler("You need to buy this course before leaving a review.", 400));
			}
		}


		const newReview: any = {
			user: user._id,
			rating: rating,
			review: review
		};

		course.reviews.unshift(newReview);


		// Calculate the new average rating
		const totalRatings = course.reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0);
		const averageRating = course.rating = totalRatings / course.reviews.length;

		// Use Math.floor to round down to nearest 0.5
		course.rating = Math.floor(averageRating * 2) / 2;

		const updateCourse = await course.save();


		//  create notification for admin
		await Notification.create({
			userId: new Types.ObjectId(user._id),
			title: "Review Received",
			message: `${user.name} has reviewed ${course.name}`
		});

		// invalidate cache for all course keys and also notification keys
		const keys = [...(await redisCache.keys("course:*")), ...(await redisCache.keys("notification:*"))];
		if (keys.length > 0) {
			await redisCache.del(keys);
		}


		return res.status(200).json({
			success: true,
			message: "Thanks for your review!",
			payload: updateCourse
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

		const course = await Course.findById(courseId);

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


/**
 * @description          - get all courses for admin
 * @route                - /api/v1/course/get-courses/admin
 * @method               - GET
 * @access               - Private(only access by admin)
 * */

export const handleGetCoursesByAdmin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUser;
		const cacheKey = `course:admin-${user._id}`;
		let courses = [];

		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			courses = JSON.parse(data!);
		} else {
			courses = await Course.find({}).sort({createdAt: -1});
			await redisCache.set(cacheKey, JSON.stringify(courses));
		}


		return res.status(200).json({
			success: true,
			message: "Courses retrieved successfully",
			payload: courses || []
		});
	} catch (err: any) {
		logger.error(`Error getting courses by admin: ${err.message}`);
		return next(err);
	}
});


/**
 * @description          - delete course by admin
 * @route                - /api/v1/course/delete/:id
 * @method               - DELETE
 * @access               - Private(only access by admin)
 * */
export const handleDeleteCourseByAdmin = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {id} = req.params as {id: string};

		if (!mongoose.isValidObjectId(id)) {
			return next(new ErrorHandler("Invalid  id", 400));
		}

		const deleteCourse = await Course.findByIdAndDelete(id);
		if (!deleteCourse) {
			return next(new ErrorHandler("Course not exists", 404));
		}

		// invalidate cache
		const keys = await redisCache.keys("course:*");
		if (keys.length > 0) {
			await redisCache.del(keys);
		}
		return res.status(200).json({
			success: true,
			message: "Course deleted successfully"
		});
	} catch (err: any) {
		logger.error(`Error deleting course by admin: ${err.message}`);
		return next(err);
	}
});


/**
 * @description          - generate video url
 * @route                - /api/v1/course/generate-video-url
 * @method               - POST
 * @access               - Private
* */
export const handleGenerateVideoUrl = CatchAsyncError(async (req:Request, res:Response, next:NextFunction)=> {
	try {

		const {videoId} = req.body

		const response = await axios.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, {
			ttl: 300
		},{
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Apisecret ${vdoCipher_key}`
			}
		})


		res.json({
			success: true,
			message: "Video url generated successfully",
			payload: response.data
		})

	}catch (e:any) {
          return next(new ErrorHandler(e.message, 400))
	}
})