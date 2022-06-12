import { discord } from "@config";
import { APIKey } from "@models";
import Webhooks from "@util/Webhooks";
import EmbedBuilder from "@util/EmbedBuilder";
import type { Request, Response } from "express";
import express from "express";
import nacl from "tweetnacl";
import type {
	APIPingInteraction,
	APIApplicationCommandGuildInteraction,
	APIMessageComponentGuildInteraction,
	APIInteractionResponse,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIApplicationCommandInteractionDataStringOption,
	APIMessageComponentInteractionData,
	APIChatInputApplicationCommandInteractionData,
	APIInteractionResponseChannelMessageWithSource
} from "discord-api-types/v10";
import { MessageFlags, InteractionType, InteractionResponseType, ComponentType } from "discord-api-types/v10";

const app = express.Router();

const color = 0x665857;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const clientIcon = "https://assets.yiff.rest/main.jpg";

app
	.get("/", async(req,res) => res.redirect("https://yiff.rest"))
	.post("/", async(req: Request<never, APIInteractionResponse, APIPingInteraction | APIApplicationCommandGuildInteraction | APIMessageComponentGuildInteraction>, res) => {
		if (!req.headers["x-signature-timestamp"] || !req.headers["x-signature-ed25519"]) return res.status(401).end();
		const isVerified = nacl.sign.detached.verify(
			// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
			Buffer.from(req.headers["x-signature-timestamp"] + JSON.stringify(req.body)),
			Buffer.from(req.headers["x-signature-ed25519"] as string, "hex"),
			Buffer.from(discord["yiffy-bot"].key, "hex")
		);
		if (isVerified === false) return res.status(401).end();
		switch (req.body.type) {
			case InteractionType.Ping: return res.status(200).json({
				type: InteractionResponseType.Pong
			});

			case InteractionType.ApplicationCommand: {
				if (!("guild_id" in req.body)) return res.status(200).json({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags:   64,
						content: "My commands cannot be used in direct messages, sorry.."
					}
				});

				switch (req.body.data.name) {
					case "apikey": {
						const sub = (req.body.data as APIChatInputApplicationCommandInteractionData).options![0] as APIApplicationCommandInteractionDataSubcommandOption;
						switch (sub.name) {
							case "create": {
								const keyCount = await APIKey.getOwned(req.body.member.user.id);
								if (keyCount.length >= 3)  return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   MessageFlags.Ephemeral,
										content: "You already have the maximum amount of api keys."
									}
								});
								const application = (sub.options?.find(o => o.name === "application-name") as APIApplicationCommandInteractionDataStringOption)?.value;
								const contact = (sub.options?.find(o => o.name === "contact") as APIApplicationCommandInteractionDataStringOption)?.value;
								if (!application) return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   MessageFlags.Ephemeral,
										content: "An application name is required."
									}
								});
								if (application.length > 100) return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   64,
										content: "Please provide a shorter application name."
									}
								});
								if (!contact) return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   64,
										content: "Contact information is required."
									}
								});
								if (contact.length > 100) return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   64,
										content: "Please provide a shorter contact."
									}
								});

								const id = await APIKey.new({
									unlimited:       false,
									owner:           req.body.member.user.id,
									application,
									active:          true,
									contact,
									disabled:        false,
									disabled_reason: null
								});

								void Webhooks.get("yiffyAPIKey").execute({
									embeds: [
										new EmbedBuilder()
											.setTitle("API Key Created")
											.setDescription([
												`Key: \`${id}\``,
												// <:redTick:865401803256627221> <:greenTick:865401802920951819>
												`Application: **${application}**`,
												`Contact: ${contact || "**NONE**"}`,
												"Active: <:greenTick:865401802920951819>",
												"Disabled: <:redTick:865401803256627221>",
												"Unlimited: <:redTick:865401803256627221>",
												"Flow Access: <:redTick:865401803256627221>"
											])
											.setColor(0x008000)
											.setTimestamp(new Date().toISOString())
											.setAuthor(`${req.body.member.user.username}#${req.body.member.user.discriminator}`, `https://cdn.discordapp.com/avatars/${req.body.member.user.id}/${req.body.member.user.avatar!}.png?size=256`)
											.toJSON()
									]
								});

								return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   MessageFlags.Ephemeral,
										content: `Your api key for the application **${application}** has been created.\nKey: ||${id}||\n\nIf needs be, you can delete this key using the \`delete\` subcommand.`
									}
								});
								break;
							}

							case "delete": {
								const keys = await APIKey.getOwned(req.body.member.user.id);
								if (keys.length === 0) return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   MessageFlags.Ephemeral,
										content: "You do not have any api keys to delete."
									}
								});

								return (res.status(200) as Response<APIInteractionResponseChannelMessageWithSource>).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:  MessageFlags.Ephemeral,
										embeds: [
											// @ts-expect-error suck it djs
											new EmbedBuilder()
												.setTitle("APIKey Deletion")
												.setDescription("Please select a key from below to delete.")
												.setTimestamp(new Date().toISOString())
												.setColor(color)
												.toJSON()
										],
										components: [
											{
												type:       ComponentType.ActionRow,
												components: [
													{
														type:      ComponentType.SelectMenu,
														custom_id: `delete-key.${req.body.member.user.id}`,
														options:   keys.map(k => ({
															label: k.application,
															value: k.id
														}))
													}
												]
											}
										]
									}
								});
								break;
							}

							case "list": {
								const keys = await APIKey.getOwned(req.body.member.user.id);
								if (keys.length === 0) return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   MessageFlags.Ephemeral,
										content: "You do not have any api keys to list."
									}
								});

								return res.status(200).json({
									type: InteractionResponseType.ChannelMessageWithSource,
									data: {
										flags:   MessageFlags.Ephemeral,
										content: `We found the following api keys:\n\n${keys.map((k, i) => [
											`${i + 1}.)`,
											`- Key: ||${k.id}||`,
											`- Application: \`${k.application}\``,
											`- Contact: \`${k.contact || "NONE"}\``,
											`- Active: ${k.active ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`,
											`- Disabled: ${k.disabled ? `<:greenTick:865401802920951819> (Reason: ${k.disabledReason ?? "NONE"})` : "<:redTick:865401803256627221>"}`,
											`- Unlimited: ${k.unlimited ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`,
											`- Flow Access: ${k.flowAccess ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`
										].join("\n")).join("\n\n")}`
									}
								});
								break;
							}
						}
						break;
					}

					default: return res.status(200).json({
						type: InteractionResponseType.ChannelMessageWithSource,
						data: {
							flags:   MessageFlags.Ephemeral,
							content: "Unknown interaction command."
						}
					});
				}
				break;
			}

			case InteractionType.MessageComponent: {
				const d = req.body.data as APIMessageComponentInteractionData;
				if (!d.custom_id.endsWith(req.body.member.user.id)) return res.status(200).json({
					type: InteractionResponseType.ChannelMessageWithSource,
					data: {
						flags:   MessageFlags.Ephemeral,
						content: "This button is not for you."
					}
				});

				switch (d.component_type) {
					case ComponentType.SelectMenu: {
						if (d.custom_id.startsWith("delete-key")) {
							const key = await APIKey.get(d.values[0]);
							if (!key) return res.status(200).json({
								type: InteractionResponseType.UpdateMessage,
								data: {
									flags:   MessageFlags.Ephemeral,
									content: "We couldn't find that key."
								}
							});

							if (key.owner !== req.body.member.user.id) return res.status(200).json({
								type: InteractionResponseType.UpdateMessage,
								data: {
									flags:   MessageFlags.Ephemeral,
									content: "You don't own that key."
								}
							});

							const ok = await key.delete();

							if (!ok) return res.status(200).json({
								type: InteractionResponseType.UpdateMessage,
								data: {
									flags:   MessageFlags.Ephemeral,
									content: "We failed to delete that key."
								}
							});
							else {


								void Webhooks.get("yiffyAPIKey").execute({
									embeds: [
										new EmbedBuilder()
											.setTitle("API Key Deleted")
											.setDescription([
												`Key: \`${key.id}\``,
												`Application: **${key.application}**`,
												`Contact: ${key.contact || "**NONE**"}`,
												`Active: ${key.active ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`,
												`Disabled: ${key.disabled ? `<:greenTick:865401802920951819> (Reason: ${key.disabledReason ?? "NONE"})` : "<:redTick:865401803256627221>"}`,
												`Unlimited: ${key.unlimited ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`,
												`Flow Access: ${key.flowAccess ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`
											])
											.setColor(0xDC143C)
											.setTimestamp(new Date().toISOString())
											.setAuthor(`${req.body.member.user.username}#${req.body.member.user.discriminator}`, `https://cdn.discordapp.com/avatars/${req.body.member.user.id}/${req.body.member.user.avatar!}.png?size=256`)
											.toJSON()
									]
								});
								return res.status(200).json({
									type: InteractionResponseType.UpdateMessage,
									data: {
										flags:      MessageFlags.Ephemeral,
										content:    "That api key has been deleted.",
										components: [],
										embeds:     []
									}
								});
							}
						}
					}
				}
				break;
			}
		}
	});

export default app;
