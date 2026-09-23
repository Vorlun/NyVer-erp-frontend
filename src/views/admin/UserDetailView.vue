<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { Group, Payment, PaymentType, PaymentStatus } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Badge from '../../components/ui/Badge.vue';
import { getTeacherPhoto } from '../../utils/teacherAvatars';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Coins,
  CreditCard,
  GraduationCap,
  Users,
  ShieldCheck,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  KeyRound,
  ChevronRight,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const userId = computed(() => Number(route.params.id));
const loading = ref(true);
const user = ref<any>(null);
const allGroups = ref<Group[]>([]);
const activeTab = ref<'GROUPS' | 'PAYMENTS' | 'ATTENDANCE' | 'SETTINGS'>('GROUPS');

// Modals
const showEditModal = ref(false);
const editFirstName = ref('');
const editLastName = ref('');
const editPhone = ref('');
const editEmail = ref('');
const editAddress = ref('');
const editBirthDate = ref('');

const showPaymentModal = ref(false);
const payAmount = ref<number | null>(850000);
const payType = ref<PaymentType>('CASH');
const payStatus = ref<PaymentStatus>('PAID');
const payPaidForDate = ref(new Date().toISOString().slice(0, 10));
const payComment = ref('');
const isSubmittingPayment = ref(false);

const showEnrollModal = ref(false);
const selectedEnrollGroupId = ref<number | ''>('');
const isEnrolling = ref(false);

const showCoinModal = ref(false);
const coinAmount = ref(10);
const coinReason = ref('Faollik va namunali intizom uchun');
const isSubmittingCoin = ref(false);

const showPasswordModal = ref(false);
const newPassword = ref('');
const isSubmittingPassword = ref(false);

const feedbackMessage = ref('');
const feedbackType = ref<'success' | 'error'>('success');

function showFeedback(msg: string, type: 'success' | 'error' = 'success') {
  feedbackMessage.value = msg;
  feedbackType.value = type;
  setTimeout(() => {
    feedbackMessage.value = '';
  }, 4000);
}

function formatMoney(amount: number | string | null | undefined): string {
  if (!amount && amount !== 0) return "0 so'm";
  return Number(amount).toLocaleString('uz-UZ') + " so'm";
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function loadUserData() {
  loading.value = true;
  try {
    const [userData, groupsData] = await Promise.allSettled([
      erpService.getUserById(userId.value),
      erpService.getGroups({ status: 'ACTIVE' }),
    ]);

    if (userData.status === 'fulfilled' && userData.value) {
      user.value = userData.value;
      // Initialize edit fields
      editFirstName.value = user.value.firstName || '';
      editLastName.value = user.value.lastName || '';
      editPhone.value = user.value.phone || '';
      editEmail.value = user.value.email || '';
      editAddress.value = user.value.address || '';
      if (user.value.birthDate) {
        editBirthDate.value = new Date(user.value.birthDate).toISOString().slice(0, 10);
      }
    }
    if (groupsData.status === 'fulfilled' && groupsData.value) {
      allGroups.value = Array.isArray(groupsData.value) ? groupsData.value : (groupsData.value as any).data || [];
    }
  } catch (err) {
    console.error('Foydalanuvchi ma\'lumotlarini yuklashda xatolik:', err);
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.id,
  () => {
    if (route.params.id) {
      loadUserData();
    }
  }
);

onMounted(() => {
  loadUserData();
});

// Computed Data
const userRoleLabel = computed(() => {
  if (!user.value) return '';
  switch (user.value.role) {
    case 'SUPERADMIN': return 'Bosh Administrator';
    case 'ADMIN': return 'Administrator';
    case 'TEACHER': return 'O\'qituvchi';
    case 'STUDENT': return 'Talaba';
    case 'ASSISTANT': return 'Assistent';
    default: return user.value.role;
  }
});

const userGroups = computed(() => {
  if (!user.value) return [];
  if (user.value.role === 'TEACHER') {
    return (user.value.teachingGroups || []).map((tg: any) => tg.group).filter(Boolean);
  }
  return (user.value.studentEnrollments || []).map((se: any) => se.group).filter(Boolean);
});

const userPayments = computed(() => {
  if (!user.value || !user.value.payments) return [];
  return user.value.payments as Payment[];
});

const totalPaidAmount = computed(() => {
  return userPayments.value
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
});

const totalPendingAmount = computed(() => {
  return userPayments.value
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Number(p.amount), 0);
});

const paidPaymentsCount = computed(() => {
  return userPayments.value.filter((p) => p.status === 'PAID').length;
});

// Impersonation
function handleImpersonate() {
  if (!user.value) return;
  authStore.impersonateUser(user.value);
  if (user.value.role === 'STUDENT') {
    router.push('/student/dashboard');
  } else if (user.value.role === 'TEACHER') {
    router.push('/teacher/dashboard');
  } else {
    router.push('/dashboard');
  }
}

// Edit User
async function handleUpdateProfile() {
  if (!user.value) return;
  try {
    await erpService.updateUser(user.value.id, {
      firstName: editFirstName.value,
      lastName: editLastName.value,
      phone: editPhone.value,
      email: editEmail.value || null,
      address: editAddress.value || null,
      birthDate: editBirthDate.value ? new Date(editBirthDate.value).toISOString() : null,
    });
    showFeedback("Profil muvaffaqiyatli yangilandi");
    showEditModal.value = false;
    await loadUserData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Profilni yangilashda xatolik', 'error');
  }
}

// Status toggle
async function toggleUserStatus() {
  if (!user.value) return;
  const newStatus = user.value.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  try {
    await erpService.changeUserStatus(user.value.id, newStatus);
    showFeedback(`Status "${newStatus}" holatiga o'zgartirildi`);
    await loadUserData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Statusni o\'zgartirishda xatolik', 'error');
  }
}

