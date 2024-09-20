import { Request, Response, NextFunction } from 'express'


// ! catch async error
export const catchAsyncError = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}