import { inject, injectable } from "inversify";
import { Router, Response, Request } from "express";
import { AuthService } from "./auth.service.js";
import { BadRequestError } from "../../common/classes/error.class.js";
import { ApiControllerBase } from "../../common/classes/api_controller.class.js";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & authorization
 */

@injectable()
export class AuthController extends ApiControllerBase {
  readonly router = Router();
  readonly baseEndpoint = "/api/auth";

  constructor(@inject(AuthService) private authService: AuthService) {
    super();
    this.initializeRoutes();
  }

  protected initializeRoutes(): void {
    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Register a new user
     *     description: Creates a new user and sets httpOnly cookie `userToken` (JWT, 7 days, SameSite=Strict)
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AuthBody'
     *     responses:
     *       201:
     *         description: User registered successfully. Sets `userToken` cookie.
     *         headers:
     *           Set-Cookie:
     *             description: httpOnly cookie with JWT — `userToken=xxx;`
     *             schema:
     *               type: string
     *               example: userToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...;
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Register successfully
     *       400:
     *         description: Validation error or missing body
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       409:
     *         description: Email already exists
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.router.post("/register", this.register.bind(this));

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Login user
     *     description: Authenticates user and sets httpOnly cookie `userToken` (JWT, 7 days, SameSite=Strict)
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AuthBody'
     *     responses:
     *       200:
     *         description: User authenticated successfully. Sets `userToken` cookie.
     *         headers:
     *           Set-Cookie:
     *             description: httpOnly cookie with JWT — `userToken=xxx;`
     *             schema:
     *               type: string
     *               example: userToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...;
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: Login successfully
     *       400:
     *         description: Validation error or missing body
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         description: Invalid email or password
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    this.router.post("/login", this.login.bind(this));

    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: Logout user
     *     description: Clears `userToken` httpOnly cookie
     *     tags: [Auth]
     *     responses:
     *       200:
     *         description: Logout successful. Clears `userToken` cookie.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: logout successfully
     */
    this.router.post("/logout", this.logout.bind(this));
  }

  private async register(req: Request, res: Response) {
    if (!req.body) throw new BadRequestError("Body is required");
    const message = await this.authService.register(req.body, res);
    res.status(201).json(message);
  }

  private async login(req: Request, res: Response) {
    if (!req.body) throw new BadRequestError("Body is required");
    const message = await this.authService.login(req.body, res);
    res.status(200).json(message);
  }

  private async logout(req: Request, res: Response) {
    res.clearCookie("userToken");
    res.status(200).json({ message: "logout successfully" });
  }
}
