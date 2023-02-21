import Logger from "./Logger";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default class CleanupActions {
	static actions: Record<string, (...args: Array<any>) => any> = {};
	static add(name: string, action: (...args: Array<any>) => any) {
		this.actions[name] = action;
		return this;
	}

	static async clean() {
		for (const [name, action] of Object.entries(this.actions)) {
			try {
				const res = action() as unknown;
				if (res instanceof Promise) await res;
			} catch (err) {
				Logger.getLogger("CleanupActions").error(`Error while cleaning ${name}:`, err);
			}
		}
	}

	static remove(name: string) {
		delete this.actions[name];
		return this;
	}
}
