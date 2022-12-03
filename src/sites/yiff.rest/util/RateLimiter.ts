import db from "../../../db";
import { RedisTTLResponse, YiffyErrorCodes } from "../../../util/Constants";
import Webhooks from "../../../util/Webhooks";
import type { Request, Response } from "express";

export default class RateLimiter {
	static globalKey(name: string, ip: string) {
		return `rl:${name}:global:${ip}`;
	}

	static routeBucket(domain: string, path: string) {
		return Buffer.from(`domain=${domain},path=${path}`).toString("base64url").replace(/=/g, "");
	}

	static routeKey(name: string, domain: string, path: string, ip: string) {
		return `rl:${name}:route:${this.routeBucket(domain, path)}:${ip}`;
	}

	static async getGlobal(name: string, ip: string) {
		return db.r.get(this.globalKey(name, ip)).then(v => v === null ? null : Number(v));
	}

	static async getRoute(name: string, domain: string, path: string, ip: string) {
		return db.r.get(this.routeKey(name, domain, path, ip)).then(v => v === null ? null : Number(v));
	}

	static async getGlobalTTL(name: string, ip: string) {
		return db.r.pttl(this.globalKey(name, ip)).then(v => v === null || v < 0 ? null : Number(v));
	}

	static async getRouteTTL(name: string, domain: string, path: string, ip: string) {
		return db.r.pttl(this.routeKey(name, domain, path, ip)).then(v => v === null || v < 0 ? null : Number(v));
	}

	static async consumeGlobal(name: string, window: number, limit: number, ip: string) {
		const key = this.globalKey(name, ip);
		const e = await db.r.exists(key);
		// only set expiry on the first run
		if (!e) await db.r.set(key, "0", "PX", window);
		const val = await db.r.get(key);
		const exp = await db.r.pttl(key);
		await this.fixInfiniteExpiry(this.globalKey(name, ip), exp, window);
		// don't increase if the request will be rejected
		return Number(val) >= limit ? limit + 1 : db.r.incr(key);
	}

	static async consumeRoute(name: string, domain: string, path: string, window: number, limit: number, ip: string) {
		const key = this.routeKey(name, domain, path, ip);
		const e = await db.r.exists(key);
		if (!e) await db.r.set(key, "0", "PX", window);
		const val = await db.r.get(key);
		const exp = await db.r.pttl(key);
		await this.fixInfiniteExpiry(this.routeKey(name, domain, path, ip), exp, window);
		return Number(val) >= limit ? limit + 1 : db.r.incr(key);
	}

