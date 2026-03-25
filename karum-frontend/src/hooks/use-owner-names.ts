/**
 * Batch-resolve shop owner wallet addresses to EVE Frontier character names.
 * Fetches all Character objects once and builds an address → name map.
 */

import { useQuery } from "@tanstack/react-query";
import { config } from "../config";
import { getEnvConfig } from "../env-config";
import { useEnvironment } from "../context/EnvironmentContext";

const GRAPHQL_URL = config.sui.graphqlUrl;

async function fetchAllCharacters(): Promise<Map<string, string>> {
  const characterType = `${getEnvConfig().worldPackageId}::character::Character`;
  const map = new Map<string, string>();
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const afterClause: string = cursor ? `after: "${cursor}"` : "";
    const query: string = `{
      objects(
        filter: { type: "${characterType}" }
        first: 50
        ${afterClause}
      ) {
        nodes {
          address
          asMoveObject {
            contents {
              json
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`;

    const res: Response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) break;

    const json: any = await res.json();
    const nodes = json?.data?.objects?.nodes;
    if (!Array.isArray(nodes)) break;

    for (const node of nodes) {
      const fields = node.asMoveObject?.contents?.json;
      if (!fields) continue;
      const addr = (fields.character_address ?? "").toLowerCase();
      const name = fields.metadata?.name ?? "";
      if (addr && name) {
        map.set(addr, name);
      }
    }

    const pageInfo = json?.data?.objects?.pageInfo;
    if (!pageInfo?.hasNextPage) {
      hasMore = false;
    } else {
      cursor = pageInfo.endCursor;
    }
  }

  return map;
}

export function useOwnerNames() {
  const { env } = useEnvironment();
  return useQuery({
    queryKey: ["character-names", env],
    queryFn: fetchAllCharacters,
    staleTime: 5 * 60_000,
  });
}
