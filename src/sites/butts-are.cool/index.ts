import Website from "@lib/Website";
import express from "express";

export default class ButtsAreCool extends Website {
	constructor() {
		super("butts-are.cool", "172.19.2.2", __dirname);
		this
			.setSecure(true)
			.setPort(443)
			.setCSPExtra("other", "media-src yiff.media")
			.init();

		this
			.addSubdomain("i", express.static("/app/public/images"))
			.addStatic("/app/public")
			.addStatic("/data/screenshots")
			.addSubdomain("balls",
				express.Router()
					.use(express.static("/data/public/custom/balls"))
					.use(async(req,res) => res.status(200).render("custom/balls", { year: new Date().getFullYear(), layout: false }))
			)
			.addSubdomain("knots",
				express.Router()
					.use(express.static("/data/public/custom/knots"))
					.use(async(req,res) => res.status(200).render("custom/knots", { year: new Date().getFullYear(), layout: false }))
			)
			.addSubdomain("penises",
				express.Router()
					.use(express.static("/data/public/custom/penises"))
					.use(async(req,res) => res.status(200).render("custom/penises", { year: new Date().getFullYear(), layout: false }))
			)
			.addSubdomain("sheaths",
				express.Router()
					.use(express.static("/data/public/custom/sheaths"))
					.use(async(req,res) => res.status(200).render("custom/sheaths", { year: new Date().getFullYear(), layout: false }))
			)
			.addHandler(express.Router().all("/", async (req, res) => res.status(200).render("index", { year: new Date().getFullYear(), layout: false })));
	}
}
