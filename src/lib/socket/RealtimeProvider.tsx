"use client";

import { createContext, useContext } from "react";
import { useRealtime } from "./useRealtime";

/**
 * Holds the single socket connection for the tab and exposes whether it's live,
 * so data hooks can honour the design spec's "WebSocket, degrade to polling":
 * poll only while the socket is down, and stop the moment it's up.
 */
const RealtimeContext = createContext<{ connected: boolean }>({ connected: false });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const state = useRealtime();
  return <RealtimeContext.Provider value={state}>{children}</RealtimeContext.Provider>;
}

/** True when live updates are arriving — i.e. polling is unnecessary. */
export function useRealtimeConnected(): boolean {
  return useContext(RealtimeContext).connected;
}

/**
 * Poll interval for a query that has a socket equivalent: off while connected,
 * `fallbackMs` while not.
 */
export function usePollWhileOffline(fallbackMs: number): number | false {
  return useRealtimeConnected() ? false : fallbackMs;
}
