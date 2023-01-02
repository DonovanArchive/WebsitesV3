import type { RawE621Post } from "../../../db/Models/E621Post";

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

export function parse(record: RawPost) {
	return {
		id:               Number(record.id),
		uploader_id:      record.uploader_id === "" ? null : Number(record.uploader_id),
		created_at:       new Date(record.created_at).toISOString(),
		md5:              record.md5 === "" ? null : record.md5,
		sources:          record.source.replace(/\r\n/g, "\n"),
		rating:           record.rating,
		width:            Number(record.image_width),
		height:           Number(record.image_height),
		tags:             record.tag_string,
		locked_tags:      record.locked_tags,
		fav_count:        Number(record.fav_count),
		file_ext:         record.file_ext,
		parent_id:        record.parent_id === "" ? null : Number(record.parent_id),
		change_seq:       Number(record.change_seq),
		approver_id:      record.approver_id === "" ? null : Number(record.approver_id),
		file_size:        Number(record.file_size),
		comment_count:    Number(record.comment_count),
		description:      record.description.replace(/\r\n/g, "\n"),
		duration:         record.duration === "" ? null : Number(record.duration),
		updated_at:       record.updated_at === "" ? null : new Date(record.updated_at).toISOString(),
		is_deleted:       record.is_deleted === "t",
		is_pending:       record.is_pending === "t",
		is_flagged:       record.is_flagged === "t",
		score:            Number(record.score),
		up_score:         Number(record.up_score),
		down_score:       Number(record.down_score),
		is_rating_locked: record.is_rating_locked === "t",
		is_status_locked: record.is_status_locked === "t",
		is_note_locked:   record.is_note_locked === "t",
		animated:         record.tag_string.split(" ").some(tag => tag === "animated"),
		animated_png:     record.tag_string.split(" ").some(tag => tag === "animated_png") && record.file_ext === "png"
	} satisfies RawE621Post as RawE621Post;
}
