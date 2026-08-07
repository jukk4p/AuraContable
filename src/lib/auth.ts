import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db/config";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // En producción el modo debug vuelca detalle de autenticación a los logs.
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  useSecureCookies: process.env.NODE_ENV === "production" && process.env.DESKTOP_APP !== "true",
  cookies: {
    sessionToken: {
      name: (process.env.NODE_ENV === "production" && process.env.DESKTOP_APP !== "true") ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production" && process.env.DESKTOP_APP !== "true"
      }
    }
  },
  pages: {
    signIn: "/", // We are using the main page for sign in
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = credentials.email.trim().toLowerCase();
        const userResults = await db.select().from(users).where(eq(users.email, email));
        const user = userResults[0];

        // Un único mensaje para los dos casos: distinguir "no existe" de
        // "contraseña incorrecta" permite averiguar qué correos están dados de
        // alta probándolos uno a uno.
        const invalid = new Error("Credenciales incorrectas");

        if (!user || !user.passwordHash) throw invalid;
        if (!(await bcrypt.compare(credentials.password, user.passwordHash))) throw invalid;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
        if (user) {
            token.id = user.id;
        }
        return token;
    },
    async session({ session, token }) {
        if (token && session.user) {
            session.user.id = token.id as string;
        }
        return session;
    }
  }
};
