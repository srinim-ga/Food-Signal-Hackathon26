/**
 * Typed API client for POST /api/analyze.
 *
 * Wraps fetch, normalizes error handling into a single ApiClientError, and
 * returns the strongly-typed AnalyzeResponse from the shared contracts.
 * Extension point: add retry/backoff or an AbortController timeout here.
 */
import type { AnalyzeRequest, AnalyzeResponse, ApiErrorResponse } from "@food-signal/shared";
import { appConfig } from "../config/appConfig";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function analyzeMenu(request: AnalyzeRequest, signal?: AbortSignal): Promise<AnalyzeResponse> {
  let response: Response;
  try {
    response = await fetch(appConfig.analyzeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    throw new ApiClientError(
      "Could not reach the analysis service. Check your connection and try again.",
      "NETWORK_ERROR",
      0,
    );
  }

  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    let message = "Analysis failed. Please try again.";
    try {
      const body = (await response.json()) as ApiErrorResponse;
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // Non-JSON error; keep defaults.
    }
    throw new ApiClientError(message, code, response.status);
  }

  return (await response.json()) as AnalyzeResponse;
}
