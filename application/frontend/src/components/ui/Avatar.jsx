import { userAvatar } from '../../lib/avatars';
import { cn } from '../../lib/utils';

// Generated illustrated avatar (see lib/avatars.js). Kept out of
// primitives.jsx on purpose: the avatar renderer is only bundled into the
// signed-in chunks that import this file, never into the landing page.
export default function Avatar({ user, size = 'md', className, src }) {
  const sizes = { sm: 'size-8', md: 'size-9', lg: 'size-20', xl: 'size-24' };
  return (
    <img
      src={src || userAvatar(user)}
      alt=""
      className={cn('shrink-0 rounded-full border border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800', sizes[size], className)}
      draggable={false}
    />
  );
}
