import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { Request } from "express";
import chunk from "chunk";
import type { UpsertResult } from "mariadb";

export interface RawUsage {
	id: string;
	ip: string;
	user_agent: string | null;
	authorization: string | null;
	raw_headers: string;
	method: string;
	path: string;
	domain: string;
	timestamp: string;
}
export type UsageKV = DataTypes<Usage>;
export { Usage };
export default class Usage {
	static DB = "websites3";
	static TABLE = "usage";
	id: string;
	ip: string;
	userAgent: string | null;
	authorization: string | null;
	rawHeaders: Array<[name: string, value: string]>;
	method: string;
	path: string;
	domain: string;
	timestamp: string;
	constructor(data: RawUsage) {
		this.id = data.id;
		this.ip = data.ip;
		this.userAgent = data.user_agent;
		this.authorization = data.authorization;
		this.rawHeaders = JSON.parse(data.raw_headers) as Array<[string, string]>;
		this.method = data.method;
		this.path = data.path;
		this.domain = data.domain;
		this.timestamp = data.timestamp;
	}

	static async track(req: Request) {
		const res = await db.query(`INSERT INTO ${Usage.DB}.${Usage.TABLE} VALUES (?, ?, ?, ?, ?, ?, ?)`, [req.socket.remoteAddress, req.headers["user-agent"] || null, req.headers.authorization || null, JSON.stringify(chunk(req.rawHeaders).map(r => [r[0], r[1]])), req.method.toUpperCase(), req.originalUrl, req.hostname?.endsWith(process.env.SITE!) ? req.hostname : process.env.SITE!]) as UpsertResult;
		await db.r
			.multi()
			.incr(`websites3:ip:${req.socket.remoteAddress!}`)
			.incr(`websites3:host:${req.hostname?.endsWith(process.env.SITE!) ? req.hostname : process.env.SITE!}`)
			.incr(`websites3:rawHost:${req.hostname}`)
			.exec();
		return res.insertId;
	}
}
