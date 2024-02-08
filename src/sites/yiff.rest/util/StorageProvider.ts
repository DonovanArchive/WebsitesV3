import LocalProvider from "./storage/LocalProvider";
import type IStorageProvider from "./storage/IStorageProvider";
import { services } from "../../../config";

// const StorageProvider: IStorageProvider = new S3Provider(services["e621-thumbnails"].baseURL, services["e621-thumbnails"].s3.accessKey, services["e621-thumbnails"].s3.secretKey, services["e621-thumbnails"].s3.endpoint, services["e621-thumbnails"].s3.bucket, false);
// const StorageProvider: IStorageProvider = new BunnyProvider(services["e621-thumbnails"].baseURL, services["e621-thumbnails"].accessKey, services["e621-thumbnails"].storageZoneName);
const StorageProvider: IStorageProvider = new LocalProvider(services["e621-thumbnails"].baseURL, "/data/e621-thumbnails");
export default StorageProvider;
