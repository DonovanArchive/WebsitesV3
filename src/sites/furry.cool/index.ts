import Website from "@lib/Website";
import express from "express";

export default class FurryCool extends Website {
	constructor() {
		super("furry.cool", "172.20.2.1", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.setCSPExtra("script", "assets.furry.bot")
			.init();

		this
			.addSubdomain("assets", express.static("/app/public/assets"))
			.addSubdomain("i", express.static("/app/public/images"))
			.addStatic("/app/public")
			.addSubdomain("what-is", express.Router().use("*", async(req, res) => res.render("what", { year: new Date().getFullYear(), layout: false })))
			.addSubdomain("v",
				express.Router()
					.use(express.static("/app/public/vress"))
					.use("*", async (req, res) => res.status(200).render("vress", {
						year:   new Date().getFullYear(),
						layout: false
					}))
			)
			.addSubdomain("npm-bot",
				express.Router()
					.get("/", async (req, res) => res.render("npm-bot", {
						year:   new Date().getFullYear(),
						layout: false
					}))
					.get("/add", async (req, res) => res.redirect("https://npm-botapi.furry.cool/invite/add?source=website"))
					.get("/inv", async (req, res) => res.redirect("https://npm-botapi.furry.cool/invite/support?source=website"))
			)
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index", { year: new Date().getFullYear(), layout: false }))
					.get("/icon", async(req, res) => res.sendFile("/app/public/images/DonMaidCrop.png"))
					.get("/icon-full", async(req, res) => res.sendFile("/app/public/images/DonMaid.png"))
					.get("/ref", async(req, res) => res.sendFile("/app/public/images/DonRef.png"))
			);
	}
}
