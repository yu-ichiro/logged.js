export interface Levels {
  TRACE: number;
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
  FATAL: number;
}

export interface Loggable {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  fatal(...args: unknown[]): void;
}

export interface LogRecord {
  level: number;
  name: string;
  createdAt: Date;
  message: string;
}

export interface Formatter {
  format(log: LogRecord): string;
}

export interface Handler {
  level: number;

  handle(log: LogRecord): void;
}

export interface Builder {
  build(...args: unknown[]): LogRecord;
}
