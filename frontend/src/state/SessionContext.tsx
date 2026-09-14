/**
 * Session state for the three-screen flow.
 *
 * Profile and analysis results live in memory + sessionStorage only (Security &
 * Privacy 5.3 / FR-007 / FR-043). Nothing is persisted beyond the session, and
 * results are never written to the service-worker cache.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnalyzeResponse, UserProfile } from "@food-signal/shared";

interface SessionState {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  result: AnalyzeResponse | null;
  setResult: (result: AnalyzeResponse | null) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

const PROFILE_KEY = "fs.profile";
const RESULT_KEY = "fs.result";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(() => load(PROFILE_KEY, {}));
  const [result, setResultState] = useState<AnalyzeResponse | null>(() => load(RESULT_KEY, null));

  useEffect(() => {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    if (result) sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
    else sessionStorage.removeItem(RESULT_KEY);
  }, [result]);

  const value = useMemo<SessionState>(
    () => ({
      profile,
      setProfile: setProfileState,
      result,
      setResult: setResultState,
      reset: () => {
        setProfileState({});
        setResultState(null);
        sessionStorage.removeItem(PROFILE_KEY);
        sessionStorage.removeItem(RESULT_KEY);
      },
    }),
    [profile, result],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider.");
  return ctx;
}