// Add Payment
async function handleCreatePayment() {
  if (!user.value || !payAmount.value) return;
  isSubmittingPayment.value = true;
  try {
    await erpService.createPayment({
      amount: Number(payAmount.value),
      type: payType.value,
      status: payStatus.value,
      paidForDate: payPaidForDate.value,
      comment: payComment.value || undefined,
      studentId: user.value.id,
    });
    showFeedback("To'lov muvaffaqiyatli kiritildi!");
    showPaymentModal.value = false;
    payComment.value = '';
    await loadUserData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'To\'lov kiritishda xatolik', 'error');
  } finally {
    isSubmittingPayment.value = false;
  }
}

// Enroll to Group
async function handleEnrollGroup() {
  if (!user.value || !selectedEnrollGroupId.value) return;
  isEnrolling.value = true;
  try {
    if (user.value.role === 'TEACHER') {
      await erpService.addTeacherToGroup(Number(selectedEnrollGroupId.value), user.value.id);
    } else {
      await erpService.addStudentToGroup(Number(selectedEnrollGroupId.value), user.value.id);
    }
    showFeedback("Guruhga muvaffaqiyatli biriktirildi!");
    showEnrollModal.value = false;
    selectedEnrollGroupId.value = '';
    await loadUserData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Guruhga biriktirishda xatolik', 'error');
  } finally {
    isEnrolling.value = false;
  }
}

// Coins
async function handleUpdateCoins() {
  if (!user.value) return;
  isSubmittingCoin.value = true;
  try {
    await erpService.updateUserCoins(user.value.id, coinAmount.value, coinReason.value);
    showFeedback(`Tangalar balansi yangilandi: ${coinAmount.value > 0 ? '+' : ''}${coinAmount.value}`);
    showCoinModal.value = false;
    await loadUserData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Tangalarni yangilashda xatolik', 'error');
  } finally {
    isSubmittingCoin.value = false;
  }
}

