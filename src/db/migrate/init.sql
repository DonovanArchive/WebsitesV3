CREATE DATABASE `yiffyapi2`;
CREATE TABLE `yiffyapi2`.`apikeys` (
	`id`               CHAR(40)  NOT NULL PRIMARY KEY,
	`unlimited`        BOOLEAN   NOT NULL DEFAULT FALSE,
	`active`           BOOLEAN   NOT NULL DEFAULT TRUE,
	`disabled`         BOOLEAN   NOT NULL DEFAULT FALSE,
	`disabled_reason`  TINYTEXT  NULL,
	`application`      TINYTEXT  NOT NULL,
	`owner`            CHAR(21)  NOT NULL,
	`contact`          TINYTEXT  NULL,
	`window_long`      SMALLINT  UNSIGNED NOT NULL DEFAULT 10000,
	`limit_long`       SMALLINT  UNSIGNED NOT NULL DEFAULT 12,
	`window_short`     SMALLINT  UNSIGNED NOT NULL DEFAULT 2000,
	`limit_short`      SMALLINT  UNSIGNED NOT NULL DEFAULT 4,
	UNIQUE INDEX       `id`      (`id`),
	INDEX              `owner`   (`owner`)
);

CREATE TABLE `yiffyapi2`.`images` (
	-- the md5 sum of the image
	`id`            CHAR(32)            NOT NULL PRIMARY KEY,
	`artists`       TINYTEXT            NOT NULL,
	`sources`       TEXT                NOT NULL,
	`width`         SMALLINT UNSIGNED   NOT NULL,
	`height`        SMALLINT UNSIGNED   NOT NULL,
	`type`          TINYTEXT            NOT NULL,
	`category`      TINYTEXT            NOT NULL,
	`added_at`      TINYTEXT            NOT NULL,
	`added_by`      TINYTEXT            NOT NULL,
	`original_url`  TINYTEXT            DEFAULT NULL,
	`ext`           TINYTEXT            NOT NULL,
	`size`          INT UNSIGNED        NOT NULL,
	`cf_id`         CHAR(36)            NULL,
	-- Indexes
	UNIQUE INDEX    `id`                (`id`),
	INDEX           `category`          (`category`)
);

CREATE TABLE `yiffyapi2`.`shorturls` (
	-- the code for this short url
	`code`             VARCHAR(50)  NOT NULL PRIMARY KEY,
	`created_at`       TINYTEXT     NOT NULL,
	`modified_at`      TINYTEXT     NULL,
	`creator_ua`       TINYTEXT     NOT NULL,
	`creator_ip`       TINYTEXT     NOT NULL,
	`creator_name`     TINYTEXT     NOT NULL,
	`management_code`  TINYTEXT     NULL,
	`url`              TEXT         NOT NULL,
	`pos`              MEDIUMINT    NOT NULL AUTO_INCREMENT,
	UNIQUE INDEX    `code`          (`code`),
	INDEX           `url`           (`url`),
	UNIQUE INDEX    `pos`           (`pos`)
);

CREATE TABLE `yiffyapi2`.`usage` (
	`id`          BIGINT        NOT NULL PRIMARY KEY AUTO_INCREMENT,
	`key`         CHAR(40)      DEFAULT NULL,
	`ip`          CHAR(15)      NOT NULL,
	`user_agent`  TINYTEXT      NOT NULL,
	`type`        TINYTEXT      NOT NULL,
	`method`      TINYTEXT      NOT NULL,
	`path`        TINYTEXT      NOT NULL,
	`timestamp`   TIMESTAMP(3)  DEFAULT CURRENT_TIMESTAMP(3),
	UNIQUE INDEX  `id`          (`id`),
	INDEX         `key`         (`key`),
	INDEX         `ip`          (`ip`),
	INDEX         `user_agent`  (`user_agent`),
	INDEX         `type`        (`type`),
	CONSTRAINT `fk_usage_key`   FOREIGN KEY (`key`)  REFERENCES `yiffyapi2`.`apikeys` (`id`)
);

CREATE DATABASE `websites3`;
CREATE TABLE `websites3`.`usage` (
	`id`             BIGINT        NOT NULL PRIMARY KEY AUTO_INCREMENT,
	`ip`             CHAR(15)      NOT NULL,
	`user_agent`     TINYTEXT      NULL,
	`authorization`  TINYTEXT      NULL,
	`raw_headers`    MEDIUMTEXT    NOT NULL DEFAULT '[]',
	`method`         TINYTEXT      NOT NULL,
	`path`           TINYTEXT      NOT NULL,
	`domain`         TINYTEXT      NOT NULL,
	`timestamp`      TIMESTAMP(3)  DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
	UNIQUE INDEX     `id`        (`id`),
	INDEX            `ip`        (`ip`),
	INDEX            `user_agent`(`user_agent`),
	INDEX            `method`    (`method`),
	INDEX            `path`      (`path`),
	INDEX            `domain`    (`domain`)
);
