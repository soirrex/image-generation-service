import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "MiniApp API",
      version: "1.0.0",
      description: "API documentation for the Telegram MiniApp",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "userToken",
          description: "JWT token stored in httpOnly cookie after auth",
        },
      },
      schemas: {
        AuthBody: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", example: "email@example.com", max: 256 },
            password: { type: "string", example: "password", min: 6, max: 50 },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Error Message" },
            error: { type: "string", example: "Bad Request" },
            statusCode: { type: "integer", example: 400 },
          },
        },
      },
    },
    paths: {},
  },
  apis: ["./src/api/**/*.controller.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
