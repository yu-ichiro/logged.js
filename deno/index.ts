// @ts-nocheck
import { Levels, Loggable, LogRecord } from "./types.ts";
import { DEFAULT_LEVELS, LOGGER_SEPARATOR } from "./constants.ts";
import {
  BuilderRegistry,
  FormatterRegistry,
  HandlerRegistry,
  LevelRegistry,
} from "./registry.ts";
import { Logger, LoggerType, RootLogger } from "./logger.ts";

export * from "./types.ts";
export * from "./builders.ts";
export * from "./formatter.ts";
export * from "./handlers.ts";

export {
  BuilderRegistry,
  FormatterRegistry,
  HandlerRegistry,
  LevelRegistry,
  Logger,
  LoggerType,
};

type LoggingModule = typeof Logging & Loggable & Levels;

class Logging {
  static get root() {
    return RootLogger.instance;
  }

  static get levels(): Levels {
    return LevelRegistry.levels;
  }

  static addLevel(name: string, level: number) {
    LevelRegistry.addLevel(name, level);
    Object.defineProperties(Logging, {
      [name.toUpperCase()]: {
        configurable: false,
        get() {
          return LevelRegistry.levels[name.toUpperCase() as keyof Levels];
        },
      },
      [name.toLowerCase()]: {
        configurable: false,
        get: () =>
          (...args: unknown[]) =>
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
        ...this.builder.build(...args),
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
  static getLevel(value: keyof Loggable | keyof Levels): number;
  static getLevel(
    value: number | keyof Loggable | keyof Levels,
  ): string | number {
    return LevelRegistry.getLevel(value as any);
  }

  static log(log: Partial<LogRecord>) {
    Logging.root.log(log);
  }
}

Object.keys(DEFAULT_LEVELS).forEach((prop) => {
  Logging.addLevel(prop, DEFAULT_LEVELS[prop as keyof typeof DEFAULT_LEVELS]);
});

const logging = Logging as LoggingModule;
export default logging;
