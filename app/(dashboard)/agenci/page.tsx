'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Cpu,
  ChevronDown,
  RefreshCw,
  Brain,
  CheckCircle2,
  Loader2,
  FileText,
  Sparkles,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { agentTokens as at } from '@/lib/tokens'
import { AGENT_LABELS, AGENT_MODELS, AGENT_TIMES } from '@/lib/agents/prompts'
import type { PipelineClient } from '@/lib/notion/client'
import type { HealthResponse } from '@/app/api/health/route'
import { Agent1Card } from '@/components/agents/Agent1Card'
import type { Agent1Output } from '@/components/agents/Agent1Card'
import { Agent0Card } from '@/components/agents/Agent0Card'
import type { Agent0Output } from '@/components/agents/Agent0Card'
import { AgentFieldsCard } from '@/components/agents/AgentFieldsCard'

type AgentId = 'agent0' | 'agent1' | 'agent2' | 'agent3' | 'agent4' | 'agent5' | 'agent6'
type AgentStatus = 'idle' | 'running' | 'done' | 'error'

interface AgentState {
  transcript: string
  status: AgentStatus
  output: unknown
  errorMsg: string | null
  notionPageId: string | null
  notionError: string | null
  notionPushing: boolean
}

const INITIAL_STATE: AgentState = {
  transcript: '',
  status: 'idle',
  output: null,
  errorMsg: null,
  notionPageId: null,
  notionError: null,
  notionPushing: false,
}

const AGENT_IDS: AgentId[] = ['agent0', 'agent1', 'agent2', 'agent3', 'agent4', 'agent5', 'agent6']

const AGENT_DESCRIPTIONS: Record<AgentId, string> = {
  agent0: 'Lead Intake — wklej wiadomość ze Slacka, agent parsuje dane, odpytuje KRS/MF i tworzy kartę w Notion Pipeline.',
  agent1: 'Kwalifikacja telefoniczna — ICP score, koszt problemu, dane do Notion Pipeline.',
  agent2: 'Pre-Discovery Brief z extended thinking — analiza kwalifikacji i przygotowanie planu Discovery Call. Uruchom PO Agencie 1, PRZED Discovery Call.',
  agent3: 'Personalizacja Prezentacji — przygotowuje dane do podstawienia w Autorise_Prezentacja.html przed Discovery Call.',
  agent4: 'Analiza Discovery Call — wynik, jakość kroków 1-5, obiekcje, re-engagement. Transkrypt całego spotkania (45-60 min).',
  agent5: 'Agency Leaders Knowledge — przetwarza transkrypt sesji (Robert Kimura / Kacper Wierszewski) i wyodrębnia actionable learningi.',
  agent6: 'Wywiad rynkowy — przeszukuje sieć i analizuje konkurencję, potencjalnych klientów i trendy na rynku transportowym.',
}

const AGENT_INPUT_LABELS: Record<AgentId, string> = {
  agent0: 'Wiadomość ze Slacka (treść pozyskanego leada)',
  agent1: 'Transkrypt rozmowy kwalifikacyjnej (5-8 min)',
  agent2: 'Transkrypt rozmowy kwalifikacyjnej + JSON Agenta 1 (Agent 1 musi być uruchomiony wcześniej)',
  agent3: 'JSON z Agenta 1 + JSON pre_discovery_brief z Agenta 2',
  agent4: 'Transkrypt Discovery Call (45-60 min, całość — diagnoza + pitch + cena + closing)',
  agent5: 'Transkrypt sesji Agency Leaders (Fathom)',
  agent6: 'Zapytanie / temat badania rynkowego',
}

const TAB_LABELS: Record<AgentId, string> = {
  agent0: '0 · Lead Intake',
  agent1: '1 · Kwalifikacja',
  agent2: '2 · Pre-Discovery',
  agent3: '3 · Personalizacja',
  agent4: '4 · Discovery Call',
  agent5: '5 · Agency Leaders',
  agent6: '6 · Wywiad rynkowy',
}

