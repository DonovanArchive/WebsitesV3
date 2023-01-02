import type { RawE621WikiPage } from "../../../db/Models/E621WikiPage";

type TF = "t" | "f";
export interface RawWikiPage {
	id: string;
	created_at: string;
	updated_at: string;
	title: string;
	body: string;
	creator_id: string;
	updater_id: string;
	is_locked: TF;
}

export function parse(record: RawWikiPage) {
	return {
		id:         Number(record.id),
		created_at: new Date(record.created_at).toISOString(),
		updated_at: record.updated_at === "" ? null : new Date(record.updated_at).toISOString(),
		title:      record.title,
		body:       record.body.replace(/\r\n/g, "\n"),
		creator_id: record.creator_id === "" ? null : Number(record.creator_id),
		updater_id: record.updater_id === "" ? null : Number(record.updater_id),
		is_locked:  record.is_locked === "t"
	} satisfies RawE621WikiPage as RawE621WikiPage;
}
