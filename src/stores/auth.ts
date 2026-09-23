import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Role } from '../types';
import { erpService } from '../api/erpService';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('nyver_access_token'));
  const refreshTokenValue = ref<string | null>(localStorage.getItem('nyver_refresh_token'));
  const storedUser = localStorage.getItem('nyver_auth_user');
  const user = ref<User | null>(storedUser ? JSON.parse(storedUser) : null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function parseJwt(tok: string | null): { role?: Role; exp?: number } | null {
    if (!tok) return null;
    try {
      const base64Url = tok.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  function isTokenValid(tok: string | null): boolean {
    if (!tok) return false;
    const payload = parseJwt(tok);
    if (!payload) return false;
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return false;
    }
    return true;
  }

  function parseJwtRole(tok: string | null): Role | null {
    if (!isTokenValid(tok)) return null;
    const payload = parseJwt(tok);
    return (payload?.role as Role) || null;
  }

  // Clear expired or invalid tokens on store load
  if (accessToken.value && !isTokenValid(accessToken.value)) {
    accessToken.value = null;
    refreshTokenValue.value = null;
    user.value = null;
    localStorage.removeItem('nyver_access_token');
    localStorage.removeItem('nyver_refresh_token');
    localStorage.removeItem('nyver_auth_token');
    localStorage.removeItem('nyver_auth_user');
  }

  const role = computed<Role | null>(() => {
    if (!accessToken.value || !isTokenValid(accessToken.value)) return null;
    return user.value?.role || parseJwtRole(accessToken.value) || null;
  });

  const isAuthenticated = computed(() => {
    if (!accessToken.value || !isTokenValid(accessToken.value)) return false;
    return !!user.value || !!parseJwtRole(accessToken.value);
  });

  const isAdmin = computed(
    () => role.value === 'ADMIN' || role.value === 'SUPERADMIN'
  );
  const isTeacher = computed(() => role.value === 'TEACHER');
  const isStudent = computed(() => role.value === 'STUDENT');

  // Backward compatible token getter
  const token = computed(() => accessToken.value);

  function setAuthData(userData: User, newAccessToken: string, newRefreshToken: string) {
    user.value = userData;
    accessToken.value = newAccessToken;
    refreshTokenValue.value = newRefreshToken;
    localStorage.setItem('nyver_access_token', newAccessToken);
    localStorage.setItem('nyver_refresh_token', newRefreshToken);
    localStorage.setItem('nyver_auth_token', newAccessToken); // backward compat for interceptor
    localStorage.setItem('nyver_auth_user', JSON.stringify(userData));
  }

  async function login(loginInput: string, passwordInput: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const result = await erpService.login(loginInput, passwordInput);
      setAuthData(result.user, result.accessToken, result.refreshToken);
      return true;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const rawMsg = axiosErr.response?.data?.message;
        let msg = Array.isArray(rawMsg) ? rawMsg.join('; ') : (rawMsg || '');
        if (msg.includes('string') || msg.includes('phone') || msg.includes('must be')) {
          msg = "Login (telefon yoki email) va parolni to'g'ri kiriting";
        }
        error.value = msg || "Tizimga kirishda xatolik";
      } else if (err instanceof Error) {
        error.value = err.message;
      } else {
        error.value = "Tizimga kirishda xatolik";
      }
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function refreshAuth(): Promise<boolean> {
    if (!refreshTokenValue.value) return false;

    try {
      const result = await erpService.refreshToken(refreshTokenValue.value);
      setAuthData(result.user, result.accessToken, result.refreshToken);
      return true;
    } catch {
      logout();
      return false;
    }
  }

  async function refreshUserData() {
    if (user.value) {
      try {
        const fresh = await erpService.getProfile();
        user.value = fresh;
        localStorage.setItem('nyver_auth_user', JSON.stringify(fresh));
      } catch {
        // Profile fetch failed, ignore
      }
    }
  }

  // Impersonation state (Admin acting as another user)
  const impersonatorRaw = localStorage.getItem('nyver_impersonator');
  const impersonatingFrom = ref<User | null>(impersonatorRaw ? JSON.parse(impersonatorRaw) : null);
  const isImpersonating = computed(() => !!impersonatingFrom.value);

  function impersonateUser(targetUser: User) {
    if (!impersonatingFrom.value && user.value) {
      impersonatingFrom.value = { ...user.value };
      localStorage.setItem('nyver_impersonator', JSON.stringify(user.value));
    }
    user.value = targetUser;
    localStorage.setItem('nyver_auth_user', JSON.stringify(targetUser));
  }

  function stopImpersonating(): string {
    if (impersonatingFrom.value) {
      user.value = impersonatingFrom.value;
      localStorage.setItem('nyver_auth_user', JSON.stringify(impersonatingFrom.value));
      impersonatingFrom.value = null;
      localStorage.removeItem('nyver_impersonator');
    }
    return '/dashboard';
  }

  function logout() {
    user.value = null;
    accessToken.value = null;
    refreshTokenValue.value = null;
    impersonatingFrom.value = null;
    localStorage.removeItem('nyver_impersonator');
    localStorage.removeItem('nyver_access_token');
    localStorage.removeItem('nyver_refresh_token');
    localStorage.removeItem('nyver_auth_token');
    localStorage.removeItem('nyver_auth_user');
  }

  function updateUserProfile(updated: Partial<User>) {
    if (!user.value) return;
    user.value = { ...user.value, ...updated };
    localStorage.setItem('nyver_auth_user', JSON.stringify(user.value));
  }

  return {
    user,
    token,
    accessToken,
    loading,
    error,
    isAuthenticated,
    role,
    isAdmin,
    isTeacher,
    isStudent,
    impersonatingFrom,
    isImpersonating,
    impersonateUser,
    stopImpersonating,
    login,
    refreshAuth,
    refreshUserData,
    updateUserProfile,
    logout,
  };
});
