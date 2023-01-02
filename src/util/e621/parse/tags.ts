import type { RawE621Tag } from "../../../db/Models/E621Tag";

export interface RawTag {
	id: string;
	name: string;
	category: string;
	post_count: string;
}

export function parse(record: RawTag) {
	return {
		id:         Number(record.id),
		name:       record.name,
		category:   Number(record.category),
		post_count: Number(record.post_count)
	} satisfies RawE621Tag as RawE621Tag;
}
