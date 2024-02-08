import IStorageProvider from "./IStorageProvider";
import AWS from "aws-sdk";

export default class S3Provider extends IStorageProvider {
	private readonly bucket: string;
	private readonly s3: AWS.S3;
	constructor(baseURL: string, accessKey: string, secretKey: string, endpoint: string, bucket: string, s3BucketEndpoint = false) {
		super(baseURL);
		this.bucket = bucket;
		this.s3 = new AWS.S3({
			credentials: new AWS.Credentials(accessKey, secretKey),
			endpoint,
			s3BucketEndpoint
		});
	}

	override async delete(path: string) {
		await this.s3.deleteObject({
			Bucket: this.bucket,
			Key:    path
		}).promise();
	}

	override async exists(path: string) {
		return this.s3.headObject({
			Bucket: this.bucket,
			Key:    path
		}).promise().then(() => true).catch(() => false);
	}

	override async get(path: string) {
		return this.s3.getObject({
			Bucket: this.bucket,
			Key:    path
		}).promise().then(r => r.Body as Buffer).catch(() => null);
	}

	override async put(path: string, data: Buffer) {
		return this.s3.putObject({
			Bucket:      this.bucket,
			Key:         path,
			Body:        data,
			ContentType: path.endsWith(".png") ? "image/png" : "image/gif"
		}).promise().then(() => `${this.baseURL}/${path}`);
	}
}
