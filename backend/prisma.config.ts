import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Gán tạm chuỗi giả để vượt qua lỗi của Prisma lúc chạy "docker build" trên Render
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/dummy";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
