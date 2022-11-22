import { cacheDir, discord } from "@config";
import { APIKey } from "@models";
import Webhooks from "@util/Webhooks";
import { ApplicationCommandBuilder, ButtonColors, ComponentBuilder, EmbedBuilder } from "@oceanicjs/builders";
import type { ModalActionRow, MessageActionRow, CreateApplicationCommandOptions } from "oceanic.js";
import {
	ApplicationCommandTypes,
	ApplicationCommandOptionTypes,
	TextInputStyles,
	Client,
	InteractionTypes,
	MessageFlags
} from "oceanic.js";
import FuzzySearch from "fuzzy-search";
import { createHash } from "crypto";
import { access, readFile, writeFile } from "fs/promises";

const client = new Client({
	auth:    `Bot ${discord["yiffy-bot"].token}`,
	gateway: {
		intents: 0
	}
});

client.once("ready", async() => {
	const commands = [
		new ApplicationCommandBuilder(ApplicationCommandTypes.CHAT_INPUT, "apikey")
			.addOption("create", ApplicationCommandOptionTypes.SUB_COMMAND)
			.addOption("delete", ApplicationCommandOptionTypes.SUB_COMMAND, (sub) => {
				sub.addOption("key", ApplicationCommandOptionTypes.STRING, (option) => {
					option.setAutocomplete();
				});
			})
			.addOption("list", ApplicationCommandOptionTypes.SUB_COMMAND)
			.toJSON()
	];
	let cache: Array<CreateApplicationCommandOptions> = [];
	if (await access(`${cacheDir}/commands.json`).then(() => true, () => false)) {
		cache = JSON.parse(await readFile(`${cacheDir}/commands.json`, "utf8")) as Array<CreateApplicationCommandOptions>;
	}

	if (JSON.stringify(cache) !== JSON.stringify(commands)) {
		await client.application.bulkEditGuildCommands(discord["yiffy-bot"].guild, commands);
		await writeFile(`${cacheDir}/commands.json`, JSON.stringify(commands));
	}
});

