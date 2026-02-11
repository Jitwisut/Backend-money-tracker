import { Context } from "elysia";
import { prisma } from "../src/db";
import { TransactionType } from "@prisma/client";
import { AuthContext } from "../type/type";
import { AuthenticationError } from "../utils/error";

export const dashboard = {
  getSummary: async ({
    user,
    query,
  }: {
    user: AuthContext["user"];
    query: { startDate?: string; endDate?: string };
  }) => {
    if (!user || !user.id) throw new AuthenticationError("Unauthorized");

    const userId = Number(user.id);
    const { startDate, endDate } = query;

    // เตรียมเงื่อนไขเรื่องเวลา (ถ้ามีการส่งมา)
    const dateFilter: any = {};
    if (startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.date = {
        gte: new Date(startDate),
        lte: end,
      };
    }

    try {
      // 1. หาผลรวม Income และ Expense (ใช้ aggregate ของ Prisma)
      // Query นี้จะวิ่งไป Database รอบเดียว ได้ครบทั้ง Income/Expense
      const totals = await prisma.transaction.groupBy({
        by: ["type"],
        where: {
          userId: userId,
          ...dateFilter,
        },

        _sum: {
          amount: true,
        },
      });

      // จัด Format ข้อมูลให้ Frontend ใช้ง่ายๆ
      const income = totals.find((t) => t.type === "INCOME")?._sum.amount || 0;
      const expense =
        totals.find((t) => t.type === "EXPENSE")?._sum.amount || 0;
      const balance = Number(income) - Number(expense);

      // 2. หายอดรวมแยกตามหมวดหมู่ (สำหรับทำ Pie Chart รายจ่าย)
      const expenseByCategory = await prisma.transaction.groupBy({
        by: ["categoryId"], // จัดกลุ่มตามชื่อหมวดหมู่
        where: {
          userId: userId,
          type: "EXPENSE", // เอาเฉพาะรายจ่าย
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc", // เรียงจากมากไปน้อย
          },
        },
      });
      // 1. ดึง ID ของหมวดหมู่ทั้งหมดที่มีรายจ่ายออกมา
      const categoryIds = expenseByCategory
        .map((item) => item.categoryId)
        .filter((id): id is number => id !== null);
      // 2. ไปหาชื่อหมวดหมู่ (Category Name) จาก Database ตาม ID เหล่านั้น
      const categories = await prisma.category.findMany({
        where: {
          id: { in: categoryIds },
        },
        select: {
          id: true,
          name: true,
        },
      });
      return {
        data: {
          summary: {
            totalIncome: Number(income),
            totalExpense: Number(expense),
            balance: balance,
          },
          pieChartData: expenseByCategory.map((item) => {
            // 1. หาข้อมูลหมวดหมู่ก่อน (ประกาศตัวแปรในนี้ได้เพราะมีปีกกาครอบแล้ว)
            const categoryInfo = categories.find(
              (c) => c.id === item.categoryId,
            );

            // 2. ส่งค่ากลับไปเป็น Object
            return {
              category: categoryInfo?.name || "ไม่ระบุหมวดหมู่",
              total: Number(item._sum.amount),
            };
          }), // อย่าลืมวงเล็บปิดของ map
        },
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch dashboard data");
    }
  },
};
