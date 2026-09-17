import { inject, injectable } from "inversify";
import { Router, Request, Response } from "express";
import { ApiControllerBase } from "../../common/classes/api_controller.class.js";
import { ImagesService } from "./images.service.js";
import { BadRequestError, UnauthorizedError } from "../../common/classes/error.class.js";
import { AuthMiddleware } from "../../middlewares/auth.middleware.js";

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Images generation and management
 */

@injectable()
export class ImagesController extends ApiControllerBase {
  readonly router = Router();
  readonly baseEndpoint = "/api/images";

  constructor(
    @inject(ImagesService) private imagesService: ImagesService,
    @inject(AuthMiddleware) private authMiddleware: AuthMiddleware,
  ) {
    super();
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    /**
     * @swagger
     * /api/images:
     *   post:
     *     summary: Generate image
     *     description: Creates a new image record with status `generation`
     *     tags: [Images]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/GenerateImageBody'
     *     responses:
     *       202:
     *         description: Image generation started
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Image generation started
     *       400:
     *         description: Validation error or missing body
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         description: Unauthorized
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.router.post(
      "/",
      this.authMiddleware.handle.bind(this.authMiddleware),
      this.generate.bind(this),
    );

    this.router.get(
      "/",
      this.authMiddleware.handle.bind(this.authMiddleware),
      this.getAll.bind(this),
    );
  }

  private async generate(req: Request, res: Response) {
    if (!req.body) throw new BadRequestError('"body" is required');
    if (!req.userId) throw new UnauthorizedError("Unauthorized");

    const result = await this.imagesService.generate(req.userId, req.body);
    res.status(202).json(result);
  }

  private async getAll(req: Request, res: Response) {
    if (!req.userId) throw new UnauthorizedError("Unauthorized");

    const result = await this.imagesService.getAll(req.userId, req.query);
    res.status(202).json(result);
  }
}
