import Website from "@lib/Website";
import express from "express";

export default class YiffMedia extends Website {
	constructor() {
		super("yiff.media", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.init();

		this
			.addSubdomain("assets", express.static("/app/public/assets"))
			.addSubdomain("i", express.static("/app/public/images"))
			.addSubdomain("thumbs", express.static("/data/e621-thumbnails"))
			.addStatic("/app/public")
			.addSubdomain("report", express.Router().use(async(req,res) => res.end("Resources cannot be reported through this method. Please contact a developer for removal of content.")))
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index"))
					.get("/support", async (req, res) => res.redirect("https://api.maidboye.cafe/links/support?source=website"))
					.get("/inv", async (req, res) => res.redirect("https://api.maidboye.cafe/links/invite?source=website"))
					.get("/invite", async (req, res) => res.redirect("https://api.maidboye.cafe/links/invite?source=website"))
					.get("/V2*", async (req, res) => res.redirect(`https://v2.yiff.media${req.url.slice(3)}`))
			);
	}
}
