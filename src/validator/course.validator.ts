import {body, param, ValidationChain} from "express-validator";

/**
 * @description          - validate create course request
 * @route                - /api/v1/course/create
 * @method               - POST
 * @access               - Private
 * */

export const createCourseValidator = [
	// Validate course name
	body("name").notEmpty().withMessage("Course name is required.").isString().withMessage("Course name should be text."),

	// Validate course description
	body("description")
		.notEmpty()
		.withMessage("Course description is required.")
		.isString()
		.withMessage("Course description should be text."),

	// Validate price
	body("price").notEmpty().withMessage("Course price is required.").isNumeric().withMessage("Price must be a number."),

	// Validate estimatedPrice (optional)
	body("estimatedPrice").optional().isNumeric().withMessage("Estimated price must be a number."),

	// Validate tags
	body("tags").notEmpty().withMessage("At least one tag is required.").isString().withMessage("Tags should be text."),

	// Validate level
	body("level")
		.notEmpty()
		.withMessage("Course level is required (e.g., beginner, expert).")
		.isString()
		.withMessage("Course level should be text."),

	// Validate demo URL
	body("demoUrl").notEmpty().withMessage("Demo URL is required.").isURL().withMessage("Provide a valid URL."),

	// Validate benefits
	body("benefits")
		.isArray({min: 1})
		.withMessage("At least one benefit is required.")
		.custom((benefits) => benefits.every((benefit: any) => typeof benefit.title === "string"))
		.withMessage("Each benefit should have a title."),

	// Validate prerequisites
	body("prerequisites")
		.isArray({min: 1})
		.withMessage("At least one prerequisite is required.")
		.custom((prerequisites) => prerequisites.every((prerequisite: any) => typeof prerequisite.title === "string"))
		.withMessage("Each prerequisite should have a title."),

	// Validate reviews
	body("reviews").optional().isArray().withMessage("Reviews should be a list."),
	body("reviews.*.rating").optional().isNumeric().withMessage("Rating should be a number."),
	body("reviews.*.comment").optional().isString().withMessage("Comment should be text."),

	// * Validate course data (lessons)
	// Validate course data (lessons)
	body("courseData").optional().isArray().withMessage("Course content should be a list."),
	body("courseData.*.title").notEmpty().withMessage("Lesson title is required."),
	body("courseData.*.videoDescription").notEmpty().withMessage("Lesson description is required."),
	body("courseData.*.videoUrl").notEmpty().withMessage("Video URL is required.").isURL().withMessage("Provide a valid URL."),
	body("courseData.*.videoLength").notEmpty().withMessage("Video length is required."),
	body("courseData.*.videoSection").notEmpty().withMessage("Video section is required."),
	body("courseData.*.videoPlayer").notEmpty().withMessage("Video player is required."),
	body("courseData.*.suggestion").optional().isString().withMessage("Suggestion should be text."),

	// Validate links inside course data
	// body('courseData.*.links').optional().isArray().withMessage('Links should be a list.'),
	// body('courseData.*.links.*.title').optional().isString().withMessage('Link title should be text.'),
	// body('courseData.*.links.*.url').optional().isURL().withMessage('Provide a valid link URL.'),

	body("courseData.*.links")
		.optional()
		.isArray()
		.withMessage("Links should be a list.")
		.custom((links, {req}) => {
			// Iterate through each link object and apply conditional logic
			links.forEach((link: any, index: any) => {
				const {title, url} = link;

				// If title is provided, URL must be provided and must be a valid URL
				if (title && !url) {
					throw new Error(`Provide a link for title :${title}`);
				}
				if (title && url && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(url)) {
					throw new Error(`Invalid URL for link ${title}: ${url}`);
				}

				// If URL is provided, title must be provided as well
				if (url && !title) {
					throw new Error(`Provide a title for : ${url}`);
				}
			});
			return true;
		}),

	body("courseData.*.links.*.url").optional().isURL().withMessage("Provide a valid link URL."), // URL validation for individual links

	// Validate questions inside course data
	body("courseData.*.questions").optional().isArray().withMessage("Questions should be a list."),
	body("courseData.*.questions.*.comment").optional().isString().withMessage("Question comment should be text."),

	// Validate overall rating (optional)
	body("rating").optional().isNumeric().withMessage("Rating should be a number."),

	// Validate purchased count (optional)
	body("purchased").optional().isNumeric().withMessage("Purchased count should be a number.")
];

/**
 * @description          - validate add question request
 * @route                - /api/v1/course/add-question
 * @method               - PUT
 * @access               - Private
 * */

export const addQuestionValidator = [
	body("courseId").notEmpty().withMessage("Course ID is required.").isMongoId().withMessage("Provide a valid course ID."),
	body("contentId").notEmpty().withMessage("Content ID is required.").isMongoId().withMessage("Provide a valid content ID."),
	body("question").notEmpty().withMessage("Question is required.")
];

/**
 * @description          - validate add answer request
 * @route                - /api/v1/course/add-answer
 * @method               - PUT
 * @access               - Private
 * */
export const addAnswerValidator = [
	body("courseId").notEmpty().withMessage("Course ID is required.").isMongoId().withMessage("Provide a valid course ID."),
	body("contentId").notEmpty().withMessage("Content ID is required.").isMongoId().withMessage("Provide a valid content ID."),
	body("questionId").notEmpty().withMessage("Question ID is required.").isMongoId().withMessage("Provide a valid question ID."),
	body("answer").notEmpty().withMessage("Answer is required.")
];


/**
 * @description          - validate add review request
 * @route                - /api/v1/course/add-review/:id
 * @method               - PUT
 * @access               - Private
* */

export const addReviewValidator = [
	param("id").notEmpty().withMessage("Course Id is required.").isMongoId().withMessage("Invalid id."),
	body("rating").notEmpty().withMessage("Rating is required.").isNumeric().withMessage("Rating should be a number."),
	body("review").notEmpty().withMessage("Review is required.")
];