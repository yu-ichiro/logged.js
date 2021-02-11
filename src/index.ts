const LOGGER_SEPARATOR = "."

export interface Levels {
  TRACE: number,
  DEBUG: number,
  INFO: number,
  WARN: number,
  ERROR: number,
  FATAL: number
}

const DEFAULT_LEVELS: Levels = {
  TRACE: 5,
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50
} as Levels

export interface Loggable {
  trace(...args: unknown[]): void
  debug(...args: unknown[]): void
  info(...args: unknown[]): void
  warn(...args: unknown[]): void
  error(...args: unknown[]): void
  fatal(...args: unknown[]): void
}

export interface LogRecord {
  level: number
  name: string
  createdAt: Date
  message: string
}

export interface Formatter {
  format(log: LogRecord): string
}

export interface Handler {
  level: number

  handle(log: LogRecord): void
}

export interface Builder {
  build(...args: unknown[]): LogRecord
}

export const defaultBuilder: Builder = {
  build(this: Logger, ...args: unknown[]): LogRecord {
    if (args.length < 1) throw Error("at least one argument is required")
    const firstArg = args.shift()
    let partialRecord = {
      message: undefined as string | undefined,
      args: args
    }
    if (typeof firstArg === "object") {
      partialRecord = {...partialRecord, ...firstArg};
    } else if (typeof firstArg === "string") {
      partialRecord.message = firstArg
    } else {
      partialRecord.message = String(firstArg)
    }
    if (!partialRecord.message) throw Error("message not specified")

    return {
      level: this.defaultLevel,
      name: this.name,
      createdAt: new Date(),
      ...partialRecord,
    } as LogRecord
  }
}

export class DefaultFormatter implements Formatter {
  fmt: string;
  dateFormat: string;
  constructor(fmt: string = "[{createdAt}][{name}] {level}: {message}", dateFormat: string = "%i") {
    this.fmt = fmt
    this.dateFormat = dateFormat
  }

  format(log: LogRecord): string {
    const pattern = (key: string) => new RegExp(`{${key}(:(?<options>.+))?}`)
    const contentParser = <K extends keyof LogRecord>(key: K, value: LogRecord[K]): string => {
      if (value instanceof Date) return this.formatDate(value)
      if (key === "level") return Logging.getLevel(value as number)
      return String(value)
    }
    const optionsParser = (options: string | undefined) => {
      if (!options) return (content: string) => String(content)
      let parsed = { padLetter: " ", digits: 0, decimal: 0 }
      let decimal = false
      for (let idx = 0; idx < options.length; idx++) {
        if (idx === 0 && options[idx] === "0") {
          parsed.padLetter = "0"
          continue
        }
        if (options[idx].match(/[0-9]/)) {
          if (decimal) {
            parsed.decimal *= 10
            parsed.decimal += parseInt(options[idx])
          } else {
            parsed.digits *= 10
            parsed.digits += parseInt(options[idx])
          }
          continue
        }
        if (options[idx] === ".") {
          decimal = true
        }
      }
      return (content: string) => {
        const padString = (letter: string, length: number) =>
          String(new Array(length).reduce((res) => res + length, ""))
        let split = content.split(".")
        if (split.length > 2) split = [split.slice(0, -1).join("."), split.slice(-1)[0]]
        const digits = Math.max(split[0].length, parsed.digits)
        split[0] = (padString(parsed.padLetter, digits) + split[0]).slice(-digits)
        if (parsed.decimal > 0) {
          if (split.length == 1) split.push("")
          const decimal = Math.max(split[1].length, parsed.decimal)
          split[1] = (split[1] + padString(parsed.padLetter, decimal)).slice(decimal)
        }
        return split.join(".")
      }
    }
    return Object.keys(log).reduce(function replacer(fmt, key: keyof LogRecord): string {
      const matches = fmt.match(pattern(key))
      if (!matches) return fmt
      const options = (matches as any)?.groups?.options as string | undefined
      return replacer(fmt.replace(pattern(key), optionsParser(options)(contentParser(key, log[key]))), key)
    } as (fmt: string, key: string) => string, this.fmt);
  }

  formatDate(date: Date): string {
    const replacer = {
      Y: (d: Date) => String("0000" + d.getUTCFullYear()).slice(-4),
      m: (d: Date) => String("00" + (d.getUTCMonth() + 1)).slice(-2),
      d: (d: Date) => String("00" +d.getUTCDate()).slice(-2),
      H: (d: Date) => String("00" +d.getUTCHours()).slice(-2),
      M: (d: Date) => String("00" +d.getUTCMinutes()).slice(-2),
      S: (d: Date) => String("00" +d.getUTCSeconds()).slice(-2),
      i: (d: Date) => d.toISOString(),
    }
    let result = ""
    for (let idx = 0; idx < this.dateFormat.length; idx++) {
      if (this.dateFormat[idx] === "%") {
        idx += 1
        if (this.dateFormat[idx] === "%") result += "%"
        else if (replacer[this.dateFormat[idx] as keyof typeof replacer]) result += replacer[this.dateFormat[idx] as keyof typeof replacer](date)
      } else {
        result += this.dateFormat[idx]
      }
    }
    return result
  }
}

