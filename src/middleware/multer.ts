import {existsSync} from "node:fs"
import logger from "../config/logger";
import {mkdirSync, unlinkSync} from "fs";
import multer, {diskStorage} from "multer";
import {extname} from "path"
import {Request} from "express";
import {Error} from "mongoose";
import {ErrorHandler} from "../utils/ErrorHandler";

const ALLOWED_FILE_TYPES = ["jpg", "jpeg", "png"]

const MAX_FILE_SIZE = 1024 * 1024 * 2 // 2MB


/**
 * @description         - create a folder if it does not exist
 * @param directory      - the directory to create
 * @returns void
 *
 * */

const PUBLIC = 'public'
const UPLOAD_FOLDER = `${PUBLIC}/uploads`
const uploadFolder = (directory: any) => {
    if (!existsSync(directory)) {
        try {
            mkdirSync(directory, {recursive: true})
            logger.info(`${directory} folder created successfully`);
        } catch (err: any) {
            logger.error(`Error creating ${directory}`, err)
            throw new Error(`Error creating ${directory}`)
        }
    }
}

// ensure that public and uploads folder exists
uploadFolder(PUBLIC)
uploadFolder(UPLOAD_FOLDER)


/**
 * @description        - Multer storage configuration
 * @param destination  - the destination of the file
 * @returns void
 * */

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_FOLDER);
    },
    filename: function (req, file, cb) {
        const extensionName = extname(file.originalname);

        cb(null, Date.now() + "-" + file.originalname.replace(extensionName, "") + extensionName);
    },
});


/**
 * @description        - Multer file filter
 * @param req          - the request object
 * @param file         - the file object
 * @param cb           - the callback function
 * */
const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {

    const extension = extname(file.originalname)
    if (!ALLOWED_FILE_TYPES.includes(extension.substring(1))) {
        return cb(new ErrorHandler("Only images are allowed", 400))
    }
    cb(null, true)
}


/**
 * @description        - Multer upload configuration
 *
 * */

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
})


/**
 * @description          - delete image function to delete image from the uploads folder
 * @param path           - the path of the image to delete
 * @returns void
 *
 * */
export const deleteImage = (path: string) => {
    try {
        if (existsSync(path)) {
            unlinkSync(path)
            logger.info(`Image deleted successfully from path: ${path}`)
        } else {
            logger.warn(`Image does not exist in path: ${path}`)
        }
    } catch (err: any) {
        logger.error(`Error deleting image:${err}`, err)
    }
}





















