import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronRight,
  Clock,
  Code2,
  Columns2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileImage,
  FileQuestion,
  History,
  Image,
  MessageSquareText,
  MoreHorizontal,
  RotateCcw,
  Save,
  Share2,
  Star,
  Trash2,
  Zap,
} from 'lucide-react';
import { diagramsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useHotkey } from '../hooks/useHotkey';
import Button from '../components/ui/Button';
import { ConfirmDialog, Modal } from '../components/ui/Modal';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../components/ui/Menu';
import TagInput from '../components/ui/TagInput';
import { Card, EmptyState, Kbd, Skeleton } from '../components/ui/primitives';
import CodeEditor from '../components/diagram/CodeEditor';
import DiagramCanvas from '../components/diagram/DiagramCanvas';
import ShareDialog from '../components/diagram/ShareDialog';
import TypeBadge from '../components/diagram/TypeBadge';
import VersionHistory from '../components/diagram/VersionHistory';
import { copyToClipboard, downloadPng, downloadSvg, downloadText } from '../lib/exporters';
import { cn, formatDateTime, formatMs, modKey, slugify, timeAgo } from '../lib/utils';

const LAYOUTS = [
  ['split', Columns2, 'Split'],
  ['code', Code2, 'Code'],
  ['preview', Eye, 'Preview'],
];

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { resolved } = useTheme();

  const [diagram, setDiagram] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [title, setTitle] = useState('');
  const [syntax, setSyntax] = useState('');
  const [liveSvg, setLiveSvg] = useState('');
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState('split');
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [preview, setPreview] = useState(null); // { index, version }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  useDocumentTitle(diagram ? title || diagram.title : 'Diagram');

  useEffect(() => {
    setStatus('loading');
    diagramsApi
      .get(id)
      .then((d) => {
        setDiagram(d);
        setTitle(d.title);
        setSyntax(d.mermaidSyntax);
        setStatus('ready');
      })
      .catch((err) => setStatus(err.status === 404 || err.status === 400 ? 'notfound' : 'error'));
  }, [id]);

  const dirty = Boolean(diagram) && (title !== diagram.title || syntax !== diagram.mermaidSyntax);

  // Guard against losing edits: in-app navigation is intercepted by the
  // router's blocker, tab close / reload by beforeunload.
  // leavingRef lets intentional exits (after deleting) skip the prompt.
  const leavingRef = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !leavingRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!dirty || saving) return;
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await diagramsApi.update(id, { title: title.trim(), mermaidSyntax: syntax });
      setDiagram(updated);
      setTitle(updated.title);
      setHistoryKey((k) => k + 1);
      toast.success('Changes saved');
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  }, [dirty, saving, title, syntax, id, toast]);

  useHotkey('mod+s', save, { allowInInputs: true });

  async function patchMeta(fields, successMessage) {
    const before = diagram;
    setDiagram({ ...diagram, ...fields });
    try {
      const updated = await diagramsApi.update(id, fields);
      setDiagram((d) => ({ ...d, ...updated, title: d.title, mermaidSyntax: d.mermaidSyntax }));
      if (successMessage) toast.success(successMessage);
    } catch (err) {
      setDiagram(before);
      toast.error('Could not update', err.message);
    }
  }

  async function duplicate() {
    try {
      const copy = await diagramsApi.duplicate(id);
      toast.success('Duplicated', copy.title);
      navigate(`/app/diagrams/${copy._id}`);
    } catch (err) {
      toast.error('Could not duplicate', err.message);
    }
  }

  const base = slugify(title);
  const exportActions = {
    svg: () => downloadSvg(liveSvg, `${base}.svg`),
    png: () =>
      downloadPng(liveSvg, `${base}.png`, resolved === 'dark' ? '#18181b' : '#ffffff').catch((err) => toast.error('PNG export failed', err.message)),
    mmd: () => downloadText(syntax, `${base}.mmd`),
    copy: async () => {
      await copyToClipboard(syntax);
      toast.success('Mermaid source copied');
    },
    markdown: async () => {
      await copyToClipboard('```mermaid\n' + syntax + '\n```');
      toast.success('Copied as Markdown', 'Paste into GitHub, GitLab or Notion.');
    },
  };

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-[70vh] rounded-2xl" />
      </div>
    );
  }
  if (status === 'notfound' || status === 'error') {
    return (
      <EmptyState
        icon={FileQuestion}
        title={status === 'notfound' ? 'Diagram not found' : 'Could not load diagram'}
        description={
          status === 'notfound'
            ? "This diagram doesn't exist, or it isn't yours to see. If you followed a link, double-check it."
            : 'Something went wrong loading this diagram. Please try again.'
        }
        action={<Button to="/app/diagrams">Back to library</Button>}
      />
    );
  }

  const shownSyntax = preview ? preview.version.mermaidSyntax : syntax;

  return (
    <div className="space-y-4">
      {/* Breadcrumb + header */}
      <nav className="flex items-center gap-1.5 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link to="/app/diagrams" className="hover:text-zinc-800 dark:hover:text-zinc-200">
          Library
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate text-zinc-800 dark:text-zinc-200">{diagram.title}</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 -ml-1.5 text-2xl font-semibold tracking-tight text-zinc-900 hover:border-zinc-200 focus:border-brand-500 focus:outline-none dark:text-white dark:hover:border-zinc-800"
              aria-label="Diagram title"
            />
            <button
              onClick={() => patchMeta({ isFavorite: !diagram.isFavorite })}
              className={cn('rounded-lg p-1.5 transition', diagram.isFavorite ? 'text-amber-500' : 'text-zinc-400 hover:text-amber-500')}
              aria-label={diagram.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={diagram.isFavorite}
            >
              <Star className={cn('size-5', diagram.isFavorite && 'fill-current')} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <TypeBadge type={diagram.diagramType} />
            {diagram.providerUsed && (
              <span className="flex items-center gap-1">
                <Zap className="size-3.5" /> {diagram.providerUsed} · {formatMs(diagram.generationMs)}
              </span>
            )}
            <span className="flex items-center gap-1" title={formatDateTime(diagram.updatedAt)}>
              <Clock className="size-3.5" /> Edited {timeAgo(diagram.updatedAt)}
            </span>
            {dirty && (
              <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500" /> Unsaved changes
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setHistoryOpen(true)}>
            <History /> History
          </Button>
          <Button variant="secondary" onClick={() => setShareOpen(true)}>
            <Share2 /> {diagram.shareToken ? 'Shared' : 'Share'}
          </Button>
          <Menu
            trigger={({ toggle, ...aria }) => (
              <Button variant="secondary" onClick={toggle} {...aria} disabled={!liveSvg && !syntax}>
                <Download /> Export
              </Button>
            )}
          >
            <MenuLabel>Download</MenuLabel>
            <MenuItem icon={FileImage} onClick={exportActions.svg} disabled={!liveSvg}>
              SVG (vector)
            </MenuItem>
            <MenuItem icon={Image} onClick={exportActions.png} disabled={!liveSvg}>
              PNG (2× resolution)
            </MenuItem>
            <MenuItem icon={FileCode2} onClick={exportActions.mmd}>
              Mermaid source (.mmd)
            </MenuItem>
            <MenuSeparator />
            <MenuLabel>Clipboard</MenuLabel>
            <MenuItem icon={Copy} onClick={exportActions.copy}>
              Copy source
            </MenuItem>
            <MenuItem icon={Copy} onClick={exportActions.markdown}>
              Copy as Markdown
            </MenuItem>
          </Menu>
          <Menu
            trigger={({ toggle, ...aria }) => (
              <Button variant="secondary" size="icon" onClick={toggle} {...aria} aria-label="More actions">
                <MoreHorizontal />
              </Button>
            )}
          >
            <MenuItem icon={MessageSquareText} onClick={() => setPromptOpen(true)}>
              View original prompt
            </MenuItem>
            <MenuItem icon={Copy} onClick={duplicate}>
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={Trash2} danger onClick={() => setConfirmDelete(true)}>
              Delete diagram
            </MenuItem>
          </Menu>
          <Button onClick={save} loading={saving} disabled={!dirty}>
            {!saving && <Save />} Save
            <Kbd className="ml-1 hidden border-white/30 bg-white/10 text-white sm:inline-flex">{modKey} S</Kbd>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <TagInput value={diagram.tags || []} onChange={(tags) => patchMeta({ tags })} placeholder="Add tags to organise this diagram…" />
        </div>
        <div className="flex self-start rounded-lg border border-zinc-200 bg-white p-0.5 sm:self-auto dark:border-zinc-800 dark:bg-zinc-900" role="group" aria-label="Editor layout">
          {LAYOUTS.map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setLayout(key)}
              aria-pressed={layout === key}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition',
                layout === key ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200',
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
              <History className="size-4 text-brand-600 dark:text-brand-400" />
              <span className="text-brand-900 dark:text-brand-100">
                Previewing <strong>{preview.version.title}</strong> from {formatDateTime(preview.version.savedAt)}
              </span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSyntax(preview.version.mermaidSyntax);
                    setTitle(preview.version.title);
                    setPreview(null);
                    setHistoryOpen(false);
                    toast.info('Version restored into the editor', 'Save to keep it - the current version will be kept in history.');
                  }}
                >
                  <RotateCcw /> Restore this version
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden">
        <div className={cn('grid h-[calc(100vh-20rem)] min-h-[28rem]', layout === 'split' && 'lg:grid-cols-2')}>
          {layout !== 'preview' && (
            <CodeEditor
              value={shownSyntax}
              onChange={setSyntax}
              readOnly={Boolean(preview)}
              className={cn('min-h-[16rem]', layout === 'split' && 'border-b border-zinc-200 lg:border-r lg:border-b-0 dark:border-zinc-800')}
            />
          )}
          {layout !== 'code' && <DiagramCanvas syntax={shownSyntax} onRendered={preview ? undefined : setLiveSvg} className="min-h-[16rem]" />}
        </div>
      </Card>

      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} diagram={diagram} onChange={setDiagram} />
      <VersionHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        diagramId={id}
        refreshKey={historyKey}
        current={diagram}
        previewIndex={preview ? preview.index : null}
        onPreview={(index, version) => setPreview(index === null ? null : { index, version })}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await diagramsApi.remove(id);
            toast.success('Diagram deleted');
            leavingRef.current = true;
            navigate('/app/diagrams');
          } catch (err) {
            toast.error('Could not delete', err.message);
          }
        }}
        title="Delete this diagram?"
        description="This permanently deletes the diagram and all of its versions. Any share link stops working."
        confirmLabel="Delete diagram"
      />
      <Modal open={promptOpen} onClose={() => setPromptOpen(false)} title="Original prompt" description={`Generated by ${diagram.providerUsed || 'AI'} on ${formatDateTime(diagram.createdAt)}`}>
        <p className="rounded-xl bg-zinc-50 p-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">{diagram.sourceText}</p>
      </Modal>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
        onConfirm={() => blocker.state === 'blocked' && blocker.proceed()}
        title="Discard unsaved changes?"
        description="You have edits that haven't been saved. Leaving now will lose them."
        confirmLabel="Discard and leave"
      />
    </div>
  );
}
