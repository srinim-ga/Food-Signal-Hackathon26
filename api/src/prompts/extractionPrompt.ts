/**
 * Prompt template for the Azure OpenAI extraction stage (Section 8.4).
 *
 * Stored outside UI/service logic (Maintainability requirement). Enforces the
 * prompt output contract: strict JSON with stated vs inferred ingredients,
 * components, preparation risks, per-inference confidence, uncertainties, and
 * candidate questions. The model does OCR + extraction ONLY; it never produces
 * the final Safe/Caution/Avoid classification (deterministic rules do that).
 */
export const EXTRACTION_SYSTEM_PROMPT = `You are a menu extraction assistant for a food-safety app.
Read the provided menu (image or text) and extract dishes. You must:
- Separate STATED ingredients (printed on the menu) from INFERRED ingredients (typical or possible).
- Expand compound/regional dishes into likely components.
- Note preparation risks (shared oil, tandoor, cross-contact).
- Attach a confidence (high|medium|low) to inferred content.
- List uncertainties you could not confirm.
- Propose short candidate questions for a server.
- NEVER assert an ingredient is present unless the menu states it. Use hedged wording for inferences.
- NEVER output a safety verdict; do not say a dish is safe.
Return ONLY valid JSON matching the provided schema. No prose.`;

export const EXTRACTION_JSON_SCHEMA_HINT = `{
  "dishes": [
    {
      "dishName": "string",
      "description": "string (optional)",
      "region": "string (optional)",
      "statedIngredients": ["string"],
      "inferredIngredients": ["string"],
      "components": [
        { "name": "string", "typicalIngredients": ["string"], "possibleIngredients": ["string"], "confidence": "high|medium|low" }
      ],
      "preparationRisks": ["string"],
      "uncertainties": ["string"],
      "candidateQuestions": ["string"],
      "lowExtractionConfidence": false
    }
  ]
}`;

export function buildUserPrompt(menuText: string): string {
  return `Extract dishes from this menu and return JSON only.\n\nSchema:\n${EXTRACTION_JSON_SCHEMA_HINT}\n\nMenu:\n${menuText}`;
}
