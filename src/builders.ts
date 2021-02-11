import { Builder, LogRecord } from "./types";
import { Logger } from "./logger";

export const loggerBuilder: Builder = {
  build(this: Logger, ...args: unknown[]): LogRecord {
    if (args.length < 1) throw Error("at least one argument is required");
    const firstArg = args.shift();
    let partialRecord = {
      message: undefined as string | undefined,
      args: args,
    };
    if (typeof firstArg === "object") {
      partialRecord = { ...partialRecord, ...firstArg };
    } else if (typeof firstArg === "string") {
      partialRecord.message = firstArg;
    } else {
      partialRecord.message = String(firstArg);
    }
    if (!partialRecord.message) throw Error("message not specified");

    return {
      level: this.defaultLevel,
      name: this.name,
      createdAt: new Date(),
      ...partialRecord,
    } as LogRecord;
  },
};
