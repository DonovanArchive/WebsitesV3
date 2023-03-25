import statusRoute from "./routes/status";
import statsRoute from "./routes/stats";
import gitE621ModActionsRoute from "./routes/git_e621-mod-actions";
import gitE621Route from "./routes/git_e621";
import npmRoute from "./routes/npm";
import Website from "@lib/Website";
import express from "express";
import { createNodeMiddleware } from "@octokit/webhooks";

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
			.addSubdomain("npm", npmRoute)
			.addSubdomain("git", express.Router()
				.use("/mod-actions", createNodeMiddleware(gitE621ModActionsRoute, { path: "/" }))
				.use("/e621", createNodeMiddleware(gitE621Route, { path: "/" }))
			)
			.addHandler(
				express.Router().use("/", async(req, res) => res.redirect("https://status.e621.ws"))
			);
	}
}
