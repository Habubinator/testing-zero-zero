require("dotenv").config();
const logger = require("./logger");
const { getLink } = require("./requests");
const findFlag = require("country-emoji").flag;

const formula = {
    matchMinuteFirstCoef: +process.env.FORMULA_1 || 4,
    matchMinuteMaxCoef: +process.env.FORMULA_2 || 15,
    onTarget: +process.env.FORMULA_3 || 1,
    onCorner: +process.env.FORMULA_4 || 2,
    dangAttackCoef: +process.env.FORMULA_5 || 1.3,
};

// TODO - сделать автоподгрузку из статистики, чтобы не лезть в бд и не очищать ради исправления багов

// Костыль (и так сойдет)
function flag(countryName) {
    const emoji = findFlag(countryName);
    if (emoji) {
        return emoji;
    } else if (countryName == "England") {
        return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    }
    return "🏳️";
}

// Запустить в определенные секунды этой-следующей минуты
function runAtSpecificTimeOfDay(seconds, func) {
    const oneMinute = 60000;
    const now = new Date();
    let eta_ms =
        new Date(
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

// Получить
function getWeatherEmoji(weatherDesc) {
    let obj = {
        "clear/sunny": "☀️",
        "partly cloudy": "⛅",
        "moderate or heavy rain shower": "🌧",
        overcast: "☁",
        "moderate rain weather": "🌧",
    };
    let result = obj[weatherDesc];
    if (result !== null) {
        return result;
    } else {
        logger.logError(
            new Error(
                `No weather description for ${weatherDesc} weather, update data please!`
            )
        );
        return "Неизвестна";
    }
}

// Бот
const bot = require("./bot");
// Админ панель
const adminPanel = require("./server");
// БД (MySQL)
const db = require(`./database/dbController`);
// Контроллер гугл таблиц, реализовывать все методы там
const gSh = require(`./database/gSheetsController`);
// Примочки сервера, не пользовался особо
const { log } = require("console");

function start() {
    // Main script
    let lastMinuteData = new Map();
    let watchingScores = new Map();
    let statsArray = [];
    let notificationNumber = 2136;

    // async function exportTemp() {
    //     let tempToTableArr = require("./temp.json") || [];
    //     let toGoogleSheet = [];
    //     let sheet = await gSh.getSheet();
    //     for (let obj of tempToTableArr) {
    //         toGoogleSheet.push(obj);
    //     }
    //     await gSh.exportStatsToSheet(sheet, toGoogleSheet);
    // }

    // // МОЖЕТ ЗАНИМАТЬ ДО 10 минут на 1000 строк в гугл таблице
    // async function exportTemp() {
    //     console.log("Start");
    //     const sheet = await gSh.getSheet();
    //     const toGoogleSheet = [];
    //     const allGShArr = await gSh.getAllData(sheet);
    //     for (const gShObj in allGShArr) {
    //         // await new Promise((resolve) => setTimeout(resolve, 1000)); // ожидание 1 секунды

    //         const data = await getLink(
    //             `https://api.soccersapi.com/v2.2/fixtures/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=info&id=${allGShArr[gShObj]["id Матча"]}&utc=3`
    //         );
    //         const statsData = (
    //             await getLink(
    //                 `https://api.soccersapi.com/v2.2/stats/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=match&id=${allGShArr[gShObj]["id Матча"]}&utc=3`
    //             )
    //         )?.data;
    //         if (statsData && data?.data?.status == 3) {
    //             toGoogleSheet.push({
    //                 ...allGShArr[gShObj],
    //                 "Счёт хозяев в итоге": data.data.scores.home_score,
    //                 "Счёт гостей в итоге": data.data.scores.away_score,
    //                 "Угловые в итоге":
    //                     +statsData[0].corners + +statsData[1].corners,
    //                 "Желтые карты в итоге":
    //                     +statsData[0].yellowcards + +statsData[1].yellowcards,
    //                 "Красные карты в итоге":
    //                     +statsData[0].redcards + +statsData[1].redcards,
    //                 "Удар по воротам в итоге":
    //                     +statsData[0].shots_on_target +
    //                     +statsData[1].shots_on_target,
    //             });
    //         }
    //     }
    //     let sheet2 = await gSh.createSheet();
    //     await gSh.reExportStatsToSheet(sheet2, toGoogleSheet);
    //     console.log("End");
    // }

    // exportTemp();
    // return;

    async function exportAllDbToGSheets() {
        const stats = await db.getAllStats();
        if (stats && stats.length) {
            let sheet = await gSh.getSheet();
            gSh.exportStatsToSheet(sheet, stats);
            for (let stat of stats) {
                await db.deleteStatsByMatchId(stat.match_id);
            }
        }
    }

    async function timedDataClean() {
        try {
            let sheet = await gSh.getSheet();
            let toGoogleSheet = [];
            const lastMinuteDataMatches = [...lastMinuteData.keys()];
            for (let deleteMatchId of lastMinuteDataMatches) {
                const data = await getLink(
                    `https://api.soccersapi.com/v2.2/fixtures/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=info&id=${deleteMatchId}&utc=3`
                );
                const statsData = (
                    await getLink(
                        `https://api.soccersapi.com/v2.2/stats/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=match&id=${deleteMatchId}&utc=3`
                    )
                )?.data;
                if (
                    statsData &&
                    (data?.data?.status == 3 ||
                        data?.data?.status == 31 ||
                        data?.data?.status == 32)
                ) {
                    // Сохраняет плюсовые матчи
                    for (let i = 0; i < statsArray.length; i++) {
                        if (statsArray[i]?.match_id == deleteMatchId) {
                            let tempStat = statsArray[i];
                            toGoogleSheet.push({
                                ...tempStat,
                                home_score_at_end: data.data.scores.home_score,
                                away_score_at_end: data.data.scores.away_score,
                                corners_at_end:
                                    +statsData[0].corners +
                                    +statsData[1].corners,
                                yellowcards_at_end:
                                    +statsData[0].yellowcards +
                                    +statsData[1].yellowcards,
                                shots_on_target_at_end:
                                    +statsData[0].shots_on_target +
                                    +statsData[1].shots_on_target,
                                dangerous_attacks_at_end:
                                    +statsData[0].dangerous_attacks +
                                    +statsData[1].dangerous_attacks,
                                redcards_at_end:
                                    +statsData[0].redcards +
                                    +statsData[1].redcards,
                            });
                            statsArray.splice(i--, 1);
                        }
                    }

                    // Сохраняет минусовые матчи
                    if (watchingScores.has(deleteMatchId)) {
                        toGoogleSheet.push({
                            ...(await db.getStatsByMatchId(deleteMatchId)),
                            goal_time: "",
                            home_score_at_end: data.data.scores.home_score,
                            away_score_at_end: data.data.scores.away_score,
                            corners_at_end:
                                +statsData[0].corners + +statsData[1].corners,
                            yellowcards_at_end:
                                +statsData[0].yellowcards +
                                +statsData[1].yellowcards,
                            shots_on_target_at_end:
                                +statsData[0].shots_on_target +
                                +statsData[1].shots_on_target,
                            dangerous_attacks_at_end:
                                +statsData[0].dangerous_attacks +
                                +statsData[1].dangerous_attacks,
                            redcards_at_end:
                                +statsData[0].redcards + +statsData[1].redcards,
                        });
                    }

                    // Очистка лишнего из бд
                    lastMinuteData.delete(deleteMatchId);
                    watchingScores.delete(deleteMatchId);
                    await db.deleteStatsByMatchId(deleteMatchId);
                    await db.deleteNotificationsByMatchId(deleteMatchId);
                }
            }
            let stats = toGoogleSheet;
            if (stats && stats.length > 0) {
                await gSh.exportStatsToSheet(sheet, stats);
            }
        } catch (error) {
            logger.logError(error);
        }
    }

    function printMatchDiagnostics(data, lastMinuteData, watchingScores, statsArray) {
        console.log("\n" + "=".repeat(60));
        console.log(`🔍 ДИАГНОСТИКА МАТЧЕЙ - ${new Date().toLocaleString()}`);
        console.log("=".repeat(60));

        // Общая статистика
        console.log(`📊 ОБЩАЯ СТАТИСТИКА:`);
        console.log(`   Всего live матчей в API: ${data ? data.length : 0}`);
        console.log(`   Матчей в отслеживании: ${lastMinuteData.size}`);
        console.log(`   Матчей ожидающих гол: ${watchingScores.size}`);
        console.log(`   Матчей в статистике: ${statsArray.length}`);

        // Формулы для анализа
        console.log(`\n🧮 ТЕКУЩИЕ ФОРМУЛЫ:`);
        console.log(`   Мин коэф (атаки-минуты): ${formula.matchMinuteFirstCoef}`);
        console.log(`   Макс коэф (атаки-минуты): ${formula.matchMinuteMaxCoef}`);
        console.log(`   Мин удары по воротам: ${formula.onTarget}`);
        console.log(`   Мин угловые: ${formula.onCorner}`);
        console.log(`   Коэф опасных атак: ${formula.dangAttackCoef}`);
        console.log(`   Мин минута для анализа: ${process.env.API_MINUTES_AFTERMATCH}`);

        if (data && data.length > 0) {
            console.log(`\n⚽ ДЕТАЛИ ПО МАТЧАМ:`);

            let analyzedMatches = 0;
            let eligibleMatches = 0;
            let matchesWithSignal = 0;

            for (const match of data) {
                let matchMinute = 0;
                if (match.time?.minute) {
                    match.time.minute.split("+").forEach((element) => {
                        matchMinute += +element;
                    });
                }

                const matchId = match.id;
                const isTracked = lastMinuteData.has(matchId);
                const isWatchingGoal = watchingScores.has(matchId);
                const hasStats = statsArray.some(stat => stat.match_id == matchId);

                // Подсчет для статистики
                if (matchMinute >= +process.env.API_MINUTES_AFTERMATCH) {
                    analyzedMatches++;

                    if (isTracked) {
                        eligibleMatches++;

                        const oldData = lastMinuteData.get(matchId);
                        const newData = {
                            matchMinute: matchMinute,
                            dangerousAttacks: 0, // Заполнится из реального API
                            onTarget: 0,
                            corners: 0,
                            attacks: 0
                        };

                        if (oldData) {
                            const attacksDiff = newData.dangerousAttacks - newData.matchMinute -
                                (oldData.dangerousAttacks - oldData.matchMinute);

                            const meetsFormula = attacksDiff >= formula.matchMinuteFirstCoef &&
                                attacksDiff < formula.matchMinuteMaxCoef &&
                                (newData.onTarget >= formula.onTarget || newData.corners >= formula.onCorner) &&
                                newData.attacks / newData.dangerousAttacks >= formula.dangAttackCoef;

                            if (meetsFormula && !isWatchingGoal) {
                                matchesWithSignal++;
                            }
                        }
                    }

                    // Детали матча
                    const status = isWatchingGoal ? "🔴 ОЖИДАЕТ ГОЛ" :
                        isTracked ? "🟡 ОТСЛЕЖИВАЕТСЯ" :
                            "⚪ АНАЛИЗИРУЕТСЯ";

                    console.log(`   ${status} ${match.teams?.home?.name || 'N/A'} vs ${match.teams?.away?.name || 'N/A'}`);
                    console.log(`      └─ Минута: ${matchMinute}, ID: ${matchId}`);

                    if (isTracked) {
                        const oldData = lastMinuteData.get(matchId);
                        if (oldData) {
                            console.log(`      └─ Счет: ${oldData.scores?.home?.score || 0}:${oldData.scores?.away?.score || 0}`);
                            console.log(`      └─ Опасные атаки: ${oldData.dangerousAttacks}, Удары: ${oldData.onTarget}, Угловые: ${oldData.corners}`);

                            const attacksDiff = oldData.dangerousAttacks - oldData.matchMinute;
                            const coef = oldData.attacks > 0 ? (oldData.attacks / oldData.dangerousAttacks).toFixed(2) : "N/A";
                            console.log(`      └─ Коэф атак-минут: ${attacksDiff}, Коэф опасности: ${coef}`);
                        }
                    }

                    if (hasStats) {
                        const stat = statsArray.find(s => s.match_id == matchId);
                        if (stat) {
                            console.log(`      └─ 📈 Сигнал на ${stat.signal_time} мин, гол: ${stat.goal_time || 'ожидается'}`);
                        }
                    }
                }
            }

            console.log(`\n📈 СТАТИСТИКА АНАЛИЗА:`);
            console.log(`   Матчей анализируется (>${process.env.API_MINUTES_AFTERMATCH} мин): ${analyzedMatches}`);
            console.log(`   Матчей соответствует критериям: ${eligibleMatches}`);
            console.log(`   Матчей получили сигнал: ${matchesWithSignal}`);

            if (analyzedMatches > 0) {
                console.log(`   Процент сигналов: ${((matchesWithSignal / analyzedMatches) * 100).toFixed(1)}%`);
            }
        }

        // Детали по матчам в статистике
        if (statsArray.length > 0) {
            console.log(`\n📋 МАТЧИ В СТАТИСТИКЕ:`);
            statsArray.forEach((stat, index) => {
                const goalStatus = stat.goal_time ? `⚽ Гол на ${stat.goal_time} мин` : "⏳ Ожидается";
                console.log(`   ${index + 1}. ${stat.home_team} vs ${stat.away_team}`);
                console.log(`      └─ ${goalStatus}, Сигнал: ${stat.signal_time} мин`);
                console.log(`      └─ Коэф: ${stat.coefficient}, Счет: ${stat.home_score}:${stat.away_score}`);
            });
        }

        // Детали по отслеживаемым матчам
        if (lastMinuteData.size > 0) {
            console.log(`\n👁️ ОТСЛЕЖИВАЕМЫЕ МАТЧИ:`);
            let trackIndex = 1;
            for (const [matchId, matchData] of lastMinuteData) {
                const isWaiting = watchingScores.has(matchId);
                const waitingIcon = isWaiting ? "🔴" : "🟡";

                console.log(`   ${waitingIcon} ${trackIndex}. ID: ${matchId}`);
                console.log(`      └─ ${matchData.scores?.home?.name || 'N/A'} ${matchData.scores?.home?.score || 0}:${matchData.scores?.away?.score || 0} ${matchData.scores?.away?.name || 'N/A'}`);
                console.log(`      └─ Минута: ${matchData.matchMinute}, Атаки: ${matchData.dangerousAttacks}`);
                console.log(`      └─ Удары: ${matchData.onTarget}, Угловые: ${matchData.corners}, Карты: Ж${matchData.yellowCards}/К${matchData.redCards}`);

                const attacksPerMinute = matchData.dangerousAttacks - matchData.matchMinute;
                const dangerCoef = matchData.attacks > 0 ? (matchData.attacks / matchData.dangerousAttacks).toFixed(2) : "N/A";
                console.log(`      └─ Атаки-минуты: ${attacksPerMinute}, Коэф опасности: ${dangerCoef}`);

                trackIndex++;
            }
        }

        console.log("=".repeat(60) + "\n");
    }

    async function getApi() {
        try {
            // Get new data from API
            const linkData = await getLink(
                `https://api.soccersapi.com/v2.2/livescores/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=live&include=stats,events&utc=3`
            );
            const data = linkData?.data;

            // console.log(data);

            // Если данные с апи про лайв матчи пришли
            if (data && data.length) {
                for (const match of data) {
                    let matchMinute = 0;
                    match.time?.minute.split("+").forEach((element) => {
                        matchMinute += +element;
                    });
                    const matchId = match.id;
                    if (matchMinute >= +process.env.API_MINUTES_AFTERMATCH) {
                        const linkMatchData = (
                            await getLink(
                                `https://api.soccersapi.com/v2.2/stats/?user=${process.env.API_USERNAME}&token=${process.env.API_TOKEN}&t=match&id=${matchId}&utc=3`
                            )
                        )?.data;

                        // Если данные в апи не пришли (апи говно, не отдает данные)
                        if (
                            linkMatchData == null ||
                            linkMatchData[0] == null ||
                            linkMatchData[1] == null
                        ) {
                            // UPD: Уже и так понятно что апи говно, слишком засирает логи

                            // logger.logError(
                            //     new Error(
                            //         "linkMatchData is empty at index.js, API may be offline! logging allLiveMatchData, currentMatchData and linkMatchData"
                            //     ),
                            //     data,
                            //     match,
                            //     linkMatchData
                            // );
                            continue;
                        }
                        // Данные за эту минуту
                        const newMatchData = {
                            matchMinute: matchMinute,
                            corners:
                                +linkMatchData[0].corners +
                                +linkMatchData[1].corners,
                            onTarget:
                                +linkMatchData[0].shots_on_target +
                                +linkMatchData[1].shots_on_target,
                            attacks:
                                +linkMatchData[0].attacks +
                                +linkMatchData[1].attacks,
                            dangerousAttacks:
                                +linkMatchData[0].dangerous_attacks +
                                +linkMatchData[1].dangerous_attacks,
                            yellowCards:
                                +linkMatchData[0].yellowcards +
                                +linkMatchData[1].yellowcards,
                            redCards:
                                +linkMatchData[0].redcards +
                                +linkMatchData[1].redcards,
                            scores: {
                                home: {
                                    id: match.teams?.home?.id,
                                    name: match.teams?.home?.name,
                                    score: +match.scores?.home_score,
                                },
                                away: {
                                    id: match.teams?.away?.id,
                                    name: match.teams?.away?.name,
                                    score: +match.scores?.away_score,
                                },
                            },
                        };

                        // Данные за прошлую минуту
                        const oldMatchData =
                            lastMinuteData.get(matchId) || null;

                        // Если есть с чем сравнивать данные, то сравнить
                        if (oldMatchData) {
                            if (+process.env.LOGING) {
                                logger.logStats({
                                    Матч: `${matchId}`,
                                    "Формулы по матчу": {
                                        "Соотношение атак-минут": `${newMatchData.dangerousAttacks -
                                            newMatchData.matchMinute -
                                            (oldMatchData.dangerousAttacks -
                                                oldMatchData.matchMinute)
                                            }`,
                                        "По воротам": `${newMatchData.onTarget}`,
                                        Угловые: `${newMatchData.corners}`,
                                        "Коеф опасных атак": `${newMatchData.attacks /
                                            newMatchData.dangerousAttacks
                                            }`,
                                    },
                                    "Данные за эту минуту": newMatchData,
                                    "Данные за прошлую минуту": oldMatchData,
                                });
                            }

                            // Оповещение о новых голах
                            if (watchingScores.has(matchId)) {
                                async function sendGoalMessage(scoringTeam) {
                                    const chats = await db.getChatsByActivity(
                                        true
                                    );
                                    // разослать по чатам уведомления
                                    for (const chat of chats) {
                                        if (chat.chat_id) {
                                            try {
                                                bot.sendMessage(
                                                    chat.chat_id,
                                                    `<b>${scoringTeam}</b> забивает гол ⚽️` +
                                                    `\n<b>Минута матча</b>: ${match.time?.minute}` +
                                                    `\n<b>Счёт в матче</b>: ${newMatchData.scores.home.score}:${newMatchData.scores.away.score} ✅`,
                                                    {
                                                        parse_mode: "HTML",
                                                        reply_to_message_id: (
                                                            await db.getNotification(
                                                                chat.chat_id,
                                                                matchId
                                                            )
                                                        )[0].message_id,
                                                    }
                                                );
                                            } catch (error) {
                                                logger.logError(error);
                                            }
                                        }
                                    }
                                    // костыль чтобы не перерабатывать всю бд и модуль к ней
                                    statsArray.push({
                                        ...(await db.getStatsByMatchId(
                                            matchId
                                        )),
                                        goal_time: newMatchData.matchMinute,
                                        notifications:
                                            await db.getNotificationsByMatchID(
                                                matchId
                                            ),
                                    });
                                    await db.deleteStatsByMatchId(matchId);
                                    watchingScores.delete(matchId);
                                    await db.deleteNotificationsByMatchId(
                                        matchId
                                    );
                                }

                                // Инициализация локальных переменных для проверки гола
                                let scoreLogging = false;
                                let scoringTeam;

                                // Если home команда забила
                                if (
                                    newMatchData.scores?.home?.score >
                                    oldMatchData.scores?.home?.score
                                ) {
                                    scoreLogging = true;
                                    scoringTeam = newMatchData.scores.home.name;
                                }

                                // Если away команда забила
                                if (
                                    newMatchData.scores?.away?.score >
                                    oldMatchData.scores?.away?.score
                                ) {
                                    scoreLogging = true;
                                    scoringTeam = newMatchData.scores.away.name;
                                }

                                // Выполнение функции
                                if (scoreLogging) {
                                    sendGoalMessage(scoringTeam);
                                    scoreLogging = false;
                                }
                            }

                            // Если гол отменили
                            if (
                                newMatchData.scores?.home?.score <
                                oldMatchData.scores?.home?.score ||
                                newMatchData.scores?.away?.score <
                                oldMatchData.scores?.away?.score
                            ) {
                                for (
                                    let i = statsArray.length - 1;
                                    i >= 0;
                                    i--
                                ) {
                                    let tempStat = statsArray[i];
                                    if (
                                        tempStat.match_id == matchId &&
                                        newMatchData.scores?.home?.score ==
                                        tempStat.home_score &&
                                        newMatchData.scores?.away?.score ==
                                        tempStat.away_score
                                    ) {
                                        await db.createMatchStats({
                                            ...tempStat,
                                            goal_time: "",
                                        });
                                        statsArray.splice(i, 1);
                                        watchingScores.set(matchId, null);
                                        // Отослать сообщение во все активные чаты
                                        for (const notification of tempStat.notifications) {
                                            if (notification.chat_id) {
                                                try {
                                                    let message =
                                                        await bot.sendMessage(
                                                            notification.chat_id,
                                                            `<b>🚫Отмена гола </b>` +
                                                            `\n<b>Ожидаем новый гол. </b>` +
                                                            `\n<b>Минута матча:</b> ${match.time?.minute}` +
                                                            `\n<b>Счёт в матче:</b>  ${newMatchData.scores.home.score}:${newMatchData.scores.away.score}`,
                                                            {
                                                                parse_mode: "HTML",
                                                                reply_to_message_id:
                                                                    notification.message_id,
                                                            }
                                                        );
                                                    if (message) {
                                                        db.createNotification(
                                                            notification.chat_id,
                                                            matchId,
                                                            notification.message_id
                                                        );
                                                    }
                                                } catch (error) {
                                                    logger.logError(error, `Время: ${new Date()}`)
                                                }
                                            }
                                        }
                                        break;
                                    }
                                }
                            }

                            // Фикс наложения минут когда после 45+5 апи вернет 46
                            if (
                                oldMatchData.matchMinute >
                                newMatchData.matchMinute
                            ) {
                                oldMatchData.matchMinute =
                                    newMatchData.matchMinute - 1;
                            }

                            // Оповещение о подпадания по формуле
                            if (
                                !watchingScores.has(matchId) &&
                                newMatchData.matchMinute >
                                oldMatchData.matchMinute &&
                                newMatchData.dangerousAttacks -
                                newMatchData.matchMinute -
                                (oldMatchData.dangerousAttacks -
                                    oldMatchData.matchMinute) >=
                                formula.matchMinuteFirstCoef &&
                                newMatchData.dangerousAttacks -
                                newMatchData.matchMinute -
                                (oldMatchData.dangerousAttacks -
                                    oldMatchData.matchMinute) <
                                formula.matchMinuteMaxCoef &&
                                (newMatchData.onTarget >= formula.onTarget ||
                                    newMatchData.corners >= formula.onCorner) &&
                                newMatchData.attacks /
                                newMatchData.dangerousAttacks >=
                                formula.dangAttackCoef
                            ) {
                                db.createMatchStats({
                                    match_id: matchId,
                                    country: match.league.country_name,
                                    league: match.league.name,
                                    start_time: match.time.datetime,
                                    home_team: newMatchData.scores.home.name,
                                    away_team: newMatchData.scores.away.name,
                                    signal_time: newMatchData.matchMinute,
                                    home_score: newMatchData.scores.home.score,
                                    away_score: newMatchData.scores.away.score,
                                    coefficient:
                                        newMatchData.attacks /
                                        newMatchData.dangerousAttacks,
                                    corners_at_signal: newMatchData.corners,
                                    yellowcards_at_signal:
                                        newMatchData.yellowCards,
                                    shots_on_target_at_signal:
                                        newMatchData.onTarget,
                                    dangerous_attacks_at_signal:
                                        newMatchData.dangerousAttacks,
                                    redcards_at_signal: newMatchData.redCards,
                                });
                                watchingScores.set(matchId, null);
                                const chats = await db.getChatsByActivity(true);
                                notificationNumber++;
                                // Отослать сообщение во все активные чаты
                                for (const chat of chats) {
                                    if (chat.chat_id) {
                                        try {
                                            let message = await bot.sendMessage(
                                                chat.chat_id,
                                                `<b>#${notificationNumber} ❗❗ ОЖИДАЕМ ГОЛ ❗❗</b>` +
                                                `\n<b>Страна:</b> ${flag(
                                                    match.league.country_name
                                                )}${match.league.country_name
                                                }` +
                                                `\n<b>Лига:</b> ${match.league.name}` +
                                                `\n<b>Команды:</b> ${newMatchData.scores.home.name} : ${newMatchData.scores.away.name}` +
                                                `\n<b>Погода:</b> ${getWeatherEmoji(
                                                    match.weather_report
                                                        ?.desc
                                                ) || "Неизвестна"
                                                }` +
                                                `\n<b>Минута матча</b>: ${match.time?.minute}` +
                                                `\n<b>Счёт в матче</b>: ${newMatchData.scores.home.score}:${newMatchData.scores.away.score}` +
                                                `\n<b>Красные карты</b>: ${newMatchData.redCards}`,
                                                { parse_mode: "HTML" }
                                            );
                                            if (message) {
                                                db.createNotification(
                                                    chat.chat_id,
                                                    matchId,
                                                    message.message_id
                                                );
                                            }
                                        } catch (error) {
                                            console.error(error)
                                        }
                                    }
                                }
                            }
                        }

                        lastMinuteData.set(matchId, newMatchData);
                    }
                }
                printMatchDiagnostics(data, lastMinuteData, watchingScores, statsArray);
                if (+process.env.LOGING) {
                    // logger.logDebug({
                    //     "Данные для дебага": {
                    //         "Матчи за которыми следит бот":
                    //             Object.fromEntries(lastMinuteData),
                    //         "Голы за которыми следит бот":
                    //             Object.fromEntries(watchingScores),
                    //         "Статистика что ожидает записи в гугл таблицы":
                    //             statsArray,
                    //     },
                    // });
                }
            } else {
                // logger.logError(new Error("Data was empty"))
            }
        } catch (error) {
            logger.logError(error);
        }
    }
    setInterval(getApi, 1000 * 60); // Сразу ставим интервал на минуту в запросы к апи
    setInterval(timedDataClean, 1000 * 60 * 60 * 1); // Каждый час очищать прошедшие матчи
    getApi(); // Cразу после таймера выполняем запрос к апи, чтобы не откладывать таймер
}

// Отложенный старт
runAtSpecificTimeOfDay(1, start);
