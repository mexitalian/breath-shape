import { nativePlugin } from './native.js';
import { readHistory, historyCsv } from './history.js';

// Export history (Settings → Your data). In the app the CSV is written to the cache
// and handed to the share sheet (save to Files, email it, send it to a spreadsheet).
// On the website it goes to the share sheet where files can be shared, else downloads.
// Returns a short message for the user.
export async function exportHistory() {
  const list = readHistory();
  if (!list.length) return 'Nothing to export yet.';
  const csv = historyCsv(list);
  const d = new Date();
  const name = `breathing-history-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.csv`;
  const title = 'Breathing history';

  const fs = nativePlugin('Filesystem');
  const share = nativePlugin('Share');
  if (fs && share) {
    const { uri } = await fs.writeFile({ path: name, data: csv, directory: 'CACHE', encoding: 'utf8' });
    try {
      await share.share({ title, url: uri, dialogTitle: title });
    } catch (err) {
      // Closing the share sheet without picking anything isn't an error for the user.
      if (/cancel/i.test(err?.message ?? '')) return '';
      throw err;
    }
    return '';
  }

  const file = new File([csv], name, { type: 'text/csv' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return '';
    } catch (err) {
      if (err?.name === 'AbortError') return '';
      // Some browsers refuse the share after allowing it; fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `Saved ${name}`;
}
