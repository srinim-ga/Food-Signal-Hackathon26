/**
 * Configuration-driven constants shared by both tiers.
 *
 * Dropdown values are configuration-driven (FR-002, FR-003, Maintainability)
 * so they can change without touching the analysis pipeline. The frontend
 * renders these; the backend can reuse them for validation/normalization.
 *
 * Extension point: to add options, edit these arrays only. Keep values aligned
 * with the alias/normalization map in api/src/rules/aliasMap.json.
 */

export interface SelectOption {
  value: string;
  label: string;
}

/** Diet restriction dropdown options (MVP Requirements Section 4.1). */
export const DIET_RESTRICTION_OPTIONS: SelectOption[] = [
  { value: "", label: "Select..." },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "lactose-free", label: "Lactose-free" },
  { value: "none", label: "None" },
];

/** Diet (dietary objective) dropdown options (MVP Requirements Section 4.1). */
export const DIET_OPTIONS: SelectOption[] = [
  { value: "", label: "Select..." },
  { value: "low-sodium", label: "Low sodium" },
  { value: "low-sugar", label: "Low sugar" },
  { value: "low-fat", label: "Low fat" },
  { value: "high-protein", label: "High protein" },
  { value: "avoid-spicy", label: "Avoid spicy food" },
  { value: "no-preference", label: "No preference" },
];

/** Upload limits (MVP Requirements Section 4.2). */
export const MENU_LIMITS = {
  maxImageBytes: 10 * 1024 * 1024,
  maxTextChars: 30_000,
  supportedImageTypes: ["image/png", "image/jpeg", "image/webp"] as const,
  supportedDocTypes: ["application/pdf"] as const,
} as const;

/** Validation message shown when no profile field is provided (FR-006). */
export const PROFILE_REQUIRED_MESSAGE =
  "Please provide at least one dietary restriction, diet preference, or allergy.";
