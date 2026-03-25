import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createDAppKit, DAppKitProvider } from "@mysten/dapp-kit-react";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import "./index.css";
import App from "./App";
import { EnvironmentProvider } from "./context/EnvironmentContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const dAppKit = createDAppKit({
  networks: ["testnet"],
  createClient(network) {
    return new SuiJsonRpcClient({
      network,
      url: `https://fullnode.${network}.sui.io:443`,
    });
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <EnvironmentProvider>
        <DAppKitProvider dAppKit={dAppKit}>
          <App />
        </DAppKitProvider>
      </EnvironmentProvider>
    </QueryClientProvider>
  </StrictMode>,
);
