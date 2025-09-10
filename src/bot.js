const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOT_TOKEN, {
    polling: {
        interval: process.env.BOT_POLLING_INTERVAL || 300,
    },
});
const logger = require("./logger");
const db = require("./database/dbController");
const { getLink } = require("./requests");
const findFlag = require("country-emoji").flag;

// Flag function with England support
function flag(countryName) {
    const emoji = findFlag(countryName);
    if (emoji) {
        return emoji;
    } else if (countryName == "England") {
        return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    }
    return "🏳️";
}

// Weather emoji mapping
function getWeatherEmoji(weatherDesc) {
    const weatherMap = {
        "clear/sunny": "☀️",
        "partly cloudy": "⛅",
        "moderate or heavy rain shower": "🌧",
        "overcast": "☁",
        "moderate rain weather": "🌧",
    };
    return weatherMap[weatherDesc] || "Неизвестна";
}

// Set bot commands
bot.setMyCommands([
    { command: "/check_on", description: "Активировать трекер событий" },
    { command: "/check_off", description: "Выключить трекер событий" },
    { command: "/upcoming", description: "Расписание будущих событий" },
    { command: "/live", description: "Расписание текущих событий" },
    { command: "/support", description: "Помощь" },
]);

// Check team's last matches for 0:0 pattern
async function checkTeamZeroZeroPattern(teamId, matchesToCheck = 2) {
    try {
        const teamMatches = await getLink(
            `https://api.soccersapi.com/v2.2/fixtures/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=team&id=${teamId}&limit=${matchesToCheck + 5}`
        );

        if (!teamMatches?.data) return { hasPattern: false, matches: [] };

        // Filter completed matches and sort by date (newest first)
        const completedMatches = teamMatches.data
            .filter(match => match.status === 3) // Status 3 = finished
            .sort((a, b) => new Date(b.time.datetime) - new Date(a.time.datetime))
            .slice(0, matchesToCheck);

        if (completedMatches.length < matchesToCheck) {
            return { hasPattern: false, matches: completedMatches };
        }

        // Check if all matches were 0:0
        const allZeroZero = completedMatches.every(match =>
            match.scores.home_score === 0 && match.scores.away_score === 0
        );

        return {
            hasPattern: allZeroZero,
            matches: completedMatches
        };
    } catch (error) {
        logger.logError(error, { teamId, matchesToCheck });
        return { hasPattern: false, matches: [] };
    }
}

// Check H2H history between two teams
async function checkH2HZeroZeroPattern(homeTeamId, awayTeamId) {
    try {
        const h2hData = await getLink(
            `https://api.soccersapi.com/v2.2/h2h/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=teams&home=${homeTeamId}&away=${awayTeamId}&limit=10`
        );

        if (!h2hData?.data) return { hasPattern: false, lastMatch: null };

        // Find the most recent match between these teams
        const recentMatches = h2hData.data
            .filter(match => match.status === 3)
            .sort((a, b) => new Date(b.time.datetime) - new Date(a.time.datetime));

        if (recentMatches.length === 0) {
            return { hasPattern: false, lastMatch: null };
        }

        const lastMatch = recentMatches[0];
        const wasZeroZero = lastMatch.scores.home_score === 0 && lastMatch.scores.away_score === 0;

        return {
            hasPattern: wasZeroZero,
            lastMatch: lastMatch
        };
    } catch (error) {
        logger.logError(error, { homeTeamId, awayTeamId });
        return { hasPattern: false, lastMatch: null };
    }
}

