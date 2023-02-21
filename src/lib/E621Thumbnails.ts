import { services } from "../config";
import CleanupActions from "../util/CleanupActions";
import Logger from "../util/Logger";
import { Worker } from "worker_threads";

interface QueueEntry {
	thread: number;
	status: "processing" | "error" | "timeout";
	startedAt: number;
	endedAt: number | null;
}

export const filePath = (md5: string, ext: "gif" | "png") =>  `${md5}.${ext}`;
export const url = (md5: string, ext: "gif" | "png") =>  `${services["e621-thumbnails"].baseURL}/${md5}.${ext}`;
export const checkURL = (md5: string, type: "gif" | "png") =>  `${services["e621-thumbnails"].checkURL}/${md5}/${type}`;
export function getTime(started: number, type: "gif" | "png") {
	const time = Date.now() - started;
	switch (type) {
		case "gif": {
			if (time > 30000) return 5000;
			if (time > 20000) return 10000;
			else return 15000;
		}

		case "png": {
			if (time > 30000) return 2500;
			if (time > 20000) return 5000;
			else return 10000;
		}
	}
}

export default class E621Thumbnails {
	static queue = new Map<string, QueueEntry>();
	static workers = new Map<string, Worker>();
	static checksInterval = setInterval(() => {
		Array.from(this.queue.entries()).filter(([,q]) => q.status === "processing").forEach(async([k, q]) => {
			// we can end up with ~1204995ms runtime, but 5 seconds isn't really that much of a concern
			if (Date.now() - q.startedAt >= 120000) {
				this.queue.set(k, { thread: q.thread, status: "timeout", startedAt: q.startedAt, endedAt: Date.now() });
				await this.workers.get(k)?.terminate();
				this.workers.delete(k);
			}
		});
	}, 5e3);

	static add(md5: string, type: "gif" | "png") {
		CleanupActions.add(`e621-thumbnails-${md5}-${type}`, () => this.workers.get(`${md5}-${type}`)?.terminate());
		const worker = new Worker(__filename.endsWith("ts") ? `require("ts-node").register({swc:true});require("${__dirname}/E621ThumbnailWorker.ts");` : `${__dirname}/E621ThumbnailWorker.js`, {
			eval:       __filename.endsWith("ts"),
			workerData: {
				md5,
				type
			}
		});
		const startedAt = Date.now();
		this.workers.set(`${md5}-${type}`, worker);
		this.queue.set(`${md5}-${type}`, {
			thread:  worker.threadId,
			status:  "processing",
			startedAt,
			endedAt: null
		});
		worker.on("exit", (code) => {
			this.queue.delete(`${md5}-${type}`);
			this.workers.delete(`${md5}-${type}`);
			CleanupActions.remove(`e621-thumbnails-${md5}-${type}`);
			if (code === 0) {
				Logger.getLogger("E621Thumbnails").info(`Worker ${worker.threadId} finished processing ${md5}-${type}`);
			} else {
				Logger.getLogger("E621Thumbnails").error(`Worker ${worker.threadId} exited with code ${code}`);
			}
		})
			.on("error", (err) => {
				this.queue.set(`${md5}-${type}`, {
					thread:  worker.threadId,
					status:  "error",
					startedAt,
					endedAt: Date.now()
				});
				Logger.getLogger("E621Thumbnails").error(`Worker ${worker.threadId} threw error:`, err);
			});
		return {
			url:  checkURL(md5, type),
			time: getTime(startedAt, type),
			startedAt
		};
	}

	static has(md5: string, type: "gif" | "png") {
		console.log("has", this.queue);
		return this.queue.has(`${md5}-${type}`);
	}

	static get(md5: string, type: "gif" | "png") {
		console.log("get", this.queue);
		return this.queue.get(`${md5}-${type}`);
	}

	static check(md5: string, type: "gif" | "png"): { status: QueueEntry["status"]; time?: number; startedAt?: number; url?: string; checkURL?: string; } | null {
		const entry = this.get(md5, type);
		if (!entry) return null;
		if (entry.status === "processing") return { status: "processing", time: getTime(entry.startedAt, type), startedAt: entry.startedAt, checkURL: checkURL(md5, type) };
		return { status: entry.status };
	}
}
