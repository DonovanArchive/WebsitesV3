import Logger from "../../../util/Logger";
import E621Status from "../../../db/Models/E621Status";
import { dev, discord } from "../../../config";
import E621Webhook from "../../../db/Models/E621Webhook";
import { Router, type Request } from "express";
import { fetch } from "undici";
import { Type } from "@sinclair/typebox";
import type { ExtendedUser } from "oceanic.js";
import { Client, DiscordRESTError, JSONErrorCodes } from "oceanic.js";
import { EmbedBuilder } from "@oceanicjs/builders";
import { STATUS_CODES } from "http";
import { writeFile } from "fs/promises";
async function check() {
	let status: number;
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 1e5);
		const r = (await fetch("https://e621.net/posts.json?limit=0", {
			headers: {
				"User-Agent": "E621Status/1.0.0 (https://status.e621.ws; \"donovan_dmc\")"
			},
			method: "GET",
			signal: controller.signal
		}));
		if (r.status === 503 && !r.headers.get("content-type")?.startsWith("application/json")) {
			status = 1;
		} else {
			status = r.status;
		}
		if (r.status === 501) {
			status = 200;
			await writeFile("/tmp/501", await r.text());
		}
		clearTimeout(timeout);
	} catch (err) {
		if (err instanceof Error && err.constructor.name === "DOMException" && err.name === "AbortError") {
			status = 408;
		} else if (err instanceof TypeError && (err.cause as Error)?.message.includes("EAI_AGAIN")) {
			status = (await get(true)).status;
			Logger.getLogger("e621.ws").error("Caught and ignored EAI_AGAIN error");
		} else {
			status = 0;
			Logger.getLogger("e621.ws").error(err);
		}
	}
	const old = await get(true);

	return status === old.status ? old : write(status);
}

async function get(noLoop = false): Promise<{ status: number; since: string; }> {
	const d = await E621Status.getLatest();
	if (!d) {
		if (noLoop) return { status: 0, since: new Date().toISOString() };
		const { status, since } = await check();
		return { status, since };
	} else return d;
}

async function getAll(limit = 100): Promise<Array<{ status: number; since: string; }>> {
	return E621Status.getHistory(limit);
}

async function write(status: number): Promise<{ status: number; since: string; }> {
	const since = new Date().toISOString();
	await E621Status.new({ status, since });
	const hooks = await E621Webhook.getAll();
	for (const hook of hooks) {
		await sendWebhook(hook, status, since);
	}
	return { status, since };
}

const notes: Record<number, string> = {
	0:   "Some internal issue happened while contacting e621.",
	1:   "E621 is currently in maintenance mode.",
	403: "E621 is likely experiencing some kind of attack right now, so api endpoints may be returning challenges."
};
const states: Record<number, string> = {
	0:   "error",
	1:   "maintenance",
	403: "partially down"
};
const statusMessages: Record<number, string> = {
	0: "Internal Error",
	1: "Maintenance"
};

async function sendWebhook(webhook: E621Webhook, status: number, since: string) {
	const embed = new EmbedBuilder()
		.setTitle("E621 Status Update")
		.setDescription(`E621's api is ${status >= 200 && status <= 299 ? "available" : "unavailable"}.`)
		.addField("Status", `${status} ${STATUS_CODES[status] || ""}`.trim(), true)
		.addField("State", states[status] ?? ((status >= 200 && status <= 299) ? "up" : "down"), true)
		.setColor(status >= 200 && status <= 299 ? 0x008000 : status === 403 ? 0xFFA500 : 0xFF0000)
		.setTimestamp(since)
		.setFooter("Since");
	if (notes[status]) {
		embed.addField("Note", notes[status], false);
	}
	await client.rest.webhooks.execute(webhook.webhook_id, webhook.webhook_token, {
		embeds: embed
			.toJSON(true)
	}).catch(err => {
		if (err instanceof DiscordRESTError && err.code === JSONErrorCodes.UNKNOWN_WEBHOOK) {
			return webhook.delete();
		} else {
			Logger.getLogger("e621.ws").error(webhook);
			Logger.getLogger("e621.ws").error(err);
		}
	});
}

async function validate(hooks: E621Webhook | Array<E621Webhook>) {
	if (!Array.isArray(hooks)) hooks = [hooks];
	const valid: Array<E621Webhook> = [];
	for (const hook of hooks) {
		try {
			await client.rest.webhooks.get(hook.webhook_id, hook.webhook_token);
			valid.push(hook);
		} catch (err) {
			if (err instanceof DiscordRESTError && err.code === JSONErrorCodes.UNKNOWN_WEBHOOK) {
				await hook.delete();
			} else {
				Logger.getLogger("e621.ws").error(hook);
				Logger.getLogger("e621.ws").error(err);
			}
		}
	}
	return valid;
}

if (!dev) {
	setInterval(check, 60000);
}

