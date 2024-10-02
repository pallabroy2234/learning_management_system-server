import {body} from "express-validator";


export const createOrderValidator = [
	body("courseId").notEmpty().withMessage("Course ID is required.").isMongoId().withMessage("Invalid ID")
];