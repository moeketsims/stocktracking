import { useState, useEffect } from 'react';
import { Edit3, History, AlertCircle } from 'lucide-react';
import { Modal, Button, Input, Select } from '../ui';
import { useEditBatch, useBatchDetails, useBatchEditHistory, useBatchStatuses } from '../../hooks/useData';
import type { BatchEditHistoryItem } from '../../types';

interface BatchEditForm {
  expiry_date?: string;
  status?: 'available' | 'quarantine' | 'hold';
  edit_reason: string;
}

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
}

export default function BatchEditModal({
  isOpen,
  onClose,
  onSuccess,
  batchId,
}: BatchEditModalProps) {
  const [form, setForm] = useState<BatchEditForm>({
    expiry_date: undefined,
    status: undefined,
    edit_reason: '',
  });
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const editMutation = useEditBatch();
  const { data: batch, isLoading: batchLoading } = useBatchDetails(batchId);
  const { data: history } = useBatchEditHistory(batchId);
  const { data: statuses } = useBatchStatuses();

  useEffect(() => {
    if (isOpen && batch) {
      setForm({
        expiry_date: batch.expiry_date || undefined,
        status: batch.status || undefined,
        edit_reason: '',
      });
      setError('');
      setShowHistory(false);
    }
  }, [isOpen, batch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.edit_reason?.trim()) {
      setError('Please provide a reason for this edit');
      return;
    }

    try {
      await editMutation.mutateAsync({ batchId, data: form });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update batch');
    }
  };

  const statusOptions = (statuses || [])
    .filter((s: any) => s.value !== 'depleted') // Don't allow manually setting to depleted
    .map((status: any) => ({
      value: status.value,
      label: status.label,
    }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'quarantine':
        return 'bg-amber-100 text-amber-800';
      case 'hold':
        return 'bg-gray-100 text-gray-800';
      case 'depleted':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (batchLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Batch" size="md">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Batch" size="lg">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Batch Info Header */}
        {batch && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{batch.batch_id_display || batch.id.slice(0, 8)}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status || 'available')}`}>
                {batch.status || 'available'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Item:</span>{' '}
                <span className="font-medium">{batch.items?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-500">Supplier:</span>{' '}
                <span className="font-medium">{batch.suppliers?.name || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-gray-500">Remaining:</span>{' '}
                <span className="font-medium">{batch.remaining_qty?.toFixed(2)} kg</span>
              </div>
              <div>
                <span className="text-gray-500">Edits:</span>{' '}
                <span className="font-medium">{batch.edit_count || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Toggle between Edit Form and History */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              !showHistory
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-1" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              showHistory
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4 inline mr-1" />
            History ({(history as BatchEditHistoryItem[] | undefined)?.length || 0})
          </button>
        </div>

        {showHistory ? (
          /* Edit History View */
          <div className="max-h-80 overflow-y-auto">
            {(history as BatchEditHistoryItem[] | undefined)?.length ? (
              <div className="space-y-3">
                {(history as BatchEditHistoryItem[]).map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        Changed: {item.field_changed}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.edited_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <div>
                        <span className="text-gray-400">From:</span>{' '}
                        {item.old_value || '(empty)'}
                      </div>
                      <div>
                        <span className="text-gray-400">To:</span>{' '}
                        {item.new_value || '(empty)'}
                      </div>
                    </div>
                    <div className="mt-1 text-gray-500">
                      <span className="text-gray-400">By:</span> {item.editor_name}
                      {item.edit_reason && (
                        <span className="ml-2">
                          <span className="text-gray-400">Reason:</span> {item.edit_reason}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No edit history yet</p>
            )}
          </div>
        ) : (
          /* Edit Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="date"
              label="Expiry Date"
              value={form.expiry_date || ''}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value || undefined })}
            />

            <Select
              label="Status"
              options={[{ value: '', label: 'No change' }, ...statusOptions]}
              value={form.status || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: (e.target.value as 'available' | 'quarantine' | 'hold') || undefined,
                })
              }
            />

            {form.status === 'quarantine' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Setting status to "Quarantine" will prevent this batch from being issued until
                it is reviewed and changed back to "Available".
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Edit *
              </label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={2}
                value={form.edit_reason || ''}
                onChange={(e) => setForm({ ...form, edit_reason: e.target.value })}
                placeholder="Explain why you are making this change..."
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" isLoading={editMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
