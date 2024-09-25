import {existsSync} from "node:fs"
import logger from "../config/logger";
import {mkdirSync} from "fs";
import multer, {diskStorage} from "multer";
import {extname} from "path"
import {Request, Response} from "express";
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

const storage = diskStorage({
    destination: (req, file, cb) => {
        // file name config
        const extension = extname(file.originalname)
        const fileName = Date.now() + -+Math.round(Math.random() * 1E9) + extension
        cb(null, fileName)
    }
})


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
























