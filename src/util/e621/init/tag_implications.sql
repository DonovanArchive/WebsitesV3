CREATE TABLE IF NOT EXISTS `tag_implications` (
    `id`               INT       NOT NULL PRIMARY KEY,
    `antecedent_name`  TINYTEXT  NOT NULL,
    `consequent_name`  TINYTEXT  NOT NULL,
    `created_at`       TINYTEXT,
    `status`           TINYTEXT  NOT NULL
);
CREATE INDEX IF NOT EXISTS `tag_implications.antecedent_name` ON `tag_implications` (`antecedent_name`);
CREATE INDEX IF NOT EXISTS `tag_implications.consequent_name` ON `tag_implications` (`consequent_name`);
CREATE INDEX IF NOT EXISTS `tag_implications.status` ON `tag_implications` (`status`);
