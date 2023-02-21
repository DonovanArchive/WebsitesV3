import ShortURL from "./ShortURL";
import Logger from "../../util/Logger";
import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
export interface RawAPIImage {
	id: string;
	artists: string;
	sources: string;
	width: number;
	height: number;
	type: string;
	category: string;
	added_at: string;
	added_by: string;
	original_url: string | null;
	ext: string;
	size: number;
	cf_id: string | null;
}

export type APIImageKV = DataTypes<APIImage>;
export { APIImage };
export default class APIImage {
	static DB = "yiffyapi2";
	static TABLE = "images";
	static CDN_URL = "https://v2.yiff.media";
	id: string;
	artists: Array<string>;
	sources: Array<string>;
	width: number;
	height: number;
	type: string;
	category: string;
	addedAt: string; // @FIXME the frontend api expects this to be a number
	addedBy: string;
	originalURL: string | null;
	ext: string;
	size: number;
	cfID: string | null;
	constructor(data: RawAPIImage) {
		this.id = data.id;
		this.artists = data.artists.split(" ");
		this.sources = data.sources.split(" ");
		this.width = data.width;
		this.height = data.height;
		this.type = data.type;
		this.category = data.category;
		this.addedAt = data.added_at;
		this.addedBy = data.added_by;
		this.originalURL = data.original_url;
		this.ext = data.ext;
		this.size = data.size;
	}

	static async get(id: string) {
		return db.query<Array<RawAPIImage>>(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE} WHERE id = ? LIMIT 1`, [id]).then(d => d.length === 0 ? null : new APIImage(d[0]));
	}

	static async getRandom(category: string, limit: number, sizeLimit: number): Promise<Array<APIImage>> {
		return db.query<Array<RawAPIImage>>(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE} WHERE category = ?${sizeLimit === -1 ? "" : ` AND size <= ${sizeLimit}`} ORDER BY RAND() LIMIT ${limit}`, [category]).then(d => d.map(i => new APIImage(i)));
	}

	static async getAll() {
		return db.query<Array<RawAPIImage>>(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE}`).then(d => d.map(img => new APIImage(img)));
	}

	static async getByCategory(cat: string) {
		return db.query< Array<RawAPIImage>>(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE} WHERE category = ?`, [cat]).then(d => d.map(img => new APIImage(img)));
	}

	get cdnURL() {
		return `${APIImage.CDN_URL}/${this.s3Path}`;
	}

	get s3Path() {
		return `${this.category.replace(/\./g, "/")}/${this.id}.${this.ext}`;
	}

	get json() {
		return {
			artists:   this.artists.filter(Boolean),
			sources:   this.sources.filter(Boolean),
			width:     this.width,
			height:    this.height,
			url:       this.cdnURL,
			type:      this.type,
			name:      `${this.id}.${this.ext}`,
			id:        this.id,
			ext:       this.ext,
			size:      this.size,
			reportURL: null
		};
	}

	async toJSON() {
		return {
			...this.json,
			shortURL: await this.getShortURL().catch((err) => {
				Logger.getLogger("APIImage:getJSON").error(`Failed to get short url for image "${this.id}":`, err);
				return null;
			})
		};
	}

	get headers() {
		return {
			"X-Yiffy-Artist":          this.artists,
			"X-Yiffy-Source":          this.sources,
			"X-Yiffy-Image-Width":     this.width,
			"X-Yiffy-Image-Height":    this.height,
			"X-Yiffy-Image-URL":       this.cdnURL,
			"X-Yiffy-Image-Type":      this.type,
			"X-Yiffy-Image-Name":      `${this.id}.${this.ext}`,
			"X-Yiffy-Image-Extension": this.ext,
			"X-Yiffy-Image-Size":      this.size,
			"X-Yiffy-Report-URL":      "NONE",
			"X-Yiffy-Schema":          "https://schema.yiff.rest/V2.json",
			"X-Yiffy-Version":         2
		};
	}

	async getHeaders() {
		return {
			...this.headers,
			"X-Yiffy-Short-URL": await this.getShortURL()
		};
	}

	async getShortURL() {
		return (await ShortURL.override({
			created_at:      new Date().toISOString(),
			code:            this.id,
			url:             this.cdnURL,
			creator_apikey:  "local",
			creator_ip:      "127.0.0.1",
			creator_name:    "YiffyAPI",
			creator_ua:      "YiffyAPI/2.0.0 (https://yiff.rest)",
			management_code: null
		}))!.fullURL;
	}
}
