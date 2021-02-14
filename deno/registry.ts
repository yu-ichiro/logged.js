// @ts-nocheck
import {
  Builder,
  Constructor,
  Formatter,
  Handler,
  Levels,
  Loggable,
} from "./types.ts";
import { DEFAULT_LEVELS } from "./constants.ts";
import { LoggerType } from "./logger.ts";

export class LevelRegistry {
  private static _levels: Levels = { ...DEFAULT_LEVELS };
  static get levels(): Levels {
    return { ...this._levels };
  }

  static addLevel(name: string, level: number) {
    this._levels[name.toUpperCase() as keyof Levels] = level;
  }

  static getLevel(value: number): string;
  static getLevel(value: keyof Loggable | keyof Levels): number;
  static getLevel(value: keyof Loggable | keyof Levels | number) {
    if (typeof value === "string") {
      return this.levels[value.toUpperCase() as keyof Levels];
    }
    return Object.keys(this.levels).reduce(
      (_value, key) =>
        this.levels[key as keyof Levels] === value ? key : _value,
      `Level(${value})`,
    );
  }
}

export class HandlerRegistry {
  private static _handlers: Record<string, Constructor<Handler>> = {};
  private static _defaultHandler: Handler;

  static get defaultHandler(): Handler {
    return this._defaultHandler;
  }

  static set defaultHandler(handler: Handler) {
    this._defaultHandler = handler;
  }

  static addHandler(name: string, handlerClass: Constructor<Handler>) {
    this._handlers[name] = handlerClass;
  }

  static getHandler(name: string): Constructor<Handler> | undefined {
    return this._handlers[name];
  }
}

export class FormatterRegistry {
  private static _formatters: Record<string, Constructor<Formatter>> = {};
  private static _defaultFormatter: Formatter;

  static get defaultFormatter(): Formatter {
    return this._defaultFormatter;
  }

  static set defaultFormatter(formatter: Formatter) {
    this._defaultFormatter = formatter;
  }

  static addFormatter(name: string, formatterClass: Constructor<Formatter>) {
    this._formatters[name] = formatterClass;
  }

  static getFormatter(name: string): Constructor<Formatter> | undefined {
    return this._formatters[name];
  }
}

export class BuilderRegistry {
  private static _builders: Record<string, Constructor<Builder>> = {};
  private static _defaultBuilder: Builder;

  static get defaultBuilder(): Builder {
    return this._defaultBuilder;
  }

  static set defaultBuilder(builder: Builder) {
    this._defaultBuilder = builder;
  }

  static addBuilder(name: string, builderClass: Constructor<Builder>) {
    this._builders[name] = builderClass;
  }

  static getBuilder(name: string): Constructor<Builder> | undefined {
    return this._builders[name];
  }
}

export let loggedjsLogger: LoggerType;
export const setLoggedjsLogger = (logger: LoggerType) => {
  loggedjsLogger = logger;
};
