import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // DEV MODE: Auto-login as default user
        const defaultUser = await prisma.user.findUnique({
          where: { email: "gregoriorenzo05@gmail.com" },
        });

        if (!defaultUser) {
          return null;
        }

        return {
          id: defaultUser.id.toString(),
          email: defaultUser.email,
          name: `${defaultUser.firstName} ${defaultUser.lastName}`,
          firstName: defaultUser.firstName,
          lastName: defaultUser.lastName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // DEV MODE: Always set default user if no token exists
      if (!token.id) {
        const defaultUser = await prisma.user.findUnique({
          where: { email: "gregoriorenzo05@gmail.com" },
        });

        if (defaultUser) {
          token.id = defaultUser.id.toString();
          token.email = defaultUser.email;
          token.name = `${defaultUser.firstName} ${defaultUser.lastName}`;
          token.firstName = defaultUser.firstName;
          token.lastName = defaultUser.lastName;
        }
      }

      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
});
