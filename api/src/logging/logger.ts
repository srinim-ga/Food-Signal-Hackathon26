/**
 * Minimal logging abstraction.
 *
 * Wraps the Azure Functions InvocationContext logger so services depend on a
 * stable interface, not the framework. IMPORTANT: never pass raw allergy,
 * condition, or menu content into logs (Security & Privacy 5.3). Use ids/counts.
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/** Adapts an Azure Functions context.log-style sink to the Logger interface. */
export function createLogger(
  sink: { log: (...args: unknown[]) => void; error?: (...args: unknown[]) => void; warn?: (...args: unknown[]) => void },
): Logger {
  const emit = (level: string, message: string, meta?: Record<string, unknown>) => {
    const line = meta ? `[${level}] ${message} ${JSON.stringify(meta)}` : `[${level}] ${message}`;
    if (level === "ERROR" && sink.error) sink.error(line);
    else if (level === "WARN" && sink.warn) sink.warn(line);
    else sink.log(line);
  };

  return {
    info: (m, meta) => emit("INFO", m, meta),
    warn: (m, meta) => emit("WARN", m, meta),
    error: (m, meta) => emit("ERROR", m, meta),
  };
}

/** Console-backed logger for tests and non-Functions contexts. */
export const consoleLogger: Logger = createLogger(console);
