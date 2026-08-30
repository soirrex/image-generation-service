import { Router } from "express";
import { injectable } from "inversify";

@injectable()
export abstract class ApiControllerBase {
  abstract readonly baseEndpoint: string;
  abstract readonly router: Router;

  protected abstract initializeRoutes(): void;
}
