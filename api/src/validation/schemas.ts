/**
 * Runtime validation schemas (Zod).
 *
 * Two responsibilities:
 *  1. Validate the incoming AnalyzeRequest at the system boundary (5.3, FR-013).
 *  2. Validate/repair the LLM's structured output before it is trusted (8.4).
 *
 * Compile-time types come from @food-signal/shared; these are the runtime guards.
 */
import { z } from "zod";
import { MENU_LIMITS } from "@food-signal/shared";

// --- Inbound request validation ---

export const userProfileSchema = z
  .object({
    dietRestriction: z.string().trim().max(100).nullish(),
    diet: z.string().trim().max(100).nullish(),
    allergies: z.array(z.string().trim().max(100)).max(50).optional(),
    conditions: z.array(z.string().trim().max(100)).max(50).optional(),
  })
  .refine(
    (p) =>
      isMeaningful(p.dietRestriction) ||
      isMeaningful(p.diet) ||
      (p.allergies?.some(isMeaningful) ?? false),
    { message: "At least one of dietRestriction, diet, or allergies is required." },
  );

export const menuInputSchema = z.object({
  sourceType: z.enum(["image", "pdf", "text"]),
  fileName: z.string().max(255).optional(),
  content: z.string().min(1).max(15_000_000), // base64 of 10MB ~ 13.7MB
  mimeType: z.string().max(100).optional(),
});

export const analyzeRequestSchema = z.object({
  profile: userProfileSchema,
  menu: menuInputSchema,
});

// --- LLM output validation (the prompt output contract, Section 8.4) ---

const dishComponentSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  typicalIngredients: z.array(z.string()).default([]),
  possibleIngredients: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

export const extractedDishSchema = z.object({
  dishName: z.string().min(1),
  description: z.string().optional(),
  region: z.string().optional(),
  statedIngredients: z.array(z.string()).default([]),
  inferredIngredients: z.array(z.string()).default([]),
  components: z.array(dishComponentSchema).optional(),
  preparationRisks: z.array(z.string()).optional(),
  uncertainties: z.array(z.string()).optional(),
  candidateQuestions: z.array(z.string()).optional(),
  lowExtractionConfidence: z.boolean().optional(),
});

export const extractionResultSchema = z.object({
  dishes: z.array(extractedDishSchema),
});

export type ValidatedAnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type ValidatedExtractionResult = z.infer<typeof extractionResultSchema>;

// --- Helpers ---

function isMeaningful(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0 && value.trim().toLowerCase() !== "none";
}

/** Enforces MVP upload limits beyond raw schema length (FR-013). */
export function assertWithinUploadLimits(
  sourceType: "image" | "pdf" | "text",
  content: string,
  mimeType: string | undefined,
  maxUploadBytes: number,
): void {
  if (sourceType === "text") {
    if (content.length > MENU_LIMITS.maxTextChars) {
      throw new Error(`Pasted text exceeds ${MENU_LIMITS.maxTextChars} characters.`);
    }
    return;
  }

  // Approximate decoded byte size of base64 content.
  const approxBytes = Math.floor((content.length * 3) / 4);
  if (approxBytes > maxUploadBytes) {
    throw new Error(`Uploaded file exceeds the ${maxUploadBytes}-byte limit.`);
  }

  const supported: readonly string[] =
    sourceType === "image" ? MENU_LIMITS.supportedImageTypes : MENU_LIMITS.supportedDocTypes;
  if (mimeType && !supported.includes(mimeType)) {
    throw new Error(`Unsupported media type: ${mimeType}.`);
  }
}
