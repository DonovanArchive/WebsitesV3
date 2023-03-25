/// <reference lib="dom" />

import Logger from "./Logger";

const ddosProtection = Symbol.for("e621.ddosProtection");
const maintenance = Symbol.for("e621.maintenance");
async function check(): Promise<number | typeof ddosProtection | typeof maintenance> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 5000);
	try {
		const r = await fetch("https://e621.net/", { signal: controller.signal });
		clearTimeout(timeout);
		if (r.status === 200 && !r.headers.get("content-type")?.startsWith("application/json")) {
			return maintenance;
		}

		if (r.status === 503 && !r.headers.get("content-type")?.startsWith("application/json")) {
			return ddosProtection;
		}

		return r.status;
	} catch (err) {
		if (err instanceof Error && err.constructor.name === "DOMException" && err.name === "AbortError") {
			return 408;
		} else if (err instanceof TypeError && (err.cause as Error)?.message.includes("EAI_AGAIN")) {
			Logger.getLogger("e621.ws").error("Caught and ignored EAI_AGAIN error");
			return check();
		} else {
			Logger.getLogger("e621.ws").error(err);
			return 0;
		}
	}
}
