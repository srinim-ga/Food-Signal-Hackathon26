/**
 * POST /api/analyze - the single MVP endpoint.
 *
 * Responsibilities (thin controller):
 *  1. Parse + validate the request at the boundary (schema + upload limits).
 *  2. Delegate to the orchestrator (extract -> classify -> questions).
 *  3. Translate any failure into a safe ApiErrorResponse envelope.
 *
 * All business logic lives in services; this handler stays intentionally small.
 */
import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import type { AnalyzeRequest } from "@food-signal/shared";
import { buildContainer } from "../di/container.js";
import { AppError } from "../errors/appError.js";
import { toErrorResponse } from "../errors/errorHandler.js";
import { analyzeRequestSchema, assertWithinUploadLimits } from "../validation/schemas.js";

export async function analyzeHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const traceId = context.invocationId;
  const container = buildContainer(context);

  try {
    // --- Parse body ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw AppError.validation("Request body must be valid JSON.");
    }

    // --- Validate shape (boundary validation) ---
    const parsed = analyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AppError.validation(
        "Request validation failed.",
        parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      );
    }
    const analyzeRequest = parsed.data as AnalyzeRequest;

    // --- Enforce upload limits + media types ---
    try {
      assertWithinUploadLimits(
        analyzeRequest.menu.sourceType,
        analyzeRequest.menu.content,
        analyzeRequest.menu.mimeType,
        container.maxUploadBytes,
      );
    } catch (limitErr) {
      const message = limitErr instanceof Error ? limitErr.message : "Invalid upload.";
      throw message.includes("Unsupported media")
        ? AppError.unsupportedMedia(message)
        : AppError.payloadTooLarge(message);
    }

    // --- Run the pipeline ---
    const result = await container.orchestrator.analyze(analyzeRequest);

    return {
      status: 200,
      jsonBody: result,
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    return toErrorResponse(err, traceId, container.logger);
  }
}

app.http("analyze", {
  route: "analyze",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: analyzeHandler,
});
