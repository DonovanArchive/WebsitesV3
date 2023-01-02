CREATE TABLE `e621`.`wiki_pages` (
    `id`          INT         NOT NULL PRIMARY KEY,
    `title`       TEXT        NOT NULL,
    `body`        MEDIUMTEXT  NOT NULL,
    `created_at`  TINYTEXT    NOT NULL,
    `updated_at`  TINYTEXT,
    `is_locked`   BOOLEAN     NOT NULL,
    `updater_id`  INT,
    `creator_id`  INT,
	-- Indexes
	INDEX              `title`      (`title`),
	INDEX              `body`       (`body`),
	INDEX              `is_locked`  (`is_locked`),
	INDEX              `updater_id` (`updater_id`),
	INDEX              `creator_id` (`creator_id`)
)
