import db from "@db";
import type { DataTypes } from "@uwu-codes/types";
import type { Request } from "express";
import { randomBytes } from "crypto";

export interface RawAPIUsage {
	id: string;
	key: string;
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
	id: string;
	key: string;
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
		const ip = (req.socket.remoteAddress || req.headers["x-forwarded-for"] || req.ip).toString();
		const id = randomBytes(16).toString("hex");
		await db.query(`INSERT INTO ${APIUsage.DB}.${APIUsage.TABLE} VALUES (?, ?, ?, ?, ?, ?)`, [id, req.headers.authorization || null, ip, req.headers["user-agent"], category, req.method.toUpperCase(), req.originalUrl]);
		await db.r.incr(`yiffy2:ip:${ip}`);
		if (req.headers.authorization) await db.r.incr(`yiffy2:key:${req.headers.authorization}`);
		await db.r.incr(`yiffy2:category:${category}`);
		return id;
	}
}
