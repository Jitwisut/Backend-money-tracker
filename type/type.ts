import { Context } from "elysia";
export type getTransaction = {
  startDate?: string;
  endDate?: string;
  type?: "INCOME" | "EXPENSE";
};
export type CreateTransactionBody = {
  title: string;
  amount: number;
  type?: "INCOME" | "EXPENSE";
  categoryName: string; // รับเป็น String จากหน้าบ้านมาก่อน
  date?: string; // JSON ส่งวันที่มาเป็น String เสมอ
  note?: string;
};

export type RegisterBody = {
  username: string;
  password: string;
  name: string;
};

export type SigninBody = {
  body: { username: string; password: string };
  set: Context["set"];
  jwt: any;
};
export type AuthContext = {
  user: {
    id: number;
    username: string;
  };
};
