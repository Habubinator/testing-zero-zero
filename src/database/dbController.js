const db = require("./dbPool");
const logger = require("./../logger");

class DBController {
    // ===== USER MANAGEMENT =====

    async createUser(chat_id, username) {
        const query = `
            INSERT INTO users (user_id, username, active, last_api_trigger)
            VALUES (?, ?, TRUE, 0)`;
        try {
            const [rows, fields] = await db.query(query, [chat_id, username]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getUserById(id) {
        const query = `SELECT * FROM users WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getUserByUsername(username) {
        const query = `SELECT * FROM users WHERE username = ?`;
        try {
            const [rows, fields] = await db.query(query, [username]);
            return rows[0];
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getAllUsers() {
        const query = "SELECT * FROM users";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async updateUserLastApiTrigger(user_id, last_api_trigger) {
        const query = `UPDATE users SET last_api_trigger = ? WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [last_api_trigger, user_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteUser(user_id) {
        try {
            const [chats] = await db.query(`SELECT chat_id FROM chats WHERE user_id = ?`, [user_id]);
            const chatIds = chats.map(c => c.chat_id);

            if (chatIds.length > 0) {
                await db.query(`DELETE FROM notifications WHERE chat_id IN (?)`, [chatIds]);
            }
            await db.query(`DELETE FROM chats WHERE user_id = ?`, [user_id]);
            const [rows] = await db.query(`DELETE FROM users WHERE user_id = ?`, [user_id]);
            return rows;
        } catch (error) {
            logger.logError(error, `Error deleting user ${user_id}`);
            throw error;
        }
    }

    // ===== PENDING USERS MANAGEMENT =====

    async createPendingUser(username) {
        const query = "INSERT INTO pending_users (username) VALUES (?)";
        try {
            const [rows, fields] = await db.query(query, [username]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getPendingUserByUsername(username) {
        const query = "SELECT * FROM pending_users WHERE username = ?";
        try {
            const [rows, fields] = await db.query(query, [username]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deletePendingUserByUsername(username) {
        const query = "DELETE FROM pending_users WHERE username = ?";
        try {
            const [rows, fields] = await db.query(query, [username]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getAllPendingUsers() {
        const query = `SELECT * FROM pending_users`;
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // ===== CHAT MANAGEMENT =====

    async getAllChats() {
        const query = "SELECT * FROM chats";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getChatById(chatId) {
        const query = "SELECT * FROM chats WHERE chat_id = ?";
        try {
            const [rows, fields] = await db.query(query, [chatId]);
            return rows.length ? rows[0] : null;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getChatsByActivity(isActive) {
        const query = "SELECT * FROM chats WHERE active = ?";
        try {
            const [rows, fields] = await db.query(query, [isActive]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async changeChatActivity(chatId, isActive) {
        const query = "UPDATE chats SET active = ? WHERE chat_id = ?";
        try {
            const [rows, fields] = await db.query(query, [isActive, chatId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async createChat(chatId, chatName, userId) {
        const query = "INSERT INTO chats (chat_id, chat_name, user_id, active) VALUES (?, ?, ?, true)";
        try {
            const [rows, fields] = await db.query(query, [chatId, chatName, userId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async countActiveChatsByUserId(userId) {
        const query = "SELECT COUNT(*) AS active_chats_count FROM chats WHERE user_id = ? AND active = true";
        try {
            const [rows, fields] = await db.query(query, [userId]);
            return rows[0].active_chats_count;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // ===== ZERO ZERO PATTERN NOTIFICATION MANAGEMENT =====

    // Create 0:0 pattern notification
    async createZeroZeroNotification(chatId, matchId, messageId, patterns) {
        const query = `
            INSERT INTO notifications (chat_id, match_id, message_id, patterns, created_at)
            VALUES (?, ?, ?, ?, NOW())`;
        try {
            const [rows, fields] = await db.query(query, [chatId, matchId, messageId, patterns]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Get 0:0 pattern notifications by match ID
    async getZeroZeroNotificationsByMatchId(matchId) {
        const query = "SELECT * FROM notifications WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [matchId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Delete 0:0 pattern notifications by match ID
    async deleteZeroZeroNotificationsByMatchId(matchId) {
        const query = "DELETE FROM notifications WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [matchId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // ===== ZERO ZERO PATTERN MATCH PROCESSING =====

    // Mark 0:0 match as processed for pattern detection
    async markZeroZeroMatchAsProcessed(matchId, patterns) {
        const query = `
            INSERT INTO processed_matches (match_id, patterns, processed_at, status)
            VALUES (?, ?, NOW(), 'signal_sent')
            ON DUPLICATE KEY UPDATE patterns = VALUES(patterns), processed_at = NOW()`;
        try {
            const [rows, fields] = await db.query(query, [matchId, patterns]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Get all processed 0:0 matches
    async getProcessedZeroZeroMatches() {
        const query = "SELECT * FROM processed_matches";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Get pending 0:0 matches (signal sent but not completed)
    async getPendingZeroZeroMatches() {
        const query = "SELECT * FROM processed_matches WHERE status = 'signal_sent'";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Mark 0:0 match as completed
    async markZeroZeroMatchAsCompleted(matchId) {
        const query = `
            UPDATE processed_matches 
            SET status = 'completed', completed_at = NOW() 
            WHERE match_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [matchId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // ===== LEGACY NOTIFICATION MANAGEMENT (for backward compatibility) =====

    // Create notification (legacy method name)
    async createNotification(chatId, matchId, messageId, patterns) {
        return this.createZeroZeroNotification(chatId, matchId, messageId, patterns);
    }

    // Get notifications by match ID (legacy method name)
    async getNotificationsByMatchId(matchId) {
        return this.getZeroZeroNotificationsByMatchId(matchId);
    }

    // Delete notifications by match ID (legacy method name)
    async deleteNotificationsByMatchId(matchId) {
        return this.deleteZeroZeroNotificationsByMatchId(matchId);
    }

    // ===== LEGACY MATCH PROCESSING (for backward compatibility) =====

    // Mark match as processed for pattern detection (legacy method name)
    async markMatchAsProcessed(matchId, patterns) {
        return this.markZeroZeroMatchAsProcessed(matchId, patterns);
    }

    // Get all processed matches (legacy method name)
    async getProcessedMatches() {
        return this.getProcessedZeroZeroMatches();
    }

    // Get pending matches (legacy method name)
    async getPendingMatches() {
        return this.getPendingZeroZeroMatches();
    }

    // Mark match as completed (legacy method name)
    async markMatchAsCompleted(matchId) {
        return this.markZeroZeroMatchAsCompleted(matchId);
    }

    // ===== MATCH STATISTICS =====

    // Create match statistics
    async createMatchStats({
        match_id, country, league, start_time, home_team, away_team,
        home_score_final, away_score_final, corners_total,
        yellowcards_total, redcards_total, pattern_trigger
    }) {
        const query = `
            INSERT INTO match_stats (
                match_id, country, league, start_time, home_team, away_team,
                home_score_final, away_score_final, corners_total,
                yellowcards_total, redcards_total, pattern_trigger, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
        try {
            const [rows, fields] = await db.query(query, [
                match_id, country, league, start_time, home_team, away_team,
                home_score_final, away_score_final, corners_total,
                yellowcards_total, redcards_total, pattern_trigger
            ]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Get all match statistics
    async getAllMatchStats() {
        const query = "SELECT * FROM match_stats ORDER BY created_at DESC";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Delete match stats by match ID
    async deleteMatchStatsByMatchId(match_id) {
        const query = "DELETE FROM match_stats WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [match_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // ===== ADMIN MANAGEMENT =====

    async getAdminByLogin(login) {
        const query = "SELECT * FROM admins WHERE login = ?";
        try {
            const [rows, fields] = await db.query(query, [login]);
            return rows[0];
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // ===== UTILITY METHODS =====

    async getUsersWithChats() {
        const query = `
            SELECT users.user_id, users.username, chats.chat_id, chats.chat_name, chats.active
            FROM users
            LEFT JOIN chats ON users.user_id = chats.user_id`;
        try {
            const [rows, fields] = await db.query(query);
            const usersWithChats = {};
            rows.forEach((row) => {
                if (!usersWithChats[row.user_id]) {
                    usersWithChats[row.user_id] = {
                        user_id: row.user_id,
                        username: row.username,
                        chats: [],
                    };
                }
                if (row.chat_id) {
                    usersWithChats[row.user_id].chats.push({
                        chat_id: row.chat_id,
                        chat_name: row.chat_name,
                        active: row.active,
                    });
                }
            });
            return Object.values(usersWithChats);
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getChatsByUserId(user_id) {
        const query = `SELECT * FROM chats WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [user_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Direct query method for custom operations
    async query(sql, params = []) {
        try {
            const [rows, fields] = await db.query(sql, params);
            return rows;
        } catch (error) {
            logger.logError(error, { sql, params });
            throw error;
        }
    }
}

module.exports = new DBController();