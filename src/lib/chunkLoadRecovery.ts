const CHUNK_RELOAD_ATTEMPT_KEY = "ovbridge:chunk-reload-attempt";
let vitePreloadFailed = false;

export class RouteModuleLoadError extends Error {
  public constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : "Route module failed to load");
    this.name = "RouteModuleLoadError";
    this.cause = cause;
  }
}

export function handleVitePreloadError(): void {
  vitePreloadFailed = true;

  try {
    if (window.sessionStorage.getItem(CHUNK_RELOAD_ATTEMPT_KEY) === "1") {
      return;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_ATTEMPT_KEY, "1");
  } catch (error) {
    console.error("[ChunkLoadRecovery] Unable to record reload attempt:", error);
    return;
  }

  window.location.reload();
}

export async function loadRouteModule<T>(load: () => Promise<T>): Promise<T> {
  let module: T;

  try {
    module = await load();
  } catch (error) {
    if (
      vitePreloadFailed ||
      (error instanceof Error &&
        /dynamically imported module|dynamic import|module importé dynamiquement|loading (?:css )?chunk|chunkloaderror|importing a module script failed|failed to fetch module script|cannot read properties of undefined \(reading ['"]default['"]\)/i.test(
          error.message,
        ))
    ) {
      vitePreloadFailed = false;
      throw new RouteModuleLoadError(error);
    }

    throw error;
  }

  if (module === null || typeof module !== "object" || !("default" in module)) {
    throw new RouteModuleLoadError(new Error("Route module did not provide a default export"));
  }

  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_ATTEMPT_KEY);
  } catch (error) {
    console.warn("[ChunkLoadRecovery] Unable to clear reload attempt:", error);
  }

  vitePreloadFailed = false;
  return module;
}
