"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const log = (level, message, meta) => {
    const payload = meta ? { message, meta } : { message };
    const output = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](output, payload);
};
exports.logger = {
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
    debug: (message, meta) => log('debug', message, meta),
};