	static async process(req: Request, res: Response, globalWindow: number, globalLimit: number, routeWindow: number, routeLimit: number) {
		const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString();
		let domain = req.hostname?.endsWith(process.env.SITE!) ? req.hostname : process.env.SITE!;
		const userAgent = (req.query._ua as string || req.headers["user-agent"]) ?? "NONE";
		const path = req.originalUrl.split("?")[0];

		// ensure subdomain & route versioning are treated the same
		if (domain === "yiff.rest" && req.path.startsWith("/V2")) domain = "v2.yiff.rest";
		// per-route
		const rRoute = await this.consumeRoute("yiffy2", domain, path, routeWindow, routeLimit, ip);
		const expRoute = await this.getRouteTTL("yiffy2", domain, path, ip);
		const remaining = (routeLimit - rRoute) < 0 ? 0 : (routeLimit - rRoute),
			reset = (expRoute === null ? routeWindow : new Date(Date.now() + expRoute).getTime()).toString(),
			resetAfter = (expRoute === null ? 0 : expRoute).toString(),
			bucket = this.routeBucket(domain, path);
		res.header({
			"X-RateLimit-Limit":       routeLimit,
			"X-RateLimit-Remaining":   remaining,
			"X-RateLimit-Reset":       reset,
			"X-RateLimit-Reset-After": resetAfter,
			"X-RateLimit-Bucket":      bucket,
			"X-RateLimit-Precision":   "millisecond"
		});
		if ((rRoute - 1) >= routeLimit) {
			// we still need to fetch the global headers so they're present when we exit early
			const rGlobal = await this.getGlobal("yiffy2", ip).then(v => v || 0);
			const expGlobal = await this.getGlobalTTL("yiffy2", ip);
			await this.fixInfiniteExpiry(this.globalKey("yiffy2", ip), expGlobal, globalWindow);
			const globalRemaining = (globalLimit - rGlobal) < 0 ? 0 : (globalLimit - rGlobal),
				globalReset = (expGlobal === null ? globalWindow : new Date(Date.now() + expGlobal).getTime()).toString(),
				globalResetAfter = (expGlobal === null ? 0 : expGlobal).toString();
			res.header({
				"X-RateLimit-Global-Limit":       globalLimit,
				"X-RateLimit-Global-Remaining":   globalRemaining,
				"X-RateLimit-Global-Reset":       globalReset,
				"X-RateLimit-Global-Reset-After": globalResetAfter,
				"X-RateLimit-Global-Precision":   "millisecond"
			});
			await Webhooks.get("rateLimit").execute({
				embeds: [
					{
						title:       "Rate Limit Exceeded",
						description: [
							`**Host**: **${domain}** (${req.hostname})`,
							`**Path**: **${path}**`,
							`Auth: **${req.headers.authorization ? `Yes (${req.headers.authorization})` : "No"}**`,
							`User Agent: \`${userAgent}\``,
							`IP: ${ip}`,
							"Global: <:redTick:865401803256627221>",
							"Info:",
							`\u25fd Limit: **${routeLimit}**`,
							`\u25fd Remaining: **${remaining}**`,
							`\u25fd Reset: **${reset}**`,
							`\u25fd Reset After: **${resetAfter}**`,
							`\u25fd Bucket: **${bucket}**`,
							`\u25fd Decoded Bucket: **${Buffer.from(bucket).toString("ascii")}**`
						].join("\n")
					}
				]
			});
			res.header("Retry-After", Math.ceil(expRoute === null ? routeWindow / 1000 : expRoute / 1000).toString()).status(429).json({
				success: false,
				error:   "Request Limit Exceeded",
				code:    YiffyErrorCodes.RATELIMIT_ROUTE,
				info:    {
					limit:      routeLimit,
					remaining,
					reset,
					resetAfter,
					retryAfter: Math.ceil(expRoute === null ? routeWindow / 1000 : expRoute / 1000),
					bucket,
					precision:  "millisecond",
					global:     false
				}
			});
			return false;
		}

		// global
		const rGlobal = await this.consumeGlobal("yiffy2", globalWindow, globalLimit, ip);
		const expGlobal = await this.getGlobalTTL("yiffy2", ip);
		await this.fixInfiniteExpiry(this.globalKey("yiffy2", ip), expGlobal, globalWindow);
		const globalRemaining = (globalLimit - rGlobal) < 0 ? 0 : (globalLimit - rGlobal),
			globalReset = (expGlobal === null ? globalWindow : new Date(Date.now() + expGlobal).getTime()).toString(),
			globalResetAfter = (expGlobal === null ? 0 : expGlobal).toString();
		res.header({
			"X-RateLimit-Global-Limit":       globalLimit,
			"X-RateLimit-Global-Remaining":   globalRemaining,
			"X-RateLimit-Global-Reset":       globalReset,
			"X-RateLimit-Global-Reset-After": globalResetAfter,
			"X-RateLimit-Global-Precision":   "millisecond"
		});
		if ((rGlobal - 1) >= globalLimit) {
			// since the request isn't going through, we need to undo one of the uses we put in
			await db.r.decr(this.routeKey("yiffy2", domain, path, ip));
			await Webhooks.get("rateLimit").execute({
				embeds: [
					{
						title:       "Global Rate Limit Exceeded",
						description: [
							`**Host**: **${domain}** (${req.hostname})`,
							`**Path**: **${path}**`,
							`Auth: **${req.headers.authorization ? `Yes (${req.headers.authorization})` : "No"}**`,
							`User Agent: \`${userAgent}\``,
							`IP: ${ip}`,
							"Global: <:greenTick:865401802920951819>",
							"Info:",
							`\u25fd Limit: **${globalLimit}**`,
							`\u25fd Remaining: **${globalRemaining}**`,
							`\u25fd Reset: **${globalReset}**`,
							`\u25fd Reset After: **${globalResetAfter}**`
						].join("\n")
					}
				]
			});
			res.header("X-RateLimit-Remaining", ((routeLimit - (rRoute - 1)) < 0 ? 0 : (routeLimit - (rRoute - 1))).toString());
			res.header("Retry-After", Math.ceil(expGlobal === null ? routeWindow / 1000 : expGlobal / 1000).toString()).status(429).json({
				success: false,
				error:   "Request Limit Exceeded",
				code:    YiffyErrorCodes.RATELIMIT_GLOBAL,
				info:    {
					limit:      globalLimit,
					remaining:  globalRemaining,
					reset:      globalReset,
					resetAfter: globalResetAfter,
					retryAfter: expGlobal === null ? routeWindow / 1000 : expGlobal / 1000,
					bucket:     null,
					precision:  "millisecond",
					global:     true
				}
			});
			return false;
		}

		return true;
	}

	static async fixInfiniteExpiry(key: string, val: number | null, expiry: number): Promise<[exp: number, diff: number]> {
		if (val === RedisTTLResponse.NO_EXPIRY) {
			await db.r.pexpire(key, expiry);
			return [expiry, 0];
		} else return [val!, expiry - val!];
	}
}
