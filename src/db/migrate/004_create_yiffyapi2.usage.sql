CREATE TABLE `yiffyapi2`.`usage` (
	-- a unique identifier for this usage entry, completely irrelevant
	`id`          CHAR(40)      NOT NULL PRIMARY KEY,
	-- the api key used for this request, null if none
	`key`         CHAR(40)      DEFAULT NULL,
	-- the ip address this request came from
	`ip`          CHAR(15)      NOT NULL,
	-- the user agent of this request
	`user_agent`  TINYTEXT      NOT NULL,
	-- the category of this request (separated.by.dots)
	`type`        TINYTEXT      NOT NULL,
	-- the raw text of the request, e.g. [sub.example.tld] GET /path
	`raw_text`    TINYTEXT      NOT NULL,
	-- the ISO-8601 timestamp this request was made at
	`timestamp`   TINYTEXT      NOT NULL,
	-- Indexes
	INDEX         `key`         (`key`),
	INDEX         `ip`          (`ip`),
	INDEX         `user_agent`  (`user_agent`),
	INDEX         `type`        (`type`),
	-- Foreign Keys
	CONSTRAINT `fk_usage_key`   FOREIGN KEY (`key`)  REFERENCES `yiffyapi2`.`apikeys` (`id`)
);
