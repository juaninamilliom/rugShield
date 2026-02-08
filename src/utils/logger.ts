export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const value = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel()];
}

/**
 * Emits structured JSON logs for ingestion by centralized logging systems.
 */
export function log(level: LogLevel, message: string, details?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...details,
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(message: string, details?: Record<string, unknown>): void {
  log('info', message, details);
}

export function logWarn(message: string, details?: Record<string, unknown>): void {
  log('warn', message, details);
}

export function logError(message: string, details?: Record<string, unknown>): void {
  log('error', message, details);
}
