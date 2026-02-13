// สร้าง Error Class สำหรับกรณี User กรอกผิด
export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

// สร้าง Error สำหรับคนไม่ Login (401)
export class AuthenticationError extends Error {
  constructor(public message: string) {
    super(message);
  }
}
