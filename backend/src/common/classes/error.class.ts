export class BaseError extends Error {
  statusCode: number;
  error: string;

  constructor(statusCode: number, message: string, error: string) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string) {
    super(400, message, "Bad Request");
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(401, message, "Unauthorized");
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(403, message, "Forbidden");
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(404, message, "Not Found");
  }
}

export class ConflictError extends BaseError {
  constructor(message: string) {
    super(409, message, "Conflict");
  }
}

export class InternalServerError extends BaseError {
  constructor(message: string) {
    super(500, message, "Internal Server Error");
  }
}
