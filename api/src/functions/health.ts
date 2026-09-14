/**
 * GET /api/health - lightweight liveness probe for CI smoke tests and the demo.
 * Returns no sensitive information.
 */
import { app, type HttpResponseInit } from "@azure/functions";
import { getConfig } from "../config/appConfig.js";

export async function healthHandler(): Promise<HttpResponseInit> {
  const config = getConfig();
  return {
    status: 200,
    jsonBody: {
      status: "ok",
      mode: config.features.useStubExtractor ? "stub" : "azure-openai",
      time: new Date().toISOString(),
    },
  };
}

app.http("health", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: healthHandler,
});
