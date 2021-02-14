import { Formatter, Handler, LogRecord } from "./types";
import { SimpleFormatter } from "./formatter";
import { DEFAULT_LEVELS } from "./constants";
import { FormatterRegistry, HandlerRegistry } from "./registry";

export class ConsoleHandler implements Handler {
  level: number;
  formatter: Formatter;

  constructor(
    level: number = DEFAULT_LEVELS.INFO,
    fmt?: string,
    dateFormat?: string,
    formatter?: Formatter,
  ) {
    this.level = level;
    this.formatter = formatter ?? (fmt || dateFormat)
      ? new SimpleFormatter(fmt, dateFormat)
      : FormatterRegistry.defaultFormatter;
  }

  handle(log: LogRecord): void {
    const str = this.formatter.format(log);
    if (log.level < DEFAULT_LEVELS.DEBUG) {
      return console.trace(str);
    }
    if (log.level < DEFAULT_LEVELS.INFO) {
      return console.debug(str);
    }
    if (log.level < DEFAULT_LEVELS.WARN) {
      return console.info(str);
    }
    if (log.level < DEFAULT_LEVELS.ERROR) {
      return console.warn(str);
    }
    return console.error(str);
  }
}

HandlerRegistry.addHandler("ConsoleHandler", ConsoleHandler);
HandlerRegistry.defaultHandler = new ConsoleHandler();
