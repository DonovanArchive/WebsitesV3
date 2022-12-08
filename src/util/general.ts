import type { Request } from "express";

export function getIP(req: Request) {
	const ip = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
	if (Array.isArray(ip)) return ip[0];
	return ip;
}
