

export class ErrorHandler extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);  // Call the parent class (Error) constructor
        this.statusCode = statusCode;  // Assign the statusCode

        Error.captureStackTrace(this, this.constructor);  // Capture stack trace
    }
}


