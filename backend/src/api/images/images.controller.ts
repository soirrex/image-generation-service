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

    /**
     * @swagger
     * /api/images:
     *   get:
     *     summary: Get all images
     *     description: Returns paginated list of images for the authenticated user
     *     tags: [Images]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         required: false
     *         description: Page number (min 1, default 1)
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *           example: 1
     *       - in: query
     *         name: limit
     *         required: false
     *         description: Items per page (1-100, default 25)
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 25
     *           example: 25
     *     responses:
     *       200:
     *         description: Paginated list of images
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 totalPages:
     *                   type: integer
     *                   example: 4
     *                   description: Total number of pages
     *                 curentPage:
     *                   type: integer
     *                   example: 1
     *                   description: Current page number
     *                 images:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Image'
     *       400:
     *         description: Validation error for query params
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
    this.router.get(
      "/",
      this.authMiddleware.handle.bind(this.authMiddleware),
      this.getAll.bind(this),
    );

    this.router.delete(
      "/:id",
      this.authMiddleware.handle.bind(this.authMiddleware),
      this.deleteById.bind(this),
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
    res.status(200).json(result);
  }

  private async deleteById(req: Request, res: Response) {}
}
