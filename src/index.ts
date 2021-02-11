import { Levels, Loggable, LogRecord } from "./types";
import { Logger, LoggerType } from "./logger";
import { DEFAULT_LEVELS, LOGGER_SEPARATOR } from "./constants";

export * from "./types";
export * from "./handlers";
export * from "./formatter";

class RootLogger extends Logger {
  private static _instance?: RootLogger;

  private constructor() {
    super("__ROOT__");
  }

  static get instance(): LoggerType {
    if (!RootLogger._instance) RootLogger._instance = new RootLogger();
    return RootLogger._instance as LoggerType;
  }

  get name(): string {
    return "root";
  }
}

type LoggingModule = typeof Logging & Loggable & Levels;

class Logging {
  private static _root: LoggerType = RootLogger.instance;
  private static _levels: Levels = { ...DEFAULT_LEVELS };

  static get root() {
    return Logging._root;
  }

  static get levels() {
    return { ...Logging._levels };
  }

  static addLevel(name: string, level: number) {
    Logging._levels[name as keyof Levels] = level;
    Object.defineProperties(Logging, {
      [name.toUpperCase()]: {
        configurable: false,
        get() {
          return Logging.levels[name.toUpperCase() as keyof Levels];
        },
      },
      [name.toLowerCase()]: {
        configurable: false,
        value: (...args: unknown[]) =>
          (Logging.root as Loggable)[name.toLowerCase() as keyof Loggable](
            ...args,
          ),
      },
    });
    (Logger.prototype as any)[name.toLowerCase()] = function (
      this: Logger,
      ...args: unknown[]
    ) {
      return this.log({
        ...this.builder.build.call(this, ...args),
        level: level,
      });
    };
  }

  static getLogger(name: string): LoggerType {
    if (name === "root") return Logging.root;
    return name.split(LOGGER_SEPARATOR).reduce(
      (logger, name) => logger.getChild(name),
      Logging.root,
    );
  }

  static getLevel(value: number): string;
  static getLevel(value: keyof Loggable): number;
  static getLevel(value: keyof Loggable | number) {
    if (typeof value === "string") return (Logging as any)[value];
    return Object.keys(Logging.levels).reduce(
      (_value, key) =>
        Logging.levels[key as keyof Levels] === value ? key : _value,
      `Level(${value})`,
    );
  }

  static log(log: Partial<LogRecord>) {
    Logging.root.log(log);
  }
}

Object.keys(DEFAULT_LEVELS).forEach((prop) => {
  Logging.addLevel(prop, DEFAULT_LEVELS[prop as keyof typeof DEFAULT_LEVELS]);
});

const __module = Logging as LoggingModule;
export default __module;
