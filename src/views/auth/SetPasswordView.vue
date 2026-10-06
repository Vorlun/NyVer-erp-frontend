<template>
  <div class="sp-page">
    <div class="sp-card">
      <!-- Logo -->
      <div class="sp-header">
        <div class="sp-logo">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#g1)" />
            <path d="M10 18L16 24L26 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stop-color="#4f46e5" />
                <stop offset="1" stop-color="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="sp-title">NyVer O'quv Markazi</h1>
      </div>

      <!-- States -->
      <div v-if="state === 'loading'" class="sp-state">
        <div class="sp-spinner" />
        <p class="sp-state-text">Havola tekshirilmoqda…</p>
      </div>

      <div v-else-if="state === 'invalid'" class="sp-state">
        <div class="sp-icon-error">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 class="sp-state-title">Havola yaroqsiz</h2>
        <p class="sp-state-desc">Ushbu havola eskirgan yoki allaqachon ishlatilgan. Ma'muriyatga murojaat qiling.</p>
        <a href="/login" class="sp-btn-secondary">Loginga o'tish</a>
      </div>

      <div v-else-if="state === 'success'" class="sp-state">
        <div class="sp-icon-success">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 class="sp-state-title">Parol o'rnatildi! 🎉</h2>
        <p class="sp-state-desc">
          {{ isFirstLogin ? "Yangi shaxsiy parolingiz muvaffaqiyatli saqlandi. Endi talaba kabinetingizdan to'liq foydalanishingiz mumkin." : "Parolingiz muvaffaqiyatli o'rnatildi. Endi tizimga kirishingiz mumkin." }}
        </p>
        <router-link v-if="authStore.isAuthenticated" to="/student/dashboard" class="sp-btn">
          Talaba Kabinetiga O'tish →
        </router-link>
        <a v-else href="/login" class="sp-btn">Tizimga Kirish →</a>
      </div>

      <div v-else-if="state === 'form'" class="sp-form-wrap">
        <h2 class="sp-form-title">{{ isFirstLogin ? "Yangi Shaxsiy Parol O'rnating" : "Parolni O'rnating" }}</h2>
        <p class="sp-form-desc">
          {{ isFirstLogin ? "Siz 1 martalik vaqtinchalik parol bilan kirdingiz. Xavfsizlik uchun yangi doimiy parolingizni belgilang." : "Akkauntingiz uchun yangi parol yarating. Kamida 6 ta belgi bo'lishi kerak." }}
        </p>

        <form @submit.prevent="handleSubmit" class="sp-form" novalidate>
          <div class="sp-field">
            <label class="sp-label">Yangi parol</label>
            <div class="sp-input-wrap">
              <input
                id="sp-password"
                v-model="password"
                :type="showPass ? 'text' : 'password'"
                class="sp-input"
                :class="{ 'sp-input--error': errors.password }"
                placeholder="Yangi parolni kiriting"
                autocomplete="new-password"
              />
              <button type="button" class="sp-toggle-pass" @click="showPass = !showPass" tabindex="-1">
                <svg v-if="!showPass" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div class="sp-strength" v-if="password">
              <div class="sp-strength-bar" :style="{ width: strengthWidth, background: strengthColor }" />
            </div>
            <span v-if="errors.password" class="sp-error-text">{{ errors.password }}</span>
          </div>

          <div class="sp-field">
            <label class="sp-label">Parolni tasdiqlang</label>
            <div class="sp-input-wrap">
              <input
                id="sp-confirm"
                v-model="confirm"
                :type="showConfirm ? 'text' : 'password'"
                class="sp-input"
                :class="{ 'sp-input--error': errors.confirm }"
                placeholder="Parolni qayta kiriting"
                autocomplete="new-password"
              />
              <button type="button" class="sp-toggle-pass" @click="showConfirm = !showConfirm" tabindex="-1">
                <svg v-if="!showConfirm" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <span v-if="errors.confirm" class="sp-error-text">{{ errors.confirm }}</span>
          </div>

          <span v-if="apiError" class="sp-error-text sp-api-error">{{ apiError }}</span>

          <button type="submit" class="sp-btn" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="sp-btn-spinner" />
            <span v-else>Parolni O'rnatish →</span>
          </button>
        </form>
      </div>
    </div>

    <p class="sp-footer">© {{ new Date().getFullYear() }} NyVer O'quv Markazi</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import axios from 'axios';

