import { Formatter, Handler, LogRecord } from "./types";
import { DefaultFormatter } from "./formatter";
import { DEFAULT_LEVELS } from "./constants";

export class ConsoleHandler implements Handler {
  level: number;
  formatter: Formatter;

  constructor(
    level: number = DEFAULT_LEVELS.INFO,
    fmt?: string,
    dateFormat?: string,
  ) {
    this.level = level;
    this.formatter = new DefaultFormatter(fmt, dateFormat);
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
