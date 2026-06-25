import fs from "fs";
import { NextResponse } from "next/server";
import os from "os";
import path from "path";

export const dynamic = "force-dynamic";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");

export interface ClaudeAgent {
  name: string;
  description: string;
  whenToUse: string;
  model: string;
  tools: string;
  body: string;
}

export interface ClaudeSkill {
  name: string;
  description: string;
  body: string;
}

export interface ClaudeConfigResponse {
  success: boolean;
  agents: ClaudeAgent[];
  skills: ClaudeSkill[];
  error?: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return {};
  const fm = match[1];
  const result: Record<string, string> = {};
  for (const line of fm.split("\n")) {
    const m = /^(\w[\w_-]*):\s*(.+)$/.exec(line);
    if (m) result[m[1].toLowerCase().replace(/-/g, "_")] = m[2].trim().replace(/^"|"$/g, "");
  }
  return result;
}

function bodyAfterFrontmatter(content: string): string {
  const match = /^---\n[\s\S]*?\n---\n*([\s\S]*)/.exec(content);
  return (match?.[1] ?? content).trim().slice(0, 400);
}

// Keywords that identify agents/skills relevant to this TypeScript/Next.js workspace
const RELEVANT_KEYWORDS = [
  "typescript",
  "javascript",
  "react",
  "next",
  "node",
  "api",
  "frontend",
  "backend",
  "fullstack",
  "code",
  "review",
  "tdd",
  "test",
  "security",
  "build",
  "plan",
  "arch",
  "refactor",
  "doc",
  "ui",
  "design",
  "web",
  "database",
  "graphql",
  "rest",
  "deploy",
  "git",
  "performance",
  "explore",
  "claude-code",
  "e2e",
  "silent",
  "comment",
  "type",
  "error",
  "resolver",
  "cleaner",
  "updater",
  "graphify",
  "autonomous",
  "workflow",
  "agent",
];

// Exclude keywords that identify clearly irrelevant agents for this workspace
const EXCLUDE_KEYWORDS = [
  "android",
  "flutter",
  "ios",
  "swift",
  "kotlin",
  "dart",
  "salesforce",
  "blockchain",
  "solidity",
  "embedded",
  "firmware",
  "chinese",
  "korean",
  "french",
  "feishu",
  "wechat",
  "healthcare",
  "medical",
  "pharmaceutical",
  "recruitment",
  "supply-chain",
  "corporate-training",
];

function isRelevantToWorkspace(name: string, description: string): boolean {
  const text = `${name} ${description}`.toLowerCase();
  if (EXCLUDE_KEYWORDS.some((k) => text.includes(k))) return false;
  return RELEVANT_KEYWORDS.some((k) => text.includes(k));
}

export async function GET() {
  try {
    const agentsDir = path.join(CLAUDE_DIR, "agents");
    const skillsDir = path.join(CLAUDE_DIR, "skills");

    const allAgents: ClaudeAgent[] = [];
    const allSkills: ClaudeSkill[] = [];

    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
      for (const file of files.sort()) {
        try {
          const content = fs.readFileSync(path.join(agentsDir, file), "utf-8");
          const fm = parseFrontmatter(content);
          allAgents.push({
            name: fm.name ?? file.replace(".md", ""),
            description: fm.description ?? "",
            whenToUse: fm.when_to_use ?? "",
            model: fm.model ?? "",
            tools: fm.tools ?? "",
            body: bodyAfterFrontmatter(content),
          });
        } catch {
          /* skip unreadable */
        }
      }
    }

    if (fs.existsSync(skillsDir)) {
      const dirs = fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();
      for (const dir of dirs) {
        const skillFile = path.join(skillsDir, dir, "SKILL.md");
        if (fs.existsSync(skillFile)) {
          try {
            const content = fs.readFileSync(skillFile, "utf-8");
            const fm = parseFrontmatter(content);
            const firstParagraph = content
              .split("\n")
              .filter(
                (l) => l.trim() && !l.startsWith("#") && !l.startsWith("---") && !l.startsWith("|"),
              )
              .slice(0, 3)
              .join(" ")
              .slice(0, 200);
            allSkills.push({
              name: fm.name ?? dir,
              description: fm.description ?? firstParagraph,
              body: bodyAfterFrontmatter(content),
            });
          } catch {
            allSkills.push({ name: dir, description: "", body: "" });
          }
        } else {
          allSkills.push({ name: dir, description: "", body: "" });
        }
      }
    }

    // Filter to workspace-relevant agents and skills (max 20 each)
    const agents = allAgents
      .filter((a) => isRelevantToWorkspace(a.name, a.description))
      .slice(0, 20);

    const skills = allSkills
      .filter((s) => isRelevantToWorkspace(s.name, s.description))
      .slice(0, 20);

    return NextResponse.json({ success: true, agents, skills } satisfies ClaudeConfigResponse);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        agents: [],
        skills: [],
        error: err instanceof Error ? err.message : "Read error",
      },
      { status: 500 },
    );
  }
}
