import { NextRequest, NextResponse } from "next/server";
import { validateSellerLogin } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password are required" },
        { status: 400 }
      );
    }

    const seller = validateSellerLogin(phone, password);

    if (!seller) {
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    // Set auth cookie (simple session for MVP)
    const cookieStore = await cookies();
    cookieStore.set("seller_id", String(seller.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        name: seller.name,
        businessName: seller.business_name,
        phone: seller.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
