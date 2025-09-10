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

CREATE TABLE
    IF NOT EXISTS `notifications` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `chat_id` VARCHAR(255) NOT NULL,
        `match_id` INT NOT NULL,
        `message_id` VARCHAR(255) NOT NULL,
        `patterns` TEXT, -- JSON string of detected patterns
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_match_id` (`match_id`),
        INDEX `idx_chat_id` (`chat_id`)
    );

-- Table for tracking processed matches to avoid duplicates
CREATE TABLE
    IF NOT EXISTS `processed_matches` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `match_id` INT UNIQUE NOT NULL,
        `patterns` TEXT, -- JSON string of patterns that triggered the signal
        `processed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `status` ENUM ('signal_sent', 'completed') DEFAULT 'signal_sent',
        `completed_at` TIMESTAMP NULL,
        INDEX `idx_match_id` (`match_id`),
        INDEX `idx_status` (`status`)
    );

-- Table for storing 0:0 pattern match statistics (for Google Sheets export)
CREATE TABLE
    IF NOT EXISTS `match_stats` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `match_id` INT UNIQUE NOT NULL,
        `country` VARCHAR(255),
        `league` VARCHAR(255),
        `start_time` VARCHAR(255),
        `home_team` VARCHAR(255),
        `away_team` VARCHAR(255),
        `home_score_final` INT DEFAULT 0,
        `away_score_final` INT DEFAULT 0,
        `corners_total` INT DEFAULT 0,
        `yellowcards_total` INT DEFAULT 0,
        `redcards_total` INT DEFAULT 0,
        `pattern_trigger` TEXT, -- Description of the pattern that triggered the signal
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX `idx_match_id` (`match_id`),
        INDEX `idx_created_at` (`created_at`)
    );

-- Add indexes to existing tables for better performance
ALTER TABLE `chats` ADD INDEX IF NOT EXISTS `idx_user_id` (`user_id`);

ALTER TABLE `chats` ADD INDEX IF NOT EXISTS `idx_active` (`active`);

-- Verify tables were created correctly
SHOW TABLES LIKE 'notifications';

SHOW TABLES LIKE 'processed_matches';

SHOW TABLES LIKE 'match_stats';

DESCRIBE notifications;

DESCRIBE processed_matches;

DESCRIBE match_stats;