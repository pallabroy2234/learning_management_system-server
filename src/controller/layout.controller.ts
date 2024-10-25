import {CatchAsyncError} from "../middleware/catchAsyncError";
import {NextFunction, Response, Request} from "express";
import logger from "../config/logger";
import {deleteImageFromCloudinary, imageUpload} from "../utils/cloudinary";
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
		const deleted = req.body.deleted;
		const faqId = req.params.id;

		const faqExists = await Layout.findOne({type, _id: faqId});
		if (!faqExists) return next(new ErrorHandler("FAQ document not found", 404));

		// 	Check existing FAQ or new FAQ
		const updates = faq?.filter((item) => item._id);
		const newFaq = faq?.filter((item) => !item._id);


		// updated existing FAQ
		if (updates?.length > 0) {
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


		// delete FAQ
		if (deleted?.length > 0) {
			const deleteFaq = await Layout.updateOne({_id: faqId, "faq._id": {$in: deleted}}, {
				$pull: {faq: {_id: {$in: deleted}}}
			});
			if (deleteFaq.modifiedCount === 0) {
				return next(new ErrorHandler("FAQ document not found", 404));
			}
		}

		return res.status(200).json({
			success: true,
			message: "FAQ updated successfully"
		});
	} catch (err: any) {
		logger.error(`Error in handleUpdateFaq: ${err.message}`);
		return next(err);
	}
});


/**
 * @description       update & delete categories
 * @route 			  PUT /api/v1/layout/update-categories/:id
 * @access            Private(Only admin)
 * */
export const handleUpdateCategories = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {type, categories} = req.body as ILayout;
		const deleted = req.body.deleted;
		const categoriesId = req.params.id;


		const categoriesExists = await Layout.findOne({$and: [{type}, {_id: categoriesId}]});
		if (!categoriesExists) return next(new ErrorHandler("Categories not found", 404));


		// title exists
		const titleExists = categoriesExists?.categories?.filter((item) => categories?.map((item) => item.title.toLowerCase()).includes(item.title.toLowerCase()));
		if (titleExists?.length) {
			const title = titleExists.map((item) => item.title);
			return next(new ErrorHandler(`Category: ${title} already exists`, 400));
		}

		// 	Check existing categories or new categories
		const updates = categories?.filter((item) => item._id);
		const newCategories = categories?.filter((item) => !item._id);


		// update existing categories
		if (updates?.length) {
			await Promise.all(updates.map(async (item) => {
				await Layout.updateOne({$and: [{type, _id: categoriesId, "categories._id": item._id}]}, {
					$set: {
						"categories.$.title": item.title
					}
				});
			}));
		}

		// add new categories
		if (newCategories?.length) {
			categoriesExists.categories.push(...newCategories);
			await categoriesExists.save();
		}


		// delete categories
		if (deleted?.length) {
			const deleteCategories = await Layout.updateOne({
				$and: [{
					type,
					_id: categoriesId,
					"categories._id": {$in: deleted}
				}]
			}, {
				$pull: {categories: {_id: {$in: deleted}}}
			});
			if (deleteCategories.modifiedCount === 0) return next(new ErrorHandler("Categories not found", 404));
		}


		return res.status(200).json({
			success: true,
			message: "Categories updated successfully"
		});
	} catch (err: any) {
		logger.error(`Error in handleUpdateCategories: ${err.message}`);
		return next(err);
	}
});

/**
 * @description       update banner
 * @route 			  PUT /api/v1/layout/update-banner/:id
 * @access            Private(Only admin)
 * */
export const handleUpdateBanner = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
		try {
			const {type, title, subtitle} = req.body;
			const bannerId = req.params.id;
			const banner = req.file;


			const bannerExists = await Layout.findOne({$and: [{type}, {_id: bannerId}]});
			if (!bannerExists) return next(new ErrorHandler("Banner not found", 404));


			let update: any = {};


			// * banner image upload
			if (bannerExists && banner) {
				const {public_id, url} = bannerExists.bannerImage.image;
				if (public_id && url) {
					const deleteOldImage = await deleteImageFromCloudinary(public_id);
					if (deleteOldImage instanceof Error) {
						deleteImage(banner?.path || "");
						return next(deleteOldImage);
					}
				}
				if (banner) {
					const uploadNewImage = await imageUpload({path: banner.path, folder: "lms/banner"});
					if (uploadNewImage instanceof Error) {
						return next(uploadNewImage);
					}
					update["bannerImage.image"] = {
						public_id: uploadNewImage.public_id,
						url: uploadNewImage.url
					};

				}
			}


			if (title) update["bannerImage.title"] = title;
			if (subtitle) update["bannerImage.subtitle"] = subtitle;


			await Layout.updateOne({$and: [{type, _id: bannerId}]}, update, {
				new: true,
				runValidators: true
			});


			return res.status(200).json({
				success: true,
				message: "Banner updated successfully"
			});
		} catch
			(err: any) {
			logger.error(`Error in handleUpdateBanner: ${err.message}`);
			return next(err);
		}
	}
);