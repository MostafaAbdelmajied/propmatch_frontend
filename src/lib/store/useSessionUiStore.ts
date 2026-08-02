import { create } from "zustand";

/**
 * Client-only UI state for the current session.
 *
 * This store is NOT the source of truth for entitlements/quotas or roles —
 * those are server-authoritative (see docs/analysis/rbac.md). V1 uses a strict
 * role-based account system, so there is no tenant⇄landlord mode switching to
 * track here (docs/analysis/conflicts.md A1).
 */
interface SessionUiState {
  /** Mobile bottom tab bar visibility — hides on scroll-down (design spec §4.5). */
  bottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
}

export const useSessionUiStore = create<SessionUiState>((set) => ({
  bottomNavVisible: true,
  setBottomNavVisible: (visible) => set({ bottomNavVisible: visible }),
}));
