import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "D:\\workspace";
const ALLOWED_EXTS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".ts",
  ".tsx",
  ".js",
  ".css",
]);

export interface WorkspaceFile {
  name: string;
  path: string;
  size: number;
  modifiedTime: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dirPath = searchParams.get("path") ?? "";

  const resolved = path.resolve(WORKSPACE_ROOT, dirPath.replace(/^\//, ""));
  if (!resolved.startsWith(path.resolve(WORKSPACE_ROOT))) {
    return NextResponse.json({ success: false, error: "Invalid path", files: [] }, { status: 400 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ success: true, files: [] });
  }

  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const files: WorkspaceFile[] = entries
      .filter((e) => e.isFile() && ALLOWED_EXTS.has(path.extname(e.name).toLowerCase()))
      .map((e) => {
        const stat = fs.statSync(path.join(resolved, e.name));
        return {
          name: e.name,
          path: dirPath ? `${dirPath}/${e.name}` : e.name,
          size: stat.size,
          modifiedTime: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));

    return NextResponse.json({ success: true, files });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Error", files: [] },
      { status: 500 },
    );
  }
}
