const { DateTime } = require('luxon');

const TIMEZONE = 'Europe/Istanbul';

/**
 * Log levels with colors
 */
const LEVELS = {
    INFO: '\x1b[36m[INFO]\x1b[0m',
    WARN: '\x1b[33m[WARN]\x1b[0m',
    ERROR: '\x1b[31m[ERROR]\x1b[0m',
    SUCCESS: '\x1b[32m[OK]\x1b[0m',
};

/**
 * Get formatted timestamp
 */
function getTimestamp() {
    return DateTime.now().setZone(TIMEZONE).toFormat('yyyy-MM-dd HH:mm:ss');
}

/**
 * Log info message
 */
function info(...args) {
    console.log(`${getTimestamp()} ${LEVELS.INFO}`, ...args);
}

/**
 * Log warning message
 */
function warn(...args) {
    console.log(`${getTimestamp()} ${LEVELS.WARN}`, ...args);
}

/**
 * Log error message
 */
function error(...args) {
    console.error(`${getTimestamp()} ${LEVELS.ERROR}`, ...args);
}

/**
 * Log success message
 */
function success(...args) {
    console.log(`${getTimestamp()} ${LEVELS.SUCCESS}`, ...args);
}

module.exports = {
    info,
    warn,
    error,
    success,
    getTimestamp,
    TIMEZONE,
};
