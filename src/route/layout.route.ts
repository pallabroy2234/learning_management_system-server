import express from "express";
import {authorizeRole, isAuthenticated} from "../middleware/auth";
import {
	handleCreateLayout,
	handleUpdateBanner,
	handleUpdateCategories,
	handleUpdateFaq
} from "../controller/layout.controller";
import {
	layOutValidator,
	updateBannerValidator,
	updateCategoriesValidator,
	updateFaqValidator
} from "../validator/layout.validator";
import {runValidator} from "../validator";
import {upload} from "../middleware/multer";

export const layoutRoute = express.Router();


/**
 * @description       create layout
 * @route 			  POST /api/v1/layout/create
 * @access            Private(Only admin)
 * */

layoutRoute.post("/create", upload.single("banner"), isAuthenticated, authorizeRole("admin"), layOutValidator, runValidator(422), handleCreateLayout);


/**
 * @description       update faq
 * @route 			  PUT /api/v1/layout/update-faq/:id
 * @access            Private(Only admin)
 * */

layoutRoute.put("/update-faq/:id", isAuthenticated, authorizeRole("admin"), updateFaqValidator, runValidator(400), handleUpdateFaq);


/**
 * @description       update categories
 * @route 			  PUT /api/v1/layout/update-categories/:id
 * @method			PUT
 * @access            Private(Only admin)
 * */

layoutRoute.put("/update-categories/:id", isAuthenticated, authorizeRole("admin"), updateCategoriesValidator, runValidator(400), handleUpdateCategories);


/**
 * @description       update banner
 * @route 			  PUT /api/v1/layout/update-banner/:id
 * @access            Private(Only admin)
 * */

layoutRoute.put("/update-banner/:id", upload.single("banner"), isAuthenticated, authorizeRole("admin"), updateBannerValidator, runValidator(400), handleUpdateBanner);