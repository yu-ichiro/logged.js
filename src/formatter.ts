import { Formatter, LogRecord } from "./types";
import { FormatterRegistry, LevelRegistry } from "./registry";

const triSplit = (pattern: RegExp) => {
  const _pattern = new RegExp(pattern.source, "g");
  return (str: string): [RegExpMatchArray, string, string, string] | null => {
    _pattern.lastIndex = 0;
    const match = _pattern.exec(str);
    if (!match) return null;
    return [
      match,
      str.slice(0, match.index),
      str.slice(match.index, _pattern.lastIndex),
      str.slice(_pattern.lastIndex),
    ];
  };
};

const isEmptyString = (str: string): boolean => {
  if (str === "undefined") return true;
  if (str === "[]") return true;
  if (str === "{}") return true;
  return str === "";
};

export class SimpleFormatter implements Formatter {
  static defaultFormat = "[{createdAt}][{name}] {level}: {message} {args:?}";
  fmt: string;
  dateFormat: string;
  pattern: RegExp;
  splitter: ReturnType<typeof triSplit>;

  constructor(
    fmt?: string,
    dateFormat: string = "%i",
  ) {
    this.pattern = /{(?<path>[a-zA-Z][^:}]*)(:(?<options>[^}]+))?}/;
    this.splitter = triSplit(this.pattern);
    this.fmt = fmt ?? SimpleFormatter.defaultFormat;
    this.dateFormat = dateFormat;
  }

  format(log: LogRecord): string {
    const contentParser = (
      key: string,
      path: string,
      value: any,
    ): string => {
      if (value instanceof Date) return this.formatDate(value);
      if (path === "level") return LevelRegistry.getLevel(value as number);
      if (typeof value === "string") return value;
      return JSON.stringify(value) ?? String(value);
    };
    const optionsParser = (options: string | undefined) => {
      const nop = (content: string) => String(content);
      if (!options) return nop;
      const pattern =
        /(?<skipEmpty>\?)?(?<padLetter>0)?(?<digits>[1-9]\d*)?(\.(?<decimals>[1-9]\d*))?/;
      const result = options.match(pattern);
      if (!result) return nop;
      const groups = (result as any).groups as {
        skipEmpty?: string;
        padLetter?: string;
        digits?: string;
        decimal?: string;
      };
      let parsed = {
        padLetter: groups.padLetter ?? " ",
        digits: parseInt(groups.digits ?? "0") || 0,
        decimal: parseInt(groups.decimal ?? "0") || 0,
        skipEmpty: groups.skipEmpty === "?",
      };
      return (content: string) => {
        if (parsed.skipEmpty && isEmptyString(content)) return "";
        const padString = (letter: string, length: number) =>
          String(new Array(length).fill("").reduce((res) => res + letter, ""));
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
    return (function replacer(this: SimpleFormatter, fmt: string): string {
      const matches = this.splitter(fmt);
      if (!matches) return fmt;
      const [result, before, exact, after] = matches;
      const groups = (result as any).groups as {
        path: string;
        options?: string;
      };
      const { path, options } = groups;
      let key = "";
      const obj = path.split(".").reduce((_obj, _key) => {
        key = _key;
        return _obj && _obj[key];
      }, log as any);
      return `${before}${
        exact.replace(
          this.pattern,
          optionsParser(options)(contentParser(key, path, obj)),
        )
      }${replacer.call(this, after)}`;
    }).call(this, this.fmt);
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

FormatterRegistry.addFormatter("SimpleFormatter", SimpleFormatter);
FormatterRegistry.defaultFormatter = new SimpleFormatter();
