import IStorageProvider from "./IStorageProvider";
import { dirname } from "path";
import { createHash } from "crypto";

interface FileListEntry {
	ArrayNumber: string;
	Checksum: string;
	ContentType: string;
	DateCreated: string;
	Guid: string;
	IsDirectory: boolean;
	LastChanged: string;
	Length: number;
	ObjectName: string;
	Path: string;
	ReplicatedZones: string;
	ServerId: string;
	StorageZoneId: string;
	StorageZoneName: string;
	UserId: string;
}
export default class BunnyProvider extends IStorageProvider {
	private readonly accessKey: string;
	private readonly baseURL: string;
	private readonly storageZoneName: string;
	constructor(baseURL: string, accessKey: string, storageZoneName: string) {
		super();
		this.accessKey = accessKey;
		this.baseURL = baseURL;
		this.storageZoneName = storageZoneName;
	}

	override async delete(path: string) {
		await fetch(`https://storage.bunnycdn.com/${this.storageZoneName}/${path}`, {
			method:  "DELETE",
			headers: {
				AccessKey: this.accessKey
			}
		});
	}

	override async exists(path: string) {
		const r = await fetch(`https://storage.bunnycdn.com/${this.storageZoneName}${dirname(`/${path}`)}`, {
			method:  "GET",
			headers: {
				AccessKey: this.accessKey
			}
		}).catch(() => null);

		if (r === null || r.status !== 200) {
			return false;
		}

		return (await r.json() as Array<FileListEntry>).find(e => `${e.Path.slice(`/${this.storageZoneName}`.length)}${e.ObjectName}` === path) !== undefined;
	}

	override async get(path: string) {
		const r = await fetch(`https://storage.bunnycdn.com/${this.storageZoneName}/${path}`, {
			method:  "GET",
			headers: {
				AccessKey: this.accessKey
			}
		}).catch(() => null);

		return r && r.status === 200 ? Buffer.from(await r.arrayBuffer()) : null;
	}

	override async put(path: string, data: Buffer) {
		await fetch(`https://storage.bunnycdn.com/${this.storageZoneName}/${path}`, {
			method:  "PUT",
			headers: {
				AccessKey: this.accessKey,
				Checksum:  createHash("sha256").update(data).digest("hex")
			},
			body: data
		});

		return `${this.baseURL}/${path}`;
	}
}
