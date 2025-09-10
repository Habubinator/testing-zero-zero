const express = require("express");
const path = require("path");
const app = express();
const cors = require("cors");
const db = require("./database/dbController");
const bot = require("./bot");
const logger = require("./logger");

app.options("*", cors());
app.use(express.json());
app.use("/main", express.static(path.resolve(__dirname, "..", "public")));

app.use("/main/login", async (req, res) => {
    if (req.url.includes("css") || req.url.includes("js")) {
        return res.sendStatus(200);
    } else {
        return res.sendFile(
            path.resolve(__dirname, "..", "public", "html", "login-form.html")
        );
    }
});

app.use("/main/admin-panel", (req, res) => {
    if (req.url.includes("css") || req.url.includes("js")) {
        return res.sendStatus(200);
    } else {
        return res.sendFile(
            path.resolve(__dirname, "..", "public", "html", "admin-panel.html")
        );
    }
});

app.post("/main/api/login", async (req, res) => {
    const { login, password } = req.body;
    if (login && password) {
        const data = await db.getAdminByLogin(login);
        if (data && login === data.login && password === data.user_password) {
            return res.sendStatus(200);
        } else {
            return res.status(400).send("Invalid login credentials.");
        }
    } else {
        return res.sendStatus(400).send("No login credentials");
    }
});

app.get("/main/api/getSettings", async (req, res) => {
    try {
        const data = await db.getUsersWithChats();
        const pendingUsers = await db.getAllPendingUsers();
        for (const user of pendingUsers) {
            data.push({ user_id: "", username: user.username });
        }
        return res.send(data);
    } catch (error) {
        logger.logError(error);
        return res.sendStatus(500);
    }
});

app.post("/main/api/addUser", async (req, res) => {
    const { username } = req.body;
    try {
        if (username) {
            await db.createPendingUser(username);
            return res.sendStatus(200);
        } else {
            return res.sendStatus(400);
        }
    } catch (error) {
        logger.logError(error);
        return res.sendStatus(500);
    }
});

app.delete("/main/api/deleteUser", async (req, res) => {
    const { username } = req.body;
    const userFromUserList = await db.getUserByUsername(username);
    if (userFromUserList) {
        await db.deleteUser(userFromUserList.user_id);
        return res.sendStatus(200);
    } else {
        const userFromPending = await db.getPendingUserByUsername(username);
        if (userFromPending) {
            await db.deletePendingUserByUsername(username);
            return res.sendStatus(200);
        }
    }
    return res.sendStatus(400);
});

app.post("/main/api/messageOneChat", async (req, res) => {
    const { chat_id, message } = req.body;
    try {
        if (chat_id && message) {
            await bot.bot.sendMessage(chat_id, message, {
                parse_mode: "HTML",
            });
            return res.sendStatus(200);
        }
        return res.sendStatus(400);
    } catch (error) {
        logger.logError(error);
        return res.sendStatus(500);
    }
});

app.post("/main/api/messageOneUser", async (req, res) => {
    const { user_id, message } = req.body;
    try {
        if (user_id && message) {
            const chats = await db.getChatsByUserId(user_id);
            for (const chat of chats) {
                await bot.bot.sendMessage(chat.chat_id, message, {
                    parse_mode: "HTML",
                });
            }
            return res.sendStatus(200);
        }
        return res.sendStatus(400);
    } catch (error) {
        logger.logError(error);
        return res.sendStatus(500);
    }
});

app.post("/main/api/messageAll", async (req, res) => {
    const { message } = req.body;
    try {
        if (message) {
            const chats = await db.getAllChats();
            for (const chat of chats) {
                await bot.bot.sendMessage(chat.chat_id, message, {
                    parse_mode: "HTML",
                });
            }
            return res.sendStatus(200);
        }
        return res.sendStatus(400);
    } catch (error) {
        logger.logError(error);
        return res.sendStatus(500);
    }
});

app.post("/main/api/turnOff", (req, res) => {
    process.exit(0);
});

app.listen(process.env.LOCAL_APP_SERVER_PORT || 5000);

module.exports = app;