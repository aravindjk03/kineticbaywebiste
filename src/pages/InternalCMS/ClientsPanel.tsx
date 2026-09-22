import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Trash2, Upload } from 'lucide-react';
import { api } from '../../lib/api';

interface ClientLogo { id: string; name: string; logo: string; website: string; visible: boolean; order: number }

const field = 'w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary/60';

/** Shrink raster logos to ≤ 480 px wide WebP so the homepage stays fast; SVGs are kept as-is. */
async function toDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
  if (file.type === 'image/svg+xml') {
    if (raw.length > 400000) throw new Error('That SVG is too large (over about 300 KB).');
    return raw;
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('That file is not an image we can read.'));
    i.src = raw;
  });
  const scale = Math.min(1, 480 / img.width, 200 / img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/webp', 0.9);
  return out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/png');
}

export default function ClientsPanel({ notify }: { notify: (type: 'success' | 'error', message: string) => void }) {
  const [items, setItems] = useState<ClientLogo[]>([]);
  const [form, setForm] = useState({ name: '', website: '', logo: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { setItems((await api.getClients()).clients || []); } catch (e) { notify('error', (e as Error).message); }
  };
  useEffect(() => { load(); }, []);

  const pick = async (f?: File) => {
    if (!f) return;
    try {
      const logo = await toDataUrl(f);
      setForm((x) => ({ ...x, logo, name: x.name || f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }));
    } catch (e) {
      notify('error', (e as Error).message);
    }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); await load(); notify('success', ok); } catch (e) { notify('error', (e as Error).message); } finally { setBusy(false); }
  };

  const shownCount = items.filter((i) => i.visible).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-bold text-xl text-ink">Client logos</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Logos shown in the scrolling “Trusted by” strip on the homepage. {shownCount ? `${shownCount} logo${shownCount === 1 ? ' is' : 's are'} live.` : 'Until you add one, the homepage keeps the text strip.'} Only upload logos you have the client’s permission to show.
        </p>
      </div>

      {/* Add */}
      <div className="rounded-2xl border border-border/80 bg-surface/60 p-4 grid md:grid-cols-[180px_1fr] gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
          className="h-[120px] rounded-xl border border-dashed border-border hover:border-primary/60 bg-white/95 flex items-center justify-center overflow-hidden"
          aria-label="Choose a logo image"
        >
          {form.logo
            ? <img src={form.logo} alt="Logo preview" className="max-h-[80px] max-w-[150px] object-contain" />
            : <span className="flex flex-col items-center gap-1.5 text-[11px] text-neutral-500"><ImagePlus className="w-6 h-6" />Drop or choose a logo<br />PNG, JPG, WebP or SVG</span>}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">Client name (used as the alt text)</span><input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="space-y-1"><span className="text-[11px] text-text-secondary">Website (optional, makes the logo a link)</span><input className={field} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></label>
          </div>
          <div className="flex justify-end">
            <button
              disabled={busy || !form.logo || !form.name.trim()}
              onClick={() => act(async () => { await api.createClient({ ...form, visible: true }); setForm({ name: '', website: '', logo: '' }); }, 'Logo added to the homepage')}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-ink text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            ><Upload className="w-3.5 h-3.5" />Add logo</button>
          </div>
        </div>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-xs text-text-secondary text-center py-10 border border-dashed border-border rounded-2xl">No client logos yet.</div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((c, i) => (
            <li key={c.id} className={`rounded-2xl border border-border/80 bg-surface/60 p-3 space-y-3 ${c.visible ? '' : 'opacity-60'}`}>
              <div className="h-[90px] rounded-xl bg-white/95 flex items-center justify-center">
                <img src={c.logo} alt={c.name} className="max-h-[60px] max-w-[70%] object-contain" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink truncate">{c.name}</div>
                  <div className="text-[11px] text-text-secondary truncate">{c.visible ? 'Shown on homepage' : 'Hidden'}{c.website ? ` · ${c.website.replace(/^https?:\/\//, '')}` : ''}</div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button disabled={busy || i === 0} onClick={() => act(() => api.updateClient(c.id, { move: 'up' }), 'Moved')} title="Move earlier" className="p-1.5 rounded-lg text-text-secondary hover:text-ink disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button disabled={busy || i === items.length - 1} onClick={() => act(() => api.updateClient(c.id, { move: 'down' }), 'Moved')} title="Move later" className="p-1.5 rounded-lg text-text-secondary hover:text-ink disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button disabled={busy} onClick={() => act(() => api.updateClient(c.id, { visible: !c.visible }), c.visible ? 'Hidden from homepage' : 'Shown on homepage')} title={c.visible ? 'Hide' : 'Show'} className="p-1.5 rounded-lg text-text-secondary hover:text-ink">{c.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                  <button disabled={busy} onClick={() => confirm(`Remove ${c.name}?`) && act(() => api.deleteClient(c.id), 'Logo removed')} title="Remove" className="p-1.5 rounded-lg text-text-secondary hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
