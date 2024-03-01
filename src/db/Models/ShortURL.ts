import db from "@db";
import type { ConvertFromRaw } from "@util/@types/general";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawShortURL {
	code: string;
	created_at: string;
	modified_at: string;
	creator_apikey: string | null; // will be null for entries before 12-01-2022
	creator_ip: string;
	creator_name: string;
	creator_ua: string;
	management_code: string | null;
	url: string;
}
export type ShortURLKV = DataTypes<ShortURL>;
export type ShortURLFilterTypes = Record<"id" | "owner", string>;
export { ShortURL };
export default class ShortURL {
	static DB = "yiffyapi2";
	static TABLE = "shorturls";
	code: string;
	createdAt: string;
	modifiedAt: string | null;
	creator: {
		apiKey: string |  null;
		ip: string;
		name: string;
		ua: string;
	};
	managementCode: string | null;
	url: string;
	constructor(data: RawShortURL) {
		this.code = data.code;
		this.createdAt = data.created_at;
		this.modifiedAt = data.modified_at;
		this.creator = {
			apiKey: data.creator_apikey,
			ip:     data.creator_ip,
			name:   data.creator_name,
			ua:     data.creator_ua
		};
		this.managementCode = data.management_code;
		this.url = data.url;
	}

	static async get(code: string) {
		return db.query<Array<RawShortURL>>(`SELECT * FROM ${ShortURL.DB}.${ShortURL.TABLE} WHERE code = ?`, [code]).then(d => d.length === 0 ? null : new ShortURL(d[0]));
	}

	static async getByURL(url: string) {
		return db.query<Array<RawShortURL>>(`SELECT * FROM ${ShortURL.DB}.${ShortURL.TABLE} WHERE url = ?`, [url]).then(d => d.length === 0 ? null : new ShortURL(d[0]));
	}

	static async delete(code: string) {
		return db.query<UpsertResult>(`DELETE FROM ${ShortURL.DB}.${ShortURL.TABLE} WHERE code = ?`, [code]);
	}

	static async new(data: Omit<ConvertFromRaw<RawShortURL>, "modified_at">) {
		return db.query<UpsertResult>(`INSERT INTO ${ShortURL.DB}.${ShortURL.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, Object.values(data)).then(r => r.affectedRows === 1 ? this.get(data.code) : null);
	}

	static async override(data: Omit<ConvertFromRaw<RawShortURL>, "modified_at">) {
		const exists = await this.get(data.code);
		if (exists) {
			if (exists.url !== data.url || exists.managementCode !== null) {
				await exists.delete();
			} else {
				return exists;
			}
		}
		return this.new(data);
	}

	async setCreatorName(name: string) {
		this.creator.name = name;
		return db.query<UpsertResult>(`UPDATE ${ShortURL.DB}.${ShortURL.TABLE} SET creator_name = ? WHERE code = ?`, [name, this.code]).then(r => r.affectedRows === 1 ? true : null);
	}

	async setURL(url: string) {
		this.url = url;
		return db.query<UpsertResult>(`UPDATE ${ShortURL.DB}.${ShortURL.TABLE} SET url = ? WHERE code = ?`, [url, this.code]).then(r => r.affectedRows === 1 ? true : null);
	}

	async delete() {
		return ShortURL.delete(this.code);
	}

	get fullURL() {
		return `https://yiff.rocks/${this.code}`;
	}

	json() {
		return {
			code:       this.code,
			createdAt:  this.createdAt,
			modifiedAt: this.modifiedAt,
			url:        this.url,
			credit:     this.creator.name,
			fullURL:    this.fullURL
		};
	}
}
