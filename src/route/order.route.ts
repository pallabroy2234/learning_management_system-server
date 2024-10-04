import express from "express";
import {authorizeRole, isAuthenticated} from "../middleware/auth";
import {handleCreateOrder, handleGetOrdersByAdmin} from "../controller/order.controller";
import {createOrderValidator} from "../validator/order.validator";
import {runValidator} from "../validator";

export const orderRoute = express.Router();


/**
 * @description     Create order
 * @route           POST /api/order/create-order
 * @access          Private
 * */
orderRoute.post("/create-order", isAuthenticated, createOrderValidator, runValidator(422), handleCreateOrder);


/**
 * @description     Get all orders by admin
 * @route           GET /api/order/get-all-orders/admin
 * @access          Private(only admin)
 * */

orderRoute.get("/get-all-orders/admin", isAuthenticated, authorizeRole("admin"), handleGetOrdersByAdmin);