import express from "express";
import {authorizeRole, isAuthenticated} from "../middleware/auth";
import {handleCreateLayout, handleUpdateFaq} from "../controller/layout.controller";
import {layOutValidator, updateFaqValidator} from "../validator/layout.validator";
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