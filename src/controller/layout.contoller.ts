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