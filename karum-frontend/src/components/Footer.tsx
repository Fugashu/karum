const DISCORD_BOT_URL =
  "https://discord.com/oauth2/authorize?client_id=1482653665360740542&permissions=2147502080&integration_type=0&scope=bot+applications.commands";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-bg px-6 py-3 flex items-center text-xs text-text-dim z-40">
      <div className="flex-1" />
      <span>KARUM — The Frontier's First Marketplace Network</span>
      <div className="flex-1 flex justify-end">
        <a
          href={DISCORD_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-amber transition-colors no-underline"
        >
          Add Discord Bot
        </a>
      </div>
    </footer>
  );
}
