CREATE TABLE `websites3`.`usage` (
	-- a unique identifier for this usage entry, completely irrelevant
	`id`             CHAR(40)    NOT NULL PRIMARY KEY,
	-- the ip address this request came from
	`ip`             CHAR(15)    NOT NULL,
	-- the user agent of this request, if presemt
	`user_agent`     TINYTEXT    NULL,
	-- the authorization of this request, if present
	`authorization`  TINYTEXT    NULL,
	-- the raw headers of this request
	`raw_headers`    MEDIUMTEXT  NOT NULL DEFAULT '[]',
	-- the uppercase method of this request
	`method`         TINYTEXT    NOT NULL,
	-- the path of this request
	`path`           TINYTEXT    NOT NULL,
	-- the domain of this request
	`domain`         TINYTEXT    NOT NULL,
	-- the ISO-8601 timestamp this request was made at
	`timestamp`   TINYTEXT      NOT NULL,
	-- Indexes
	UNIQUE INDEX     `id`        (`id`),
	INDEX            `ip`        (`ip`),
	INDEX            `user_agent`(`user_agent`),
	INDEX            `method`    (`method`),
	INDEX            `path`      (`path`),
	INDEX            `domain`    (`domain`)
);
