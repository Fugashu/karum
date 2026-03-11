import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { config } from "../config";
import { getSuiGraphqlEndpoint } from "@evefrontier/dapp-kit";

export const suiClient = new SuiJsonRpcClient({
  network: config.sui.network,
} as ConstructorParameters<typeof SuiJsonRpcClient>[0]);

/** Sui GraphQL endpoint for the configured network */
export const SUI_GRAPHQL_URL = getSuiGraphqlEndpoint(config.sui.network);

/**
 * Execute a GraphQL query against the Sui GraphQL endpoint.
 * Used for smart assembly queries (SSU data, inventory, etc.)
 */
export async function suiGraphql<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const res = await fetch(SUI_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Sui GraphQL HTTP ${res.status}`);
  }

  return res.json();
}
