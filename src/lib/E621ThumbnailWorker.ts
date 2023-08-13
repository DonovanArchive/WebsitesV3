import "../util/MonkeyPatch";
import { filePath } from "./E621Thumbnails";
import StorageProvider from "../sites/yiff.rest/util/StorageProvider";
import e621Thumbnailer from "e621-thumbnailer";
import { workerData } from "worker_threads";

const { md5, type } =  workerData as { md5: string; type: "gif" | "png"; };

process.nextTick(async() => {
	const thumb = await e621Thumbnailer(md5, type === "png" ? "image" : "gif");
	await StorageProvider.put(filePath(md5, type), thumb);
	process.exit(0);
});
