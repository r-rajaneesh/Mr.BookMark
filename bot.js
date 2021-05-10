const Discord = require("discord.js");
const { Client } = require("discord.js");
const client = new Client({
  intents: Discord.Intents.ALL,
  restTimeOffset: 0, // magically makes reacting faster
});
const fs = require("fs");
const dotenv = require("dotenv").config();
const { prefix, color, warn, error } = require("./config.json");
const prettyMilliseconds = require("pretty-ms");
const keepAlive = require("./server");

// On Ready
client.once("ready", () => {
  client.user.setActivity("Your Bookmarks", { type: "WATCHING" });
  console.log(
    `Ready to Bookmark messages!\n\n\n`
  );
});

client.on("message", (message) => {
  if (message.content === `${prefix}help`) {
    message.reply({
      embed: {
        author: {
          name: "Mr.BookMark",
          icon_url:
            "https://cdn.discordapp.com/attachments/837890513990451280/838652379628044348/pack_icon.png",
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
        image: { url: 'https://cdn.discordapp.com/attachments/837890513990451280/840821620745437205/Animation.gif'},
        footer: { text: "- By Mr.BookMark" },
      },
    });
  }
});

client.on("message", (message) => {
  if (message.content === `${prefix}ping`) {
    message.reply({
      embed: {
        author: {
          name: "Pong!",
          icon_url:
            "https://cdn.discordapp.com/attachments/807219422737334322/838648055758192660/ping.gif",
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
    });
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.emoji.name == "🔖") {
    let author = `${reaction.message.author.username}`;
    const DMm = {
      embed: {
        color: color,
        author: {
          name: author,
          icon_url: reaction.message.author.avatarURL(),
        },
        description: reaction.message.content,
        fields: [
          { name: "Original", value: `[Jump](${reaction.message.url})` },
        ],
        footer: {
          text:
            "From " +
            reaction.message.guild.name +
            " #" +
            reaction.message.channel.name,
        },
      },
    };
    user.send(DMm).then(
      reaction.message.reactions.cache
        .get("🔖")
        .remove()
        .catch((error) => console.error("Failed to remove reactions: ", error))
    )//.then(await message.reaction.has("❌")).then(message.delete)
    console.log(`BookMarked a message for ${author}`);
  }
});

client.on("message", (message) => {
  if (message.content === `${prefix}die`) {
    if (message.author.id === "738032578820309072") {
      message
        .react("👍")
        .then(() =>
          message.channel.send({
            embed: {
              title: "Shutting the bot down",
              description: `The bot has been shut down by ${message.author.tag}`,
            },
            color: color, //your color in the blank
          })
        )
        .then(() => process.exit());
      var user = `${message.author.tag}`;
      console.log(`Bot has been stopped by ${user}`);
      console.log("Mr.BookMark is Dead!");
    } else
      message
        .delete()
        .then(
          message.channel
            .send({
              embed: {
                title: "This can only be done by the owner of the bot!",
              },
            })
            .then((message) => message.delete({ timeout: 10000 }))
        )
        .catch((error) => console.error(error));
  }
});

keepAlive();
client.login(process.env.bottoken);
