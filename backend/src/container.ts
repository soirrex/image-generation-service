import "reflect-metadata";
import { Container } from "inversify";
import { App } from "./app.js";
import { EnvConfig } from "./config/env.config.js";
import { ErrorMiddleware } from "./middlewares/error.middleware.js";
import { AuthMiddleware } from "./middlewares/auth.middleware.js";
import { RequestLoggerMiddleware } from "./middlewares/request_logger.middleware.js";
import { LoggerService } from "./services/logger.service.js";
import { JwtService } from "./services/jwt.service.js";
import { ApiControllerBase } from "./common/classes/api_controller.class.js";
import { AuthController } from "./api/auth/auth.controller.js";
import { AuthService } from "./api/auth/auth.service.js";
import { UserRepository } from "./repositories/user.repository.js";

export const inversifyContainer = new Container();

inversifyContainer.bind(App).toSelf().inSingletonScope();

// config
inversifyContainer.bind(EnvConfig).toSelf().inSingletonScope();

// middlewares
inversifyContainer.bind(ErrorMiddleware).toSelf().inSingletonScope();
inversifyContainer.bind(AuthMiddleware).toSelf().inSingletonScope();
inversifyContainer.bind(RequestLoggerMiddleware).toSelf().inSingletonScope();

// services
inversifyContainer.bind(LoggerService).toSelf().inSingletonScope();
inversifyContainer.bind(JwtService).toSelf().inSingletonScope();

// repositories
inversifyContainer.bind(UserRepository).toSelf().inSingletonScope();

// api controllers
inversifyContainer.bind(ApiControllerBase).to(AuthController).inSingletonScope();

// api services
inversifyContainer.bind(AuthService).toSelf().inSingletonScope();
