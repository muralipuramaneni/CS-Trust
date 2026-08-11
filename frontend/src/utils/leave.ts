import type { LeaveRequest } from '../types/domain';

/** Annual leave allotment (demo policy) by type */
export const LEAVE_ALLOTMENT: Record<string, number> = {
  Casual: 12,
  Sick: 10,
  Earned: 15,
};

export const LEAVE_TYPES = Object.keys(LEAVE_ALLOTMENT);

export function leaveDayCount(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

export function leaveStatusTone(
  status: LeaveRequest['status'],
): 'success' | 'danger' | 'warning' {
  if (status === 'Approved') return 'success';
  if (status === 'Rejected') return 'danger';
  return 'warning';
}

export function computeLeaveStats(leaves: LeaveRequest[]) {
  const total = LEAVE_TYPES.reduce((sum, type) => sum + (LEAVE_ALLOTMENT[type] ?? 0), 0);
  const used = leaves
    .filter((l) => l.status === 'Approved')
    .reduce((sum, l) => sum + leaveDayCount(l.fromDate, l.toDate), 0);
  const pendingDays = leaves
    .filter((l) => l.status === 'Pending')
    .reduce((sum, l) => sum + leaveDayCount(l.fromDate, l.toDate), 0);
  const balance = Math.max(0, total - used - pendingDays);

  const byType = LEAVE_TYPES.map((type) => {
    const allotted = LEAVE_ALLOTMENT[type] ?? 0;
    const typeUsed = leaves
      .filter((l) => l.type === type && l.status === 'Approved')
      .reduce((sum, l) => sum + leaveDayCount(l.fromDate, l.toDate), 0);
    const typePending = leaves
      .filter((l) => l.type === type && l.status === 'Pending')
      .reduce((sum, l) => sum + leaveDayCount(l.fromDate, l.toDate), 0);
    return {
      type,
      allotted,
      used: typeUsed,
      pending: typePending,
      remaining: Math.max(0, allotted - typeUsed - typePending),
    };
  });

  return {
    total,
    used,
    balance,
    pendingDays,
    pendingCount: leaves.filter((l) => l.status === 'Pending').length,
    byType,
  };
}
