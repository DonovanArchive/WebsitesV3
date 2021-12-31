import db from "@db";
import type { ConvertFromRaw } from "@util/@types/general";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawShortURL {
	code: string;
	created_at: string;
	modified_at: string;
	creator_ua: string;
	creator_ip: string;
	creator_name: string;
	management_code: string | null;
	url: string;
	pos: number;
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
		ua: string;
		ip: string;
		name: string;
	};
	managementCode: string | null;
	url: string;
	pos: number;
	constructor(data: RawShortURL) {
		this.code = data.code;
		this.createdAt = data.created_at;
		this.modifiedAt = data.modified_at;
		this.creator = {
			ua:   data.creator_ua,
			ip:   data.creator_ip,
			name: data.creator_name
		};
		this.managementCode = data.management_code;
		this.url = data.url;
		this.pos = data.pos;
	}

	static async get(code: string) {
		return db.query(`SELECT * FROM ${ShortURL.DB}.${ShortURL.TABLE} WHERE code = ?`, [code]).then((d: Array<RawShortURL>) => d.length === 0 ? null : new ShortURL(d[0]));
	}

	static async getByURL(url: string) {
		return db.query(`SELECT * FROM ${ShortURL.DB}.${ShortURL.TABLE} WHERE url = ?`, [url]).then((d: Array<RawShortURL>) => d.length === 0 ? null : new ShortURL(d[0]));
	}

	static async delete(code: string) {
		return db.query(`DELETE FROM ${ShortURL.DB}.${ShortURL.TABLE} WHERE code = ?`, [code]) as Promise<UpsertResult>;
	}

	static async new(data: Omit<ConvertFromRaw<RawShortURL>, "modified_at" | "pos">) {
		return db.query(`INSERT INTO ${ShortURL.DB}.${ShortURL.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, Object.values(data)).then((r: UpsertResult) => r.affectedRows === 1 ? this.get(data.code) : null);
	}

	async setCreatorName(name: string) {
		this.creator.name = name;
		return db.query(`UPDATE ${ShortURL.DB}.${ShortURL.TABLE} SET creator_name = ? WHERE code = ?`, [name, this.code]).then((r: UpsertResult) => r.affectedRows === 1 ? true : null);
	}

	async setURL(url: string) {
		this.url = url;
		return db.query(`UPDATE ${ShortURL.DB}.${ShortURL.TABLE} SET url = ? WHERE code = ?`, [url, this.code]).then((r: UpsertResult) => r.affectedRows === 1 ? true : null);
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
			pos:        this.pos,
			credit:     this.creator.name,
			fullURL:    this.fullURL
		};
	}
}
