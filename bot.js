const Discord = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const djsb = require("@discordjs/builders");
const client = new Discord.Client({
	shards: "auto",
	//shardCount: "auto",
	partials: ["MESSAGE", "CHANNEL", "REACTION", "USER", "GUILD_MEMBER"],
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MEMBERS,
		Discord.Intents.FLAGS.GUILD_BANS,
		Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
		Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
		Discord.Intents.FLAGS.GUILD_WEBHOOKS,
		Discord.Intents.FLAGS.GUILD_INVITES,
		Discord.Intents.FLAGS.GUILD_VOICE_STATES,
		Discord.Intents.FLAGS.GUILD_PRESENCES,
		Discord.Intents.FLAGS.GUILD_MESSAGES,
		Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Discord.Intents.FLAGS.GUILD_MESSAGE_TYPING,
		Discord.Intents.FLAGS.DIRECT_MESSAGES,
		Discord.Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
		Discord.Intents.FLAGS.DIRECT_MESSAGE_TYPING,
	],
	allowedMentions: { repliedUser: true, parse: ["users", "roles"] },
	restWsBridgeTimeout: 10000,
	restTimeOffset: 0,
	presence: {
		status: "dnd",
		activities: [
			{
				name: `Online at ${new Date().getHours()}-${new Date().getMinutes()}-${new Date().getSeconds()}`,
				type: "PLAYING",
			},
		],
	},
});
const fs = require("fs-extra");
require("dotenv").config();
const config = require("./config.json");
const prettyMilliseconds = require("pretty-ms");
const keepAlive = require("./server");
const rest = new REST({ version: "9" }).setToken(process.env.bottoken);

// On Ready

const intrct = new djsb.ContextMenuCommandBuilder().setName("Bookmark Message").setType(3);
client.once("ready", async () => {
	const guildSize = await client.guilds.fetch().then(async (g) => JSON.stringify(g.size));
	// await client.users.fetch();
	const memberSize = client.users.cache.size;
	console.log(`Ready to Bookmark messages!\n\n\nGuilds: ${guildSize}\nMembers: ${memberSize}\n\n\n`);
	(async () => {
		try {
			console.log("Started refreshing application (/) commands.");

			await rest.put(Routes.applicationCommands("837617682345623572"), {
				body: [intrct.toJSON()],
			});

			console.log("Successfully reloaded application (/) commands.");
		} catch (error) {
			console.error(error);
		}
	})();
});
client.on("interactionCreate", async (interaction) => {
	if (interaction.isContextMenu()) {
		await interaction.deferReply({ ephemeral: true });
		const message = await interaction.channel.messages.fetch(interaction.targetId);
		if (message.author.bot && !message.content) {
			return await interaction.editReply({
				embeds: [
					{
						author: { name: "Unable to bookmark this message" },
						description: "This message is an embed, this cannot be bookmarked",
						color: "RED",
					},
				],
				ephemeral: true,
			});
		}
		const embed = new Discord.MessageEmbed()
			.setAuthor({
				name: `${message?.author?.tag}`,
				iconURL: `${message.author?.displayAvatarURL()}`,
			})
			.setDescription(`${message.content}`)
			.addFields({ name: "Original Message", value: `[Jump to message](${message.url})`, inline: true })
			.setFooter(`From ${interaction.guild.name} in #${interaction.channel.name}`)
			.setColor("BLURPLE");
		if (message.attachments.first()) {
			if (message.attachments.first().contentType === ("image/png" || "image/gif" || "image/jpeg" || "image/jpng")) {
				embed.setImage(message.attachments.first()?.url);
			} else {
				embed.addFields({
					name: "Attachment included that cannot be bookmarked",
					value: `[Attachment](${message.attachments.first()?.url})`,
					inline: true,
				});
			}
		}
		await interaction.user
			.send({
				embeds: [embed],
			})
			.then(async (msg) => {
				return await interaction.editReply({
					embeds: [
						{
							author: { name: "Bookmarked!" },
							description: `Check your DM's`,
							fields: [
								{ name: "Bookmarked message", value: `[Jump to Message](${msg?.url})`, inline: true },
								{ name: "Original Message", value: `[Jump to message](${message.url})`, inline: true },
							],
							color: "BLURPLE",
						},
					],
					ephemeral: true,
				});
			})
			.catch(async (error) => {
				return await interaction.editReply({
					embeds: [
						{ author: { name: "Unable to Bookmark this message" }, description: `Is your DM's enabled?`, color: "RED" },
					],
				});
			});
	}
});
keepAlive();
client.login(process.env.bottoken);
