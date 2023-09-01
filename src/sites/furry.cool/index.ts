import Website from "@lib/Website";
import express from "express";

export default class FurryCool extends Website {
	constructor() {
		super("furry.cool", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.setCSPExtra("script", "assets.furry.bot")
			.disableNonce()
			.init();

		this
			.addSubdomain("assets", express.static("/app/public/assets"))
			.addSubdomain("i", express.static("/app/public/images"))
			.addStatic("/app/public")
			.addSubdomain("what-is", express.Router().use("*", async(req, res) => res.render("what")))
			.addSubdomain("v",
				express.Router()
					.use(express.static("/app/public/vress"))
					.use("*", async (req, res) => res.status(200).render("vress"))
			)
			.addSubdomain("npm-bot",
				express.Router()
					.get("/", async (req, res) => res.render("npm-bot"))
					.get("/add", async (req, res) => res.redirect("https://npm-botapi.furry.cool/invite/add?source=website"))
					.get("/inv", async (req, res) => res.redirect("https://npm-botapi.furry.cool/invite/support?source=website"))
			)
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index"))
					.get("/echo", async(req, res) => {
						let { text } = req.query as Record<"text", string>, parsed = false;
						try {
							text = Buffer.from(text, "base64").toString("utf8");
							if (text.startsWith("}")) {
								parsed = true;
								try {
									text = JSON.stringify(JSON.parse(text), null, 4);
								} catch {
									// ignore
								}
							}
						} catch {
							// ignore
						}

						if (!parsed && text.startsWith("}")) {
							try {
								text = JSON.stringify(JSON.parse(text), null, 4);
							} catch {
								// ignore
							}
						}

						return res.header("Content-Type", "text/plain").status(200).end(text);
					})
					.get("/icon", async(req, res) => res.sendFile("/app/public/images/DonMaidCrop.png"))
					.get("/icon-full", async(req, res) => res.sendFile("/app/public/images/DonMaid.png"))
					.get("/ref", async(req, res) => res.sendFile("/app/public/images/DonRef.png"))
			);
	}
}
