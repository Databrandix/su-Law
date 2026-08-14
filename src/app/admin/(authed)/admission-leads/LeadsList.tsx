'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Phone, GraduationCap, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminListItems } from '@/lib/hooks/useAdminListItems';
import { useConfirm } from '@/components/admin/ConfirmDialogProvider';
import {
  deleteAdmissionLeadAction,
  updateAdmissionLeadStatusAction,
} from '@/lib/admin-actions/admission-leads';

type LeadRow = {
  id: string;
  fullName: string;
  mobile: string;
  programme: string;
  status: string;
  // ISO string — the Server Component serializes Date at the boundary.
  createdAt: string;
};

const STATUSES = ['new', 'contacted', 'enrolled', 'dropped'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  enrolled:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  dropped:   'bg-gray-100 text-gray-600 border-gray-300',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export default function LeadsList({ items: initialItems }: { items: LeadRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { items, removeById } = useAdminListItems(initialItems);
  const [statusFilter, setStatusFilter] = useState<'' | Status>('');
  // Local echo so a status click repaints the badge immediately rather
  // than waiting on router.refresh().
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  const statusOf = (row: LeadRow) => statusOverrides[row.id] ?? row.status;

  async function handleStatus(id: string, next: Status) {
    const res = await updateAdmissionLeadStatusAction(id, next);
    if (res.ok) {
      setStatusOverrides((prev) => ({ ...prev, [id]: next }));
      toast.success(`Marked as ${next}`);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: 'Delete lead?',
      message: `"${name}"'s enquiry will be removed permanently. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await deleteAdmissionLeadAction(id);
    if (res.ok) {
      removeById(id);
      toast.success('Lead removed');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
        <Inbox size={24} className="mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-500">No leads yet.</p>
      </div>
    );
  }

  // Counts come from the overridden status so the chips agree with the
  // badges after a status change.
  const visible = statusFilter
    ? items.filter((r) => statusOf(r) === statusFilter)
    : items;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterChip label="All" active={statusFilter === ''} count={items.length}
                    onClick={() => setStatusFilter('')} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={statusFilter === s}
            count={items.filter((r) => statusOf(r) === s).length}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center">
          <p className="text-sm text-gray-500">No {statusFilter} leads.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => {
            const status = statusOf(row);
            return (
              <li key={row.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{row.fullName}</span>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_STYLES[status] ?? STATUS_STYLES.new
                        }`}
                      >
                        {status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(row.createdAt)}
                      </span>
                    </div>
                    <div className="grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
                      <a
                        href={`tel:${row.mobile}`}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-accent"
                      >
                        <Phone size={12} className="shrink-0 text-accent" />
                        <span className="font-mono">{row.mobile}</span>
                      </a>
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap size={12} className="shrink-0 text-accent" />
                        <span className="truncate">{row.programme}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(row.id, row.fullName)}
                    aria-label={`Delete ${row.fullName}`}
                    className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
                  <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Mark as
                  </span>
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatus(row.id, s)}
                      disabled={status === s}
                      className="rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterChip({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={active ? 'text-white/70' : 'text-gray-400'}>{count}</span>
    </button>
  );
}