client.on("interactionCreate", async(interaction) => {
	switch (interaction.type) {
		case InteractionTypes.APPLICATION_COMMAND: {
			if (interaction.guildID === null) return interaction.createMessage({
				content: "My commands cannot be used in Direct Messages.",
				flags:   MessageFlags.EPHEMERAL
			});

			switch (interaction.data.name) {
				case "apikey": {
					const [subcommand] = interaction.data.options.getSubCommand<["create" | "delete" | "list"]>(true);
					switch (subcommand) {
						case "create": {
							const keyCount = await APIKey.getOwned(interaction.user.id);
							if (keyCount.length >= 3) return interaction.createMessage({
								flags:   MessageFlags.EPHEMERAL,
								content: "You already have the maximum amount of api keys. Contact a developer if you believe you need an exception to be made."
							});
							return interaction.createModal({
								customID: "apikey-create",
								components:
									new ComponentBuilder<ModalActionRow>()
										.addTextInput({
											customID:    "apikey-create.name",
											placeholder: "My Awesome Application",
											minLength:   3,
											maxLength:   50,
											label:       "Name",
											style:       TextInputStyles.SHORT
										})
										.addTextInput({
											customID:    "apikey-create.contact",
											placeholder: "You can contact me at hewwo@yiff.rocks (please do not say Discord, we already keep track of who owns what key)",
											minLength:   5,
											maxLength:   400,
											label:       "Contact",
											style:       TextInputStyles.PARAGRAPH
										})
										.toJSON(),
								title: "Create API Key"
							});
						}

						case "delete": {
							const key = (await APIKey.getOwned(interaction.user.id)).find(k => createHash("md5").update(k.id).digest("hex") === interaction.data.options.getString("key", true));
							if (!key || key.owner !== interaction.user.id) return interaction.createMessage({
								content: "Invalid key specified.",
								flags:   MessageFlags.EPHEMERAL
							});

							if (key.disabled) return interaction.createMessage({
								content: `This key has been disabled by a developer. To have this key deleted or removed, concat a developer.\n\nDisable Reason: **${key.disabledReason ?? "(None)"}**`,
								flags:   MessageFlags.EPHEMERAL
							});

							return interaction.createMessage({
								content:    `Are you sure you want to delete the key **${key.application}**? This action cannot be undone.`,
								flags:      MessageFlags.EPHEMERAL,
								components: new ComponentBuilder<MessageActionRow>()
									.addInteractionButton({
										// it IS ephemeral, but we still hash the key just in case (the key itself is the only unique id we have)
										customID: `apikey-delete-yes.${createHash("md5").update(key.id).digest("hex")}.${interaction.user.id}`,
										label:    "Yes",
										style:    ButtonColors.GREEN
									})
									.addInteractionButton({
										customID: `apikey-delete-no.${interaction.user.id}`,
										label:    "No",
										style:    ButtonColors.RED
									})
									.toJSON()
							});
							break;
						}

						case "list": {
							const keys = await APIKey.getOwned(interaction.user.id);

							if (keys.length === 0) return interaction.createMessage({
								content: "You do not have any API keys.",
								flags:   MessageFlags.EPHEMERAL
							});

							return interaction.createMessage({
								content: `We found the following api keys:\n\n${keys.map((k, i) => [
									`${i + 1}.)`,
									`- Key: ||${k.id}||`,
									`- Application: \`${k.application}\``,
									`- Contact: \`${k.contact || "NONE"}\``,
									`- Active: ${k.active ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`,
									`- Disabled: ${k.disabled ? `<:greenTick:865401802920951819> (Reason: ${k.disabledReason ?? "NONE"})` : "<:redTick:865401803256627221>"}`,
									`- Unlimited: ${k.unlimited ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`
								].join("\n")).join("\n\n")}`,
								flags: MessageFlags.EPHEMERAL
							});
						}
					}
				}
			}
			break;
		}

		case InteractionTypes.MESSAGE_COMPONENT: {
			const id = interaction.data.customID.split(".").slice(-1)[0];
			if (interaction.user.id !== id) return interaction.createMessage({
				content: "That is not yours to play with."
			});
			switch (interaction.data.customID.split(".")[0]) {
				case "apikey-delete-yes": {
					const key = (await APIKey.getOwned(interaction.user.id)).find(k => createHash("md5").update(k.id).digest("hex") === interaction.data.customID.split(".")[1]);
					if (!key) return interaction.createMessage({
						content: "Invalid key specified.",
						flags:   MessageFlags.EPHEMERAL
					});
					await key.delete();
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
									`Unlimited: ${key.unlimited ? "<:greenTick:865401802920951819>" : "<:redTick:865401803256627221>"}`
								])
								.setColor(0xDC143C)
								.setTimestamp(new Date().toISOString())
								.setAuthor(interaction.user.tag, interaction.user.avatarURL())
								.toJSONRaw()
						]
					});
					return interaction.createMessage({
						content: "Key deleted.",
						flags:   MessageFlags.EPHEMERAL
					});
					break;
				}

				case "apikey-delete-no": {
					return interaction.createMessage({
						content: "Cancelled.",
						flags:   MessageFlags.EPHEMERAL
					});
					break;
				}
			}
			break;
		}

		case InteractionTypes.APPLICATION_COMMAND_AUTOCOMPLETE: {
			switch (interaction.data.name) {
				case "apikey": {
					const [subcommand] = interaction.data.options.getSubCommand<["delete"]>(true);
					switch (subcommand) {
						case "delete": {
							const keys = await APIKey.getOwned(interaction.user.id);
							const search = new FuzzySearch(keys.map(k => ({
								name:  k.application,
								value: createHash("md5").update(k.id).digest("hex")
							})), ["name"]);
							return interaction.result(search.search(interaction.data.options.getString("key", true)));
							break;
						}
					}
					break;
				}
			}
			break;
		}

		case InteractionTypes.MODAL_SUBMIT: {
			switch (interaction.data.customID) {
				case "apikey-create": {
					const row = interaction.data.components[0].components;
					const name = row.find(c => c.customID === "apikey-create.name")!.value!;
					const contact = row.find(c => c.customID === "apikey-create.contact")!.value!;
					if (name.length < 3 || name.length > 50) return interaction.createMessage({
						content: "Name must be between 3 and 5 characters.",
						flags:   MessageFlags.EPHEMERAL
					});
					if (contact.length < 5 || contact.length > 400) return interaction.createMessage({
						content: "Contact must be between 5 and 400 characters.",
						flags:   MessageFlags.EPHEMERAL
					});

					const key = await APIKey.new({
						unlimited:       false,
						owner:           interaction.user.id,
						application:     name,
						contact,
						disabled:        false,
						disabled_reason: null,
						active:          true
					});

					void Webhooks.get("yiffyAPIKey").execute({
						embeds: [
							new EmbedBuilder()
								.setTitle("API Key Created")
								.setDescription([
									`Key: \`${key}\``,
									// <:redTick:865401803256627221> <:greenTick:865401802920951819>
									`Application: **${name}**`,
									`Contact: ${contact}`,
									"Active: <:greenTick:865401802920951819>",
									"Disabled: <:redTick:865401803256627221>",
									"Unlimited: <:redTick:865401803256627221>"
								])
								.setColor(0x008000)
								.setTimestamp(new Date().toISOString())
								.setAuthor(interaction.user.tag, interaction.user.avatarURL())
								.toJSONRaw()
						]
					});
				}
			}
			break;
		}
	}
});
