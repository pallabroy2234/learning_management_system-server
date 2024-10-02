import express from "express";
import {isAuthenticated} from "../middleware/auth";
import {handleCreateOrder} from "../controller/order.controller";
import {createOrderValidator} from "../validator/order.validator";
import {runValidator} from "../validator";

export const orderRoute = express.Router();


/**
 * @description     Create order
 * @route           POST /api/order/create-order
 * @access          Private
 * */
orderRoute.post("/create-order", isAuthenticated, createOrderValidator, runValidator(422), handleCreateOrder);