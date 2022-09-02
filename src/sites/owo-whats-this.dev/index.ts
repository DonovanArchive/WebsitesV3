import oceanicRoute from "./routes/oceanic";
import Website from "@lib/Website";
import express, { Router } from "express";

export default class FurryCool extends Website {
	constructor() {
		super("owo-whats-this.dev", "172.19.2.8", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.init();

		this
			.addSubdomain("oceanic",
				express.Router().use(oceanicRoute)
			)
			.addHandler(Router().use(async(req, res) => res.redirect("https://furry.cool")));
	}
}
