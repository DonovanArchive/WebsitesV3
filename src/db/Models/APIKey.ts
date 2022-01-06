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
	window_long: number;
	limit_long: number;
	window_short: number;
	limit_short: number;
}
export type APIKeyKV = DataTypes<APIKey>;
export { APIKey };

export const DEFAULT_WINDOW_LONG  = 10000;
export const DEFAULT_LIMIT_LONG   = 7;
export const DEFAULT_WINDOW_SHORT = 2000;
export const DEFAULT_LIMIT_SHORT  = 2;
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
	windowLong: number;
	limitLong: number;
	windowShort: number;
	limitShort: number;
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
		this.windowLong = data.window_long;
		this.limitLong = data.limit_long;
		this.windowShort = data.window_short;
		this.limitShort = data.limit_short;
		if (data.unlimited) {
			this.windowLong  = 1000;
			this.limitLong   = 1000;
			this.windowShort = 1000;
			this.limitShort  = 1000;
			process.emitWarning(`Found unlimited key "${data.id}" (owner: ${data.owner}, application: ${data.application}), this is deprecated.`);
		}
	}

	static async get(id: string): Promise<APIKey | null> {
		return db.query(`SELECT * FROM ${APIKey.DB}.${APIKey.TABLE} WHERE id = ? LIMIT 1`, [id]).then((k: Array<RawAPIKey>) => new APIKey(k[0]));
	}

	static async getOwned(owner: string): Promise<Array<APIKey>> {
		return db.query(`SELECT * FROM ${APIKey.DB}.${APIKey.TABLE} WHERE owner = ?`, [owner]).then((k: Array<RawAPIKey>) => k.map(d => new APIKey(d)));
	}

	static async new(data: Omit<ConvertFromRaw<RawAPIKey>, "id" | "window_long" | "limit_long" | "window_short" | "limit_short"> & Partial<Record<"window_long" | "limit_long" | "window_short" | "limit_short", number>>) {
		const id = randomBytes(20).toString("hex");
		if ("id" in data) delete (data as {id?: string; }).id;
		return db.query(`INSERT INTO ${APIKey.DB}.${APIKey.TABLE} (id, ${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, [id, ...Object.values(data)]).then((r: UpsertResult) => r.affectedRows === 1 ? id : null);
	}

	static async delete(id: string) {
		return db.query(`DELETE FROM ${APIKey.DB}.${APIKey.TABLE} WHERE id = ?`, [id]).then((r: UpsertResult) => r.affectedRows > 0);
	}

	async delete() { return APIKey.delete(this.id); }
}
