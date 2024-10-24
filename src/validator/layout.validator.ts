import {body} from "express-validator";


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