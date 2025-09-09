const db = require("./dbPool");
const logger = require("./../logger");

class DBController {
    // Створення юзера
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

    // Зчитування юзерів за статусом активності
    async getUsersByActiveStatus(isActive) {
        const query = `
      SELECT * FROM users
      WHERE active = ?`;
        try {
            const [rows, fields] = await db.query(query, [isActive]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Зчитування юзерів за статусом активності
    async getUserById(id) {
        const query = `
      SELECT * FROM users
      WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getUserByUsername(username) {
        const query = `
            SELECT *
            FROM users
            WHERE username = ?`;
        try {
            const [rows, fields] = await db.query(query, [username]);
            return rows[0];
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Зчитування всіх юзерів
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

    // Зміни статусу active у юзера
    async updateUserActiveStatus(chat_id, isActive) {
        const query = `
      UPDATE users
      SET active = ?
      WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [isActive, chat_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Зміни last_api_trigger у юзера
    async updateUserLastApiTrigger(user_id, last_api_trigger) {
        const query = `
      UPDATE users
      SET last_api_trigger = ?
      WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [
                last_api_trigger,
                user_id,
            ]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Видалення юзера
    async deleteUser(user_id) {
    try {
        const [chats] = await db.query(`SELECT chat_id FROM chats WHERE user_id = ?`, [user_id]);
        const chatIds = chats.map(c => c.chat_id);

        if (chatIds.length > 0) {
            await db.query(`DELETE FROM goal_await_notifications WHERE chat_id IN (?)`, [chatIds]);
        }
        await db.query(`DELETE FROM chats WHERE user_id = ?`, [user_id]);
        const [rows] = await db.query(`DELETE FROM users WHERE user_id = ?`, [user_id]);
        return rows;
    } catch (error) {
        logger.logError(error, `Error deleting user ${user_id}`);
        throw error;
    }
	}

    // Додавання користувача до таблиці pending_users
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

    // Отримання користувача з таблиці pending_users за вказаним username
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

    // Видалення користувача з таблиці pending_users за вказаним username
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
        const query = `
            SELECT *
            FROM pending_users`;
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Знайти всі чати
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

    // Знайти чат за його chat_id
    async getChatById(chatId) {
        const query = "SELECT * FROM chats WHERE chat_id = ?";
        try {
            const [rows, fields] = await db.query(query, [chatId]);
            return rows.length ? rows[0] : null; // Ви повертаєте перший знайдений рядок, оскільки chat_id - унікальний ключ
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Знайти всі активні або неактивні чати
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

    // Змінити статус активності чату за його chat_id
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

    // Додати новий чат
    async createChat(chatId, chatName, userId) {
        const query =
            "INSERT INTO chats (chat_id, chat_name, user_id, active) VALUES (?, ?, ?, true)";
        try {
            const [rows, fields] = await db.query(query, [
                chatId,
                chatName,
                userId,
            ]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteChatsByUserId(user_id) {
        const query = `
            DELETE FROM chats
            WHERE user_id = ?`;
        try {
            const [result, fields] = await db.query(query, [user_id]);
            return result;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteChatByChatId(chat_id) {
        const query = `
            DELETE FROM chats
            WHERE chat_id = ?`;
        try {
            const [result, fields] = await db.query(query, [chat_id]);
            return result;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Перевірка кількості активних чатів юзера
    async countActiveChatsByUserId(userId) {
        const query =
            "SELECT COUNT(*) AS active_chats_count FROM chats WHERE user_id = ? AND active = true";
        try {
            const [rows, fields] = await db.query(query, [userId]);
            // Повертаємо кількість активних чатів як ціле число
            return rows[0].active_chats_count;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Додати статистику матчу до таблиці
    async createMatchStats({
        match_id,
        country,
        league,
        start_time,
        home_team,
        away_team,
        signal_time,
        home_score,
        away_score,
        coefficient,
        corners_at_signal,
        yellowcards_at_signal,
        shots_on_target_at_signal,
        dangerous_attacks_at_signal,
        redcards_at_signal,
    }) {
        const query = `INSERT INTO stats (match_id, country, league, start_time, home_team, away_team, signal_time, home_score, away_score, coefficient, corners_at_signal, yellowcards_at_signal, shots_on_target_at_signal, dangerous_attacks_at_signal, redcards_at_signal)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        try {
            const [rows, fields] = await db.query(query, [
                match_id,
                country,
                league,
                start_time,
                home_team,
                away_team,
                signal_time,
                home_score,
                away_score,
                coefficient,
                corners_at_signal,
                yellowcards_at_signal,
                shots_on_target_at_signal,
                dangerous_attacks_at_signal,
                redcards_at_signal,
            ]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            console.log(error);
        }
    }

    // Знайти всі статистики з таблиці
    async getAllStats() {
        const query = "SELECT * FROM stats";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Знайти статистику по айді матчу
    async getStatsByMatchId(match_id) {
        const query = "SELECT * FROM stats WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [match_id]);
            return rows[0]; // Возвращает первую найденную запись, так как match_id уникальный
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Обновить goal_time по match_id НЕ ИСПОЛЬЗУЕТСЯ ПОСЛЕ РЕФАКТОРИНГА
    async updateGoalTime({ match_id, goal_time }) {
        const query = `UPDATE stats SET goal_time = ? WHERE match_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [goal_time, match_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    // Оновити дані _at_end по match_id НЕ ИСПОЛЬЗУЕТСЯ ПОСЛЕ РЕФАКТОРИНГА
    async updateStatsEndData({
        match_id,
        goal_time,
        home_score_at_end,
        away_score_at_end,
        corners_at_end,
        yellowcards_at_end,
        shots_on_target_at_end,
        dangerous_attacks_at_end,
    }) {
        const query = `UPDATE stats SET 
      goal_time = ?,
      home_score_at_end = ?,
      away_score_at_end = ?,
      corners_at_end = ?,
      yellowcards_at_end = ?,
      shots_on_target_at_end = ?,
      dangerous_attacks_at_end = ?
      WHERE match_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [
                goal_time,
                home_score_at_end,
                away_score_at_end,
                corners_at_end,
                yellowcards_at_end,
                shots_on_target_at_end,
                dangerous_attacks_at_end,
                match_id,
            ]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteStatsByMatchId(match_id) {
        const query = "DELETE FROM stats WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [match_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async createNotification(chatId, matchId, messageId) {
        const query =
            "INSERT INTO goal_await_notifications (chat_id, match_id, message_id) VALUES (?, ?, ?)";
        try {
            const [rows, fields] = await db.query(query, [
                chatId,
                matchId,
                messageId,
            ]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            console.log(error);
        }
    }

    async getNotification(chatId, matchId) {
        const query =
            "SELECT * FROM goal_await_notifications WHERE chat_id = ? AND match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [chatId, matchId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getNotificationsByMatchID(matchId) {
        const query =
            "SELECT * FROM goal_await_notifications WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [matchId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteNotificationsByMatchId(matchId) {
        const query = "DELETE FROM goal_await_notifications WHERE match_id = ?";
        try {
            const [rows, fields] = await db.query(query, [matchId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteNotificationsByChatId(chatId) {
        const query = "DELETE FROM goal_await_notifications WHERE chat_id = ?";
        try {
            const [rows, fields] = await db.query(query, [chatId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async deleteNotificationById(notificationId) {
        const query = "DELETE FROM goal_await_notifications WHERE id = ?";
        try {
            const [rows, fields] = await db.query(query, [notificationId]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async createAdmin(login, password) {
        const query = `INSERT INTO admins (login, user_password) VALUES (?, ?)`;
        try {
            const [rows, fields] = await db.query(query, [login, password]);
            return rows;
        } catch (error) {
            logger.logError(error, query);

            throw error;
        }
    }

    async getAllAdmins() {
        const query = "SELECT * FROM admins";
        try {
            const [rows, fields] = await db.query(query);
            return rows;
        } catch (error) {
            logger.logError(error, query);

            throw error;
        }
    }

    async getAdminByLogin(login) {
        const query = "SELECT * FROM admins WHERE login = ?";
        try {
            const [rows, fields] = await db.query(query, [login]);
            return rows[0]; // Return the first admin found with the given login
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getUsersWithChats() {
        const query = `
        SELECT users.user_id, users.username, chats.chat_id, chats.chat_name, chats.active
        FROM users
        LEFT JOIN chats ON users.user_id = chats.user_id`;
        try {
            const [rows, fields] = await db.query(query);
            // Группируем результаты по пользователям
            const usersWithChats = {};
            rows.forEach((row) => {
                if (!usersWithChats[row.user_id]) {
                    usersWithChats[row.user_id] = {
                        user_id: row.user_id,
                        username: row.username,
                        chats: [],
                    };
                }
                // Добавляем чат к соответствующему пользователю
                if (row.chat_id) {
                    usersWithChats[row.user_id].chats.push({
                        chat_id: row.chat_id,
                        chat_name: row.chat_name,
                        active: row.active,
                    });
                }
            });
            // Преобразуем объект в массив
            return Object.values(usersWithChats);
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }

    async getChatsByUserId(user_id) {
        const query = `
            SELECT *
            FROM chats
            WHERE user_id = ?`;
        try {
            const [rows, fields] = await db.query(query, [user_id]);
            return rows;
        } catch (error) {
            logger.logError(error, query);
            throw error;
        }
    }
}

module.exports = new DBController();
