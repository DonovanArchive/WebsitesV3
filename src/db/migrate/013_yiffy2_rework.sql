ALTER TABLE `yiffyapi2`.`usage`
    drop type,
    ADD service TINYTEXT NOT NULL;

ALTER TABLE `yiffyapi2`.`apikeys`
    ALTER COLUMN flags SET DEFAULT 7;

UPDATE `yiffyapi2`.`apikeys` SET flags = 7 WHERE flags = 3;

alter table `yiffyapi2`.`shorturls`
    add creator_apikey char(40) null after creator_ip;
