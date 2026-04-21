function normalizeJsonCandidate(content: string): string {
  return content
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ":")
    .replace(/，/g, ",")
    .replace(/、/g, ",")
    .replace(/,\s*([}\]])/g, "$1");
}

function extractBalancedJsonCandidate(content: string): string | null {
  const startIndex = content.search(/[\[{]/);
  if (startIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index++) {
    const char = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
      continue;
    }

    if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function collectJsonCandidates(content: string): string[] {
  const trimmed = content.trim();
  const candidates = new Set<string>();

  const fencedMatches = trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
  for (const match of fencedMatches) {
    if (match[1]) {
      candidates.add(match[1].trim());
    }
  }

  const balanced = extractBalancedJsonCandidate(trimmed);
  if (balanced) {
    candidates.add(balanced.trim());
  }

  const objectMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (objectMatch?.[1]) {
    candidates.add(objectMatch[1].trim());
  }

  const arrayMatch = trimmed.match(/(\[[\s\S]*\])/);
  if (arrayMatch?.[1]) {
    candidates.add(arrayMatch[1].trim());
  }

  candidates.add(trimmed);

  return [...candidates].filter(Boolean);
}

export function extractJsonBlock(content: string): string {
  const candidates = collectJsonCandidates(content);
  return candidates[0] || content.trim();
}

export function safeParseJsonBlock<T>(content: string): T | null {
  const candidates = collectJsonCandidates(content);

  for (const candidate of candidates) {
    for (const attempt of [candidate, normalizeJsonCandidate(candidate)]) {
      try {
        return JSON.parse(attempt) as T;
      } catch {
        // Try the next candidate.
      }
    }
  }

  return null;
}

export function parseJsonBlock<T>(content: string): T {
  const parsed = safeParseJsonBlock<T>(content);
  if (parsed !== null) {
    return parsed;
  }

  throw new Error("AI 返回内容不是有效 JSON");
}
