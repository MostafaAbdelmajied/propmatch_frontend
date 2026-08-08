import {
  getConfiguredBackendUrl,
  getConfiguredRealtimeUrl,
  isProductionBackendEnabled,
} from "../backendEnvironment";

describe("frontend backend environment", () => {
  const env = {
    PRODCUTION: "false",
    NESTJS_API_URL: "http://localhost:3001/api/",
    NESTJS_API_URL_PROUDCTION: "https://api.propmatch.example/api/",
    NEXT_PUBLIC_SOCKET_URL: "http://localhost:3001/",
  };

  it("uses the local NestJS URL when production is disabled", () => {
    expect(getConfiguredBackendUrl(env)).toBe("http://localhost:3001/api");
  });

  it("uses the production NestJS URL when PRODCUTION is true", () => {
    expect(getConfiguredBackendUrl({ ...env, PRODCUTION: " true " })).toBe(
      "https://api.propmatch.example/api",
    );
    expect(isProductionBackendEnabled({ ...env, PRODCUTION: "TRUE" })).toBe(true);
  });

  it("fails clearly when the selected URL is missing", () => {
    expect(() =>
      getConfiguredBackendUrl({
        ...env,
        PRODCUTION: "true",
        NESTJS_API_URL_PROUDCTION: "",
      }),
    ).toThrow("NESTJS_API_URL_PROUDCTION is not set");
  });

  it("uses the local realtime URL when production is disabled", () => {
    expect(getConfiguredRealtimeUrl(env)).toBe("http://localhost:3001");
  });

  it("derives the production realtime origin from the production API URL", () => {
    expect(getConfiguredRealtimeUrl({ ...env, PRODCUTION: "true" })).toBe(
      "https://api.propmatch.example",
    );
  });

  it("supports a separate production realtime origin", () => {
    expect(
      getConfiguredRealtimeUrl({
        ...env,
        PRODCUTION: "true",
        NEXT_PUBLIC_SOCKET_URL_PROUDCTION: "https://realtime.propmatch.example/",
      }),
    ).toBe("https://realtime.propmatch.example");
  });
});
