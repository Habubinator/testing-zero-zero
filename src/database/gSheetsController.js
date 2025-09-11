require("dotenv").config();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const logger = require("./../logger");

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

class gSheetsController {
    // ===== ORIGINAL METHODS =====

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
                "Коэффициент",
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

    // Get the main document object
    async getDocument() {
        try {
            await doc.loadInfo();
            return doc;
        } catch (error) {
            logger.logError(error);
            return null;
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
                Коэффициент: stat.coefficient,
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

    // ===== PATTERN MATCH METHODS =====

    // Get or create the "aisoccer 0:0" sheet
    async getPatternSheet() {
        try {
            await doc.loadInfo();

            // Try to find existing sheet
            let sheet = doc.sheetsByTitle['AiSoccer 0:0'];

            if (!sheet) {
                console.log('Creating new "aisoccer 0:0" sheet...');
                sheet = await doc.addSheet({
                    title: 'aisoccer 0:0',
                    headerValues: [
                        'ID матча',
                        'Страна',
                        'Лига',
                        'Начало матча',
                        'Команда 1',
                        'Команда 2',
                        'Финальный счет команда 1',
                        'Финальный счет команда 2',
                        'Угловые',
                        'Желтые карты',
                        'Красные карты',
                        'Паттерн триггер'
                    ]
                });
                console.log('✅ "aisoccer 0:0" sheet created successfully');
            }

            return sheet;
        } catch (error) {
            logger.logError(error, 'Error getting/creating aisoccer 0:0 sheet');
            return null;
        }
    }

    // Export pattern match data to the "aisoccer 0:0" sheet
    async exportPatternStats(stats) {
        try {
            if (!stats || stats.length === 0) {
                console.log('No pattern stats to export');
                return;
            }

            const sheet = await this.getPatternSheet();
            if (!sheet) {
                throw new Error('Could not get/create aisoccer 0:0 sheet');
            }

            const rowsToAdd = stats.map((stat) => ({
                'ID матча': stat.match_id,
                'Страна': stat.country,
                'Лига': stat.league,
                'Начало матча': stat.start_time,
                'Команда 1': stat.home_team,
                'Команда 2': stat.away_team,
                'Финальный счет команда 1': stat.home_score_final,
                'Финальный счет команда 2': stat.away_score_final,
                'Угловые': stat.corners_total,
                'Желтые карты': stat.yellowcards_total,
                'Красные карты': stat.redcards_total,
                'Паттерн триггер': stat.pattern_trigger
            }));

            await sheet.addRows(rowsToAdd);
            console.log(`📊 Exported ${stats.length} pattern matches to Google Sheets`);

            return true;
        } catch (error) {
            logger.logError(error, 'Error exporting pattern stats');
            return false;
        }
    }

    // Export single match result
    async exportSingleMatchResult(matchData) {
        try {
            const sheet = await this.getPatternSheet();
            if (!sheet) {
                throw new Error('Could not get/create aisoccer 0:0 sheet');
            }

            const rowData = {
                'ID матча': matchData.match_id,
                'Страна': matchData.country,
                'Лига': matchData.league,
                'Начало матча': matchData.start_time,
                'Команда 1': matchData.home_team,
                'Команда 2': matchData.away_team,
                'Финальный счет команда 1': matchData.home_score_final,
                'Финальный счет команда 2': matchData.away_score_final,
                'Угловые': matchData.corners_total,
                'Желтые карты': matchData.yellowcards_total,
                'Красные карты': matchData.redcards_total,
                'Паттерн триггер': matchData.pattern_trigger
            };

            await sheet.addRow(rowData);
            console.log(`📊 Exported single match ${matchData.match_id} to Google Sheets`);

            return true;
        } catch (error) {
            logger.logError(error, 'Error exporting single match');
            return false;
        }
    }

    // Get all data from aisoccer 0:0 sheet
    async getPatternData() {
        try {
            const sheet = await this.getPatternSheet();
            if (!sheet) {
                return [];
            }

            const rows = await sheet.getRows();
            return rows.map(row => row.toObject());
        } catch (error) {
            logger.logError(error, 'Error getting pattern data');
            return [];
        }
    }

    // Clear all data from aisoccer 0:0 sheet (for testing purposes)
    async clearPatternSheet() {
        try {
            const sheet = await this.getPatternSheet();
            if (!sheet) {
                return false;
            }

            const rows = await sheet.getRows();
            if (rows.length > 0) {
                await sheet.delete();
                // Recreate the sheet
                await this.getPatternSheet();
                console.log('🧹 Cleared and recreated aisoccer 0:0 sheet');
            }

            return true;
        } catch (error) {
            logger.logError(error, 'Error clearing pattern sheet');
            return false;
        }
    }

    // ===== LEGACY METHODS FOR BACKWARD COMPATIBILITY =====

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
                Коэффициент: stat.Коэффициент,
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