import { Elysia, t } from "elysia";
import { transaction } from "../controller/transactioncontroller";
import { Category, TransactionType } from "@prisma/client";
import { AuthenticationError } from "../utils/error";
export const Transactionrouter = new Elysia({
  prefix: "/api/transactions",
})
  .derive(async ({ jwt, headers, set }: any) => {
    const auth = headers["authorization"];

    if (!auth || !auth.startsWith("Bearer ")) {
      set.status = 401;
      throw new AuthenticationError("Unauthorized: กรุณาเข้าสู่ระบบ");
    }
    // 2. แกะ Token ออกมาเช็ค
    const token = auth.split(" ")[1];

    const profile = await jwt.verify(token);
    console.log(profile);
    // 3. ถ้า Token ปลอม หรือหมดอายุ
    if (!profile) {
      set.status = 401;
      throw new AuthenticationError("Unauthorized: Token ไม่ถูกต้อง");
    }
    return { user: profile };
  })
  .post("/", transaction.create, {
    body: t.Object({
      title: t.String({ minLength: 1, error: "กรุณากรอกชื่อรายการ" }),
      amount: t.Numeric({ minimum: 1, error: "จำนวนเงินต้องมากกว่า0" }),
      type: t.Enum(TransactionType, {
        error: "ประเภทต้องเป็น INCOME หรือ EXPENSE",
      }),
      categoryName: t.String({ minLength: 1, error: "กรุณาระบุชื่อหมวดหมู่" }),
      date: t.Optional(t.String()),
      note: t.Optional(t.String()),
    }),
  })
  .get("/", transaction.getAll)
  .put("/:id", transaction.update, {
    params: t.Object({
      id: t.Numeric(),
    }),
    body: t.Object({
      title: t.Optional(
        t.String({ minLength: 1, error: "กรุณากรอกชื่อรายการ" }),
      ),
      amount: t.Optional(
        t.Numeric({ minimum: 1, error: "จำนวนเงินต้องมากกว่า0" }),
      ),
      type: t.Optional(t.Enum(TransactionType)),
      category: t.Optional(
        t.String({ minLength: 1, error: "กรุณาระบุหมวดหมู่" }),
      ),
      date: t.Optional(t.String()),
      note: t.Optional(t.String()),
    }),
  })
  .delete("/:id", transaction.delete, {
    params: t.Object({
      id: t.Number(),
    }),
  });
