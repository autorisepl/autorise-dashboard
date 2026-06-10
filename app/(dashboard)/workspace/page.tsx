'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Folder, FolderOpen, File, RefreshCw, Brain, Send, ChevronRight,
  Search, X, FileCode, FileText, Database, Globe, Loader2,
  BarChart3, Layers, GitBranch, Sparkles, Terminal,
} from 'lucide-react'
import { tokens } from '@/lib/tokens'
import type { FileNode } from '@/app/api/workspace/tree/route'

// ── File icon by extension ───────────────────────────────────────

function FileIcon({ ext, size = 13 }: { ext?: string; size?: number }) {
  const e = ext?.toLowerCase() ?? ''
  if (['ts', 'tsx', 'js', 'jsx'].includes(e)) return <FileCode size={size} color="#3b82f6" />
  if (['json', 'yaml', 'yml'].includes(e)) return <FileText size={size} color="#f97316" />
  if (['sql', 'prisma'].includes(e)) return <Database size={size} color="#06b6d4" />
  if (['md', 'mdx'].includes(e)) return <FileText size={size} color="#8b5cf6" />
  if (['html', 'css', 'scss'].includes(e)) return <Globe size={size} color="#ec4899" />
  if (e === 'py') return <FileCode size={size} color="#22c55e" />
  return <File size={size} color="#9ca3af" />
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ── Tree node ────────────────────────────────────────────────────

function TreeNode({
  node, depth, search, onSelect, selected,
}: {
  node: FileNode; depth: number; search: string
  onSelect: (n: FileNode) => void; selected: FileNode | null
}) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.type === 'dir' && (node.children?.length ?? 0) > 0
  const isSelected = selected?.path === node.path

  const matchesSearch = !search || node.name.toLowerCase().includes(search.toLowerCase())
  const childrenMatchSearch = !search || (node.children ?? []).some((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.children ?? []).some((cc) => cc.name.toLowerCase().includes(search.toLowerCase()))
  )

  if (search && !matchesSearch && !childrenMatchSearch) return null

  if (search && !open && childrenMatchSearch) setOpen(true)

  const indent = depth * 14

  return (
    <div>
      <div
        onClick={() => {
          if (node.type === 'dir') setOpen((o) => !o)
          onSelect(node)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: `4px 8px 4px ${8 + indent}px`,
          borderRadius: tokens.radius.sm,
          cursor: 'pointer',
          background: isSelected ? tokens.accent.muted : 'transparent',
          transition: 'background 0.1s',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = tokens.bg.elevated
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
        }}
      >
        {/* Expand arrow */}
        <span style={{ width: 12, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {hasChildren && (
            <ChevronRight
              size={10}
              color={tokens.text.muted}
              style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
            />
          )}
        </span>

        {/* Icon */}
        {node.type === 'dir' ? (
          open ? <FolderOpen size={13} color={tokens.accent.primary} /> : <Folder size={13} color={tokens.text.secondary} />
        ) : (
          <FileIcon ext={node.ext} size={13} />
        )}

        {/* Name */}
        <span style={{
          fontFamily: tokens.font.mono, fontSize: '12px',
          color: isSelected ? tokens.accent.primary : tokens.text.primary,
          fontWeight: node.type === 'dir' ? 600 : 400,
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {node.name}
          {node.type === 'dir' && <span style={{ color: tokens.text.muted, fontWeight: 400 }}>/</span>}
        </span>

        {/* Meta */}
        {node.type === 'dir' && node.fileCount ? (
          <span style={{ fontFamily: tokens.font.mono, fontSize: '9px', color: tokens.text.muted }}>
            {node.fileCount}
          </span>
        ) : node.size ? (
          <span style={{ fontFamily: tokens.font.mono, fontSize: '9px', color: tokens.text.muted }}>
            {formatBytes(node.size)}
          </span>
        ) : null}
      </div>

      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            {(node.children ?? []).map((child) => (
              <TreeNode
                key={child.path} node={child} depth={depth + 1}
                search={search} onSelect={onSelect} selected={selected}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Stats card ───────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: tokens.bg.primary,
      border: `1px solid ${tokens.border.default}`,
      borderRadius: tokens.radius.lg,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: tokens.shadow.card,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: tokens.radius.md,
        background: `${color}12`,
        border: `1px solid ${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{
          fontFamily: tokens.font.mono, fontSize: '18px', fontWeight: 700,
          color: tokens.text.primary, lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontFamily: tokens.font.sans, fontSize: '11px', color: tokens.text.muted, marginTop: 3 }}>
          {label}
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────

interface WorkspaceData {
  tree: FileNode
  stats: { totalDirs: number; totalFiles: number; topProjects: string[]; techStack: string[] }
  root: string
  generated: string
}

export default function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<FileNode | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState(false)
  const [question, setQuestion] = useState('')
  const [askingQuestion, setAskingQuestion] = useState(false)
  const analysisRef = useRef<HTMLDivElement>(null)

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/tree')
      const json = await res.json()
      if (json.success) {
        setData(json)
        setLastUpdated(new Date())
        setError(null)
      } else {
        setError(json.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTree()
    const id = setInterval(fetchTree, 30_000)
    return () => clearInterval(id)
  }, [fetchTree])

  const runAnalysis = async (focusQuestion?: string) => {
    if (analysing) return
    setAnalysing(true)
    setAnalysis(null)
    try {
      const res = await fetch('/api/workspace/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(focusQuestion ? { question: focusQuestion } : { focus: 'general' }),
      })
      const json = await res.json()
      if (json.success) {
        setAnalysis(json.analysis)
        setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } else {
        setAnalysis(`❌ Błąd: ${json.error}`)
      }
    } catch (e) {
      setAnalysis(`❌ ${e instanceof Error ? e.message : 'Błąd'}`)
    } finally {
      setAnalysing(false)
    }
  }

  const handleAsk = async () => {
    if (!question.trim()) return
    setAskingQuestion(true)
    await runAnalysis(question)
    setQuestion('')
    setAskingQuestion(false)
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      padding: '20px 24px', gap: 16, overflow: 'hidden', boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{
            fontFamily: tokens.font.sans, fontSize: '22px', fontWeight: 800,
            color: tokens.text.primary, margin: '0 0 4px', letterSpacing: '-0.025em',
          }}>
            Struktura Workspace
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontFamily: tokens.font.mono, fontSize: '11px', color: tokens.text.muted,
            }}>
              <Terminal size={10} />
              D:/workspace
            </span>
            {lastUpdated && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: '999px',
                background: tokens.status.successMuted,
                border: `1px solid rgba(22,163,74,0.2)`,
                fontFamily: tokens.font.mono, fontSize: '9px',
                color: tokens.status.success, fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                ● LIVE · {lastUpdated.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={fetchTree}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: tokens.bg.surface,
              border: `1px solid ${tokens.border.default}`, borderRadius: tokens.radius.md,
              fontFamily: tokens.font.sans, fontSize: '12px', color: tokens.text.secondary,
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Odśwież
          </button>
          <button
            onClick={() => runAnalysis()}
            disabled={analysing || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: analysing || loading ? tokens.bg.elevated : tokens.accent.primary,
              color: analysing || loading ? tokens.text.muted : '#fff',
              border: 'none', borderRadius: tokens.radius.md,
              fontFamily: tokens.font.sans, fontSize: '12px', fontWeight: 600,
              cursor: analysing || loading ? 'not-allowed' : 'pointer',
              boxShadow: analysing || loading ? 'none' : '0 1px 4px rgba(249,115,22,0.25)',
              transition: 'all 0.15s',
            }}
          >
            {analysing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={12} />}
            {analysing ? 'Analizuję...' : 'Analiza AI'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      {data && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, flexShrink: 0,
        }}>
          <StatCard icon={Layers} label="Projekty" value={data.stats.topProjects.length} color={tokens.accent.primary} />
          <StatCard icon={FolderOpen} label="Foldery" value={data.stats.totalDirs} color={tokens.status.info} />
          <StatCard icon={FileCode} label="Pliki" value={data.stats.totalFiles} color={tokens.status.success} />
          <StatCard icon={BarChart3} label="Stack" value={data.stats.techStack.join(' · ') || '—'} color="#8b5cf6" />
        </div>
      )}

      {/* Main area */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '280px 1fr',
        gap: 12, minHeight: 0,
      }}>
        {/* Tree panel */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${tokens.border.default}`,
          borderRadius: tokens.radius.xl,
          background: tokens.bg.primary,
          overflow: 'hidden',
          boxShadow: tokens.shadow.card,
        }}>
          {/* Search */}
          <div style={{
            padding: '10px 10px 8px',
            borderBottom: `1px solid ${tokens.border.default}`,
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} color={tokens.text.muted} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj pliku..."
                style={{
                  width: '100%', padding: '6px 28px 6px 28px', boxSizing: 'border-box',
                  background: tokens.bg.surface,
                  border: `1px solid ${tokens.border.default}`,
                  borderRadius: tokens.radius.md,
                  fontFamily: tokens.font.mono, fontSize: '11px',
                  color: tokens.text.primary, outline: 'none',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: tokens.text.muted,
                  display: 'flex', alignItems: 'center',
                }}>
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Tree */}
          <div style={{ flex: 1, overflow: 'auto', padding: '6px 4px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, gap: 8, color: tokens.text.muted }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: tokens.font.sans, fontSize: '12px' }}>Ładowanie...</span>
              </div>
            ) : error ? (
              <div style={{ padding: 16, fontFamily: tokens.font.sans, fontSize: '12px', color: tokens.status.error }}>
                {error}
              </div>
            ) : data ? (
              <TreeNode
                node={data.tree} depth={0}
                search={search} onSelect={setSelected} selected={selected}
              />
            ) : null}
          </div>
        </div>

        {/* Right panel */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, overflow: 'auto',
        }}>
          {/* Selected item info */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '14px 18px',
                background: tokens.bg.primary,
                border: `1px solid ${tokens.border.default}`,
                borderRadius: tokens.radius.xl, boxShadow: tokens.shadow.card,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selected.type === 'dir'
                  ? <FolderOpen size={16} color={tokens.accent.primary} />
                  : <FileIcon ext={selected.ext} size={16} />
                }
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: tokens.font.mono, fontSize: '14px', fontWeight: 700, color: tokens.text.primary,
                  }}>
                    {selected.name}
                  </div>
                  <div style={{ fontFamily: tokens.font.mono, fontSize: '10px', color: tokens.text.muted, marginTop: 1 }}>
                    {selected.path}
                    {selected.type === 'file' && selected.size
                      ? ` · ${formatBytes(selected.size)}`
                      : selected.type === 'dir' && selected.fileCount
                      ? ` · ${selected.fileCount} plików`
                      : ''}
                  </div>
                </div>
                <button
                  onClick={() => runAnalysis(`Przeanalizuj element: ${selected.path} (${selected.type === 'dir' ? 'folder' : 'plik'}). Dla folderów opisz jego przeznaczenie, zawartość i rolę w projekcie.`)}
                  disabled={analysing}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px',
                    background: tokens.accent.muted,
                    border: `1px solid ${tokens.accent.mutedBorder}`,
                    borderRadius: tokens.radius.md,
                    fontFamily: tokens.font.sans, fontSize: '11px', fontWeight: 600,
                    color: tokens.accent.primary, cursor: 'pointer',
                  }}
                >
                  <Brain size={11} />
                  Analizuj
                </button>
              </div>
            </motion.div>
          )}

          {/* Top projects grid */}
          {data && !selected && (
            <div style={{
              padding: '16px 18px',
              background: tokens.bg.primary,
              border: `1px solid ${tokens.border.default}`,
              borderRadius: tokens.radius.xl, boxShadow: tokens.shadow.card,
              flexShrink: 0,
            }}>
              <div style={{
                fontFamily: tokens.font.sans, fontSize: '12px', fontWeight: 700,
                color: tokens.text.secondary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <GitBranch size={13} />
                Projekty w workspace
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {data.stats.topProjects.map((p) => (
                  <span key={p} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px',
                    background: tokens.bg.surface,
                    border: `1px solid ${tokens.border.default}`,
                    borderRadius: tokens.radius.md,
                    fontFamily: tokens.font.mono, fontSize: '11px', color: tokens.text.primary,
                  }}>
                    <Folder size={10} color={tokens.accent.primary} />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ask AI */}
          <div style={{
            padding: '14px 18px',
            background: tokens.bg.primary,
            border: `1px solid ${tokens.border.default}`,
            borderRadius: tokens.radius.xl, boxShadow: tokens.shadow.card,
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: tokens.font.sans, fontSize: '12px', fontWeight: 700,
              color: tokens.text.secondary, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Sparkles size={13} />
              Zapytaj agenta o workspace
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="np. Które projekty są aktywnie rozwijane? Co to jest autorise-dashboard?"
                style={{
                  flex: 1, padding: '9px 12px',
                  background: tokens.bg.surface,
                  border: `1px solid ${tokens.border.default}`,
                  borderRadius: tokens.radius.md,
                  fontFamily: tokens.font.sans, fontSize: '12px',
                  color: tokens.text.primary, outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = tokens.accent.primary }}
                onBlur={(e) => { e.currentTarget.style.borderColor = tokens.border.default }}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || askingQuestion || analysing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px',
                  background: question.trim() && !askingQuestion && !analysing ? tokens.accent.primary : tokens.bg.elevated,
                  color: question.trim() && !askingQuestion && !analysing ? '#fff' : tokens.text.muted,
                  border: 'none', borderRadius: tokens.radius.md,
                  fontFamily: tokens.font.sans, fontSize: '12px', fontWeight: 600,
                  cursor: question.trim() && !askingQuestion && !analysing ? 'pointer' : 'not-allowed',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
              >
                {askingQuestion || analysing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                Wyślij
              </button>
            </div>
          </div>

          {/* Analysis output */}
          <AnimatePresence>
            {(analysis || analysing) && (
              <motion.div
                ref={analysisRef}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  padding: '16px 18px',
                  background: '#0d1117',
                  border: `1px solid #21262d`,
                  borderRadius: tokens.radius.xl,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  fontFamily: tokens.font.mono, fontSize: '10px', fontWeight: 700,
                  color: '#8b949e', marginBottom: 12, letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Brain size={11} color="#8b949e" />
                  WORKSPACE INTELLIGENCE
                </div>
                {analysing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#79c0ff' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontFamily: tokens.font.mono, fontSize: '12px' }}>Analizuję strukturę workspace...</span>
                  </div>
                ) : (
                  <pre style={{
                    margin: 0, fontFamily: tokens.font.mono, fontSize: '12px',
                    color: '#e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    lineHeight: 1.7,
                  }}>
                    {analysis}
                  </pre>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .workspace-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
