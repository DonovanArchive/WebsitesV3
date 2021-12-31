import fetch from "node-fetch";
import FormData from "form-data";
import cheerio from "cheerio";

export default async function ezgifPreview(url: string, startTime: number, endTime: number, len: number) {
	const start = process.hrtime.bigint();
	// upload
	const uploadStart = process.hrtime.bigint();
	const fdV = new FormData();
	fdV.append("new-image-url", url);
	fdV.append("new-image", Buffer.from(""));
	fdV.append("upload", "Upload video!");
	const v = await fetch("https://ezgif.com/cut-video", {
		method:  "POST",
		headers: fdV.getHeaders(),
		body:    fdV
	});
	const rawBody = await v.text();
	const body = cheerio.load(rawBody);
	const token = body("input[type=hidden][name=token]").attr("value");
	const vidLocation = `https://ezgif.com${body("form").attr("action")!}`;
	if (!token) throw new Error("Failed to get token");
	const uploadEnd = process.hrtime.bigint();

	// cut
	const cutStart = process.hrtime.bigint();
	const fdC = new FormData();
	fdC.append("file", vidLocation.split("/").slice(-1)[0]);
	fdC.append("token", token);
	fdC.append("start", startTime);
	fdC.append("end", endTime);
	fdC.append("cut-video", "Cut video!");
	const cut = await fetch(vidLocation, {
		method:  "POST",
		headers: fdC.getHeaders(),
		body:    fdC
	});
	const cBodyRaw = await cut.text();
	const cBody = cheerio.load(cBodyRaw);
	const file = cBody("input[type=hidden][name=file]").attr("value");
	const cutEnd = process.hrtime.bigint();

	const getVTGStart = process.hrtime.bigint();
	// get video-to-gif info
	const vtg = await fetch(`https://ezgif.com/video-to-gif/${file!}`, {
		method: "GET"
	});
	const gBodyRaw = await vtg.text();
	const gBody = cheerio.load(gBodyRaw);
	const token2 = gBody("input[type=hidden][name=token]").attr("value");
	const vidLocation2 = gBody("form").attr("action");
	const getVTGEnd = process.hrtime.bigint();

	// convert
	const convertStart = process.hrtime.bigint();
	const fdG = new FormData();
	fdG.append("file", vidLocation2!.split("/").slice(-1)[0]);
	fdG.append("token", token2);
	fdG.append("start", 0);
	fdG.append("end", len);
	fdG.append("size", "original");
	fdG.append("fps", 15);
	fdG.append("method", "ffmpeg");
	const convert = await fetch(`${vidLocation2!}?ajax=true`, {
		method:  "POST",
		headers: fdG.getHeaders(),
		body:    fdG
	});
	const cvBodyRaw = await convert.text();
	const cvBody = cheerio.load(cvBodyRaw);
	const out = cvBody("a.save").attr("href");
	const convertEnd = process.hrtime.bigint();
	const end = process.hrtime.bigint();

	return {
		time: {
			total:     Math.floor(Number(end - start) * 1e-6),
			totalNs:   (end - start).toString(),
			upload:    Math.floor(Number(uploadEnd - uploadStart) * 1e-6),
			uploadNs:  (uploadEnd - uploadStart).toString(),
			cut:       Math.floor(Number(cutEnd - cutStart) * 1e-6),
			cutNs:     (cutEnd - cutStart).toString(),
			getVTG:    Math.floor(Number(getVTGEnd - getVTGStart) * 1e-6),
			getVTGNs:  (getVTGEnd - getVTGStart).toString(),
			convert:   Math.floor(Number(convertEnd - convertStart) * 1e-6),
			convertNs: (convertEnd - convertStart).toString()
		},
		tempURL: out,
		out:     await fetch(out!).then((r) => r.buffer())
	};
}
