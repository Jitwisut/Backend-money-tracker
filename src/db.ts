// backend/src/db.ts
import { PrismaClient } from "@prisma/client";

// สร้าง instance เดียวใช้ทั่วโปรเจกต์
export const prisma = new PrismaClient();
console.log("🛠️ DEBUG DATABASE_URL:", process.env.DATABASE_URL);
