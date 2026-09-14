/**
 * Azure OpenAI implementation of IMenuExtractor (Stage 1, production path).
 *
 * Active only when USE_STUB_EXTRACTOR=false. It calls a vision-capable Azure
 * OpenAI deployment, requests strict JSON, validates the output against the
 * extraction schema, and retries once on a transient failure (NFR 5.2).
 *
 * TODO: Replace dummy endpoint/deployment with real Azure OpenAI values during
 * deployment. Credentials are resolved server-side (Key Vault), never shipped
 * to the browser.
 */
import { AzureOpenAI } from "openai";
import type { ExtractedDish, MenuInput } from "@food-signal/shared";
import type { AzureOpenAIConfig, LimitsConfig } from "../config/configModels.js";
import type { Logger } from "../logging/logger.js";
import { AppError } from "../errors/appError.js";
import { extractionResultSchema } from "../validation/schemas.js";
import { EXTRACTION_SYSTEM_PROMPT, buildUserPrompt } from "../prompts/extractionPrompt.js";
import type { IMenuExtractor } from "./interfaces.js";
import { SAMPLE_MENU_TEXT } from "./stubExtractor.js";

export class AzureOpenAIExtractor implements IMenuExtractor {
  private readonly client: AzureOpenAI;

  constructor(
    private readonly config: AzureOpenAIConfig,
    private readonly limits: LimitsConfig,
    private readonly logger: Logger,
  ) {
    this.client = new AzureOpenAI({
      endpoint: config.endpoint,
      apiKey: config.apiKey,
      apiVersion: config.apiVersion,
      deployment: config.deployment,
    });
  }

  async extract(menu: MenuInput): Promise<ExtractedDish[]> {
    try {
      return await this.callOnce(menu);
    } catch (err) {
      if (err instanceof AppError && err.retryable) {
        this.logger.warn("Extraction failed; retrying once", { code: err.code });
        return this.callOnce(menu);
      }
      throw err;
    }
  }

  private async callOnce(menu: MenuInput): Promise<ExtractedDish[]> {
    const content = this.buildContent(menu);

    let raw: string | null | undefined;
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.config.deployment,
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            // For image inputs, content is an array of text + image_url parts.
            { role: "user", content: content as never },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        },
        { timeout: this.limits.modelTimeoutMs },
      );
      raw = response.choices[0]?.message?.content;
    } catch (err) {
      throw AppError.modelTimeout("The menu analysis service did not respond in time.", err);
    }

    if (!raw) {
      throw AppError.modelInvalidOutput("The model returned an empty response.");
    }

    const parsed = extractionResultSchema.safeParse(safeJsonParse(raw));
    if (!parsed.success) {
      throw AppError.modelInvalidOutput("The model output did not match the expected schema.", parsed.error);
    }
    return parsed.data.dishes;
  }

  /** Builds a text or multimodal (text + image) content payload. */
  private buildContent(menu: MenuInput): unknown {
    if (menu.sourceType === "text") {
      return buildUserPrompt(menu.content);
    }
    if (menu.sourceType === "image") {
      const mime = menu.mimeType ?? "image/png";
      return [
        { type: "text", text: buildUserPrompt("(menu image attached)") },
        { type: "image_url", image_url: { url: `data:${mime};base64,${menu.content}` } },
      ];
    }
    // PDF path is out of MVP scope for the vision call; fall back to sample text.
    // TODO: integrate Azure AI Document Intelligence for PDF OCR post-MVP.
    return buildUserPrompt(SAMPLE_MENU_TEXT);
  }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw AppError.modelInvalidOutput("The model returned invalid JSON.");
  }
}
