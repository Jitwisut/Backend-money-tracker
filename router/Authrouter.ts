import { Elysia, t } from "elysia";
import { Authcontroller } from "../controller/Authcontroller";
import { jwt } from "@elysiajs/jwt";
export const Authrouter = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET as string,
    }),
  )
  .post("/register", Authcontroller.signup, {
    body: t.Object({
      username: t.String({ minLength: 1, error: "กรุณาระบุ username" }),
      password: t.String({ minLength: 1, error: "กรุณาระบุ password" }),
      name: t.String({ minLength: 1, error: "กรุณาระบุ ชื่อ" }),
    }),
  })

  .post("/signin", Authcontroller.signin, {
    body: t.Object({
      username: t.String({ minLength: 1, error: "กรุณาระบุ username" }),
      password: t.String({ minLength: 1, error: "กรุณาระบุ password" }),
    }),
  });
