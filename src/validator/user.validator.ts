import {body} from "express-validator";


// const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|co|io|info|biz|me|app|dev|xyz|[a-z]{2,})$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|co|io|info|biz|me|app|dev|xyz)$/;


export const userRegisterValidator = [
    body("name")
        .notEmpty()
        .withMessage("Please enter your name"),

    body("email")
        .notEmpty()
        .withMessage("Please enter your email")
        .isEmail()
        .withMessage("Please enter a valid email")
        .custom((value) => {
            if (!emailRegex.test(value)) {
                throw new Error("Please enter a valid email");
            }
            return true;
        }),

    body("password")
        .notEmpty()
        .withMessage("Please enter your password")
        .isLength({min: 6})
        .withMessage("Password must be at least 6 characters long")
];


export const userActiveValidator = [
    body("activation_token").notEmpty().withMessage("Activation token is required"),
    body("activation_code").notEmpty().withMessage("Enter your activation code")
]
