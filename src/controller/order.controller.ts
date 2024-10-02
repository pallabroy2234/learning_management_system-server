import {CatchAsyncError} from "../middleware/catchAsyncError";
import {Request, Response, NextFunction} from "express";
import logger from "../config/logger";
import {IOrder, Order} from "../model/order.model";
import {IUser, User} from "../model/user.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {Course, ICourse} from "../model/course.model";
import {Types} from "mongoose";
import {sendMail} from "../mails/sendMail";
import {Notification} from "../model/notification.model";
import {redisCache} from "../config/redis";


/**
 * @description     Create order
 * @route           POST /api/order/create-order
 * @access          Private
 * */
export const handleCreateOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {courseId, payment_info} = req.body as IOrder;
		const user = req.user as IUser;
		const isUserExists = await User.findById(user?._id);

		// * check if user exists
		if (!isUserExists) {
			return next(new ErrorHandler("User not exists", 404));
		}
		const isCoursePurchased = isUserExists.courses.some((course) => course.courseId.toString() === courseId.toString());


		if (isCoursePurchased) {
			return next(new ErrorHandler("You have already enrolled in this course", 400));
		}

		// * check if course exists
		const isCourseExists = await Course.findById(courseId);
		if (!isCourseExists) {
			return next(new ErrorHandler("Course not exists", 404));
		}

		// * create order
		const newOrder: Partial<IOrder> = {
			courseId: courseId,
			userId: new Types.ObjectId(user?._id),
			payment_info: {}
		};
		const order = await Order.create(newOrder);
		if (!order) {
			return next(new ErrorHandler("We couldn't process your order. Please try again.", 400));
		}


		// * send mail
		try {
			const mailData = {
				_id: (isUserExists?._id.toString()).slice(0, 5),
				name: isUserExists?.name,
				price: isCourseExists?.price,
				date: new Date(order.createdAt).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric"
				})
			};

			await sendMail({
				email: isUserExists.email,
				subject: "Order Confirmation",
				template: "orderConfirm",
				data: mailData
			});


		} catch (err: any) {
			logger.error(`Error in creating notification: ${err.message}`);
			return next(err);
		}

		//   * update user course array list
		isUserExists?.courses.push({courseId: new Types.ObjectId(courseId)});

		const updateUser = await isUserExists.save();
		if (!updateUser) {
			return next(new ErrorHandler("Error in updating user course list", 400));
		}

		// * update course purchased count
		if (isCourseExists) {
			// Check if the purchased count exists, default to 0 if not
			isCourseExists.purchased = (isCourseExists.purchased ?? 0) + 1;
			await isCourseExists.save();
		}


		// 	create notification
		const notification = await Notification.create({
			userId: isUserExists?._id,
			title: "Course Purchased",
			message: `You have successfully purchased the course ${isCourseExists?.name}`
		});

		if (!notification) {
			return next(new ErrorHandler("Error in creating notification", 400));
		}

		// + invalidate cache
		const keys = await redisCache.keys("course*");
		if (keys.length > 0) {
			await redisCache.del(keys);
		}


		return res.status(201).json({
			success: true,
			message: "Successfully purchased the course"
		});
	} catch (err: any) {
		logger.error(`Error in handleCreateOrder: ${err.message}`);
		return next(err);
	}
});