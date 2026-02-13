import { Context } from "elysia";
import { prisma } from "../src/db";
import { TransactionType } from "@prisma/client";
import { AuthContext } from "../type/type";
import { AuthenticationError } from "../utils/error";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
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
      categoryId?: string;
    }; // ✅ 1. เพิ่ม categoryId ใน Type Definition
  }) => {
    if (!user || !user.id) throw new AuthenticationError("Unauthorized");

    dayjs.extend(utc);
    dayjs.extend(timezone);

    const userId = Number(user.id);
    const { startDate, endDate, type, categoryId } = query; // ✅ 2. ดึง categoryId ออกมา

    // --- ส่วนจัดการเรื่องเวลา (เหมือนเดิม) ---
    const start = dayjs.tz(startDate, "Asia/Bangkok").startOf("day").toDate();
    const end = dayjs.tz(endDate, "Asia/Bangkok").endOf("day").toDate();

    const dateFilter: any = {};
    if (startDate && endDate) {
      end.setHours(23, 59, 59, 999);
      dateFilter.date = {
        gte: start,
        lte: end,
      };
    }

    // --- ✅ 3. สร้างเงื่อนไขการค้นหาหลัก (Base Where Condition) ---
    // เราจะสร้างตัวแปรนี้ไว้ใช้ร่วมกันทั้ง Dashboard และ PieChart
    const whereCondition: any = {
      userId: userId,
      ...dateFilter,
    };

    // ถ้ามีการส่ง categoryId มา และไม่ใช่ 'ALL' ให้เพิ่มเงื่อนไขกรองหมวดหมู่
    if (categoryId && categoryId !== "ALL") {
      whereCondition.categoryId = Number(categoryId);
    }

    try {
      // --- 1. หาผลรวม Income และ Expense (ใช้ whereCondition ตัวใหม่) ---
      const totals = await prisma.transaction.groupBy({
        by: ["type"],
        where: whereCondition, // ✅ กรองตาม Date และ Category ที่เลือก
        _sum: {
          amount: true,
        },
      });

      // จัด Format ข้อมูล Summary Cards
      const income = totals.find((t) => t.type === "INCOME")?._sum.amount || 0;
      const expense =
        totals.find((t) => t.type === "EXPENSE")?._sum.amount || 0;
      const balance = Number(income) - Number(expense);

      // --- 2. หายอดรวมแยกตามหมวดหมู่ (สำหรับทำ Pie Chart) ---
      const expenseByCategory = await prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          ...whereCondition, // ✅ ใช้เงื่อนไขเดิม (User + Date + Category)
          // ✅ เพิ่มเงื่อนไข Type สำหรับ Pie Chart (Income/Expense)
          type: (type as "INCOME" | "EXPENSE") || "EXPENSE",
        },
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
          type: true, // แถม type มาด้วยเผื่อใช้
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
            const categoryInfo = categories.find(
              (c) => c.id === item.categoryId,
            );

            return {
              category: categoryInfo?.name || "ไม่ระบุหมวดหมู่",
              total: Number(item._sum.amount),
              color: categoryInfo?.type === "INCOME" ? "#10B981" : "#EF4444", // (Optional) แถมสีให้ ถ้า Frontend อยากใช้
            };
          }),
        },
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch dashboard data");
    }
  },
};
