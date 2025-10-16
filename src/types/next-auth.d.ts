import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string;
      secondName?: string;
      middleName?: string;
      lastName: string;
      emailVerified?: Date;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    firstName: string;
    secondName?: string;
    middleName?: string;
    lastName: string;
    emailVerified?: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName: string;
    secondName?: string;
    middleName?: string;
    lastName: string;
    emailVerified?: Date;
  }
}
