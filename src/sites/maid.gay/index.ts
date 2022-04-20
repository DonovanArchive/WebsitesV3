import Website from "@lib/Website";
import express from "express";

// this could be made completely static but that's a bit complicated and would
// likely be undone in the future
export default class MaidGay extends Website {
	constructor() {
		super("maid.gay", "172.19.3.4", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.setCSPExtra("script", "storage.ko-fi.com")
			.setCSPExtra("style", "storage.ko-fi.com")
			.disableNonce()
			.init();

		this
			.addSubdomain("assets", express.static("/app/public/assets"))
			.addSubdomain("i", express.static("/app/public/images"))
			.addStatic("/app/public")
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index", { year: new Date().getFullYear(), layout: false }))
					.get("/support", async (req, res) => res.redirect("https://api.maid.gay/links/support?source=website"))
					.get("/inv", async (req, res) => res.redirect("https://api.maid.gay/links/invite?source=website"))
					.get("/invite", async (req, res) => res.redirect("https://api.maid.gay/links/invite?source=website"))
			);
	}
}
