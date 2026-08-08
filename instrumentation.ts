/**
 * Starts the standalone mock backend HTTP server (src/mocks/standalone) on the
 * NESTJS_API_URL port when API_MOCKING=enabled, so both Route Handlers and
 * Server Components can reach it over real HTTP. Disable (and point
 * NESTJS_API_URL at the real backend) once one exists — see .env.example.
 */
export async function register() {
  const { getConfiguredBackendUrl, isProductionBackendEnabled } =
    await import("./src/lib/api/backendEnvironment");
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.API_MOCKING === "enabled" &&
    !isProductionBackendEnabled()
  ) {
    const { startMockServer } = await import("./src/mocks/standalone");
    const port = Number(new URL(getConfiguredBackendUrl()).port || 3001);
    startMockServer(port);
  }
}
