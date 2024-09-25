import logger from "../config/logger";
import {ErrorHandler} from "./ErrorHandler";
import {v2 as cloudinary} from "cloudinary"


export const deleteImageFromCloudinary = async (public_id: string) => {
    try {
        const {result} = await cloudinary.uploader.destroy(public_id)
        if (result !== "ok") {
            return new ErrorHandler("Failed to delete image", 400)
        }
        return
    } catch (err: any) {
        logger.error(`deleteImageFromCloudinary:${err.message}`)
        return new ErrorHandler("Failed to delete image", 400)
    }
}

