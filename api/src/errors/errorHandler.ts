/**
 * Converts any thrown value into a safe ApiErrorResponse + HTTP status.
 *
 * Guarantees: never leaks stack traces, causes, or raw profile/menu content to
 * the client. Unknown errors collapse to a generic INTERNAL_ERROR.
 */
import type { HttpResponseInit } from "@azure/functions";
import type { ApiErrorResponse } from "@food-signal/shared";
import { AppError } from "./appError.js";
import type { Logger } from "../logging/logger.js";

export function toErrorResponse(err: unknown, traceId: string, logger: Logger): HttpResponseInit {
  const appError = err instanceof AppError
    ? err
    : AppError.internal("An unexpected error occurred.", err);

  // Log full detail server-side; only safe fields go to the client.
  logger.error("Request failed", {
    traceId,
    code: appError.code,
    httpStatus: appError.httpStatus,
    message: appError.message,
    retryable: appError.retryable,
  });

  const body: ApiErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      traceId,
    },
  };

  return {
    status: appError.httpStatus,
    jsonBody: body,
    headers: { "Content-Type": "application/json" },
  };
}
