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

export function parse(record: RawWikiPage): WikiPageData {
	return {
		id:         Number(record.id),
		created_at: new Date(record.created_at).toISOString(),
		updated_at: record.updated_at === "" ? null : new Date(record.updated_at).toISOString(),
		title:      record.title,
		body:       record.body.replace(/\r\n/g, "\n"),
		creator_id: record.creator_id === "" ? null : Number(record.creator_id),
		updater_id: record.updater_id === "" ? null : Number(record.updater_id),
		is_locked:  record.is_locked === "t"
	};
}

export interface WikiPageData {
	body: string;
	created_at: string;
	creator_id: number | null;
	id: number;
	is_locked: boolean;
	title: string;
	updated_at: string | null;
	updater_id: number | null;
}

export class WikiPage {
	body: string;
	created_at: Date;
	creator_id: number | null;
	id: number;
	is_locked: boolean;
	title: string;
	updated_at: Date | null;
	updater_id: number | null;
	constructor(data: WikiPageData) {
		this.body = data.body;
		this.created_at = new Date(data.created_at);
		this.creator_id = data.creator_id;
		this.id = data.id;
		this.is_locked = data.is_locked;
		this.title = data.title;
		this.updated_at = data.updated_at === null ? null : new Date(data.updated_at);
		this.updater_id = data.updater_id;
	}
}
