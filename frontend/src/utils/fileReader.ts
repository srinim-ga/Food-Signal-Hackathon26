/**
 * Reads an uploaded file into base64 (without the data: prefix) for the API,
 * enforcing MVP upload limits client-side (FR-013 / FR-014).
 */
import { MENU_LIMITS } from "@food-signal/shared";

export interface ReadFileResult {
  base64: string;
  mimeType: string;
  fileName: string;
  sourceType: "image" | "pdf";
}

export function isSupportedMenuFile(file: File): boolean {
  const supported = [...MENU_LIMITS.supportedImageTypes, ...MENU_LIMITS.supportedDocTypes] as string[];
  return supported.includes(file.type);
}

export async function readMenuFile(file: File): Promise<ReadFileResult> {
  if (!isSupportedMenuFile(file)) {
    throw new Error("Unsupported file type. Use PNG, JPEG, WebP, or PDF.");
  }
  if (file.size > MENU_LIMITS.maxImageBytes) {
    throw new Error("File is too large. Maximum size is 10 MB.");
  }

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix; the API expects raw base64.
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });

  return {
    base64,
    mimeType: file.type,
    fileName: file.name,
    sourceType: (MENU_LIMITS.supportedDocTypes as readonly string[]).includes(file.type) ? "pdf" : "image",
  };
}
