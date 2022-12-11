import Website from "@lib/Website";
import express from "express";
import { fetch } from "undici";
import { access, readFile, writeFile } from "fs/promises";
import { STATUS_CODES } from "http";

async function check() {
	const run = await fetch("https://e621.net/posts.json?limit=0", {
		headers: {
			"User-Agent": "E621Status/1.0.0 (https://status.e621.ws; \"donovan_dmc\")"
		},
		method: "HEAD"
	});
	const old = await get(true);

	return run.status === old.status ? old : write(run.status);
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

export default class E621WS extends Website {
	constructor() {
		super("e621.ws", "172.19.2.9", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.init();

		setInterval(check, 120000);

		this
			.addStatic("/app/public")
			.addSubdomain("status",
				express.Router()
					.get("/", async(req, res) => {
						const { status, since } = await get();
						return res.status(200).render("status", {
							time:        since,
							state:       status >= 200 && status <= 299 ? "up" : "down",
							status:      `${status} ${STATUS_CODES[status] || ""}`,
							statusClass: status >= 200 && status <= 299 ? "success" : "error"
						});
					})
					.get("/json", async(req,res) => {
						const [current, ...history] = await getAll();

						return res.status(200).json({
							current: {
								state:         current.status >= 200 && current.status <= 299 ? "up" : "down",
								status:        current.status,
								statusMessage: STATUS_CODES[current.status] || "",
								since:         current.since
							},
							history: history.map(({ status, since }) => ({
								state:         status >= 200 && status <= 299 ? "up" : "down",
								status,
								statusMessage: STATUS_CODES[status] || "",
								since
							}))
						});
					})
			)
			.addHandler(
				express.Router().use("*", async(req, res) => res.redirect("https://status.e621.ws"))
			);
	}
}
