import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Zone = Database['public']['Tables']['zones']['Row'];
type ZoneInsert = Database['public']['Tables']['zones']['Insert'];
type Location = Database['public']['Tables']['locations']['Row'];
type LocationInsert = Database['public']['Tables']['locations']['Insert'];
type Item = Database['public']['Tables']['items']['Row'];
type ItemInsert = Database['public']['Tables']['items']['Insert'];
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type ReorderPolicy = Database['public']['Tables']['reorder_policies']['Row'];
type ReorderPolicyInsert = Database['public']['Tables']['reorder_policies']['Insert'];

// ============================================
// ZONES
// ============================================

export function useZones() {
  return useQuery({
    queryKey: ['admin', 'zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Zone[];
    },
  });
}

export function useCreateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (zone: ZoneInsert) => {
      const { data, error } = await supabase
        .from('zones')
        .insert(zone)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] });
    },
  });
}

export function useUpdateZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Zone> & { id: string }) => {
      const { data, error } = await supabase
        .from('zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] });
    },
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('zones').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zones'] });
    },
  });
}

// ============================================
// LOCATIONS
// ============================================

export function useAdminLocations() {
  return useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*, zone:zones(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (location: LocationInsert) => {
      const { data, error } = await supabase
        .from('locations')
        .insert(location)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Location> & { id: string }) => {
      const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

// ============================================
// ITEMS
// ============================================

export function useAdminItems() {
  return useQuery({
    queryKey: ['admin', 'items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Item[];
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: ItemInsert) => {
      const { data, error } = await supabase
        .from('items')
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Item> & { id: string }) => {
      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

// ============================================
// SUPPLIERS
// ============================================

export function useAdminSuppliers() {
  return useQuery({
    queryKey: ['admin', 'suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: SupplierInsert) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

// ============================================
// PROFILES (Users)
// ============================================

export function useAdminProfiles() {
  return useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, zone:zones(name), location:locations(name)')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    },
  });
}

// ============================================
// REORDER POLICIES
// ============================================

export function useAdminReorderPolicies() {
  return useQuery({
    queryKey: ['admin', 'reorder-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reorder_policies')
        .select('*, location:locations(name), item:items(name), supplier:suppliers(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReorderPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policy: ReorderPolicyInsert) => {
      const { data, error } = await supabase
        .from('reorder_policies')
        .insert(policy)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reorder-policies'] });
    },
  });
}

export function useUpdateReorderPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReorderPolicy> & { id: string }) => {
      const { data, error } = await supabase
        .from('reorder_policies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reorder-policies'] });
    },
  });
}

export function useDeleteReorderPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reorder_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reorder-policies'] });
    },
  });
}

// ============================================
// AUDIT LOGS
// ============================================

export function useAuditLogs(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data;
    },
  });
}
