CREATE TABLE `e621`.`webhooks` (
    `id`            INT       NOT NULL PRIMARY KEY AUTO_INCREMENT,
    `guild_id`      TINYTEXT  NOT NULL,
    `channel_id`    TINYTEXT  NOT NULL,
    `webhook_id`    TINYTEXT  NOT NULL,
    `webhook_token` TINYTEXT  NOT NULL,
    `creator_id`    TINYTEXT
)
