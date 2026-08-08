import { create } from "zustand";
import type { AccountSuspendedPayload } from "@/src/lib/api/contracts/notification";

/**
 * Holds a real-time suspension notice pushed over the socket. When set, a
 * blocking modal is shown (SuspensionModal in RealtimeProvider) and the user
 * is logged out. Cleared only by that flow.
 */
interface SuspensionState {
  suspension: AccountSuspendedPayload | null;
  setSuspension: (payload: AccountSuspendedPayload | null) => void;
}

export const useSuspensionStore = create<SuspensionState>((set) => ({
  suspension: null,
  setSuspension: (payload) => set({ suspension: payload }),
}));
