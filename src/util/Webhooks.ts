import { webhooks } from "@config";
import type { ExecuteWebhookOptions } from "oceanic.js";
import { Client } from "oceanic.js";
const client = new Client();

class Webhook<C extends Client> {
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

	async fetch() { return this.client.rest.webhooks.get(this.id, this.token); }
	async delete() { return this.client.rest.webhooks.deleteToken(this.id, this.token); }
	async execute(payload: Omit<ExecuteWebhookOptions, "wait">) {
		const data: ExecuteWebhookOptions & { wait: false; } = {
			...payload,
			wait: false
		};

		if (!!this.avatar && !payload.avatarURL) data.avatarURL = this.avatar;
		if (!!this.username && !payload.username) data.username = this.username;
		return this.client.rest.webhooks.execute(this.id, this.token, data);
	}
}

class WebhookStore {
	private webhooks: Map<string, Webhook<Client>>;
	client: Client;
	constructor(c: Client) {
		this.client = c;
		this.webhooks = new Map();
		Object.values(webhooks).map((w, i) =>
			this.webhooks.set(
				Object.keys(webhooks)[i],
				new Webhook<Client>(this.client, w)
			)
		);
	}

	get(name: keyof typeof webhooks) { return this.webhooks.get(name)!; }
}

export default new WebhookStore(client);
