# Karum on Walrus Sites

Live at: https://karum.wal.app

Site object ID: `0x0eeee4295e97cf9baf9281d78922247c18ea3ca39da110391ee8be95353463ab`

## Config Files

These configs contain only public Sui object IDs and RPC URLs — no secrets.

Copy them to `~/.config/walrus/` for site-builder and walrus CLI to pick them up:

```bash
cp karum-walrus/sites-config.yaml ~/.config/walrus/sites-config.yaml
cp karum-walrus/client_config.yaml ~/.config/walrus/client_config.yaml
```

## NOTE

The `dist/` folder was wiped by a rebuild. The currently committed build is NOT the one deployed on-chain.
To get the deployed version, check the site object on-chain or redeploy from a fresh build.

## How-To

See [HOWTO.md](./HOWTO.md) for full deployment instructions.
