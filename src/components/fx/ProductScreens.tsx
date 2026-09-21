/**
 * Lightweight coded UI mock-ups for each product, rendered inside the 3D device.
 * Swap for real screenshots once supplied (blueprint section 6 note).
 */

const bar = 'rounded-full bg-primary';

function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-[#0c0d0f] text-[9px] sm:text-[10px] text-ink flex">
      <aside className="w-[18%] border-r border-white/5 p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 mb-2">
          <span className="w-3 h-3 rounded bg-primary" />
          <span className="font-semibold text-[8px] sm:text-[9px] truncate">Kinetic</span>
        </div>
        {[70, 55, 62, 48, 58].map((w, i) => (
          <span key={i} className={`h-1.5 rounded ${i === 0 ? 'bg-primary/70' : 'bg-white/10'}`} style={{ width: `${w}%` }} />
        ))}
      </aside>
      <div className="flex-1 p-2.5 sm:p-3 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold text-[10px] sm:text-[12px]">{title}</span>
          <span className="w-10 h-2 rounded bg-white/10" />
        </div>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/[0.04] border border-white/5 p-1.5 sm:p-2">
      <p className="text-text-secondary text-[7px] sm:text-[8px] uppercase tracking-wider">{label}</p>
      <p className="font-heading font-bold text-[11px] sm:text-[14px]">{value}</p>
    </div>
  );
}

export function HrmsScreen() {
  return (
    <Chrome title="People overview">
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Headcount" value="1,248" /><Stat label="Attrition" value="3.1%" /><Stat label="Payroll" value="Ready" />
      </div>
      <div className="flex-1 rounded-md bg-white/[0.03] border border-white/5 p-2 flex items-end gap-1">
        {[40, 55, 48, 62, 70, 66, 78, 74, 85, 80, 92, 88].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary-dark to-primary" style={{ height: `${h}%`, opacity: 0.45 + i * 0.045 }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {['PF · ESI · TDS', 'Leave requests · 12'].map((t) => (
          <div key={t} className="rounded-md bg-white/[0.04] px-2 py-1.5 text-text-secondary text-[8px]">{t}</div>
        ))}
      </div>
    </Chrome>
  );
}

export function VmsScreen() {
  return (
    <Chrome title="Front desk · Gate 2">
      <div className="flex gap-2 flex-1 min-h-0">
        <div className="w-[38%] rounded-md bg-white/[0.04] border border-white/5 p-2 flex flex-col items-center justify-center gap-1.5">
          <div className="grid grid-cols-5 gap-[2px] w-12 h-12 sm:w-16 sm:h-16 p-1 bg-ink rounded">
            {Array.from({ length: 25 }, (_, i) => (
              <span key={i} className={(i * 7) % 3 === 0 || [0, 4, 20].includes(i) ? 'bg-bg' : 'bg-ink'} />
            ))}
          </div>
          <span className="text-[8px] text-primary font-semibold">QR invite verified</span>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {['Priya S. · Host notified', 'Rahul K. · Badge printed', 'Vendor · ID check', 'Anita M. · Checked out'].map((v, i) => (
            <div key={v} className="flex items-center gap-1.5 rounded bg-white/[0.04] px-1.5 py-1">
              <span className={`w-3.5 h-3.5 rounded-full ${i === 2 ? 'bg-accent' : 'bg-primary/70'}`} />
              <span className="truncate text-text-secondary text-[8px] sm:text-[9px]">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="On site" value="86" /><Stat label="Expected" value="24" /><Stat label="Alerts" value="0" />
      </div>
    </Chrome>
  );
}

export function PmsScreen() {
  const rows = [[4, 30], [20, 34], [30, 40], [48, 28], [60, 32], [12, 50]];
  return (
    <Chrome title="Delivery roadmap">
      <div className="flex-1 rounded-md bg-white/[0.03] border border-white/5 p-2 flex flex-col justify-between">
        {rows.map(([l, w], i) => (
          <div key={i} className="relative h-2.5 sm:h-3">
            <span className="absolute inset-y-0 left-0 right-0 border-b border-dashed border-white/5" />
            <span className={`absolute inset-y-0 ${bar}`} style={{ left: `${l}%`, width: `${w}%`, opacity: 1 - i * 0.1 }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="On track" value="18" /><Stat label="Budget" value="92%" /><Stat label="Hours" value="1,420" />
      </div>
    </Chrome>
  );
}

export function CrmScreen() {
  const cols = [['New', 5], ['Qualified', 4], ['Proposal', 3], ['Won', 2]] as const;
  return (
    <Chrome title="Sales pipeline">
      <div className="grid grid-cols-4 gap-1.5 flex-1 min-h-0">
        {cols.map(([name, n], ci) => (
          <div key={name} className="rounded-md bg-white/[0.03] border border-white/5 p-1.5 flex flex-col gap-1">
            <span className="text-[7px] sm:text-[8px] uppercase tracking-wider text-text-secondary">{name}</span>
            {Array.from({ length: n }, (_, i) => (
              <span key={i} className={`h-3 sm:h-4 rounded ${ci === 3 ? 'bg-primary/80' : 'bg-white/[0.07]'}`} />
            ))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Forecast" value="₹48L" /><Stat label="Follow-ups" value="Auto" /><Stat label="WhatsApp" value="Live" />
      </div>
    </Chrome>
  );
}

export function AttendanceScreen() {
  return (
    <Chrome title="Today · All branches">
      <div className="flex gap-2 flex-1 min-h-0">
        <div className="w-[40%] rounded-md bg-white/[0.04] border border-white/5 flex items-center justify-center relative overflow-hidden">
          <span className="absolute w-14 h-14 sm:w-20 sm:h-20 rounded-full border-2 border-primary/70 animate-ping-slow" />
          <span className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-primary flex items-center justify-center">
            <span className="w-4 h-5 sm:w-5 sm:h-6 rounded-t-full rounded-b-lg bg-primary/40" />
          </span>
          <span className="absolute left-0 right-0 h-px bg-primary shadow-[0_0_8px_#F08A4B] scan-line" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {['09:01 · Face · Chennai HQ', '09:03 · RFID · Plant 1', '09:05 · GPS · Field', '09:12 · Late · Shift B'].map((r, i) => (
            <div key={r} className="rounded bg-white/[0.04] px-1.5 py-1 text-[8px] sm:text-[9px] text-text-secondary flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${i === 3 ? 'bg-accent' : 'bg-primary'}`} />{r}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="Present" value="96.4%" /><Stat label="Overtime" value="42h" /><Stat label="Synced" value="Payroll" />
      </div>
    </Chrome>
  );
}

export const screens: Record<string, () => JSX.Element> = {
  hrms: HrmsScreen,
  vms: VmsScreen,
  pms: PmsScreen,
  crm: CrmScreen,
  attendance: AttendanceScreen,
};
