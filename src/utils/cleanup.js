const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const logger = require('./logger');

const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/**
 * Remove all files in a directory that match a pattern
 */
async function cleanupDirectory(dirPath, pattern = null) {
    try {
        if (!fs.existsSync(dirPath)) {
            return;
        }

        const files = await readdir(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStat = await stat(filePath);

            if (fileStat.isFile()) {
                if (!pattern || file.match(pattern)) {
                    await unlink(filePath);
                    logger.info(`Cleaned up: ${file}`);
                }
            }
        }
    } catch (error) {
        logger.error('Cleanup error:', error.message);
    }
}

/**
 * Remove a specific file if it exists
 */
async function removeFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            await unlink(filePath);
            logger.info(`Removed: ${path.basename(filePath)}`);
        }
    } catch (error) {
        logger.error(`Failed to remove ${filePath}:`, error.message);
    }
}

/**
 * Remove multiple files
 */
async function removeFiles(filePaths) {
    await Promise.all(filePaths.map(removeFile));
}

/**
 * Ensure a directory exists
 */
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Created directory: ${dirPath}`);
    }
}

module.exports = {
    cleanupDirectory,
    removeFile,
    removeFiles,
    ensureDir,
};
