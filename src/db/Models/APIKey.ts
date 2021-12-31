import type { BooleanData } from "@util/@types/MariaDB";
import db from "@db";
import type { ConvertFromRaw } from "@util/@types/general";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";
import { randomBytes } from "crypto";

export interface RawAPIKey {
	id: string;
	unlimited: BooleanData;
	flow_access: BooleanData;
	active: BooleanData;
	disabled: BooleanData;
	disabled_reason: string | null;
	application: string;
	owner: string;
	contact: string;
}
export type APIKeyKV = DataTypes<APIKey>;
export { APIKey };
export default class APIKey {
	static DB = "yiffyapi2";
	static TABLE = "apikeys";
	id: string;
	unlimited: boolean;
	flowAccess: boolean;
	active: boolean;
	disabled: boolean;
	disabledReason: string | null;
	application: string;
	owner: string;
	contact: string;
	constructor(data: RawAPIKey) {
		this.id = data.id;
		this.unlimited = Boolean(data.unlimited);
		this.flowAccess = Boolean(data.flow_access);
		this.active = Boolean(data.active);
		this.disabled = Boolean(data.disabled);
		this.disabledReason = data.disabled_reason;
		this.application = data.application;
		this.owner = data.owner;
		this.contact = data.contact;
	}

	static async get(id: string): Promise<APIKey | null> {
		return db.query(`SELECT * FROM ${APIKey.DB}.${APIKey.TABLE} WHERE id = ? LIMIT 1`, [id]).then((k: Array<RawAPIKey>) => new APIKey(k[0]));
	}

	static async getOwned(owner: string): Promise<Array<APIKey>> {
		return db.query(`SELECT * FROM ${APIKey.DB}.${APIKey.TABLE} WHERE owner = ?`, [owner]).then((k: Array<RawAPIKey>) => k.map(d => new APIKey(d)));
	}

	static async new(data: Omit<ConvertFromRaw<RawAPIKey>, "id">) {
		const id = randomBytes(20).toString("hex");
		if ("id" in data) delete (data as {id?: string; }).id;
		return db.query(`INSERT INTO ${APIKey.DB}.${APIKey.TABLE} (id, ${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, [id, ...Object.values(data)]).then((r: UpsertResult) => r.affectedRows === 1 ? id : null);
	}

	static async delete(id: string) {
		return db.query(`DELETE FROM ${APIKey.DB}.${APIKey.TABLE} WHERE id = ?`, [id]).then((r: UpsertResult) => r.affectedRows > 0);
	}

	async delete() { return APIKey.delete(this.id); }
}
