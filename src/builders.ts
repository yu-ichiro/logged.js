import { Builder, LogRecord } from "./types";
import { BuilderRegistry } from "./registry";

class SimpleBuilder implements Builder {
  build(...args: unknown[]): LogRecord {
    if (args.length < 1) throw Error("at least one argument is required");
    const firstArg = args.shift();
    let partialRecord = {
      message: undefined as string | undefined,
      args: args,
    } as any;
    if (typeof firstArg === "object") {
      partialRecord = { ...partialRecord, ...firstArg };
    } else if (typeof firstArg === "string") {
      partialRecord.message = firstArg;
    } else {
      partialRecord.message = JSON.stringify(firstArg) ?? String(firstArg);
    }
    if (!partialRecord.message) throw Error("message not specified");

    return {
      createdAt: new Date(),
      ...partialRecord,
    } as LogRecord;
  }
}

BuilderRegistry.addBuilder("SimpleBuilder", SimpleBuilder);
BuilderRegistry.defaultBuilder = new SimpleBuilder();
