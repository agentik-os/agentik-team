import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setClerkTokenGetter } from "../api/client";

/**
 * Bridges Clerk auth into the API client.
 * Uses a ref to always capture the latest getToken function,
 * so API requests always get a fresh token even if Clerk's
 * session state changes.
 */
export function ClerkTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setClerkTokenGetter(() => getTokenRef.current());
    } else if (isLoaded && !isSignedIn) {
      setClerkTokenGetter(null);
    }
    return () => setClerkTokenGetter(null);
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}
