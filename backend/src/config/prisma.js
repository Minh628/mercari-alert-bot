import { PrismaClient } from '@prisma/client'

// Prisma 7.x: Truyền datasourceUrl trực tiếp khi khởi tạo PrismaClient
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
})

export default prisma;