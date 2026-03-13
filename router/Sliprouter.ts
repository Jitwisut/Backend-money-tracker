import { Elysia, t } from "elysia";
import { slip } from "../controller/Slipcontroller";
export const SlipRouter = new Elysia({ prefix: "/api/slip" }).post(
  "/",
  slip.getSlip,
  {
    body: t.Object({
      slip: t.File({
        type: ["image/jpeg", "image/png"],
        error: "กรุณาอัปโหลดไฟล์สลิป",
        maxSize: 5 * 1024 * 1024, // 5MB
        errorMaxSize: "ขนาดไฟล์ต้องไม่เกิน 5MB",
      }),
    }),
  },
);
