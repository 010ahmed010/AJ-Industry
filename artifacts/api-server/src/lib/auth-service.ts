import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { getMongoDb } from "./mongo";

export type UserRecord = {
  _id: string;
  username?: string;
  email: string;
  passwordHash: string;
  name: string;
  company: string;
  role: "client" | "admin";
  createdAt: Date;
  updatedAt: Date;
};

export type SessionRecord = {
  _id: string;
  token: string;
  userId: string;
  username?: string;
  email: string;
  name: string;
  role: "client" | "admin";
  createdAt: Date;
  expiresAt: Date;
};

/**
 * Hash a plain password using secure scrypt with a unique random 16-byte salt
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plain password against the stored salt:hash using timing-safe comparison
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically strong session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new session in MongoDB for a user (valid for 30 days)
 */
export async function createSession(user: {
  _id: string;
  username?: string;
  email: string;
  name: string;
  role?: "client" | "admin";
}): Promise<string> {
  const db = await getMongoDb();
  const sessions = db.collection<SessionRecord>("sessions");
  const token = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await sessions.insertOne({
    _id: randomUUID(),
    token,
    userId: user._id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role ?? "client",
    createdAt: now,
    expiresAt,
  });

  return token;
}

/**
 * Validate a session token against MongoDB sessions collection
 */
export async function validateSession(token: string): Promise<SessionRecord | null> {
  if (!token) return null;
  const db = await getMongoDb();
  const sessions = db.collection<SessionRecord>("sessions");
  const session = await sessions.findOne({ token });

  if (!session) return null;

  if (new Date() > new Date(session.expiresAt)) {
    // Session expired, remove it
    await sessions.deleteOne({ token });
    return null;
  }

  return session;
}

/**
 * Revoke a session token upon logout
 */
export async function deleteSession(token: string): Promise<void> {
  if (!token) return;
  const db = await getMongoDb();
  await db.collection<SessionRecord>("sessions").deleteOne({ token });
}
