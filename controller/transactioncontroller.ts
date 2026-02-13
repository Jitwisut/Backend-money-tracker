import { Context, Elysia, status, t } from "elysia";
import { prisma } from "../src/db";
import { Category, TransactionType } from "@prisma/client"; // ดึง Enum จาก Prisma มาใช้
import { getTransaction, CreateTransactionBody } from "../type/type";
import { AuthContext } from "../type/type";
import { AuthenticationError } from "../utils/error";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
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
    // Validation เบื้องต้น
    /*if (!title || !amount || !type || !category) {
      set.status = 400;
      return { message: "Error: Missing required fields" };
    }*/
    const userId = user.id;
    if (!userId) {
      throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
    }
    try {
      const newTransaction = await prisma.transaction.create({
        data: {
          title,
          amount, // ไม่ต้องแปลง Number() ก็ได้ เพราะ t.Numeric จัดการให้แล้ว
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
    set,
    user,
  }: {
    query: getTransaction;
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
    const { startDate, endDate, type, categoryId } = query;
    try {
      if (!user) {
        throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
      }
      console.log("Fetching data for User ID:", user.id);
      const where: any = {
        userId: user.id,
      };
      dayjs.extend(utc);
      dayjs.extend(timezone);
      //บังคับให้ใช้ timezone ไทย
      const start = dayjs.tz(startDate, "Asia/Bangkok").startOf("day").toDate();
      const end = dayjs.tz(endDate, "Asia/Bangkok").endOf("day").toDate();
      if (startDate && endDate) {
        where.date = {
          gte: start,
          lte: end,
        };
      }
      if (categoryId && categoryId !== "ALL") {
        where.categoryId = Number(categoryId);
      }
      // เช็คว่ามีค่า type ส่งมาจริงไหม ก่อนจะยัดลง where
      if (
        type &&
        Object.values(TransactionType).includes(type as TransactionType)
      ) {
        where.type = type as TransactionType;
      }
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: {
            select: {
              name: true, // ดึงมาเฉพาะชื่อ category
            },
          },
        },
        orderBy: [{ date: "desc" }, { amount: "asc" }],
      });
      return { data: transactions };
    } catch (error) {
      set.status = 500;
    }
  },
  update: async ({
    params: { id },
    body,
    user,
  }: {
    params: { id: number };
    body: any;
    user: AuthContext["user"];
  }) => {
    try {
      if (!user) {
        throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
      }
      const updateTx = await prisma.transaction.update({
        where: { id: Number(id), userId: user.id },
        data: body,
      });
      return { status: "success", data: updateTx };
    } catch (error) {
      return {
        status: "error",
        message: "ไม่พบรายการที่ต้องการแก้ไข หรือข้อมูลไม่ถูกต้อง",
      };
    }
  },
  delete: async ({
    params: { id },
    set,
    user,
  }: {
    params: { id: Number };
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
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
      return { message: "ไม่พบรายการ หรือคุณไม่มีสิทธิ์" };
    }
  },
  getCategory: async ({
    set,
    user,
  }: {
    set: Context["set"];
    user: AuthContext["user"];
  }) => {
    if (!user) {
      throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
    }
    const category = await prisma.category.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
    return { status: "success", data: category };
  },
};
