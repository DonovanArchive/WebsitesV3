import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawE621Post {
	id: number;
	uploader_id: number | null;
	created_at: string;
	md5: string | null;
	sources: string;
	rating: "s" | "q" | "e";
	width: number;
	height: number;
	tags: string;
	locked_tags: string;
	fav_count: number;
	file_ext: string;
	parent_id: number | null;
	change_seq: number;
	approver_id: number | null;
	file_size: number;
	comment_count: number;
	description: string;
	duration: number | null;
	updated_at: string | null;
	is_deleted: boolean;
	is_pending: boolean;
	is_flagged: boolean;
	score: number;
	up_score: number;
	down_score: number;
	is_rating_locked: boolean;
	is_status_locked: boolean;
	is_note_locked: boolean;
	animated: boolean;
	animated_png: boolean;
}
export type E621PostKV = DataTypes<E621Post>;
export { E621Post };

export interface GetCountOptions {
	rating?: "safe" | "questionable" | "explicit";
	deleted?: boolean;
	pending?: boolean;
	flagged?: boolean;
	ratingLocked?: boolean;
	statusLocked?: boolean;
	noteLocked?: boolean;
	approverID?: number;
	uploaderID?: number;
	sourceCount?: number;
}

export default class E621Post {
	static DB = "e621";
	static TABLE = "posts";
	id: number;
	uploaderID: number | null;
	createdAt: string;
	md5: string | null;
	sources: Array<string>;
	rating: "s" | "q" | "e";
	width: number;
	height: number;
	tags: Array<string>;
	lockedTags: Array<string>;
	favCount: number;
	fileExt: string;
	parentID: number | null;
	changeSeq: number;
	approverID: number | null;
	fileSize: number;
	commentCount: number;
	description: string;
	duration: number | null;
	updatedAt: string | null;
	isDeleted: boolean;
	isPending: boolean;
	isFlagged: boolean;
	score: number;
	upScore: number;
	downScore: number;
	isRatingLocked: boolean;
	isStatusLocked: boolean;
	isNoteLocked: boolean;
	animated: boolean;
	animatedPNG: boolean;
	constructor(data: RawE621Post) {
		this.id = data.id;
		this.uploaderID = data.uploader_id;
		this.createdAt = data.created_at;
		this.md5 = data.md5;
		this.sources = data.sources.split("\n");
		this.rating = data.rating;
		this.width = data.width;
		this.height = data.height;
		this.tags = data.tags.split(" ");
		this.lockedTags = data.locked_tags.split(" ");
		this.favCount = data.fav_count;
		this.fileExt = data.file_ext;
		this.parentID = data.parent_id;
		this.changeSeq = data.change_seq;
		this.approverID = data.approver_id;
		this.fileSize = data.file_size;
		this.commentCount = data.comment_count;
		this.description = data.description;
		this.duration = data.duration;
		this.updatedAt = data.updated_at;
		this.isDeleted = data.is_deleted;
		this.isPending = data.is_pending;
		this.isFlagged = data.is_flagged;
		this.score = data.score;
		this.upScore = data.up_score;
		this.downScore = data.down_score;
		this.isRatingLocked = data.is_rating_locked;
		this.isStatusLocked = data.is_status_locked;
		this.isNoteLocked = data.is_note_locked;
		this.animated = data.animated;
		this.animatedPNG = data.animated_png;
	}

