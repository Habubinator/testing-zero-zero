require("dotenv").config();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");

const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const doc = new GoogleSpreadsheet(
    process.env.GOOGLE_SHEETS_FILE_ID,
    serviceAccountAuth
);

const logger = require("./../logger");

class gSheetsController {
    async getAllData(sheet) {
        try {
            const doc = new GoogleSpreadsheet(
                process.env.GOOGLE_SHEETS_FILE_ID,
                serviceAccountAuth
            );
            await doc.loadInfo();
            const rows = await sheet.getRows();
            const objRows = [];
            for (const row of rows) {
                objRows.push(row.toObject());
            }
            return objRows;
        } catch (error) {
            logger.logError(error);
        }
    }

    async createSheet(date = new Date().toDateString()) {
        await doc.loadInfo();
        const sheet = await doc.addSheet({
            title: date,
            headerValues: [
                "id Матча",
                "Страна",
                "Лига",
                "Начало матча",
                "Хозяева",
                "Гости",
                "Время сигнала",
                "Cчёт хозяев",
                "Cчёт гостей",
                "Время гола",
                "Коэфициент",
                "Счёт хозяев в итоге",
                "Счёт гостей в итоге",
                "Угловые",
                "Угловые в итоге",
                "Желтые карты",
                "Желтые карты в итоге",
                "Красные карты",
                "Красные карты в итоге",
                "Удар по воротам",
                "Удар по воротам в итоге",
            ],
        });
        return sheet;
    }

    async getSheet() {
        try {
            await doc.loadInfo();
            const sheetNumber = +process.env.SHEET_NUMBER || 0;
            return doc.sheetsByIndex[sheetNumber];
        } catch (error) {
            logger.logError(error);
        }
    }

    async exportStatsToSheet(sheet, stats) {
        try {
            if (stats == null || stats.length == 0) {
                throw new Error("Stats is empty");
            }
            const rowsToAdd = stats.map((stat) => ({
                "id Матча": stat.match_id,
                Страна: stat.country,
                Лига: stat.league,
                "Начало матча": stat.start_time,
                Хозяева: stat.home_team,
                Гости: stat.away_team,
                "Время сигнала": stat.signal_time,
                "Cчёт хозяев": stat.home_score,
                "Cчёт гостей": stat.away_score,
                "Время гола": stat.goal_time,
                Коэфициент: stat.coefficient,
                "Счёт хозяев в итоге": stat.home_score_at_end,
                "Счёт гостей в итоге": stat.away_score_at_end,
                Угловые: stat.corners_at_signal,
                "Угловые в итоге": stat.corners_at_end,
                "Желтые карты": stat.yellowcards_at_signal,
                "Желтые карты в итоге": stat.yellowcards_at_end,
                "Красные карты": stat.redcards_at_signal,
                "Красные карты в итоге": stat.redcards_at_end,
                "Удар по воротам": stat.shots_on_target_at_signal,
                "Удар по воротам в итоге": stat.shots_on_target_at_end,
            }));
            const addedRows = await sheet.addRows(rowsToAdd);
            return addedRows;
        } catch (error) {
            logger.logError(error);
        }
    }

    async reExportStatsToSheet(sheet, stats) {
        try {
            if (stats == null || stats.length == 0) {
                throw new Error("Stats is empty");
            }
            const rowsToAdd = stats.map((stat) => ({
                "id Матча": stat["id Матча"],
                Страна: stat.Страна,
                Лига: stat.Лига,
                "Начало матча": stat["Начало матча"],
                Хозяева: stat.Хозяева,
                Гости: stat.Гости,
                "Время сигнала": stat["Время сигнала"],
                "Cчёт хозяев": stat["Cчёт хозяев"],
                "Cчёт гостей": stat["Cчёт гостей"],
                "Время гола": stat["Время гола"],
                Коэфициент: stat.Коэфициент,
                "Счёт хозяев в итоге": stat["Счёт хозяев в итоге"],
                "Счёт гостей в итоге": stat["Счёт гостей в итоге"],
                Угловые: stat.Угловые,
                "Угловые в итоге": stat["Угловые в итоге"],
                "Желтые карты": stat["Желтые карты"],
                "Желтые карты в итоге": stat["Желтые карты в итоге"],
                "Красные карты": stat["Красные карты"],
                "Красные карты в итоге": stat["Красные карты в итоге"],
                "Удар по воротам": stat["Удар по воротам"],
                "Удар по воротам в итоге": stat["Удар по воротам в итоге"],
            }));
            const addedRows = await sheet.addRows(rowsToAdd);
            return addedRows;
        } catch (error) {
            logger.logError(error);
        }
    }
}

module.exports = new gSheetsController();
