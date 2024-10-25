import {CatchAsyncError} from "../middleware/catchAsyncError";
import {NextFunction, Response, Request} from "express";
import logger from "../config/logger";
import {imageUpload} from "../utils/cloudinary";
import {ILayout, Layout} from "../model/layout.model";
import {ErrorHandler} from "../utils/ErrorHandler";
import {deleteImage} from "../middleware/multer";


/**
 * @description       create layout
 * @route 			  POST /api/v1/layout/create
 * @access            Private(Only admin)
 *
 * */
export const handleCreateLayout = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {type, faq, categories, bannerImage} = req.body as ILayout;
		const banner = req.file;
		const typeExists = await Layout.findOne({type});


		if (typeExists) {
			deleteImage(banner?.path || "");
			return next(new ErrorHandler(`${type} already exists`, 400));
		}


		// * create banner for layout
		if (banner && type === "banner") {
			const result = await imageUpload({path: banner.path, folder: "lms/banner"});
			if (result instanceof Error) {
				return next(result);
			}
			const layout = await Layout.create({
				type,
				bannerImage: {
					image: {
						url: result.url,
						public_id: result.public_id
					},
					title: bannerImage.title,
					subtitle: bannerImage.subtitle
				}
			});
			if (!layout) {
				return next(new Error("Failed to upload banner"));
			}
		}

		// * create faq for layout
		if (type === "faq" && faq?.length) {
			const result = await Layout.create({type, faq});
			if (!result) {
				return next(new Error("Failed to create faq"));
			}

		}


		// * create categories for layout
		if (type === "categories" && categories?.length) {
			const result = await Layout.create({type, categories});
			if (!result) {
				return next(new Error("Failed to create categories"));
			}
		}

		return res.status(201).json({
			success: true,
			message: "Layout created successfully"
		});

	} catch (err: any) {
		logger.error(`Error in handleCreateLayout: ${err.message}`);
		return next(err);
	}
});


/**
 * @description       update faq
 * @route 			  PUT /api/v1/layout/update-faq/:id
 * @access            Private(Only admin)
 * */
export const handleUpdateFaq = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {type, faq} = req.body as ILayout;
		const faqId = req.params.id;

		const faqExists = await Layout.findOne({type, _id: faqId});
		if (!faqExists) return next(new ErrorHandler("FAQ document not found", 404));

		// 	Check existing FAQ or new FAQ
		const updates = faq.filter((item) => item._id);
		const newFaq = faq.filter((item) => !item._id);


		// updated existing FAQ
		if (updates.length > 0) {
			await Promise.all(updates.map(async (item) => {
				await Layout.updateOne({_id: faqId, "faq._id": item._id}, {
					$set: {
						"faq.$.question": item.question,
						"faq.$.answer": item.answer
					}
				}, {new: true, runValidators: true});
			}));
		}


		//  add new FAQ
		if (newFaq?.length > 0) {
			await Layout.updateOne({_id: faqId}, {
				$push: {
					faq: {
						$each: newFaq
					}
				}
			}, {new: true, runValidators: true});
		}

		// if (deleted?.length > 0) {
		// 	await Layout.updateOne(
		// 		{ _id: faqId },
		// 		{ $pull: { faq: { _id: { $in: deleted } } } }
		// 	);

		return res.status(200).json({
			success: true,
			message: "FAQ updated successfully"
		});
	} catch (err: any) {
		logger.error(`Error in handleUpdateFaq: ${err.message}`);
		return next(err);
	}
});
