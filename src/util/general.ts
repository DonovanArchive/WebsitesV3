import { whitelistedIPs } from "../config";
import type { Request } from "express";
import check from "ip-range-check";

export function getIP(req: Request) {
	const ip = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
	if (Array.isArray(ip)) return ip[0];
	return ip;
}

export function isWhitelisted(req: Request) {
	const ip = getIP(req);
	for (const wip of whitelistedIPs) {
		if (check(ip, wip)) return true;
	}
	return false;
}
