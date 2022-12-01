import { YiffyErrorCodes } from "./Constants";
import { dataDir } from "../config";
import type { NextFunction, Request, Response } from "express";
import { access, readFile } from "fs/promises";

interface BlockEntry {
	ip: string;
	reason: string;
}
export default async function checkForBlock(req: Request, res: Response, next: NextFunction) {
	const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip).toString();

	// we reread the file each time to avoid having to restart to update the list
	const blocked = await access(`${dataDir}/shared/blocked.json`).then(async() => {
		const list = (JSON.parse(await readFile(`${dataDir}/shared/blocked-ips.json`, "utf8"))) as Array<BlockEntry>;
		return list.find(entry => entry.ip === ip) ?? null;
	}, () => null);
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
