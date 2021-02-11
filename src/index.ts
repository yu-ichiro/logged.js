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
  log(log: Log, level: number): void
  trace(log: Log): void
  debug(log: Log): void
  info(log: Log): void
  warn(log: Log): void
  error(log: Log): void
  fatal(log: Log): void
}

export interface Log {
  name: string
  createdAt: Date
  message: string
}

export interface Formatter {
  format(log: Log): string
}

export interface Handler {
  level: number

  log(log: Log): void
}

class Logger implements Loggable {
  private name: string
  parent?: Logger
  propagate: boolean
  defaultLevel: number
  children: Record<string, Logger>
  handlers: Handler[]

  constructor(name: string, defaultLevel: number = DEFAULT_LEVELS.INFO, handlers?: Handler[]) {
    this.name = name
    this.defaultLevel = defaultLevel
    this.handlers = handlers ?? []
    this.propagate = true
    this.children = {}
  }

  trace(log: Log): void {
    this.log(log, DEFAULT_LEVELS.TRACE)
  }

  debug(log: Log): void {
    this.log(log, DEFAULT_LEVELS.DEBUG)
  }

  info(log: Log): void {
    this.log(log, DEFAULT_LEVELS.INFO)
  }

  warn(log: Log): void {
    this.log(log, DEFAULT_LEVELS.WARN)
  }

  error(log: Log): void {
    this.log(log, DEFAULT_LEVELS.ERROR)
  }

  fatal(log: Log): void {
    this.log(log, DEFAULT_LEVELS.FATAL)
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

  log(log: Log, level?: number): void {
    this.handlers.forEach(handler => handler.level <= (level ?? this.defaultLevel) && handler.log(log))
    if (this.propagate) this.parent?.log(log)
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
}

class Logging {
  private static _root: Logger = RootLogger.instance
  static get root() {
    return Logging._root
  }

  static addLevel(name: string, level: number) {
    Object.defineProperties(Logging, {
      [name.toUpperCase()]: {
        configurable: false,
        value: level
      },
      [name.toLowerCase()]: {
        configurable: false,
        value: (log: Log) => Logging.log(log, level)
      },
    })
    ;(Logger.prototype as any)[name.toLowerCase()] = function (this: Logger, log: Log) {
      return this.log(log, level)
    }
  }

  static getLogger(name: string) {
    return name.split(LOGGER_SEPARATOR).reduce((logger, name) => logger.getChild(name), Logging.root)
  }

  static log(log: Log, level?: number) {
    Logging.root.log(log, level)
  }
}

Object.keys(DEFAULT_LEVELS).forEach(prop => {
  Logging.addLevel(prop, DEFAULT_LEVELS[prop as keyof typeof DEFAULT_LEVELS])
})

const __module: typeof Logging & Loggable & Levels = Logging as any
export default __module