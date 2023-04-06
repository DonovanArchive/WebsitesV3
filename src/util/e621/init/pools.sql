CREATE TABLE IF NOT EXISTS `pools` (
    `id`                INT         NOT NULL PRIMARY KEY,
    `category`          TINYTEXT NOT NULL,
    `created_at`        TINYTEXT    NOT NULL,
    `creator_id`        INT,
    `description`       MEDIUMTEXT,
    `is_active`         BOOLEAN     NOT NULL,
    `name`              TINYTEXT    NOT NULL,
    `post_ids`          TEXT        NOT NULL,
    `updated_at`        TINYTEXT,
    `updater_id`        INT
);
CREATE INDEX IF NOT EXISTS `pools.category` ON `pools` (`category`);
CREATE INDEX IF NOT EXISTS `pools.is_deleted` ON `pools` (`is_deleted`);
CREATE INDEX IF NOT EXISTS `pools.is_active` ON `pools` (`is_active`);
CREATE INDEX IF NOT EXISTS `pools.updater_id` ON `pools` (`updater_id`);
