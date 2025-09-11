require("dotenv").config();
const logger = require("./logger");

// Import 0:0 pattern detection bot
const {
    bot,
    checkTodayMatchesForZeroZeroPatterns,
    checkCompletedZeroZeroMatches
} = require("./bot");

// Import required modules
const db = require("./database/dbController");
const gSh = require("./database/gSheetsController");
const adminPanel = require("./server");

function start() {
    console.log("🚀 Starting Soccer Bot - 0:0 Pattern Detection");
    console.log("=".repeat(50));

    // Function to run at specific time
    function runAtSpecificTimeOfDay(seconds, func) {
        const oneMinute = 60000;
        const now = new Date();
        let eta_ms = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            now.getMinutes(),
            seconds,
            0
        ).getTime() - now;
        if (eta_ms < 0) {
            eta_ms += oneMinute;
        }
        setTimeout(function () {
            func();
        }, eta_ms);
    }

    // Print system diagnostics
    function printSystemStatus() {
        console.log("\n" + "=".repeat(60));
        console.log(`📊 0:0 PATTERN DETECTION STATUS - ${new Date().toLocaleString()}`);
        console.log("=".repeat(60));
        console.log(`🎯 Pattern Detection: Active`);
        console.log(`📅 Checking Schedule: Every 10 minutes`);
        console.log(`✅ Result Processing: Every 5 minutes`);
        console.log(`📊 Google Sheets: Auto-export to "aisoccer 0:0"`);
        console.log(`🔍 Patterns Monitored:`);
        console.log(`   1. Team played last 2 games 0:0`);
        console.log(`   2. Both teams played last game 0:0`);
        console.log(`   3. Last H2H match was 0:0`);
        console.log("=".repeat(60) + "\n");
    }

    // Enhanced cleanup function for 0:0 functionality only
    async function scheduledCleanup() {
        try {
            console.log("🧹 Starting scheduled cleanup...");

            // Check for completed 0:0 matches and send results
            await checkCompletedZeroZeroMatches();

            // Clean up old processed matches (older than 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            try {
                await db.query(`
                    DELETE FROM processed_matches 
                    WHERE processed_at < ? AND status = 'completed'
                `, [sevenDaysAgo.toISOString()]);

                console.log("🗑️ Cleaned up old processed matches");
            } catch (error) {
                logger.logError(error, "Error cleaning old matches");
            }

            console.log("✅ Scheduled cleanup completed");
        } catch (error) {
            logger.logError(error, "Error in scheduledCleanup");
        }
    }

    // Pattern detection with enhanced logging
    async function enhancedPatternDetection() {
        try {
            console.log("\n🔍 Starting 0:0 Pattern Detection Cycle...");
            const startTime = Date.now();

            await checkTodayMatchesForZeroZeroPatterns();

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            console.log(`✅ Pattern detection cycle completed in ${duration}s`);

            // Print system status every hour
            const now = new Date();
            if (now.getMinutes() === 0 || now.getMinutes() === 30) {
                printSystemStatus();
            }

        } catch (error) {
            logger.logError(error, "Error in enhancedPatternDetection");
        }
    }

    // Initialize Google Sheets
    async function initializeGoogleSheets() {
        try {
            console.log("📊 Initializing Google Sheets...");
            const sheet = await gSh.getPatternSheet();
            if (sheet) {
                console.log(`✅ Google Sheets ready: "aisoccer 0:0" sheet available`);
            } else {
                console.log("❌ Google Sheets initialization failed");
            }
        } catch (error) {
            logger.logError(error, "Error initializing Google Sheets");
        }
    }

    // Database health check
    async function databaseHealthCheck() {
        try {
            console.log("🗄️ Checking database connection...");

            // Test database connection
            const users = await db.getAllUsers();
            const processedMatches = await db.getProcessedZeroZeroMatches();

            console.log(`✅ Database connected: ${users.length} users, ${processedMatches.length} processed matches`);
        } catch (error) {
            logger.logError(error, "Database health check failed");
            console.log("❌ Database connection failed");
        }
    }

    // Startup sequence
    async function initialize() {
        console.log("🔄 Initializing systems...");

        await databaseHealthCheck();
        await initializeGoogleSheets();

        console.log("⏰ Setting up schedules...");

        // Main pattern detection - every 10 minutes
        setInterval(enhancedPatternDetection, 1000 * 60 * 10);

        // Completed matches check - every 5 minutes
        setInterval(checkCompletedZeroZeroMatches, 1000 * 60 * 5);

        // Cleanup - every hour
        setInterval(scheduledCleanup, 1000 * 60 * 60);

        // Start first pattern detection cycle after 10 seconds
        setTimeout(enhancedPatternDetection, 10000);

        // Start first cleanup after 1 minute
        setTimeout(scheduledCleanup, 60000);

        printSystemStatus();

        console.log("✅ All systems initialized successfully!");
        console.log("🎯 Bot is now monitoring for 0:0 patterns...");
        console.log("📱 Telegram commands available:");
        console.log("   /start - Initialize user");
        console.log("   /check_on - Enable notifications");
        console.log("   /check_off - Disable notifications");
        console.log("   /upcoming - Show upcoming matches");
        console.log("   /live - Show live matches");
        console.log("   /support - Get support");
    }

    // Start initialization
    initialize();
}

// Delayed start (run at specific second of next minute)
function runAtSpecificTimeOfDay(seconds, func) {
    const oneMinute = 60000;
    const now = new Date();
    let eta_ms = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        seconds,
        0
    ).getTime() - now;
    if (eta_ms < 0) {
        eta_ms += oneMinute;
    }
    setTimeout(function () {
        func();
    }, eta_ms);
}

// Enhanced error handling
process.on('unhandledRejection', (reason, promise) => {
    logger.logError(new Error('Unhandled Rejection'), { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.logError(error, 'Uncaught Exception');
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully');
    process.exit(0);
});

console.log("⏳ Soccer Bot (0:0 Pattern Detection) initializing...");
console.log("📋 Configuration:");
console.log(`   API Username: ${process.env.API_USERNAME ? '✅' : '❌'}`);
console.log(`   API Token: ${process.env.API_TOKEN ? '✅' : '❌'}`);
console.log(`   Bot Token: ${process.env.BOT_TOKEN ? '✅' : '❌'}`);
console.log(`   Database: ${process.env.DB_HOST ? '✅' : '❌'}`);
console.log(`   Google Sheets: ${process.env.GOOGLE_CREDENTIALS ? '✅' : '❌'}`);

// Start the bot with delayed initialization
runAtSpecificTimeOfDay(1, start);