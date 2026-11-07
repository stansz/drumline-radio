import { parseShareHash } from './share';
import type { ShareLink } from './share';

/** A share hash as a full URL the browser can open. */
export function linkUrl(hash: string): string {
  return location.origin + location.pathname + hash;
}

export async function sendLink(
  url: string,
  title: string,
  button: HTMLButtonElement,
): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // Sharing was cancelled, or the browser could not open the sheet.
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    const old = button.textContent;
    button.textContent = 'Link copied';
    window.setTimeout(() => {
      button.textContent = old;
    }, 2000);
  } catch {
    window.prompt('Copy this link', url);
  }
}

/** Reads a share link from the address bar and clears the hash, leaving the app tuned. */
export function takeHash(ids: string[]): ShareLink | null {
  const link = parseShareHash(location.hash, ids);
  if (location.hash !== '') {
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      // Without history the link still tunes the app; the hash just stays put.
    }
  }
  return link;
}
