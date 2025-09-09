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

// Костыль, при возникновении снова проблем со смайликами переписать под object-property search
function flag(countryName) {
    const emoji = findFlag(countryName);
    if (emoji) {
        return emoji;
    } else if (countryName == "England") {
        return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    }
    return "🏳️";
}

function getGMT0Time() {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000; // Convert to UTC time
    const gmt0Time = new Date(utcTime + 0 * 3600000); // Add 0 hours for GMT-0
    return gmt0Time;
}

bot.setMyCommands([
    { command: "/check_on", description: "Активировать трекер событий" },
    { command: "/check_off", description: "Выключить трекер событий" },
    { command: "/upcoming", description: "Расписание будущих событий" },
    { command: "/live", description: "Расписание текущих событий" },
    { command: "/support", description: "Помощь" },
]);

bot.onText(/\/start/, async (msg) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(
                chatId,
                `Для использования этого бота вам нужен @username`
            );
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                // Пользователь активирован и написал боту
                return bot.sendMessage(
                    chatId,
                    `У вас уже есть доступ. Бот активирован.\n/check_on - активировать трекер событий`
                );
            } else if (
                (await db.getPendingUserByUsername(msg.from.username)).length
            ) {
                // Пользователь активирован и не писал боту
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                return bot.sendMessage(
                    chatId,
                    `Вы получили доступ. Бот активирован.\n/check_on - активировать трекер событий`
                );
            } else {
                // Пользователь не активирован
                return bot.sendMessage(
                    chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`
                );
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
            bot.sendMessage(
                chatId,
                `Для использования этого бота вам нужен @username`
            );
        } else {
            // Пользователь активирован и написал боту
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(
                        chatId,
                        msg.chat.title || "Private messages",
                        msg.from.id
                    );
                }
                if (thisChat && !thisChat.active) {
                    let chatCount = await db.countActiveChatsByUserId(
                        msg.from.id
                    );
                    if (chatCount < process.env.CHATS_NOTIFICATION_LIMIT) {
                        await db.changeChatActivity(chatId, true);
                        return bot.sendMessage(
                            chatId,
                            `Трекер событий активирован (${chatCount + 1}/${
                                process.env.CHATS_NOTIFICATION_LIMIT
                            })\n/check_off - выключить трекер событий`
                        );
                    } else {
                        return bot.sendMessage(
                            chatId,
                            `На вашем аккаунте слишком много активных чатов \n/check_off - выключить трекер событий`
                        );
                    }
                } else {
                    return bot.sendMessage(
                        chatId,
                        `В этом чате уже активирован трекер событий \n/check_off - выключить трекер событий`
                    );
                }
            } else if (
                (await db.getPendingUserByUsername(msg.from.username)).length
            ) {
                // Пользователь активирован и не писал боту
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(
                    chatId,
                    msg.chat.title || "Private messages",
                    msg.from.id
                );
                return bot.sendMessage(
                    chatId,
                    `Вы получили доступ.\nТрекер событий активирован.(${1}/${
                        process.env.CHATS_NOTIFICATION_LIMIT
                    })\n/check_off - выключить трекер событий`
                );
            } else {
                // Пользователь не активирован
                return bot.sendMessage(
                    chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`
                );
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
            bot.sendMessage(
                chatId,
                `Для использования этого бота вам нужен @username`
            );
        } else {
            // Пользователь активирован и написал боту
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(
                        chatId,
                        msg.chat.title || "Private messages",
                        msg.from.id
                    );
                    await db.changeChatActivity(chatId, false);
                }
                if (thisChat && thisChat.active) {
                    await db.changeChatActivity(chatId, false);
                    let chatCount = await db.countActiveChatsByUserId(
                        msg.from.id
                    );
                    return bot.sendMessage(
                        chatId,
                        `Трекер событий успешно выключен (${chatCount}/${process.env.CHATS_NOTIFICATION_LIMIT})\n/check_on - активировать трекер событий `
                    );
                } else {
                    return bot.sendMessage(
                        chatId,
                        `Трекер событий был выключен \n/check_on - активировать трекер событий`
                    );
                }
            } else if (
                (await db.getPendingUserByUsername(msg.from.username)).length
            ) {
                // Пользователь активирован и не писал боту
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(
                    chatId,
                    msg.chat.title || "Private messages",
                    msg.from.id
                );
                await db.changeChatActivity(chatId, false);
                return bot.sendMessage(
                    chatId,
                    `Трекер событий был выключен \n/check_on - активировать трекер событий`
                );
            } else {
                // Пользователь не активирован
                return bot.sendMessage(
                    chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`
                );
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/upcoming/, async (msg, match) => {
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(
                chatId,
                `Для использования этого бота вам нужен @username`
            );
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(
                        chatId,
                        msg.chat.title || "Private messages",
                        msg.from.id
                    );
                    await db.changeChatActivity(chatId, false);
                }
                if (isNaN(user[0].last_api_trigger)) {
                    user[0].last_api_trigger = 0;
                }
                // TODO - Название last_api_trigger не совсем подходит ибо в нем хранится следующий минимальный unix пинга апи,
                // стоит сменить на next_request_avaiable (или что-то вроде)
                if (Date.now() / 1000 >= user[0].last_api_trigger) {
                    const linkData = await getLink(
                        `https://api.soccersapi.com/v2.2/livescores/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=today&include=stats,events&utc=3`
                    );
                    const data = linkData?.data;
                    if (data && data.length) {
                        let timeout =
                            +process.env.USER_API_TRIGGER_TIMEOUT_IN_SECONDS;
                        db.updateUserLastApiTrigger(
                            msg.from.id,
                            Date.now() / 1000 + timeout
                        );
                        let matchList = ``;
                        data.sort((a, b) => {
                            // Получаем время в формате "чч:мм:сс" из свойства time объекта a и b
                            const timeA = a.time.time;
                            const timeB = b.time.time;

                            // Преобразуем время в объекты Date
                            const dateA = new Date(`1970-01-01T${timeA}Z`);
                            const dateB = new Date(`1970-01-01T${timeB}Z`);

                            // Сравниваем времена и возвращаем результат сравнения
                            return dateA - dateB;
                        });
                        for (const match of data) {
                            if (
                                match.status === 0 &&
                                match.time != null &&
                                match.league != null
                            ) {
                                let time = `${match.time.time.substring(0, 5)}`; // без секунд
                                matchList += `\n${time}${flag(
                                    match.league.country_name
                                )}${match.league.country_name},${
                                    match.league.name
                                }`;
                            }
                        }
                        let time = new Date();
                        hours = time.getHours();
                        minutes = time.getMinutes();
                        if (minutes < 10) {
                            minutes = "0" + minutes;
                        }
                        bot.sendMessage(
                            chatId,
                            `Время сервера ${hours}:${minutes} (UTC+3)` +
                                `\n———` +
                                `\nБлижайшие матчи:` +
                                `\n` +
                                matchList
                        );
                    } else {
                        return bot.sendMessage(
                            chatId,
                            `Наблюдаются технические проблемы, попробуйте через пару секунд.`
                        );
                    }
                } else {
                    return bot.sendMessage(
                        chatId,
                        `Вы недавно сделали запрос, подождите ${(
                            user[0].last_api_trigger -
                            Date.now() / 1000
                        ).toFixed(2)} секунд`
                    );
                }
            } else if (
                (await db.getPendingUserByUsername(msg.from.username)).length
            ) {
                // Пользователь активирован и не писал боту
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(
                    chatId,
                    msg.chat.title || "Private messages",
                    msg.from.id
                );
                await db.changeChatActivity(chatId, false);
                return bot.sendMessage(
                    chatId,
                    `Ваш аккаунт активирован \nПришлите команду /upcoming ещё раз`
                );
            } else {
                // Пользователь не активирован
                return bot.sendMessage(
                    chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`
                );
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/live/, async (msg, match) => {
    // TODO - check if that is user in db and has time lower than expected,
    // send api request and format it a little, then update last time. and return messsage
    try {
        const chatId = msg.chat.id;
        if (msg.from.username == null) {
            bot.sendMessage(
                chatId,
                `Для использования этого бота вам нужен @username`
            );
        } else {
            let user = await db.getUserById(msg.from.id);
            if (user.length && user[0]?.active) {
                let thisChat = await db.getChatById(chatId);
                if (thisChat == null) {
                    await db.createChat(
                        chatId,
                        msg.chat.title || "Private messages",
                        msg.from.id
                    );
                }
                if (isNaN(user[0].last_api_trigger)) {
                    user[0].last_api_trigger = 0;
                }
                if (Date.now() / 1000 >= user[0].last_api_trigger) {
                    // TODO - Название last_api_trigger не совсем подходит ибо в нем хранится следующий минимальный unix пинга апи
                    const linkData = await getLink(
                        `https://api.soccersapi.com/v2.2/livescores/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=live&include=stats,events&utc=3`
                    );
                    const data = linkData?.data;
                    if (data && data.length) {
                        let timeout =
                            +process.env.USER_API_TRIGGER_TIMEOUT_IN_SECONDS;
                        db.updateUserLastApiTrigger(
                            msg.from.id,
                            Date.now() / 1000 + timeout
                        );
                        let matchList = ``;
                        data.sort((a, b) => {
                            // Получаем время в формате "чч:мм:сс" из свойства time объекта a и b
                            const timeA = a?.time?.time;
                            const timeB = b?.time?.time;
                            if (timeA == null) {
                                return -1;
                            } else if (timeB == null) {
                                return 1;
                            }
                            // Преобразуем время в объекты Date
                            const dateA = new Date(`1970-01-01T${timeA}Z`);
                            const dateB = new Date(`1970-01-01T${timeB}Z`);

                            // Сравниваем времена и возвращаем результат сравнения
                            return dateA - dateB;
                        });
                        for (const match of data) {
                            if (match.status == 1 && match.league != null) {
                                matchList += `\n${flag(
                                    match.league.country_name
                                )}${match.league.country_name},${
                                    match.league.name
                                }`;
                            }
                        }
                        bot.sendMessage(
                            chatId,
                            `📊Идёт анализ по матчам:` + `\n` + matchList
                        );
                    } else {
                        return bot.sendMessage(
                            chatId,
                            `📊На данный момент отсутствуют матчи для анализа.`
                        );
                    }
                } else {
                    return bot.sendMessage(
                        chatId,
                        `Вы недавно сделали запрос, подождите ${(
                            user[0].last_api_trigger -
                            Date.now() / 1000
                        ).toFixed(2)} секунд`
                    );
                }
            } else if (
                (await db.getPendingUserByUsername(msg.from.username)).length
            ) {
                // Пользователь активирован и не писал боту
                await db.deletePendingUserByUsername(msg.from.username);
                await db.createUser(msg.from.id, msg.from.username);
                await db.createChat(
                    chatId,
                    msg.chat.title || "Private messages",
                    msg.from.id
                );
                await db.changeChatActivity(chatId, false);
                return bot.sendMessage(
                    chatId,
                    `Ваш аккаунт активирован \nПришлите команду /live ещё раз`
                );
            } else {
                // Пользователь не активирован
                return bot.sendMessage(
                    chatId,
                    `Для получения доступа к функциям бота пишите в личные сообщения @xomaxs или @ey4ar`
                );
            }
        }
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.onText(/\/support/, async (msg, match) => {
    try {
        const chatId = msg.chat.id;
        bot.sendMessage(
            chatId,
            `По техническим проблемам и за помощью пишите в личные сообщения @xomaxs или @ey4ar`
        );
    } catch (error) {
        logger.logError(error, msg);
    }
});

bot.on("polling_error", (error) => {
    if (Math.floor(process.uptime()) <= 60) {
        process.exit(0);
    }
});

module.exports = bot;
