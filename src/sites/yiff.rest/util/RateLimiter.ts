import InMemoryRateLimiter from "./ratelimiting/InMemoryRateLimiter";
import type IRateLimiter from "./ratelimiting/IRateLimiter";
import RedisRateLimiter from "./ratelimiting/RedisRateLimiter";
import { READONLY } from "../../../config";
import db from "../../../db";


const RateLimiter: IRateLimiter = READONLY ? new InMemoryRateLimiter() : new RedisRateLimiter(db.r);
export default RateLimiter;
