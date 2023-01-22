import "dotenv/config";
import Discord, { Routes, REST } from "discord.js";
import figlet from "figlet";
import pc from "picocolors";
import ms from "ms";
import express from "express";

const server = express();
server.get("/", (req, res) => {
  res.send("Hello World");
});

server.listen(80, "0.0.0.0");

const client = new Discord.Client({
  allowedMentions: { parse: [Discord.AllowedMentionsTypes.User], repliedUser: true },
  intents: [
    Discord.IntentsBitField.Flags.DirectMessageReactions,
    Discord.IntentsBitField.Flags.DirectMessages,
    Discord.IntentsBitField.Flags.GuildMembers,
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
  presence: { activities: [{ name: "your bookmarked messages", type: Discord.ActivityType.Watching }], status: Discord.PresenceUpdateStatus.DoNotDisturb },
});

client.on("ready", (client: Discord.Client) => {
  const mrbookmark = figlet.textSync("Mr.Bookmark", {
    font: "ANSI Shadow",
  });
  console.log(`${"-".repeat(42)}\n`);
  console.log(`${mrbookmark}\n`);
  console.log(`${"-".repeat(42)}\n`);
  console.log(`❯❯❯ ${pc.green("Commands are now available for usage!")}\n`);
  console.log(`❯❯❯ ${pc.green(`Serving ${pc.reset(client.guilds.cache.size)} ${pc.green(`servers`)}`)}\n`);
  console.log(`❯❯❯ ${pc.green(`Serving ${pc.reset(`${client.users.cache.size}`)} ${pc.green(`members`)}`)}\n`);
  console.log(`❯❯❯ ${pc.green(`${pc.reset(client?.user?.tag)} ${pc.green(`is up and running`)}\n`)}`);
  console.log(`❯❯❯ ${pc.green("Boot Time:")} ${ms(Math.round(process.uptime() * 1000))}\n`);
});

const bookmarkCmd = new Discord.ContextMenuCommandBuilder().setName("Bookmark").setType(Discord.ApplicationCommandType.Message);
const rest = new REST().setToken(`${process?.env?.BOT_TOKEN}`);
rest.put(Routes.applicationCommands("837617682345623572"), { body: [bookmarkCmd.toJSON()] });

client.on("interactionCreate", async (interaction) => {
  // if (!interaction.isCommand()) return;
  if (interaction.isContextMenuCommand() && interaction.commandName === "Bookmark") {
    if (interaction?.channel?.type !== Discord.ChannelType.GuildText) return;
    await interaction.deferReply({ ephemeral: true });

    const message = await interaction.channel?.messages.fetch(interaction.targetId);
    const attachments = message?.attachments;
    const msg = message?.content;
    const embeds = message?.embeds;
    const embed = new Discord.EmbedBuilder()
      .setAuthor({ name: `${message?.author.tag}`, iconURL: `${message?.author.displayAvatarURL()}` })
      .setDescription(`${message?.content.length !== 0 ? message.content : "`No message found`"}`)
      .setColor("Blurple");

    const infoEmbed = new Discord.EmbedBuilder()
      .setTitle("Information")
      .addFields(
        { name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true },
        { name: "Embeds", value: `[${embeds.length}]`, inline: true },
        {
          name: "From",
          value: `[${interaction?.guild?.name}](https://discord.com/channels/${interaction.guildId}) in <#${message?.channel?.id}>`,
          inline: true,
        },
      )
      .setColor("NotQuiteBlack")
      .setTimestamp();
    if (attachments?.first()) {
      if (attachments?.first()?.contentType === ("image/png" || "image/gif" || "image/jpeg" || "image/jpng")) {
        embed.setImage(`${attachments?.first()?.url}`);
      } else {
        embed.addFields({
          name: "Attachment included that cannot be bookmarked",
          value: `[Attachment](${attachments?.first()?.url})`,
          inline: true,
        });
      }
    }
    const button = new Discord.ActionRowBuilder<Discord.ButtonBuilder>().addComponents(
      new Discord.ButtonBuilder().setCustomId("delete").setLabel("Delete Bookmark").setEmoji({ name: "🗑️" }).setStyle(Discord.ButtonStyle.Danger),
    );
    interaction.user
      .send({
        embeds: [embed, infoEmbed],
        components: [button],
      })
      .then(async (msg) => {
        return await interaction.editReply({
          embeds: [
            new Discord.EmbedBuilder()
              .setAuthor({ name: "Bookmarked!" })
              .setDescription("Check your DM")
              .addFields(
                { name: "Bookmarked message", value: `[Jump to Message](${msg?.url})`, inline: true },
                { name: "Original Message", value: `[Jump to message](${message?.url})`, inline: true },
              )
              .setColor("Blurple")
              .setTimestamp(),
          ],
        });
      })
      .catch(async (error) => {
        console.log(error);
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
  } else if (interaction.isButton()) {
    if (interaction.customId === "delete") {
      await interaction.message.delete();
    }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) reaction = await reaction.fetch().catch((e) => e);
  if (reaction.message.partial) reaction.message = await reaction.message.fetch().catch((e) => e);
  if (
    (reaction.emoji.name === "🗑️" || reaction.emoji.name === "❌") &&
    reaction?.message?.author?.id === client?.user?.id &&
    reaction.message.deletable &&
    reaction.message.channel.type === (Discord.ChannelType.DM || Discord.ChannelType.GroupDM)
  )
    await reaction.message.delete();
});

client.login(process.env.BOT_TOKEN);
