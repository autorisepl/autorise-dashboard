function extractJsonString(raw: string): string {
  // 1. Code block ```json ... ``` or ``` ... ```
  const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) return codeMatch[1].trim();

  // 2. First { ... } brace block
  const braceStart = raw.indexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return raw.slice(braceStart, braceEnd + 1).trim();
  }

  // 3. Fallback: raw trimmed
  return raw.trim();
}

export function extractAndParseJson(raw: string): Record<string, unknown> {
  const jsonText = extractJsonString(raw);

  try {
    return JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    // Second attempt: fix common LLM formatting issues
    const cleaned = jsonText
      .replace(/,\s*([}\]])/g, "$1") // trailing commas
      .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)(['"])?\s*:/g, '"$2":') // unquoted keys
      .replace(/:\s*'([^']*)'/g, ': "$1"'); // single-quoted values
    try {
      return JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      const preview = raw.slice(0, 300);
      throw new Error(`Nieprawidłowy JSON od agenta. Fragment odpowiedzi: ${preview}`);
    }
  }
}
