import checkDiskSpace from "check-disk-space";
import type { NextFunction, Request, Response } from "express";

export default async function diskSpaceCheck(req: Request, res: Response, next: NextFunction) {
	const d = await checkDiskSpace("/");
	if (d.free === 0) {
		if (req.originalUrl.split("?")[0].endsWith("/image")) return res.status(507).end();
		else return res.status(507).json({
			success: false,
			error:   "Internal disk is full, try again later."
		});
	}

	return next();
}
