import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawE621Tag {
	id: number;
	name: string;
	category: TagCategory;
	post_count: number;
}
export type E621TagImplicationKV = DataTypes<E621Tag>;
export { E621Tag };

export enum TagCategory {
	GENERAL = 0,
	ARTIST = 1,
	COPYRIGHT = 3,
	CHARACTER = 4,
	SPECIES = 5,
	INVALID = 6,
	META = 7,
	LORE = 8,
}

export default class E621Tag {
	static DB = "e621";
	static TABLE = "tag_implications";
	id: number;
	name: string;
	category: TagCategory;
	postCount: number;
	constructor(data: RawE621Tag) {
		this.id = data.id;
		this.name = data.name;
		this.category = data.category;
		this.postCount = data.post_count;
	}

	static async get(id: number): Promise<E621Tag | null> {
		return db.query<Array<RawE621Tag>>(`SELECT * FROM ${E621Tag.DB}.${E621Tag.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new E621Tag(k[0]));
	}

	static async getOrThrow(id: number): Promise<E621Tag> {
		const key = await E621Tag.get(id);
		if (!key) throw new Error(`Invalid E621 Post: ${id}`);
		return key;
	}

	static async new(data: RawE621Tag) {
		return db.query<UpsertResult>(`INSERT INTO ${E621Tag.DB}.${E621Tag.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")})`, Object.values(data)).then(r => r.affectedRows === 1 ? data.id : null);
	}

	static async delete(id: number) {
		return db.query<UpsertResult>(`DELETE FROM ${E621Tag.DB}.${E621Tag.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	async delete() { return E621Tag.delete(this.id); }

	static async getStats() {
		type RawStats<T extends bigint | number> = Record<"GENERAL" | "ARTIST" | "COPYRIGHT" | "CHARACTER" | "SPECIES" | "INVALID" | "META" | "LORE" | "HIGHEST_ID" | "TOTAL", T>;
		const {
			GENERAL, ARTIST, COPYRIGHT, CHARACTER, SPECIES, INVALID, META, LORE, HIGHEST_ID, TOTAL
		} = await db.query<[RawStats<bigint>]>(`
			SELECT
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.GENERAL}) as GENERAL,
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.ARTIST}) as ARTIST,
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.COPYRIGHT}) as COPYRIGHT,
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.CHARACTER}) as 'CHARACTER',
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.SPECIES}) as SPECIES,
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.INVALID}) as INVALID,
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.META}) as META,
			(SELECT COUNT(*) FROM e621.tags WHERE category = ${TagCategory.LORE}) as LORE,
			(SELECT MAX(id) FROM e621.tags) as HIGHEST_ID,
			(SELECT COUNT(*) FROM e621.tags) as TOTAL
		`).then(([res]) => Object.entries(res).map(([k, v]) => ({ [k]: Number(v) })).reduce((a, b) => ({ ...a, ...b }), {}) as RawStats<number>);
		const round = (a: number, b: number) => `${Math.round(((a / b) + Number.EPSILON) * 10000) / 100}%`;
		return {
			general:   [GENERAL, round(GENERAL, TOTAL)],
			artist:	   [ARTIST, round(ARTIST, TOTAL)],
			copyright: [COPYRIGHT, round(COPYRIGHT, TOTAL)],
			character: [CHARACTER, round(CHARACTER, TOTAL)],
			species:   [SPECIES, round(SPECIES, TOTAL)],
			invalid:   [INVALID, round(INVALID, TOTAL)],
			meta:	     [META, round(META, TOTAL)],
			lore:	     [LORE, round(LORE, TOTAL)],
			highestID: HIGHEST_ID,
			total:	    TOTAL,
			deleted:   [HIGHEST_ID - TOTAL, round(HIGHEST_ID - TOTAL, TOTAL)]
		};
	}
}
