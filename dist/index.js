import "dotenv/config";
import Discord, { Routes, REST } from "discord.js";
import figlet from "figlet";
import pc from "picocolors";
import ms from "ms";
import express from "express";
import sqlite from "better-sqlite3";
import fs from "fs-extra";
import picocolours from "picocolors";
const server = express();
fs.ensureDirSync("./databases");
fs.ensureDirSync("./logs");
const sql = new sqlite("./databases/bookmarks.sqlite", { fileMustExist: false });
const rest = new REST().setToken(`${process?.env?.BOT_TOKEN}`);
/* Prepare database */
sql.prepare(`CREATE TABLE IF NOT EXISTS dmbookmark (OriginalMessageId TEXT PRIMARY KEY, OriginalMessage TEXT NOT NULL, DirectMessage TEXT);`).run();
sql.prepare(`CREATE TABLE IF NOT EXISTS channelbookmark (OriginalMessageId TEXT PRIMARY KEY, OriginalMessage TEXT NOT NULL, ChannelMessage TEXT);`).run();
sql.prepare(`CREATE TABLE IF NOT EXISTS guildbookmark (GuildId TEXT PRIMARY KEY NOT NULL UNIQUE, ChannelId TEXT NOT NULL UNIQUE);`).run();
/* Run a web server to ping the bot when running on repl */
server.get("/", (req, res) => {
    res.send("Hello World");
});
/* Error logger function */
function log(data) {
    const date = new Date();
    console.log(`${picocolours.bold(`[${date.toLocaleString().toUpperCase().replace(",", "").replaceAll("/", ":")}] ❯❯❯ [${picocolours.red("ERROR")}]`)} ❯❯❯ ${data}`);
    fs.ensureFileSync(`./logs/${date.toLocaleString().toUpperCase().replace(",", "").replaceAll("/", ":").split(" ")[0]}.log`);
    fs.writeFileSync(`./logs/${date.toLocaleString().toUpperCase().replace(",", "").replaceAll("/", ":").split(" ")[0]}.log`, `[${date.toLocaleTimeString().toUpperCase()}] ❯❯❯ [ERROR] ❯❯❯ ${data}`);
}
/* Discord Bot Client */
const client = new Discord.Client({
    allowedMentions: { parse: [Discord.AllowedMentionsTypes.User], repliedUser: true },
    intents: [
        Discord.IntentsBitField.Flags.DirectMessageReactions,
        Discord.IntentsBitField.Flags.DirectMessages,
        Discord.IntentsBitField.Flags.GuildMessageReactions,
        Discord.IntentsBitField.Flags.GuildMessages,
        Discord.IntentsBitField.Flags.GuildMessageReactions,
        Discord.IntentsBitField.Flags.Guilds,
        Discord.IntentsBitField.Flags.MessageContent,
    ],
    partials: [
        Discord.Partials.Channel,
        Discord.Partials.GuildMember,
        Discord.Partials.Message,
        Discord.Partials.Reaction,
        Discord.Partials.ThreadMember,
        Discord.Partials.User,
    ],
    presence: { activities: [{ name: "your bookmarked messages", type: Discord.ActivityType.Watching }], status: Discord.PresenceUpdateStatus.Idle },
});
/* Application Commands */
const bookmarkCmd = new Discord.ContextMenuCommandBuilder().setName("Bookmark").setType(Discord.ApplicationCommandType.Message);
const bookmarkChannelCmd = new Discord.ContextMenuCommandBuilder().setName("Bookmark To Channel").setType(Discord.ApplicationCommandType.Message);
const bookmarkChannel = new Discord.SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Set a channel to send server bookmarks to")
    .addChannelOption((channel) => channel
    .setName("channel")
    .setDescription("Select a text channel or a announcement channel")
    .addChannelTypes(Discord.ChannelType.GuildAnnouncement, Discord.ChannelType.GuildText)
    .setRequired(true));
