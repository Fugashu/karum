/**
 * Hook to auto-resolve the connected wallet's EVE Frontier Character object.
 * Queries Sui GraphQL for Character objects and matches by character_address field.
 */

import { useState, useEffect } from "react";
import { config } from "../config";

const WORLD_PKG =
  "0xd12a70c74c1e759445d6f209b01d43d860e97fcf2ef72ccbbd00afd828043f75";
const CHARACTER_TYPE = `${WORLD_PKG}::character::Character`;
const GRAPHQL_URL = config.sui.graphqlUrl;

interface CharacterInfo {
  objectId: string;
  name: string;
}

export function useCharacter(walletAddress: string | undefined) {
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
  }, [walletAddress]);

  return { character, loading, error };
}

async function lookupCharacter(
  walletAddress: string,
): Promise<CharacterInfo | null> {
  const query = `{
    objects(
      filter: { type: "${CHARACTER_TYPE}" }
      first: 50
    ) {
      nodes {
        address
        asMoveObject {
          contents {
            json
          }
        }
      }
    }
  }`;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status}`);
  }

  const json = await res.json();
  const nodes = json?.data?.objects?.nodes;

  if (!Array.isArray(nodes)) {
    return null;
  }

  // Normalize wallet address to lowercase for comparison
  const walletLower = walletAddress.toLowerCase();

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

  return null;
}
