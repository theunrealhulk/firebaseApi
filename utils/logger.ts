import pino from "pino";

const loggerOptions: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
};

export const logger = pino(loggerOptions);