import IRateLimiter from "./IRateLimiter";

export default class InMemoryRateLimiter extends IRateLimiter {
	// this IS a memory leak, but we'll only be using it for a small amount of time
	private _list: Map<string, [count: number, expiry: number]> = new Map();

	override async getGlobal(name: string, ip: string) {
		return this._list.get(this.globalKey(name, ip))?.[0] ?? null;
	}

	override async getRoute(name: string, domain: string, path: string, ip: string) {
		return this._list.get(this.routeKey(name, domain, path, ip))?.[0] ?? null;
	}

	override async getGlobalTTL(name: string, ip: string) {
		return this._list.get(this.globalKey(name, ip))?.[1] ?? null;
	}

	override async getRouteTTL(name: string, domain: string, path: string, ip: string) {
		return this._list.get(this.routeKey(name, domain, path, ip))?.[1] ?? null;
	}

	override async consumeGlobal(name: string, window: number, limit: number, ip: string) {
		const key = this.globalKey(name, ip);
		let [val, exp] = this._list.get(key) ?? [];
		if (exp && exp < Date.now()) {
			this._list.delete(key);
			val = exp = undefined;
		}

		if (val && val >= limit) {
			return val + 1;
		}

		val = (val ?? 0) + 1;
		exp = exp ?? Date.now() + window;
		this._list.set(key, [val, exp]);
		return val;
	}

	override async consumeRoute(name: string, domain: string, path: string, window: number, limit: number, ip: string) {
		const key = this.routeKey(name, domain, path, ip);
		let [val, exp] = this._list.get(key) ?? [];
		if (exp && exp < Date.now()) {
			this._list.delete(key);
			val = exp = undefined;
		}

		if (val && val >= limit) {
			return val + 1;
		}

		val = (val ?? 0) + 1;
		exp = exp ?? Date.now() + window;
		this._list.set(key, [val, exp]);
		return val;
	}

	override async restoreGlobal(name: string, ip: string) {
		const d = this._list.get(this.globalKey(name, ip));
		if (d) d[0]--;
	}

	override async restoreRoute(name: string, domain: string, path: string, ip: string) {
		const d = this._list.get(this.routeKey(name, domain, path, ip));
		if (d) d[0]--;
	}

	override async fixInfiniteExpiry(key: string, val: number | null, expiry: number): Promise<[exp: number, diff: number]> {
		return [val!, expiry - val!];
	}
}
