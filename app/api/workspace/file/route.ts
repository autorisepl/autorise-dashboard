import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? 'D:\\workspace'
const MAX_BYTES = 80_000

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('path')
    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Missing path' }, { status: 400 })
    }

    // Prevent path traversal
    const resolved = path.resolve(WORKSPACE_ROOT, filePath.replace(/^\//, ''))
    if (!resolved.startsWith(path.resolve(WORKSPACE_ROOT))) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 })
    }

    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 })
    }

    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      return NextResponse.json({ success: false, error: 'Path is a directory' }, { status: 400 })
    }

    const ext = path.extname(resolved).slice(1).toLowerCase()
    const textExts = new Set(['ts', 'tsx', 'js', 'jsx', 'json', 'md', 'mdx', 'txt', 'yaml', 'yml', 'css', 'scss', 'html', 'sh', 'env', 'sql', 'py', 'rs', 'go', 'prisma'])
    if (!textExts.has(ext)) {
      return NextResponse.json({ success: false, error: 'Binary file' }, { status: 400 })
    }

    const buffer = fs.readFileSync(resolved)
    const truncated = buffer.length > MAX_BYTES
    const content = buffer.slice(0, MAX_BYTES).toString('utf-8')

    return NextResponse.json({
      success: true,
      content,
      truncated,
      size: stat.size,
      ext,
      name: path.basename(resolved),
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Read error' },
      { status: 500 }
    )
  }
}
