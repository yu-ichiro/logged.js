import { Formatter, LogRecord } from "./types";
import logging from "./index";

export class DefaultFormatter implements Formatter {
  fmt: string;
  dateFormat: string;

  constructor(
    fmt: string = "[{createdAt}][{name}] {level}: {message}",
    dateFormat: string = "%i",
  ) {
    this.fmt = fmt;
    this.dateFormat = dateFormat;
  }

  format(log: LogRecord): string {
    const pattern = (key: string) => new RegExp(`{${key}(:(?<options>.+))?}`);
    const contentParser = <K extends keyof LogRecord>(
      key: K,
      value: LogRecord[K],
    ): string => {
      if (value instanceof Date) return this.formatDate(value);
      if (key === "level") return logging.getLevel(value as number);
      return String(value);
    };
    const optionsParser = (options: string | undefined) => {
      if (!options) return (content: string) => String(content);
      let parsed = { padLetter: " ", digits: 0, decimal: 0 };
      let decimal = false;
      for (let idx = 0; idx < options.length; idx++) {
        if (idx === 0 && options[idx] === "0") {
          parsed.padLetter = "0";
          continue;
        }
        if (options[idx].match(/[0-9]/)) {
          if (decimal) {
            parsed.decimal *= 10;
            parsed.decimal += parseInt(options[idx]);
          } else {
            parsed.digits *= 10;
            parsed.digits += parseInt(options[idx]);
          }
          continue;
        }
        if (options[idx] === ".") {
          decimal = true;
        }
      }
      return (content: string) => {
        const padString = (letter: string, length: number) =>
          String(new Array(length).reduce((res) => res + length, ""));
        let split = content.split(".");
        if (split.length > 2) {
          split = [split.slice(0, -1).join("."), split.slice(-1)[0]];
        }
        const digits = Math.max(split[0].length, parsed.digits);
        split[0] = (padString(parsed.padLetter, digits) + split[0]).slice(
          -digits,
        );
        if (parsed.decimal > 0) {
          if (split.length == 1) split.push("");
          const decimal = Math.max(split[1].length, parsed.decimal);
          split[1] = (split[1] + padString(parsed.padLetter, decimal)).slice(
            decimal,
          );
        }
        return split.join(".");
      };
    };
    return Object.keys(log).reduce(
      function replacer(fmt, key: keyof LogRecord): string {
        const matches = fmt.match(pattern(key));
        if (!matches) return fmt;
        const options = (matches as any)?.groups?.options as string | undefined;
        return replacer(
          fmt.replace(
            pattern(key),
            optionsParser(options)(contentParser(key, log[key])),
          ),
          key,
        );
      } as (fmt: string, key: string) => string,
      this.fmt,
    );
  }

  formatDate(date: Date): string {
    const replacer = {
      Y: (d: Date) => String("0000" + d.getUTCFullYear()).slice(-4),
      m: (d: Date) => String("00" + (d.getUTCMonth() + 1)).slice(-2),
      d: (d: Date) => String("00" + d.getUTCDate()).slice(-2),
      H: (d: Date) => String("00" + d.getUTCHours()).slice(-2),
      M: (d: Date) => String("00" + d.getUTCMinutes()).slice(-2),
      S: (d: Date) => String("00" + d.getUTCSeconds()).slice(-2),
      i: (d: Date) => d.toISOString(),
    };
    let result = "";
    for (let idx = 0; idx < this.dateFormat.length; idx++) {
      if (this.dateFormat[idx] === "%") {
        idx += 1;
        if (this.dateFormat[idx] === "%") result += "%";
        else if (
          replacer[this.dateFormat[idx] as keyof typeof replacer]
        ) {
          result += replacer[this.dateFormat[idx] as keyof typeof replacer](
            date,
          );
        }
      } else {
        result += this.dateFormat[idx];
      }
    }
    return result;
  }
}
