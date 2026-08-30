import { Response } from "express";
import { inject, injectable } from "inversify";
import Joi from "joi";
import { BadRequestError, ConflictError } from "../../common/classes/error.class.js";
import { UserRepository } from "../../repositories/user.repository.js";
import bcrypt from "bcrypt";
import { JwtService } from "../../services/jwt.service.js";

const UserSchema = Joi.object({
  email: Joi.string().required().email().max(256).trim(),
  password: Joi.string().required().min(6).max(50),
});

@injectable()
export class AuthService {
  constructor(
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(JwtService) private jwtService: JwtService,
  ) {}

  async register(body: object, res: Response) {
    const { error, value } = UserSchema.validate(body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      throw new BadRequestError(error.message);
    }

    const existsUser = await this.userRepository.getByEmail(value.email);

    if (existsUser) throw new ConflictError("This email already exists");

    const hashPasswrod = await bcrypt.hash(value.password, 10);

    const createUser = await this.userRepository.create(value.email, hashPasswrod);
    const token = this.jwtService.create(createUser.id);

    res.cookie("userToken", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    return {
      message: "Register successfully",
    };
  }

  async login(body: object, res: Response) {
    const { error, value } = UserSchema.validate(body, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      throw new BadRequestError(error.message);
    }

    const user = await this.userRepository.getByEmail(value.email);

    if (!user) throw new ConflictError("Invalid email or password");

    const validatePasswrod = await bcrypt.compare(value.password, user.password);

    if (!validatePasswrod) throw new ConflictError("Invalid email or password");

    const token = this.jwtService.create(user.id);

    res.cookie("userToken", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    return {
      message: "Login successfully",
    };
  }
}
