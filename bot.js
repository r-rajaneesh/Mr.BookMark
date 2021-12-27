const Discord = require("discord.js");
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
const { prefix, color, warn, error } = require("./config.json");
const prettyMilliseconds = require("pretty-ms");
const keepAlive = require("./server");

// On Ready
client.once("ready", () => {
	console.log(`Ready to Bookmark messages!\n\n\n`);
});
client.on("messageCreate", async (message) => {
	if (message.content === `${prefix}help`) {
		message.reply({
			embeds: [
				{
					author: {
						name: "Mr.BookMark",
						icon_url: "https://cdn.discordapp.com/attachments/837890513990451280/838652379628044348/pack_icon.png",
					},
					color: color,
					fields: [
						{
							name: "Prefix",
							value: `${prefix}`,
						},
						{
							name: "Ping",
							value: `to check the bot's ping type ${prefix}ping and the bot will respond with the time taken to respond!`,
						},
						{
							name: "How to use?",
							value:
								"To Book Mark a message simply react to 🔖 on\n a message and the bot will send the message in your DM's",
						},
					],
					image: { url: "https://cdn.discordapp.com/attachments/837890513990451280/840821620745437205/Animation.gif" },
					footer: { text: "- By Mr.BookMark" },
				},
			],
		});
	}
	if (message.mentions.users.first() === client.user && !message.author.bot) {
		message.reply({
			embeds: [
				{
					author: {
						name: "Mr.BookMark",
						icon_url: "https://cdn.discordapp.com/attachments/837890513990451280/838652379628044348/pack_icon.png",
					},
					color: color,
					fields: [
						{
							name: "Prefix",
							value: `${prefix}`,
						},
						{
							name: "Ping",
							value: `to check the bot's ping type ${prefix}ping and the bot will respond with the time taken to respond!`,
						},
						{
							name: "How to use?",
							value:
								"To Book Mark a message simply react to 🔖 on\n a message and the bot will send the message in your DM's",
						},
					],
					image: {
						url: "https://cdn.discordapp.com/attachments/837890513990451280/840821620745437205/Animation.gif",
					},
					footer: { text: "- By Mr.BookMark" },
				},
			],
		});
	}
	if (message.content === `${prefix}ping`) {
		message.reply({
			embeds: [
				{
					author: {
						name: "Pong!",
						icon_url: "https://cdn.discordapp.com/attachments/807219422737334322/838648055758192660/ping.gif",
					},
					color: color,
					fields: [
						{
							name: "Latency",
							value: `${Date.now() - message.createdTimestamp}ms`,
						},
						{
							name: "Uptime",
							value: prettyMilliseconds(client.uptime, {
								secondsDecimalDigits: 0,
							}),
						},
					],
					footer: {
						text: String(new Date().toUTCString()),
					},
				},
			],
		});
	}

	if (message.content === `${prefix}die`) {
		if (message.author.id === "738032578820309072") {
			message
				.react("👍")
				.then(() =>
					message.channel.send({
						embeds: [
							{
								title: "Shutting the bot down",
								description: `The bot has been shut down by ${message.author.tag}`,
								color: color, //your color in the blank
							},
						],
					}),
				)
				.then(() => process.exit());
			var user = `${message.author.tag}`;
			console.log(`Bot has been stopped by ${user}`);
			console.log("Mr.BookMark is Dead!");
		} else
			message
				.delete()
				.then(() =>
					message.channel
						.send({
							embeds: [
								{
									title: "This can only be done by the owner of the bot!",
								},
							],
						})
						.then((message) => message.delete({ timeout: 10000 })),
				)
				.catch((error) => console.error(error));
	}
});

client.on("messageReactionAdd", async (reaction, user) => {
	if (reaction.partial) {
		await reaction.message.channel.messages.fetch({ limit: 100 });
	}
	if (reaction.emoji.name === "🔖") {
		user
			.send({
				embeds: [
					{
						color: color,
						author: {
							name: `${reaction?.message?.author?.username}`,
							icon_url: `${reaction.message.author.displayAvatarURL()}`,
						},
						description: `${reaction.message.content}`,
						fields: [{ name: "Original", value: `[Jump](${reaction.message.url})` }],
						footer: {
							text: `From ${reaction.message.guild.name} #${reaction.message.channel.name}`,
						},
					},
				],
			})
			.then(() =>
				reaction.message.reactions.cache
					.get("🔖")
					.remove()
					.catch((error) => console.error("Failed to remove reactions: ", error)),
			);
	}
	try {
		if (
			reaction.emoji.name === "❌" &&
			reaction.message.channel.type === "DM" &&
			reaction.message?.author?.id === client.user.id
		) {
			await reaction.message.delete();
		}
	} catch (e) {
		reaction.message.channel.send({
			embeds: [{ author: { name: "Unable to delete message" }, description: "message is too old to be deleted" }],
		});
	}
});

keepAlive();
client.login(process.env.bottoken);
