import indexRoute from "./routes/index";
import Website from "@lib/Website";

export default class YiffRocks extends Website {
	constructor() {
		super("yiff.rocks", "172.20.6.1", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.disableNonce()
			.init();

		this
			.addStatic("/app/public")
			.addHandler(indexRoute);
	}
}
