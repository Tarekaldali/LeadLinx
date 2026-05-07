import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { sendVerificationCode } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Rate limiting (simple check for now)
    const db = await getDb();
    const lastRequest = await db.collection("verification_codes").findOne(
      { email },
      { sort: { createdAt: -1 } }
    );

    if (lastRequest && (new Date() - new Date(lastRequest.createdAt)) < 60000) {
      return NextResponse.json({ error: "Please wait 60 seconds before requesting another code." }, { status: 429 });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    // Store in DB
    await db.collection("verification_codes").insertOne({
      email,
      code: hashedCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // Send email
    await sendVerificationCode(email, code);

    return NextResponse.json({ message: "Verification code sent!" });
  } catch (error) {
    console.error("Error in send-code:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
