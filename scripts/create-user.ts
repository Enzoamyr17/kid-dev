import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createUser() {
  try {
    const email = "gregoriorenzo05@gmail.com";
    const password = "123456";
    const birthdate = new Date("2003-05-17");

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("User already exists!");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: "Gregorio",
        lastName: "Renzo",
      },
    });

    console.log("User created successfully!");
    console.log("Email:", user.email);
    console.log("ID:", user.id);
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
