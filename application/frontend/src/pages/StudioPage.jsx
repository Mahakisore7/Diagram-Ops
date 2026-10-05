import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Check, Clock, Code2, Copy, Eye, History, RotateCcw, Save, Sparkles, Wand2, Zap } from 'lucide-react';
import { diagramsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useHotkey } from '../hooks/useHotkey';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Button from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Input';
import TagInput from '../components/ui/TagInput';
import { Card, Kbd, PageHeader } from '../components/ui/primitives';
import DiagramCanvas from '../components/diagram/DiagramCanvas';
import { TypeIcon } from '../components/diagram/TypeBadge';
import { DIAGRAM_TYPES, TEMPLATES, TYPE_KEYS } from '../lib/diagramTypes';
import { copyToClipboard } from '../lib/exporters';
import { cn, formatMs, modKey } from '../lib/utils';

const MAX_CHARS = 2000;

function TypePicker({ value, onChange }) {
  const options = [{ key: '', label: 'Auto', description: 'Let the AI choose' }, ...TYPE_KEYS.map((k) => ({ key: k, ...DIAGRAM_TYPES[k] }))];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Diagram type">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key || 'auto'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            title={o.description}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 text-center text-[11px] font-medium transition',
              active
                ? 'border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50',
            )}
          >
            {o.key ? (
              <TypeIcon type={o.key} size="sm" className="size-6 rounded-md [&_svg]:size-3" />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white">
                <Wand2 className="size-3" />
              </span>
            )}
            <span className="w-full truncate">{o.key ? o.label.replace('Entity-Relationship', 'ER') : o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Honest progress: shows real elapsed time rather than invented steps.
function GeneratingState() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - start), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-6 p-8">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-lg shadow-brand-500/30">
          <Sparkles className="size-7 animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-medium text-zinc-900 dark:text-white">Generating your diagram…</p>
        <p className="mt-1 text-sm text-zinc-500 tabular-nums">{(elapsed / 1000).toFixed(1)}s · usually a few seconds</p>
      </div>
      <div className="grid w-full max-w-sm grid-cols-3 gap-3 opacity-70">
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
        <div className="skeleton h-10" />
        <div className="skeleton col-start-2 h-10" />
      </div>
    </div>
  );
}

