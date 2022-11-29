import E621Thumbnails, { filePath, url } from "../../../lib/E621Thumbnails";
import { APIKey } from "../../../db/Models";
import RateLimiter from "../util/RateLimiter";
import { Router } from "express";
import E621 from "e621";
import { access } from "fs/promises";
import type { PathLike } from "fs";

const app = Router();

const e6 = new E621({ userAgent: "E621Thumbnailer/1.0.0 (donovan_dmc)" });
const exists = (path: PathLike) => access(path).then(() => true, () => false);
app
	.use(async(req, res, next) => {
		if (!req.headers.authorization) return res.status(401).json({ success: false, error: "An API key is required to use this service." });
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

		if (!key.thumbsAccess) return res.status(403).json({
			success: false,
			error:   "You do not have access to this service."
		});

		const r = await RateLimiter.process(req, res, key.windowLong, key.limitLong, key.windowShort, key.limitShort);
		if (!r) return;

		return next();
	})
	.get("/:id", async(req, res) => {
		let md5: string;
		if (!isNaN(Number(req.params.id)) && !/[a-f\d]{32}/i.test(req.params.id)) {
			const post = await e6.posts.get(Number(req.params.id));
			if (!post) return res.status(404).json({ success: false, error: "Invalid Post ID" });
			md5 = post.file.md5;
		} else md5 = req.params.id;
		if (!/[a-f\d]{32}/i.test(md5)) return res.status(404).json({ success: false, error: "Invalid MD5" });
		const gifExists = await exists(filePath(md5, "gif"));
		const pngExists = await exists(filePath(md5, "png"));
		return res.status(200).json({
			success: true,
			gifURL:  gifExists ? url(md5, "gif") : null,
			pngURL:  pngExists ? url(md5, "png") : null
		});
	})
	.put("/:id/:type", async(req, res) => {
		let md5: string;
		if (!isNaN(Number(req.params.id)) && !/[a-f\d]{32}/i.test(req.params.id)) {
			const post = await e6.posts.get(Number(req.params.id));
			if (!post) return res.status(404).json({ success: false, error: "Invalid Post ID" });
			md5 = post.file.md5;
		} else md5 = req.params.id;
		if (!/[a-f\d]{32}/i.test(md5)) return res.status(404).json({ success: false, error: "Invalid MD5" });
		const type = req.params.type.toLowerCase() as "gif" | "png";
		if (!["gif", "png"].includes(type)) return res.status(404).json({ success: false, error: "Invalid Type" });
		const existing = await exists(filePath(md5, type));
		if (existing) return res.status(200).json({ success: true, status: "done", url: url(md5, type) });
		const inQueue = E621Thumbnails.has(md5, type);
		if (inQueue) {
			const check = E621Thumbnails.check(md5, type)!;
			if (check.status === "error") return res.status(500).json({ success: false, status: "error" });
			return res.status(202).json({ success: true, ...check });
		}
		const check = E621Thumbnails.add(md5, type);
		return res.status(202).json({ success: true, status: "processing", checkURL: check.url, checkAt: Date.now() + check.time, time: check.time, startedAt: check.startedAt });
	})
	.get("/check/:md5/:type", async(req,res) => {
		const md5 = req.params.md5;
		if (!/[a-f\d]{32}/i.test(md5)) return res.status(404).json({ success: false, error: "Invalid MD5" });
		const type = req.params.type.toLowerCase() as "gif" | "png";
		if (!["gif", "png"].includes(type)) return res.status(404).json({ success: false, error: "Invalid Type" });
		const existing = await exists(filePath(md5, type));
		if (existing) return res.status(201).json({ success: true, status: "done", url: url(md5, type) });
		const inQueue = E621Thumbnails.has(md5, type);
		if (inQueue) {
			const check = E621Thumbnails.check(md5, type)!;
			return res.status(200).json({ success: true, ...check });
		}
		return res.status(404).json({ success: false, error: "Not Found" });
	});

export default app;
