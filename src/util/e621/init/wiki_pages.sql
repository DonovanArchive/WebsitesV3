CREATE TABLE IF NOT EXISTS `wiki_pages` (
    `id`          INT         NOT NULL PRIMARY KEY,
    `body`        MEDIUMTEXT  NOT NULL,
    `created_at`  TINYTEXT    NOT NULL,
    `creator_id`  INT,
    `is_locked`   BOOLEAN     NOT NULL,
    `title`       TEXT        NOT NULL,
    `updated_at`  TINYTEXT,
    `updater_id`  INT
);
CREATE INDEX IF NOT EXISTS `wiki_pages.title` ON `wiki_pages` (`title`);
CREATE INDEX IF NOT EXISTS `wiki_pages.body` ON `wiki_pages` (`body`);
CREATE INDEX IF NOT EXISTS `wiki_pages.is_locked` ON `wiki_pages` (`is_locked`);
CREATE INDEX IF NOT EXISTS `wiki_pages.updater_id` ON `wiki_pages` (`updater_id`);
CREATE INDEX IF NOT EXISTS `wiki_pages.creator_id` ON `wiki_pages` (`creator_id`);
