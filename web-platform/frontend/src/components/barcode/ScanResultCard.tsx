import { useState } from 'react';
import { Check, X, Edit2, AlertTriangle, Package, Scale } from 'lucide-react';
import { Badge } from '../ui';
import type { ScanLogItem } from '../../types';

interface ScanResultCardProps {
  scan: ScanLogItem;
  onConfirm?: () => void;
  onReject?: (reason: string) => void;
  onEditQuantity?: (newQuantity: number) => void;
  disabled?: boolean;
}

export default function ScanResultCard({
  scan,
  onConfirm,
  onReject,
  onEditQuantity,
  disabled = false,
}: ScanResultCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuantity, setEditQuantity] = useState(scan.final_quantity_kg.toString());
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const handleSaveQuantity = () => {
    const qty = parseFloat(editQuantity);
    if (!isNaN(qty) && qty > 0) {
      onEditQuantity?.(qty);
      setIsEditing(false);
    }
  };

  const handleReject = () => {
    if (showRejectInput) {
      onReject?.(rejectReason || 'Rejected by user');
      setShowRejectInput(false);
      setRejectReason('');
    } else {
      setShowRejectInput(true);
    }
  };

  const getStatusVariant = () => {
    switch (scan.status) {
      case 'confirmed':
        return 'success';
      case 'rejected':
        return 'error';
      case 'duplicate':
        return 'warning';
      default:
        return 'default';
    }
  };

  const isUnknown = !scan.item_id;

  return (
    <div
      className={`border rounded-lg p-3 ${
        scan.status === 'rejected'
          ? 'bg-red-50 border-red-200'
          : scan.status === 'confirmed'
          ? 'bg-green-50 border-green-200'
          : isUnknown
          ? 'bg-amber-50 border-amber-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isUnknown
              ? 'bg-amber-100 text-amber-600'
              : scan.status === 'confirmed'
              ? 'bg-green-100 text-green-600'
              : scan.status === 'rejected'
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isUnknown ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Package className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900">
              {scan.item?.name || 'Unknown Item'}
            </span>
            {scan.variety_name && (
              <Badge variant="info" size="sm">
                {scan.variety_name}
              </Badge>
            )}
            <Badge variant={getStatusVariant()} size="sm">
              {scan.status === 'pending' ? 'Pending' : scan.status}
            </Badge>
          </div>

          {/* Barcode */}
          <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">
            {scan.raw_barcode}
          </div>

          {/* Quantity row */}
          <div className="flex items-center gap-2 mt-2">
            <Scale className="w-4 h-4 text-gray-400" />
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  autoFocus
                />
                <span className="text-sm text-gray-500">kg</span>
                <button
                  onClick={handleSaveQuantity}
                  className="p-1 text-green-600 hover:bg-green-100 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditQuantity(scan.final_quantity_kg.toString());
                  }}
                  className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-sm font-medium text-gray-700">
                {scan.final_quantity_kg.toFixed(1)} kg
                {scan.extracted_weight_kg && (
                  <span className="text-xs text-gray-400 ml-1">
                    (extracted)
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Rejection reason */}
          {scan.status === 'rejected' && scan.rejection_reason && (
            <p className="text-xs text-red-600 mt-1">
              Reason: {scan.rejection_reason}
            </p>
          )}

          {/* Reject input */}
          {showRejectInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Rejection reason (optional)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                autoFocus
              />
              <button
                onClick={handleReject}
                className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowRejectInput(false);
                  setRejectReason('');
                }}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        {scan.status === 'pending' && !disabled && !showRejectInput && (
          <div className="flex items-center gap-1">
            {!isEditing && onEditQuantity && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit quantity"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Confirm"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {onReject && (
              <button
                onClick={handleReject}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
