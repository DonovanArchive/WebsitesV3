import { READONLY, services } from "../config";
import db from "../db";
import Logger from "../util/Logger";
import { fetch } from "undici";

export interface IPCheckResult {
	ipAddress: string;
	isPublic: boolean;
	ipVersion: 4 | 6;
	isWhitelisted: boolean;
	abuseConfidenceScore: number;
	countryCode: string;
	usageType: string;
	isp: string;
	domain: string;
	hostnames: Array<string>;
	totalReports: number;
	numDistinctUsers: number;
	lastReportedAt: string;
}

export default class AbuseIPDB {
	static async check(ip: string) {
		const cache = await db.r.get(`abuseipdb:${ip}`);
		if (cache !== null) return cache === "true";
		const block = (await this.get(ip)) > 50;
		await db.r.set(`abuseipdb:${ip}`, String(block), "EX", 60 * 60 * 24);
		return block;
	}

	static async get(ip: string) {
		const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, {
			headers: {
				Accept: "application/json",
				Key:    services.abuseipdb
			}
		});

		return (await response.json() as { data: IPCheckResult; }).data.abuseConfidenceScore;
	}

	static async report(ip: string, categories: Array<number>, comment: string) {
		if (READONLY) {
			Logger.getLogger("AbuseIPDB").warn(`Not reporting ${ip} due to being in read-only mode.`);
			return;
		}
		await fetch("https://api.abuseipdb.com/api/v2/report", {
			method:  "POST",
			headers: {
				"Accept":       "application/json",
				"Key":          services.abuseipdb,
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: `ip=${ip}&categories=${categories.join(",")}&comment=${encodeURIComponent(comment)}`
		});
	}
}
