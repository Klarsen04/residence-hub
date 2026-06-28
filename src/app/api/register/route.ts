import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { name, email, password, authCode } = await request.json();

    if (!email || !password || !authCode) {
      return NextResponse.json(
        { error: "Email, password, and authorization code are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const code = await prisma.authorizationCode.findUnique({
      where: { code: authCode },
    });

    if (!code) {
      return NextResponse.json(
        { error: "Invalid authorization code" },
        { status: 403 }
      );
    }

    if (code.usedBy) {
      return NextResponse.json(
        { error: "This authorization code has already been used" },
        { status: 403 }
      );
    }

    if (code.expiresAt && code.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This authorization code has expired" },
        { status: 403 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name || null,
        email,
        password: hashedPassword,
        role: code.role,
        hallId: code.hallId,
      },
    });

    await prisma.authorizationCode.update({
      where: { id: code.id },
      data: {
        usedBy: user.id,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
