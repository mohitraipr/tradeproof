import { NextRequest, NextResponse } from "next/server";
import { createSeller, phoneExists } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, phone, email, businessName, hasGst, gstNumber, city, state, pincode, address, password } = body;

    // Validation
    if (!name || !phone || !businessName || !city || !state || !pincode || !address || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (phoneExists(phone)) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 400 }
      );
    }

    const seller = createSeller({
      name,
      phone,
      email,
      businessName,
      hasGst: Boolean(hasGst),
      gstNumber,
      city,
      state,
      pincode,
      address,
      password,
    });

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        name: seller.name,
        businessName: seller.business_name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
