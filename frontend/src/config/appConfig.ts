/**
 * Frontend runtime configuration.
 *
 * Only non-sensitive, build-time VITE_* values are exposed to the browser
 * (Security & Privacy 5.3 - no secrets in the bundle). Dropdown options come
 * from the shared package so both tiers agree.
 */
export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
  appName: import.meta.env.VITE_APP_NAME ?? "Food Signal",
  /** Full URL to the analyze endpoint (same-origin by default). */
  get analyzeUrl(): string {
    return `${this.apiBaseUrl}/api/analyze`;
  },
};
