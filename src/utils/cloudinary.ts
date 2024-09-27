import logger from "../config/logger";
import {ErrorHandler} from "./ErrorHandler";
import {v2 as cloudinary} from "cloudinary"
import {deleteImage} from "../middleware/multer";


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


interface IImageUpload {
    path: string
    folder: string
    width?: number
}

export const imageUpload = async ({path, folder, width}: IImageUpload) => {
    try {
        let public_id: string;
        let url: string;

        const result = await cloudinary.uploader.upload(path, {
            folder: folder,
            width: width,
        })

        deleteImage(path)
        url = result.secure_url;
        public_id = result.public_id;

        return {url, public_id}
    } catch (err: any) {
        logger.error(`imageUpload:${err.message}`)
        return new ErrorHandler("Failed to upload image", 400)
    }
}



