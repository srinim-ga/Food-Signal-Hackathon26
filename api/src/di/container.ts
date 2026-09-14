/**
 * Composition root / dependency injection container.
 *
 * Wires concrete implementations behind the service interfaces based on config.
 * This is the single place that decides between the offline stub extractor and
 * the Azure OpenAI extractor, so the rest of the code stays implementation-blind.
 *
 * Extension point: register alternative implementations here (e.g. a Document
 * Intelligence-backed extractor) without changing services or functions.
 */
import { getConfig } from "../config/appConfig.js";
import { createLogger, type Logger } from "../logging/logger.js";
import { NormalizationService } from "../services/normalizationService.js";
import { ClassificationService } from "../services/classificationService.js";
import { QuestionService } from "../services/questionService.js";
import { ConfidenceAggregator } from "../services/confidenceService.js";
import { StubMenuExtractor } from "../services/stubExtractor.js";
import { AzureOpenAIExtractor } from "../services/azureOpenAiExtractor.js";
import { AnalysisOrchestrator } from "../services/analysisOrchestrator.js";
import type { IMenuExtractor } from "../services/interfaces.js";

export interface Container {
  orchestrator: AnalysisOrchestrator;
  logger: Logger;
  maxUploadBytes: number;
}

/**
 * Builds the container for a single invocation. Pass the Functions context.log
 * sink so logs flow to the platform log stream.
 */
export function buildContainer(logSink: {
  log: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
}): Container {
  const config = getConfig();
  const logger = createLogger(logSink);

  const extractor: IMenuExtractor = config.features.useStubExtractor
    ? new StubMenuExtractor()
    : new AzureOpenAIExtractor(config.openAI, config.limits, logger);

  const orchestrator = new AnalysisOrchestrator({
    extractor,
    normalizer: new NormalizationService(),
    classifier: new ClassificationService(),
    questions: new QuestionService(),
    confidence: new ConfidenceAggregator(),
    logger,
  });

  return { orchestrator, logger, maxUploadBytes: config.limits.maxUploadBytes };
}
