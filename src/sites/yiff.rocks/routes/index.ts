import checkForBlock from "../../../util/checkForBlock";
import handleRateLimit, { validateAPIKey } from "../../../util/checks";
import { YiffyErrorCodes } from "../../../util/Constants";
import { yiffRocksOverride } from "@config";
import userAgentCheck from "@util/userAgentCheck";
import { APIKeyFlags, APIUsage, ShortURL } from "@db/Models";
import Webhooks from "@util/Webhooks";
import type { Request } from "express";
import { Router } from "express";
import { assert } from "tsafe";
import { randomBytes } from "crypto";

const app = Router();

const urlTest = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
app

	.options("*", async (req, res) => {
		if (req.path === "/") res.header("Allow", "GET");
		else if (req.path.toLowerCase().startsWith("/create")) res.header("Allow", "POST");
		else res.header("Allow", "GET, DELETE, PATCH");

		return res.status(204).end();
	})
	.get("/", async (req, res) => res.status(200).end("We're currently rebuilding a better looking site to display here. For now, the current purpose for this domain still works: https://npm.im/yiff-rocks"))
	.use(async (req, res, next) => {
		let format: "json" | "redirect" = (req.query.format?.toString()?.toLowerCase() || req.originalUrl.split("?")[0].split(".").slice(-1)[0]?.toLowerCase()) as "json" | "redirect";
		if (!["json"].includes(format)) format = "json";
		function not(h: string) {
			res.header("Allow", h);
			if (format === "json") return res.status(405).json({
				success: false,
				error:   "Method not allowed.",
				code:    YiffyErrorCodes.METHOD_NOT_ALLOWED
			});
			else return res.status(405).end("Method not allowed.");
		}
		if (req.path.toLowerCase() === "/") {
			if (req.method !== "GET") return not("GET");
			else return next();
		} else if (req.path.split(".")[0].toLowerCase() === "/create") {
			if (req.method !== "POST") return not("POST");
			else return next();
		} else if (!["GET", "DELETE", "PATCH"].includes(req.method)) return not("GET, DELETE, PATCH");
		else return next();
	})
	.use(
		checkForBlock,
		userAgentCheck,
		handleRateLimit,
		async(req, res, next) => {
			void APIUsage.track(req, "shortener");
			if (req.method === "GET" && !req.path.endsWith(".json")) return next();
			else return validateAPIKey(true, APIKeyFlags.SHORTENER)(req, res, next);
		}
	)
	.post("/create", validateAPIKey(true, APIKeyFlags.SHORTENER), async (req: Request<never, unknown, Record<string, string>>, res) => {
		const code = req.body.code || randomBytes(8).toString("hex");

		if (code.length > 50) return res.status(422).json({
			success: false,
			error:   "Provided code is too long.",
			code:    YiffyErrorCodes.SHORTENER_CODE_TOO_LONG
		});

		const whitelist = /[A-Za-z_-\d]/;
		if (!whitelist.test(code)) return res.status(422).json({
			success: false,
			error:   "Invalid characters in code.",
			code:    YiffyErrorCodes.SHORTENER_INVALID_CODE
		});

		const override_v3 = req.body.credit === `YiffyAPI-${yiffRocksOverride}`;
		if (override_v3) req.body.credit = "YiffyAPI";
		const override = override_v3;

		const inUse = await ShortURL.get(code);
		if (inUse !== null && inUse.url !== req.body.url) {
			if (override) await inUse.delete();
			else  return res.status(409).json({
				success: false,
				error:   "Code already in use.",
				code:    YiffyErrorCodes.SHORTENER_CODE_IN_USE
			});
		}

		if (!urlTest.test(req.body.url)) return res.status(422).json({
			success: false,
			error:   "Invalid url provided.",
			code:    YiffyErrorCodes.SHORTENER_INVALID_URL
		});

		if (req.body.credit?.length > 50) return res.status(422).json({
			success: false,
			error:   "Provided credit is too long.",
			code:    YiffyErrorCodes.SHORTENER_CREDIT_TOO_LONG
		});

		let managementCode = req.query.editable === "false" ? null : randomBytes(30).toString("hex");

		const exists = await ShortURL.getByURL(req.body.url);
		let v;

		if (!exists) {
			const short = await ShortURL.new({
				code,
				created_at:      new Date().toISOString(),
				creator_apikey:  req.headers.authorization!,
				creator_ip:      (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString(),
				creator_name:    req.body.credit || "Unknown",
				creator_ua:      req.headers["user-agent"]!.toString(),
				url:             req.body.url,
				management_code: managementCode
			});

			await Webhooks.get("shortener").execute({
				embeds: [
					{
						title:       "Short URL Created",
						color:       0x008000,
						description: [
							`IP: ${req.ip}`,
							`User-Agent: ${req.headers["user-agent"]!}`,
							`Credit: \`${req.body.credit || "Unknown"}\``,
							`URL: [${req.body.url}](${req.body.url})`,
							`Code: **${code}**`
						].join("\n"),
						timestamp: new Date().toISOString()
					}
				]
			});

			v = short;
		} else {
			v = exists;
			managementCode = null;
		}

		assert(v !== null);

		return res.status(exists ? 200 : 201).json({
			success: true,
			data:    {
				...v.json(),
				managementCode
			}
		});
	})
	.get("/:code", async (req, res) => {
		let format: "json" | "redirect" = (req.query.format?.toString()?.toLowerCase() || req.originalUrl.split("?")[0].split(".").slice(-1)[0]?.toLowerCase()) as "json" | "redirect";
		if (!["json", "redirect"].includes(format)) format = "redirect";
		let code = format === "json" ? req.params.code.replace(/\.json/, "") : req.params.code;
		let preview = false;
		if (code.endsWith("+")) {
			code = code.slice(0, -1);
			preview = true;
		}
		const short = await ShortURL.get(code);

		if (preview && short !== null) return res.status(200).render("preview", {
			year:   new Date().getFullYear(),
			url:    short.url,
			layout: false
		});

		switch (format) {
			case "json": {
				if (!short) return res.status(404).json({
					success: false,
					error:   "A short url with that code was not found.",
					code:    YiffyErrorCodes.SHORTENER_NOT_FOUND
				});
				else return res.status(200).json({
					success: true,
					data:    short.json()
				});
				break;
			}

			default: {
				if (!short) return res.status(404).end("Unknown short url code.");
				else return res.redirect(302, short.url);
			}
		}
	})
	.delete("/:code", async (req, res) => {
		const managementCode = (req.body as Partial<Record<string, string>>).managementCode;
		if (!managementCode) return res.status(401).json({
			success: false,
			error:   "You must provide an authorization code. These are created at the time the short url was created.",
			code:    YiffyErrorCodes.SHORTENER_MANAGEMENT_CODE_REQUIRED
		});

		const short = await ShortURL.get(req.params.code);
		if (!short) return res.status(404).json({
			success: false,
			error:   "A short url with that code was not found.",
			code:    YiffyErrorCodes.SHORTENER_NOT_FOUND
		});

		if (!short.managementCode) return res.status(403).json({
			success: false,
			error:   "That short url does not have a management code, so it cannot be deleted.",
			code:    YiffyErrorCodes.SHORTENER_NO_MANAGEMENT_CODE
		});

		if (short.managementCode !== managementCode) return res.status(401).json({
			success: false,
			error:   "That management code does not match this short url.",
			code:    YiffyErrorCodes.SHORTENER_MANAGEMENT_CODE_MISMATCH
		});

		await short.delete();

		await Webhooks.get("shortener").execute({
			embeds: [
				{
					title:       "Short URL Deleted",
					color:       0xDC143C,
					description: [
						`IP: ${short.creator.ip}`,
						`User-Agent: ${short.creator.ua}`,
						`Credit: \`${short.creator.name}\``,
						`URL: [${short.url}](${short.url})`,
						`Code: **${short.code}**`
					].join("\n"),
					timestamp: new Date().toISOString()
				}
			]
		});

		return res.status(204).end();
	})
	.patch("/:code", async (req: Request<Record<string, string>, unknown, Record<string, string>>, res) => {
		const managementCode = (req.body as Partial<Record<string, string>>).managementCode;
		if (!managementCode) return res.status(401).json({
			success: false,
			error:   "You must provide an authorization code. These are created at the time the short url was created.",
			code:    YiffyErrorCodes.SHORTENER_MANAGEMENT_CODE_REQUIRED
		});

		const short = await ShortURL.get(req.params.code);
		if (!short) return res.status(404).json({
			success: false,
			error:   "A short url with that code was not found.",
			code:    YiffyErrorCodes.SHORTENER_NOT_FOUND
		});

		if (!short.managementCode) return res.status(403).json({
			success: false,
			error:   "That short url does not have a management code, so it cannot be modified.",
			code:    YiffyErrorCodes.SHORTENER_NO_MANAGEMENT_CODE
		});

		if (short.managementCode !== managementCode) return res.status(401).json({
			success: false,
			error:   "That management code does not match this short url.",
			code:    YiffyErrorCodes.SHORTENER_MANAGEMENT_CODE_MISMATCH
		});
		let newURL: string | undefined, newCredit: string | undefined;

		if (req.body.url) {
			if (!urlTest.test(req.body.url)) {
				return res.status(422).json({
					success: false,
					error:   "Invalid url provided.",
					code:    YiffyErrorCodes.SHORTENER_INVALID_URL
				});
			}
			newURL = req.body.url;
			const u = await ShortURL.getByURL(req.body.url);
			if (u) {
				return res.status(409).json({
					success: false,
					error:   "The provided url is already in use.",
					code:    YiffyErrorCodes.SHORTENER_URL_IN_USE
				});
			}
		}

		if (req.body.credit) {
			if (req.body.credit.length > 50)  return res.status(422).json({
				success: false,
				error:   "Provided credit is too long.",
				code:    YiffyErrorCodes.SHORTENER_CREDIT_TOO_LONG
			});
			newCredit = req.body.credit;
		}

		if ((!newURL || short.url === newURL) && (!newCredit || short.creator.name === newCredit)) return res.status(400).json({
			success: false,
			error:   "No changes were detected.",
			code:    YiffyErrorCodes.SHORTENER_NO_CHANGES
		});

		short.modifiedAt = new Date().toISOString();

		const oldURL = short.url;
		const oldCredit = short.creator.name;
		if (newURL) await short.setURL(newURL);
		if (newCredit) await short.setCreatorName(newCredit);

		await Webhooks.get("shortener").execute({
			embeds: [
				{
					title:       "Short URL Modified",
					color:       0xFFD700,
					description: [
						`IP: ${short.creator.ip}`,
						`User-Agent: ${short.creator.ua}`,
						...(oldCredit !== newCredit && newCredit ? [
							`Old Credit: \`${oldCredit}\``,
							`New Credit: \`${newCredit}\``,
							""
						] : [
							`Credit: \`${short.creator.name}\``
						]),
						...(oldURL !== newURL && newURL ? [
							`Old URL: [${oldURL}](${oldURL})`,
							`New URL: [${newURL}](${newURL})`
						] : [
							`URL: [${short.url}](${short.url})`
						]),
						`Code: **${short.code}**`
					].join("\n"),
					timestamp: new Date().toISOString()
				}
			]
		});

		return res.status(200).json({
			success: true,
			data:    short.json()
		});
	});

export default app;
