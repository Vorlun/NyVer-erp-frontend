import type { RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import type { Role } from '../types';

export function setupRouteGuards(
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized
) {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth as boolean | undefined;
  const allowedRoles = to.meta.roles as Role[] | undefined;

  // 1. Agar foydalanuvchi tizimga kirmagan bo'lsa va sahifa auth talab qilsa -> Loginga yo'naltirish
  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 2. Agar foydalanuvchi tizimga kirgan bo'lsa va login sahifasiga bormoqchi bo'lsa -> Mos kabinetga yo'naltirish
  if (to.name === 'login' && authStore.isAuthenticated) {
    if (authStore.isAdmin) return { name: 'admin-dashboard' };
    if (authStore.isTeacher) return { name: 'teacher-dashboard' };
    if (authStore.isStudent) return { name: 'student-dashboard' };
    return { path: '/' };
  }

  // 3. Agar ruxsat berilmagan route bo'lsa (RBAC huquqi yetarli bo'lmasa) -> Loginga yoki Landingga yo'naltirish
  if (requiresAuth && allowedRoles && allowedRoles.length > 0) {
    const userRole = authStore.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      if (!authStore.isAuthenticated) {
        return { name: 'login', query: { redirect: to.fullPath } };
      }
      return { path: '/' };
    }
  }

  // 4. Agar 403 (forbidden) sahifasiga kirishga urinsa -> Landing yoki Loginga o'tish
  if (to.name === 'forbidden' || to.path === '/403') {
    return authStore.isAuthenticated ? { path: '/' } : { name: 'login' };
  }

  // 5. Agar mavjud bo'lmagan yo'lga kelsa va tizimga kirmagan bo'lsa -> Landing sahifasiga yo'naltirish
  if (to.name === 'not-found' && !authStore.isAuthenticated) {
    return { path: '/' };
  }

  // 6. Barcha shartlar to'g'ri bo'lsa yo'lda davom etish
  return true;
}

