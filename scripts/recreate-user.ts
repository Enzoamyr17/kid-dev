import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function recreateUser() {
  try {
    const email = "gregoriorenzo05@gmail.com";
    const password = "123456";
    const birthdate = new Date("2003-05-17");

    // Delete existing user if exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("Deleting existing user...");
      await prisma.user.delete({
        where: { email },
      });
      console.log("User deleted");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: "Gregorio",
        secondName: "",
        middleName: "",
        lastName: "Renzo",
        birthdate,
        contact: "",
        emailVerified: new Date(), // Auto-verify
      },
    });

    console.log("\nUser created successfully!");
    console.log("Email:", user.email);
    console.log("ID:", user.id.toString());
    console.log("Email Verified:", user.emailVerified);

    // Verify password works
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("\nPassword verification test:", passwordMatch ? "✓ PASSED" : "✗ FAILED");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

recreateUser();
