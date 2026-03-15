/**
 * Batch-resolve shop owner wallet addresses to EVE Frontier character names.
 * Fetches all Character objects once and builds an address → name map.
 */

import { useQuery } from "@tanstack/react-query";
import { config } from "../config";

const WORLD_PKG =
  "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75";
const CHARACTER_TYPE = `${WORLD_PKG}::character::Character`;
const GRAPHQL_URL = config.sui.graphqlUrl;

async function fetchAllCharacters(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const afterClause: string = cursor ? `after: "${cursor}"` : "";
    const query: string = `{
      objects(
        filter: { type: "${CHARACTER_TYPE}" }
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
  return useQuery({
    queryKey: ["character-names"],
    queryFn: fetchAllCharacters,
    staleTime: 5 * 60_000,
  });
}
