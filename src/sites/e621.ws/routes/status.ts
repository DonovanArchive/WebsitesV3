import Logger from "../../../util/Logger";
import { Router } from "express";
import { fetch } from "undici";
import { access, readFile, writeFile } from "fs/promises";
import { STATUS_CODES } from "http";

async function check() {
	let status: number;
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1e5);
		status = (await fetch("https://e621.net/posts.json?limit=0", {
			headers: {
				"User-Agent": "E621Status/1.0.0 (https://status.e621.ws; \"donovan_dmc\")"
			},
			method: "HEAD",
			signal: controller.signal
		})).status;
		clearTimeout(timeout);
	} catch (err) {
		if (err instanceof Error && err.constructor.name === "DOMException" && err.name === "AbortError") {
			status = 408;
		} else {
			status = 0;
			Logger.getLogger("e621.ws").error(err);
		}
	}
	const old = await get(true);

	return status === old.status ? old : write(status);
}

async function get(noLoop = false): Promise<{ status: number; since: string; }> {
	if (!(await access("/data/cache/status.json").then(() => true, () => false))) {
		if (noLoop) return { status: 404, since: new Date().toISOString() };
		const { status, since } = await check();
		return { status, since };
	}

	const data = JSON.parse(await readFile("/data/cache/status.json", "utf8")) as Array<{ status: number; since: string; }>;
	return data[0];
}

async function getAll(): Promise<Array<{ status: number; since: string; }>> {
	if (!(await access("/data/cache/status.json").then(() => true, () => false))) {
		const { status, since } = await check();
		return [{ status, since }];
	}

	const data = JSON.parse(await readFile("/data/cache/status.json", "utf8")) as Array<{ status: number; since: string; }>;
	return data;
}

async function write(status: number): Promise<{ status: number; since: string; }> {
	const since = new Date().toISOString();
	if (!(await access("/data/cache/status.json").then(() => true, () => false))) {
		await writeFile("/data/cache/status.json", JSON.stringify([{ status, since }]));
		return { status, since };
	}

	const data = JSON.parse(await readFile("/data/cache/status.json", "utf8")) as Array<{ status: number; since: string; }>;
	await writeFile("/data/cache/status.json", JSON.stringify([
		{ status, since },
		...data
	].slice(0, 20)));
	return { status, since };
}

const notes: Record<number, string> = {
	0:   "Some internal issue happened while contacting e621.",
	503: "E621 is likely experiencing some kind of attack right now, so api endpoints may be returning challenges."
};

setInterval(check, 60000);

const app = Router();
app
	.get("/", async(req, res) => {
		const { status, since } = await get();
		return res.status(200).render("status", {
			time:        since,
			state:       status >= 200 && status <= 299 ? "up" : status === 503 ? "partially down" : "down",
			status:      `${status} ${status === 0 ? "Internal Error" : STATUS_CODES[status] || ""}`.trim(),
			statusClass: status === 0 ? "unreachable" : status >= 200 && status <= 299 ? "success" : status === 503 ? "partially down" : "error",
			note:        notes[status] === undefined ? "" : `<h3><center>${notes[status]}</center></h3>`
		});
	})
	.get("/json", async(req,res) => {
		const [current, ...history] = await getAll();

		return res.status(200).json({
			current: {
				state:         current.status >= 200 && current.status <= 299 ? "up" : "down",
				status:        current.status,
				statusMessage: current.status === 0 ? "Internal Error" : STATUS_CODES[current.status] || "",
				since:         current.since,
				note:          notes[current.status] ?? null
			},
			history: history.map(({ status, since }) => ({
				state:         status >= 200 && status <= 299 ? "up" : "down",
				status,
				statusMessage: status === 0 ? "Internal Error" : STATUS_CODES[status] || "",
				since
			}))
		});
	});

export default app;
