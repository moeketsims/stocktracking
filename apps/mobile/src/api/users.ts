import { api } from './client';

export interface UserListItem {
  id: string;
  user_id: string;
  email: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  zone_id: string | null;
  location_id: string | null;
  zone_name: string | null;
  location_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UsersResponse {
  users: UserListItem[];
  total: number;
}

export interface UserDetailResponse extends UserListItem {}

export interface UpdateUserPayload {
  role?: string;
  zone_id?: string | null;
  location_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

export interface UpdateUserResponse {
  success: boolean;
  message: string;
  user: UserListItem | null;
}

export interface ToggleActiveResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface ListUsersParams {
  role?: string;
  zone_id?: string;
  is_active?: boolean;
  search?: string;
}

export const usersApi = {
  list: (params?: ListUsersParams) =>
    api.get<UsersResponse>('/api/users', { params }),

  get: (id: string) =>
    api.get<UserDetailResponse>(`/api/users/${id}`),

  update: (id: string, data: UpdateUserPayload) =>
    api.patch<UpdateUserResponse>(`/api/users/${id}`, data),

  deactivate: (id: string) =>
    api.post<ToggleActiveResponse>(`/api/users/${id}/deactivate`),

  activate: (id: string) =>
    api.post<ToggleActiveResponse>(`/api/users/${id}/activate`),

  resetPassword: (id: string) =>
    api.post<ResetPasswordResponse>(`/api/users/${id}/reset-password`),
};
