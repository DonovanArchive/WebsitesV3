CREATE TABLE `e621`.`status` (
    `id`          INT       NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `status`      INT       NOT NULL,
    `since`       TINYTEXT  NOT NULL,
	-- Indexes
	INDEX         `status`  (`status`)
)
