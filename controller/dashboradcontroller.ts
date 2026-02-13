import { Context } from "elysia";
import { prisma } from "../src/db";
import { TransactionType } from "@prisma/client";
import { AuthContext } from "../type/type";
import { AuthenticationError } from "../utils/error";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Initialize DayJS plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const dashboard = {
  getSummary: async ({
    user,
    query,
  }: {
    user: AuthContext["user"];
    query: {
      startDate?: string;
      endDate?: string;
      type?: string;
      categoryId?: string; // รับค่ามาเป็น String (เช่น "1" หรือ "1,5,8")
    };
  }) => {
    if (!user || !user.id) throw new AuthenticationError("Unauthorized");

    const userId = Number(user.id);
    const { startDate, endDate, type, categoryId } = query;

    // --- ส่วนจัดการเรื่องเวลา ---
    let dateFilter: any = {};
    try {
      if (startDate && endDate) {
        const start = dayjs
          .tz(startDate, "Asia/Bangkok")
          .startOf("day")
          .toDate();
        const end = dayjs.tz(endDate, "Asia/Bangkok").endOf("day").toDate();

        // เช็คว่าวันที่ถูกต้องไหม
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          dateFilter.date = {
            gte: start,
            lte: end,
          };
        }
      }
    } catch (e) {
      console.error("Date parsing error:", e);
    }

    // --- สร้างเงื่อนไขการค้นหาหลัก (Base Where Condition) ---
    const whereCondition: any = {
      userId: userId,
      ...dateFilter,
    };

    // --- ✅ Logic กรอง Category (รองรับทั้งเลือกหลายหมวดและหมวดเดียว) ---
    if (
      categoryId &&
      categoryId !== "ALL" &&
      categoryId !== "undefined" &&
      categoryId !== ""
    ) {
      const catStr = String(categoryId);

      if (catStr.includes(",")) {
        // กรณีเลือกหลายหมวด (เช่น "1,2,3")
        const ids = catStr
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id) && id > 0);

        if (ids.length > 0) {
          whereCondition.categoryId = { in: ids };
        }
      } else {
        // กรณีมีตัวเดียว
        const id = Number(catStr);
        if (!isNaN(id) && id > 0) {
          whereCondition.categoryId = id;
        }
      }
    }

    try {
      // --- 1. หาผลรวม Income และ Expense ---
      const totals = await prisma.transaction.groupBy({
        by: ["type"],
        where: whereCondition,
        _sum: {
          amount: true,
        },
      });

      // จัด Format ข้อมูล Summary Cards
      const income = Number(
        totals.find((t) => t.type === "INCOME")?._sum.amount || 0,
      );
      const expense = Number(
        totals.find((t) => t.type === "EXPENSE")?._sum.amount || 0,
      );
      const balance = income - expense;

      // --- 2. หายอดรวมแยกตามหมวดหมู่ (สำหรับทำ Pie Chart) ---
      const pieChartWhere = {
        ...whereCondition,
        type: type === "INCOME" || type === "EXPENSE" ? type : "EXPENSE",
      };

      const expenseByCategory = await prisma.transaction.groupBy({
        by: ["categoryId"],
        where: pieChartWhere,
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
      });

      // --- 3. ดึงชื่อหมวดหมู่มาใส่ ---
      const categoryIds = expenseByCategory
        .map((item) => item.categoryId)
        .filter((id): id is number => id !== null);

      const categories = await prisma.category.findMany({
        where: {
          id: { in: categoryIds },
        },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });

      return {
        data: {
          summary: {
            totalIncome: income,
            totalExpense: expense,
            balance: balance,
          },
          pieChartData: expenseByCategory.map((item) => {
            const categoryInfo = categories.find(
              (c) => c.id === item.categoryId,
            );

            return {
              category: categoryInfo?.name || "ไม่ระบุหมวดหมู่",
              total: Number(item._sum.amount),
              color: categoryInfo?.type === "INCOME" ? "#10B981" : "#EF4444",
            };
          }),
        },
      };
    } catch (error) {
      console.error("Dashboard Error:", error);
      throw new Error("Failed to fetch dashboard data");
    }
  },
};