	static async get(id: number): Promise<E621Post | null> {
		return db.query<Array<RawE621Post>>(`SELECT * FROM ${E621Post.DB}.${E621Post.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new E621Post(k[0]));
	}

	static async getOrThrow(id: number): Promise<E621Post> {
		const key = await E621Post.get(id);
		if (!key) throw new Error(`Invalid E621 Post: ${id}`);
		return key;
	}

	static async new(data: RawE621Post) {
		return db.query<UpsertResult>(`INSERT INTO ${E621Post.DB}.${E621Post.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, Object.values(data)).then(r => r.affectedRows === 1 ? data.id : null);
	}

	static async delete(id: number) {
		return db.query<UpsertResult>(`DELETE FROM ${E621Post.DB}.${E621Post.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	async delete() { return E621Post.delete(this.id); }

	static async getCount(options?: GetCountOptions): Promise<number> {
		const parts: Array<string> = [];
		options ??= {};
		if (options.rating) parts.push(`rating = '${options.rating[0]}'`);
		if (options.deleted) parts.push(`is_deleted = ${options.deleted ? "TRUE" : "FALSE"}`);
		if (options.pending) parts.push(`is_pending = ${options.pending ? "TRUE" : "FALSE"}`);
		if (options.flagged) parts.push(`is_flagged = ${options.flagged ? "TRUE" : "FALSE"}`);
		if (options.ratingLocked) parts.push(`is_rating_locked = ${options.ratingLocked ? "TRUE" : "FALSE"}`);
		if (options.statusLocked) parts.push(`is_status_locked = ${options.statusLocked ? "TRUE" : "FALSE"}`);
		if (options.noteLocked) parts.push(`is_note_locked = ${options.noteLocked ? "TRUE" : "FALSE"}`);
		if (options.approverID) parts.push(`approver_id = ${options.approverID}`);
		if (options.uploaderID) parts.push(`uploader_id = ${options.uploaderID}`);
		if (options.sourceCount) {
			if (options.sourceCount === 0) parts.push("LENGTH(sources) = 0");
			else parts.push(`ROUND ((LENGTH(sources)-LENGTH(REPLACE(sources, "\n", "")))/LENGTH("\n")) = ${options.sourceCount - 1}`);
		}

		return db.query<Array<{ "COUNT(*)": bigint; }>>(`SELECT COUNT(*) FROM ${E621Post.DB}.${E621Post.TABLE} ${parts.length > 0 ? "WHERE " + parts.join(" AND ") : ""}`).then(r => Number(r[0]["COUNT(*)"]));
	}

	static async getStats() {
		type RawStats<T extends bigint | number> = Record<"SAFE" | "QUESTIONABLE" | "EXPLICIT" | `${"DELETED" | "PENDING" | "FLAGGED" | "RATING_LOCKED" | "STATUS_LOCKED" | "NOTE_LOCKED"}${"" | "_SAFE" | "_QUESTIONABLE" | "_EXPLICIT"}` | `${"SWF" | "PNG" | "ANIMATED_PNG" | "JPEG" | "GIF" | "WEBM"}${"" | "_DELETED"}${"" | "_SAFE" | "_QUESTIONABLE" | "_EXPLICIT"}` | "HIGHEST_ID" | "TOTAL", T>;
		const {
			SAFE, QUESTIONABLE, EXPLICIT,
			DELETED, DELETED_SAFE, DELETED_QUESTIONABLE, DELETED_EXPLICIT,
			PENDING, PENDING_SAFE, PENDING_QUESTIONABLE, PENDING_EXPLICIT,
			FLAGGED, FLAGGED_SAFE, FLAGGED_QUESTIONABLE, FLAGGED_EXPLICIT,
			RATING_LOCKED, RATING_LOCKED_SAFE, RATING_LOCKED_QUESTIONABLE, RATING_LOCKED_EXPLICIT,
			STATUS_LOCKED, STATUS_LOCKED_SAFE, STATUS_LOCKED_QUESTIONABLE, STATUS_LOCKED_EXPLICIT,
			NOTE_LOCKED, NOTE_LOCKED_SAFE, NOTE_LOCKED_QUESTIONABLE, NOTE_LOCKED_EXPLICIT,
			HIGHEST_ID, TOTAL
		} = await db.query<[RawStats<bigint>]>(`
			SELECT
			(SELECT COUNT(*) FROM e621.posts WHERE rating = 's') as SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE rating = 'q') as QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE rating = 'e') as EXPLICIT,
			(SELECT COUNT(*) FROM e621.posts WHERE is_deleted = TRUE) as DELETED,
			(SELECT COUNT(*) FROM e621.posts WHERE is_deleted = TRUE AND rating = 's') as DELETED_SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_deleted = TRUE AND rating = 'q') as DELETED_QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_deleted = TRUE AND rating = 'e') as DELETED_EXPLICIT,
			(SELECT COUNT(*) FROM e621.posts WHERE is_pending = TRUE) as PENDING,
			(SELECT COUNT(*) FROM e621.posts WHERE is_pending = TRUE AND rating = 's') as PENDING_SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_pending = TRUE AND rating = 'q') as PENDING_QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_pending = TRUE AND rating = 'e') as PENDING_EXPLICIT,
			(SELECT COUNT(*) FROM e621.posts WHERE is_flagged = TRUE) as FLAGGED,
			(SELECT COUNT(*) FROM e621.posts WHERE is_flagged = TRUE AND rating = 's') as FLAGGED_SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_flagged = TRUE AND rating = 'q') as FLAGGED_QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_flagged = TRUE AND rating = 'e') as FLAGGED_EXPLICIT,
			(SELECT COUNT(*) FROM e621.posts WHERE is_rating_locked = TRUE) as RATING_LOCKED,
			(SELECT COUNT(*) FROM e621.posts WHERE is_rating_locked = TRUE AND rating = 's') as RATING_LOCKED_SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_rating_locked = TRUE AND rating = 'q') as RATING_LOCKED_QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_rating_locked = TRUE AND rating = 'e') as RATING_LOCKED_EXPLICIT,
			(SELECT COUNT(*) FROM e621.posts WHERE is_status_locked = TRUE) as STATUS_LOCKED,
			(SELECT COUNT(*) FROM e621.posts WHERE is_status_locked = TRUE AND rating = 's') as STATUS_LOCKED_SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_status_locked = TRUE AND rating = 'q') as STATUS_LOCKED_QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_status_locked = TRUE AND rating = 'e') as STATUS_LOCKED_EXPLICIT,
			(SELECT COUNT(*) FROM e621.posts WHERE is_note_locked = TRUE) as NOTE_LOCKED,
			(SELECT COUNT(*) FROM e621.posts WHERE is_note_locked = TRUE AND rating = 's') as NOTE_LOCKED_SAFE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_note_locked = TRUE AND rating = 'q') as NOTE_LOCKED_QUESTIONABLE,
			(SELECT COUNT(*) FROM e621.posts WHERE is_note_locked = TRUE AND rating = 'e') as NOTE_LOCKED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf') as SWF,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND rating = 'e') as SWF_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND rating = 'q') as SWF_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND rating = 's') as SWF_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND is_deleted = TRUE) as SWF_DELETED,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND is_deleted = TRUE AND rating = 'e') as SWF_DELETED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND is_deleted = TRUE AND rating = 'q') as SWF_DELETED_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'swf' AND is_deleted = TRUE AND rating = 's') as SWF_DELETED_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png') as PNG,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND rating = 'e') as PNG_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND rating = 'q') as PNG_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND rating = 's') as PNG_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND is_deleted = TRUE) as PNG_DELETED,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND is_deleted = TRUE AND rating = 'e') as PNG_DELETED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND is_deleted = TRUE AND rating = 'q') as PNG_DELETED_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND is_deleted = TRUE AND rating = 's') as PNG_DELETED_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true) as ANIMATED_PNG,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND rating = 'e') as ANIMATED_PNG_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND rating = 'q') as ANIMATED_PNG_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND rating = 's') as ANIMATED_PNG_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND is_deleted = TRUE) as ANIMATED_PNG_DELETED,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND is_deleted = TRUE AND rating = 'e') as ANIMATED_PNG_DELETED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND is_deleted = TRUE AND rating = 'q') as ANIMATED_PNG_DELETED_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'png' AND animated_png = true AND is_deleted = TRUE AND rating = 's') as ANIMATED_PNG_DELETED_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg') as JPEG,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND rating = 'e') as JPEG_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND rating = 'q') as JPEG_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND rating = 's') as JPEG_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND is_deleted = TRUE) as JPEG_DELETED,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND is_deleted = TRUE AND rating = 'e') as JPEG_DELETED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND is_deleted = TRUE AND rating = 'q') as JPEG_DELETED_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'jpg' AND is_deleted = TRUE AND rating = 's') as JPEG_DELETED_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif') as GIF,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND rating = 'e') as GIF_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND rating = 'q') as GIF_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND rating = 's') as GIF_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND is_deleted = TRUE) as GIF_DELETED,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND is_deleted = TRUE AND rating = 'e') as GIF_DELETED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND is_deleted = TRUE AND rating = 'q') as GIF_DELETED_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'gif' AND is_deleted = TRUE AND rating = 's') as GIF_DELETED_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm') as WEBM,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND rating = 'e') as WEBM_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND rating = 'q') as WEBM_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND rating = 's') as WEBM_SAFE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND is_deleted = TRUE) as WEBM_DELETED,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND is_deleted = TRUE AND rating = 'e') as WEBM_DELETED_EXPLICIT,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND is_deleted = TRUE AND rating = 'q') as WEBM_DELETED_QUESTIONABLE,
            (SELECT COUNT(*) FROM e621.posts WHERE file_ext = 'webm' AND is_deleted = TRUE AND rating = 's') as WEBM_DELETED_SAFE,
			(SELECT MAX(id) FROM e621.posts) as HIGHEST_ID,
			(SELECT COUNT(*) FROM e621.posts) as TOTAL
		`).then(([res]) => Object.entries(res).map(([k, v]) => ({ [k]: Number(v) })).reduce((a, b) => ({ ...a, ...b }), {}) as RawStats<number>);

		const round = (a: number, b: number) => `${Math.round(((a / b) + Number.EPSILON) * 10000) / 100}%`;
		return {
			safe:         [SAFE, round(SAFE, TOTAL)],
			questionable: [QUESTIONABLE, round(QUESTIONABLE, TOTAL)],
			explicit:     [EXPLICIT, round(EXPLICIT, TOTAL)],
			deleted:      {
				total:        [DELETED, round(DELETED, TOTAL)],
				safe:         [DELETED_SAFE, round(DELETED_SAFE, DELETED)],
				questionable: [DELETED_QUESTIONABLE, round(DELETED_QUESTIONABLE, DELETED)],
				explicit:     [DELETED_EXPLICIT, round(DELETED_EXPLICIT, DELETED)]
			},
			pending: {
				total:        [PENDING, round(PENDING, TOTAL)],
				safe:         [PENDING_SAFE, round(PENDING_SAFE, PENDING)],
				questionable: [PENDING_QUESTIONABLE, round(PENDING_QUESTIONABLE, PENDING)],
				explicit:     [PENDING_EXPLICIT, round(PENDING_EXPLICIT, PENDING)]
			},
			flagged: {
				total:        [FLAGGED, round(FLAGGED, TOTAL)],
				safe:         [FLAGGED_SAFE, round(FLAGGED_SAFE, FLAGGED)],
				questionable: [FLAGGED_QUESTIONABLE, round(FLAGGED_QUESTIONABLE, FLAGGED)],
				explicit:     [FLAGGED_EXPLICIT, round(FLAGGED_EXPLICIT, FLAGGED)]
			},
			ratingLocked: {
				total:        [RATING_LOCKED, round(RATING_LOCKED, TOTAL)],
				safe:         [RATING_LOCKED_SAFE, round(RATING_LOCKED_SAFE, RATING_LOCKED)],
				questionable: [RATING_LOCKED_QUESTIONABLE, round(RATING_LOCKED_QUESTIONABLE, RATING_LOCKED)],
				explicit:     [RATING_LOCKED_EXPLICIT, round(RATING_LOCKED_EXPLICIT, RATING_LOCKED)]
			},
			statusLocked: {
				total:        [STATUS_LOCKED, round(STATUS_LOCKED, TOTAL)],
				safe:         [STATUS_LOCKED_SAFE, round(STATUS_LOCKED_SAFE, STATUS_LOCKED)],
				questionable: [STATUS_LOCKED_QUESTIONABLE, round(STATUS_LOCKED_QUESTIONABLE, STATUS_LOCKED)],
				explicit:     [STATUS_LOCKED_EXPLICIT, round(STATUS_LOCKED_EXPLICIT, STATUS_LOCKED)]
			},
			noteLocked: {
				total:        [NOTE_LOCKED, round(NOTE_LOCKED, TOTAL)],
				safe:         [NOTE_LOCKED_SAFE, round(NOTE_LOCKED_SAFE, NOTE_LOCKED)],
				questionable: [NOTE_LOCKED_QUESTIONABLE, round(NOTE_LOCKED_QUESTIONABLE, NOTE_LOCKED)],
				explicit:     [NOTE_LOCKED_EXPLICIT, round(NOTE_LOCKED_EXPLICIT, NOTE_LOCKED)]
			},
			highestID: HIGHEST_ID,
			total:     TOTAL,
			destroyed: [HIGHEST_ID - TOTAL, round((HIGHEST_ID - TOTAL), HIGHEST_ID)]
		};
	}
}
