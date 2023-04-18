import db from "@db";
import type { ConvertFromRaw } from "@util/@types/general";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawE621Status {
	id: number;
	status: number;
	since: string;
}
export type E621StatusKV = DataTypes<E621Status>;
export { E621Status };

export default class E621Status {
	static DB = "e621";
	static TABLE = "status";
	id: number;
	status: number;
	since: string;
	constructor(data: RawE621Status) {
		this.id = data.id;
		this.status = data.status;
		this.since = data.since;
	}

	static async get(id: number): Promise<E621Status | null> {
		return db.query<Array<RawE621Status>>(`SELECT * FROM ${E621Status.DB}.${E621Status.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new E621Status(k[0]));
	}

	static async new(data: Omit<ConvertFromRaw<RawE621Status>, "id">) {
		if ("id" in data) delete (data as {id?: number; }).id;
		const key = await db.query<Array<RawE621Status>>(`INSERT INTO ${E621Status.DB}.${E621Status.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")}) RETURNING *`, [...Object.values(data)]).then(r => r.length ? r[0] : null);
		return key ? new E621Status(key) : null;
	}

	static async delete(id: number) {
		return db.query<UpsertResult>(`DELETE FROM ${E621Status.DB}.${E621Status.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	static async getHistory(limit = 100) {
		return db.query<Array<RawE621Status>>(`SELECT * FROM ${E621Status.DB}.${E621Status.TABLE} ORDER BY id DESC LIMIT ?`, [limit]).then(k => k.map(kk => new E621Status(kk)));
	}

	static async getLatest() {
		return db.query<Array<RawE621Status>>("SELECT * FROM e621.status ORDER BY id DESC LIMIT 1").then(k => k.length === 0 ? null : new E621Status(k[0]));
	}

	static async getForDate(date: Date, limit = 100) {
		return db.query<Array<RawE621Status>>(`SELECT * FROM ${E621Status.DB}.${E621Status.TABLE} WHERE since LIKE '${date.toISOString().slice(0, 10)}%' ORDER BY id DESC LIMIT ?`, [limit]).then(k => k.map(kk => new E621Status(kk)));
	}

	async delete() { return E621Status.delete(this.id); }
}
