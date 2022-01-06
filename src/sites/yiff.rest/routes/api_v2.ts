// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../../util/@types/simple-thumbnail.d.ts" />
import mimeTypes from "../../../util/mimeTypes.json";
import {
	yiffyNotes,
	categories,
	publicDir,
	secretKey,
	e621Thumb,
	userAgent
} from "@config";
import db from "@db";
import diskSpaceCheck from "@util/diskSpaceCheck";
import userAgentCheck from "@util/userAgentCheck";
import { APIKey, APIImage, APIUsage } from "@models";
import Webhooks from "@util/Webhooks";
import ezgifPreview from "@util/ezgifPreview";
import type { Request } from "express";
import { Router, static as serveStatic } from "express";
import { RateLimiterRedis } from "rate-limiter-flexible";
import bytes from "bytes";
import ffmpeg from "fluent-ffmpeg";
import p from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import thumb from "simple-thumbnail";
import type { ThenArg } from "@uwu-codes/types";
import fetch from "node-fetch";
import { resolve as rp } from "path";
import {
	createWriteStream,
	existsSync,
	lstatSync,
	readdirSync,
	unlinkSync,
	writeFileSync
} from "fs";
import { randomBytes } from "crypto";
import { tmpdir } from "os";
import { spawnSync } from "child_process";
const app = Router();

const rlWithoutKey = new RateLimiterRedis({
	storeClient: db.r,
	points:      1,
	duration:    1,
	keyPrefix:   "rl:yiff.rest:withoutKey"
});

const rlWithKey = new RateLimiterRedis({
	storeClient: db.r,
	points:      2,
	duration:    1,
	keyPrefix:   "rl:yiff.rest:withKey"
});

