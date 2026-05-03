import { NextRequest, NextResponse } from "next/server";
import { getSellerById } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sellerId = cookieStore.get("seller_id")?.value;

    if (!sellerId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const seller = getSellerById(parseInt(sellerId));

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        name: seller.name,
        phone: seller.phone,
        email: seller.email,
        businessName: seller.business_name,
        hasGst: seller.has_gst,
        gstNumber: seller.gst_number,
        city: seller.address_city,
        state: seller.address_state,
        pincode: seller.address_pincode,
        address: seller.address_full,
        isVerified: seller.is_verified,
        createdAt: seller.created_at,
      },
    });
  } catch (error) {
    console.error("Get seller error:", error);
    return NextResponse.json(
      { error: "Failed to get seller info" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("seller_id");
  return NextResponse.json({ success: true });
}
