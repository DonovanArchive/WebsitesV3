ALTER TABLE `yiffyapi2`.`usage`
    drop type,
    ADD service TINYTEXT NOT NULL;

ALTER TABLE `yiffyapi2`.`apikeys`
    ALTER COLUMN flags SET DEFAULT 7;

UPDATE `yiffyapi2`.`apikeys` SET flags = 7 WHERE flags = 3;
