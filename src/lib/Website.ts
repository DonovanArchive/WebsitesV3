// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../util/@types/express-subdomain.d.ts" />
import { consoleLogger, fileLogger } from "./Logger";
import AbuseIPDB from "./AbuseIPDB";
import Usage from "../db/Models/Usage";
import Logger from "../util/Logger";
import { cookieSecret } from "@config";
import type { Express } from "express";
import express from "express";
import session from "express-session";
import type { ExpressHandlebars } from "express-handlebars";
import { create } from "express-handlebars";
import subdomain from "express-subdomain";
import type { ModuleImport } from "@uwu-codes/types";
import Handlebars from "handlebars";
import dns from "dns";
import * as http from "http";
import * as https from "https";
import path from "path";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";

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
Handlebars.registerHelper("year", () => new Date().getFullYear());

export interface GenericSiteInfo {
	host: string;
	port: number;
	module: string;
	options: http.ServerOptions | https.ServerOptions;
}

export interface ExtendedWebsite extends Website {
	new(): this;
}

export default class Website {
	name: string;
	host: string;
	dir: string;
	secure = false;
	options: http.ServerOptions | https.ServerOptions = {};
	port = 0;
	private app: Express;
	private hbs: ExpressHandlebars;
	private server: http.Server | https.Server;
	subdomains = new Map<string, Array<express.Handler>>();
	cspExtra = {
		default: "",
		style:   "",
		script:  "",
		other:   ""
	};
	cspNonce = true;
	constructor(name: string, host: string, dir: string) {
		this.name = name;
		this.host = host;
		this.dir = dir;
		this.app = express();
		this.hbs = create({
			extname:       "hbs",
			defaultLayout: "default",
			layoutsDir:    "/app/views/layouts",
			partialsDir:   "/app/views/partials"
		});
	}
	setSecure(value: boolean) {
		if (!this.options || JSON.stringify(this.options) === "{}") this.options = {
			ca:   readFileSync("/app/ssl/ca/intermediate/certs/CA-Chain.crt").toString(),
			cert: readFileSync("/app/ssl/ca/intermediate/certs/client.chained.crt").toString(),
			key:  readFileSync("/app/ssl/ca/intermediate/private/client.key").toString()
		};
		this.secure = value;
		return this;
	}
	setPort(value: number) { this.port = value; return this; }
	setOptions(data: http.ServerOptions | https.ServerOptions) { this.options = data; return this; }
	disableNonce() { this.cspNonce = false; return this; }

