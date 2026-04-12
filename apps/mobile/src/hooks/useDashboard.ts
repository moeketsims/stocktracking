import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';
import { STALE_TIME } from '../constants/config';

export function useDashboard(locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', locationId],
    queryFn: () => dashboardApi.get(locationId).then((r) => r.data),
    staleTime: STALE_TIME,
  });
}
