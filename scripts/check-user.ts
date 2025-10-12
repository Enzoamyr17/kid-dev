import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "gregoriorenzo05@gmail.com" },
    });

    if (!user) {
      console.log("User not found");
      return;
    }

    console.log("User found:");
    console.log("Email:", user.email);
    console.log("Email Verified:", user.emailVerified);
    console.log("Has Password:", user.password ? "Yes" : "No");

    // Test password
    const passwordMatch = await bcrypt.compare("123456", user.password);
    console.log("Password '123456' matches:", passwordMatch);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
