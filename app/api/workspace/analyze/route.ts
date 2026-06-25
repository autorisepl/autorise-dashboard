import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";
import { z } from "zod";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "D:\\autorise\\workspace";

const ReqSchema = z.object({
  focus: z.string().optional().default("general"),
  question: z.string().optional(),
});

function buildWorkspaceSummary(): string {
  const lines: string[] = [`# Workspace: ${WORKSPACE_ROOT}\n`];

  function walkSummary(dirPath: string, depth: number, maxDepth: number) {
    if (depth > maxDepth) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    const IGNORE = new Set(["node_modules", ".next", ".git", "dist", "build", ".turbo"]);
    const indent = "  ".repeat(depth);

    const dirs = entries.filter(
      (e) => e.isDirectory() && !IGNORE.has(e.name) && !e.name.startsWith("."),
    );
    const files = entries.filter((e) => e.isFile() && !e.name.startsWith("."));

    for (const d of dirs) {
      const childPath = path.join(dirPath, d.name);
      const fileCount = countFiles(childPath);
      lines.push(`${indent}📁 ${d.name}/ (${fileCount} plików)`);
      walkSummary(childPath, depth + 1, maxDepth);
    }

    for (const f of files) {
      const ext = f.name.split(".").pop() ?? "";
      lines.push(`${indent}  ${f.name}`);
      if (["package.json", "CLAUDE.md", ".env.example", "README.md"].includes(f.name)) {
        try {
          const content = fs.readFileSync(path.join(dirPath, f.name), "utf-8").slice(0, 500);
          lines.push(`${indent}    [zawartość]: ${content.replace(/\n/g, " ").slice(0, 200)}`);
        } catch {
          /* skip */
        }
      }
    }
  }

  function countFiles(dirPath: string): number {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const IGNORE = new Set(["node_modules", ".next", ".git", "dist"]);
      return entries.reduce((acc, e) => {
        if (e.isFile()) return acc + 1;
        if (e.isDirectory() && !IGNORE.has(e.name))
          return acc + countFiles(path.join(dirPath, e.name));
        return acc;
      }, 0);
    } catch {
      return 0;
    }
  }

  walkSummary(WORKSPACE_ROOT, 0, 3);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Jesteś Workspace Intelligence Agent dla Autorise — firmy automatyzującej procesy operacyjne firm transportowych.

Analizujesz strukturę workspace'u Claude Code dewelopera (D:/workspace) i dostarczasz profesjonalnych, konkretnych spostrzeżeń.

TWOJE MOŻLIWOŚCI:
- Analiza organizacji projektów i architektury kodu
- Identyfikacja aktywnie rozwijanych projektów
- Wykrycie wzorców, duplikacji, potencjalnych problemów
- Ocena stack technologicznego i struktury folderów
- Rekomendacje optymalizacji workflow dewelopera
- Powiązanie projektów z celami biznesowymi Autorise

ZASADY:
- Bądź konkretny i actionable — nie ogólnikowy
- Używaj polskiego
- Strukturyzuj odpowiedź: najpierw kluczowe spostrzeżenia, potem szczegóły
- Wskazuj konkretne pliki/foldery jako dowody
- Proponuj konkretne next steps
- Workspace to D:/autorise/workspace`;

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = ReqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Nieprawidłowe parametry" },
        { status: 400 },
      );
    }

    const { focus, question } = parsed.data;
    const workspaceSummary = buildWorkspaceSummary();

    const userMessage = question
      ? `Pytanie o workspace: ${question}\n\nStruktura workspace:\n${workspaceSummary}`
      : `Przeprowadź pełną analizę workspace. Fokus: ${focus}.\n\nStruktura workspace:\n${workspaceSummary}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      metadata: { user_id: "autorise-workspace-agent" },
    });

    if (message.stop_reason === "max_tokens") {
      console.warn("[workspace/analyze] Response truncated — consider increasing max_tokens");
    }

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ success: true, analysis: text, tokens_used: message.usage });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Błąd analizy" },
      { status: 500 },
    );
  }
}
