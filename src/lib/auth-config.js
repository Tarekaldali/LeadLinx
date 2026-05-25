import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "./mongodb";
import { getDb } from "./mongodb";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "leadlinx",
    collections: {
      Users: "users",
      Accounts: "accounts",
      Sessions: "sessions",
      VerificationTokens: "verification_tokens",
    }
  }),
  events: {
    async createUser({ user }) {
      console.log(`👤 [AUTH] New user created: ${user.email}`);
    },
    async linkAccount({ user, account }) {
      console.log(`🔗 [AUTH] Account linked: ${account.provider} for ${user.email}`);
    },
    async signIn({ user, account }) {
      console.log(`🚀 [AUTH] User signed in: ${user.email} via ${account?.provider}`);
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Verification Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          throw new Error("Email and code are required");
        }

        const db = await getDb();
        
        const verificationEntry = await db.collection("verification_codes")
          .findOne(
            { email: credentials.email },
            { sort: { createdAt: -1 } }
          );

        if (!verificationEntry) {
          throw new Error("No verification code found. Please request a new one.");
        }

        const now = new Date();
        const expiry = new Date(verificationEntry.expiresAt);
        if (now > expiry) {
          throw new Error("Verification code has expired.");
        }

        const isValid = await bcrypt.compare(credentials.code, verificationEntry.code);
        if (!isValid) {
          throw new Error("Invalid verification code.");
        }

        await db.collection("verification_codes").deleteOne({ _id: verificationEntry._id });

        let user = await db.collection("users").findOne({ email: credentials.email });
        
        if (!user) {
          const newUser = {
            email: credentials.email,
            name: credentials.email.split("@")[0],
            role: "user",
            credits: 400,
            createdAt: new Date(),
            emailVerified: new Date(),
          };
          const result = await db.collection("users").insertOne(newUser);
          user = { ...newUser, id: result.insertedId.toString() };
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role || "user",
          credits: user.credits ?? 400,
          plan: user.plan || "free",
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
        token.credits = user.credits ?? 400;
        token.plan = user.plan || "free";
      }
      
      // PERIODIC SYNC: Fetch latest data from DB to reflect manual changes (admin role, credits)
      // We do this every time the token is accessed to ensure manual DB changes are reflected
      try {
        const db = await getDb();
        const dbUser = await db.collection("users").findOne({ email: token.email });
        if (dbUser) {
          token.role = dbUser.role || "user";
          token.credits = dbUser.credits ?? 400;
          token.plan = dbUser.plan || "free";
          token.id = dbUser._id.toString();
          token.name = dbUser.name || token.name;
        }
      } catch (err) {
        console.error("[AUTH] Error syncing user in JWT callback:", err);
      }

      // Handle manual session updates
      if (trigger === "update" && session?.user) {
        return { ...token, ...session.user };
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.credits = token.credits;
        session.user.plan = token.plan || "free";
        if (token.name) session.user.name = token.name;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        const db = await getDb();
        const existingUser = await db.collection("users").findOne({ email: user.email });
        
        if (!existingUser) {
          // Initialize new Google users with default fields
          await db.collection("users").updateOne(
            { email: user.email },
            { 
              $setOnInsert: { 
                name: user.name,
                image: user.image,
                role: "user", 
                credits: 400, 
                createdAt: new Date(),
                emailVerified: new Date()
              } 
            },
            { upsert: true }
          );
        }
      }
      return true;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
};
