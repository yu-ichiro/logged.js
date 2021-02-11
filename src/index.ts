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
}

export interface Loggable {
  trace(...args: unknown[]): void

  debug(...args: unknown[]): void

  info(...args: unknown[]): void

  warn(...args: unknown[]): void

  error(...args: unknown[]): void

  fatal(...args: unknown[]): void
}

export interface LogRecord {
  level: string
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
      level: "",
      name: this.name,
      createdAt: new Date(),
      ...partialRecord,
    } as LogRecord
  }
}

class Logger implements Loggable {
  private _name: string
  parent?: Logger
  propagate: boolean
  defaultLevel: number
  children: Record<string, Logger>
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
    return this._name
  }

  addHandler(handler: Handler) {
    this.handlers.push(handler)
    return this
  }

  getChild(name: string) {
    const child = new Logger([this, name, name].join(LOGGER_SEPARATOR))
    child.parent = this
    this.children[name] = child
    return child
  }

  log(log: LogRecord, level?: number): void {
    const _log = {...log, level: Logging.getLevel(level ?? this.defaultLevel)}
    this.handlers.forEach(handler => handler.level <= (level ?? this.defaultLevel) && handler.handle(_log))
    if (this.propagate) this.parent?.log(_log, level)
  }

  trace(...args: unknown[]): void {
    this.log(this.builder.build(...args), DEFAULT_LEVELS.TRACE)
  }

  debug(...args: unknown[]): void {
    this.log(this.builder.build(...args), DEFAULT_LEVELS.DEBUG)
  }

  info(...args: unknown[]): void {
    this.log(this.builder.build(...args), DEFAULT_LEVELS.INFO)
  }

  warn(...args: unknown[]): void {
    this.log(this.builder.build(...args), DEFAULT_LEVELS.WARN)
  }

  error(...args: unknown[]): void {
    this.log(this.builder.build(...args), DEFAULT_LEVELS.ERROR)
  }

  fatal(...args: unknown[]): void {
    this.log(this.builder.build(...args), DEFAULT_LEVELS.FATAL)
  }

}

class RootLogger extends Logger {
  private static _instance?: RootLogger

  private constructor() {
    super("__ROOT__")
  }

  static get instance() {
    if (!RootLogger._instance) RootLogger._instance = new RootLogger()
    return RootLogger._instance
  }

  getChild(name: string) {
    if (this.children[name] == null) {
      const child = new Logger(name)
      child.parent = this
      this.children[name] = child
    }
    return this.children[name]
  }

  log(log: LogRecord, level?: number) {
    super.log({...log, name: "root"}, level);
  }
}

class Logging {
  private static _root: Logger = RootLogger.instance
  private static _levels: Levels = {...DEFAULT_LEVELS}

  static get root() {
    return Logging._root
  }

  static get levels() {
    return {...Logging._levels}
  }

  static addLevel(name: string, level: number) {
    Object.defineProperties(Logging, {
      [name.toUpperCase()]: {
        configurable: false,
        get() {
          return Logging.levels[name.toUpperCase() as keyof Levels]
        }
      },
      [name.toLowerCase()]: {
        configurable: false,
        value: (...args: unknown[]) => Logging.root[name.toLowerCase() as keyof Loggable](...args)
      },
    })
    ;(Logger.prototype as any)[name.toLowerCase()] = function (this: Logger, ...args: unknown[]) {
      return this.log(this.builder.build(...args), level)
    }
  }

  static getLogger(name: string) {
    if (name === "root") return Logging.root
    return name.split(LOGGER_SEPARATOR).reduce((logger, name) => logger.getChild(name), Logging.root)
  }

  static getLevel(value: number): string
  static getLevel(value: keyof Loggable): number
  static getLevel(value: keyof Loggable | number) {
    if (typeof value === "string") return (Logging as any)[value]
    return Object.keys(Logging.levels).reduce(
      (_value, key) => String(Logging.levels[key as keyof Levels]) === _value ? key : _value,
      String(value)
    )
  }

  static log(log: LogRecord, level?: number) {
    Logging.root.log(log, level)
  }
}

Object.keys(DEFAULT_LEVELS).forEach(prop => {
  Logging.addLevel(prop, DEFAULT_LEVELS[prop as keyof typeof DEFAULT_LEVELS])
})

const __module: typeof Logging & Loggable & Levels = Logging as any
export default __module