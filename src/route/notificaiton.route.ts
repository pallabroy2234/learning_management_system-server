import express from "express";
import {handleGetNotifications} from "../controller/notification.controller";
import {authorizeRole, isAuthenticated} from "../middleware/auth";

export const notificationRouter = express.Router();





/**
 * @description     Get all notifications
 * @route           GET /api/notification/get-notifications
 * @access          Private(only admin)
* */

notificationRouter.get("/get-notifications", isAuthenticated, authorizeRole("admin"), handleGetNotifications);