// Which Pipeline statuses are relevant for each agent (v5 status map)
const AGENT_STATUSES_FILTER: Record<AgentId, string[]> = {
  agent0: [],
  agent1: ['Nowy lead', 'Kwalifikacja'],
  agent2: ['Kwalifikacja', 'Discovery umówione'],
  agent3: ['Discovery umówione'],
  agent4: ['Discovery umówione'],
  agent5: [],
  agent6: [],
}

const AGENT_STAGE_HINT: Record<AgentId, string> = {
  agent0: 'slack → krs → notion',
  agent1: 'nowi i kwalifikowani',
  agent2: 'przed discovery call',
  agent3: 'personalizacja prezentacji',
  agent4: 'analiza discovery call',
  agent5: 'agency leaders · śr+pt 12:00',
  agent6: 'web search · na żądanie',
}

const STATUS_COLORS = {
  'Nowy lead': '#2563eb',
  Kwalifikacja: '#7c3aed',
  'Discovery umówione': '#d97706',
  Finalizacja: '#16a34a',
  Kickoff: '#16a34a',
  Wdrożenie: '#16a34a',
  Retainer: '#16a34a',
  Upsell: '#2563eb',
  Niekwalifikowany: '#6b7280',
} as Record<string, string>

function statusColor(s: string): string {
  return STATUS_COLORS[s] ?? at.text.muted
}

// --- Health indicator chip ---

function HealthChip({ label, ok, error }: { label: string; ok: boolean | null; error?: string }) {
  const color = ok === null ? at.text.muted : ok ? at.status.success : at.status.error
  const bg = ok === null ? at.bg.elevated : ok ? at.status.successMuted : at.status.errorMuted
  const border = ok === null ? at.border.default : ok ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'

  return (
    <span
      title={error}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: '999px',
        background: bg,
        border: `1px solid ${border}`,
        fontFamily: at.font.sans,
        fontSize: '11px',
        fontWeight: 500,
        color,
        cursor: error ? 'help' : 'default',
        transition: 'all 0.2s',
      }}
    >
      {ok === null ? (
        <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} />
      ) : ok ? (
        <Wifi size={9} />
      ) : (
        <WifiOff size={9} />
      )}
      {label}
    </span>
  )
}

// --- Output empty state ---

function OutputEmpty({ isRunning }: { isRunning: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: at.text.muted,
      }}
    >
      {isRunning ? (
        <>
          <Loader2
            size={28}
            style={{ animation: 'spin 1s linear infinite', color: at.accent.primary }}
          />
          <span style={{ fontFamily: at.font.sans, fontSize: '13px', fontWeight: 500 }}>
            Analizuję transkrypt...
          </span>
        </>
      ) : (
        <>
          <Sparkles size={28} style={{ opacity: 0.2 }} />
          <span style={{ fontFamily: at.font.sans, fontSize: '13px', color: at.text.muted }}>
            Wynik pojawi się tutaj
          </span>
        </>
      )}
    </div>
  )
}

// --- Output panel ---

