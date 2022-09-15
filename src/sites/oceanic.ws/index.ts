import docsRoute from "./routes/docs";
import Website from "@lib/Website";
import { Router } from "express";

export default class FurryCool extends Website {
	constructor() {
		super("oceanic.ws", "172.19.2.8", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.init();

		this
			.addSubdomain("docs", Router().use(docsRoute));
	}
}
