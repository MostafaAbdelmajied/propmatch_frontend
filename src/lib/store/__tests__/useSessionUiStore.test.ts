import { act, renderHook } from "@testing-library/react";
import { useSessionUiStore } from "../useSessionUiStore";

describe("useSessionUiStore", () => {
  it("starts with the bottom nav visible", () => {
    const { result } = renderHook(() => useSessionUiStore());
    act(() => result.current.setBottomNavVisible(true));
    expect(result.current.bottomNavVisible).toBe(true);
  });

  it("hides the bottom nav on scroll-down", () => {
    const { result } = renderHook(() => useSessionUiStore());
    act(() => result.current.setBottomNavVisible(false));
    expect(result.current.bottomNavVisible).toBe(false);
  });
});
