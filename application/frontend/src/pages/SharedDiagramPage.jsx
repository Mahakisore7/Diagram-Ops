import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Link2Off, Sparkles } from 'lucide-react';
import { diagramsApi } from '../api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Logo from '../components/brand/Logo';
import Button from '../components/ui/Button';
import { Skeleton } from '../components/ui/primitives';
import DiagramCanvas from '../components/diagram/DiagramCanvas';
import TypeBadge from '../components/diagram/TypeBadge';
import { downloadSvg } from '../lib/exporters';
import { formatDate, slugify } from '../lib/utils';

// Public, read-only view for a share link. Needs no account and receives
// only render fields from the API - never the owner or the original prompt.
export default function SharedDiagramPage() {
  const { token } = useParams();
  const [diagram, setDiagram] = useState(null);
  const [failed, setFailed] = useState(false);
  const [svg, setSvg] = useState('');
  useDocumentTitle(diagram?.title || 'Shared diagram');

  useEffect(() => {
    diagramsApi
      .publicView(token)
      .then(setDiagram)
      .catch(() => setFailed(true));
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <Logo />
        <Button to="/register" size="sm" variant="secondary">
          <Sparkles /> Make your own
        </Button>
      </header>

      {failed ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
            <Link2Off className="size-6" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">This link isn&apos;t available</h1>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">The owner may have revoked it, or the URL is incomplete.</p>
        </div>
      ) : !diagram ? (
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="h-[70vh] rounded-2xl" />
        </div>
      ) : (
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{diagram.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <TypeBadge type={diagram.diagramType} /> Updated {formatDate(diagram.updatedAt)} · Read-only
              </div>
            </div>
            <Button variant="secondary" size="sm" disabled={!svg} onClick={() => downloadSvg(svg, `${slugify(diagram.title)}.svg`)}>
              <Download /> Download SVG
            </Button>
          </div>
          <div className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <DiagramCanvas syntax={diagram.mermaidSyntax} onRendered={setSvg} className="flex-1" />
          </div>
        </main>
      )}
    </div>
  );
}
