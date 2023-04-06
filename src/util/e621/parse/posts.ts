type TF = "t" | "f";
export interface RawPost {
	id: string;
	uploader_id: string;
	created_at: string;
	md5: string | null;
	source: string;
	rating: "s" | "q" | "e";
	image_width: string;
	image_height: string;
	tag_string: string;
	locked_tags: string;
	fav_count: string;
	file_ext: string;
	parent_id: string;
	change_seq: string;
	approver_id: string;
	file_size: string;
	comment_count: string;
	description: string;
	duration: string;
	updated_at: string;
	is_deleted: TF;
	is_pending: TF;
	is_flagged: TF;
	score: string;
	up_score: string;
	down_score: string;
	is_rating_locked: TF;
	is_status_locked: TF;
	is_note_locked: TF;
}

export function parse(record: RawPost): PostData {
	return {
		animated_png:     record.tag_string.split(" ").some(tag => tag === "animated_png") && record.file_ext === "png",
		animated:         record.tag_string.split(" ").some(tag => tag === "animated"),
		approver_id:      record.approver_id === "" ? null : Number(record.approver_id),
		change_seq:       Number(record.change_seq),
		comment_count:    Number(record.comment_count),
		created_at:       new Date(record.created_at).toISOString(),
		description:      record.description.replace(/\r\n/g, "\n"),
		down_score:       Number(record.down_score),
		duration:         record.duration === "" ? null : Number(record.duration),
		fav_count:        Number(record.fav_count),
		file_ext:         record.file_ext,
		file_size:        Number(record.file_size),
		height:           Number(record.image_height),
		id:               Number(record.id),
		is_deleted:       record.is_deleted === "t",
		is_flagged:       record.is_flagged === "t",
		is_note_locked:   record.is_note_locked === "t",
		is_pending:       record.is_pending === "t",
		is_rating_locked: record.is_rating_locked === "t",
		is_status_locked: record.is_status_locked === "t",
		locked_tags:      record.locked_tags,
		md5:              record.md5 === "" ? null : record.md5,
		parent_id:        record.parent_id === "" ? null : Number(record.parent_id),
		rating:           record.rating,
		score:            Number(record.score),
		sources:          record.source.replace(/\r\n/g, "\n"),
		tags:             record.tag_string,
		up_score:         Number(record.up_score),
		updated_at:       record.updated_at === "" ? null : new Date(record.updated_at).toISOString(),
		uploader_id:      record.uploader_id === "" ? null : Number(record.uploader_id),
		width:            Number(record.image_width)
	};
}

export interface PostData {
	animated_png: boolean;
	animated: boolean;
	approver_id: number | null;
	change_seq: number;
	comment_count: number;
	created_at: string;
	description: string;
	down_score: number;
	duration: number | null;
	fav_count: number;
	file_ext: string;
	file_size: number;
	height: number;
	id: number;
	is_deleted: boolean;
	is_flagged: boolean;
	is_note_locked: boolean;
	is_pending: boolean;
	is_rating_locked: boolean;
	is_status_locked: boolean;
	locked_tags: string;
	md5: string | null;
	parent_id: number | null;
	rating: "s" | "q" | "e";
	score: number;
	sources: string;
	tags: string;
	up_score: number;
	updated_at: string | null;
	uploader_id: number | null;
	width: number;
}

export default class Post {
	animated_png: boolean;
	animated: boolean;
	approver_id: number | null;
	change_seq: number;
	comment_count: number;
	created_at: Date;
	description: string;
	down_score: number;
	duration: number | null;
	fav_count: number;
	file_ext: string;
	file_size: number;
	height: number;
	id: number;
	is_deleted: boolean;
	is_flagged: boolean;
	is_note_locked: boolean;
	is_pending: boolean;
	is_rating_locked: boolean;
	is_status_locked: boolean;
	locked_tags: string;
	md5: string | null;
	parent_id: number | null;
	rating: "s" | "q" | "e";
	score: number;
	sources: Array<string>;
	tags: string;
	up_score: number;
	updated_at: Date | null;
	uploader_id: number | null;
	width: number;
	constructor(data: PostData) {
		this.animated_png = data.animated_png;
		this.animated = data.animated;
		this.approver_id = data.approver_id;
		this.change_seq = data.change_seq;
		this.comment_count = data.comment_count;
		this.created_at = new Date(data.created_at);
		this.description = data.description;
		this.down_score = data.down_score;
		this.duration = data.duration;
		this.fav_count = data.fav_count;
		this.file_ext = data.file_ext;
		this.file_size = data.file_size;
		this.height = data.height;
		this.id = data.id;
		this.is_deleted = data.is_deleted;
		this.is_flagged = data.is_flagged;
		this.is_note_locked = data.is_note_locked;
		this.is_pending = data.is_pending;
		this.is_rating_locked = data.is_rating_locked;
		this.is_status_locked = data.is_status_locked;
		this.locked_tags = data.locked_tags;
		this.md5 = data.md5;
		this.parent_id = data.parent_id;
		this.rating = data.rating;
		this.score = data.score;
		this.sources = data.sources.split("\n");
		this.tags = data.tags;
		this.up_score = data.up_score;
		this.updated_at = data.updated_at === null ? null : new Date(data.updated_at);
		this.uploader_id = data.uploader_id;
		this.width = data.width;
	}
}
