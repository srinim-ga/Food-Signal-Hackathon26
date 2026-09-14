/**
 * Error handling framework for the API.
 *
 * AppError is the single exception type the pipeline throws. It carries an
 * ApiErrorCode and HTTP status so the top-level handler can produce a
 * consistent ApiErrorResponse envelope without leaking internals or PII.
 */
import type { ApiErrorCode } from "@food-signal/shared";

export interface AppErrorOptions {
  code: ApiErrorCode;
  message: string;
  httpStatus: number;
  details?: Array<{ path: string; message: string }>;
  /** Underlying cause, kept server-side only (never serialized to client). */
  cause?: unknown;
  /** Whether a single retry may succeed (transient model/extraction failures). */
  retryable?: boolean;
}

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly httpStatus: number;
  readonly details?: Array<{ path: string; message: string }>;
  readonly retryable: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    // Store the cause manually (Error.cause option requires ES2022 lib).
    if (options.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
  }

  // --- Named factories for the common failure modes (NFR 5.2 reliability) ---

  static validation(message: string, details?: Array<{ path: string; message: string }>): AppError {
    return new AppError({ code: "VALIDATION_ERROR", message, httpStatus: 400, details });
  }

  static unsupportedMedia(message: string): AppError {
    return new AppError({ code: "UNSUPPORTED_MEDIA_TYPE", message, httpStatus: 415 });
  }

  static payloadTooLarge(message: string): AppError {
    return new AppError({ code: "PAYLOAD_TOO_LARGE", message, httpStatus: 413 });
  }

  static extractionFailed(message: string, cause?: unknown): AppError {
    return new AppError({ code: "EXTRACTION_FAILED", message, httpStatus: 502, cause, retryable: true });
  }

  static modelTimeout(message: string, cause?: unknown): AppError {
    return new AppError({ code: "MODEL_TIMEOUT", message, httpStatus: 504, cause, retryable: true });
  }

  static modelInvalidOutput(message: string, cause?: unknown): AppError {
    return new AppError({ code: "MODEL_INVALID_OUTPUT", message, httpStatus: 502, cause, retryable: true });
  }

  static internal(message: string, cause?: unknown): AppError {
    return new AppError({ code: "INTERNAL_ERROR", message, httpStatus: 500, cause });
  }
}