// Check all three 0:0 patterns for a match
async function checkAllZeroZeroPatterns(match) {
    const homeTeamId = match.teams.home.id;
    const awayTeamId = match.teams.away.id;
    const patterns = [];

    try {
        // Pattern 1: Either team has two 0:0 games
        const homeTeamPattern = await checkTeamZeroZeroPattern(homeTeamId, 2);
        const awayTeamPattern = await checkTeamZeroZeroPattern(awayTeamId, 2);

        if (homeTeamPattern.hasPattern) {
            patterns.push({
                type: 'team_two_games',
                team: match.teams.home.name,
                description: `${match.teams.home.name} сыграла две предыдущие игры 0:0`
            });
        }

        if (awayTeamPattern.hasPattern) {
            patterns.push({
                type: 'team_two_games',
                team: match.teams.away.name,
                description: `${match.teams.away.name} сыграла две предыдущие игры 0:0`
            });
        }

        // Pattern 2: Both teams have one 0:0 game each
        const homeLastGame = await checkTeamZeroZeroPattern(homeTeamId, 1);
        const awayLastGame = await checkTeamZeroZeroPattern(awayTeamId, 1);

        if (homeLastGame.hasPattern && awayLastGame.hasPattern) {
            patterns.push({
                type: 'both_teams_one_game',
                team: 'Обе команды',
                description: `Обе команды сыграли последнюю игру 0:0`
            });
        }

        // Pattern 3: H2H last match was 0:0
        const h2hPattern = await checkH2HZeroZeroPattern(homeTeamId, awayTeamId);
        if (h2hPattern.hasPattern) {
            patterns.push({
                type: 'h2h_zero_zero',
                team: 'H2H',
                description: `Последняя игра между этими командами была 0:0`
            });
        }

        return patterns;
    } catch (error) {
        logger.logError(error, { matchId: match.id });
        return [];
    }
}

// Send 0:0 pattern signal
async function sendZeroZeroSignal(match, patterns) {
    try {
        const activeChats = await db.getChatsByActivity(true);
        if (!activeChats.length) return [];

        const matchTime = match.time.time.substring(0, 5);
        const countryFlag = flag(match.league?.country_name);
        const countryName = match.league?.country_name || "Unknown";
        const leagueName = match.league?.name || match.league?.type || "Unknown";

        // Create pattern descriptions
        const patternText = patterns.map(p => `📊 ${p.description}`).join('\n');

        const messageText =
            `🎯 <b>СИГНАЛ: 0:0 ПАТТЕРН</b>\n\n` +
            `⏰ <b>Матч будет в ${matchTime}</b>\n` +
            `${countryFlag} <b>${countryName}</b>\n` +
            `🏆 <b>${leagueName}</b>\n\n` +
            `⚽ <b>${match.teams.home.name}</b> против <b>${match.teams.away.name}</b>\n\n` +
            `${patternText}\n\n` +
            `#ZeroZeroPattern #Signal`;

        const messageIds = [];

        for (const chat of activeChats) {
            try {
                const message = await bot.sendMessage(chat.chat_id, messageText, {
                    parse_mode: "HTML"
                });

                if (message) {
                    messageIds.push(message.message_id);
                    // Store notification in database
                    await db.createZeroZeroNotification(
                        chat.chat_id,
                        match.id,
                        message.message_id,
                        JSON.stringify(patterns)
                    );
                }
            } catch (error) {
                logger.logError(error, { chatId: chat.chat_id, matchId: match.id });
            }
        }

        console.log(`📤 Sent 0:0 pattern signal for match ${match.id} to ${activeChats.length} chats`);
        return messageIds;
    } catch (error) {
        logger.logError(error, { matchId: match.id, patterns });
        return [];
    }
}

