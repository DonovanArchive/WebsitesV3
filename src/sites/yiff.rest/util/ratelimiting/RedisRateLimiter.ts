import IRateLimiter from "./IRateLimiter";
import { RedisTTLResponse } from "../../../../util/Constants";
import type { Redis } from "ioredis";

export default class RedisRateLimiter extends IRateLimiter {
	private r: Redis;
	constructor(redis: Redis) {
		super();
		this.r = redis;
	}

	override async getGlobal(name: string, ip: string) {
		return this.r.get(this.globalKey(name, ip)).then(v => v === null ? null : Number(v));
	}

	override async getRoute(name: string, domain: string, path: string, ip: string) {
		return this.r.get(this.routeKey(name, domain, path, ip)).then(v => v === null ? null : Number(v));
	}

	override async restoreGlobal(name: string, ip: string) {
		await this.r.decr(this.globalKey(name, ip));
	}

	override async restoreRoute(name: string, domain: string, path: string, ip: string) {
		await this.r.decr(this.routeKey(name, domain, path, ip));
	}

	override async getGlobalTTL(name: string, ip: string) {
		return this.r.pttl(this.globalKey(name, ip)).then(v => v === null || v < 0 ? null : Number(v));
	}

	override async getRouteTTL(name: string, domain: string, path: string, ip: string) {
		return this.r.pttl(this.routeKey(name, domain, path, ip)).then(v => v === null || v < 0 ? null : Number(v));
	}

	override async consumeGlobal(name: string, window: number, limit: number, ip: string) {
		const key = this.globalKey(name, ip);
		const e = await this.r.exists(key);
		// only set expiry on the first run
		if (!e) await this.r.set(key, "0", "PX", window);
		const val = await this.r.get(key);
		const exp = await this.r.pttl(key);
		await this.fixInfiniteExpiry(this.globalKey(name, ip), exp, window);
		// don't increase if the request will be rejected
		return Number(val) >= limit ? limit + 1 : this.r.incr(key);
	}

	override async consumeRoute(name: string, domain: string, path: string, window: number, limit: number, ip: string) {
		const key = this.routeKey(name, domain, path, ip);
		const e = await this.r.exists(key);
		if (!e) await this.r.set(key, "0", "PX", window);
		const val = await this.r.get(key);
		const exp = await this.r.pttl(key);
		await this.fixInfiniteExpiry(this.routeKey(name, domain, path, ip), exp, window);
		return Number(val) >= limit ? limit + 1 : this.r.incr(key);
	}

	override async fixInfiniteExpiry(key: string, val: number | null, expiry: number): Promise<[exp: number, diff: number]> {
		if (val === RedisTTLResponse.NO_EXPIRY) {
			await this.r.pexpire(key, expiry);
			return [expiry, 0];
		} else return [val!, expiry - val!];
	}
}
