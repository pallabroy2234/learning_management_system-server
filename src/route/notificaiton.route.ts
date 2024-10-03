import express from "express";
import {handleGetNotifications, handleUpdateNotificationStatus} from "../controller/notification.controller";
import {authorizeRole, isAuthenticated} from "../middleware/auth";

export const notificationRouter = express.Router();





/**
 * @description     Get all notifications
 * @route           GET /api/notification/get-notifications
 * @access          Private(only admin)
* */

notificationRouter.get("/get-notifications", isAuthenticated, authorizeRole("admin"), handleGetNotifications);



/**
 * @description     Update notification status
 * @route           PUT /api/notification/update-status/:id
 * @access          Private(only admin)
 *
* */

notificationRouter.put("/update-status/:id", isAuthenticated, authorizeRole("admin"), handleUpdateNotificationStatus);