CREATE TABLE `e621`.`tag_implications` (
    `id`               INT       NOT NULL PRIMARY KEY,
    `antecedent_name`  TINYTEXT  NOT NULL,
    `consequent_name`  TINYTEXT  NOT NULL,
    `created_at`       TINYTEXT,
    `status`           TINYTEXT  NOT NULL,
	-- Indexes
	INDEX              `antecedent_name` (`antecedent_name`),
	INDEX              `consequent_name` (`consequent_name`),
	INDEX              `status`          (`status`)
)
