import { YiffyErrorCodes } from "./Constants";
import { dataDir, userAgents } from "../config";
import {
	APIKey,
	DEFAULT_LIMIT_LONG,
	DEFAULT_LIMIT_SHORT,
	DEFAULT_WINDOW_LONG,
	DEFAULT_WINDOW_SHORT
} from "../db/Models";
import RateLimiter from "../sites/yiff.rest/util/RateLimiter";
import checkDiskSpace from "check-disk-space";
import type { NextFunction, Request, Response } from "express";
import { access, readFile } from "fs/promises";

interface BlockEntry {
	ip: string;
	reason: string;
}

export async function checkForBlock(req: Request, res: Response, next: NextFunction) {
	const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString();

	// we reread the file each time to avoid having to restart to update the list
	const blocked = await access(`${dataDir}/shared/blocked.json`).then(async() => {
		const list = (JSON.parse(await readFile(`${dataDir}/shared/blocked-ips.json`, "utf8"))) as Array<BlockEntry>;
		return list.find(entry => entry.ip === ip) ?? null;
	}).catch(() => null);
	if (blocked !== null) return res.status(403).json({
		success: false,
		error:   "You have been blocked from accessing this service.",
		extra:   {
			reason: blocked.reason,
			help:   "https://yiff.rest/support"
		},
		code: YiffyErrorCodes.SUSPECTED_BROWSER_IMPERSONATION
	});

	return next();
}

export async function diskSpaceCheck(req: Request, res: Response, next: NextFunction) {
	const d = await checkDiskSpace("/");
	if (d.free === 0) {
		if (req.originalUrl.split("?")[0].endsWith("/image")) return res.status(507).end();
		else return res.status(507).json({
			success: false,
			error:   "Internal disk is full, try again later.",
			code:    YiffyErrorCodes.DISK_FULL
		});
	}

	return next();
}

export async function userAgentCheck(req: Request, res: Response, next: NextFunction) {
	for (const { regex, reason } of userAgents.agents) if (regex.test(req.headers["user-agent"] || "")) return res.status(403).json({
		success: false,
		error:   "Your user agent has been blocked. See \"extra\" for the reasoning.",
		code:    YiffyErrorCodes.BLOCKED_USERAGENT,
		extra:   {
			reason: userAgents.reasons[reason as keyof typeof userAgents["reasons"]],
			help:   "https://yiff.rest/support"
		}
	});

	return next();
}

export function validateAPIKey(required = false, flag?: number) {
	return (async(req: Request, res: Response, next: NextFunction) => {
		if (!req.headers.authorization) {
			if (required) return res.status(401).json({
				success: false,
				error:   "AN API key is required to access this service.",
				code:    YiffyErrorCodes.API_KEY_REQUIRED
			});
			else return next();
		} else {
			const key = await APIKey.get(req.headers.authorization);
			if (!key) return res.status(401).json({
				success: false,
				error:   "Invalid api key.",
				code:    YiffyErrorCodes.INVALID_API_KEY
			});

			if (key.active === false) return res.status(401).json({
				success: false,
				error:   "Api key is inactive.",
				code:    YiffyErrorCodes.INACTIVE_API_KEY
			});

			if (key.disabled === true) return res.status(403).json({
				success: false,
				error:   "Your api key has been disabled by an administrator. See \"extra.reason\" for the reasoning.",
				extra:   {
					reason:  key.disabledReason,
					support: "https://yiff.rest/support",
					code:    YiffyErrorCodes.DISABLED_API_KEY
				}
			});

			if (flag !== undefined && (key.flags & flag) !== flag) return res.status(403).json({
				success: false,
				error:   "You do not have access to this service.",
				code:    YiffyErrorCodes.SERVICE_NO_ACCESS
			});
		}
	});
}

export async function handleRateLimit(req: Request, res: Response, next: NextFunction) {
	const key = !req.headers.authorization ? null : await APIKey.get(req.headers.authorization);

	const r = await RateLimiter.process(req, res, key?.windowLong ?? DEFAULT_WINDOW_LONG, key?.limitLong ?? DEFAULT_LIMIT_LONG, key?.windowShort ?? DEFAULT_WINDOW_SHORT, key?.limitShort ?? DEFAULT_LIMIT_SHORT);
	if (!r) return;

	return next();
}
