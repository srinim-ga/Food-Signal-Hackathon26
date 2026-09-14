/**
 * Food Signal API contracts (request/response DTOs for POST /api/analyze).
 *
 * These mirror the API contract in Food-Signal-MVP-Requirements Section 9 and
 * the technical design. The backend validates incoming/outgoing payloads
 * against runtime schemas (see api/src/validation), but these interfaces are
 * the compile-time source of truth shared by both tiers.
 */
import type {
  AnalyzedDish,
  MenuSourceType,
  OverallConfidence,
  ServerQuestion,
  UserProfile,
} from "./domain.js";

/** Menu payload sent from the browser. */
export interface MenuInput {
  sourceType: MenuSourceType;
  /** Original file name for image/pdf inputs (display + type checks). */
  fileName?: string;
  /**
   * For sourceType "text": the raw pasted menu text.
   * For "image"/"pdf": base64-encoded file content (no data: prefix).
   */
  content: string;
  /** MIME type for uploaded files, e.g. "image/png". */
  mimeType?: string;
}

/** Request body for POST /api/analyze. */
export interface AnalyzeRequest {
  profile: UserProfile;
  menu: MenuInput;
}

/** Count summary for the results header. */
export interface AnalysisSummary {
  safeCount: number;
  cautionCount: number;
  avoidCount: number;
}

/** Successful response body for POST /api/analyze. */
export interface AnalyzeResponse {
  analysisId: string;
  schemaVersion: string;
  profileSummary: UserProfile;
  overallConfidence: OverallConfidence;
  summary: AnalysisSummary;
  items: AnalyzedDish[];
  /** Deduplicated, ranked questions shared across dishes (Section 4.5.1). */
  sharedQuestions: ServerQuestion[];
  disclaimer: string;
}

/** Machine-readable error codes returned by the API. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "EXTRACTION_FAILED"
  | "MODEL_TIMEOUT"
  | "MODEL_INVALID_OUTPUT"
  | "INTERNAL_ERROR";

/** Standard error envelope for all non-2xx responses. */
export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Optional field-level validation details (never contains raw PII). */
    details?: Array<{ path: string; message: string }>;
    /** Correlation id for telemetry lookups. */
    traceId?: string;
  };
}

/** The fixed informational disclaimer (never claims a dish is guaranteed safe). */
export const DISCLAIMER =
  "Food Signal provides informational guidance only. Verify ingredients and preparation with restaurant staff.";
