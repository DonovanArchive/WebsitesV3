import db from "@db";
import { publicDir, userAgent, yiffRocksOverride } from "@config";
import type { DataTypes } from "@uwu-codes/types";
import YiffRocks from "yiff-rocks";
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

YiffRocks.setUserAgent(userAgent);
export type APIImageKV = DataTypes<APIImage>;
export { APIImage };
export default class APIImage {
	static DB = "yiffyapi2";
	static TABLE = "images";
	static CDN_URL = "https://yiff.media";
	static CF_URL = "https://cf.yiff.media";
	static CF_RAW_URL = "https://imagedelivery.net/hCTZQZviUXhEogYvzUlP8Q";
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
		this.cfID = data.cf_id;
	}

	static async get(id: string) {
		return db.query(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE} WHERE id = ? LIMIT 1`, [id]).then((d: Array<RawAPIImage>) => d.length === 0 ? null : new APIImage(d[0]));
	}

	static async getRandom(category: string, limit: number): Promise<Array<APIImage>> {
		return db.query(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE} WHERE category = ? LIMIT ${limit}`, [category]).then((d: Array<RawAPIImage>) => d.map(i => new APIImage(i)));
	}

	static async getAll() {
		return db.query(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE}`).then((d: Array<RawAPIImage>) => d.map(img => new APIImage(img)));
	}

	static async getByCategory(cat: string) {
		return db.query(`SELECT * FROM ${APIImage.DB}.${APIImage.TABLE} WHERE category = ?`, [cat]).then((d: Array<RawAPIImage>) => d.map(img => new APIImage(img)));
	}

	static categoryPath(name: string) {
		return `${publicDir}/V2/${name.replace(/\./g, "/")}`;
	}

	get fsLocation() {
		return `${APIImage.categoryPath(this.category)}/${this.id}.${this.ext}`;
	}

	get cdnURL() {
		return `${APIImage.CDN_URL}/${this.category.replace(/\./g, "/")}/${this.id}.${this.ext}`;
	}

	get cfURL() {
		return this.cfID === null || this.size >= 10000000 ? null : `${APIImage.CF_URL}/${this.id}`;
	}

	get cfRawURL() {
		return this.cfID === null || this.size >= 10000000 ? null : `${APIImage.CF_RAW_URL}/${this.id}/default`;
	}

	get json() {
		return {
			artists:      this.artists,
			sources:      this.sources,
			width:        this.width,
			height:       this.height,
			url:          this.cfURL || this.cdnURL,
			yiffMediaURL: this.cdnURL,
			cfURL:        this.cfURL,
			cfRawURL:     this.cfRawURL,
			type:         this.type,
			name:         `${this.id}.${this.ext}`,
			id:           this.id,
			cfID:         this.cfID,
			ext:          this.ext,
			size:         this.size,
			reportURL:    null
		};
	}

	async getJSON() {
		return {
			...this.json,
			shortURL: await this.getShortURL()
		};
	}

	get headers() {
		return {
			"X-Yiffy-Artist":                  this.artists,
			"X-Yiffy-Source":                  this.sources,
			"X-Yiffy-Image-Width":             this.width,
			"X-Yiffy-Image-Height":            this.height,
			"X-Yiffy-Image-URL":               this.cfID || this.cdnURL,
			"X-Yiffy-Image-YiffMedia-URL":     this.cdnURL,
			"X-Yiffy-Image-CloudFlare-URL":    this.cfURL,
			"X-Yiffy-Image-CloudFlare-RawURL": this.cfRawURL,
			"X-Yiffy-Image-Type":              this.type,
			"X-Yiffy-Image-Name":              `${this.id}.${this.ext}`,
			"X-Yiffy-Image-Extension":         this.ext,
			"X-Yiffy-Image-Size":              this.size,
			"X-Yiffy-CloudFlare-ID":           this.cfID || "NONE",
			"X-Yiffy-Report-URL":              "NONE",
			"X-Yiffy-Schema":                  "https://schema.yiff.rest/V2.json",
			"X-Yiffy-Version":                 2
		};
	}

	async getHeaders() {
		return {
			...this.headers,
			"X-Yiffy-Short-URL": await this.getShortURL()
		};
	}

	async getShortURL() {
		return YiffRocks.create(this.cfURL || this.cdnURL, `YiffyAPI-${yiffRocksOverride}`, this.id, false).then(v => v.fullURL);
	}
}
