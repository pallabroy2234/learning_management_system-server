import {Response, Request, NextFunction} from "express";
import {CatchAsyncError} from "../middleware/catchAsyncError";
import logger from "../config/logger";
import {IUser, User} from "../model/user.model";
import {redisCache} from "../config/redis";
import {IMonthlyData, lastTwelveMonthsData} from "../utils/analytics";
import {Course} from "../model/course.model";


/**
 * @description        Get user analytics
 * @route              GET /api/v1/analytics/user-analytics
 * @method			    GET
 * @access             Private (only admin)
 * */
export const handleGetUserAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUser;
		const cacheKey = `analytics:user-${user._id}`;

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

/**
 * @description        Get course analytics
 * @route              GET /api/v1/analytics/course-analytics
 * @method			    GET
 * @access             Private (only admin)
 * */
export const handleGetCourseAnalytics = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = req.user as IUser;
		const cacheKey = `analytics:course-${user._id}`;

		let courseAnalytics: {lastTwelveMonths: IMonthlyData[]};

		if (await redisCache.exists(cacheKey)) {
			const data = await redisCache.get(cacheKey);
			courseAnalytics = JSON.parse(data!);
		} else {
			courseAnalytics = await lastTwelveMonthsData({model: Course});
			await redisCache.set(cacheKey, JSON.stringify(courseAnalytics));
		}

		return res.status(200).json({
			success: true,
			message: "Course analytics fetched successfully",
			payload: courseAnalytics
		});
	} catch (err: any) {
		logger.error(`Error in handleGetCourseAnalytics: ${err.message}`);
		return next(err);
	}
});