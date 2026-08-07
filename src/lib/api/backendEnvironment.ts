interface BackendEnvironment {
  [key: string]: string | undefined;
  PRODCUTION?: string;
  NESTJS_API_URL?: string;
  NESTJS_API_URL_PROUDCTION?: string;
}

export function isProductionBackendEnabled(env: BackendEnvironment = process.env): boolean {
  return env.PRODCUTION?.trim().toLowerCase() === "true";
}

export function getConfiguredBackendUrl(env: BackendEnvironment = process.env): string {
  const variable = isProductionBackendEnabled(env) ? "NESTJS_API_URL_PROUDCTION" : "NESTJS_API_URL";
  const url = env[variable]?.trim();

  if (!url) {
    throw new Error(`${variable} is not set. Configure it in the frontend environment.`);
  }

  return url.replace(/\/+$/, "");
}
