CREATE TABLE IF NOT EXISTS `posts` (
    `id`                INT         NOT NULL PRIMARY KEY,
    `animated_png`      BOOLEAN     NOT NULL DEFAULT FALSE,
    `animated`          BOOLEAN     NOT NULL DEFAULT FALSE,
    `approver_id`       INT,
    `change_seq`        INT         NOT NULL,
    `comment_count`     INT         NOT NULL,
    `created_at`        TINYTEXT    NOT NULL,
    `description`       MEDIUMTEXT,
    `down_score`        INT         NOT NULL,
    `duration`          INT,
    `fav_count`         INT         NOT NULL,
    `file_ext`          TINYTEXT    NOT NULL,
    `file_size`         INT         NOT NULL,
    `height`            INT         NOT NULL,
    `is_deleted`        BOOLEAN     NOT NULL,
    `is_flagged`        BOOLEAN     NOT NULL,
    `is_note_locked`    BOOLEAN     NOT NULL,
    `is_pending`        BOOLEAN     NOT NULL,
    `is_rating_locked`  BOOLEAN     NOT NULL,
    `is_status_locked`  BOOLEAN     NOT NULL,
    `locked_tags`       TEXT,
    `md5`               CHAR(32),
    `parent_id`         INT,
    `rating`            CHAR(1)     NOT NULL,
    `score`             INT         NOT NULL,
    `sources`           MEDIUMTEXT  NOT NULL,
    `tags`              TEXT        NOT NULL,
    `up_score`          INT         NOT NULL,
    `updated_at`        TINYTEXT,
    `uploader_id`       INT,
    `width`             INT         NOT NULL
);
CREATE INDEX IF NOT EXISTS `posts.rating` ON `posts` (`rating`);
CREATE INDEX IF NOT EXISTS `posts.is_deleted` ON `posts` (`is_deleted`);
CREATE INDEX IF NOT EXISTS `posts.is_deleted.rating` ON `posts` (`is_deleted`, `rating`);
CREATE INDEX IF NOT EXISTS `posts.is_pending` ON `posts` (`is_pending`);
CREATE INDEX IF NOT EXISTS `posts.is_pending.rating` ON `posts` (`is_pending`, `rating`);
CREATE INDEX IF NOT EXISTS `posts.is_flagged` ON `posts` (`is_flagged`);
CREATE INDEX IF NOT EXISTS `posts.is_rating_locked` ON `posts` (`is_rating_locked`);
CREATE INDEX IF NOT EXISTS `posts.is_status_locked` ON `posts` (`is_status_locked`);
CREATE INDEX IF NOT EXISTS `posts.is_note_locked` ON `posts` (`is_note_locked`);
CREATE INDEX IF NOT EXISTS `posts.approver_id` ON `posts` (`approver_id`);
CREATE INDEX IF NOT EXISTS `posts.uploader_id` ON `posts` (`uploader_id`);
CREATE INDEX IF NOT EXISTS `posts.file_ext` ON `posts` (`file_ext`);
CREATE INDEX IF NOT EXISTS `posts.animated` ON `posts` (`animated`);
CREATE INDEX IF NOT EXISTS `posts.animated_png` ON `posts` (`animated_png`);
