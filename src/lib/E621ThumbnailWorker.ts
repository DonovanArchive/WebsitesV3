import "../util/MonkeyPatch";
import { filePath } from "./E621Thumbnails";
import { services } from "../config";
import e621Thumbnailer from "e621-thumbnailer";
import AWS from "aws-sdk";
import { writeFile } from "fs/promises";
import { workerData } from "worker_threads";

const { md5, type } =  workerData as { md5: string; type: "gif" | "png"; };

const aws = new AWS.S3({
	credentials:      new AWS.Credentials(services["e621-thumbnails"].accessKey, services["e621-thumbnails"].secretKey),
	endpoint:         services["e621-thumbnails"].endpoint,
	s3BucketEndpoint: true
});
process.nextTick(async() => {
	const thumb = await e621Thumbnailer(md5, type === "png" ? "image" : "gif");
	await writeFile(filePath(md5, type), thumb);
	await aws.putObject({
		Bucket:      services["e621-thumbnails"].bucket,
		Key:         filePath(md5, type),
		Body:        thumb,
		ContentType: type === "png" ? "image/png" : "image/gif"
	}).promise();
	process.exit(0);
});
