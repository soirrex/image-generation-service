import request from "supertest";
import { inversifyContainer } from "../src/container.js";
import { Application } from "express";
import { App } from "../src/app.js";
import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import { prisma } from "../src/prisma.js";

describe("auth e2e test", () => {
  let app: Application;

  const user = {
    email: "test@example.com",
    password: "testPassword",
  };

  beforeAll(async () => {
    const appInstance = inversifyContainer.get(App);
    app = appInstance.getApp();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: user.email,
      },
    });
  });

  describe("register", () => {
    it("POST /api/auth/register - throw error 400 if body is empty", async () => {
      const response = await request(app).post("/api/auth/register").expect(400);

      expect(response.body).toEqual({
        error: "Bad Request",
        message: "Body is required",
        statusCode: 400,
      });
    });

    it.each([
      { email: "", message: '"email" is not allowed to be empty' },
      { email: 123, message: '"email" must be a string' },
      { email: "invalid", message: '"email" must be a valid email' },
      {
        email: "e".repeat(300),
        message: '"email" must be a valid email',
      },
    ])(
      "POST /api/auth/register - throw error 400 if the email is invalid ($message)",
      async ({ email, message }) => {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            password: user.password,
            email,
          })
          .expect(400);

        expect(response.body).toEqual({
          error: "Bad Request",
          message,
          statusCode: 400,
        });
      },
    );

    it.each([
      { password: "", message: '"password" is not allowed to be empty' },
      { password: 123, message: '"password" must be a string' },
      { password: "12345", message: '"password" length must be at least 6 characters long' },
      {
        password: "p".repeat(101),
        message: '"password" length must be less than or equal to 50 characters long',
      },
    ])(
      "POST /api/auth/register - throw error 400 if the password is invalid ($message)",
      async ({ password, message }) => {
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            password,
            email: user.email,
          })
          .expect(400);

        expect(response.body).toEqual({
          error: "Bad Request",
          message,
          statusCode: 400,
        });
      },
    );

    it("POST /api/auth/register - should create new user", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "testPassword",
        })
        .expect(201);

      expect(response.body.message).toEqual("Register successfully");
      expect(response.headers["set-cookie"]![0]).toMatch(/userToken=.*/);
    });

    it("POST /api/auth/register - throw error 409 if the email already exists", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: "test@example.com",
          password: "testPassword",
        })
        .expect(409);

      expect(response.body.message).toEqual("This email already exists");
    });
  });

  describe("login", () => {
    it("POST /api/auth/login - throw error 400 if body is empty", async () => {
      const response = await request(app).post("/api/auth/login").expect(400);

      expect(response.body).toEqual({
        error: "Bad Request",
        message: "Body is required",
        statusCode: 400,
      });
    });

    it.each([
      { email: "", message: '"email" is not allowed to be empty' },
      { email: 123, message: '"email" must be a string' },
      { email: "invalid", message: '"email" must be a valid email' },
      {
        email: "e".repeat(300),
        message: '"email" must be a valid email',
      },
    ])(
      "POST /api/auth/login - throw error 400 if the email is invalid ($message)",
      async ({ email, message }) => {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            password: user.password,
            email,
          })
          .expect(400);

        expect(response.body).toEqual({
          error: "Bad Request",
          message,
          statusCode: 400,
        });
      },
    );

    it.each([
      { password: "", message: '"password" is not allowed to be empty' },
      { password: 123, message: '"password" must be a string' },
      { password: "12345", message: '"password" length must be at least 6 characters long' },
      {
        password: "p".repeat(101),
        message: '"password" length must be less than or equal to 50 characters long',
      },
    ])(
      "POST /api/auth/login - throw error 400 if the password is invalid ($message)",
      async ({ password, message }) => {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            password,
            email: user.email,
          })
          .expect(400);

        expect(response.body).toEqual({
          error: "Bad Request",
          message,
          statusCode: 400,
        });
      },
    );

    it("POST /api/auth/login - throw error 400 if password is wrong", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: user.email,
          password: "wrongPassword",
        })
        .expect(401);

      expect(response.body.message).toEqual("Invalid email or password");
    });

    it("POST /api/auth/login - throw error 400 if email is wrong", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrong@example.com",
          password: user.password,
        })
        .expect(401);

      expect(response.body.message).toEqual("Invalid email or password");
    });

    it("POST /api/auth/login - login user successfully", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "testPassword",
        })
        .expect(200);

      expect(response.body.message).toEqual("Login successfully");
      expect(response.headers["set-cookie"]![0]).toMatch(/userToken=.*/);
    });
  });
});
