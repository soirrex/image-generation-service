import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string; // added in AuthMiddleware, user telegram id
    }
  }
}
