# How to Deploy Karum on Walrus Sites

Walrus Sites hosts static sites on decentralized Walrus storage with metadata on Sui.
No backend needed — the portal at `wal.app` serves the content.

Live: https://karum.wal.app

Docs: https://docs.wal.app/docs/sites/introduction/components

## 1. Install suiup + site-builder

Install script saved in repo root (`install-suiup.sh`), original source:
https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh

```bash
# from repo root
./install-suiup.sh

# make sure ~/.local/bin is in PATH, then:
suiup install site-builder@mainnet
suiup install walrus@mainnet
suiup install sui@mainnet

# suiup will ask "set as default?" — say yes, or set manually:
suiup default set 'walrus@mainnet'
suiup default set 'sui@mainnet'

# verify
site-builder --help
walrus --version
sui --version
```

### Uninstall

Uninstall script saved in repo root (`uninstall-suiup.sh`).
Removes suiup, all managed binaries (sui, walrus, site-builder, mvr), `~/.suiup`, and `~/.config/walrus`.

```bash
# from repo root
./uninstall-suiup.sh
```

## 2. Copy walrus configs

Config files are stored in `karum-walrus/` (no secrets, just public object IDs and RPC URLs).

```bash
# from repo root
mkdir -p ~/.config/walrus
cp karum-walrus/sites-config.yaml ~/.config/walrus/sites-config.yaml
cp karum-walrus/client_config.yaml ~/.config/walrus/client_config.yaml
```

Original sources if you need to re-download:
- sites-config: https://raw.githubusercontent.com/MystenLabs/walrus-sites/refs/heads/mainnet/sites-config.yaml
- client_config: https://docs.wal.app/setup/client_config.yaml

Verify with `walrus info`.

### Create a Sui wallet

**Run this manually (not via AI) — it outputs a recovery phrase you need to save!**

```bash
sui client envs
# "No sui config found" -> Y
# creates wallet at ~/.sui/sui_config/client.yaml
# SAVE THE RECOVERY PHRASE
```

### Sui wallet commands

```bash
# get your wallet address
sui client active-address

# check SUI balance
sui client gas

# check all token balances (SUI + WAL)
sui client balance

# show configured environments
sui client envs

# switch network
sui client switch --env testnet
sui client switch --env mainnet
```

Fund this address with SUI (for gas) and WAL (for storage).
Both are available on Binance (min ~5$ each). Withdraw both to the same Sui address.
On testnet, request SUI from the faucet: https://faucet.sui.io/

```bash
# exchange SUI for WAL (testnet only, 1:1 rate)
walrus get-wal --amount 500000000 --context testnet
# exchanges 0.5 SUI for 0.5 WAL
```

## 3. Estimate deployment cost (dry run)

Before funding your wallet, check how much SUI + WAL you'll need:

```bash
cd karum-frontend
npm run build
cp ../karum-walrus/ws-resources.json dist/ws-resources.json

# mainnet
site-builder deploy --epochs 5 --dry-run dist

# testnet
site-builder --context testnet deploy --epochs 5 --dry-run dist
```

`--epochs 5` = ~10 weeks on mainnet (1 epoch = 2 weeks). Enough to cover the hackathon + voting.
`--dry-run` shows cost estimates without spending anything.

Note: make sure `sui client envs` shows the matching network as active.

## 4. Deploy to mainnet

```bash
cd karum-frontend
npm run build
cp ../karum-walrus/ws-resources.json dist/ws-resources.json

# deploy (updates existing site if ws-resources.json has object_id)
site-builder deploy --epochs 5 -s karum dist
```

For first deploy, create a minimal `ws-resources.json` instead:
```bash
echo '{ "routes": { "/*": "/index.html" } }' > dist/ws-resources.json
```

Save the object ID from the output. Update `karum-walrus/ws-resources.json` with it.

For testnet deploys:
```bash
site-builder --context testnet deploy --epochs 5 -s karum dist
```

### Verify deployment on-chain

```bash
# check the site object exists
sui client object <OBJECT_ID>

# view on Sui explorer
# https://suiscan.xyz/mainnet/object/<OBJECT_ID>

# convert object ID to base36 (for wal.app URL)
site-builder convert <OBJECT_ID>
```

## 5. Set up karum.wal.app

### Browser wallet

Install Slush (by Mysten Labs, formerly Sui Wallet): https://slush.app
Import using the recovery phrase from step 2.

### Buy SuiNS name (~10 USD, payable in SUI)

1. Go to https://suins.io
2. Connect Slush wallet
3. Search for "karum" and buy it (switch payment type from NS to SUI if needed)
4. Go to "Names You Own" -> select -> "Link To Walrus Site"
5. Paste the site object ID
6. Site is live at `https://karum.wal.app`

## 6. Update the site

`npm run build` wipes `dist/`, so `ws-resources.json` (with the site object ID) is stored in `karum-walrus/`.

```bash
cd karum-frontend
npm run build
cp ../karum-walrus/ws-resources.json dist/ws-resources.json
site-builder deploy --epochs 5 -s karum dist
```

After deploy, copy the build to `karum-walrus/dist/` for the record:
```bash
cp -r dist/ ../karum-walrus/dist/
```

## Troubleshooting

- **503 on assets after deploy**: Walrus storage nodes may take some time to propagate. Wait a few minutes and refresh.
- **Blank page**: Check browser devtools network tab for failing requests.
- **Don't redeploy unnecessarily**: Each deploy costs WAL. If the site works, don't redeploy just to test.
- **"walrus package not found"**: Make sure `sui client envs` shows the correct network as active (mainnet for mainnet deploys).
