const fs = require("fs").promises;
const path = require("path");

class Logger {
    constructor() {
        this.logDirectory = "./logs";
        this.statsDirectory = "./stats";
        this.debugDirectory = "./debug"; // Changed from debugFilePath to debugDirectory
        this.ensureDirectoryExists(this.logDirectory);
        this.ensureDirectoryExists(this.statsDirectory);
        this.ensureDirectoryExists(this.debugDirectory);
    }

    async ensureDirectoryExists(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (err) {
            console.error(`Error creating directory ${dirPath}:`, err);
        }
    }

    async logError(error, ...loggedItems) {
        if (!loggedItems) {
            loggedItems = [];
        }
        const logFilePath = path.join(this.logDirectory, `${Date.now()}.txt`);
        let logContent = `${new Date().toISOString()} - Error:\n${error.stack || error
            }\n\n`;

        loggedItems.forEach((item, index) => {
            logContent += `Logged Item ${index + 1}:\n${JSON.stringify(
                item,
                null,
                2
            )}\n\n`;
        });

        // try {
        //     await fs.writeFile(logFilePath, logContent, { flag: "a" });
        // } catch (err) {
        //     console.error(`Error writing to log file ${logFilePath}:`, err);
        // }
        console.error(logContent)
    }

    async logStats(...loggedItems) {
        const statsFilePath = path.join(
            this.statsDirectory,
            `${Date.now()}.txt`
        );
        let logContent = `${new Date().toISOString()}\n\n`;

        loggedItems.forEach((item, index) => {
            logContent += `Logged Item ${index + 1}:\n${JSON.stringify(
                item,
                null,
                2
            )}\n\n`;
        });

        // try {
        //     await fs.writeFile(statsFilePath, logContent, { flag: "a" });
        // } catch (err) {
        //     console.error(`Error writing to stats file ${statsFilePath}:`, err);
        // }
        console.log(logContent)
    }

    async logDebug(...loggedItems) {
        const debugFilePath = path.join(
            this.debugDirectory,
            `${Date.now()}.txt`
        );
        let logContent = `${new Date().toISOString()}\n\n`;

        loggedItems.forEach((item, index) => {
            logContent += `Logged Item ${index + 1}:\n${JSON.stringify(
                item,
                null,
                2
            )}\n\n`;
        });

        // try {
        //     await fs.writeFile(debugFilePath, logContent, { flag: "a" });
        // } catch (err) {
        //     console.error(`Error writing to debug file ${debugFilePath}:`, err);
        // }
        console.log(logContent)
    }
}

module.exports = new Logger();
