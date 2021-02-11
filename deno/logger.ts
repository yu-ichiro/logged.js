// @ts-nocheck
import { Builder, Handler, Loggable, LogRecord } from "./types.ts";
import { DEFAULT_LEVELS, LOGGER_SEPARATOR } from "./constants.ts";
import { loggerBuilder } from "./builders.ts";

export type LoggerType = Logger & Loggable;
export class Logger {
  private readonly _name: string;
  parent?: Logger;
  propagate: boolean;
  defaultLevel: number;
  children: Record<string, LoggerType>;
  builder: Builder;
  handlers: Handler[];

  constructor(
    name: string,
    defaultLevel: number = DEFAULT_LEVELS.INFO,
    builder: Builder = loggerBuilder,
    handlers?: Handler[],
  ) {
    this._name = name;
    this.defaultLevel = defaultLevel;
    this.builder = builder;
    this.handlers = handlers ?? [];
    this.propagate = true;
    this.children = {};
  }

  get name(): string {
    if (
      this.parent && this.parent.name !== "root"
    ) {
      return `${this.parent.name}${LOGGER_SEPARATOR}${this._name}`;
    }
    return this._name;
  }

  addHandler(handler: Handler) {
    this.handlers.push(handler);
    return this;
  }

  getChild(name: string): LoggerType {
    if (!this.children[name]) {
      const child = new Logger(name);
      child.parent = this;
      this.children[name] = child as LoggerType;
    }
    return this.children[name];
  }

  log(log: Partial<LogRecord>): void {
    const _log = this.builder.build.call(this, log);
    this.handlers.forEach((handler) =>
      handler.level <= _log.level && (async () => handler.handle(_log))()
    );
    if (this.propagate) this.parent?.log(_log);
  }
}
