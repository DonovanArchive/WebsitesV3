-- YiffyAPI V2 is in the process of being deprecated so this structure should
-- never change, as all current content is not being modified, and no new
-- content is being added
CREATE TABLE `yiffyapi2`.`images` (
	-- the md5 sum of the image
	`id`            CHAR(32)            NOT NULL PRIMARY KEY,
	-- comma separated list of artists
	`artists`       TINYTEXT            NOT NULL,
	-- comma separated list of sources
	`sources`       TEXT                NOT NULL,
	-- the width of the image
	`width`         SMALLINT UNSIGNED   NOT NULL,
	-- the height of the image
	`height`        SMALLINT UNSIGNED   NOT NULL,
	-- the mime type of the image
	`type`          TINYTEXT            NOT NULL,
	-- the category of the image
	`category`      TINYTEXT            NOT NULL,
	-- the date the image was added
	`added_at`      TINYTEXT            NOT NULL,
	-- the user this image was added by
	`added_by`      TINYTEXT            NOT NULL,
	-- the original url of this image
	`original_url`  TINYTEXT            DEFAULT NULL,
	-- the file extension for this image
	`ext`           TINYTEXT            NOT NULL,
	-- the filesize of this image
	`size`          INT UNSIGNED        NOT NULL,
	-- the cloudflare images id of this image
	`cf_id`         CHAR(36)            NULL,
	-- Indexes
	UNIQUE INDEX    `id`                (`id`),
	INDEX           `category`          (`category`)
);
