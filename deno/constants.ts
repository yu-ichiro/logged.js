// @ts-nocheck
import { Levels } from "./types.ts";

export const LOGGER_SEPARATOR = ".";
export const DEFAULT_LEVELS: Levels = {
  TRACE: 5,
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
  FATAL: 50,
} as Levels;
