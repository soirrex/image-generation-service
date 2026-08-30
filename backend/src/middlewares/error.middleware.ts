import { NextFunction, Request, Response } from "express";
import { injectable } from "inversify";
import { BaseError } from "../common/classes/error.class.js";
import { BaseMiddleware } from "../common/classes/middleware.class.js";

@injectable()
export class ErrorMiddleware extends BaseMiddleware {
  constructor() {
    super();
    this.handle = this.handle.bind(this);
  }

  handle(err: unknown, req: Request, res: Response, next: NextFunction): void {
    if (err instanceof BaseError) {
      res.status(err.statusCode).json({
        message: err.message,
        error: err.error,
        statusCode: err.statusCode,
      });
    } else {
      res.status(500).json({
        message: (err as Error).message,
        error: "Internal Server Error",
        statusCode: 500,
      });
    }

    next();
  }
}
