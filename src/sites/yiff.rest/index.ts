import v2Route from "./routes/api_v2";
import discordRoute from "./routes/discord";
import Website from "@lib/Website";
import { APIImage } from "@models";
import { categories } from "@config";
import express from "express";
import Handlebars from "handlebars";
import "./routes/bot"; // not an actual route

/* eslint-disable */
Handlebars.registerHelper("when", (operand_1, operator, operand_2, options) => {
	const operators = {
		"eq":    (l: number, r: number) => l === r,
		"noteq": (l: number, r: number) => l !== r,
		"gt":    (l: number, r: number) => (+l) > (+r),
		"gteq":  (l: number, r: number) => ((+l) > (+r)) || (l === r),
		"lt":    (l: number, r: number) => (+l) < (+r),
		"lteq":  (l: number, r: number) => ((+l) < (+r)) || (l === r),
		"or":    (l: number, r: number) => l || r,
		"and":   (l: number, r: number) => l && r,
		"%":     (l: number, r: number) => (l % r) === 0
	};
	const result = operators[operator.trim() as keyof typeof operators](operand_1,operand_2);
	if (result) return options.fn(this);
	return options.inverse(this);
});
/* eslint-enable */

export default class YiffRest extends Website {
	constructor() {
		super("yiff.rest", "172.19.2.6", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.init();

		this
			.addSubdomain("v1",
				express.Router()
					.use(async(req,res) => res.status(410).json({
						success: false,
						error:   "This api version is no longer active, please use version 2."
					}))
			)
			.addSubdomain("v2", v2Route)
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

						return res.render("state", {
							images,
							layout: false
						});
					})
			)
			.addSubdomain("assets", express.static("/app/public/assets"))
			.addSubdomain("schema", express.static("/app/public/assets/schema"))
			.addSubdomain("i", express.static("/app/public/images"))
			.addStatic("/app/public")
			.addHandler(
				express.Router()
					.get("/", async(req, res) => res.render("index", { layout: false }))
					.get("/support", async (req, res) => res.redirect("https://discord.gg/xDrFswTW4h"))
					.use("/V1", async (req, res) => res.status(410).json({
						success: false,
						error:   "This api version is no longer active, please use version 2."
					}))
					.use("/V2", v2Route)
			);
	}
}
