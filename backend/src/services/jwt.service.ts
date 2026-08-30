import { inject, injectable } from "inversify";
import jwt from "jsonwebtoken";
import { EnvConfig } from "../config/env.config.js";
import { UnauthorizedError } from "../common/classes/error.class.js";

interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

@injectable()
export class JwtService {
  constructor(@inject(EnvConfig) private config: EnvConfig) {}

  create(id: string): string {
    const payload: JwtPayload = { userId: id };

    const token = jwt.sign(payload, this.config.getOrThrow("JWT_SECRET"), {
      expiresIn: "24h",
    });

    return token;
  }

  verify(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.config.getOrThrow("JWT_SECRET")) as JwtPayload;
      return decoded;
    } catch {
      throw new UnauthorizedError("Invalid token");
    }
  }
}
