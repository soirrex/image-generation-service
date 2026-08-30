import { Request, Response, NextFunction } from "express";

type NormalArgs = [req: Request, res: Response, next: NextFunction];
type ErrorArgs = [err: unknown, req: Request, res: Response, next: NextFunction];

export abstract class BaseMiddleware {
  abstract handle(...args: NormalArgs | ErrorArgs): void;
}
