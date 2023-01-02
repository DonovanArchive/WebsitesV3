import E621Post from "../../../db/Models/E621Post";
import E621Tag from "../../../db/Models/E621Tag";
import { Router } from "express";

const app = Router();

app.get("/posts", async (req, res) => res.status(200).json(await E621Post.getStats()))
	.get("/tags", async (req, res) => res.status(200).json(await E621Tag.getStats()));

export default app;
