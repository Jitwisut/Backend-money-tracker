import { Context } from "elysia";
export type getTransaction = {
  startDate?: string; //ใส่?เพื่อบอกให้รู้ว่าตัวแปรนี้จะส่งมาหรือไม่ส่งมาก็ได้
  endDate?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
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
