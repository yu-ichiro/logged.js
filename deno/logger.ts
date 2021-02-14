// @ts-nocheck
import { Builder, Handler, Loggable, LogRecord } from "./types.ts";
import { DEFAULT_LEVELS, LOGGER_SEPARATOR } from "./constants.ts";
import { BuilderRegistry, HandlerRegistry, loggedjsLogger, setLoggedjsLogger } from "./registry.ts";

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
    builder?: Builder,
    handlers?: Handler[],
  ) {
    this._name = name;
    this.defaultLevel = defaultLevel;
    this.builder = builder ?? BuilderRegistry.defaultBuilder;
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
      const child = new Logger(name, this.defaultLevel, this.builder);
      child.parent = this;
      this.children[name] = child as LoggerType;
    }
    return this.children[name];
  }

  log(log: Partial<LogRecord>): void {
    if (this.handlers.length === 0 && !(this.propagate && this.parent)) {
      return;
    }
    const _log = {
      level: this.defaultLevel,
      name: this.name,
      ...this.builder.build(log),
    } as LogRecord;
    this.handlers.forEach((handler) =>
      handler.level <= _log.level && (async () => handler.handle(_log))()
    );
    if (this.propagate) this.parent?.log(_log);
  }
}

export class RootLogger extends Logger {
  private static _instance?: RootLogger;

  private constructor() {
    super("__ROOT__");
    setLoggedjsLogger(this.getChild("loggedjs"))
  }

  static get instance(): LoggerType {
    if (!RootLogger._instance) RootLogger._instance = new RootLogger();
    return RootLogger._instance as LoggerType;
  }

  log(log: Partial<LogRecord>) {
    if (this.handlers.length === 0) {
      this.addHandler(HandlerRegistry.defaultHandler);
      loggedjsLogger.warn("implicitly added default handler to root")
    }
    super.log(log);
  }

  get name(): string {
    return "root";
  }
}
