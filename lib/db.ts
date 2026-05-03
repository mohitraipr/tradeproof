import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";

const dbPath = path.join(process.cwd(), "data", "bestseller.db");
const db = new Database(dbPath);

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export interface Seller {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  business_name: string;
  gst_number: string | null;
  has_gst: boolean;
  address_city: string;
  address_state: string;
  address_pincode: string;
  address_full: string;
  is_verified: boolean;
  created_at: string;
}

export function createSeller(data: {
  name: string;
  phone: string;
  email?: string;
  businessName: string;
  hasGst: boolean;
  gstNumber?: string;
  city: string;
  state: string;
  pincode: string;
  address: string;
  password: string;
}): Seller {
  const stmt = db.prepare(`
    INSERT INTO sellers (name, phone, email, business_name, gst_number, has_gst,
      address_city, address_state, address_pincode, address_full, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.name,
    data.phone,
    data.email || null,
    data.businessName,
    data.hasGst ? data.gstNumber : null,
    data.hasGst ? 1 : 0,
    data.city,
    data.state,
    data.pincode,
    data.address,
    hashPassword(data.password)
  );

  return getSellerById(result.lastInsertRowid as number)!;
}

export function getSellerById(id: number): Seller | null {
  const stmt = db.prepare(`
    SELECT id, name, phone, email, business_name, gst_number, has_gst,
      address_city, address_state, address_pincode, address_full, is_verified, created_at
    FROM sellers WHERE id = ?
  `);
  return stmt.get(id) as Seller | null;
}

export function getSellerByPhone(phone: string): Seller | null {
  const stmt = db.prepare(`
    SELECT id, name, phone, email, business_name, gst_number, has_gst,
      address_city, address_state, address_pincode, address_full, is_verified, created_at
    FROM sellers WHERE phone = ?
  `);
  return stmt.get(phone) as Seller | null;
}

export function validateSellerLogin(phone: string, password: string): Seller | null {
  const stmt = db.prepare(`
    SELECT id, name, phone, email, business_name, gst_number, has_gst,
      address_city, address_state, address_pincode, address_full, is_verified, created_at, password_hash
    FROM sellers WHERE phone = ?
  `);
  const seller = stmt.get(phone) as (Seller & { password_hash: string }) | null;

  if (!seller) return null;
  if (!verifyPassword(password, seller.password_hash)) return null;

  const { password_hash, ...sellerData } = seller;
  return sellerData;
}

export function phoneExists(phone: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM sellers WHERE phone = ?");
  return stmt.get(phone) !== undefined;
}

export default db;