function OutputPanel({
  agentId,
  output,
  notionPageId,
  notionError,
  notionPushing,
  onNotionPush,
}: {
  agentId: AgentId
  output: unknown
  notionPageId: string | null
  notionError: string | null
  notionPushing: boolean
  onNotionPush: () => void
}) {
  const [copied, setCopied] = useState(false)
  const isText = agentId === 'agent3' || agentId === 'agent5' || agentId === 'agent6'
  const displayText = isText ? (output as string) : JSON.stringify(output, null, 2)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Output header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: at.font.sans,
            fontSize: '12px',

            fontWeight: 600,
            color: at.text.secondary,
          }}
        >
          {agentId === 'agent0' ? 'Karta leada' : agentId === 'agent1' ? 'Karta klienta' : agentId === 'agent3' ? 'Treść oferty' : agentId === 'agent5' ? 'Knowledge Report' : agentId === 'agent6' ? 'Intelligence Report' : 'Output JSON'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Notion status */}
          <AnimatePresence mode="wait">
            {notionPageId ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: at.font.sans,
                  fontSize: '12px',
                  color: at.status.success,
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 size={13} />
                Zapisano w Notion
              </motion.span>
            ) : notionError ? (
              <motion.button
                key="push"
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={onNotionPush}
                disabled={notionPushing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  background: notionPushing ? at.bg.elevated : at.accent.primary,
                  color: notionPushing ? at.text.muted : '#fff',
                  border: 'none',
                  borderRadius: at.radius.md,
                  fontFamily: at.font.sans,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: notionPushing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {notionPushing ? (
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send size={12} />
                )}
                {notionPushing ? 'Zapisuję...' : 'Wyślij do Notion'}
              </motion.button>
            ) : null}
          </AnimatePresence>

          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: at.font.sans,
              fontSize: '12px',
              color: copied ? at.status.success : at.text.muted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: at.radius.sm,
              transition: 'color 0.15s',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Skopiowano' : 'Kopiuj'}
          </button>
        </div>
      </div>

      {/* Notion error detail */}
      <AnimatePresence>
        {notionError && !notionPageId && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginBottom: 10,
              padding: '8px 12px',
              background: at.status.errorMuted,
              border: `1px solid rgba(220,38,38,0.15)`,
              borderRadius: at.radius.md,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 7,
              flexShrink: 0,
            }}
          >
            <AlertCircle size={13} color={at.status.error} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontFamily: at.font.sans,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: at.status.error,
                  display: 'block',
                  marginBottom: 2,
                }}
              >
                Błąd zapisu do Notion
              </span>
              <span
                style={{
                  fontFamily: at.font.mono,
                  fontSize: '10px',
                  color: at.status.error,
                  opacity: 0.8,
                  lineHeight: 1.4,
                }}
              >
                {notionError.length > 120 ? notionError.slice(0, 120) + '…' : notionError}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Output content */}
      {agentId === 'agent0' ? (
        <div
          style={{
            flex: 1,
            border: `1px solid ${at.border.default}`,
            borderRadius: at.radius.md,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <Agent0Card output={output as Agent0Output} />
        </div>
      ) : agentId === 'agent1' ? (
        <div
          style={{
            flex: 1,
            border: `1px solid ${at.border.default}`,
            borderRadius: at.radius.md,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <Agent1Card output={output as Agent1Output} />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            background: at.bg.terminal,
            border: `1px solid ${at.bg.terminalBorder}`,
            borderRadius: at.radius.md,
            overflow: 'auto',
            minHeight: 0,
            boxShadow: at.shadow.terminal,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px 6px',
            borderBottom: `1px solid ${at.bg.terminalBorder}`,
            flexShrink: 0,
          }}>
            {['#ff5f57','#ffbd2e','#28c840'].map((dotColor) => (
              <div key={dotColor} style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, opacity: 0.7 }} />
            ))}
            <span style={{ fontFamily: at.font.mono, fontSize: '9px', color: '#8b949e', marginLeft: 4, letterSpacing: '0.05em' }}>
              OUTPUT
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '12px 16px',
              fontFamily: at.font.mono,
              fontSize: '11.5px',
              color: at.text.terminal,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.7,
            }}
          >
            {displayText}
          </pre>
        </div>
      )}
    </div>
  )
}

// --- Agent panel (two-column) ---

