import pino from 'pino';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = pino({
    formatters: {
        level(level) {
            return { level };
        },
    },
    base: undefined,
    level: LOG_LEVEL,
});