export default function StudioPage() {
  useDocumentTitle('Studio');
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [defaultType] = useLocalStorage('diagramforge_default_type', '');
  const [recentPrompts, setRecentPrompts] = useLocalStorage('diagramforge_recent_prompts', []);

  const [text, setText] = useState('');
  const [diagramType, setDiagramType] = useState(defaultType);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState('preview');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const textRef = useRef(null);

  // Template handed over from the dashboard.
  useEffect(() => {
    const t = location.state?.template;
    if (t) {
      setText(t.prompt);
      setDiagramType(t.type);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  async function generate() {
    const prompt = text.trim();
    if (!prompt || generating) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await diagramsApi.generate(prompt, diagramType || undefined);
      setResult(res);
      setTitle(res.title);
      setView('preview');
      setRecentPrompts((list) => [prompt, ...list.filter((p) => p !== prompt)].slice(0, 5));
    } catch (err) {
      // 429 DAILY_CAP_EXCEEDED / RATE_LIMITED, 502 LLM_INVALID_OUTPUT and
      // 503 LLM_UNAVAILABLE all arrive with a human-readable message.
      setError(err);
    } finally {
      setGenerating(false);
    }
  }

  // Generation and saving are deliberately separate requests - nothing is
  // persisted until the user saves (docs/adr/0005).
  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      const created = await diagramsApi.create({
        title: title.trim(),
        sourceText: text.trim(),
        diagramType: result.diagramType,
        mermaidSyntax: result.mermaidSyntax,
        providerUsed: result.providerUsed,
        generationMs: result.generationMs,
        tags,
      });
      toast.success('Diagram saved', 'It’s now in your library.');
      navigate(`/app/diagrams/${created._id}`);
    } catch (err) {
      toast.error('Could not save diagram', err.message);
    } finally {
      setSaving(false);
    }
  }

  useHotkey('mod+enter', generate, { allowInInputs: true });
  useHotkey('mod+s', () => result && save(), { allowInInputs: true });

  async function copySource() {
    await copyToClipboard(result.mermaidSyntax);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Generate a diagram"
        description="Describe a process, system, or data model in plain English."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_1fr]">
        {/* Prompt panel */}
        <Card className="h-fit p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
            className="space-y-5"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="prompt" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Description
                </label>
                <span className={cn('text-xs tabular-nums', text.length > MAX_CHARS * 0.9 ? 'text-amber-600' : 'text-zinc-400')}>
                  {text.length}/{MAX_CHARS}
                </span>
              </div>
              <Textarea
                id="prompt"
                ref={textRef}
                rows={8}
                maxLength={MAX_CHARS}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. A user submits an order. We check stock; if available we charge the card and ship, otherwise we refund and notify the user."
                className="leading-relaxed"
                autoFocus
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Diagram type</p>
              <TypePicker value={diagramType} onChange={setDiagramType} />
            </div>

            <Button type="submit" className="w-full" size="lg" variant="gradient" loading={generating} disabled={!text.trim()}>
              {!generating && <Sparkles />}
              {generating ? 'Generating…' : 'Generate diagram'}
              <span className="ml-auto hidden items-center gap-1 opacity-80 sm:flex">
                <Kbd className="border-white/30 bg-white/10 text-white">{modKey}</Kbd>
                <Kbd className="border-white/30 bg-white/10 text-white">↵</Kbd>
              </span>
            </Button>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <div>
                      <p>{error.message}</p>
                      {error.requestId && <p className="mt-1 font-mono text-xs opacity-70">Request ID: {error.requestId}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <p className="mb-2.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Templates</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => {
                    setText(t.prompt);
                    setDiagramType(t.type);
                    textRef.current?.focus();
                  }}
                  className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          {recentPrompts.length > 0 && (
            <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  <History className="size-3.5" /> Recent prompts
                </p>
                <button onClick={() => setRecentPrompts([])} className="text-xs text-zinc-400 hover:text-zinc-600">
                  Clear
                </button>
              </div>
              <ul className="space-y-1">
                {recentPrompts.map((p) => (
                  <li key={p}>
                    <button
                      onClick={() => setText(p)}
                      className="w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      title={p}
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Result panel */}
        <Card className="flex min-h-[32rem] flex-col overflow-hidden">
          {generating ? (
            <GeneratingState />
          ) : result ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div className="flex rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                  {[
                    ['preview', Eye, 'Preview'],
                    ['source', Code2, 'Source'],
                  ].map(([key, Icon, label]) => (
                    <button
                      key={key}
                      onClick={() => setView(key)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition',
                        view === key ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
                      )}
                    >
                      <Icon className="size-3.5" /> {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Zap className="size-3.5 text-emerald-500" /> {result.providerUsed}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {formatMs(result.generationMs)}
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">{result.diagramType}</span>
                </div>
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={copySource}>
                    {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={generate}>
                    <RotateCcw /> Regenerate
                  </Button>
                </div>
              </div>

              {view === 'preview' ? (
                <DiagramCanvas syntax={result.mermaidSyntax} className="min-h-[22rem] flex-1" />
              ) : (
                <pre className="thin-scrollbar min-h-[22rem] flex-1 overflow-auto bg-zinc-950 p-5 font-mono text-xs leading-relaxed text-zinc-200">
                  {result.mermaidSyntax}
                </pre>
              )}

              <div className="grid gap-4 border-t border-zinc-100 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-zinc-800">
                <Field label="Title">
                  {(props) => <Input {...props} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />}
                </Field>
                <Field label="Tags">{({ id }) => <TagInput id={id} value={tags} onChange={setTags} />}</Field>
                <Button onClick={save} loading={saving} className="h-10">
                  {!saving && <Save />} Save to library
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
              <div className="relative mb-6">
                <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-brand-500/20 to-fuchsia-500/20 blur-2xl" />
                <div className="relative flex size-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <Wand2 className="size-7 text-brand-500" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your diagram will appear here</h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Write a description or pick a template, then press <Kbd>{modKey}</Kbd> <Kbd>↵</Kbd> to generate.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