function AgentPanel({
  agentId,
  selectedClientId,
  onNewClientCreated,
  health,
  healthLoading,
}: {
  agentId: AgentId
  selectedClientId: string
  onNewClientCreated: (id: string, name: string, status: string) => void
  health: HealthResponse | null
  healthLoading: boolean
}) {
  const [state, setState] = useState<AgentState>(INITIAL_STATE)

  const setField = useCallback(<K extends keyof AgentState>(key: K, value: AgentState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleRun = async () => {
    if (!state.transcript.trim()) return

    setState((prev) => ({
      ...prev,
      status: 'running',
      output: null,
      errorMsg: null,
      notionPageId: null,
      notionError: null,
      notionPushing: false,
    }))

    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: state.transcript,
          notion_page_id: selectedClientId || undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setState((prev) => ({
          ...prev,
          status: 'done',
          output: data.output,
          notionPageId: data.notion_page_id ?? null,
          notionError: data.notion_error ?? null,
        }))
        if ((agentId === 'agent0' || agentId === 'agent1') && data.notion_page_id && !selectedClientId) {
          onNewClientCreated(
            data.notion_page_id,
            data.notion_client_name ?? 'Nowy klient',
            data.notion_client_status ?? 'Nowy lead'
          )
        }
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMsg: data.error || 'Nieznany błąd',
        }))
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMsg: err instanceof Error ? err.message : 'Błąd połączenia',
      }))
    }
  }

  const handleNotionPush = async () => {
    if (!state.output) return
    setField('notionPushing', true)

    try {
      const res = await fetch('/api/notion/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          output: state.output,
          notion_page_id: selectedClientId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setState((prev) => ({
          ...prev,
          notionPageId: data.notion_page_id ?? selectedClientId ?? null,
          notionError: null,
          notionPushing: false,
        }))
        if (agentId === 'agent1' && data.notion_page_id && !selectedClientId) {
          const out1 = (state.output as { firma?: string; imie_nazwisko?: string }) ?? {}
          onNewClientCreated(
            data.notion_page_id,
            out1.firma || out1.imie_nazwisko || 'Nowy klient',
            'Kwalifikacja'
          )
        }
      } else {
        setState((prev) => ({
          ...prev,
          notionError: data.error ?? 'Błąd Notion',
          notionPushing: false,
        }))
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        notionError: err instanceof Error ? err.message : 'Błąd połączenia',
        notionPushing: false,
      }))
    }
  }

  const canRun = state.transcript.trim().length > 10 && state.status !== 'running'
  const isRunning = state.status === 'running'
  const model = AGENT_MODELS[agentId]
  const isOpus = model.includes('opus')
  const hasThinking = agentId === 'agent2' || agentId === 'agent5' || agentId === 'agent6'
  const hasKRS = agentId === 'agent0'

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '2fr 3fr',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {/* ── Left: Input ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          borderRight: `1px solid ${at.border.default}`,
          gap: 12,
          overflow: 'auto',
        }}
      >
        {/* Agent description */}
        <p
          style={{
            fontFamily: at.font.sans,
            fontSize: '13px',
            color: at.text.muted,
            margin: 0,
            lineHeight: 1.55,
            flexShrink: 0,
          }}
        >
          {AGENT_DESCRIPTIONS[agentId]}
        </p>

        {/* Agent fields card */}
        <AgentFieldsCard
          agentNumber={parseInt(agentId.replace('agent', ''), 10)}
          health={health}
          healthLoading={healthLoading}
        />

        {/* Model badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: '999px',
              background: isOpus ? at.accent.muted : at.bg.elevated,
              border: `1px solid ${isOpus ? at.accent.mutedBorder : at.border.default}`,
              fontFamily: at.font.mono,
              fontSize: '10px',
              color: isOpus ? at.accent.primary : at.text.secondary,
              fontWeight: isOpus ? 600 : 400,
            }}
          >
            <Cpu size={9} />
            {model}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 8px',
              borderRadius: '999px',
              background: at.bg.elevated,
              border: `1px solid ${at.border.default}`,
              fontFamily: at.font.mono,
              fontSize: '10px',
              color: at.text.muted,
            }}
          >
            <Clock size={9} />
            {AGENT_TIMES[agentId]}
          </span>
          {hasThinking && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: '999px',
                background: at.status.infoMuted,
                border: `1px solid rgba(37,99,235,0.15)`,
                fontFamily: at.font.mono,
                fontSize: '10px',
                color: at.status.info,
              }}
            >
              <Brain size={9} />
              extended thinking
            </span>
          )}
          {hasKRS && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: '999px',
                background: 'rgba(22,163,74,0.1)',
                border: '1px solid rgba(22,163,74,0.22)',
                fontFamily: at.font.mono,
                fontSize: '10px',
                color: '#16a34a',
              }}
            >
              <FileText size={9} />
              KRS + MF API
            </span>
          )}
        </div>

        {/* Input label */}
        <label
          style={{
            display: 'block',
            fontFamily: at.font.sans,
            fontSize: '12px',
            fontWeight: 600,
            color: at.text.secondary,
            flexShrink: 0,
          }}
        >
          {AGENT_INPUT_LABELS[agentId]}
        </label>

        {/* Textarea */}
        <textarea
          value={state.transcript}
          onChange={(e) => setField('transcript', e.target.value)}
          placeholder={
            agentId === 'agent0'
              ? 'Wklej wiadomość ze Slacka, np.:\n\nPozyskaliśmy Nowy Kontakt!\nNazwa: Jan Kowalski\ntel: +48 600 000 000\nEmail: jan@firma.pl\nNIP: 1234567890'
              : agentId === 'agent6'
              ? 'Opisz temat badania, np. "Analiza konkurentów automatyzujących TMS w Polsce" lub "Firmy transportowe w Wielkopolsce 10-50 pojazdów"...'
              : 'Wklej tekst transkryptu tutaj...'
          }
          style={{
            flex: 1,
            minHeight: 140,
            background: at.bg.surface,
            border: `1px solid ${at.border.default}`,
            borderRadius: at.radius.md,
            padding: '12px 14px',
            fontFamily: at.font.mono,
            fontSize: '12px',
            color: at.text.primary,
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            lineHeight: 1.65,
            boxSizing: 'border-box',
            width: '100%',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = at.accent.primary
            e.currentTarget.style.boxShadow = at.shadow.focus
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = at.border.default
            e.currentTarget.style.boxShadow = 'none'
          }}
        />

        {/* Run button row */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}
        >
          <button
            onClick={handleRun}
            disabled={!canRun}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 20px',
              background: canRun ? at.accent.primary : at.bg.elevated,
              color: canRun ? '#fff' : at.text.muted,
              border: 'none',
              borderRadius: at.radius.md,
              fontFamily: at.font.sans,
              fontSize: '13px',
              fontWeight: 600,
              cursor: canRun ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
              boxShadow: canRun ? '0 1px 4px rgba(29,78,216,0.25)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (canRun) {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = at.accent.hover
                b.style.boxShadow = '0 2px 8px rgba(29,78,216,0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (canRun) {
                const b = e.currentTarget as HTMLButtonElement
                b.style.background = at.accent.primary
                b.style.boxShadow = '0 1px 4px rgba(29,78,216,0.25)'
              }
            }}
            onMouseDown={(e) => {
              if (canRun) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
            }}
            onMouseUp={(e) => {
              if (canRun) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            }}
          >
            {isRunning ? (
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={14} />
            )}
            {isRunning
              ? (agentId === 'agent0' ? 'Rejestruję lead...' : 'Analizuję...')
              : (agentId === 'agent0' ? 'Zarejestruj Lead' : `Uruchom Agenta ${agentId.replace('agent', '')}`)
            }
          </button>

          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.span
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontFamily: at.font.sans, fontSize: '12px', color: at.text.muted }}
              >
                {AGENT_TIMES[agentId]}
              </motion.span>
            )}
            {state.status === 'done' && (
              <motion.span
                key="done"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: at.font.sans,
                  fontSize: '12px',
                  color: state.notionPageId ? at.status.success : at.text.muted,
                  fontWeight: 500,
                }}
              >
                {state.notionPageId ? (
                  <><CheckCircle2 size={13} /> Zapisano do Notion</>
                ) : (
                  <><Check size={13} /> Zakończono</>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Agent run error */}
        <AnimatePresence>
          {state.status === 'error' && state.errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '10px 14px',
                background: at.status.errorMuted,
                border: `1px solid rgba(220,38,38,0.15)`,
                borderRadius: at.radius.md,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <AlertCircle size={14} color={at.status.error} style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontFamily: at.font.sans, fontSize: '12px', color: at.status.error, lineHeight: 1.5 }}>
                {state.errorMsg}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: Output ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          {state.status === 'done' && state.output !== null ? (
            <motion.div
              key="output"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <OutputPanel
                agentId={agentId}
                output={state.output}
                notionPageId={state.notionPageId}
                notionError={state.notionError}
                notionPushing={state.notionPushing}
                onNotionPush={handleNotionPush}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ flex: 1, display: 'flex' }}
            >
              <OutputEmpty isRunning={isRunning} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// --- Main page ---

