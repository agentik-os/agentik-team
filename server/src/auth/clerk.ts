import { createClerkClient, verifyToken } from "@clerk/backend";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

export const clerk = clerkSecretKey
  ? createClerkClient({ secretKey: clerkSecretKey })
  : null;

export type ClerkSessionResult = {
  userId: string;
  email: string | null;
  name: string | null;
};

/**
 * Verify a Clerk session JWT and return user info.
 * Returns null if verification fails or Clerk is not configured.
 */
export async function verifyClerkSession(token: string): Promise<ClerkSessionResult | null> {
  if (!clerkSecretKey || !clerk) return null;
  try {
    const payload = await verifyToken(token, { secretKey: clerkSecretKey });
    // Fetch full user details for email/name
    const user = await clerk.users.getUser(payload.sub);
    return {
      userId: payload.sub,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
    };
  } catch {
    return null;
  }
}
