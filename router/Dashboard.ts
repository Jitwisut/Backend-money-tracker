import { Elysia, t } from "elysia";
import { dashboard } from "../controller/dashboradcontroller";
import { jwt } from "@elysiajs/jwt";
import { AuthenticationError } from "../utils/error";
export const DashboardRouter = new Elysia({ prefix: "/api/dashboard" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET || "secret",
    }),
  )
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
  .get("/", dashboard.getSummary, {
    query: t.Object({
      startDate: t.Optional(t.String()),
      endDate: t.Optional(t.String()),
    }),
  });
