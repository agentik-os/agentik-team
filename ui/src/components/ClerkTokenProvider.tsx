import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "../api/client";

/**
 * Bridges Clerk auth into the API client.
 * Registers a token getter so every API request automatically
 * includes the Clerk JWT as a Bearer token.
 */
export function ClerkTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkTokenGetter(() => getToken());
    return () => setClerkTokenGetter(null);
  }, [getToken]);

  return <>{children}</>;
}
