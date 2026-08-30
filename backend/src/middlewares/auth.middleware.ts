import { inject, injectable } from "inversify";
import { BaseMiddleware } from "../common/classes/middleware.class.js";
import { Request, Response, NextFunction } from "express";
import { JwtService } from "../services/jwt.service.js";
import { UnauthorizedError } from "../common/classes/error.class.js";

@injectable()
export class AuthMiddleware extends BaseMiddleware {
  constructor(@inject(JwtService) private jwtService: JwtService) {
    super();
    this.handle = this.handle.bind(this);
  }

  handle(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies.userToken;

    if (!token) {
      throw new UnauthorizedError("Token not found");
    }

    const payload = this.jwtService.verify(token);

    req.userId = payload.userId;
    next();
  }
}