export default function AgenciPage() {
  const [activeAgent, setActiveAgent] = useState<AgentId>('agent1')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  const [clients, setClients] = useState<PipelineClient[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  // Clients filtered to statuses relevant for the active agent
  const filteredClients = useMemo(
    () => clients.filter((c) => AGENT_STATUSES_FILTER[activeAgent].includes(c.status)),
    [clients, activeAgent]
  )

  // Count per agent for tab badges
  const clientCountsPerAgent = useMemo(() => {
    const counts = {} as Record<AgentId, number>
    for (const id of AGENT_IDS) {
      counts[id] = clients.filter((c) => AGENT_STATUSES_FILTER[id].includes(c.status)).length
    }
    return counts
  }, [clients])

  // Reset selection when switching to an agent where the current client doesn't apply
  useEffect(() => {
    if (selectedClientId && !filteredClients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId('')
    }
  }, [activeAgent]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClients = useCallback(async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/notion/clients')
      const data = await res.json()
      if (data.success) setClients(data.clients)
    } catch {
      // silent
    } finally {
      setClientsLoading(false)
    }
  }, [])

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/health')
      const data: HealthResponse = await res.json()
      setHealth(data)
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
    fetchHealth()
  }, [fetchClients, fetchHealth])

  const handleNewClientCreated = useCallback(
    (id: string, name: string, status: string) => {
      // Immediately add to local clients list — don't wait for Notion to index
      setClients((prev) => {
        if (prev.some((c) => c.id === id)) return prev
        return [...prev, { id, name, status }]
      })
      setNewlyCreatedId(id)
      setSelectedClientId(id)
      // Background refresh after 3s to get canonical data from Notion
      setTimeout(() => {
        fetchClients().then(() => setSelectedClientId(id))
      }, 3000)
    },
    [fetchClients]
  )

  const handleClientSelect = (id: string) => {
    setSelectedClientId(id)
    setNewlyCreatedId(null)
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 24px',
          gap: 14,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0,
          }}
        >
          {/* Left: title + status */}
          <div>
            <h1
              style={{
                fontFamily: at.font.sans,
                fontSize: '22px',
                fontWeight: 800,
                color: at.text.primary,
                margin: '0 0 4px',
                letterSpacing: '-0.025em',
              }}
            >
              Agenci Sprzedażowi
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <HealthChip
                label="Anthropic API"
                ok={healthLoading ? null : health?.anthropic.ok ?? false}
                error={health?.anthropic.error}
              />
              <HealthChip
                label="Notion Pipeline"
                ok={healthLoading ? null : health?.notion.ok ?? false}
                error={health?.notion.error}
              />
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                title="Sprawdź połączenia"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: '2px 4px',
                  cursor: healthLoading ? 'not-allowed' : 'pointer',
                  color: at.text.muted,
                  borderRadius: at.radius.sm,
                }}
              >
                <RefreshCw
                  size={11}
                  style={{ animation: healthLoading ? 'spin 1s linear infinite' : 'none' }}
                />
              </button>
            </div>
          </div>

          {/* Right: client selector — hidden for agent0, agent5, agent6 */}
          <div style={{ display: (activeAgent === 'agent0' || activeAgent === 'agent5' || activeAgent === 'agent6') ? 'none' : 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Status badge for selected client */}
            <AnimatePresence>
              {selectedClient && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: `${statusColor(selectedClient.status)}12`,
                    border: `1px solid ${statusColor(selectedClient.status)}25`,
                    fontFamily: at.font.sans,
                    fontSize: '11px',
                    fontWeight: 500,
                    color: statusColor(selectedClient.status),
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: statusColor(selectedClient.status),
                      flexShrink: 0,
                    }}
                  />
                  {selectedClient.status}
                </motion.span>
              )}
              {newlyCreatedId && !selectedClient && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: at.font.sans,
                    fontSize: '11px',
                    color: at.status.success,
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle2 size={12} />
                  Nowa karta w Notion
                </motion.span>
              )}
            </AnimatePresence>

            {/* Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientSelect(e.target.value)}
                disabled={clientsLoading}
                style={{
                  padding: '8px 32px 8px 12px',
                  background: at.bg.surface,
                  border: `1px solid ${at.border.default}`,
                  borderRadius: at.radius.md,
                  fontFamily: at.font.sans,
                  fontSize: '13px',
                  color: selectedClientId ? at.text.primary : at.text.muted,
                  cursor: clientsLoading ? 'wait' : 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minWidth: 200,
                  maxWidth: 280,
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = at.accent.primary
                  e.currentTarget.style.boxShadow = at.shadow.focus
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = at.border.default
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <option value="">
                  {activeAgent === 'agent1' ? '— Nowy klient —' : '— Wybierz klienta —'}
                </option>
                {filteredClients.length === 0 && !clientsLoading ? (
                  <option disabled value="__empty__">
                    Brak klientów na tym etapie
                  </option>
                ) : (
                  filteredClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.status ? ` · ${c.status}` : ''}
                    </option>
                  ))
                )}
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: at.text.muted,
                }}
              >
                {clientsLoading ? (
                  <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ChevronDown size={12} />
                )}
              </div>
            </div>

            {/* Refresh clients */}
            <button
              onClick={fetchClients}
              disabled={clientsLoading}
              title="Odśwież listę klientów"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 34,
                height: 34,
                background: 'none',
                border: `1px solid ${at.border.default}`,
                borderRadius: at.radius.md,
                cursor: clientsLoading ? 'not-allowed' : 'pointer',
                color: at.text.muted,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!clientsLoading) {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.borderColor = at.border.strong
                  b.style.color = at.text.secondary
                }
              }}
              onMouseLeave={(e) => {
                if (!clientsLoading) {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.borderColor = at.border.default
                  b.style.color = at.text.muted
                }
              }}
            >
              <RefreshCw
                size={13}
                style={{ animation: clientsLoading ? 'spin 1s linear infinite' : 'none' }}
              />
            </button>

            {/* Stage context chip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: at.bg.elevated,
                border: `1px solid ${at.border.default}`,
                borderRadius: at.radius.md,
                fontFamily: at.font.sans,
                fontSize: '11px',
                color: at.text.muted,
                whiteSpace: 'nowrap',
              }}
            >
              <FileText size={10} />
              {AGENT_STAGE_HINT[activeAgent]}
              {filteredClients.length > 0 && (
                <span
                  style={{
                    marginLeft: 3,
                    padding: '0px 5px',
                    background: `${at.accent.primary}18`,
                    color: at.accent.primary,
                    borderRadius: '999px',
                    fontWeight: 600,
                    fontSize: '10px',
                  }}
                >
                  {filteredClients.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Main card (tabs + panels) ── */}
        <div
          style={{
            flex: 1,
            border: `1px solid ${at.border.default}`,
            borderRadius: at.radius.xl,
            overflow: 'hidden',
            boxShadow: at.shadow.card,
            background: at.bg.primary,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${at.border.default}`,
              background: at.bg.surface,
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            {AGENT_IDS.map((id) => {
              const isActive = id === activeAgent
              return (
                <button
                  key={id}
                  onClick={() => setActiveAgent(id)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    fontFamily: at.font.sans,
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? at.accent.primary : at.text.muted,
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive
                      ? `2px solid ${at.accent.primary}`
                      : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap',
                    marginBottom: -1,
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.color = at.text.secondary
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.color = at.text.muted
                  }}
                >
                  {TAB_LABELS[id]}
                  {clientCountsPerAgent[id] > 0 && (
                    <span
                      style={{
                        marginLeft: 6,
                        padding: '1px 6px',
                        background: isActive
                          ? `${at.accent.primary}20`
                          : `${at.text.muted}18`,
                        color: isActive ? at.accent.primary : at.text.muted,
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 600,
                        lineHeight: '16px',
                        display: 'inline-block',
                      }}
                    >
                      {clientCountsPerAgent[id]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Agent label bar */}
          <div
            style={{
              padding: '10px 24px',
              borderBottom: `1px solid ${at.border.subtle}`,
              background: at.bg.primary,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: at.font.sans,
                fontSize: '14px',
                fontWeight: 700,
                color: at.text.primary,
                letterSpacing: '-0.01em',
              }}
            >
              {AGENT_LABELS[activeAgent]}
            </span>
          </div>

          {/* Two-column panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeAgent}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, display: 'flex', minHeight: 0 }}
            >
              <AgentPanel
                key={activeAgent}
                agentId={activeAgent}
                selectedClientId={selectedClientId}
                onNewClientCreated={handleNewClientCreated}
                health={health}
                healthLoading={healthLoading}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