export class ConsoleHandler implements Handler {
  level: number
  formatter: Formatter

  constructor(level: number = DEFAULT_LEVELS.INFO, fmt?: string, dateFormat?: string) {
    this.level = level
    this.formatter = new DefaultFormatter(fmt, dateFormat)
  }

  handle(log: LogRecord): void {
    const str = this.formatter.format(log)
    if (log.level < DEFAULT_LEVELS.DEBUG)
      return console.trace(str)
    if (log.level < DEFAULT_LEVELS.INFO)
      return console.debug(str)
    if (log.level < DEFAULT_LEVELS.WARN)
      return console.info(str)
    if (log.level < DEFAULT_LEVELS.ERROR)
      return console.warn(str)
    return console.error(str)
  }
}

type LoggerType = Logger & Loggable
class Logger {
  private readonly _name: string
  parent?: Logger
  propagate: boolean
  defaultLevel: number
  children: Record<string, LoggerType>
  builder: Builder
  handlers: Handler[]

  constructor(name: string, defaultLevel: number = DEFAULT_LEVELS.INFO, builder: Builder = defaultBuilder, handlers?: Handler[]) {
    this._name = name
    this.defaultLevel = defaultLevel
    this.builder = builder
    this.handlers = handlers ?? []
    this.propagate = true
    this.children = {}
  }

  get name(): string {
    if (this.parent && this.parent.name !== "root") return `${this.parent.name}${LOGGER_SEPARATOR}${this._name}`
    return this._name
  }

  addHandler(handler: Handler) {
    this.handlers.push(handler)
    return this
  }

  getChild(name: string): LoggerType {
    if (!this.children[name]) {
      const child = new Logger(name)
      child.parent = this
      this.children[name] = child as LoggerType
    }
    return this.children[name]
  }

  log(log: Partial<LogRecord>): void {
    const _log = this.builder.build.call(this, log)
    this.handlers.forEach(handler => handler.level <= _log.level && (async () => handler.handle(_log))())
    if (this.propagate) this.parent?.log(_log)
  }
}

class RootLogger extends Logger {
  private static _instance?: RootLogger

  private constructor() {
    super("__ROOT__")
  }

  static get instance(): LoggerType {
    if (!RootLogger._instance) RootLogger._instance = new RootLogger()
    return RootLogger._instance as LoggerType
  }

  get name(): string {
    return "root"
  }
}

class Logging {
  private static _root: LoggerType = RootLogger.instance
  private static _levels: Levels = {...DEFAULT_LEVELS}

  static get root() {
    return Logging._root
  }

  static get levels() {
    return {...Logging._levels}
  }

  static addLevel(name: string, level: number) {
    Logging._levels[name as keyof Levels] = level
    Object.defineProperties(Logging, {
      [name.toUpperCase()]: {
        configurable: false,
        get() {
          return Logging.levels[name.toUpperCase() as keyof Levels]
        }
      },
      [name.toLowerCase()]: {
        configurable: false,
        value: (...args: unknown[]) => (Logging.root as Loggable)[name.toLowerCase() as keyof Loggable](...args)
      },
    })
    ;(Logger.prototype as any)[name.toLowerCase()] = function (this: Logger, ...args: unknown[]) {
      return this.log({...this.builder.build.call(this, ...args), level: level})
    }
  }

  static getLogger(name: string): LoggerType {
    if (name === "root") return Logging.root
    return name.split(LOGGER_SEPARATOR).reduce((logger, name) => logger.getChild(name), Logging.root)
  }

  static getLevel(value: number): string
  static getLevel(value: keyof Loggable): number
  static getLevel(value: keyof Loggable | number) {
    if (typeof value === "string") return (Logging as any)[value]
    return Object.keys(Logging.levels).reduce(
      (_value, key) => Logging.levels[key as keyof Levels] === value ? key : _value,
      `Level(${value})`
    )
  }

  static log(log: Partial<LogRecord>) {
    Logging.root.log(log)
  }
}

Object.keys(DEFAULT_LEVELS).forEach(prop => {
  Logging.addLevel(prop, DEFAULT_LEVELS[prop as keyof typeof DEFAULT_LEVELS])
})

const __module: typeof Logging & Loggable & Levels = Logging as any
export default __module