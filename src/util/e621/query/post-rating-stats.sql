WITH safe AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "s"
),
safe_deleted AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "s" AND is_deleted = TRUE
),
safe_pending AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "s" AND is_pending = TRUE
),
questionable AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "q"
),
questionable_deleted AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "q" AND is_deleted = TRUE
),
questionable_pending AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "q" AND is_pending = TRUE
),
explicit AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "e"
),
explicit_deleted AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "e" AND is_deleted = TRUE
),
explicit_pending AS (
    SELECT COUNT(*) as count FROM posts WHERE rating = "e" AND is_pending = TRUE
),
top_id AS (
    select MAX(id) as num FROM posts
)
SELECT
    safe.count as safe,
    safe_deleted.count as safe_deleted,
    safe_pending.count as safe_pending,
    safe.count - safe_deleted.count - safe_pending.count as safe_approved,
    questionable.count as questionable,
    questionable_deleted.count as questionable_deleted,
    questionable_pending.count as questionable_pending,
    questionable.count - questionable_deleted.count - questionable_pending.count as questionable_approved,
    explicit.count as explicit,
    explicit_deleted.count as explicit_deleted,
    explicit_pending.count as explicit_pending,
    explicit.count - explicit_deleted.count - explicit_pending.count as explicit_approved,
    top_id.num as max,
    top_id.num - safe.count - questionable.count - explicit.count as destroyed
     FROM safe, safe_deleted, safe_pending, questionable, questionable_deleted, questionable_pending, explicit, explicit_deleted, explicit_pending, top_id;
