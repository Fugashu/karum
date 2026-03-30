/**
 * Hook to auto-resolve the connected wallet's EVE Frontier Character object.
 * Queries Sui GraphQL for Character objects and matches by character_address field.
 */

import { useState, useEffect } from "react";
import { config } from "../config";
import { getEnvConfig } from "../env-config";
import { useEnvironment } from "../context/EnvironmentContext";

const GRAPHQL_URL = config.sui.graphqlUrl;

interface CharacterInfo {
  objectId: string;
  name: string;
}

export function useCharacter(walletAddress: string | undefined) {
  const { env } = useEnvironment();
  const [character, setCharacter] = useState<CharacterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setCharacter(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    lookupCharacter(walletAddress)
      .then((result) => {
        if (!cancelled) {
          setCharacter(result);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || String(e));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress, env]);

  return { character, loading, error };
}

async function lookupCharacter(
  walletAddress: string,
): Promise<CharacterInfo | null> {
  const characterType = `${getEnvConfig().worldPackageId}::character::Character`;
  const walletLower = walletAddress.toLowerCase();
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

    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.status}`);
    }

    const json: any = await res.json();
    const nodes = json?.data?.objects?.nodes;

    if (!Array.isArray(nodes)) {
      return null;
    }

    for (const node of nodes) {
      const fields = node.asMoveObject?.contents?.json;
      if (!fields) continue;

      const charAddr = (fields.character_address ?? "").toLowerCase();
      if (charAddr === walletLower) {
        return {
          objectId: node.address,
          name: fields.metadata?.name ?? "",
        };
      }
    }

    const pageInfo: any = json?.data?.objects?.pageInfo;
    if (!pageInfo?.hasNextPage) {
      hasMore = false;
    } else {
      cursor = pageInfo.endCursor;
    }
  }

  return null;
}