app
	.get("/state", async (req, res) => res.redirect("https://state.yiff.rest"))
	.get("/online", async (req, res) => res.status(200).json({ success: true, uptime: process.uptime() }))
	.use(
		diskSpaceCheck,
		userAgentCheck,
		async(req, res, next) => {
			if (!req.headers.authorization) {
				res.header({
					"X-RateLimit-Limit":     1,
					"X-RateLimit-Remaining": rlWithoutKey.points,
					"X-RateLimit-Reset":     new Date(Date.now() + rlWithoutKey.msBlockDuration)
				});
				return rlWithoutKey.consume(req.socket.remoteAddress!, 1)
					.then(() => next())
					.catch(() => res.header("Retry-After", (rlWithoutKey.msBlockDuration / 1000).toString()).status(429).json({ success: false, error: "Too many requests." }));
			} else {
				if (req.headers.authorization === secretKey) return next();
				const key = await APIKey.get(req.headers.authorization);
				if (!key) return res.status(401).json({
					success: false,
					error:   "Invalid api key."
				});

				if (key.active === false) return res.status(401).json({
					success: false,
					error:   "Api key is inactive."
				});

				if (key.disabled === true) return res.status(403).json({
					success: false,
					error:   "Your api key has been disabled by an administrator. See \"extra.reason\" for the reasoning.",
					extra:   {
						reason:  key.disabledReason,
						support: "https://yiff.rest/support"
					}
				});

				if (key.unlimited) {
					res.header({
						"X-RateLimit-Limit":     999,
						"X-RateLimit-Remaining": 999,
						"X-RateLimit-Reset":     0
					});
					return next();
				} else {
					res.header({
						"X-RateLimit-Limit":     2,
						"X-RateLimit-Remaining": rlWithKey.points,
						"X-RateLimit-Reset":     new Date(Date.now() + rlWithKey.msBlockDuration)
					});
					return rlWithKey.consume(req.socket.remoteAddress!, 1)
						.then(() => next())
						.catch(() => res.header("Retry-After", (rlWithKey.msBlockDuration / 1000).toString()).status(429).json({ success: false, error: "Too many requests." }));
				}
			}
		}
	)
	.get("/online", async (req, res) => res.status(200).json({ success: true, uptime: process.uptime() }))
	.get("/categories", async (req, res) => res.status(200).json({ success: true, data: categories }))
	.get("/categories/:db", async (req, res) => {
		const c = Object.keys(categories).map(k => categories[k as keyof typeof categories]).reduce((a, b) => a.concat(b), []);
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
			}
		});
	})
	.get("/images/:id", async(req, res) => {
		const id = req.params.id.replace(/\.(json|webp|png|jpg|jpeg|gif)/, "");
		const format = req.originalUrl.split("?")[0].endsWith(".json") ? 0 : 1;
		const img = await APIImage.get(id);

		if (!img) {
			if (format === 0) return res.status(404).json({
				success: false,
				error:   "No image was found with that id."
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
		if (responseType === "image" && limit > 1) return res.status(400).json({ success: false, error: "Amount cannot be greater than one when requesting an image." });
		if (limit < 1) return res.status(400).json({ success: false, error: "Amount must be 1 or more." });
		if (limit > 5) return res.status(400).json({ success: false, error: "Amount must be 5 or less." });

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
						exists:   existsSync(APIImage.categoryPath(category)),
						files:    existsSync(APIImage.categoryPath(category)) ? readdirSync(APIImage.categoryPath(category), { withFileTypes: true }).filter(f => !f.isDirectory()).length : null
					}
				}
			}
		});

		try {
			void APIUsage.track(category, req);
			const notes: Array<{ id: number; content: string | null; }> = [];
			if ((req.query.notes ?? "").toString().toLowerCase() !== "disabled") {
				if (req.headers.host === "api.furry.bot") notes.push(yiffyNotes[1]);
				else if (req.headers.host !== "v2.yiff.rest") notes.push(yiffyNotes[2]);
				if (!req.headers.authorization) notes.push(yiffyNotes[3]);
				if (sizeLimit === -1) notes.push(yiffyNotes[5]);
				notes.push(yiffyNotes[6]);
			}

			void Webhooks.get("yiffy").execute({
				embeds: [
					{
						title:       "V2 API Request",
						description: [
							`Host: **${req.headers.host!}**`,
							`Path: **${req.originalUrl}**`,
							`Category: \`${category}\``,
							`Auth: ${req.headers.authorization ? `**Yes** (\`${req.headers.authorization}\`)` : "**No**"}`,
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
						}
					});
				}
			}
		} catch (err) {
			console.error(err);
			return res.status(500).json({
				success: false,
				error:   "There was an internal error while attempting to perform that action."
			});
		}
	})
	.use("/e621-thumb/get", serveStatic("/data/e621-thumb"))
	.post("/e621-thumb/create", async(req: Request<never, unknown, Record<string, string>>, res) => {
		if (req.headers.authorization !== e621Thumb) return res.status(401).end("Not Authorized.");
		const d = Date.now();

		if (!req.body.url) return res.status(400).json({
			success: false,
			error:   "Invalid or no url provided."
		});

		let len = 0;
		await new Promise<void>((resolve) => {
			void fetch(req.body.url, {
				method:  "GET",
				headers: {
					"User-Agent": userAgent
				}
			})
				.then((r) =>{
					const id = randomBytes(32).toString("hex");
					r.body.pipe(createWriteStream(`${tmpdir()}/${id}`));
					r.body.on("end", () => {
						const [,hour, minute, second] = spawnSync("ffprobe", [`${tmpdir()}/${d}`])
							.stderr.toString().match(/Duration: (\d\d):(\d\d):(\d\d\.\d\d)/) || ["0", "0", "0", "0"];
						len += Number(hour)   * 3600;
						len += Number(minute) * 60;
						len += Number(second);
						resolve();
					});
				});
		});
		let v = Math.floor((Math.random() * (len / 3)) + (len / 3));
		if (v > len) v = 0;
		const id = Buffer.from(req.body.url, "ascii").toString("base64").replace(/=/g, "");
		if (req.body.type === "image" && existsSync(`/data/e621-thumb/${id}.png`)) {
			if (req.body.responseType === "image") return res.status(200).sendFile(`/data/e621-thumb/${id}.png`);
			else return res.status(200).json({
				success: true,
				data:    {
					url:        `https://v2.yiff.rest/e621-thumb/get/${id}.png?nc=${d}`,
					startTime:  null,
					endTime:    null,
					createTime: null,
					temp:       null
				}
			});
		} else if (req.body.type !== "image" && existsSync(`/data/e621-thumb/${id}.gif`)) {
			if (req.body.responseType === "image") return res.status(200).sendFile(`/data/e621-thumb/${id}.gif`);
			else return res.status(200).json({
				success: true,
				data:    {
					url:        `https://v2.yiff.rest/e621-thumb/get/${id}.gif?nc=${d}`,
					startTime:  null,
					endTime:    null,
					createTime: null,
					temp:       null
				}
			});
		}
		const l = Number(req.body.length) || 2.5;
		const start = `00:${Math.floor(v / 60).toString().padStart(2, "0")}:${(v % 60).toString().padStart(2, "0")}`;
		const end = `00:${Math.floor((v + l) / 60).toString().padStart(2, "0")}:${((v + l) % 60).toString().padStart(2, "0")}`;

		if ((req.body as { type: string; }).type === "image") {
			if (existsSync(`/data/e621-thumb/${id}.png`)) unlinkSync(`/data/e621-thumb/${id}.png`);
			await new Promise<void>((a,b) => {
				ffmpeg(req.body.url)
					.setFfmpegPath(p)
					.setFfprobePath(ffprobe.path)
					.output(`/data/e621-thumb/${id}.webm`)
					.setStartTime(v)
					.setDuration(l)
					.withVideoCodec("copy")
					.withAudioCodec("copy")
					.on("end", (err) => err ? b(err) : a())
					.on("error", function (err) {
						console.log("error: ", err);
						b(err);
					})
					.run();
			});
			await thumb(`/data/e621-thumb/${id}.webm`, `/data/e621-thumb/${id}.png`, "100%");
			unlinkSync(`/data/e621-thumb/${id}.webm`);
			if (req.body.responseType === "image") return res.status(200).sendFile(`/data/e621-thumb/${id}.png`);
			else return res.status(200).json({
				success: true,
				data:    {
					url:        `https://v2.yiff.rest/e621-thumb/get/${id}.png?nc=${d}`,
					startTime:  start,
					endTime:    end,
					createTime: null,
					temp:       null
				}
			});
		} else {
			let r: ThenArg<ReturnType<typeof ezgifPreview>>;
			try {
				r = await ezgifPreview(req.body.url, v, v + 1, l);
			} catch (e: unknown) {
				return res.status(500).json({
					success: false,
					error:   {
						name:    (e as Error).name,
						message: (e as Error).message,
						stack:   (e as Error).stack,
						raw:     e
					}
				});
			}
			writeFileSync(`/data/e621-thumb/${id}.gif`, r.out);
			if (req.body.responseType === "image") return res.status(200).sendFile(`/data/e621-thumb/${id}.gif`);
			else return res.status(200).json({
				success: true,
				data:    {
					url:        `https://v2.yiff.rest/e621-thumb/get/${id}.gif?nc=${d}`,
					startTime:  start,
					endTime:    end,
					createTime: r.time,
					temp:       r.tempURL
				}
			});
		}
	})
	.use(async (req, res) => res.status(404).json({
		success: false,
		error:   "Unknown api route."
	}));

export default app;