// Send match result after completion
async function sendZeroZeroResult(match, originalPatterns) {
    try {
        const notifications = await db.getZeroZeroNotificationsByMatchId(match.id);
        if (!notifications.length) return;

        // Get match stats
        const statsData = await getLink(
            `https://api.soccersapi.com/v2.2/stats/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=match&id=${match.id}&utc=3`
        );

        const stats = statsData?.data;
        let corners = 0, yellowCards = 0, redCards = 0;

        if (stats && stats.length >= 2) {
            corners = parseInt(stats[0].corners || 0) + parseInt(stats[1].corners || 0);
            yellowCards = parseInt(stats[0].yellowcards || 0) + parseInt(stats[1].yellowcards || 0);
            redCards = parseInt(stats[0].redcards || 0) + parseInt(stats[1].redcards || 0);
        }

        // Get match details with events for goals
        const matchDetails = await getLink(
            `https://api.soccersapi.com/v2.2/fixtures/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=info&id=${match.id}&include=events&utc=3`
        );

        const goalEvents = matchDetails?.data?.events?.filter(event =>
            event.type === 'goal' || event.name?.toLowerCase().includes('goal')
        ) || [];

        // Format goals list
        let goalsList = '';
        if (goalEvents.length === 0) {
            goalsList = '⚽ <b>Голы не забиты</b>\n';
        } else {
            goalsList = '⚽ <b>Голы:</b>\n';
            goalEvents
                .sort((a, b) => parseInt(a.minute) - parseInt(b.minute))
                .forEach(goal => {
                    const minute = goal.minute;
                    const teamName = goal.team_name;
                    const playerName = goal.player_name || 'Неизвестный игрок';
                    goalsList += `   ${minute}' <b>${teamName}</b> - ${playerName}\n`;
                });
        }

        // Get pattern description
        const patternDescription = originalPatterns.length > 0 ?
            originalPatterns[0].description : 'Неизвестный паттерн';

        const homeScore = parseInt(match.scores.home_score);
        const awayScore = parseInt(match.scores.away_score);

        const messageText =
            `✅ <b>МАТЧ ЗАВЕРШЕН</b>\n\n` +
            `⚽ <b>${match.teams.home.name}</b> vs <b>${match.teams.away.name}</b>\n` +
            `📊 <b>Счет: ${homeScore}:${awayScore}</b>\n\n` +
            `${goalsList}\n` +
            `📈 <b>Статистика:</b>\n` +
            `🟡 Желтые карты: ${yellowCards}\n` +
            `🔴 Красные карты: ${redCards}\n` +
            `⚽ Угловые: ${corners}\n\n` +
            `💡 Триггер: <b>${patternDescription}</b>\n` +
            `#MatchFinished #ZeroZeroResult`;

        for (const notification of notifications) {
            try {
                await bot.sendMessage(notification.chat_id, messageText, {
                    parse_mode: "HTML",
                    reply_to_message_id: notification.message_id
                });
            } catch (error) {
                logger.logError(error, {
                    chatId: notification.chat_id,
                    matchId: match.id
                });
            }
        }

        // Save to Google Sheets
        await saveZeroZeroMatchStats(match, originalPatterns, {
            homeScore,
            awayScore,
            corners,
            yellowCards,
            redCards
        });

        // Clean up notifications
        await db.deleteZeroZeroNotificationsByMatchId(match.id);

        console.log(`📤 Sent 0:0 result for match ${match.id} to ${notifications.length} chats`);
    } catch (error) {
        logger.logError(error, { matchId: match.id });
    }
}

// Save match stats to Google Sheets
async function saveZeroZeroMatchStats(match, patterns, stats) {
    try {
        const gSh = require('./database/gSheetsController');

        const patternDescription = patterns.length > 0 ?
            patterns.map(p => p.description).join('; ') : 'Неизвестный паттерн';

        const matchData = {
            match_id: match.id,
            country: match.league?.country_name || 'Unknown',
            league: match.league?.name || match.league?.type || 'Unknown',
            start_time: match.time.datetime,
            home_team: match.teams.home.name,
            away_team: match.teams.away.name,
            home_score_final: stats.homeScore,
            away_score_final: stats.awayScore,
            corners_total: stats.corners,
            yellowcards_total: stats.yellowCards,
            redcards_total: stats.redCards,
            pattern_trigger: patternDescription
        };

        await gSh.exportSingleZeroZeroMatch(matchData);
        console.log(`📊 Saved 0:0 match stats for match ${match.id} to Google Sheets`);
    } catch (error) {
        logger.logError(error, { matchId: match.id, patterns, stats });
    }
}

