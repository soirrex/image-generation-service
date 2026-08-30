import "dotenv/config";
import { defineConfig } from "@prisma/config";

const db_url = process.env["DATABASE_URL"];

if (!db_url) {
  throw new Error("DATABASE_URL in .env not found");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  skills: {
    agents: ["agents"],
  },
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: db_url,
  },
});
