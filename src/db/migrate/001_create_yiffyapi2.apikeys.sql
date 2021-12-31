CREATE TABLE `yiffyapi2`.`apikeys` (
	-- api key
	`id`               CHAR(40)  NOT NULL PRIMARY KEY,
	-- if the key has no ratelimits
	`unlimited`        BOOLEAN   NOT NULL DEFAULT FALSE,
	-- if the key is active (user editable)
	`active`           BOOLEAN   NOT NULL DEFAULT TRUE,
	-- if the key has been disabled by an administrator
	`disabled`         BOOLEAN   NOT NULL DEFAULT FALSE,
	-- the reason for the key being disabled
	`disabled_reason`  TINYTEXT  NULL,
	-- the name of the application
	`application`      TINYTEXT  NOT NULL,
	-- the discord id of the owner of the application
	`owner`            CHAR(21)  NOT NULL,
	-- the contact method for the application developer
	`contact`          TINYTEXT  NULL,
	-- Indexes
	UNIQUE INDEX       `id`      (`id`),
	INDEX              `owner`   (`owner`)
);
