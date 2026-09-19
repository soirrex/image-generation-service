import { jest, beforeEach, describe, it, expect } from "@jest/globals";
import { Response } from "express";
import bcrypt from "bcrypt";
import { AuthService } from "./auth.service.js";
import { UserRepository } from "../../repositories/user.repository.js";
import { JwtService } from "../../services/jwt.service.js";
import { User } from "../../generated/prisma/client.js";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from "../../common/classes/error.class.js";

describe("AuthService", () => {
  let service: AuthService;

  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockResponse: jest.Mocked<Response>;
  let mockUser: User;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      getByEmail: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    mockJwtService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockResponse = {
      cookie: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    mockUser = {
      id: "1",
      email: "123@example.com",
      password: "password",
    } as unknown as User;

    service = new AuthService(mockUserRepository as UserRepository, mockJwtService as JwtService);
  });

  describe("register", () => {
    it.each([
      [{ password: "password" }, '"email" is required'],
      [{ email: "", password: "password" }, '"email" is not allowed to be empty'],
      [{ email: "123", password: "password" }, '"email" must be a valid email'],
      [{ email: "123@example", password: "password" }, '"email" must be a valid email'],
      [{ email: "@example.com", password: "password" }, '"email" must be a valid email'],
      [{ email: "123example.com", password: "password" }, '"email" must be a valid email'],
      [
        { email: `${"a".repeat(200)}@example.com`, password: "password" },
        '"email" must be a valid email',
      ],
    ])("should throw error if email is invalid", async (body, message) => {
      await expect(service.register(body, mockResponse)).rejects.toThrow(
        new BadRequestError(message),
      );

      expect(mockUserRepository.getByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it.each([
      [{ email: "email@example.com" }, '"password" is required'],
      [{ password: "", email: "email@example.com" }, '"password" is not allowed to be empty'],
      [
        { password: "123", email: "email@example.com" },
        '"password" length must be at least 6 characters long',
      ],
      [
        { password: "a".repeat(100), email: "email@example.com" },
        '"password" length must be less than or equal to 50 characters long',
      ],
    ])("should throw error if password is invalid", async (body, message) => {
      await expect(service.register(body, mockResponse)).rejects.toThrow(
        new BadRequestError(message),
      );

      expect(mockUserRepository.getByEmail).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("should throw 409 if email already exists", async () => {
      mockUserRepository.getByEmail.mockResolvedValue(mockUser);

      expect(
        service.register({ password: "password", email: mockUser.email }, mockResponse),
      ).rejects.toThrow(new ConflictError("This email already exists"));

      expect(mockUserRepository.getByEmail).toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("register", async () => {
      mockUserRepository.getByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);
      mockJwtService.create.mockReturnValue("mockJwt");

      const response = await service.register(
        { password: "password", email: mockUser.email },
        mockResponse,
      );

      expect(mockUserRepository.getByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(mockUser.email, expect.any(String));

      expect(mockJwtService.create).toHaveBeenCalledWith(mockUser.id);
      expect(mockResponse.cookie).toHaveBeenCalledWith("userToken", "mockJwt", {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });

      expect(response).toEqual({
        message: "Register successfully",
      });
    });
  });

  describe("login", () => {
    it.each([
      [{ password: "password" }, '"email" is required'],
      [{ email: "", password: "password" }, '"email" is not allowed to be empty'],
      [{ email: "123", password: "password" }, '"email" must be a valid email'],
      [{ email: "123@example", password: "password" }, '"email" must be a valid email'],
      [{ email: "@example.com", password: "password" }, '"email" must be a valid email'],
      [{ email: "123example.com", password: "password" }, '"email" must be a valid email'],
      [
        { email: `${"a".repeat(200)}@example.com`, password: "password" },
        '"email" must be a valid email',
      ],
    ])("should throw error if email is invalid", async (body, message) => {
      await expect(service.login(body, mockResponse)).rejects.toThrow(new BadRequestError(message));

      expect(mockUserRepository.getByEmail).not.toHaveBeenCalled();

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it.each([
      [{ email: "email@example.com" }, '"password" is required'],
      [{ password: "", email: "email@example.com" }, '"password" is not allowed to be empty'],
      [
        { password: "123", email: "email@example.com" },
        '"password" length must be at least 6 characters long',
      ],
      [
        { password: "a".repeat(100), email: "email@example.com" },
        '"password" length must be less than or equal to 50 characters long',
      ],
    ])("should throw error if password is invalid", async (body, message) => {
      await expect(service.login(body, mockResponse)).rejects.toThrow(new BadRequestError(message));

      expect(mockUserRepository.getByEmail).not.toHaveBeenCalled();

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("should throw error 401 if email not found", async () => {
      mockUserRepository.getByEmail.mockResolvedValue(null);

      expect(
        service.login({ email: mockUser.email, password: "password" }, mockResponse),
      ).rejects.toThrow(new UnauthorizedError("Invalid email or password"));

      expect(mockUserRepository.getByEmail).toHaveBeenCalledWith(mockUser.email);

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("should throw error 401 if password is invalid", async () => {
      mockUserRepository.getByEmail.mockResolvedValue(mockUser);

      // eslint-disable-next-line
      jest.spyOn(bcrypt, "compare" as any).mockResolvedValue(false);

      expect(
        service.login({ email: mockUser.email, password: mockUser.password }, mockResponse),
      ).rejects.toThrow(new UnauthorizedError("Invalid email or password"));

      expect(mockUserRepository.getByEmail).toHaveBeenCalledWith(mockUser.email);

      expect(mockJwtService.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it("login", async () => {
      mockUserRepository.getByEmail.mockResolvedValue(mockUser);
      mockJwtService.create.mockReturnValue("mockJwt");

      // eslint-disable-next-line
      jest.spyOn(bcrypt, "compare" as any).mockResolvedValue(true);

      const result = await service.login(
        { email: mockUser.email, password: mockUser.password },
        mockResponse,
      );

      expect(mockUserRepository.getByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(result).toEqual({
        message: "Login successfully",
      });

      expect(mockJwtService.create).toHaveBeenCalledWith(mockUser.id);
      expect(mockResponse.cookie).toHaveBeenCalledWith("userToken", "mockJwt", {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "strict",
      });
    });
  });
});