const client = new Client();
const app = Router();
app
	.get("/", async(req, res) => {
		const { status, since } = await get();
		switch (status) {
			case 0: {
				return res.status(200).render("status/error", { time: since });
			}

			case 1: {
				return res.status(200).render("status/maintenance", { time: since });
			}

			default: {
				return res.status(200).render("status/index", {
					time:        since,
					state:       states[status] ?? ((status >= 200 && status <= 299) ? "up" : "down"),
					status:      `${status} ${STATUS_CODES[status] || ""}`.trim(),
					statusClass: status >= 200 && status <= 299 ? "success" : "error",
					note:        notes[status] === undefined ? "" : `<h3><center>${notes[status]}</center></h3>`,
					available:   status >= 200 && status <= 299 ? "Available" : "Not Available"
				});
			}
		}
	})
	.get("/schema.json", async(req, res) => res.status(200).json(Schema))
	.get("/json", async(req,res) => {
		const limit = !req.query.limit ? 100 : Number(req.query.limit);
		const [current, ...history] = await getAll(Math.min(limit, 1000));

		return res.status(200).json({
			$schema: "https://status.e621.ws/schema.json",
			current: {
				available:     current.status >= 200 && current.status <= 299,
				state:         (states[current.status] ?? ((current.status >= 200 && current.status <= 299) ? "up" : "down")).replace(/\s/g, "-"),
				status:        current.status,
				statusMessage: statusMessages[current.status] ?? (STATUS_CODES[current.status] || ""),
				since:         current.since,
				note:          notes[current.status] ?? null
			},
			history: history.map(({ status, since }) => ({
				available:     status >= 200 && status <= 299,
				state:         (states[status] ?? ((status >= 200 && status <= 299) ? "up" : "down")).replace(/\s/g, "-"),
				status,
				statusMessage: statusMessages[status] ?? (STATUS_CODES[status] || ""),
				since
			}))
		});
	})
	.get("/discord", async(req, res) => res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${discord["e621-status-check"].id}&redirect_uri=${encodeURIComponent(discord["e621-status-check"].redirect)}&response_type=code&scope=${discord["e621-status-check"].scopes.join("%20")}`))
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
	.get("/discord/cb", async(req: Request<{}, any, any, { code: string; guild_id: string; }, Record<string, any>>, res) => {
		const { code, guild_id } = req.query;
		const exec = await client.rest.oauth.exchangeCode({
			clientID:     discord["e621-status-check"].id,
			clientSecret: discord["e621-status-check"].secret,
			code,
			redirectURI:  discord["e621-status-check"].redirect
		});

		if (!exec.webhook) {
			return res.status(400).end("No webhook was recieved from Discord. Please try again.");
		}

		let user: ExtendedUser | null = null;
		if (exec.scopes.includes("identify")) {
			const helper = client.rest.oauth.getHelper(`${exec.tokenType} ${exec.accessToken}`);
			user = await helper.getCurrentUser();
		}

		const existingChannel = await validate(await E621Webhook.getForChannel(exec.webhook.channelID!));
		if (existingChannel.length >= 1) {
			await exec.webhook.execute({
				wait:   true,
				embeds: new EmbedBuilder()
					.setTitle("E621 Status Check")
					.setThumbnail("https://status.e621.ws/icon.png")
					.setURL("https://status.e621.ws")
					.setDescription("You already have a status check enabled in this channel. Delete the other webhook to use a new webhook. This webhook will be automatically deleted.")
					.setTimestamp(new Date().toISOString())
					.setColor(0x012E57)
					.toJSON(true)
			});
			await exec.webhook.deleteToken();
			return res.status(409).end("You already have a status check enabled in that channel. Delete the other webhook to use a new webhook. The newly created webhook will be automatically deleted.");
		}

		const existingGuild = await validate(await E621Webhook.getForGuild(guild_id));
		if (existingGuild.length >= 5) {
			await exec.webhook.execute({
				wait:   true,
				embeds: new EmbedBuilder()
					.setTitle("E621 Status Check")
					.setThumbnail("https://status.e621.ws/icon.png")
					.setURL("https://status.e621.ws")
					.setDescription("You've already enabled 5 status checks in this server. Please delete the other webhooks before adding a new check. This webhook will be automatically deleted.")
					.setTimestamp(new Date().toISOString())
					.setColor(0x012E57)
					.toJSON(true)
			});
			await exec.webhook.deleteToken();
			return res.status(409).end("You've already enabled 5 status checks in that server. Please delete the other webhooks before adding a new check. The newly created webhook will be automatically deleted.");
		}

		const hook = await E621Webhook.new({
			guild_id,
			channel_id:    exec.webhook.channelID!,
			webhook_id:    exec.webhook.id,
			webhook_token: exec.webhook.token!,
			creator_id:    user?.id ?? null
		});

		await exec.webhook.execute({
			embeds: new EmbedBuilder()
				.setTitle("E621 Status Check")
				.setThumbnail("https://status.e621.ws/icon.png")
				.setURL("https://status.e621.ws")
				.setDescription(`This webhook has been setup to recieve status updates for e621's api${user ? ` by ${user.mention}` : ""}.`)
				.setTimestamp(new Date().toISOString())
				.setColor(0x012E57)
				.toJSON(true)
		});

		const latest = await get();
		await sendWebhook(hook!, latest.status, latest.since);
		return res.status(200).end("Check successfully setup. Delete the webhook to disable the updates.");
	});

const Schema = Type.Object({
	current: Type.Object({
		available: Type.Boolean(),
		state:     Type.String({
			enum: ["up", "down", "partially-down", "maintenance", "error"]
		}),
		status:        Type.Number(),
		statusMessage: Type.String(),
		since:         Type.String(),
		note:          Type.Union([Type.Null(), Type.String()])
	}),
	history: Type.Array(Type.Object({
		available: Type.Boolean(),
		state:     Type.String({
			enum: ["up", "down", "partially-down", "maintenance", "error"]
		}),
		status:        Type.Number(),
		statusMessage: Type.String(),
		since:         Type.String()
	}))
});

export default app;
