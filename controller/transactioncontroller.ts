import { Context } from "elysia";
import { prisma } from "../src/db";
import { TransactionType } from "@prisma/client";
import { getTransaction, CreateTransactionBody } from "../type/type";
import { AuthContext } from "../type/type";
import { AuthenticationError } from "../utils/error";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Initialize plugins
dayjs.extend(utc);
dayjs.extend(timezone);

export const transaction = {
  create: async ({
    body,
    set,
    user,
  }: {
    body: CreateTransactionBody;
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
    const { title, amount, type, categoryName, date, note } = body;
    const userId = user.id;

    if (!userId) {
      throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
    }

    try {
      const newTransaction = await prisma.transaction.create({
        data: {
          title,
          amount: Number(amount),
          type: type as TransactionType,
          date: date ? new Date(date) : new Date(),
          note,
          user: { connect: { id: userId } },
          category: {
            connectOrCreate: {
              where: {
                name_userId: {
                  name: categoryName,
                  userId: userId,
                },
              },
              create: {
                name: categoryName,
                type: type as TransactionType,
                userId: userId,
                icon: "❓",
                color: "#cccccc",
              },
            },
          },
        },
      });
      set.status = 201;
      return {
        message: "บันทึกสำเร็จเรียบร้อยครับ",
        data: newTransaction,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  },

  getAll: async ({
    query,
    user,
  }: {
    query: getTransaction;
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
    const { startDate, endDate, type, categoryId } = query;

    if (!user || !user.id) {
      throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
    }

    const where: any = {
      userId: user.id,
    };

    // Filter วันที่
    if (startDate && endDate) {
      const start = dayjs.tz(startDate, "Asia/Bangkok").startOf("day").toDate();
      const end = dayjs.tz(endDate, "Asia/Bangkok").endOf("day").toDate();
      where.date = {
        gte: start,
        lte: end,
      };
    }

    // ✅ Logic CategoryId (รองรับ Multi-ID แบบ Comma-separated)
    if (
      categoryId &&
      categoryId !== "ALL" &&
      categoryId !== "undefined" &&
      categoryId !== ""
    ) {
      const catStr = String(categoryId);
      if (catStr.includes(",")) {
        const ids = catStr
          .split(",")
          .map((id) => Number(id.trim()))
          .filter((id) => !isNaN(id) && id > 0);
        if (ids.length > 0) {
          where.categoryId = { in: ids };
        }
      } else {
        const id = Number(catStr);
        if (!isNaN(id) && id > 0) {
          where.categoryId = id;
        }
      }
    }

    // ✅ แก้ไขปัญหา TypeScript "ALL" Error
    if (type && (type as string) !== "ALL") {
      if (Object.values(TransactionType).includes(type as any)) {
        where.type = type as TransactionType;
      }
    }

    try {
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { id: "desc" }],
      });

      return { data: transactions };
    } catch (error) {
      console.error("Fetch Transactions Error:", error);
      throw new Error("Failed to fetch transactions");
    }
  },

  update: async ({
    params: { id },
    body,
    user,
  }: {
    params: { id: string | number }; // ✅ รับได้ทั้ง string และ number
    body: any;
    user: AuthContext["user"];
  }) => {
    try {
      if (!user || !user.id) {
        throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
      }

      // 🔍 ลองหาดูก่อนว่ามีรายการนี้อยู่จริงไหม และเป็นของ User คนนี้ไหม
      const targetId = Number(id);
      const existingTx = await prisma.transaction.findFirst({
        where: { id: targetId, userId: user.id },
      });

      if (!existingTx) {
        return {
          status: "error",
          message: "ไม่พบรายการที่ต้องการแก้ไข หรือคุณไม่มีสิทธิ์ในรายการนี้",
        };
      }

      // 🚀 ทำการ Update
      const updateTx = await prisma.transaction.update({
        where: { id: targetId },
        data: {
          title: body.title,
          amount: body.amount ? Number(body.amount) : undefined, // ✅ บังคับเป็น Number
          type: body.type,
          date: body.date ? new Date(body.date) : undefined,
          note: body.note,
          categoryId: body.categoryId ? Number(body.categoryId) : undefined, // ✅ บังคับเป็น Number
        },
      });

      return { status: "success", data: updateTx };
    } catch (error) {
      console.error("Update Error:", error); // ดู Error ใน Terminal
      return {
        status: "error",
        message: "เกิดข้อผิดพลาดภายในระบบ ไม่สามารถแก้ไขข้อมูลได้",
      };
    }
  },

  delete: async ({
    params: { id },
    set,
    user,
  }: {
    params: { id: string | number };
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
    if (!user || !user.id) throw new AuthenticationError("Unauthorized");

    try {
      await prisma.transaction.delete({
        where: { id: Number(id), userId: user.id },
      });
      return {
        status: "Success",
        message: `ลบข้อมูลเรียบร้อย`,
      };
    } catch (error) {
      set.status = 404;
      return { message: "ไม่พบรายการ หรือคุณไม่มีสิทธิ์ลบ" };
    }
  },

  getCategory: async ({
    user,
  }: {
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
    if (!user || !user.id) throw new AuthenticationError("Unauthorized");

    try {
      const category = await prisma.category.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
        },
      });
      return { status: "success", data: category };
    } catch (error) {
      throw new Error("Failed to fetch categories");
    }
  },
};
