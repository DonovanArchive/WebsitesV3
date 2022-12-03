// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../util/@types/simple-thumbnail.d.ts" />
import mimeTypes from "../../../util/mimeTypes.json";
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
import { publicDir } from "@config";
import { APIImage, APIUsage } from "@models";
import { APIKeyFlags } from "@models/APIKey";
import Webhooks from "@util/Webhooks";
import { Router, static as serveStatic } from "express";
import bytes from "bytes";
import { resolve as rp } from "path";
import { existsSync, lstatSync, readdirSync } from "fs";
import { access, readdir } from "fs/promises";
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
			void APIUsage.track(req, "images");
			return next();
		}
	)
	.get("/online", async (req, res) => res.status(200).json({ success: true, uptime: process.uptime() }))
	.get("/categories", async (req, res) => res.status(200).json({ success: true, data: categories }))
	.get("/categories/:db", async (req, res) => {
		const c = Object.keys(categories).map(k => categories[k as keyof typeof categories]).reduce((a, b) => a.concat(b as never), []);
		if (c.map(t => t.db).includes(req.params.db)) {
			const disabled = Object.values(categories.disabled).reduce((a, b) => a.concat(b), [] as Array<typeof categories["disabled"][number]>).map(t => t.db).includes(req.params.db);
			const d = rp(`${publicDir}/V2/${req.params.db.replace(/\./g, "/")}`);
			let exists = false;
			const list = {
				total: 0,
				size:  {
					total:    0,
					totalM:   0,
					average:  0,
					averageM: 0
				},
				types: {} as Record<string, number>
			};
			if (!disabled) {
				if (existsSync(d)) {
					readdirSync(d, { withFileTypes: true }).filter(f => !f.isDirectory()).map(f => {
						list.total++;
						list.size.total += lstatSync(`${d}/${f.name}`).size;
						list.size.average = Number((list.size.total / list.total).toFixed(3));
						const ext = f.name.split(".").reverse()[0];
						let type;
						if (!Object.keys(mimeTypes).includes(ext)) type = ext;
						else type = mimeTypes[ext as keyof typeof mimeTypes];
						if (!list.types[type]) list.types[type] = 1;
						else list.types[type]++;
					});
					list.size.totalM = Number((list.size.total / 1024 / 1024).toFixed(3));
					list.size.averageM = Number((list.size.average / 1024 / 1024).toFixed(3));
					exists = true;
				} else exists = false;
			}
			return res.status(200).json({
				success: true,
				data:    {
					...c.find(t => t.db === req.params.db),
					dir:   d,
					disabled,
					files: {
						exists,
						list
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
		const id = req.params.id.replace(/\.(json|webp|png|jpg|jpeg|gif)/, "");
		const format = req.originalUrl.split("?")[0].endsWith(".json") ? 0 : 1;
		const img = await APIImage.get(id);

		if (!img) {
			if (format === 0) return res.status(404).json({
				success: false,
				error:   "No image was found with that id.",
				code:    YiffyErrorCodes.IMAGES_NOT_FOUND
			});
			else if (format === 1) return res.status(404).end();
		} else {
			if (format === 0) return res.status(200).json({
				success: true,
				data:    {
					...(await img.getJSON()),
					category: img.category
				}
			});
			else if (format === 1) {
				res.header({
					...(await img.getHeaders()),
					"X-Yiffy-Image-Category": img.category
				});
				return res.status(200).sendFile(img.fsLocation);
			}
		}
	})
	.get("/:category*", async (req, res, next) => {
		const parts = req.originalUrl.split("?")[0].split("/").filter(r => !["", "V2"].includes(r.toUpperCase())).map(r => r.toLowerCase());
		const responseType: "json" | "image" = parts[parts.length - 1] === "image" ? (parts.splice(parts.length - 1), "image") : "json";
		const limit = req.query.amount ? Number(req.query.amount) : 1;
		if (responseType === "image" && limit > 1) return res.status(400).json({
			success: false,
			error:   "Amount cannot be greater than one when requesting an image.",
			code:    YiffyErrorCodes.IMAGES_AMOUNT_GT_ONE_IMAGE
		});
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
		const category = parts.join(".");

		const images = await APIImage.getRandom(category, limit);
		const sizeLimit = bytes.parse((req.body as { sizeLimit: string; }).sizeLimit?.toString?.()) ?? -1;

		if (images.length === 0) return res.status(404).json({
			success: false,
			error:   {
				message:  "No images were found in that category.",
				type:     "filesystem",
				category: {
					db:  category,
					dir: {
						location: rp(APIImage.categoryPath(category)),
						exists:   await access(APIImage.categoryPath(category)).then(() => true, () => false),
						files:    await access(APIImage.categoryPath(category)).then(() => true, () => false) ? (await readdir(APIImage.categoryPath(category), { withFileTypes: true })).filter(f => !f.isDirectory()).length : null
					}
				}
			},
			code: YiffyErrorCodes.IMAGES_EMPTY_CATEGORY
		});

		try {
			const auth = req.query._auth as string || req.headers.authorization;
			await db.r.incr(`yiffy2:images:category:${category}`);
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
								`Response Type: **${responseType}**`,
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
			switch (responseType) {
				case "json": {
					return res.status(200).json({
						images:  await Promise.all(images.map(async(img) => img.getJSON())),
						$schema: "https://schema.yiff.rest/V2.json",
						success: true,
						notes
					});
					break;
				}

				case "image": {
					res.header(await images[0].getHeaders());
					return res.status(200).sendFile(images[0].fsLocation);
					break;
				}

				default: {
					return res.status(400).json({
						success: false,
						error:   {
							message: "invalid response type",
							type:    "client"
						},
						code: YiffyErrorCodes.IMAGES_INVALID_RESPONSE_TYPE
					});
				}
			}
		} catch (err) {
			console.error(err);
			return res.status(500).json({
				success: false,
				error:   "There was an internal error while attempting to perform that action.",
				code:    YiffyErrorCodes.INTERNAL_ERROR
			});
		}
	})
	.use("/e621-thumb/get", serveStatic("/data/e621-thumb"))
	.use(async (req, res) => res.status(404).json({
		success: false,
		error:   "Unknown api route.",
		code:    YiffyErrorCodes.UNKNOWN_ROUTE
	}));

export default app;
