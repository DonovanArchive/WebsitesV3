import E621Thumbnails, { filePath, url } from "../../../lib/E621Thumbnails";
import { APIKeyFlags, APIUsage } from "../../../db/Models";
import { YiffyErrorCodes } from "../../../util/Constants";
import handleRateLimit, { userAgentCheck, validateAPIKey } from "../../../util/checks";
import checkForBlock from "../../../util/checkForBlock";
import { Router } from "express";
import E621 from "e621";
import { access } from "fs/promises";
import type { PathLike } from "fs";

const app = Router();

const e6 = new E621({ userAgent: "E621Thumbnailer/1.0.0 (donovan_dmc)" });
const exists = (path: PathLike) => access(path).then(() => true, () => false);
app
	.use(
		checkForBlock,
		userAgentCheck,
		validateAPIKey(true, APIKeyFlags.THUMBS),
		handleRateLimit,
		async(req, res, next) => {
			void APIUsage.track(req, "thumbs");
			return next();
		}
	)
	.get("/:id", async(req, res) => {
		let md5: string;
		if (!isNaN(Number(req.params.id)) && !/[a-f\d]{32}/i.test(req.params.id)) {
			const post = await e6.posts.get(Number(req.params.id));
			if (!post) return res.status(404).json({
				success: false,
				error:   "Invalid Post ID",
				code:    YiffyErrorCodes.THUMBS_INVALID_POST_ID
			});
			md5 = post.file.md5;
		} else md5 = req.params.id;
		if (!/[a-f\d]{32}/i.test(md5)) return res.status(404).json({
			success: false,
			error:   "Invalid MD5",
			code:    YiffyErrorCodes.THUMBS_INVALID_MD5
		});
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
			if (!post) return res.status(404).json({
				success: false,
				error:   "Invalid Post ID",
				code:    YiffyErrorCodes.THUMBS_INVALID_POST_ID
			});
			md5 = post.file.md5;
		} else md5 = req.params.id;
		if (!/[a-f\d]{32}/i.test(md5)) return res.status(404).json({
			success: false,
			error:   "Invalid MD5",
			code:    YiffyErrorCodes.THUMBS_INVALID_MD5
		});
		const type = req.params.type.toLowerCase() as "gif" | "png";
		if (!["gif", "png"].includes(type)) return res.status(404).json({
			success: false,
			error:   "Invalid Type",
			code:    YiffyErrorCodes.THUMBS_INVALID_TYPE
		});
		const existing = await exists(filePath(md5, type));
		if (existing) return res.status(200).json({ success: true, status: "done", url: url(md5, type) });
		const inQueue = E621Thumbnails.has(md5, type);
		if (inQueue) {
			const check = E621Thumbnails.check(md5, type)!;
			if (check.status !== "processing") return res.status(500).json({
				success: false,
				...check,
				code:    check.status === "timeout" ? YiffyErrorCodes.THUMBS_TIMEOUT : YiffyErrorCodes.THUMBS_GENERIC_ERROR
			});
			return res.status(202).json({ success: true, ...check });
		}
		const check = E621Thumbnails.add(md5, type);
		return res.status(202).json({ success: true, status: "processing", checkURL: check.url, checkAt: Date.now() + check.time, time: check.time, startedAt: check.startedAt });
	})
	.get("/check/:md5/:type", async(req,res) => {
		const md5 = req.params.md5;
		if (!/[a-f\d]{32}/i.test(md5)) return res.status(404).json({
			success: false,
			error:   "Invalid MD5",
			code:    YiffyErrorCodes.THUMBS_INVALID_MD5
		});
		const type = req.params.type.toLowerCase() as "gif" | "png";
		if (!["gif", "png"].includes(type)) return res.status(404).json({
			success: false,
			error:   "Invalid Type",
			code:    YiffyErrorCodes.THUMBS_INVALID_TYPE
		});
		const existing = await exists(filePath(md5, type));
		if (existing) return res.status(201).json({ success: true, status: "done", url: url(md5, type) });
		const inQueue = E621Thumbnails.has(md5, type);
		if (inQueue) {
			const check = E621Thumbnails.check(md5, type)!;
			return res.status(check.status === "processing" ? 200 : check.status === "timeout" ? 408 : 500).json({
				success: check.status === "processing",
				...check,
				...(check.status === "processing" ? {} : { code: check.status === "timeout" ? YiffyErrorCodes.THUMBS_TIMEOUT : YiffyErrorCodes.THUMBS_GENERIC_ERROR })
			});
		}
		return res.status(404).json({
			success: false,
			error:   "Not Found",
			code:    YiffyErrorCodes.THUMBS_CHECK_NOT_FOUND
		});
	});

export default app;
