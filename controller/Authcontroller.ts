import { BadRequestError } from "../utils/error";
import bcryptjs from "bcryptjs";
import { prisma } from "../src/db";
import { RegisterBody, SigninBody } from "../type/type";
import { Context } from "elysia";
export const Authcontroller = {
  signin: async ({ body, set, jwt }: SigninBody) => {
    const { username, password } = body;

    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      throw new BadRequestError("Username หรือรหัสไม่ถูกต้อง");
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestError("Username หรือรหัสไม่ถูกต้อง");
    }

    const token = await jwt.sign({
      id: user.id,
      username: user.username,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 วัน
    });
    return {
      message: "Success: You have logged in",
      token,
    };
  },

  signup: async ({
    body,
    set,
  }: {
    body: RegisterBody;
    set: Context["set"];
  }) => {
    const { username, password, name } = body;
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      throw new BadRequestError("ชื่อนี้มีผู้ใช้งานแล้ว");
    }
    const hashpassword = await bcryptjs.hash(password, 10);
    const newuser = await prisma.user.create({
      data: {
        username,
        password: hashpassword,
        name,
      },
    });
    set.status = 201;
    return { success: true, message: "สมัครสมาชิกสำเร็จ", userId: newuser };
  },
};
