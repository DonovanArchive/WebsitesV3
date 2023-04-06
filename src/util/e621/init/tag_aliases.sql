CREATE TABLE IF NOT EXISTS `tag_aliases` (
    `id`               INT       NOT NULL PRIMARY KEY,
    `antecedent_name`  TINYTEXT  NOT NULL,
    `consequent_name`  TINYTEXT  NOT NULL,
    `created_at`       TINYTEXT,
    `status`           TINYTEXT  NOT NULL
);
CREATE INDEX IF NOT EXISTS `tag_aliases.antecedent_name` ON `tag_aliases` (`antecedent_name`);
CREATE INDEX IF NOT EXISTS `tag_aliases.consequent_name` ON `tag_aliases` (`consequent_name`);
CREATE INDEX IF NOT EXISTS `tag_aliases.status` ON `tag_aliases` (`status`);
