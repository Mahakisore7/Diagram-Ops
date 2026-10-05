import { Modal } from '../ui/Modal';
import { Kbd } from '../ui/primitives';
import { modKey } from '../../lib/utils';

const GROUPS = [
  {
    title: 'General',
    items: [
      [[modKey, 'K'], 'Open command palette'],
      [['?'], 'Show keyboard shortcuts'],
      [['G', 'N'], 'New diagram'],
    ],
  },
  {
    title: 'Studio',
    items: [[[modKey, 'Enter'], 'Generate diagram']],
  },
  {
    title: 'Editor',
    items: [
      [[modKey, 'S'], 'Save changes'],
      [[modKey, 'Scroll'], 'Zoom canvas'],
      [['Double-click'], 'Reset zoom'],
    ],
  },
];

export default function ShortcutsDialog({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" size="md">
      <div className="space-y-6">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">{group.title}</h3>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {group.items.map(([keys, label]) => (
                <li key={label} className="flex items-center justify-between py-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {label}
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