// Password Reset
async function handleResetPassword() {
  if (!user.value || !newPassword.value) return;
  isSubmittingPassword.value = true;
  try {
    await erpService.changeUserPassword(user.value.id, newPassword.value);
    showFeedback("Parol muvaffaqiyatli o'zgartirildi");
    showPasswordModal.value = false;
    newPassword.value = '';
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Parolni o\'zgartirishda xatolik', 'error');
  } finally {
    isSubmittingPassword.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">
    <!-- Top Nav & Breadcrumbs -->
    <div class="flex items-center justify-between">
      <button
        @click="router.back()"
        type="button"
        class="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <ArrowLeft class="h-4 w-4" />
        <span>Ortga qaytish</span>
      </button>

      <!-- Feedback Toast -->
      <div
        v-if="feedbackMessage"
        class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all duration-300"
        :class="feedbackType === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'"
      >
        <CheckCircle2 v-if="feedbackType === 'success'" class="h-4 w-4" />
        <AlertCircle v-else class="h-4 w-4" />
        <span>{{ feedbackMessage }}</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-[#6D28D9] border-t-transparent mx-auto"></div>
      <p class="text-xs text-slate-400 font-bold mt-3">360° profil ma'lumotlari yuklanmoqda...</p>
    </div>

    <!-- User Not Found -->
    <div v-else-if="!user" class="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center">
      <AlertCircle class="h-10 w-10 text-rose-500 mx-auto" />
      <h2 class="text-base font-black text-slate-900 mt-3">Foydalanuvchi topilmadi</h2>
      <p class="text-xs text-slate-400 mt-1">Ko'rsatilgan ID bo'yicha ma'lumot mavjud emas.</p>
    </div>

    <!-- MAIN 360° PROFILE VIEW -->
    <template v-else>
      <!-- 1. Hero Profile Card -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_#0000000a] p-6 sm:p-8 overflow-hidden relative">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <!-- Left: User Identity -->
          <div class="flex items-start sm:items-center gap-5">
            <div class="relative">
              <img
                v-if="user.role === 'TEACHER' || user.avatar"
                :src="getTeacherPhoto(user)"
                :alt="user.firstName"
                class="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl object-cover shadow-lg shrink-0 ring-2 ring-slate-100"
              />
              <div
                v-else
                class="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-linear-to-tr from-[#6D28D9] via-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shrink-0"
              >
                {{ user.firstName?.charAt(0) }}{{ user.lastName?.charAt(0) }}
              </div>
              <span
                class="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white"
                :class="user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'"
                :title="user.status"
              ></span>
            </div>

            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {{ user.firstName }} {{ user.lastName }}
                </h1>
                <!-- Role Badge -->
                <span
                  class="px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider"
                  :class="
                    user.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'ADMIN' ? 'bg-indigo-100 text-[#6D28D9]' :
                    user.role === 'TEACHER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  "
                >
                  {{ userRoleLabel }}
                </span>
                <!-- Status Badge with Toggle -->
                <button
                  @click="toggleUserStatus"
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  :class="user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                  :title="'Statusni o\'zgartirish uchun bosing'"
                >
                  ● {{ user.status === 'ACTIVE' ? 'Faol' : 'Nofaol' }}
                </button>
              </div>

              <!-- Quick Info Chips -->
              <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                <a :href="`tel:${user.phone}`" class="flex items-center gap-1.5 hover:text-[#6D28D9] font-medium">
                  <Phone class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ user.phone }}</span>
                </a>
                <span v-if="user.email" class="flex items-center gap-1.5 font-medium">
                  <Mail class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ user.email }}</span>
                </span>
                <span v-if="user.address" class="flex items-center gap-1.5 font-medium">
                  <MapPin class="h-3.5 w-3.5 text-slate-400" />
                  <span class="truncate max-w-48">{{ user.address }}</span>
                </span>
                <span class="flex items-center gap-1.5 text-slate-400 font-medium">
                  <Calendar class="h-3.5 w-3.5" />
                  <span>Ro'yxatdan: {{ formatDate(user.created_at) }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Right: 360 Action Buttons -->
          <div class="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <!-- 1. IMPERSONATION BUTTON -->
            <button
              @click="handleImpersonate"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
              title="Shu foydalanuvchi nomidan tizimga kirish"
            >
              <span>🚀</span>
              <span>Akkaunt nomidan kirish</span>
            </button>

            <!-- 2. ADD PAYMENT (STUDENT) -->
            <button
              v-if="user.role === 'STUDENT'"
              @click="showPaymentModal = true"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard class="h-3.5 w-3.5" />
              <span>To'lov qabul qilish</span>
            </button>

            <!-- 3. ENROLL GROUP -->
            <button
              @click="showEnrollModal = true"
              type="button"
              class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <Users class="h-3.5 w-3.5 text-slate-600" />
              <span>Guruh biriktirish</span>
            </button>

            <!-- 4. COINS -->
            <button
              @click="showCoinModal = true"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-black text-xs transition-colors cursor-pointer"
              title="Tangalar balansi"
            >
              <Coins class="h-4 w-4 text-amber-600" />
              <span>{{ user.coins || 0 }}</span>
            </button>

            <!-- 5. EDIT PROFILE -->
            <button
              @click="showEditModal = true"
              type="button"
              class="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Ma'lumotlarni tahrirlash"
            >
              <Edit2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Role-Specific Financial / Academic Metric Strip -->
        <div v-if="user.role === 'STUDENT'" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Jami To'langan</div>
            <div class="text-base font-black text-emerald-600 mt-0.5">{{ formatMoney(totalPaidAmount) }}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">{{ paidPaymentsCount }} ta muvaffaqiyatli to'lov</div>
          </div>

          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Kutilayotgan Qarz</div>
            <div class="text-base font-black text-amber-600 mt-0.5">{{ formatMoney(totalPendingAmount) }}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">{{ userPayments.filter(p => p.status === 'PENDING').length }} ta kutilmoqda</div>
          </div>

          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Faol Guruhlari</div>
            <div class="text-base font-black text-slate-800 mt-0.5">{{ userGroups.length }} ta</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Ta'lim jarayonida</div>
          </div>

          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Tangalar Balansi</div>
            <div class="text-base font-black text-amber-700 mt-0.5">{{ user.coins || 0 }} coin</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Mukofot do'koni uchun</div>
          </div>
        </div>

        <div v-else-if="user.role === 'TEACHER'" class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Dars Beradigan Guruhlari</div>
            <div class="text-base font-black text-[#6D28D9] mt-0.5">{{ userGroups.length }} ta guruh</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Faol o'quv dasturlari</div>
          </div>
          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Jami O'quvchilar</div>
            <div class="text-base font-black text-slate-800 mt-0.5">
              {{ userGroups.reduce((sum: number, g: any) => sum + (g._count?.students || 0), 0) }} ta
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Guruhlarida tahsil olmoqda</div>
          </div>
          <div class="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div class="text-[10px] uppercase font-bold text-slate-400">Holati</div>
            <div class="text-base font-black text-emerald-600 mt-0.5">Faol o'qituvchi</div>
            <div class="text-[10px] text-slate-400 mt-0.5">{{ user.email || 'Aloqa mavjud' }}</div>
          </div>
        </div>
      </div>

      <!-- 2. TAB CONTROLS -->
      <div class="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          @click="activeTab = 'GROUPS'"
          type="button"
          class="px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          :class="activeTab === 'GROUPS' ? 'bg-[#6D28D9] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'"
        >
          <span class="inline-flex items-center gap-1.5">
            <GraduationCap class="h-4 w-4" />
            <span>Guruhlar & Darslar ({{ userGroups.length }})</span>
          </span>
        </button>

        <button
          v-if="user.role === 'STUDENT'"
          @click="activeTab = 'PAYMENTS'"
          type="button"
          class="px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          :class="activeTab === 'PAYMENTS' ? 'bg-[#6D28D9] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'"
        >
          <span class="inline-flex items-center gap-1.5">
            <CreditCard class="h-4 w-4" />
            <span>To'lovlar Tarixi & Moliya ({{ userPayments.length }})</span>
          </span>
        </button>

        <button
          v-if="user.role === 'STUDENT'"
          @click="activeTab = 'ATTENDANCE'"
          type="button"
          class="px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          :class="activeTab === 'ATTENDANCE' ? 'bg-[#6D28D9] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'"
        >
          <span class="inline-flex items-center gap-1.5">
            <CheckCircle2 class="h-4 w-4" />
            <span>Davomat ({{ user.studentAttendances?.length || 0 }})</span>
          </span>
        </button>

        <button
          @click="activeTab = 'SETTINGS'"
          type="button"
          class="px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          :class="activeTab === 'SETTINGS' ? 'bg-[#6D28D9] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'"
        >
          <span class="inline-flex items-center gap-1.5">
            <KeyRound class="h-4 w-4" />
            <span>Sozlamalar & Xavfsizlik</span>
          </span>
        </button>
      </div>

      <!-- 3. TAB 1: GROUPS -->
      <div v-if="activeTab === 'GROUPS'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider">Biriktirilgan Guruhlar</h2>
          <button
            @click="showEnrollModal = true"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6D28D9] text-white font-bold text-xs hover:bg-[#5B21B6] transition-colors cursor-pointer"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Guruhga biriktirish</span>
          </button>
        </div>

        <div v-if="userGroups.length === 0" class="bg-white rounded-3xl p-10 border border-slate-100 text-center">
          <Users class="h-10 w-10 text-slate-300 mx-auto" />
          <h3 class="text-sm font-bold text-slate-700 mt-2">Hozircha guruhlar mavjud emas</h3>
          <p class="text-xs text-slate-400 mt-0.5">Ushbu foydalanuvchi hech qaysi guruhga a'zo emas.</p>
          <button
            @click="showEnrollModal = true"
            type="button"
            class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Guruhga qo'shish</span>
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="g in userGroups"
            :key="g.id"
            class="bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition-all p-5 space-y-3 cursor-pointer group/gcard"
            @click="router.push(`/dashboard/groups/${g.id}`)"
          >
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                  {{ g.course?.name || 'Kurs' }}
                </span>
                <h3 class="text-base font-black text-slate-900 mt-1.5 group-hover/gcard:text-[#6D28D9] transition-colors">
                  {{ g.name }}
                </h3>
              </div>
              <Badge :variant="g.status === 'ACTIVE' ? 'success' : 'warning'">
                {{ g.status }}
              </Badge>
            </div>

            <div class="space-y-1.5 text-xs text-slate-500 pt-1">
              <div class="flex items-center gap-2">
                <Clock class="h-3.5 w-3.5 text-slate-400" />
                <span>{{ g.startTime }} - {{ g.endTime }}</span>
              </div>
              <div class="flex items-center gap-2">
                <MapPin class="h-3.5 w-3.5 text-slate-400" />
                <span>{{ g.room?.name || 'Xona' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Calendar class="h-3.5 w-3.5 text-slate-400" />
                <span>Boshlangan: {{ formatDate(g.startDate) }}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-400 font-medium">Guruh boshqaruvi</span>
              <span class="text-[#6D28D9] font-bold flex items-center gap-1 group-hover/gcard:translate-x-0.5 transition-transform">
                <span>Batafsil</span>
                <ChevronRight class="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. TAB 2: PAYMENTS (STUDENT) -->
      <div v-if="activeTab === 'PAYMENTS'" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider">To'lovlar Tarixi</h2>
            <p class="text-xs text-slate-400 mt-0.5">Ushbu talaba tomonidan amalga oshirilgan to'lovlar va qarzlar</p>
          </div>
          <button
            @click="showPaymentModal = true"
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Yangi to'lov qabul qilish</span>
          </button>
        </div>

        <div v-if="userPayments.length === 0" class="bg-white rounded-3xl p-10 border border-slate-100 text-center">
          <CreditCard class="h-10 w-10 text-slate-300 mx-auto" />
          <h3 class="text-sm font-bold text-slate-700 mt-2">Hozircha to'lovlar mavjud emas</h3>
          <p class="text-xs text-slate-400 mt-0.5">Ushbu talaba hali to'lov amalga oshirmagan.</p>
        </div>

        <div v-else class="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="text-[11px] bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                <tr>
                  <th class="py-3 px-4">#</th>
                  <th class="py-3 px-4">Summa</th>
                  <th class="py-3 px-4">To'lov turi</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Oy (Sana)</th>
                  <th class="py-3 px-4">Izoh</th>
                  <th class="py-3 px-4 text-right">Kvitansiya</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr v-for="(p, idx) in userPayments" :key="p.id" class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-3.5 px-4 text-slate-400 font-mono">{{ idx + 1 }}</td>
                  <td class="py-3.5 px-4 font-black text-slate-900 text-sm">
                    {{ formatMoney(p.amount) }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                      {{ p.type }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4">
                    <Badge :variant="p.status === 'PAID' ? 'success' : 'warning'">
                      {{ p.status === 'PAID' ? "To'langan" : 'Kutilmoqda' }}
                    </Badge>
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-700">
                    {{ formatDate(p.paidForDate || p.created_at) }}
                  </td>
                  <td class="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                    {{ p.comment || '-' }}
                  </td>
                  <td class="py-3.5 px-4 text-right">
                    <span class="text-[11px] font-bold text-[#6D28D9] bg-violet-50 px-2 py-1 rounded-lg">
                      #INV-{{ p.id }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 5. TAB 3: ATTENDANCE (STUDENT) -->
      <div v-if="activeTab === 'ATTENDANCE'" class="space-y-4">
        <h2 class="text-sm font-black text-slate-800 uppercase tracking-wider">Davomat & Darsdagi Ishtirok</h2>
        
        <div v-if="!user.studentAttendances || user.studentAttendances.length === 0" class="bg-white rounded-3xl p-10 border border-slate-100 text-center">
          <CheckCircle2 class="h-10 w-10 text-slate-300 mx-auto" />
          <h3 class="text-sm font-bold text-slate-700 mt-2">Hozircha davomat qaydlari yo'q</h3>
          <p class="text-xs text-slate-400 mt-0.5">Darslar o'tilgach bu yerda ishtirok ko'rsatiladi.</p>
        </div>

        <div v-else class="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="text-[11px] bg-slate-50 text-slate-400 uppercase font-black tracking-wider border-b border-slate-100">
                <tr>
                  <th class="py-3 px-4">Dars Mavzusi</th>
                  <th class="py-3 px-4">Guruh</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Tangalar</th>
                  <th class="py-3 px-4">Sana</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                <tr v-for="att in user.studentAttendances" :key="att.id" class="hover:bg-slate-50/60 transition-colors">
                  <td class="py-3.5 px-4 font-bold text-slate-900">
                    {{ att.lesson?.topic || 'Dars' }}
                  </td>
                  <td class="py-3.5 px-4 text-slate-600">
                    {{ att.lesson?.group?.name || '-' }}
                  </td>
                  <td class="py-3.5 px-4">
                    <span
                      class="px-2 py-0.5 rounded-md text-[11px] font-black"
                      :class="
                        att.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' :
                        att.status === 'LATE' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      "
                    >
                      {{ att.status === 'PRESENT' ? 'Kelgan' : att.status === 'LATE' ? 'Kechikkan' : 'Kelmadi' }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-amber-600">
                    +{{ att.coinsEarned || 0 }} coin
                  </td>
                  <td class="py-3.5 px-4 font-mono text-slate-500">
                    {{ formatDate(att.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 6. TAB 4: SETTINGS & SECURITY -->
      <div v-if="activeTab === 'SETTINGS'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Password Reset Box -->
        <div class="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center">
              <KeyRound class="h-4 w-4" />
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-900">Parolni Yangilash</h3>
              <p class="text-xs text-slate-400 mt-0.5">Foydalanuvchi akkauntiga yangi parol o'rnatish</p>
            </div>
          </div>

          <form @submit.prevent="handleResetPassword" class="space-y-3 pt-2">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Yangi Parol</label>
              <input
                v-model="newPassword"
                type="password"
                placeholder="Kamida 6 ta belgi"
                minlength="6"
                required
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
              />
            </div>
            <button
              type="submit"
              :disabled="isSubmittingPassword"
              class="w-full py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {{ isSubmittingPassword ? "Saqlanmoqda..." : "Parolni Saqlash" }}
            </button>
          </form>
        </div>

        <!-- Account Status & Control -->
        <div class="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <ShieldCheck class="h-4 w-4" />
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-900">Akkaunt Holati & Nazorat</h3>
              <p class="text-xs text-slate-400 mt-0.5">Tizimga kirish huquqini cheklash yoki bloklash</p>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div class="text-xs font-bold text-slate-800">Holat: {{ user.status }}</div>
                <div class="text-[11px] text-slate-400">Faol akkaunt tizimdan erkin foydalana oladi</div>
              </div>
              <button
                @click="toggleUserStatus"
                type="button"
                class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                :class="user.status === 'ACTIVE' ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'"
              >
                {{ user.status === 'ACTIVE' ? 'Bloklash' : 'Faollashtirish' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- MODAL: EDIT USER PROFILE -->
    <Modal :show="showEditModal" title="Foydalanuvchi ma'lumotlarini tahrirlash" @close="showEditModal = false">
      <form @submit.prevent="handleUpdateProfile" class="space-y-3.5">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ism</label>
            <input
              v-model="editFirstName"
              type="text"
              required
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Familiya</label>
            <input
              v-model="editLastName"
              type="text"
              required
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Telefon raqam</label>
          <input
            v-model="editPhone"
            type="text"
            required
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none font-mono"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Email</label>
          <input
            v-model="editEmail"
            type="email"
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Manzil</label>
          <input
            v-model="editAddress"
            type="text"
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showEditModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            class="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Saqlash
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: ADD PAYMENT -->
    <Modal :show="showPaymentModal" title="Yangi to'lov qabul qilish" @close="showPaymentModal = false">
      <form @submit.prevent="handleCreatePayment" class="space-y-4">
        <!-- Student Info Banner -->
        <div class="p-3 bg-violet-50/70 border border-violet-100 rounded-xl flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UserIcon class="h-4 w-4 text-[#6D28D9]" />
            <span class="text-xs font-bold text-slate-800">{{ user.firstName }} {{ user.lastName }}</span>
          </div>
          <span class="text-[11px] font-mono text-slate-500">{{ user.phone }}</span>
        </div>

        <!-- Amount input with step="any" min="0" -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-bold text-slate-700">To'lov Summasi (so'm)</label>
            <span v-if="payAmount" class="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {{ formatMoney(payAmount) }}
            </span>
          </div>
          <input
            v-model.number="payAmount"
            type="number"
            min="0"
            step="any"
            required
            placeholder="Summani kiriting..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
          />
          <!-- Presets -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <button
              v-for="preset in [600000, 750000, 850000, 900000, 1200000]"
              :key="preset"
              type="button"
              @click="payAmount = preset"
              class="px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer"
              :class="payAmount === preset ? 'bg-[#6D28D9] text-white border-[#6D28D9]' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'"
            >
              {{ (preset / 1000).toLocaleString() }}k
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">To'lov Usuli</label>
            <select
              v-model="payType"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none bg-white"
            >
              <option value="CASH">Naqd pul</option>
              <option value="CLICK">Click</option>
              <option value="PAYME">Payme</option>
              <option value="UZUM">Uzum Bank</option>
              <option value="CARD">Plastik karta</option>
              <option value="BANK_TRANSFER">Bank o'tkazmasi</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Status</label>
            <select
              v-model="payStatus"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none bg-white"
            >
              <option value="PAID">To'langan (Tasdiqlangan)</option>
              <option value="PENDING">Kutilmoqda (Qarz)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Qaysi oy uchun</label>
          <input
            v-model="payPaidForDate"
            type="date"
            required
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none bg-white"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Izoh (ixtiyoriy)</label>
          <input
            v-model="payComment"
            type="text"
            placeholder="To'lov bo'yicha qo'shimcha izoh..."
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showPaymentModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingPayment"
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {{ isSubmittingPayment ? "Kiritilmoqda..." : "To'lovni Kiritish" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: ENROLL GROUP -->
    <Modal :show="showEnrollModal" title="Guruhga biriktirish" @close="showEnrollModal = false">
      <form @submit.prevent="handleEnrollGroup" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Guruhni tanlang</label>
          <select
            v-model="selectedEnrollGroupId"
            required
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] outline-none bg-white"
          >
            <option value="" disabled>Guruhni tanlang...</option>
            <option v-for="g in allGroups" :key="g.id" :value="g.id">
              {{ g.name }} — {{ g.course?.name }} ({{ g.startTime }}-{{ g.endTime }})
            </option>
          </select>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showEnrollModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isEnrolling || !selectedEnrollGroupId"
            class="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {{ isEnrolling ? "Biriktirilmoqda..." : "Biriktirish" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: COINS -->
    <Modal :show="showCoinModal" title="Tangalar Balansini O'zgartirish" @close="showCoinModal = false">
      <form @submit.prevent="handleUpdateCoins" class="space-y-4">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <span class="text-xs font-bold text-amber-900">Joriy balans</span>
          <span class="text-sm font-black text-amber-800">{{ user.coins || 0 }} coin</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Qo'shish / Ayirish miqdori</label>
          <input
            v-model.number="coinAmount"
            type="number"
            required
            placeholder="Masalan: 10 yoki -5"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Sabab</label>
          <input
            v-model="coinReason"
            type="text"
            required
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showCoinModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingCoin"
            class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {{ isSubmittingCoin ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
