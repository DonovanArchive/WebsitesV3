import db from "../../../db";
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
		return db.r.pttl(this.globalKey(name, ip)).then(v => v === null ? null : Number(v));
	}

	static async getRouteTTL(name: string, domain: string, path: string, ip: string) {
		return db.r.pttl(this.routeKey(name, domain, path, ip)).then(v => v === null ? null : Number(v));
	}

	static async consumeGlobal(name: string, window: number, limit: number, ip: string) {
		const key = this.globalKey(name, ip);
		const e = await db.r.exists(key);
		// only set expiry on the first run
		if (!e) await db.r.set(key, "0", "PX", window);
		const val = await db.r.get(key);
		// don't increase if the request will be rejected
		return Number(val) >= limit ? limit + 1 : db.r.incr(key);
	}

	static async consumeRoute(name: string, domain: string, path: string, window: number, limit: number, ip: string) {
		const key = this.routeKey(name, domain, path, ip);
		const e = await db.r.exists(key);
		if (!e) await db.r.set(key, "0", "PX", window);
		const val = await db.r.get(key);
		return Number(val) >= limit ? limit + 1 : db.r.incr(key);
	}

	static async process(req: Request, res: Response, globalWindow: number, globalLimit: number, routeWindow: number, routeLimit: number) {
		const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString();
		const domain = req.hostname?.endsWith(process.env.SITE!) ? req.hostname : process.env.SITE!;
		const path = req.originalUrl.split("?")[0];

		// per-route
		const rRoute = await RateLimiter.consumeRoute("yiff.rest", domain, path, routeWindow, routeLimit, ip);
		const expRoute = await RateLimiter.getRouteTTL("yiff.rest", domain, path, ip);
		res.header({
			"X-RateLimit-Limit":       routeLimit,
			"X-RateLimit-Remaining":   (routeLimit - rRoute) < 0 ? 0 : (routeLimit - rRoute),
			"X-RateLimit-Reset":       (expRoute === null ? routeWindow : new Date(Date.now() + expRoute).getTime()).toString(),
			"X-RateLimit-Reset-After": (expRoute === null ? 0 : expRoute).toString(),
			"X-RateLimit-Bucket":      this.routeBucket(domain, path),
			"X-RateLimit-Precision":   "millisecond"
		});
		if ((rRoute - 1) >= routeLimit) {
			// we still need to fetch the global headers so they're present when we exit early
			const rGlobal = await RateLimiter.getGlobal("yiff.rest", ip).then(v => v || 0);
			const expGlobal = await RateLimiter.getGlobalTTL("yiff.rest", ip);
			res.header({
				"X-RateLimit-Global-Limit":       globalLimit,
				"X-RateLimit-Global-Remaining":   (globalLimit - rGlobal) < 0 ? 0 : (globalLimit - rGlobal),
				"X-RateLimit-Global-Reset":       (expGlobal === null ? globalWindow : new Date(Date.now() + expGlobal).getTime()).toString(),
				"X-RateLimit-Global-Reset-After": (expGlobal === null ? 0 : expGlobal).toString(),
				"X-RateLimit-Global-Precision":   "millisecond"
			});
			res.header("Retry-After", Math.ceil(expRoute === null ? routeWindow / 1000 : expRoute / 1000).toString()).status(429).json({
				success: false,
				error:   "Request Limit Exceeded",
				info:    {
					limit:      routeLimit,
					remaining:  (routeLimit - rRoute) < 0 ? 0 : (routeLimit - rRoute),
					reset:      (expRoute === null ? routeWindow : new Date(Date.now() + expRoute).getTime()),
					resetAfter: (expRoute === null ? 0 : expRoute),
					retryAfter: Math.ceil(expRoute === null ? routeWindow / 1000 : expRoute / 1000),
					bucket:     this.routeBucket(domain, path),
					precision:  "millisecond",
					global:     false
				}
			});
			return false;
		}

		// global
		const rGlobal = await RateLimiter.consumeGlobal("yiff.rest", globalWindow, globalLimit, ip);
		const expGlobal = await RateLimiter.getGlobalTTL("yiff.rest", ip);
		res.header({
			"X-RateLimit-Global-Limit":       globalLimit,
			"X-RateLimit-Global-Remaining":   (globalLimit - rGlobal) < 0 ? 0 : (globalLimit - rGlobal),
			"X-RateLimit-Global-Reset":       (expGlobal === null ? globalWindow : new Date(Date.now() + expGlobal).getTime()).toString(),
			"X-RateLimit-Global-Reset-After": (expGlobal === null ? 0 : expGlobal).toString(),
			"X-RateLimit-Global-Precision":   "millisecond"
		});
		if ((rGlobal - 1) >= globalLimit) {
			// since the request isn't going through, we need to undo one of the uses we put in
			await db.r.decr(this.routeKey("yiff.rest", domain, path, ip));
			res.header("X-RateLimit-Remaining", ((routeLimit - (rRoute - 1)) < 0 ? 0 : (routeLimit - (rRoute - 1))).toString());
			res.header("Retry-After", Math.ceil(expGlobal === null ? routeWindow / 1000 : expGlobal / 1000).toString()).status(429).json({
				success: false,
				error:   "Request Limit Exceeded",
				info:    {
					limit:      globalLimit,
					remaining:  (globalLimit - rGlobal) < 0 ? 0 : (globalLimit - rGlobal),
					reset:      expGlobal === null ? globalWindow / 1000 : new Date(Date.now() + expGlobal).getTime() / 1000,
					resetAfter: expGlobal === null ? 0 : new Date(Date.now() + expGlobal).getTime() / 1000,
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
}
