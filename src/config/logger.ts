import DailyRotateFile from "winston-daily-rotate-file";
import {addColors, createLogger, format, transports} from "winston";

const {combine, timestamp, printf, errors, colorize, json} = format;


// Define custom colors
const customColors = {
    error: "red",
    warn: "yellow",
    info: "cyan",
    http: "magenta",
    verbose: "grey",
    debug: "blue",
    silly: "rainbow"
};

addColors(customColors);

const logFormat = printf(({level, message, timestamp, stack}) => {
    return `${timestamp} ${level}: ${stack || message}`;
});

const logDir = "/tmp/logs"; // Update this as needed

const logger = createLogger({
    level: "info",
    format: combine(timestamp({format: "YYYY-MM-DD HH:mm:ss"}), errors({stack: true}), logFormat),
    transports: [
        new DailyRotateFile({
            dirname: logDir,
            filename: "app-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxSize: "5m",
            maxFiles: "5d",
            zippedArchive: true,
            format: combine(json())
        })
    ],
    exceptionHandlers: [
        new transports.File({
            dirname: logDir,
            filename: "exceptions.log"
        })
    ],
    rejectionHandlers: [
        new transports.File({
            dirname: logDir,
            filename: "rejections.log"
        })
    ]
});

logger.add(
    new transports.Console({
        format: combine(colorize(), logFormat)
    })
);

export default logger;