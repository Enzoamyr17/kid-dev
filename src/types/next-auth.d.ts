import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      department: string;
      position: string;
    } & DefaultSession["user"];
  }

  interface User {
    firstName?: string;
    lastName?: string;
    department?: string;
    position?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstName?: string;
    lastName?: string;
    department?: string;
    position?: string;
  }
}