// Main 0:0 pattern detection function
async function checkTodayMatchesForZeroZeroPatterns() {
    try {
        console.log('🔍 Checking today matches for 0:0 patterns...');

        const linkData = await getLink(
            `https://api.soccersapi.com/v2.2/livescores/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=today&include=stats,events&utc=3`
        );

        const todayMatches = linkData?.data;
        if (!todayMatches || !todayMatches.length) {
            console.log('📅 No matches found for today');
            return;
        }

        // Filter for upcoming matches (status 0)
        const upcomingMatches = todayMatches.filter(match =>
            match.status === 0 && match.teams?.home && match.teams?.away
        );

        console.log(`📊 Found ${upcomingMatches.length} upcoming matches to check`);

        const processedMatches = await db.getProcessedZeroZeroMatches();
        const processedMatchIds = new Set(processedMatches.map(m => m.match_id));

        let signalsSent = 0;

        for (const match of upcomingMatches) {
            // Skip if already processed
            if (processedMatchIds.has(match.id)) {
                continue;
            }

            console.log(`🔍 Checking match: ${match.teams.home.name} vs ${match.teams.away.name}`);

            const patterns = await checkAllZeroZeroPatterns(match);

            if (patterns.length > 0) {
                console.log(`✅ Found ${patterns.length} pattern(s) for match ${match.id}`);
                await sendZeroZeroSignal(match, patterns);
                await db.markZeroZeroMatchAsProcessed(match.id, JSON.stringify(patterns));
                signalsSent++;
            }

            // Add small delay to avoid API rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`📤 Sent ${signalsSent} 0:0 pattern signals`);
    } catch (error) {
        logger.logError(error, 'Error in checkTodayMatchesForZeroZeroPatterns');
    }
}

// Check for completed matches and send results
async function checkCompletedZeroZeroMatches() {
    try {
        const pendingMatches = await db.getPendingZeroZeroMatches();

        for (const pendingMatch of pendingMatches) {
            const matchData = await getLink(
                `https://api.soccersapi.com/v2.2/fixtures/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=info&id=${pendingMatch.match_id}&utc=3`
            );

            const match = matchData?.data;
            if (match && (match.status === 3 || match.status === 31 || match.status === 32)) {
                const patterns = JSON.parse(pendingMatch.patterns || '[]');
                await sendZeroZeroResult(match, patterns);
                await db.markZeroZeroMatchAsCompleted(pendingMatch.match_id);
            }
        }
    } catch (error) {
        logger.logError(error, 'Error in checkCompletedZeroZeroMatches');
    }
}

// Basic telegram command handlers (simplified versions)
bot.onText(/\/start/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(chatId, `Для использования этого бота вам нужен @username`);
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                return bot.sendMessage(chatId,
                    `У вас уже есть доступ. Бот активирован.\n/check_on - активировать трекер событий`);
            } else if ((await db.getPendingUserByUsername(msg.from.username)).length) {
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                return bot.sendMessage(chatId,
                    `Вы получили доступ. Бот активирован.\n/check_on - активировать трекер событий`);
            } else {
                return bot.sendMessage(chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`);
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/check_on/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(chatId, `Для использования этого бота вам нужен @username`);
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                }
                if (thisChat && !thisChat.active) {
                    let chatCount = await db.countActiveChatsByUserId(msg.from.id);
                    if (chatCount < process.env.CHATS_NOTIFICATION_LIMIT) {
                        await db.changeChatActivity(chatId, true);
                        return bot.sendMessage(chatId,
                            `Трекер событий активирован (${chatCount + 1}/${process.env.CHATS_NOTIFICATION_LIMIT})\n/check_off - выключить трекер событий`);
                    } else {
                        return bot.sendMessage(chatId,
                            `На вашем аккаунте слишком много активных чатов \n/check_off - выключить трекер событий`);
                    }
                } else {
                    return bot.sendMessage(chatId,
                        `В этом чате уже активирован трекер событий \n/check_off - выключить трекер событий`);
                }
            } else if ((await db.getPendingUserByUsername(msg.from.username)).length) {
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                return bot.sendMessage(chatId,
                    `Вы получили доступ.\nТрекер событий активирован.(${1}/${process.env.CHATS_NOTIFICATION_LIMIT})\n/check_off - выключить трекер событий`);
            } else {
                return bot.sendMessage(chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`);
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/check_off/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(chatId, `Для использования этого бота вам нужен @username`);
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                    await db.changeChatActivity(chatId, false);
                }
                if (thisChat && thisChat.active) {
                    await db.changeChatActivity(chatId, false);
                    let chatCount = await db.countActiveChatsByUserId(msg.from.id);
                    return bot.sendMessage(chatId,
                        `Трекер событий успешно выключен (${chatCount}/${process.env.CHATS_NOTIFICATION_LIMIT})\n/check_on - активировать трекер событий `);
                } else {
                    return bot.sendMessage(chatId,
                        `Трекер событий был выключен \n/check_on - активировать трекер событий`);
                }
            } else if ((await db.getPendingUserByUsername(msg.from.username)).length) {
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                await db.changeChatActivity(chatId, false);
                return bot.sendMessage(chatId,
                    `Трекер событий был выключен \n/check_on - активировать трекер событий`);
            } else {
                return bot.sendMessage(chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`);
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/upcoming/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(chatId, `Для использования этого бота вам нужен @username`);
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                    await db.changeChatActivity(chatId, false);
                }

                if (isNaN(user[0].last_api_trigger)) user[0].last_api_trigger = 0;

                if (Date.now() / 1000 >= user[0].last_api_trigger) {
                    const linkData = await getLink(
                        `https://api.soccersapi.com/v2.2/livescores/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=today&include=stats,events&utc=3`
                    );
                    const data = linkData?.data;

                    if (data && data.length) {
                        let timeout = +process.env.USER_API_TRIGGER_TIMEOUT_IN_SECONDS;
                        db.updateUserLastApiTrigger(msg.from.id, Date.now() / 1000 + timeout);

                        let matchList = ``;
                        data.sort((a, b) => {
                            const timeA = a.time.time;
                            const timeB = b.time.time;
                            const dateA = new Date(`1970-01-01T${timeA}Z`);
                            const dateB = new Date(`1970-01-01T${timeB}Z`);
                            return dateA - dateB;
                        });

                        for (const match of data) {
                            if (match.status === 0 && match.time != null && match.league != null) {
                                let time = `${match.time.time.substring(0, 5)}`;
                                matchList += `\n${time}${flag(match.league.country_name)}${match.league.country_name},${match.league.name}`;
                            }
                        }

                        let time = new Date();
                        let hours = time.getHours();
                        let minutes = time.getMinutes();
                        if (minutes < 10) minutes = "0" + minutes;

                        bot.sendMessage(chatId,
                            `Время сервера ${hours}:${minutes} (UTC+3)` +
                            `\n———` +
                            `\nБлижайшие матчи:` +
                            `\n` + matchList);
                    } else {
                        return bot.sendMessage(chatId,
                            `Наблюдаются технические проблемы, попробуйте через пару секунд.`);
                    }
                } else {
                    return bot.sendMessage(chatId,
                        `Вы недавно сделали запрос, подождите ${(user[0].last_api_trigger - Date.now() / 1000).toFixed(2)} секунд`);
                }
            } else if ((await db.getPendingUserByUsername(msg.from.username)).length) {
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                await db.changeChatActivity(chatId, false);
                return bot.sendMessage(chatId,
                    `Ваш аккаунт активирован \nПришлите команду /upcoming ещё раз`);
            } else {
                return bot.sendMessage(chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`);
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/live/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(chatId, `Для использования этого бота вам нужен @username`);
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                }

                if (isNaN(user[0].last_api_trigger)) user[0].last_api_trigger = 0;

                if (Date.now() / 1000 >= user[0].last_api_trigger) {
                    const linkData = await getLink(
                        `https://api.soccersapi.com/v2.2/livescores/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=live&include=stats,events&utc=3`
                    );
                    const data = linkData?.data;

                    if (data && data.length) {
                        let timeout = +process.env.USER_API_TRIGGER_TIMEOUT_IN_SECONDS;
                        db.updateUserLastApiTrigger(msg.from.id, Date.now() / 1000 + timeout);

                        let matchList = ``;
                        data.sort((a, b) => {
                            const timeA = a?.time?.time;
                            const timeB = b?.time?.time;
                            if (timeA == null) return -1;
                            if (timeB == null) return 1;
                            const dateA = new Date(`1970-01-01T${timeA}Z`);
                            const dateB = new Date(`1970-01-01T${timeB}Z`);
                            return dateA - dateB;
                        });

                        for (const match of data) {
                            if (match.status == 1 && match.league != null) {
                                matchList += `\n${flag(match.league.country_name)}${match.league.country_name},${match.league.name}`;
                            }
                        }

                        bot.sendMessage(chatId,
                            matchList ? `📊Идёт анализ по матчам:${matchList}` : `📊На данный момент отсутствуют матчи для анализа.`);
                    } else {
                        return bot.sendMessage(chatId,
                            `📊На данный момент отсутствуют матчи для анализа.`);
                    }
                } else {
                    return bot.sendMessage(chatId,
                        `Вы недавно сделали запрос, подождите ${(user[0].last_api_trigger - Date.now() / 1000).toFixed(2)} секунд`);
                }
            } else if ((await db.getPendingUserByUsername(msg.from.username)).length) {
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(chatId, msg.chat.title || "Private messages", msg.from.id);
                await db.changeChatActivity(chatId, false);
                return bot.sendMessage(chatId,
                    `Ваш аккаунт активирован \nПришлите команду /live ещё раз`);
            } else {
                return bot.sendMessage(chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`);
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/support/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId,
            `По техническим проблемам и за помощью пишите в личные сообщения @xomaxs или @ey4ar`);
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.on("polling_error", (error) => {
    if (Math.floor(process.uptime()) <= 60) {
        process.exit(0);
    }
});

module.exports = {
    bot,
    checkTodayMatchesForZeroZeroPatterns,
    checkCompletedZeroZeroMatches,
    flag
};