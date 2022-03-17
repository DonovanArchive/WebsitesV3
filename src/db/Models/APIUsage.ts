import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { Request } from "express";
import type { UpsertResult } from "mariadb";

export interface RawAPIUsage {
	id: bigint;
	key: string | null;
	ip: string;
	user_agent: string;
	type: string;
	method: string;
	path: string;
	timestamp: string;
}
export type APIUsageKV = DataTypes<APIUsage>;
export { APIUsage };
export default class APIUsage {
	static DB = "yiffyapi2";
	static TABLE = "usage";
	id: bigint;
	key: string | null;
	ip: string;
	userAgent: string;
	type: string;
	method: string;
	path: string;
	timestamp: string;
	constructor(data: RawAPIUsage) {
		this.id = data.id;
		this.key = data.key;
		this.ip = data.ip;
		this.userAgent = data.user_agent;
		this.type = data.type;
		this.method = data.method;
		this.path = data.path;
		this.timestamp = data.timestamp;
	}

	static async track(category: string, req: Request) {
		const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString();
		const res = await db.query(`INSERT INTO ${APIUsage.DB}.${APIUsage.TABLE} (\`key\`, ip, user_agent, type, method, path, referrer, query) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
			req.headers.authorization || null,
			ip,
			req.query._ua || req.headers["user-agent"] || null,
			category,
			req.method.toUpperCase(),
			req.originalUrl.split("?")[0],
			req.headers.referer || null,
			JSON.stringify(req.query)
		]) as UpsertResult;
		await db.r.incr(`yiffy2:ip:${ip}`);
		if (req.headers.authorization) await db.r.incr(`yiffy2:key:${req.headers.authorization}`);
		await db.r.incr(`yiffy2:category:${category}`);
		return res.insertId;
	}
}
