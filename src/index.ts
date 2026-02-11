import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Transactionrouter } from "../router/transactionrouter";
import { BadRequestError, AuthenticationError } from "../utils/error";
import { Authrouter } from "../router/Authrouter";
import jwt from "@elysiajs/jwt";
import { DashboardRouter } from "../router/Dashboard";
const app = new Elysia()
  .use(cors())
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        message: error.message,
      };
    }
    if (error instanceof BadRequestError) {
      set.status = 400;
      return {
        success: false,
        message: error.message,
      };
    }
    if (error instanceof AuthenticationError) {
      set.status = 401;
      return {
        success: false,
        message: error.message,
      };
    }
    if (code === "PARSE") {
      set.status = 400;
      return {
        status: "error",
        type: "Parse Error",
        message: "ส่งข้อมูล JSON มาไม่ถูกต้อง (ตรวจสอบ Syntax)",
      };
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        status: "error",
        type: "Not found endpoint",
        message: "ไม่พอ endpoint ที่กำหนด",
      };
    }
  })
  .use(Authrouter)
  .use(DashboardRouter)
  .use(Transactionrouter)
  .get("/", () => "Hello Elysia")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
