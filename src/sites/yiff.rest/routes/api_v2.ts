// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../util/@types/simple-thumbnail.d.ts" />
import { YiffyErrorCodes } from "../../../util/Constants";
import categories from "../util/categories.json";
import yiffyNotes from "../util/notes.json";
import {
	checkForBlock,
	validateAPIKey,
	handleRateLimit,
	diskSpaceCheck,
	userAgentCheck
} from "../../../util/checks";
import db from "../../../db";
import Logger from "../../../util/Logger";
import { READONLY, sfwOnlyIP } from "../../../config";
import { APIImage, APIUsage } from "@models";
import APIKey, { APIKeyFlags } from "@models/APIKey";
import Webhooks from "@util/Webhooks";
import { Router } from "express";
import bytes from "bytes";
import dot from "dot-object";

async function getStats(ip: string, key?: string) {
	const list = categories.enabled.map(c => c.db);
	const enabledCount = categories.enabled.length;
	const pr = (str: string) => categories.enabled.map(c => `${str}:${c.db}`);
	const keys = [
		"yiffy2:stats:images:total",
		...pr("yiffy2:stats:images:total"),
		`yiffy2:stats:images:ip:${ip}`,
		...pr(`yiffy2:stats:images:ip:${ip}`)
	];
	if (key) {
		keys.push(`yiffy2:stats:images:key:${key}`, ...pr(`yiffy2:stats:images:key:${key}`));
	}
	const values = await db.r.mget(keys);
	const total = Number(values.shift()!);
	const totalSpecific = values.splice(0, enabledCount);
	const ipTotal = Number(values.shift()!);
	const ipSpecific = values.splice(0, enabledCount);
	const keyTotal = key ? Number(values.shift()!) : 0;
	const keySpecific = key ? values.splice(0, enabledCount) : [];
	const stats = {
		global: {
			total
		} as Record<string, number | Record<string, number | Record<string, number>>>,
		ip: {
			total: ipTotal
		} as Record<string, number | Record<string, number | Record<string, number>>>,
		key: (key ? {
			total: keyTotal
		} : null) as Record<string, number | Record<string, number | Record<string, number>>> | null
	};
	for (const cat of list) {
		const statTotal = totalSpecific[list.indexOf(cat)];
		const statIP = ipSpecific[list.indexOf(cat)];
		const statKey = keySpecific[list.indexOf(cat)];
		dot.set(cat, Number(statTotal), stats.global);
		dot.set(cat, Number(statIP), stats.ip);
		if (key) {
			dot.set(cat, Number(statKey), stats.key!);
		}
	}

	return stats;
}
const app = Router();
app
	.get("/robots.txt", async(req, res) => res.header("Content-Type", "text/plain").status(200).end("User-Agent: *\nDisallow: /"))
	.get("/state", async (req, res) => res.redirect("https://state.yiff.rest"))
	.get("/online", async (req, res) => res.status(200).json({ success: true, uptime: process.uptime() }))
	.use(
		checkForBlock,
		diskSpaceCheck,
		userAgentCheck,
		validateAPIKey(false, APIKeyFlags.IMAGES),
		handleRateLimit,
		async(req, res, next) => {
			if (!READONLY) {
				void APIUsage.track(req, "images");
			}
			return next();
		}
	)
	.get("/online", async (req, res) => res.status(200).json({ success: true, uptime: process.uptime() }))
	.get("/stats", async(req, res) => res.status(200).json({
		success: true,
		data:    await getStats(req.ip, req.query._auth as string || req.headers.authorization)
	}))
	.get("/categories", async (req, res) => res.status(200).json({ success: true, data: categories }))
	.get("/categories/:db", async (req, res) => {
		const c = Object.keys(categories).map(k => categories[k as keyof typeof categories]).reduce((a, b) => a.concat(b as never), []);
		if (c.map(t => t.db).includes(req.params.db)) {
			const disabled = Object.values(categories.disabled).reduce((a, b) => a.concat(b), [] as Array<typeof categories["disabled"][number]>).map(t => t.db).includes(req.params.db);
			return res.status(200).json({
				success: true,
				data:    {
					...c.find(t => t.db === req.params.db),
					dir:   null,
					disabled,
					files: {
						exists: null,
						list:   {
							total: 0,
							size:  {
								total:    0,
								totalM:   0,
								average:  0,
								averageM: 0
							},
							types: {}
						}
					}
				}
			});
		} else return res.status(404).json({
			success: false,
			error:   {
				message: "Category not found in list."
			},
			code: YiffyErrorCodes.IMAGES_CATEGORY_NOT_FOUND
		});
	})
	.get("/images/:id", async(req, res) => {
		const img = await APIImage.get(req.params.id.replace(/\.json$/, ""));

		if (!img) {
			return res.status(404).json({
				success: false,
				error:   "No image was found with that id.",
				code:    YiffyErrorCodes.IMAGES_NOT_FOUND
			});
		} else {
			return res.status(200).json({
				success: true,
				data:    {
					...(await img.toJSON()),
					category: img.category
				}
			});
		}
	})
	.post("/bulk", validateAPIKey(true, APIKeyFlags.IMAGES_BULK), async(req, res) => {
		const key = await APIKey.getOrThrow((req.query._auth as string || req.headers.authorization)!);
		if (!req.headers["content-type"]?.includes("application/json") || !req.body || typeof req.body !== "object" || Array.isArray(req.body) || req.body === null || Object.keys(req.body as object).length === 0) return res.status(400).json({
			success: false,
			error:   "Invalid body, or no categories specified.",
			code:    YiffyErrorCodes.BULK_IMAGES_INVALID_BODY
		});
		const sizeLimit = bytes.parse((req.query as { sizeLimit: string; }).sizeLimit?.toString?.()) ?? -1;
		const valid = [
			"chris",
			...categories.enabled.map(e => e.db)
		];
		const sfwCategories = categories.enabled.filter(e => e.sfw).map(e => e.db);
		const sfwOnly = key.sfwOnly || sfwOnlyIP.includes(req.ip);
		let total = 0;
		for (const [cat, amount] of Object.entries(req.body as object)) {
			if (sfwOnly && !sfwCategories.includes(cat)) return res.status(403).json({
				success: false,
				error:   `You are only allowed to access sfw categories, and the category "${cat}" is not SFW.`,
				code:    YiffyErrorCodes.IMAGES_SFW_ONLY_API_KEY
			});
			if (!valid.includes(cat)) return res.status(400).json({
				success: false,
				error:   `Invalid category specified: ${cat}`,
				code:    YiffyErrorCodes.BULK_IMAGES_INVALID_CATEGORY
			});
			total += amount;
		}
		if (total > key.bulkLimit) return res.status(400).json({
			success: false,
			error:   `Total amount of images requested is greater than ${key.bulkLimit} (${total}).`,
			code:    YiffyErrorCodes.BULK_IMAGES_NUMBER_GT_MAX
		});

		const data: Record<string, Array<Awaited<ReturnType<APIImage["toJSON"]>>>> = {};
		for (const [cat, amount] of Object.entries(req.body as object)) {
			const images = await APIImage.getRandom(cat, amount as number, sizeLimit);
			data[cat] = await Promise.all(images.map(i => i.toJSON()));
		}


		const auth = req.query._auth as string || req.headers.authorization;
		const hasNSFW = Object.keys(req.body as object).some(k => !sfwCategories.includes(k));
		if (!READONLY) {
			await db.r.incr("yiffy2:images:bulk");
			const m = db.r.multi()
				.incr(`yiffy2:stats:images:ip:${req.ip}`)
				.incr(`yiffy2:stats:images:ip:${req.ip}:bulk`)
				.incr("yiffy2:stats:images:total")
				.incr("yiffy2:stats:images:total:bulk");
			if (auth) {
				m.incr(`yiffy2:stats:images:key:${auth}`)
					.incr(`yiffy2:stats:images:key:${auth}:bulk`);
			}
			for (const [cat, amount] of Object.entries(req.body as object)) {
				m.incrby(`yiffy2:stats:images:ip:${req.ip}:${cat}`, Number(amount))
					.incrby(`yiffy2:stats:images:total:${cat}`, Number(amount));
				if (auth) {
					m.incrby(`yiffy2:stats:images:key:${auth}:${cat}`, Number(amount));
				}
			}
			await m.exec();
		}

		try {
			void Webhooks.get("yiffy").execute({
				embeds: [
					{
						title:       "V2 API Request",
						description: [
							`Host: **${req.headers.host!}**`,
							`Path: **${req.originalUrl}**`,
							"Category: `Bulk`",
							`Auth: ${auth ? `**Yes** (\`${auth}\`)` : "**No**"}`,
							`Size Limit: **${sizeLimit === -1 ? "None" : bytes(sizeLimit)}**`,
							`User Agent: \`${req.headers["user-agent"]!}\``,
							`IP: **${req.ip}**`,
							"",
							"**Categories:**",
							...Object.entries(req.body as object).map(([cat, amount]) => `• **${cat}**: ${String(amount)}`)
						].join("\n"),
						color:     hasNSFW ? 0xDC143C : 0x008000,
						timestamp: new Date().toISOString()
					}
				]
			});
		} catch (err) {
			Logger.getLogger(`${req.hostname}:${req.path}`).error("Failed To Send Webhook:", err);
		}

		return res.status(200).json({
			success: true,
			data
		});
	})
	.get("/:category*", async (req, res, next) => {
		const parts = req.originalUrl.split("?")[0].split("/").filter(r => !["", "V2"].includes(r.toUpperCase())).map(r => r.toLowerCase());
		if (req.originalUrl.endsWith("/image")) {
			return res.status(404).json({
				success: false,
				error:   "Image response has been disabled. Please use the json response.",
				code:    YiffyErrorCodes.IMAGES_IMAGE_RESPONSE_DISABLED
			});
		}
		const limit = req.query.amount ? Number(req.query.amount) : 1;
		if (limit < 1) return res.status(400).json({
			success: false,
			error:   "Amount must be 1 or more.",
			code:    YiffyErrorCodes.IMAGES_AMOUNT_LT_ONE
		});
		if (limit > 5) return res.status(400).json({
			success: false,
			error:   "Amount must be 5 or less.",
			code:    YiffyErrorCodes.IMAGES_AMOUNT_GT_FIVE
		});

		const valid = [
			"chris",
			...Object.values(categories.enabled).map(k => k.db.split(".")[0])
		];
		if (!Array.from(new Set(valid)).includes(parts[0])) return next();
		const auth = req.query._auth as string || req.headers.authorization;
		const key = auth ? await APIKey.get(auth) : null;
		const sfwCategories = categories.enabled.filter(e => e.sfw).map(e => e.db);
		const sfwOnly = key?.sfwOnly || sfwOnlyIP.includes(req.ip);
		const category = parts.join(".");
		if (sfwOnly && !sfwCategories.includes(category)) return res.status(403).json({
			success: false,
			error:   `You are only allowed to access sfw categories, and the category "${category}" is not SFW.`,
			code:    YiffyErrorCodes.IMAGES_SFW_ONLY_API_KEY
		});
		const list = [
			"chris",
			...Object.values(categories.enabled).map(k => k.db)
		];
		if (!list.includes(category)) return res.status(404).json({
			success: false,
			error:   "Category not found.",
			code:    YiffyErrorCodes.IMAGES_CATEGORY_NOT_FOUND
		});

		const sizeLimit = bytes.parse((req.query as { sizeLimit: string; }).sizeLimit?.toString?.()) ?? -1;
		const images = await APIImage.getRandom(category, limit, sizeLimit);

		if (images.length === 0) return res.status(400).json({
			success: false,
			error:   {
				message: "No results were found. Try changing your search parameters."
			},
			code: YiffyErrorCodes.IMAGES_NO_RESULTS
		});

		try {
			if (!READONLY) {
				await db.r.incr(`yiffy2:images:category:${category}`);
				const m = db.r.multi()
					.incr(`yiffy2:stats:images:ip:${req.ip}`)
					.incr(`yiffy2:stats:images:ip:${req.ip}:${category}`)
					.incr("yiffy2:stats:images:total")
					.incr(`yiffy2:stats:images:total:${category}`);
				if (auth) {
					m.incr(`yiffy2:stats:images:key:${auth}`)
						.incr(`yiffy2:stats:images:key:${auth}:${category}`);
				}
				await m.exec();
			}
			const notes: Array<{ id: number; content: string | null; }> = [];
			if ((req.query.notes ?? "").toString().toLowerCase() !== "disabled") {
				if (req.headers.host === "api.furry.bot") notes.push(yiffyNotes[1]);
				else if (req.headers.host !== "v2.yiff.rest") notes.push(yiffyNotes[2]);
				if (!auth) notes.push(yiffyNotes[3]);
				if (sizeLimit === -1) notes.push(yiffyNotes[5]);
				notes.push(yiffyNotes[6], yiffyNotes[7], yiffyNotes[8]);
			}

			try {
				void Webhooks.get("yiffy").execute({
					embeds: [
						{
							title:       "V2 API Request",
							description: [
								`Host: **${req.headers.host!}**`,
								`Path: **${req.originalUrl}**`,
								`Category: \`${category}\``,
								`Auth: ${auth ? `**Yes** (\`${auth}\`)` : "**No**"}`,
								`Size Limit: **${sizeLimit === -1 ? "None" : bytes(sizeLimit)}**`,
								`User Agent: \`${req.headers["user-agent"]!}\``,
								`IP: **${req.ip}**`
							].join("\n"),
							color:     category.startsWith("animals") ? 0xFFD700 : ["furry.bulge", "furry.butts"].includes(category) || category.startsWith("furry.yiff") ? 0xDC143C : 0x008000,
							timestamp: new Date().toISOString()
						}
					]
				});
			} catch (err) {
				Logger.getLogger(`${req.hostname}:${req.path}`).error("Failed To Send Webhook:", err);
			}

			return res.status(200).json({
				images:  await Promise.all(images.map(async(img) => img.toJSON())),
				$schema: "https://schema.yiff.rest/V2.json",
				success: true,
				notes
			});
		} catch (err) {
			console.error(err);
			return res.status(500).json({
				success: false,
				error:   "There was an internal error while attempting to perform that action.",
				code:    YiffyErrorCodes.INTERNAL_ERROR
			});
		}
	})
	.use(async (req, res) => res.status(404).json({
		success: false,
		error:   "Unknown api route.",
		code:    YiffyErrorCodes.UNKNOWN_ROUTE
	}));

export default app;
