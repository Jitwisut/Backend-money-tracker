import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
export const slip = {
  // 1. เรียกใช้งาน Gemini ด้วย API Key จาก .env

  getSlip: async ({ body, set }: { body: { slip: File }; set: any }) => {
    const file = body.slip;
    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");
    // 3. เตรียมข้อมูลรูปภาพให้อยู่ในฟอร์แมตที่ Gemini รู้จัก
    const imagePart = {
      inlineData: {
        data: base64String,
        mimeType: file.type, // เช่น 'image/jpeg' หรือ 'image/png'
      },
    };
    const prompt = `
        คุณคือ AI จัดการบัญชี โปรดอ่านสลิปโอนเงินนี้แล้วดึงข้อมูลออกมา
        ตอบกลับมาเป็น JSON format เท่านั้น ห้ามมีข้อความอื่นหรือ Markdown (เช่น \`\`\`json) ปนมาเด็ดขาด
        โครงสร้าง JSON ที่ต้องการ:
        {
          "date": "YYYY-MM-DD",
          "amount": 0.00,
          "receiver": "ชื่อผู้รับเงิน",
          "type": "รายจ่าย" // หรือ "รายรับ",
          "Reference": "ข้อมูลอ้างอิง เช่น หมายเลขอ้างอิง ",
          "category": "หมวดหมู่"
        }
        กฎสำหรับการวิเคราะห์ "category" (หมวดหมู่):
        ให้ดูจาก "บันทึกช่วยจำ" (Memo) บนสลิปเป็นหลัก หากไม่มี ให้ลองวิเคราะห์จาก "ชื่อผู้รับเงิน" แล้วเลือกจัดให้อยู่ในหมวดหมู่ใดหมวดหมู่หนึ่งดังต่อไปนี้เท่านั้น:
        - "อาหาร": หากหมายเหตุเกี่ยวกับ กินข้าว, เครื่องดื่ม, หรือชื่อผู้รับเป็นร้านอาหาร, คาเฟ่, ซูเปอร์มาร์เก็ต, 7-Eleven
        - "ช้อปปิ้ง": หากหมายเหตุเกี่ยวกับ ซื้อของ, เสื้อผ้า, ของใช้ส่วนตัว, Shopee, Lazada
        - "เดินทาง": หากหมายเหตุเกี่ยวกับ ค่ารถ, วิน, BTS, MRT, เติมน้ำมัน
        - "บิลและค่าใช้จ่าย": หากหมายเหตุเกี่ยวกับ ค่าไฟ, ค่าน้ำ, ค่าโทรศัพท์, ค่าเน็ต, บัตรเครดิต
        - "อื่นๆ": หากไม่มีบันทึกช่วยจำ และไม่สามารถวิเคราะห์หมวดหมู่จากชื่อผู้รับเงินได้
      `;
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
    });
    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    // 6. แปลงข้อความที่ได้กลับมาเป็น JSON Object
    const slipData = JSON.parse(text.trim());
    set.status = 200;
    return {
      success: true,
      data: slipData,
    };
  },
};
