import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawE621WikiPage {
	id: number;
	created_at: string;
	updated_at: string | null;
	title: string;
	body: string;
	creator_id: number | null;
	updater_id: number | null;
	is_locked: boolean;
}
export type E621TagImplicationKV = DataTypes<E621WikiPage>;
export { E621WikiPage };

export default class E621WikiPage {
	static DB = "e621";
	static TABLE = "wiki_pages";
	id: number;
	createdAt: string;
	updatedAt: string | null;
	title: string;
	body: string;
	creatorID: number | null;
	updaterID: number | null;
	isLocked: boolean;
	constructor(data: RawE621WikiPage) {
		this.id = data.id;
		this.createdAt = data.created_at;
		this.updatedAt = data.updated_at;
		this.title = data.title;
		this.body = data.body;
		this.creatorID = data.creator_id;
		this.updaterID = data.updater_id;
		this.isLocked = data.is_locked;
	}

	static async get(id: number): Promise<E621WikiPage | null> {
		return db.query<Array<RawE621WikiPage>>(`SELECT * FROM ${E621WikiPage.DB}.${E621WikiPage.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new E621WikiPage(k[0]));
	}

	static async getOrThrow(id: number): Promise<E621WikiPage> {
		const key = await E621WikiPage.get(id);
		if (!key) throw new Error(`Invalid E621 Post: ${id}`);
		return key;
	}

	static async new(data: RawE621WikiPage) {
		return db.query<UpsertResult>(`INSERT INTO ${E621WikiPage.DB}.${E621WikiPage.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, Object.values(data)).then(r => r.affectedRows === 1 ? data.id : null);
	}

	static async delete(id: number) {
		return db.query<UpsertResult>(`DELETE FROM ${E621WikiPage.DB}.${E621WikiPage.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	async delete() { return E621WikiPage.delete(this.id); }
}
