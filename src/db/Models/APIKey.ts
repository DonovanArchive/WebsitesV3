import type { BooleanData } from "@util/@types/MariaDB";
import db from "@db";
import type { ConvertFromRaw } from "@util/@types/general";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";
import { randomBytes } from "crypto";

export interface RawAPIKey {
	id: string;
	unlimited: BooleanData;
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
	flags: number;
	bulk_limit: number;
}
export type APIKeyKV = DataTypes<APIKey>;
export { APIKey };
export enum APIKeyFlags {
	IMAGES      = 1 << 0,
	THUMBS      = 1 << 1,
	SHORTENER   = 1 << 2,
	IMAGES_BULK = 1 << 3,
	SFW_ONLY    = 1 << 4,
}

export const DEFAULT_WINDOW_LONG  = 10000;
export const DEFAULT_LIMIT_LONG   = 7;
export const DEFAULT_WINDOW_SHORT = 2000;
export const DEFAULT_LIMIT_SHORT  = 2;
export const DEFAULT_FLAGS = APIKeyFlags.IMAGES | APIKeyFlags.THUMBS | APIKeyFlags.SHORTENER;
export const ANON_FLAGS = APIKeyFlags.IMAGES;
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
	flags: number;
	bulkLimit: number;
	constructor(data: RawAPIKey) {
		this.id = data.id;
		this.unlimited = Boolean(data.unlimited);
		this.flowAccess = false;
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
		this.flags = data.flags ?? DEFAULT_FLAGS;
		this.bulkLimit = data.bulk_limit ?? 0;
		if (data.unlimited) {
			this.windowLong  = 1000;
			this.limitLong   = 1000;
			this.windowShort = 1000;
			this.limitShort  = 1000;
		}
	}

	static async get(id: string): Promise<APIKey | null> {
		return db.query<Array<RawAPIKey>>(`SELECT * FROM ${APIKey.DB}.${APIKey.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new APIKey(k[0]));
	}

	static async getOrThrow(id: string): Promise<APIKey> {
		const key = await APIKey.get(id);
		if (!key) throw new Error(`Invalid API Key: ${id}`);
		return key;
	}

	static async getOwned(owner: string): Promise<Array<APIKey>> {
		return db.query<Array<RawAPIKey>>(`SELECT * FROM ${APIKey.DB}.${APIKey.TABLE} WHERE owner = ?`, [owner]).then(k => k.map(d => new APIKey(d)));
	}

	static async new(data: Omit<ConvertFromRaw<RawAPIKey>, "id" | "window_long" | "limit_long" | "window_short" | "limit_short"> & Partial<Record<"window_long" | "limit_long" | "window_short" | "limit_short", number>>) {
		const id = randomBytes(20).toString("hex");
		if ("id" in data) delete (data as {id?: string; }).id;
		const key = await db.query<Array<RawAPIKey>>(`INSERT INTO ${APIKey.DB}.${APIKey.TABLE} (id, ${Object.keys(data).join(", ")}) VALUES (?, ${Object.values(data).map(() => "?").join(", ")}) RETURNING *`, [id, ...Object.values(data)]).then(r => r.length ? r[0] : null);
		return key ? new APIKey(key) : null;
	}

	static async delete(id: string) {
		return db.query<UpsertResult>(`DELETE FROM ${APIKey.DB}.${APIKey.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	async delete() { return APIKey.delete(this.id); }

	get imagesAccess() { return this.active && !this.disabled && (this.flags & APIKeyFlags.IMAGES) === APIKeyFlags.IMAGES; }
	get thumbsAccess() { return this.active && !this.disabled && (this.flags & APIKeyFlags.THUMBS) === APIKeyFlags.THUMBS; }
	get shortenerAccess() { return this.active && !this.disabled && (this.flags & APIKeyFlags.SHORTENER) === APIKeyFlags.SHORTENER; }
	get imagesBulkAccess() { return this.active && !this.disabled && (this.flags & APIKeyFlags.IMAGES_BULK) === APIKeyFlags.IMAGES_BULK; }
	get sfwOnly() { return this.active && !this.disabled && (this.flags & APIKeyFlags.SFW_ONLY) === APIKeyFlags.SFW_ONLY; }

	get servicesString() {
		const services: Array<string> = [];
		if (this.imagesAccess) services.push("Images");
		if (this.imagesBulkAccess) services.push(`Bulk Images (${this.bulkLimit})`);
		if (this.thumbsAccess) services.push("Thumbs");
		if (this.shortenerAccess) services.push("Shortener");

		return services.join(", ") || "None";
	}
}
