import express from "express";
import {authorizeRole, isAuthenticated} from "../middleware/auth";
import {handleGetUserAnalytics} from "../controller/analytics.controller";


export const analyticsRoute = express.Router();


/**
 * @description        Get user analytics
 * @route              GET /api/v1/analytics/user-analytics
 * @method			   GET
 * @access             Private (only admin)
 * */

analyticsRoute.get("/user-analytics", isAuthenticated, authorizeRole("admin"), handleGetUserAnalytics);











