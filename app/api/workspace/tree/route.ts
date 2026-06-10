import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const WORKSPACE_ROOT = 'D:\\workspace'

const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', '.turbo',
  '__pycache__', '.cache', 'coverage', '.nyc_output', 'out',
])

const FILE_TYPE_COLORS: Record<string, string> = {
  ts: '#3b82f6', tsx: '#3b82f6', js: '#eab308', jsx: '#eab308',
  json: '#f97316', md: '#8b5cf6', mdx: '#8b5cf6',
  css: '#ec4899', scss: '#ec4899', html: '#f97316',
  py: '#22c55e', sh: '#6b7280', env: '#ef4444',
  lock: '#6b7280', yaml: '#eab308', yml: '#eab308',
  sql: '#06b6d4', prisma: '#6366f1', graphql: '#e10098',
  png: '#06b6d4', jpg: '#06b6d4', svg: '#f97316',
}

function getFileColor(ext: string): string {
  return FILE_TYPE_COLORS[ext.toLowerCase()] ?? '#9ca3af'
}

export interface FileNode {
  name: string
  type: 'file' | 'dir'
  path: string
  ext?: string
  color?: string
  size?: number
  children?: FileNode[]
  childCount?: number
  fileCount?: number
}

function readTree(dirPath: string, depth = 0, maxDepth = 5): FileNode {
  const name = path.basename(dirPath)
  const node: FileNode = {
    name,
    type: 'dir',
    path: dirPath.replace(WORKSPACE_ROOT, '').replace(/\\/g, '/') || '/',
    children: [],
    childCount: 0,
    fileCount: 0,
  }

  if (depth >= maxDepth) {
    return node
  }

  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return node
  }

  // Dirs first, then files — alphabetical within each group
  const dirs = entries.filter((e) => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
  const files = entries.filter((e) => e.isFile() && !e.name.startsWith('.'))

  let totalFiles = 0

  for (const d of dirs.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = readTree(path.join(dirPath, d.name), depth + 1, maxDepth)
    node.children!.push(child)
    totalFiles += child.fileCount ?? 0
  }

  for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const ext = f.name.includes('.') ? f.name.split('.').pop()! : ''
    let size: number | undefined
    try {
      size = fs.statSync(path.join(dirPath, f.name)).size
    } catch {
      size = 0
    }
    node.children!.push({
      name: f.name,
      type: 'file',
      path: path.join(dirPath.replace(WORKSPACE_ROOT, ''), f.name).replace(/\\/g, '/'),
      ext,
      color: getFileColor(ext),
      size,
    })
    totalFiles++
  }

  node.childCount = node.children!.length
  node.fileCount = totalFiles

  return node
}

function getWorkspaceStats(tree: FileNode): {
  totalDirs: number
  totalFiles: number
  topProjects: string[]
  techStack: string[]
} {
  const exts = new Set<string>()
  let totalDirs = 0
  let totalFiles = 0

  function walk(node: FileNode) {
    if (node.type === 'dir') {
      totalDirs++
      for (const c of node.children ?? []) walk(c)
    } else {
      totalFiles++
      if (node.ext) exts.add(node.ext)
    }
  }
  walk(tree)

  const tech: string[] = []
  if (exts.has('ts') || exts.has('tsx')) tech.push('TypeScript')
  if (exts.has('py')) tech.push('Python')
  if (exts.has('rs')) tech.push('Rust')
  if (exts.has('go')) tech.push('Go')
  if (exts.has('java')) tech.push('Java')
  if (exts.has('sql') || exts.has('prisma')) tech.push('Database')

  const topProjects = (tree.children ?? [])
    .filter((c) => c.type === 'dir')
    .slice(0, 8)
    .map((c) => c.name)

  return { totalDirs, totalFiles, topProjects, techStack: tech }
}

export async function GET() {
  try {
    if (!fs.existsSync(WORKSPACE_ROOT)) {
      return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 404 })
    }

    const tree = readTree(WORKSPACE_ROOT)
    const stats = getWorkspaceStats(tree)

    return NextResponse.json({
      success: true,
      tree,
      stats,
      root: WORKSPACE_ROOT,
      generated: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Błąd odczytu workspace' },
      { status: 500 }
    )
  }
}
