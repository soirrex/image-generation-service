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
        // body schemas
        AuthBody: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", example: "email@example.com", max: 256 },
            password: { type: "string", example: "password", min: 6, max: 50 },
          },
        },
        GenerateImageBody: {
          type: "object",
          required: ["name", "promt", "width", "height"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 100,
              example: "My image",
              description: "Image name",
            },
            promt: {
              type: "string",
              minLength: 10,
              maxLength: 1000,
              example: "A beautiful sunset over mountains with clouds",
              description: "Prompt for image generation",
            },
            width: {
              type: "integer",
              minimum: 100,
              maximum: 1920,
              example: 1024,
              description: "Image width",
            },
            height: {
              type: "integer",
              minimum: 100,
              maximum: 1920,
              example: 1024,
              description: "Image height",
            },
          },
        },

        // elements schemas
        Image: {
          type: "object",
          properties: {
            id: { type: "string", example: "1", description: "Image id (BigInt as string)" },
            name: { type: "string", example: "My image" },
            promt: {
              type: "string",
              example: "A beautiful sunset over mountains with clouds",
            },
            status: {
              type: "string",
              enum: ["generation", "failed", "completed"],
              example: "generation",
            },
            completedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2026-09-16T12:00:00.000Z",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              example: "2026-09-16T12:00:00.000Z",
            },
          },
        },
        PaginatedImages: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Image" } },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 25 },
                total: { type: "integer", example: 100 },
              },
            },
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
