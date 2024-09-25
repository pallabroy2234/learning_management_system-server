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


export const userLoginValidator = [
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
]


export const updateUserInfoValidator = [
    body("name").optional().isString().withMessage("Name must be a string"),
    body("email")
        .optional()
        .isEmail()
        .withMessage("Please enter a valid email")
        .custom((value) => {
            if (!emailRegex.test(value)) {
                throw new Error("Please enter a valid email");
            }
            return true;
        }),
]


export const updatePasswordValidator = [
    body("oldPassword")
        .notEmpty()
        .withMessage("Please enter your old password")
        .isLength({min: 6})
        .withMessage("Password must be at least 6 characters long"),
    body("newPassword")
        .notEmpty()
        .withMessage("Please enter your new password")
        .isLength({min: 6})
        .withMessage("Password must be at least 6 characters long"),
    body("newPassword")
        .custom((newPassword, {req}) => {
            if (newPassword === req.body.oldPassword) {
                throw new Error("New password cannot be the same as the old password");
            }
            return true;
        })
];


export const createPasswordValidator = [
    body("newPassword")
        .notEmpty()
        .withMessage("Please enter your new password")
        .isLength({min: 6})
        .withMessage("Password must be at least 6 characters long"),
    body("confirmPassword")
        .notEmpty()
        .withMessage("Please enter your confirm password")
        .isLength({min: 6})
        .withMessage("Password must be at least 6 characters long"),
    body("confirmPassword").custom((value, {req}) => {
        if (value !== req.body.newPassword) {
            throw new Error("Passwords do not match");
        }
        return true;
    })
];


export const updateAvatarValidator = [
    body("avatar").custom((value, {req}) => {
        if (!req.file) {
            throw new Error("Image is required");
        }
        return true;
    }),
]