CREATE TABLE `e621`.`tags` (
    `id`          INT       NOT NULL PRIMARY KEY,
    `name`        TINYTEXT  NOT NULL,
    `category`    INT       NOT NULL,
    `post_count`  INT       NOT NULL,
	-- Indexes
	INDEX              `name`       (`name`),
	INDEX              `category`   (`category`),
	INDEX              `post_count` (`post_count`)
)
