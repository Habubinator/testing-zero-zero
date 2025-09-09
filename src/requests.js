const logger = require("./logger");
const axios = require("axios");

// Enhanced axios get function - with logging, retry on specific status codes, and timeout
async function getLink(link, isTriggered = 0, maxRetries = 5, timeout = 5000) {
    try {
        const result = await axios.get(link, { timeout });
        if (result.data) {
            return result.data;
        } else {
            throw new Error("Data is empty");
        }
    } catch (error) {
        const status = error.response?.status || null;
        // Decide to retry if it's a network error (no response), a 404, or a 512
        if (!status || status == 404 || status == 512) {
            return await getLink(link, isTriggered, maxRetries, timeout);
        } else if (isTriggered < maxRetries) {
            return await getLink(link, ++isTriggered, maxRetries, timeout);
        }
        logger.logError(error, [link, `Final attempt: ${isTriggered}`]);
    }
}

module.exports = { getLink };