	private async doLookup() {
		if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(this.host) || /^[a-fA-F0-9:]+$/.test(this.host)) return this.host;
		let res4: string | null = null, res6: string | null = null;
		try {
			res4 = await new Promise<string | null>((a, b) => dns.resolve4(this.host, (err, addresses) => err ? b(err) : a(addresses.length === 0 ? null : addresses[0])));
		} catch {
			// ignore
		}
		try {
			res6 = await new Promise<string | null>((a, b) => dns.resolve6(this.host, (err, addresses) => err ? b(err) : a(addresses.length === 0 ? null : addresses[0])));
		} catch {
			// ignore
		}
		if (res4 === null && res6 === null) throw new Error(`Failed to resolve host for "${this.name}" (loc: ${this.dir}, host: ${this.host})`);
		return (res4 ?? res6)!;
	}

	async listen() {
		const address = await this.doLookup();
		const backlog = () => console.log(`Listening on http${this.secure ? "s" : ""}://${address}${[80, 443].includes(this.port) ? "" : `:${this.port}`}`);
		return this.server = (
			this.secure ?
				https.createServer(this.options, this.app) :
				http.createServer(this.options, this.app)
		).listen(this.port, address, backlog);
	}

	init() {
		const poweredBy = [
			"Endless Yiffing"
		];
		this.app
			.engine("hbs", this.hbs.engine)
			.set("view engine", "hbs")
			.set("views", "/app/views/pages")
			.set("view options", { pretty: true })
			.set("trust proxy", true)
			.set("x-powered-by", false)
			.use(express.json({
				limit: "20MB"
			}))
			.use(express.urlencoded({ extended: true }))
			.use(express.urlencoded({ extended: false }))
			.use(consoleLogger)
			.use(fileLogger)
			.use(session({
				name:   "owo",
				secret: cookieSecret,
				cookie: {
					maxAge:   8.64e7,
					secure:   true,
					httpOnly: true,
					domain:   `.${this.name}`
				},
				resave:            false,
				saveUninitialized: true
			}))
			.use(async(req, res, next) => {
				const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString();
				const check = await AbuseIPDB.check(ip);

				if (check) {
					Logger.getLogger("abuseipdb").info(`Blocked ${ip} from accessing ${req.protocol}://${req.hostname}${req.originalUrl} due to >50 abuse score.`);
					return res.status(403).json({
						success: false,
						error:   "You have been blocked from accessing this website."
					});
				}
				try {
					void Usage.track(req);
				} catch (err) {
					console.error("Usage Tracking Failed", err);
				}
				return next();
			})
			.use(express.static("/app/public"))
			.use(async(req, res, next) => {
				const nonce = randomBytes(16).toString("hex");
				res.locals.nonce = nonce;
				res.header({
					"Report-To": JSON.stringify({
						group:     "default",
						max_age:   31536000,
						endpoints: [
							{
								url: "https://yiff.report-uri.com/a/d/g"
							}
						],
						include_subdomains: true
					}),
					"NEL": JSON.stringify({
						report_to:          "default",
						max_age:            31536000,
						include_subdomains: true
					}),
					"Strict-Transport-Security": [
						"max-age=63072000",
						"includeSubDomains",
						"preload"
					].join("; "),
					"Expect-CT": [
						"report-uri=\"https://yiff.report-uri.com/r/d/ct/enforce\"",
						"enforce",
						"max-age=63072000"
					].join(", "),
					"Upgrade-Insecure-Requests": "1",
					"Referrer-Policy":           "strict-origin-when-cross-origin",
					"X-XSS-Protection":          [
						"1",
						"mode=block",
						"report=https://yiff.report-uri.com/r/d/xss/enforce"
					].join("; "),
					"Access-Control-Allow-Headers": [
						"Content-Type",
						"Authorization"
					].join(", "),
					"Access-Control-Allow-Origin":  "*",
					"Access-Control-Allow-Methods": [
						"GET",
						"POST",
						"OPTIONS",
						"HEAD"
					].join(", "),
					"X-Frame-Options":        "DENY",
					"X-Content-Type-Options": "nosniff",
					"Cache-Control":          "no-cache",
					"X-Powered-By":           poweredBy[Math.floor(Math.random() * poweredBy.length)],
					"X-Feature-Policy":       [
						"accelerometer 'none'",
						"ambient-light-sensor 'none'",
						"autoplay 'none'",
						"battery 'none'",
						"camera 'none'",
						"display-capture 'none'",
						"document-domain 'none'",
						"encrypted-media 'none'",
						"execution-while-not-rendered 'none'",
						"execution-while-out-of-viewport 'none'",
						"fullscreen 'none'",
						"gamepad 'none'",
						"geolocation 'none'",
						"gyroscope 'none'",
						"layout-animations 'none'",
						"legacy-image-formats 'none'",
						"magnetometer 'none'",
						"microphone 'none'",
						"midi 'none'",
						"navigation-override 'none'",
						"oversied-images 'none'",
						"payment 'none'",
						"picture-in-picture 'none'",
						"publickey-credentials-get 'none'",
						"speaker-selection 'none'",
						"sync-xhr 'none'",
						"unoptimized-images 'none'",
						"unsized-media 'none'",
						"usb 'none'",
						"vr 'none'",
						"vibrate 'none'",
						"screen-wake-lock 'none'",
						"xr-spatial-tracking 'none'"
					].join("; "),
					"Content-Security-Policy": [
						`default-src 'self' ${this.name} *.${this.name} ${this.cspExtra.default}`.trim(),
						`script-src 'self' 'unsafe-inline' ${this.cspNonce ? `'nonce-${nonce}' ` : ""}${this.name} *.${this.name} cdnjs.cloudflare.com ${this.cspExtra.script}`.trim(),
						`style-src 'self' 'unsafe-inline' ${this.cspNonce ? `'nonce-${nonce}' ` : ""}${this.name} *.${this.name} cdnjs.cloudflare.com fonts.googleapis.com ${this.cspExtra.style}`.trim(),
						"img-src 'self' https: data:",
						"font-src 'self' https: data:",
						"report-uri https://yiff.report-uri.com/r/d/csp/enforce",
						"report-to default",
						"upgrade-insecure-requests",
						"block-all-mixed-content",
						"require-sri-for script style",
						this.cspExtra.other
					].filter(Boolean).join("; ")
				});

				return next();
			})
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			.use(async (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
				Logger.getLogger(`Error:${req.method}:${req.hostname}:${req.originalUrl}`).error(err);
				return res.status(500).json({
					success: false,
					error:   "Unknown Internal Server Error.",
					code:    0
				});
			})
			.get("/online", async (req, res) => res.status(200).json({
				success: true,
				uptime:  process.uptime()
			}));

		return this;
	}

	setCSPExtra(type: keyof Website["cspExtra"], value: string) {
		this.cspExtra[type] = value;
		return this;
	}


	addSubdomain(sub: string, ...routers: Array<ModuleImport<express.Handler> | express.Handler>) {
		if (!sub) throw new TypeError("missing subdomain");
		if (!routers || routers.length === 0) routers = [express.Router()];
		routers = routers.map(r => "default" in r ? r.default : r);
		if (this.subdomains.has(sub.toLowerCase())) throw new Error("subdomain already exists");
		this.app.use(subdomain(sub.toLowerCase(), ...(routers as Array<express.Handler>)));
		this.subdomains.set(sub.toLowerCase(), routers as Array<express.Handler>);
		return this;
	}

	addHandler(...provided: Array<ModuleImport<express.Handler> | express.Handler>) {
		if (provided.length === 0) throw new TypeError("missing router");
		provided = provided.map(pv => "default" in pv ? pv.default : pv);
		this.app.use(...provided as Array<express.Handler>);
		return this;
	}

	addStatic(dir: string): Website {
		this.app.use(express.static(path.resolve(dir)));
		return this;
	}
}
