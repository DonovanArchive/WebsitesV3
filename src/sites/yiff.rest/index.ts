import v2Route from "./routes/api_v2";
import discordRoute from "./routes/discord";
import thumbsRoute from "./routes/thumbs";
import categories from "./util/categories.json";
import { YiffyErrorCodes } from "../../util/Constants";
import Website from "@lib/Website";
import { ANON_FLAGS, APIImage, APIKey, APIKeyFlags } from "@models";
import express, { Router } from "express";
import "./routes/bot"; // not an actual route


export default class YiffRest extends Website {
	constructor() {
		super("yiff.rest", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.init();

		this
			.addHandler(Router().use("/status", async(req, res) => {
				let key: APIKey | null = null;
				const auth = req.query._auth as string || req.headers.authorization || null;
				if (auth) {
					key = await APIKey.get(auth);
					if (key === null) return res.status(401).json({
						success: false,
						error:   "Invalid API Key",
						code:    YiffyErrorCodes.INVALID_API_KEY
					});
					return res.status(200).json({
						success: true,
						data:    {
							active:         key.active,
							disabled:       key.disabled,
							disabledReason: key.disabledReason,
							unlimited:      key.unlimited,
							rateLimit:      {
								long: {
									window: key.windowLong,
									limit:  key.limitLong
								},
								short: {
									window: key.windowShort,
									limit:  key.limitShort
								}
							},
							flags:    key.flags,
							services: {
								images:    key.imagesAccess,
								thumbs:    key.thumbsAccess,
								shortener: key.shortenerAccess
							}
						}
					});
				} else {
					return res.status(200).json({
						success: true,
						data:    {
							services: {
								images:    (ANON_FLAGS & APIKeyFlags.IMAGES) === APIKeyFlags.IMAGES,
								thumbs:    (ANON_FLAGS & APIKeyFlags.THUMBS) === APIKeyFlags.THUMBS,
								shortener: (ANON_FLAGS & APIKeyFlags.SHORTENER) === APIKeyFlags.SHORTENER
							}
						}
					});
				}
			}))
			.addSubdomain("v1",
				express.Router()
					.use(async(req,res) => res.status(410).json({
						success: false,
						error:   "This api version is no longer active, please use version 2."
					}))
			)
			.addSubdomain("v2", v2Route)
			.addSubdomain("thumbs", thumbsRoute)
			.addSubdomain("dsc",
				express.Router()
					.use(async(req, res) => res.redirect("https://discord.yiff.rest"))
			)
			.addSubdomain("discord", discordRoute)
			.addSubdomain("flow",
				express.Router()
					.use(async(req,res) => res.status(501).json({
						success: false,
						error:   "This feature has been disabled."
					}))
			)
			.addSubdomain("state",
				express.Router()
					.use(async(req,res) => {
						const images: Array<{
							name: string;
							db: string;
							count: number;
							hasImages: boolean;
						}> = [];

						await Promise.all(categories.enabled.map(async (c) => {
							const i = await APIImage.getByCategory(c.db);
							images
								.push({ name: c.name, db: c.db, count: i.length, hasImages: i.length > 0 });
						}));

						return res.render("state", { images });
					})
			)
			.addSubdomain("assets", express.static("/app/public/assets"))
			.addSubdomain("schema", express.static("/app/public/assets/schema"))
			.addSubdomain("i", express.static("/app/public/images"))
			.addStatic("/app/public")
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index"))
					.get("/support", async (req, res) => res.redirect("https://discord.gg/xDrFswTW4h"))
					.use("/V1", async (req, res) => res.status(410).json({
						success: false,
						error:   "This api version is no longer active, please use version 2."
					}))
					.use("/V2", v2Route)
			);
	}
}
