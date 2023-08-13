import type IStorageProvider from "./storage/IStorageProvider";
import BunnyProvider from "./storage/BunnyProvider";
import { services } from "../../../config";

// const StorageProvider: IStorageProvider = new S3Provider(services["e621-thumbnails"].baseURL, services["e621-thumbnails"].s3.accessKey, services["e621-thumbnails"].s3.secretKey, services["e621-thumbnails"].s3.endpoint, services["e621-thumbnails"].s3.bucket, false);
const StorageProvider: IStorageProvider = new BunnyProvider(services["e621-thumbnails"].baseURL, services["e621-thumbnails"].accessKey, services["e621-thumbnails"].storageZoneName);
export default StorageProvider;
