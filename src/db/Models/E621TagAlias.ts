import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawE621TagAlias {
	id: number;
	antecedent_name: string;
	consequent_name: string;
	created_at: string | null;
	status: string;
}
export type E621TagAliasKV = DataTypes<E621TagAlias>;
export { E621TagAlias };

export default class E621TagAlias {
	static DB = "e621";
	static TABLE = "tag_aliases";
	id: number;
	antecedentName: string;
	consequentName: string;
	createdAt: string | null;
	status: string;
	constructor(data: RawE621TagAlias) {
		this.id = data.id;
		this.antecedentName = data.antecedent_name;
		this.consequentName = data.consequent_name;
		this.createdAt = data.created_at;
		this.status = data.status;
	}

	static async get(id: number): Promise<E621TagAlias | null> {
		return db.query<Array<RawE621TagAlias>>(`SELECT * FROM ${E621TagAlias.DB}.${E621TagAlias.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new E621TagAlias(k[0]));
	}

	static async getOrThrow(id: number): Promise<E621TagAlias> {
		const key = await E621TagAlias.get(id);
		if (!key) throw new Error(`Invalid E621 Post: ${id}`);
		return key;
	}

	static async new(data: RawE621TagAlias) {
		return db.query<UpsertResult>(`INSERT INTO ${E621TagAlias.DB}.${E621TagAlias.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, Object.values(data)).then(r => r.affectedRows === 1 ? data.id : null);
	}

	static async delete(id: number) {
		return db.query<UpsertResult>(`DELETE FROM ${E621TagAlias.DB}.${E621TagAlias.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	async delete() { return E621TagAlias.delete(this.id); }
}
