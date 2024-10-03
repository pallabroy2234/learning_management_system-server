import {CatchAsyncError} from "../middleware/catchAsyncError";
import {Request, Response, NextFunction} from "express";
import logger from "../config/logger";
import {Notification} from "../model/notification.model";
import {redisCache} from "../config/redis";



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