CREATE TABLE
    users (
        user_id VARCHAR(32) PRIMARY KEY,
        username VARCHAR(32),
        last_api_trigger BIGINT
    );

ALTER TABLE users
ADD COLUMN active BOOLEAN;

CREATE TABLE
    pending_users (
        id INTEGER AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(32)
    );

CREATE TABLE
    chats (
        chat_id VARCHAR(32) PRIMARY KEY,
        chat_name VARCHAR(64),
        user_id VARCHAR(32),
        active BOOLEAN,
        FOREIGN KEY (user_id) REFERENCES users (user_id)
    );

CREATE TABLE
    goal_await_notifications (
        id INTEGER AUTO_INCREMENT PRIMARY KEY,
        chat_id VARCHAR(32),
        match_id INTEGER,
        message_id VARCHAR(32),
        FOREIGN KEY (chat_id) REFERENCES chats (chat_id)
    );

CREATE TABLE
    admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(32),
        password VARCHAR(32)
    );

CREATE TABLE
    stats (
        match_id INT PRIMARY KEY,
        country VARCHAR(32),
        league VARCHAR(32),
        start_time VARCHAR(32),
        home_team VARCHAR(32),
        away_team VARCHAR(32),
        signal_time VARCHAR(8),
        home_score INTEGER,
        away_score INTEGER,
        goal_time VARCHAR(8),
        coefficient FLOAT,
        home_score_at_end INTEGER,
        away_score_at_end INTEGER,
        corners_at_signal INTEGER,
        corners_at_end INTEGER,
        yellowcards_at_signal INTEGER,
        yellowcards_at_end INTEGER,
        shots_on_target_at_signal INTEGER,
        shots_on_target_at_end INTEGER
    );

ALTER TABLE stats
ADD COLUMN dangerous_attacks_at_signal INTEGER,
ADD COLUMN dangerous_attacks_at_end INTEGER;

ALTER TABLE admins CHANGE COLUMN password user_password VARCHAR(32);

ALTER TABLE stats
ADD COLUMN redcards_at_signal INTEGER,
ADD COLUMN redcards_at_end INTEGER;

INSERT INTO
    `users` (
        `user_id`,
        `username`,
        `last_api_trigger`,
        `active`
    )
VALUES
    ('381311220', 'xomaxs', 1717270400, 1),
    ('483739385', 'ey4ar', 1717247087, 1),
    ('551169253', 'angelasmir', 1713897108, 1);