import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

// Khởi tạo PrismaPg adapter theo chuẩn Prisma Postgres
const adapter = new PrismaPg({ connectionString });

// Khởi tạo PrismaClient với adapter
const prisma = new PrismaClient({ adapter });

export default prisma;

