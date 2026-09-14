/**
 * Food Signal shared package - public surface.
 *
 * Both the frontend (PWA) and the backend (Azure Functions) import from here so
 * the request/response contract stays consistent end to end. Keep this package
 * free of runtime dependencies and browser/node-specific APIs.
 *
 * Extension point: add new versioned contracts under ./contracts and re-export
 * them here. Prefer additive changes; bump SCHEMA_VERSION for breaking changes.
 */
export * from "./domain.js";
export * from "./contracts.js";
export * from "./config.js";
