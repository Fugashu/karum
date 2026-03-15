import discord
from discord import app_commands
from loguru import logger

from src.config import config
from src.guild_config import set_notification_channel, get_notification_channel
from src.sui_poller import poll_loop


intents = discord.Intents.default()


class KarumBot(discord.Client):
    def __init__(self):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)

    async def on_ready(self):
        logger.info(f"Logged in as {self.user} (ID: {self.user.id})")
        logger.info(f"Connected to {len(self.guilds)} guild(s)")
        await self.tree.sync()
        logger.info("Slash commands synced")
        self.loop.create_task(poll_loop(self))

    async def setup_hook(self):
        pass


bot = KarumBot()


@bot.tree.command(name="ping", description="Check if the bot is alive")
async def ping(interaction: discord.Interaction):
    await interaction.response.send_message("Pong!")


@bot.tree.command(name="setchannel", description="Set this channel for shop notifications")
@app_commands.checks.has_permissions(manage_channels=True)
async def setchannel(interaction: discord.Interaction):
    set_notification_channel(interaction.guild_id, interaction.channel_id)
    await interaction.response.send_message(
        f"Shop notifications will be sent to **#{interaction.channel.name}**"
    )


@bot.tree.command(name="channel", description="Show which channel gets notifications")
async def channel(interaction: discord.Interaction):
    channel_id = get_notification_channel(interaction.guild_id)
    if not channel_id:
        await interaction.response.send_message(
            "No notification channel set. Use `/setchannel` in the channel you want."
        )
        return
    ch = bot.get_channel(channel_id)
    if ch:
        await interaction.response.send_message(f"Notifications go to **#{ch.name}**")
    else:
        await interaction.response.send_message(f"Channel `{channel_id}` (not found — maybe deleted?)")


def run():
    if not config.discord_token:
        logger.error("KARUM_DISCORD_TOKEN not set")
        return
    bot.run(config.discord_token)
