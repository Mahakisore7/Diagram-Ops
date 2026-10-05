import { useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Lock } from 'lucide-react';
import { diagramsApi, shareUrl } from '../../api';
import { useToast } from '../../context/ToastContext';
import { copyToClipboard } from '../../lib/exporters';
import { Modal } from '../ui/Modal';
import Button from '../ui/Button';
import { Switch } from '../ui/primitives';

export default function ShareDialog({ open, onClose, diagram, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const token = diagram?.shareToken;
  const url = token ? shareUrl(token) : '';

  async function setShared(next) {
    setBusy(true);
    try {
      if (next) {
        const newToken = await diagramsApi.share(diagram._id);
        onChange({ ...diagram, shareToken: newToken });
        toast.success('Link sharing enabled');
      } else {
        await diagramsApi.unshare(diagram._id);
        onChange({ ...diagram, shareToken: undefined });
        toast.success('Link revoked', 'The previous link no longer works.');
      }
    } catch (err) {
      toast.error('Could not update sharing', err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal open={open} onClose={onClose} title="Share diagram" description="Publish a read-only link anyone can view without signing in.">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${token ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
            {token ? <Globe className="size-4" /> : <Lock className="size-4" />}
          </span>
          <div className="flex-1">
            <Switch
              checked={Boolean(token)}
              disabled={busy}
              onChange={setShared}
              label={token ? 'Anyone with the link can view' : 'Private — only you'}
              description={token ? 'Viewers see the diagram only, never your prompt or account.' : 'Turn on to create a link.'}
            />
          </div>
        </div>

        {token && (
          <div>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="h-9 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                aria-label="Share link"
              />
              <Button variant="secondary" onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
              Open public view <ExternalLink className="size-3" />
            </a>
            <p className="mt-3 text-xs text-zinc-500">
              Revoking and re-enabling creates a brand-new link; the old one stops working immediately.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
