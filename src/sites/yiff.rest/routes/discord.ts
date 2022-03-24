import { discord, userAgent } from "@config";
import { Router } from "express";
import fetch from "node-fetch";
import type { RESTGetAPICurrentUserGuildsResult, RESTGetAPICurrentUserResult, RESTPostOAuth2AccessTokenResult } from "discord-api-types/v10";

const app = Router();

app
	.get("/", async(req,res) => res.status(200).render("discord/index"))
	.get("/count-servers", async(req,res) => {
		let token: string;
		if (req.query.code) {
			const r = await fetch("https://discord.com/api/oauth2/token", {
				method:  "POST",
				body:    `client_id=${discord["yiffy-discord"].id}&client_secret=${discord["yiffy-discord"].secret}&grant_type=authorization_code&code=${req.query.code as string}&redirect_uri=${discord["yiffy-discord"].redirect.count}`,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent":   userAgent
				}
			});
			if (r.status !== 200) return res.status(r.status).end(await r.text());
			const auth = await r.json() as RESTPostOAuth2AccessTokenResult;
			if (!auth.scope.split(" ").includes("guilds")) return res.status(400).end("Authorized token does not have the guilds scope");
			token = auth.access_token;
		} else return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${discord["yiffy-discord"].id}&redirect_uri=${encodeURIComponent(discord["yiffy-discord"].redirect.count)}&response_type=code&scope=guilds&prompt=none`);

		const g = await fetch("https://discord.com/api/users/@me/guilds", {
			method:  "GET",
			headers: {
				"User-Agent":    userAgent,
				"Authorization": `Bearer ${token}`
			}
		});

		if (g.status !== 200) return res.status(g.status).end(await g.text());
		const guilds = await g.json() as RESTGetAPICurrentUserGuildsResult;
		const owner = guilds.filter(gg => gg.owner === true);
		const admin = guilds.filter(gg => (BigInt(gg.permissions) & 8n) === 8n);

		return res.status(200).render("discord/count-servers", {
			total:      guilds.length,
			owner:      owner.length,
			admin:      admin.length - owner.length,
			adminOwner: admin.length
		});
	})
	.get("/flags", async(req,res) => {
		let token;
		if (req.query.code) {
			const r = await fetch("https://discord.com/api/oauth2/token", {
				method:  "POST",
				body:    `client_id=${discord["yiffy-discord"].id}&client_secret=${discord["yiffy-discord"].secret}&grant_type=authorization_code&code=${req.query.code as string}&redirect_uri=${discord["yiffy-discord"].redirect.flags}`,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent":   userAgent
				}
			});
			if (r.status !== 200) return res.status(r.status).end(await r.text());
			const auth = await r.json() as RESTPostOAuth2AccessTokenResult;
			if (!auth.scope.split(" ").includes("identify")) return res.status(400).end("Authorized token does not have the identify scope");
			token = auth.access_token;
		} else return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${discord["yiffy-discord"].id}&redirect_uri=${encodeURIComponent(discord["yiffy-discord"].redirect.flags)}&response_type=code&scope=identify&prompt=none`);

		const s = await fetch("https://discord.com/api/users/@me", {
			method:  "GET",
			headers: {
				"User-Agent":    userAgent,
				"Authorization": `Bearer ${token}`
			}
		});

		if (s.status !== 200) return res.status(s.status).end(await s.text());
		const self = await s.json() as RESTGetAPICurrentUserResult;

		const flags = [];
		if (self.public_flags === undefined) self.public_flags = 0;
		if (self.public_flags & (1 << 0)) flags.push("Discord Employee");
		if (self.public_flags & (1 << 1)) flags.push("Discord Partner");
		if (self.public_flags & (1 << 2)) flags.push("Hypesquad Events");
		if (self.public_flags & (1 << 3)) flags.push("Bug Hunter Level 1");
		if (self.public_flags & (1 << 4)) flags.push("Unknown (4)");
		if (self.public_flags & (1 << 5)) flags.push("Unknown(5)");
		if (self.public_flags & (1 << 6)) flags.push("House of Bravery");
		if (self.public_flags & (1 << 7)) flags.push("House of Brilliance");
		if (self.public_flags & (1 << 8)) flags.push("House of Balance");
		if (self.public_flags & (1 << 9)) flags.push("Early Supporter");
		if (self.public_flags & (1 << 10)) flags.push("Team User");
		if (self.public_flags & (1 << 11)) flags.push("Unknown (11)");
		if (self.public_flags & (1 << 12)) flags.push("System");
		if (self.public_flags & (1 << 13)) flags.push("Unknown(13)");
		if (self.public_flags & (1 << 14)) flags.push("Bug Hunter Level 2");
		if (self.public_flags & (1 << 15)) flags.push("Unknown (15)");
		if (self.public_flags & (1 << 16)) flags.push("Verified Bot");
		if (self.public_flags & (1 << 17)) flags.push("Early Verified Bot Developer");
		if (self.public_flags & (1 << 18)) flags.push("Unknown (18)");
		if (self.public_flags & (1 << 19)) flags.push("Unknown (19)");
		if (self.public_flags & (1 << 20)) flags.push("Unknown (20)");

		return res.status(200).render("discord/flags", {
			number: self.public_flags,
			flags
		});
	});

export default app;
