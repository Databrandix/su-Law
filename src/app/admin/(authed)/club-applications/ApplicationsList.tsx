'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Mail,
  Phone,
  IdCard,
  Hash,
  Check,
  X as XIcon,
  Clock,
  ChevronDown,
  ChevronUp,
  Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminListItems } from '@/lib/hooks/useAdminListItems';
import { useConfirm } from '@/components/admin/ConfirmDialogProvider';
import {
  deleteClubApplicationAction,
  updateClubApplicationStatusAction,
} from '@/lib/admin-actions/club-applications';

type ApplicationRow = {
  id:          string;
  fullName:    string;
  studentId:   string;
  email:       string;
  phone:       string;
  semester:    string;
  motivation:  string;
  status:      string;
  // Null on rows submitted before applications recorded a club.
  clubName:    string | null;
  submittedAt: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function ApplicationsList({ items: initialItems }: { items: ApplicationRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { items, removeById } = useAdminListItems(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // '' = every club. Built from the rows themselves rather than the
  // Club table so a society that has been renamed or removed still has
  // a filter entry for the applications it already received.
  const [clubFilter, setClubFilter] = useState('');
  // Track per-row local status so the badge updates immediately when
  // the admin clicks Approve/Reject without waiting for a router.refresh.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});

  function statusOf(row: ApplicationRow) {
    return statusOverrides[row.id] ?? row.status;
  }

  async function handleStatus(id: string, next: 'pending' | 'approved' | 'rejected') {
    const res = await updateClubApplicationStatusAction(id, next);
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
      title: 'Delete application?',
      message: `"${name}"'s submission will be removed permanently. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await deleteClubApplicationAction(id);
    if (res.ok) {
      removeById(id);
      toast.success('Application removed');
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
        <Clock size={24} className="text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No applications yet.</p>
      </div>
    );
  }

  const clubNames = [...new Set(items.map((r) => r.clubName).filter(Boolean))].sort() as string[];
  const visible = clubFilter ? items.filter((r) => r.clubName === clubFilter) : items;

  return (
    <>
      {clubNames.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <FilterChip label="All clubs" active={clubFilter === ''} onClick={() => setClubFilter('')}
                      count={items.length} />
          {clubNames.map((name) => (
            <FilterChip key={name} label={name} active={clubFilter === name}
                        onClick={() => setClubFilter(name)}
                        count={items.filter((r) => r.clubName === name).length} />
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">No applications for {clubFilter}.</p>
        </div>
      ) : (
    <ul className="space-y-2">
      {visible.map((row) => {
        const status = statusOf(row);
        const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
        const expanded = expandedId === row.id;
        return (
          <li
            key={row.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-semibold text-gray-900">{row.fullName}</span>
                  {row.clubName && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold border border-accent/30 bg-accent/10 text-accent rounded px-2 py-0.5">
                      <Users2 size={11} />
                      {row.clubName}
                    </span>
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold border rounded px-2 py-0.5 ${style.cls}`}
                  >
                    {style.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(row.submittedAt)}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <IdCard size={12} className="text-accent shrink-0" />
                    <span className="font-mono">{row.studentId}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Hash size={12} className="text-accent shrink-0" />
                    Semester {row.semester}
                  </span>
                  <a
                    href={`mailto:${row.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
                  >
                    <Mail size={12} className="text-accent shrink-0" />
                    <span className="truncate">{row.email}</span>
                  </a>
                  <a
                    href={`tel:${row.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
                  >
                    <Phone size={12} className="text-accent shrink-0" />
                    {row.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStatus(row.id, 'approved')}
                  disabled={status === 'approved'}
                  aria-label="Approve"
                  className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleStatus(row.id, 'rejected')}
                  disabled={status === 'rejected'}
                  aria-label="Reject"
                  className="p-2 rounded-lg text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <XIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  aria-label={expanded ? 'Collapse' : 'Show motivation'}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row.id, row.fullName)}
                  aria-label={`Delete ${row.fullName}`}
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {expanded && (
              <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Why they want to join
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                  {row.motivation}
                </p>
              </div>
            )}
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
      className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/40 ${
        active
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={active ? 'text-white/70' : 'text-gray-400'}>{count}</span>
    </button>
  );
}
