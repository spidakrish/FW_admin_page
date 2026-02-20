import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "admin" | "viewer";
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: "admin" | "viewer";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "viewer";
  }
}
