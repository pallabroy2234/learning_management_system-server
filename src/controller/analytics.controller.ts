import {Response, Request, NextFunction} from "express";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import logger from "../config/logger";
import {IUser, User} from "../model/user.model";
import {redisCache} from "../config/redis";
import {IMonthlyData, lastTwelveMonthsData} from "../utils/analytics";


/**
 * @description        Get user analytics
 * @route              GET /api/v1/analytics/user-analytics
 * @method			    GET
 * @access             Private (only admin)
 * */
export const handleGetUserAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUser;
		const cacheKey = `user:analytics-${user._id}`;

		let userAnalytics: {lastTwelveMonths: IMonthlyData[]};

		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			userAnalytics = JSON.parse(data!);
		} else {
			userAnalytics = await lastTwelveMonthsData({model: User});
			await redisCache.set(cacheKey, JSON.stringify(userAnalytics));
		}

		return res.status(200).json({
			success: true,
			message: "User analytics fetched successfully",
			payload: userAnalytics
		});
	} catch (err: any) {
		logger.error(`Error in handleGetUserAnalytics: ${err.message}`);
		return next(err);
	}
});


