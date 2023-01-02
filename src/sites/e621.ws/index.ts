import statusRoute from "./routes/status";
import statsRoute from "./routes/stats";
import Website from "@lib/Website";
import express from "express";
export default class E621WS extends Website {
	constructor() {
		super("e621.ws", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.init();

		this
			.addStatic("/app/public")
			.addSubdomain("status", statusRoute)
			.addSubdomain("stats", statsRoute)
			.addHandler(
				express.Router().use("*", async(req, res) => res.redirect("https://status.e621.ws"))
			);
	}
}