type State = 'loading' | 'invalid' | 'form' | 'success';

const route = useRoute();
const authStore = useAuthStore();
const state = ref<State>('loading');
const token = ref('');
const password = ref('');
const confirm = ref('');
const showPass = ref(false);
const showConfirm = ref(false);
const isSubmitting = ref(false);
const apiError = ref('');
const errors = ref<{ password?: string; confirm?: string }>({});

const isFirstLogin = computed(() => {
  return route.query.mode === 'first-login' || (authStore.isAuthenticated && !!authStore.user?.tempPassword);
});

// Password strength
const strengthScore = computed(() => {
  const p = password.value;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 6) score++;
  if (p.length >= 10) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score;
});

const strengthWidth = computed(() => `${(strengthScore.value / 5) * 100}%`);
const strengthColor = computed(() => {
  const s = strengthScore.value;
  if (s <= 1) return '#ef4444';
  if (s <= 3) return '#f59e0b';
  return '#10b981';
});

onMounted(() => {
  const t = route.query.token as string;
  if (t) {
    token.value = t;
    state.value = 'form';
    return;
  }
  
  if (isFirstLogin.value) {
    state.value = 'form';
    return;
  }

  state.value = 'invalid';
});

function validate() {
  errors.value = {};
  if (password.value.length < 6) {
    errors.value.password = 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak';
  }
  if (password.value !== confirm.value) {
    errors.value.confirm = 'Parollar mos kelmadi';
  }
  return Object.keys(errors.value).length === 0;
}

async function handleSubmit() {
  apiError.value = '';
  if (!validate()) return;

  isSubmitting.value = true;
  try {
    if (token.value) {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/set-password`, {
        token: token.value,
        newPassword: password.value,
      });
    } else {
      await erpService.changeTempPassword(password.value);
      if (authStore.user) {
        authStore.user.tempPassword = null;
        localStorage.setItem('nyver_auth_user', JSON.stringify(authStore.user));
      }
    }
    state.value = 'success';
  } catch (err: any) {
    const msg = err?.response?.data?.message;
    apiError.value = Array.isArray(msg)
      ? msg.join(', ')
      : (msg || 'Xatolik yuz berdi. Qayta urinib ko\'ring.');
    if (token.value && (apiError.value.includes('yaroqsiz') || apiError.value.includes('muddati'))) {
      state.value = 'invalid';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.sp-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
  padding: 24px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.sp-card {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(79, 70, 229, 0.12), 0 4px 16px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* Header */
.sp-header {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  padding: 28px 32px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.sp-logo {
  flex-shrink: 0;
}

.sp-title {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

/* States */
.sp-state {
  padding: 40px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.sp-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e7ff;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sp-state-text {
  color: #64748b;
  font-size: 15px;
}

.sp-icon-error {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fee2e2;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.sp-icon-success {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #dcfce7;
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.sp-state-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.sp-state-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  max-width: 300px;
  margin: 0;
}

/* Form */
.sp-form-wrap {
  padding: 32px;
}

.sp-form-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px;
}

.sp-form-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px;
  line-height: 1.5;
}

.sp-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sp-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.sp-input-wrap {
  position: relative;
}

.sp-input {
  width: 100%;
  padding: 12px 44px 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: #f8faff;
}

.sp-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  background: #fff;
}

.sp-input--error {
  border-color: #ef4444;
}

.sp-input--error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.sp-toggle-pass {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}

.sp-toggle-pass:hover {
  color: #4f46e5;
}

.sp-strength {
  height: 3px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;
}

.sp-strength-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s, background 0.3s;
}

.sp-error-text {
  font-size: 12px;
  color: #ef4444;
  font-weight: 500;
}

.sp-api-error {
  text-align: center;
  font-size: 13px;
}

/* Buttons */
.sp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-weight: 700;
  font-size: 15px;
  padding: 13px 24px;
  border-radius: 12px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  width: 100%;
  margin-top: 4px;
}

.sp-btn:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

.sp-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sp-btn-secondary {
  display: inline-block;
  background: #f1f5f9;
  color: #4f46e5;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 24px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.2s;
  margin-top: 4px;
}

.sp-btn-secondary:hover {
  background: #e0e7ff;
}

.sp-btn-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Footer */
.sp-footer {
  margin-top: 24px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}
</style>
