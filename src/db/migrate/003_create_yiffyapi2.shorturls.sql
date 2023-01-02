CREATE TABLE `yiffyapi2`.`shorturls` (
	-- the code for this short url
	`code`             VARCHAR(50)  NOT NULL PRIMARY KEY,
	-- the date at which this short url was created
	`created_at`       TINYTEXT     NOT NULL,
	-- the date at which this short url last modified
	`modified_at`      TINYTEXT     NULL,
	-- the user agent in use when this short url was created
	`creator_ua`       TINYTEXT     NOT NULL,
	-- the ip this short url was created from
	`creator_ip`       TINYTEXT     NOT NULL,
	-- the name (credit) for this short url
	`creator_name`     TINYTEXT     NOT NULL,
	-- the code for editing this url
	`management_code`  TINYTEXT     NULL,
	-- the destination for this shorturl
	`url`              TEXT    NOT NULL,
	-- the position of this shorturl
	`pos`              MEDIUMINT    NOT NULL AUTO_INCREMENT,
	-- Indexes
	INDEX           `url`           (`url`),
	UNIQUE INDEX    `pos`           (`pos`)
);
