import docsRoute from "./routes/docs";
import Website from "@lib/Website";
import express from "express";

export default class FurryCool extends Website {
	constructor() {
		super("oceanic.ws", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.setCSPExtra("script", "data:")
			.init();

		this
			.addSubdomain("docs", docsRoute)
			.addSubdomain("i", express.static("/app/public/images"))
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index"))
			);
	}
}
