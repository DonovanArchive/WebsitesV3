CREATE TABLE IF NOT EXISTS `tags` (
    `id`          INT       NOT NULL PRIMARY KEY,
    `category`    INT       NOT NULL,
    `name`        TINYTEXT  NOT NULL,
    `post_count`  INT       NOT NULL
);
CREATE INDEX IF NOT EXISTS `tags.name` ON `tags` (`name`);
CREATE INDEX IF NOT EXISTS `tags.category` ON `tags` (`category`);
CREATE INDEX IF NOT EXISTS `tags.post_count` ON `tags` (`post_count`);
