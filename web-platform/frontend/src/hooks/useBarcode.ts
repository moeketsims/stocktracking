import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { barcodeApi } from '../lib/api';
import type {
  BarcodeLookupResult,
  ScanSession,
  BarcodeMapping,
  CreateScanSessionForm,
  RecordScanForm,
  BulkReceiveForm,
  CreateBarcodeMappingForm,
  ScanLogItem,
} from '../types';

// Barcode lookup hook
export function useBarcodeLookup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ barcode, supplierId }: { barcode: string; supplierId?: string }) => {
      const response = await barcodeApi.lookup(barcode, supplierId);
      return response.data as BarcodeLookupResult;
    },
  });
}

// Scan session hooks
export function useCreateScanSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScanSessionForm) => {
      const response = await barcodeApi.createSession(data);
      return response.data as ScanSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanSessions'] });
    },
  });
}

export function useScanSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['scanSession', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await barcodeApi.getSession(sessionId);
      return response.data as ScanSession;
    },
    enabled: !!sessionId,
    refetchInterval: 5000, // Refresh every 5 seconds during active session
  });
}

export function useRecordScan(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordScanForm) => {
      const response = await barcodeApi.recordScan(sessionId, data);
      return response.data as ScanLogItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanSession', sessionId] });
    },
  });
}

export function useUpdateScanStatus(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scanId, status, reason }: { scanId: string; status: string; reason?: string }) => {
      const response = await barcodeApi.updateScanStatus(sessionId, scanId, status, reason);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanSession', sessionId] });
    },
  });
}

export function useBulkReceive(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkReceiveForm) => {
      const response = await barcodeApi.bulkReceive(sessionId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanSession', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelSession(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await barcodeApi.cancelSession(sessionId);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanSession', sessionId] });
    },
  });
}

// Barcode mappings hooks
export function useBarcodeMappings(supplierId?: string, activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['barcodeMappings', supplierId, activeOnly],
    queryFn: async () => {
      const response = await barcodeApi.getMappings(supplierId, activeOnly);
      return response.data as { mappings: BarcodeMapping[] };
    },
  });
}

export function useCreateBarcodeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBarcodeMappingForm) => {
      const response = await barcodeApi.createMapping(data);
      return response.data as BarcodeMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodeMappings'] });
    },
  });
}

export function useUpdateBarcodeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mappingId, data }: { mappingId: string; data: Partial<CreateBarcodeMappingForm> }) => {
      const response = await barcodeApi.updateMapping(mappingId, data);
      return response.data as BarcodeMapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodeMappings'] });
    },
  });
}

export function useDeleteBarcodeMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      await barcodeApi.deleteMapping(mappingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barcodeMappings'] });
    },
  });
}
