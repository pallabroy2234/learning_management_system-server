import express from "express";
import {authorizeRole, isAuthenticated} from "../middleware/auth";
import {
	handleGetCourseAnalytics,
	handleGetOrderAnalytics,
	handleGetUserAnalytics
} from "../controller/analytics.controller";


export const analyticsRoute = express.Router();


/**
 * @description        Get user analytics
 * @route              GET /api/v1/analytics/user-analytics
 * @method			   GET
 * @access             Private (only admin)
 * */

analyticsRoute.get("/user-analytics", isAuthenticated, authorizeRole("admin"), handleGetUserAnalytics);

/**
 * @description        Get course analytics
 * @route              GET /api/v1/analytics/course-analytics
 * @method			   GET
 * @access             Private (only admin)
 * */

analyticsRoute.get("/course-analytics", isAuthenticated, authorizeRole("admin"), handleGetCourseAnalytics);

/**
 * @description        Get order analytics
 * @route              GET /api/v1/analytics/order-analytics
 * @method			   GET
 * @access             Private (only admin)
 * */

analyticsRoute.get("/order-analytics", isAuthenticated, authorizeRole("admin"), handleGetOrderAnalytics);




