import { webhooks } from "@config";
import Eris from "eris";
const client = new Eris.Client("", { intents: [] });

class Webhook<C extends Eris.Client> {
	client: C;
	id: string;
	token: string;
	avatar?: string;
	username?: string;
	constructor(c: C, data: {
		id: string;
		token: string;
		avatar?: string;
		username?: string;
	}) {
		this.client = c;
		this.id = data.id;
		this.token = data.token;
		this.avatar = data.avatar;
		this.username = data.username;
	}

	async fetch() { return this.client.getWebhook(this.id, this.token); }
	async delete(reason?: string) { return this.client.deleteWebhook(this.id, this.token, reason); }
	async execute(payload: Omit<Eris.WebhookPayload, "wait">) {
		const data: Eris.WebhookPayload & { wait: false; } = {
			...payload,
			wait: false
		};

		if (!!this.avatar && !payload.avatarURL) data.avatarURL = this.avatar;
		if (!!this.username && !payload.username) data.username = this.username;
		return this.client.executeWebhook(this.id, this.token, data);
	}
}

class WebhookStore {
	private webhooks: Map<string, Webhook<Eris.Client>>;
	client: Eris.Client;
	constructor(c: Eris.Client) {
		this.client = c;
		this.webhooks = new Map();
		Object.values(webhooks).map((w, i) =>
			this.webhooks.set(
				Object.keys(webhooks)[i],
				new Webhook<Eris.Client>(this.client, w)
			)
		);
	}

	get(name: keyof typeof webhooks) { return this.webhooks.get(name)!; }
}

export default new WebhookStore(client);
