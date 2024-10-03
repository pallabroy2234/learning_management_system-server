import {CatchAsyncError} from "../middleware/catchAsyncError";
import {Request, Response, NextFunction} from "express";
import logger from "../config/logger";
import {Notification} from "../model/notification.model";
import {redisCache} from "../config/redis";
import mongoose from "mongoose";
import {ErrorHandler} from "../utils/ErrorHandler";
import cron from "node-cron";
import moment from "moment";


/**
 * @description     Get all notifications
 * @route           GET /api/notification/get-notifications
 * @access          Private(only admin)
 * */
export const handleGetNotifications = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const cacheKey = "notification:all";
		let notifications = [];

		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			notifications = JSON.parse(data!);
		} else {
			notifications = await Notification.find().sort({createdAt: -1});
			// store in cache
			await redisCache.set(cacheKey, JSON.stringify(notifications));
		}


		return res.status(200).json({
			success: true,
			message: "Successfully fetched notifications",
			payload: notifications || []
		});
	} catch (err: any) {
		logger.error(`Error in handleGetNotifications: ${err.message}`);
		return next(err);
	}
});


/**
 * @description     Update notification status
 * @route           PUT /api/notification/update-status/:id
 * @access          Private(only admin)
 * */
export const handleUpdateNotificationStatus = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {id} = req.params as {id: string};

		if (!mongoose.isValidObjectId(id)) {
			return next(new ErrorHandler("Invalid id", 400));
		}


		const cacheKey = `notification:all`;
		const notification = await Notification.findById({_id: id});


		if (!notification) {
			return next(new ErrorHandler("Notification not exists", 404));
		}

		if (notification.status === "unread") {
			notification.status = "read";
			const updateNotification = await notification.save();

			if (!updateNotification) {
				return next(new ErrorHandler("Error in updating notification", 400));
			}

			//   invalidate cache
			const keys = await redisCache.keys(cacheKey);
			if (keys.length > 0) {
				await redisCache.del(keys);
			}
		}
		return res.status(200).json({
			success: true,
			message: "Successfully updated notification status"
		});
	} catch
		(err: any) {
		logger.error(`Error in handleUpdateNotificationStatus: ${err.message}`);
		return next(err);
	}
});


/**
 * @description     Delete every 30 days old read notifications automatically using cron job

 * */
cron.schedule("0 0 * * *", async () => {
	const thirtyDaysAgo = moment().subtract(30, "days").toDate();
	try {
		await Notification.deleteMany({status: "read", createdAt: {$lte: thirtyDaysAgo}});
		logger.info("Cron job executed successfully");
	} catch (error: any) {
		logger.error(`Error executing cron job: ${error.message}`);
	}
});
