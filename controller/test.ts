import bcryptjs from "bcryptjs";

const password = "123456";

const reson = await bcryptjs.hash(password, 10);
console.log(reson);
