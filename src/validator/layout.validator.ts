import {body, param, query} from "express-validator";


/**
 * @description       validate layout
 * @route 			  POST /api/v1/layout/create
 *
 * */
export const layOutValidator = [
	body("type").notEmpty().withMessage("Type is required").isIn(["categories", "banner", "faq"]).withMessage("Type must be 'categories', 'banner', or 'faq'."),


// 	* validate banner

	body("banner").custom((banner, {req}) => {
		if (req.body.type === "banner" && !req.file) {
			throw new Error("Banner image is required.");
		}
		return true;
	}),


	body("bannerImage.title") // Correct path for title
		.if(body("type").equals("banner"))
		.notEmpty().withMessage("Banner title is required"),


	body("bannerImage.subtitle") // Correct path for subtitle
		.if(body("type").equals("banner"))
		.notEmpty().withMessage("Banner subtitle is required"),


//  * validate faq
	body("faq")
		.if(body("type").equals("faq"))
		.isArray().withMessage("FAQ must be at least one question and answer.")
		.custom((faq) => {
			if (faq.length === 0) {
				throw new Error("At least one FAQ item is required.");
			}
			return true;
		}),
	body("faq.*")
		.optional()
		.custom((faqItem) => {
			if (faqItem.question && !faqItem.answer) {
				throw new Error("Answer is required.");
			}
			if (!faqItem.question && faqItem.answer) {
				throw new Error("Question is required.");
			}
			return true;
		}),


// 	* validate categories
	body("categories")
		.if(body("type").equals("categories")) // Only check if type is 'categories'
		.isArray().withMessage("At least one category is required")
		.custom((categories) => {
			if (categories.length === 0) {
				throw new Error("At least one category is required");
			}
			return true;
		}),
	body("categories.*")
		.optional()
		.custom((category) => {
			if (!category.title) {
				throw new Error("Category title is required.");
			}
			return true;
		})

];


/**
 * @description       validate update faq
 * @route 			  PUT /api/v1/layout/update-faq/:id
 * @access            Private(Only admin)
 * */

export const updateFaqValidator = [
	param("id").notEmpty().withMessage("FAQ id is required").isMongoId().withMessage("Invalid id"),
	body("type").notEmpty().withMessage("Type is required").isIn(["faq"]).withMessage("Type must be 'faq'."),
	body("faq").optional().isArray().withMessage("FAQ must be an array").custom((value) => {
		value.forEach((item: any) => {
			const allowedFields = ["_id", "question", "answer"];
			const keys = Object.keys(item);

			keys.forEach((key) => {
				if (!allowedFields.includes(key)) {
					throw new Error(`Invalid key : ${key}`);
				}
			});
			if (!item._id) {
				if (!item.question) {
					throw new Error("Question is required");
				}
				if (!item.answer) {
					throw new Error("Answer is required");
				}
			}
		});
		return true;
	}),
	body("faq.*._id").optional().isMongoId().withMessage("Invalid FAQ id"),

// 	* deleted faq
	body("deleted").optional().isArray({min: 1}).withMessage("Deleted FAQ must be a non-empty array"),
	body("deleted.*").if(body("deleted").exists()).notEmpty().withMessage("Deleted FAQ id is required").isMongoId().withMessage("Invalid id"),

	body()
		.custom((_, {req}) => {
			if (!req.body.faq && !req.body.deleted) {
				throw new Error("Please provide either FAQ items to add or IDs to delete.");
			}
			return true;
		})
];


/**
 * @description       validate update categories
 * @route 			  PUT /api/v1/layout/update-categories/:id
 * @access            Private(Only admin)
 * */

export const updateCategoriesValidator = [
	param("id").notEmpty().withMessage("Category id is required").isMongoId().withMessage("Invalid id"),
	body("type").notEmpty().withMessage("Type is required").isIn(["categories"]).withMessage("Type must be 'categories'"),
	body("categories").optional().isArray({min: 1}).withMessage("Categories must be a non-empty array").custom((value) => {
		value.forEach((item: any) => {
			const allowedFields = ["_id", "title"];
			const keys = Object.keys(item);

			keys.forEach((key) => {
				if (!allowedFields.includes(key)) {
					throw new Error(`Invalid key : ${key}`);
				}
			});
			if (!item._id) {
				if (!item.title) {
					throw new Error("Title is required");
				}
			}
		});
		return true;
	}),
	body("categories.*._id").optional().isMongoId().withMessage("Invalid category id"),

//  * deleted categories
	body("deleted").optional().isArray({min: 1}).withMessage("Deleted categories must be a non-empty array"),
	body("deleted.*").if(body("deleted").exists()).notEmpty().withMessage("Deleted category id is required").isMongoId().withMessage("Invalid id"),

	body()
		.custom((_, {req}) => {
			if (!req.body.categories && !req.body.deleted) {
				throw new Error("Please provide either categories to add or IDs to delete.");
			}
			return true;
		})
];


/**
 * @description       validate update banner
 * @route 			  PUT /api/v1/layout/update-banner/:id
 * @access            Private(Only admin)
 * */
export const updateBannerValidator = [
	param("id").notEmpty().withMessage("Banner id is required").isMongoId().withMessage("Invalid id"),
	body("type").notEmpty().withMessage("Type is required").isIn(["banner"]).withMessage("Type must be 'banner'"),
	body("banner").optional().notEmpty().withMessage("Banner image is required"),
	body("title").optional().notEmpty().withMessage("Banner title is required"),
	body("subtitle").optional().notEmpty().withMessage("Banner subtitle is required")

];


/**
 * @description       validate get layout
 * @route 			  GET /api/v1/layout/get
 * @access            Public
 * */

export const getLayoutValidator = [
	query("type").notEmpty().withMessage("Type is required").isIn(["categories", "banner", "faq"]).withMessage("Type must be 'categories', 'banner', or 'faq'.")
];