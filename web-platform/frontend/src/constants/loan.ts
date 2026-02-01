// Status configuration for loan badges
export const LOAN_STATUS_CONFIG: Record<string, { label: string; bgColor: string; color: string; borderColor: string }> = {
  pending: { label: 'Pending', bgColor: 'bg-amber-50', color: 'text-amber-700', borderColor: 'border-amber-200' },
  accepted: { label: 'Accepted', bgColor: 'bg-blue-50', color: 'text-blue-700', borderColor: 'border-blue-200' },
  rejected: { label: 'Rejected', bgColor: 'bg-red-50', color: 'text-red-700', borderColor: 'border-red-200' },
  confirmed: { label: 'Confirmed', bgColor: 'bg-purple-50', color: 'text-purple-700', borderColor: 'border-purple-200' },
  pickup_pending: { label: 'Pending', bgColor: 'bg-orange-50', color: 'text-orange-700', borderColor: 'border-orange-200' },
  in_transit: { label: 'In Transit', bgColor: 'bg-indigo-50', color: 'text-indigo-700', borderColor: 'border-indigo-200' },
  collected: { label: 'Collected', bgColor: 'bg-teal-50', color: 'text-teal-700', borderColor: 'border-teal-200' },
  active: { label: 'Received', bgColor: 'bg-emerald-50', color: 'text-emerald-700', borderColor: 'border-emerald-200' },
  // Return statuses
  return_initiated: { label: 'Return Started', bgColor: 'bg-orange-50', color: 'text-orange-700', borderColor: 'border-orange-200' },
  return_assigned: { label: 'Returning', bgColor: 'bg-orange-50', color: 'text-orange-700', borderColor: 'border-orange-200' },
  return_in_progress: { label: 'Return In Progress', bgColor: 'bg-cyan-50', color: 'text-cyan-700', borderColor: 'border-cyan-200' },
  return_in_transit: { label: 'Return In Transit', bgColor: 'bg-cyan-50', color: 'text-cyan-700', borderColor: 'border-cyan-200' },
  completed: { label: 'Completed', bgColor: 'bg-gray-50', color: 'text-gray-600', borderColor: 'border-gray-200' },
  overdue: { label: 'Overdue', bgColor: 'bg-red-100', color: 'text-red-800', borderColor: 'border-red-300' },
};
