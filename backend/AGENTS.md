# Project

- **Express** server (REST API, JWT auth, Swagger docs)
- **PostgreSQL** via Prisma
- **DI** via InversifyJS

## Stack

- Node.js + TypeScript (ESM, `moduleResolution: nodenext`, `strict`)
- Express 5, cookie-parser, cors
- Prisma ORM + `@prisma/adapter-pg`
- InversifyJS (`reflect-metadata`)
- JWT (`jsonwebtoken`), pino + pino-pretty logging
- Swagger (`swagger-jsdoc`, `swagger-ui-express`), Joi not yet used
- Jest + ts-jest + supertest for tests

## Structure

```
src/
├── api/                                         # API layer
│   ├── auth                                       # Auth module
│   │   ├── auth.controller.ts                       # Auth endpoints
│   │   ├── auth.service.ts                          # Auth logic
│   │   └── auth.service.test.ts                     # Auth tests
│
│
├── common/classes                               # Shared bases
│   ├── error.class.ts                            # Errors
│   ├── api_controller.class.ts                   # Controller for API base
│   └── middleware.class.ts                       # Middleware base
│
├── config/                                      # App config
│   ├── env.config.ts                              # Env helper
│   └── swagger.config.ts                          # Swagger spec
│
├── middlewares/                                 # Express middlewares
│   ├── auth.middleware.ts                         # Auth check
│   ├── error.middleware.ts                        # Error handler
│   └── request_logger.middleware.ts               # Request logger
│
├── repositories/                                # DB layer
│   ├── user.repository.ts                         # User storage
│
├── services/                                    # Shared services
│   ├── jwt.service.ts                             # JWT helper
│   └── logger.service.ts                          # Logger
│
├── generated/                                   # Generated Prisma client — DON'T TOUCH
│
├── app.ts                                       # App setup
├── container.ts                                 # DI container
├── index.ts                                     # Entry point
└── prisma.ts                                    # Prisma client
```

Root files:

```
├── prisma/schema.prisma                         # Database schema
├── types/express.d.ts                           # Type extensions
├── tests/                                       # E2E tests
├── prisma.config.js                             # Prisma settings
├── tsconfig.json                                # TypeScript settings
├── eslint.config.ts                             # Linter settings
├── jest.config.js                               # Test settings
├── .prettierrc                                  # Formatter settings
├── .gitignore                                   # Git ignore
├── package.json                                 # Dependencies + scripts
└── AGENTS.md                                    # Project guide
```

## NPM Commands

| Command            | Description                                       |
| ------------------ | ------------------------------------------------- |
| `npm run dev`      | Run with hot reload (jiti)                        |
| `npm run build`    | Compile TypeScript to `dist/`                     |
| `npm start`        | Run compiled build from `dist/index.js`           |
| `npm run test:unit`| Unit tests (`*.test.ts` inside `src/`)            |
| `npm run test:e2e` | E2E tests (supertest, `tests/`)                   |
| `npm run lint`     | ESLint with autofix (`src/**/*.ts`)               |
| `npm run format`   | Prettier (`src/**/*.ts`) + `prisma format`        |

## Key Points

1. All classes containing logic used by other classes are annotated with `@injectable()` so they can be registered in the DI container.
2. Dependencies are injected via the constructor using `@inject()`.
3. Protected routes must use the `AuthMiddleware`; the user id is available via `req.userId`.
4. After every change run `npm run format` and `npm run lint`.

## API endpoints

New endpoints must be created in the following format:

```
src/api/
└── <endpoint name>/
    ├── <endpoint name>.controller.ts   # Routes + Swagger annotations
    ├── <endpoint name>.service.ts      # Business logic
    └── <endpoint name>.service.test.ts # Unit tests (for service)
```

Controllers must follow this template and every controllers must extend `ApiControllerBase`:

```ts
import { inject, injectable } from "inversify";
import { Router, Response, Request } from "express";
import { ExampleService } from "./example.service.js";

@injectable()
export class ExampleController extends ApiControllerBase {
  readonly router = Router();
  readonly baseEndpoint = "/api";

  constructor(@inject(ExampleService) private exampleService: ExampleService) {
    super()
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    this.router.post("/example", this.postMethod.bind(this));
    ...
  }

  private async postMethod(req: Request, res: Response) {
    ...
    const message = await this.exampleService.anyMethod(data1, data2);
    res.status(200).json(message);
  }
}
```

New controllers and services must be registered in `src/container.ts`:

```ts
inversifyContainer.bind(ApiControllerBase).to(AuthController).inSingletonScope()
inversifyContainer.bind(<EndpointName>Service).toSelf().inSingletonScope();
```

Controller are auto-registered in `src/app.ts` via `@multiInject(ApiControllerBase)` and use `baseEndpoint` for endpoint names.

## Middlewares

Every middleware must extend `BaseMiddleware`:

```ts
import { injectable } from "inversify";
import { BaseMiddleware } from "../common/classes/middleware.class.js";
import { Request, Response, NextFunction } from "express";

@injectable()
export class ExampleMiddleware extends BaseMiddleware {
  constructor(...) {
    super();
    this.handle = this.handle.bind(this);
  }

  handle(req: Request, res: Response, next: NextFunction) {
    ...
    next();
  }
}
```

## Errors

All request errors must be thrown from `BaseError` subclasses in `src/common/classes/error.class.ts` (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalServerError`, .etc). The `ErrorMiddleware` formats them into `{ message, error, statusCode }`.