/* Discord bot Ready event */
client.on("ready", (client) => {
    client.user?.fetch(true); // Fetch all details of the bot
    const mrbookmark = figlet.textSync("Mr.Bookmark", {
        font: "ANSI Shadow",
    });
    console.log(`${"-".repeat(42)}\n`);
    console.log(`${mrbookmark}\n`);
    console.log(`${"-".repeat(42)}\n`);
    console.log(`❯❯❯ ${pc.green("Commands are now available for usage!")}\n`);
    client.guilds.fetch();
    console.log(`❯❯❯ ${pc.green(`Serving ${pc.reset(client.guilds.cache.size)} ${pc.green(`servers`)}`)}\n`);
    console.log(`❯❯❯ ${pc.green(`Serving ${pc.reset(`${client.users.cache.size}`)} ${pc.green(`members`)}`)}\n`);
    console.log(`❯❯❯ ${pc.green(`${pc.reset(client?.user?.tag)} ${pc.green(`is up and running`)}\n`)}`);
    console.log(`❯❯❯ ${pc.green("Boot Time:")} ${ms(Math.round(process.uptime() * 1000))}\n`);
    /* Checking for deleted messages when bot went offline or wasn't able to pick up the delete event */
    const DMBookmarks = sql.prepare(`SELECT * FROM dmbookmark;`).all();
    DMBookmarks.forEach((bookmark) => {
        const OriginalMessageId = JSON.parse(bookmark.OriginalMessageId);
        const OriginalMessage = JSON.parse(bookmark.OriginalMessage);
        const DirectMessage = JSON.parse(bookmark.DirectMessage);
        fetch(`https://discord.com/api/v10/channels/${OriginalMessage.channel}/messages/${OriginalMessageId}`, {
            headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json" },
            method: "GET",
        })
            .then(async (res) => {
            const message = await res.json();
            if (message?.code !== 10008)
                return;
            const DM = DirectMessage;
            DM.forEach((dm) => {
                client.users.fetch(dm.user).then((user) => {
                    user.dmChannel?.messages.fetch().then((messages) => {
                        const msg = messages.get(dm.id);
                        const originalEmbed = msg.embeds;
                        const dataEmbed = new Discord.EmbedBuilder()
                            .setAuthor({ name: `${originalEmbed[0].author?.name}`, iconURL: `${originalEmbed[0].author?.iconURL}` })
                            .setDescription(`> Original message deleted by author`)
                            .setTimestamp(new Date(originalEmbed[0]?.timestamp ?? ""))
                            .setColor("Blurple");
                        const infoEmbed = new Discord.EmbedBuilder()
                            .setTitle("Information")
                            .addFields(originalEmbed[1].fields)
                            .setColor("NotQuiteBlack")
                            .setFooter({ text: `${originalEmbed[1].footer?.text}` })
                            .setTimestamp();
                        msg.edit({ embeds: [dataEmbed, infoEmbed] }).catch((error) => log(error));
                    });
                });
            });
            sql.prepare(`DELETE FROM dmbookmark WHERE OriginalMessageId = (?)`).run(message.id);
        })
            .catch((error) => log(error));
    });
    const ChannelBookmarks = sql.prepare(`SELECT * FROM channelbookmark;`).all();
    ChannelBookmarks.forEach((bookmark) => {
        const OriginalMessageId = JSON.parse(bookmark.OriginalMessageId);
        const OriginalMessage = JSON.parse(bookmark.OriginalMessage);
        const ChannelMessage = JSON.parse(bookmark.ChannelMessage);
        fetch(`https://discord.com/api/v10/channels/${OriginalMessage.channel}/messages/${OriginalMessageId}`, {
            headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json" },
            method: "GET",
        })
            .then(async (res) => {
            const message = await res.json();
            if (message?.code !== 10008)
                return;
            const GuildChannel = ChannelMessage;
            GuildChannel.forEach(async (ChannelMessage) => {
                await fetch(`https://discord.com/api/v10/channels/${ChannelMessage.channel}/messages/${ChannelMessage.message}`, {
                    headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json" },
                    method: "GET",
                }).then(async (res) => {
                    const msg = await res.json();
                    if (msg.code && msg?.code === 10008) {
                        sql
                            .prepare(`UPDATE channelbookmark SET ChannelMessage = (?) WHERE OriginalMessageId = (?) `)
                            .run(JSON.stringify(GuildChannel.filter((v) => v.message !== ChannelMessage.message)), OriginalMessageId);
                        return;
                    }
                    const originalEmbed = msg.embeds;
                    const dataEmbed = new Discord.EmbedBuilder()
                        .setAuthor({ name: `${originalEmbed?.[0].author?.name}`, iconURL: `${originalEmbed?.[0].author?.icon_url}` })
                        .setDescription(`> Original message deleted by author`)
                        .setTimestamp(new Date(originalEmbed?.[0]?.timestamp ?? ""))
                        .setColor("Blurple")
                        .toJSON();
                    const infoEmbed = new Discord.EmbedBuilder()
                        .setTitle("Information")
                        .addFields(originalEmbed?.[1].fields)
                        .setColor("NotQuiteBlack")
                        .setFooter({ text: `${originalEmbed?.[1].footer?.text}` })
                        .setTimestamp()
                        .toJSON();
                    await fetch(`https://discord.com/api/v10/channels/${ChannelMessage.channel}/messages/${ChannelMessage.message}`, {
                        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json", "Content-Type": "application/json" },
                        method: "PATCH",
                        body: JSON.stringify({ embeds: [dataEmbed, infoEmbed] }),
                    }).catch((error) => log(error));
                });
            });
            sql.prepare(`DELETE FROM channelbookmark WHERE OriginalMessageId = (?)`).run(message.id);
        })
            .catch((error) => log(error));
    });
});
/* Discord bot commands */
client.on("interactionCreate", async (interaction) => {
    // Channel set command
    if (interaction.isChatInputCommand() && interaction.commandName === "setchannel") {
        await interaction.deferReply();
        const channel = interaction.options.getChannel("channel", true, [Discord.ChannelType.GuildAnnouncement, Discord.ChannelType.GuildText]);
        try {
            if (!sql.prepare(`SELECT * FROM guildbookmark WHERE GuildId = (?);`).get(interaction.guildId)) {
                sql.prepare(`INSERT INTO guildbookmark (GuildId, ChannelId) VALUES (?, ?);`).run(`${interaction.guildId}`, `${channel.id}`);
            }
            else {
                sql.prepare(`UPDATE guildbookmark SET ChannelId = (?) WHERE GuildId = (?);`).run(`${channel.id}`, `${interaction.guildId}`);
            }
            const embed = new Discord.EmbedBuilder()
                .setTitle("Server bookmark channel setup")
                .setDescription("Successfully set up a new channel for server bookmarks")
                .addFields([{ name: "Channel", value: `<#${channel.id}>` }])
                .setColor("Blurple")
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
        catch (error) {
            log(error);
            const embed = new Discord.EmbedBuilder()
                .setTitle("Server bookmark channel setup")
                .setDescription("Unsuccessfully in setting up a new channel for server bookmarks")
                .addFields([{ name: "Channel", value: `<#${channel.id}>` }])
                .setColor("Red")
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
    else if (interaction.isContextMenuCommand() && interaction.commandName === "Bookmark") {
        if (interaction?.channel?.type ===
            (Discord.ChannelType.GuildStageVoice ||
                Discord.ChannelType.DM ||
                Discord.ChannelType.GroupDM ||
                Discord.ChannelType.GuildVoice ||
                Discord.ChannelType.GuildStageVoice))
            return;
        await interaction.deferReply({ ephemeral: true });
        const message = await interaction.channel?.messages.fetch(interaction.targetId);
        if (!message)
            return;
        const attachments = message?.attachments;
        const msg = message?.content;
        const embeds = message?.embeds;
        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: `${message?.author.tag}`, iconURL: `${message?.author.displayAvatarURL()}` })
            .setDescription(`${message?.content.length !== 0 ? message.content : "`No message found`"}`)
            .setColor("Blurple")
            .setTimestamp();
        const infoEmbed = new Discord.EmbedBuilder()
            .setTitle("Information")
            .addFields({ name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true }, { name: "Embeds", value: `[${embeds.length}]`, inline: true }, {
            name: "From",
            value: `[${interaction?.guild?.name}](https://discord.com/channels/${interaction.guildId}) in <#${message?.channel?.id}>`,
            inline: true,
        })
            .setColor("NotQuiteBlack")
            .setFooter({ text: `${interaction.targetId}` })
            .setTimestamp();
        if (attachments?.first()) {
            if (attachments?.first()?.contentType === ("image/png" || "image/gif" || "image/jpeg" || "image/jpng")) {
                embed.setImage(`${attachments?.first()?.url}`);
            }
            else {
                embed.addFields({
                    name: "Attachment included that cannot be bookmarked",
                    value: `[Attachment](${attachments?.first()?.url})`,
                    inline: true,
                });
            }
        }
        const button = new Discord.ActionRowBuilder().addComponents(new Discord.ButtonBuilder().setCustomId("delete").setLabel("Delete Bookmark").setEmoji({ name: "🗑️" }).setStyle(Discord.ButtonStyle.Danger));
        interaction.user
            .send({
            embeds: [embed, infoEmbed],
            components: [button],
        })
            .then(async (msg) => {
            const database = sql.prepare(`SELECT * FROM dmbookmark WHERE OriginalMessageId = (?)`).get(interaction.targetId);
            if (!database) {
                sql.prepare(`INSERT INTO dmbookmark (OriginalMessageId, OriginalMessage, DirectMessage) VALUES (?, ?, ?)`).run(interaction.targetId, JSON.stringify({
                    id: interaction.targetId,
                    channel: interaction.channelId,
                    guild: interaction.guildId,
                    author: (await interaction?.channel?.messages?.fetch(interaction.targetId))?.author.id,
                }), JSON.stringify([{ id: msg.id, channel: msg.channelId, user: interaction.user.id }]));
            }
            else {
                const updatedDMList = JSON.parse(database.DirectMessage);
                updatedDMList.push({ id: msg.id, channel: msg.channelId, user: interaction.user.id });
                sql.prepare(`UPDATE dmbookmark SET DirectMessage = (?) WHERE OriginalMessageId = (?);`).run(JSON.stringify(updatedDMList), interaction.targetId);
            }
            return await interaction.editReply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: "Bookmarked!" })
                        .setDescription("Check your DM")
                        .addFields({ name: "Bookmarked message", value: `[Jump to Message](${msg?.url})`, inline: true }, { name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true })
                        .setColor("Blurple")
                        .setTimestamp(),
                ],
            });
        })
            .catch(async (error) => {
            log(error);
            return await interaction.editReply({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: "Unable to Bookmark this message" })
                        .setDescription(`Is your DM enabled?`)
                        .setColor("Red")
                        .setTimestamp(),
                ],
            });
        });
    }
    else if (interaction.isContextMenuCommand() && interaction.commandName === "Bookmark To Channel") {
        if (interaction?.channel?.type ===
            (Discord.ChannelType.GuildStageVoice ||
                Discord.ChannelType.DM ||
                Discord.ChannelType.GroupDM ||
                Discord.ChannelType.GuildVoice ||
                Discord.ChannelType.GuildStageVoice))
            return;
        await interaction.deferReply();
        const message = await interaction.channel?.messages.fetch(interaction.targetId);
        if (!message)
            return;
        const attachments = message?.attachments;
        const msg = message?.content;
        const embeds = message?.embeds;
        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: `${message?.author.tag}`, iconURL: `${message?.author.displayAvatarURL()}` })
            .setDescription(`${message?.content.length !== 0 ? message.content : "`No message found`"}`)
            .setColor("Blurple")
            .setTimestamp();
        const infoEmbed = new Discord.EmbedBuilder()
            .setTitle("Information")
            .addFields({ name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true }, { name: "Embeds", value: `[${embeds.length}]`, inline: true }, {
            name: "From",
            value: `[${interaction?.guild?.name}](https://discord.com/channels/${interaction.guildId}) in <#${message?.channel?.id}>`,
            inline: true,
        })
            .setColor("NotQuiteBlack")
            .setFooter({ text: `${interaction.targetId}` })
            .setTimestamp();
        if (attachments?.first()) {
            if (attachments?.first()?.contentType === ("image/png" || "image/gif" || "image/jpeg" || "image/jpng")) {
                embed.setImage(`${attachments?.first()?.url}`);
            }
            else {
                embed.addFields({
                    name: "Attachment included that cannot be bookmarked",
                    value: `[Attachment](${attachments?.first()?.url})`,
                    inline: true,
                });
            }
        }
        const GuildBookmark = sql.prepare(`SELECT * FROM guildbookmark WHERE GuildId = (?)`).get(interaction.guildId);
        if (!GuildBookmark) {
            const command = (await client.application?.commands.fetch({ cache: true, force: true }))?.find((command) => command.name === "setchannel");
            const ChannelErrorEmbed = new Discord.EmbedBuilder()
                .setTitle("Couldn't Bookmark message to this server")
                .setDescription("No channel found to send the bookmark")
                .addFields([
                {
                    name: "Run this command to set a channel",
                    value: `</${command?.name}:${command?.id}>`,
                },
            ])
                .setColor("Red")
                .setFooter({ text: "Resulted in a Spaghetti" })
                .setTimestamp();
            interaction.editReply({ embeds: [ChannelErrorEmbed] });
        }
        else {
            client.channels
                .fetch(GuildBookmark.ChannelId)
                .then((channel) => {
                if (!channel?.isTextBased())
                    return;
                channel
                    .send({
                    embeds: [embed, infoEmbed],
                })
                    .then(async (msg) => {
                    const database = sql
                        .prepare(`SELECT * FROM channelbookmark WHERE OriginalMessageId = (?)`)
                        .get(interaction.targetId);
                    if (!database) {
                        sql.prepare(`INSERT INTO channelbookmark (OriginalMessageId, OriginalMessage, ChannelMessage) VALUES (?, ?, ?)`).run(interaction.targetId, JSON.stringify({
                            id: interaction.targetId,
                            channel: interaction.channelId,
                            guild: interaction.guildId,
                            author: (await interaction?.channel?.messages?.fetch(interaction.targetId))?.author.id,
                        }), JSON.stringify([{ message: msg.id, channel: msg.channelId }]));
                    }
                    else {
                        const updatedChannelList = JSON.parse(database.ChannelMessage);
                        updatedChannelList.push({ message: msg.id, channel: msg.channelId });
                        sql
                            .prepare(`UPDATE channelbookmark SET ChannelMessage = (?) WHERE OriginalMessageId = (?);`)
                            .run(JSON.stringify(updatedChannelList), interaction.targetId);
                    }
                    return await interaction.editReply({
                        embeds: [
                            new Discord.EmbedBuilder()
                                .setAuthor({ name: "Bookmarked!" })
                                .setDescription(`Message has been bookmarked to the server`)
                                .addFields({ name: "Bookmarked message", value: `[Jump to Message](${msg?.url})`, inline: true }, { name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true })
                                .setColor("Blurple")
                                .setTimestamp(),
                        ],
                    });
                });
            })
                .catch(async (error) => {
                log(error);
                return await interaction.editReply({
                    embeds: [
                        new Discord.EmbedBuilder()
                            .setTitle(`Something went wrong`)
                            .setDescription(`There was a problem running this command`)
                            .setColor("Red")
                            .setTimestamp(),
                    ],
                });
            });
        }
    }
    else if (interaction.isButton()) {
        if (interaction.customId === "delete") {
            try {
                const database = sql
                    .prepare(`SELECT * FROM dmbookmark WHERE OriginalMessageId = (?)`)
                    .get(interaction?.message?.embeds[1]?.footer?.text);
                await interaction.message.delete().catch((error) => { });
                if (!database)
                    return;
                const updatedDMList = JSON.parse(database.DirectMessage).filter((val) => val.id !== interaction.message.id);
                if (updatedDMList.length === 0)
                    sql.prepare(`DELETE FROM dmbookmark WHERE OriginalMessageId = (?)`).run(interaction?.message?.embeds[1]?.footer?.text);
                else
                    sql
                        .prepare(`UPDATE dmbookmark SET DirectMessage = (?) WHERE OriginalMessageId = (?)`)
                        .run(JSON.stringify(updatedDMList), interaction?.message?.embeds[1]?.footer?.text);
            }
            catch (error) {
                log(error);
            }
        }
    }
});
/* Check for 🔖 for bookmarking and ❌ or 🗑️ for deleting a message */
client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial)
        reaction = await reaction.fetch().catch((e) => e);
    if (reaction.message.partial)
        reaction.message = await reaction.message.fetch().catch((e) => e);
    if ((reaction.emoji.name === "🗑️" || reaction.emoji.name === "❌") &&
        reaction?.message?.author?.id === client?.user?.id &&
        reaction.message.deletable &&
        reaction.message.channel.type === (Discord.ChannelType.DM || Discord.ChannelType.GroupDM))
        await reaction.message.delete();
    if (reaction.emoji.name == "🔖") {
        if (reaction.message.channel.type === Discord.ChannelType.DM || Discord.ChannelType.GroupDM)
            return;
        const message = await reaction?.message.channel.messages?.fetch(reaction.message.id);
        if (!message)
            return;
        const attachments = message?.attachments;
        const msg = message?.content;
        const embeds = message?.embeds;
        const embed = new Discord.EmbedBuilder()
            .setAuthor({ name: `${message?.author.tag}`, iconURL: `${message?.author.displayAvatarURL()}` })
            .setDescription(`${message?.content.length !== 0 ? message.content : "`No message found`"}`)
            .setColor("Blurple")
            .setTimestamp();
        const infoEmbed = new Discord.EmbedBuilder()
            .setTitle("Information")
            .addFields({ name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true }, { name: "Embeds", value: `[${embeds.length}]`, inline: true }, {
            name: "From",
            value: `[${message?.guild?.name}](https://discord.com/channels/${message.guildId}) in <#${message?.channel?.id}>`,
            inline: true,
        })
            .setColor("NotQuiteBlack")
            .setFooter({ text: `${message.id}` })
            .setTimestamp();
        if (attachments?.first()) {
            if (attachments?.first()?.contentType === ("image/png" || "image/gif" || "image/jpeg" || "image/jpng")) {
                embed.setImage(`${attachments?.first()?.url}`);
            }
            else {
                embed.addFields({
                    name: "Attachment included that cannot be bookmarked",
                    value: `[Attachment](${attachments?.first()?.url})`,
                    inline: true,
                });
            }
        }
        const button = new Discord.ActionRowBuilder().addComponents(new Discord.ButtonBuilder().setCustomId("delete").setLabel("Delete Bookmark").setEmoji({ name: "🗑️" }).setStyle(Discord.ButtonStyle.Danger));
        user
            .send({
            embeds: [embed, infoEmbed],
            components: [button],
        })
            .then(async (msg) => {
            const database = sql.prepare(`SELECT * FROM dmbookmark WHERE OriginalMessageId = (?)`).get(reaction.message.id);
            if (!database) {
                sql.prepare(`INSERT INTO dmbookmark (OriginalMessageId, OriginalMessage, DirectMessage) VALUES (?, ?, ?)`).run(reaction.message.id, JSON.stringify({
                    id: reaction.message.id,
                    channel: reaction.message.channelId,
                    guild: reaction.message.guildId,
                    author: reaction.message?.author?.id,
                }), JSON.stringify([{ id: msg.id, channel: msg.channelId, user: user.id }]));
            }
            else {
                const updatedDMList = JSON.parse(database.DirectMessage);
                updatedDMList.push({ id: msg.id, channel: msg.channelId, user: user.id });
                sql.prepare(`UPDATE dmbookmark SET DirectMessage = (?) HWERE OriginalMessageId = (?);`).run(JSON.stringify(updatedDMList), reaction.message.id);
            }
            return await reaction.message.channel
                .send({
                content: `<@${user.id}>`,
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: "Bookmarked!" })
                        .setDescription("Check your DM")
                        .addFields({ name: "Bookmarked message", value: `[Jump to Message](${msg?.url})`, inline: true }, { name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true })
                        .setColor("Blurple")
                        .setTimestamp(),
                ],
            })
                .then((msg) => {
                setTimeout(() => {
                    msg.delete();
                }, 2000);
            });
        })
            .catch(async (error) => {
            log(error);
            return await reaction.message.channel
                .send({
                content: `<@${user.id}>`,
                embeds: [
                    new Discord.EmbedBuilder()
                        .setAuthor({ name: "Unable to Bookmark this message" })
                        .setDescription(`Is your DM enabled?`)
                        .setColor("Red")
                        .setTimestamp(),
                ],
            })
                .then((msg) => {
                setTimeout(() => {
                    msg.delete();
                }, 2000);
            });
        });
        await reaction.remove();
    }
});
client
    .on("messageDelete", (message) => {
    if (!message.inGuild())
        return;
    if (client?.user?.id === message.author.id) {
        if (message.embeds.length !== 2)
            return;
        const msgid = message?.embeds?.[1]?.footer?.text;
        const entry = sql.prepare(`SELECT * FROM channelbookmark WHERE OriginalMessageId = (?);`).get(msgid);
        if (!entry)
            return;
        const newEntries = [];
        const CMsg = JSON.parse(entry?.ChannelMessage);
        CMsg.forEach((msg) => {
            if (msg.message !== message.id)
                newEntries.push(msg);
        });
        if (newEntries.length !== 0)
            sql.prepare(`UPDATE channelbookmark SET ChannelMessage = (?) WHERE OriginalMessageId = (?);`).run(JSON.stringify(newEntries), msgid);
        else
            sql.prepare(`DELETE FROM channelbookmark WHERE OriginalMessageId = (?)`).run(msgid);
        return;
    }
    if (message?.author?.bot)
        return;
    const DMBookmark = sql.prepare(`SELECT * FROM dmbookmark WHERE OriginalMessageId = (?)`).get(message.id);
    const ChannelBookmark = sql.prepare(`SELECT * FROM channelbookmark WHERE OriginalMessageId = (?)`).get(message.id);
    if (DMBookmark) {
        const DM = JSON.parse(DMBookmark?.DirectMessage);
        DM.forEach((dm) => {
            client.users.fetch(dm.user).then((user) => {
                user.dmChannel?.messages.fetch();
                const msg = user.dmChannel?.messages.cache.get(dm.id);
                const originalEmbed = msg.embeds;
                const dataEmbed = new Discord.EmbedBuilder()
                    .setAuthor({ name: `${originalEmbed[0].author?.name}`, iconURL: `${originalEmbed[0].author?.iconURL}` })
                    .setDescription(`> Original message deleted by author`)
                    .setTimestamp(new Date(originalEmbed[0]?.timestamp ?? ""))
                    .setColor("Blurple");
                const infoEmbed = new Discord.EmbedBuilder()
                    .setTitle("Information")
                    .addFields(originalEmbed[1].fields)
                    .setColor("NotQuiteBlack")
                    .setFooter({ text: `${originalEmbed[1].footer?.text}` })
                    .setTimestamp();
                msg.edit({ embeds: [dataEmbed, infoEmbed] }).catch((error) => log(error));
            });
        });
        sql.prepare(`DELETE FROM dmbookmark WHERE OriginalMessageId = (?)`).run(message.id);
    }
    else if (ChannelBookmark) {
        const Channels = JSON.parse(ChannelBookmark?.ChannelMessage);
        Channels.forEach(async (ChannelMessage) => {
            fetch(`https://discord.com/api/v10/channels/${ChannelMessage.channel}/messages/${ChannelMessage.message}`, {
                headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json" },
                method: "GET",
            }).then(async (res) => {
                const msg = await res.json();
                const originalEmbed = msg.embeds;
                const dataEmbed = new Discord.EmbedBuilder()
                    .setAuthor({ name: `${originalEmbed[0].author?.name}`, iconURL: `${originalEmbed[0].author?.icon_url}` })
                    .setDescription(`> Original message deleted by author`)
                    .setTimestamp(new Date(originalEmbed[0]?.timestamp ?? ""))
                    .setColor("Blurple")
                    .toJSON();
                const infoEmbed = new Discord.EmbedBuilder()
                    .setTitle("Information")
                    .addFields(...originalEmbed[1].fields)
                    .setColor("NotQuiteBlack")
                    .setFooter({ text: `${originalEmbed[1].footer?.text}` })
                    .setTimestamp()
                    .toJSON();
                await fetch(`https://discord.com/api/v10/channels/${ChannelMessage.channel}/messages/${ChannelMessage.message}`, {
                    headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json", "Content-Type": "application/json" },
                    method: "PATCH",
                    body: JSON.stringify({ embeds: [dataEmbed, infoEmbed] }),
                }).catch((error) => log(error));
                sql.prepare(`DELETE FROM channelbookmark WHERE OriginalMessageId = (?)`).run(message.id);
            });
        });
    }
})
    .on("messageDeleteBulk", (messages) => {
    messages.forEach((message) => {
        if (!message.inGuild())
            return;
        if (client?.user?.id === message.author.id) {
            if (message.embeds.length !== 2)
                return;
            const msgid = message?.embeds?.[1]?.footer?.text;
            const entry = sql.prepare(`SELECT * FROM channelbookmark WHERE OriginalMessageId = (?);`).get(msgid);
            if (!entry)
                return;
            const newEntries = [];
            const CMsg = JSON.parse(entry?.ChannelMessage);
            CMsg.forEach((msg) => {
                if (msg.message !== message.id)
                    newEntries.push(msg);
            });
            if (newEntries.length !== 0)
                sql.prepare(`UPDATE channelbookmark SET ChannelMessage = (?) WHERE OriginalMessageId = (?);`).run(JSON.stringify(newEntries), msgid);
            else
                sql.prepare(`DELETE FROM channelbookmark WHERE OriginalMessageId = (?)`).run(msgid);
            return;
        }
        if (message?.author?.bot)
            return;
        const DMBookmark = sql.prepare(`SELECT * FROM dmbookmark WHERE OriginalMessageId = (?)`).get(message.id);
        const ChannelBookmark = sql.prepare(`SELECT * FROM channelbookmark WHERE OriginalMessageId = (?)`).get(message.id);
        if (DMBookmark) {
            const DM = JSON.parse(DMBookmark?.DirectMessage);
            DM.forEach((dm) => {
                client.users.fetch(dm.user).then((user) => {
                    user.dmChannel?.messages.fetch();
                    const msg = user.dmChannel?.messages.cache.get(dm.id);
                    const originalEmbed = msg.embeds;
                    const dataEmbed = new Discord.EmbedBuilder()
                        .setAuthor({ name: `${originalEmbed[0].author?.name}`, iconURL: `${originalEmbed[0].author?.iconURL}` })
                        .setDescription(`> Original message deleted by author`)
                        .setTimestamp(new Date(originalEmbed[0]?.timestamp ?? ""))
                        .setColor("Blurple");
                    const infoEmbed = new Discord.EmbedBuilder()
                        .setTitle("Information")
                        .addFields(originalEmbed[1].fields)
                        .setColor("NotQuiteBlack")
                        .setFooter({ text: `${originalEmbed[1].footer?.text}` })
                        .setTimestamp();
                    msg.edit({ embeds: [dataEmbed, infoEmbed] }).catch((error) => log(error));
                });
            });
            sql.prepare(`DELETE FROM dmbookmark WHERE OriginalMessageId = (?)`).run(message.id);
        }
        else if (ChannelBookmark) {
            const Channels = JSON.parse(ChannelBookmark?.ChannelMessage);
            Channels.forEach(async (IChannelMessage) => {
                fetch(`https://discord.com/api/v10/channels/${IChannelMessage.channel}/messages/${IChannelMessage.message}`, {
                    headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json" },
                    method: "GET",
                }).then(async (res) => {
                    const msg = await res.json();
                    const originalEmbed = msg.embeds;
                    const dataEmbed = new Discord.EmbedBuilder()
                        .setAuthor({ name: `${originalEmbed[0].author?.name}`, iconURL: `${originalEmbed[0].author?.icon_url}` })
                        .setDescription(`> Original message deleted by author`)
                        .setTimestamp(new Date(originalEmbed[0]?.timestamp ?? ""))
                        .setColor("Blurple")
                        .toJSON();
                    const infoEmbed = new Discord.EmbedBuilder()
                        .setTitle("Information")
                        .addFields(...originalEmbed[1].fields)
                        .setColor("NotQuiteBlack")
                        .setFooter({ text: `${originalEmbed[1].footer?.text}` })
                        .setTimestamp()
                        .toJSON();
                    await fetch(`https://discord.com/api/v10/channels/${IChannelMessage.channel}/messages/${IChannelMessage.message}`, {
                        headers: { Authorization: `Bot ${process.env.BOT_TOKEN}`, Accept: "application/json", "Content-Type": "application/json" },
                        method: "PATCH",
                        body: JSON.stringify({ embeds: [dataEmbed, infoEmbed] }),
                    }).catch((error) => log(error));
                });
                sql.prepare(`DELETE FROM channelbookmark WHERE OriginalMessageId = (?)`).run(message.id);
            });
        }
    });
});
client
    .on("warning", async (e) => {
    console.log(await new Promise(async (res, rej) => {
        res(e);
    }));
})
    .on("error", async (e) => {
    console.log(await new Promise(async (res, rej) => {
        res(e);
    }));
})
    .on("debug", async (e) => {
    // console.log(
    //   await new Promise(async (res, rej) => {
    //     res(e);
    //   }),
    // );
});
client.login(process.env.BOT_TOKEN);
rest.put(Routes.applicationCommands(process.env.BOT_ID), {
    body: [bookmarkCmd.toJSON(), bookmarkChannelCmd.toJSON(), bookmarkChannel.toJSON()],
});
server.listen(80, "0.0.0.0");
