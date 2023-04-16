import db from "@db";
import type { ConvertFromRaw } from "@util/@types/general";
import type { DataTypes } from "@uwu-codes/types";
import type { UpsertResult } from "mariadb";

export interface RawE621Webhook {
	channel_id: string;
	creator_id: string | null;
	guild_id: string;
	id: number;
	webhook_id: string;
	webhook_token: string;
}
export type E621WebhookKV = DataTypes<E621Webhook>;
export { E621Webhook };

export default class E621Webhook {
	static DB = "e621";
	static TABLE = "webhooks";
	channel_id: string;
	creator_id: string| null;
	guild_id: string;
	id: number;
	webhook_id: string;
	webhook_token: string;
	constructor(data: RawE621Webhook) {
		this.id = data.id;
		this.channel_id = data.channel_id;
		this.creator_id = data.creator_id;
		this.guild_id = data.guild_id;
		this.webhook_id = data.webhook_id;
		this.webhook_token = data.webhook_token;
	}

	static async get(id: number): Promise<E621Webhook | null> {
		return db.query<Array<RawE621Webhook>>(`SELECT * FROM ${E621Webhook.DB}.${E621Webhook.TABLE} WHERE id = ? LIMIT 1`, [id]).then(k => k.length === 0 ? null : new E621Webhook(k[0]));
	}

	static async new(data: Omit<ConvertFromRaw<RawE621Webhook>, "id">) {
		if ("id" in data) delete (data as {id?: number; }).id;
		const key = await db.query<Array<RawE621Webhook>>(`INSERT INTO ${E621Webhook.DB}.${E621Webhook.TABLE} (${Object.keys(data).join(", ")}) VALUES (${Object.values(data).map(() => "?").join(", ")}) RETURNING *`, [...Object.values(data)]).then(r => r.length ? r[0] : null);
		return key ? new E621Webhook(key) : null;
	}

	static async delete(id: number) {
		return db.query<UpsertResult>(`DELETE FROM ${E621Webhook.DB}.${E621Webhook.TABLE} WHERE id = ?`, [id]).then(r => r.affectedRows > 0);
	}

	static async getForChannel(channel_id: string) {
		return db.query<Array<RawE621Webhook>>(`SELECT * FROM ${E621Webhook.DB}.${E621Webhook.TABLE} WHERE channel_id = ?`, [channel_id]).then(k => k.map(w => new E621Webhook(w)));
	}

	static async getForGuild(guild_id: string) {
		return db.query<Array<RawE621Webhook>>(`SELECT * FROM ${E621Webhook.DB}.${E621Webhook.TABLE} WHERE guild_id = ?`, [guild_id]).then(k => k.map(w => new E621Webhook(w)));
	}

	static async getAll() {
		return db.query<Array<RawE621Webhook>>(`SELECT * FROM ${E621Webhook.DB}.${E621Webhook.TABLE}`).then(k => k.map(w => new E621Webhook(w)));
	}

	async delete() { return E621Webhook.delete(this.id); }
}
