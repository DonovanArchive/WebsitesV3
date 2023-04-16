import { discord } from "@config";
import { Router } from "express";
import { Client, OAuthHelper, UserFlags } from "oceanic.js";
import type { ExchangeCodeResponse } from "oceanic.js";
const client = new Client();
const app = Router();

app
	.get("/", async(req,res) => res.status(200).render("discord/index"))
	.get("/count-servers", async(req,res) => {
		let token: string;
		if (req.query.code) {
			let r: ExchangeCodeResponse;
			try {
				r = await client.rest.oauth.exchangeCode({
					clientID:     discord["yiffy-discord"].id,
					clientSecret: discord["yiffy-discord"].secret,
					code:         req.query.code as string,
					redirectURI:  discord["yiffy-discord"].redirect.count
				});
			} catch (err) {
				return res.status(500).end((err as Error).stack ?? (err as Error).message);
			}
			if (!r.scopes.includes("guilds")) return res.status(400).end("Authorized token does not have the guilds scope");
			token = r.accessToken;
		} else return res.redirect(OAuthHelper.constructURL({
			clientID:     discord["yiffy-discord"].id,
			redirectURI:  discord["yiffy-discord"].redirect.count,
			responseType: "code",
			scopes:       ["guilds"],
			prompt:       "none"
		}));

		const helper = client.rest.oauth.getHelper(`Bearer ${token}`);

		const guilds = await helper.getCurrentGuilds();
		const owner = guilds.filter(gg => gg.owner === true);
		const admin = guilds.filter(gg => gg.permissions.has("ADMINISTRATOR"));

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
			let r: ExchangeCodeResponse;
			try {
				r = await client.rest.oauth.exchangeCode({
					clientID:     discord["yiffy-discord"].id,
					clientSecret: discord["yiffy-discord"].secret,
					code:         req.query.code as string,
					redirectURI:  discord["yiffy-discord"].redirect.flags
				});
			} catch (err) {
				return res.status(500).end((err as Error).stack ?? (err as Error).message);
			}
			if (!r.scopes.includes("identify")) return res.status(400).end("Authorized token does not have the identify scope");
			token = r.accessToken;
		}  else return res.redirect(OAuthHelper.constructURL({
			clientID:     discord["yiffy-discord"].id,
			redirectURI:  discord["yiffy-discord"].redirect.flags,
			responseType: "code",
			scopes:       ["guilds"],
			prompt:       "none"
		}));

		const helper = client.rest.oauth.getHelper(`Bearer ${token}`);
		const user = await helper.getCurrentUser();

		const publicFlags: Array<string> = [], allFlags: Array<string> = [];
		const Names = {
			[UserFlags.STAFF]:                 "Discord Employee",
			[UserFlags.PARTNER]:               "Discord Partner",
			[UserFlags.HYPESQUAD]:             "Hypesquad Events",
			[UserFlags.BUG_HUNTER_LEVEL_1]:    "Bug Hunter Level 1",
			// 4 & 5
			[UserFlags.HYPESQUAD_BRAVERY]:     "House of Bravery",
			[UserFlags.HYPESQUAD_BRILLIANCE]:  "House of Brilliance",
			[UserFlags.HYPESQUAD_BALANCE]:     "House of Balance",
			[UserFlags.EARLY_SUPPORTER]:       "Early Supporter",
			[UserFlags.PSEUDO_TEAM_USER]:      "Team User",
			// 11
			[UserFlags.SYSTEM]:                "System",
			// 13
			[UserFlags.BUG_HUNTER_LEVEL_2]:    "Bug Hunter Level 2",
			// 15
			[UserFlags.VERIFIED_BOT]:          "Verified Bot",
			[UserFlags.VERIFIED_DEVELOPER]:    "Early Verified Bot Developer",
			[UserFlags.CERTIFIED_MODERATOR]:   "Certified Moderator",
			[UserFlags.BOT_HTTP_INTERACTIONS]: "Bot HTTP Interactions",
			[UserFlags.SPAMMER]:               "Spammer",
			// 21
			[UserFlags.ACTIVE_DEVELOPER]:      "Active Developer"
		} satisfies Record<UserFlags, string>;

		for (let i = 1; i <= 25; i++) {
			const flag = 1 << i;
			if ((user.publicFlags & flag) === flag) publicFlags.push(Names[flag as 1] || `Unknown (${flag})`);
		}

		return res.status(200).render("discord/flags", {
			publicNumber: user.publicFlags,
			publicFlags,
			allNumber:    user.flags,
			allFlags
		});
	});

export default app;
