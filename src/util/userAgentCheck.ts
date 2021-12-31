
import { userAgents } from "@config";
import type { NextFunction, Request, Response } from "express";

export default async function userAgentCheck(req: Request, res: Response, next: NextFunction) {
	for (const { regex, reason } of userAgents.agents) if (regex.test(req.headers["user-agent"] || "")) return res.status(403).json({
		success: false,
		error:   "Your user agent has been blocked. See \"extra\" for the reasoning.",
		extra:   {
			reason: userAgents.reasons[reason as keyof typeof userAgents["reasons"]],
			help:   "https://yiff.rest/support"
		}
	});

	return next();
}
