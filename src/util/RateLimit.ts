import db from "../db";

export default class RateLimit {
	prefix = "rl:";
	window: number;
	limit: number;
	cached = 0;
	namespace: string;
	route: string;
	specifier: string;
	constructor(window: number, limit: number, namespace: string, route: string, specifier: string, prefix?: string) {
		this.window = window;
		this.limit = limit;
		if (prefix) this.prefix = prefix;
		this.namespace = namespace;
		this.route = route;
		this.specifier = specifier;
	}

	get rPrefix() {
		return `${this.prefix}${this.namespace}:${this.route}:${this.specifier}`;
	}

	async canAccept() {
		return (this.limit - await this.getCurrentRate()) > 0;
	}

	get cachedCount() {
		return this.limit - this.cached;
	}

	async getUncachedCount() {
		return this.limit - await this.getCurrentRate();
	}

	async isThrottled() {
		if (await this.canAccept()) {
			await this.hit();
			return false;
		} else return true;
	}

	async getCurrentRate() {
		const time = Date.now();
		const curkey = this.currentKey(time);
		const prevkey = this.previousKey(time);
		const diff = time - this.ctime(time) * this.window;
		const hits = await db.r.mget(curkey, prevkey);
		return this.cached = ((hits[1] === null ? 0 : parseFloat(hits[1])) * ((this.window - diff) / this.window)) + (hits[0] === null ? 0 : parseFloat(hits[0]));
	}

	async hit() {
		const time = Date.now();
		const curkey = this.currentKey(time);
		await db.r.multi()
			.incr(curkey)
			.pexpire(curkey, this.window)
			.exec();
	}

	currentKey(time: number) {
		return `${this.rPrefix}:${this.ctime(time)}`;
	}

	previousKey(time: number) {
		return `${this.rPrefix}:${this.ptime(time)}`;
	}

	ctime(time: number) {
		return Math.trunc(time / this.window);
	}

	ptime(time: number) {
		return Math.trunc((time / this.window) - 1);
	}
}
