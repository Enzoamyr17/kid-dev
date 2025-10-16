import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  cookies: {
    sessionToken: {
      name: `authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials);

          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.log("User not found:", email);
            return null;
          }

          // Check if user is active
          if (!user.isActive) {
            console.log("User is inactive:", email);
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            console.log("Invalid password for:", email);
            return null;
          }

          // Check email verification (optional - can be enforced later)
          // if (!user.emailVerified) {
          //   console.log("Email not verified:", email);
          //   return null;
          // }

          return {
            id: user.id.toString(),
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            secondName: user.secondName || undefined,
            middleName: user.middleName || undefined,
            lastName: user.lastName,
            emailVerified: user.emailVerified || undefined,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.firstName = user.firstName;
        token.secondName = user.secondName;
        token.middleName = user.middleName;
        token.lastName = user.lastName;
        token.emailVerified = user.emailVerified;
      }

      // Session update
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.firstName = token.firstName as string;
        session.user.secondName = token.secondName as string | undefined;
        session.user.middleName = token.middleName as string | undefined;
        session.user.lastName = token.lastName as string;
        if (token.emailVerified) {
          session.user.emailVerified = token.emailVerified as Date;
        }
      }
      return session;
    },
  },
});
