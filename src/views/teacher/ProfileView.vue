<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import {
  User as UserIcon,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  ArrowLeft,
  Upload,
  Layers,
  BookOpen,
  Users,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

// Form State
const saving = ref(false);
const loading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const groups = ref<any[]>([]);

const form = ref({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  birthDate: '',
  address: '',
  photo: '',
  password: '',
  confirmPassword: '',
});

function initForm() {
  const u = authStore.user;
  form.value = {
    firstName: u?.firstName || '',
    lastName: u?.lastName || '',
    phone: u?.phone || '',
    email: u?.email || '',
    birthDate: u?.birthDate ? (u.birthDate as string).slice(0, 10) : '',
    address: u?.address || '',
    photo: (u as any)?.photo || '',
    password: '',
    confirmPassword: '',
  };
  successMessage.value = '';
  errorMessage.value = '';
}

async function loadData() {
  loading.value = true;
  try {
    const groupsData = await erpService.getTeacherGroups();
    groups.value = groupsData || [];
  } catch (err) {
    console.warn('Teacher profile groups load error:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  initForm();
  loadData();
});

// Photo selection & upload handling
function triggerFileInput() {
  fileInputRef.value?.click();
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = 'Rasm hajmi 5MB dan oshmasligi kerak!';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    form.value.photo = e.target?.result as string;
    errorMessage.value = '';
  };
  reader.readAsDataURL(file);
}

function removePhoto() {
  form.value.photo = '';
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

// Save Profile
async function handleSave() {
  if (!form.value.firstName.trim()) {
    errorMessage.value = 'Ism kiritilishi shart!';
    return;
  }

  if (form.value.password && form.value.password.length < 6) {
    errorMessage.value = "Yangi parol kamida 6 belgidan iborat bo'lishi kerak!";
    return;
  }

  if (form.value.password && form.value.password !== form.value.confirmPassword) {
    errorMessage.value = 'Parollar bir-biriga mos kelmadi!';
    return;
  }

  saving.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const updatePayload: any = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim() || undefined,
      birthDate: form.value.birthDate || undefined,
      address: form.value.address.trim() || undefined,
      photo: form.value.photo || null,
    };

    if (form.value.password) {
      updatePayload.password = form.value.password;
    }

    if (authStore.user?.id) {
      await erpService.updateUser(authStore.user.id, updatePayload);
    }

    authStore.updateUserProfile({
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim() || null,
      birthDate: form.value.birthDate || null,
      address: form.value.address.trim() || null,
      photo: form.value.photo || null,
    });

    form.value.password = '';
    form.value.confirmPassword = '';
    successMessage.value = "Profil ma'lumotlari muvaffaqiyatli saqlandi!";

    setTimeout(() => {
      successMessage.value = '';
    }, 4000);
  } catch (err: any) {
    console.error('Failed to update teacher profile:', err);
    errorMessage.value = err?.response?.data?.message || "Xatolik yuz berdi. Ma'lumotlarni saqlab bo'lmadi.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6 pb-12 font-sans text-slate-800">
    <!-- Header / Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
          <router-link to="/teacher/dashboard" class="hover:text-[#6D28D9] transition-colors">Guruhlar</router-link>
          <span>/</span>
          <span class="text-slate-700">Profil sozlamalari</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Mening Profilim
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Shaxsiy ma'lumotlaringizni ko'ring, yangilang va biriktirilgan guruhlarni boshqaring.
        </p>
      </div>

      <button
        @click="router.back()"
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
      >
        <ArrowLeft class="h-4 w-4 text-slate-500" />
        <span>Orqaga qaytish</span>
      </button>
    </div>

    <!-- Alert Messages -->
    <div
      v-if="successMessage"
      class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3 text-emerald-800 text-sm font-bold shadow-xs animate-in fade-in"
    >
      <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
      <span>{{ successMessage }}</span>
    </div>

    <div
      v-if="errorMessage"
      class="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center gap-3 text-rose-800 text-sm font-bold shadow-xs animate-in fade-in"
    >
      <AlertCircle class="h-5 w-5 text-rose-600 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Main Grid: Left Avatar Card + Right Form -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <!-- Left Card: Avatar & Summary -->
      <div class="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6 text-center flex flex-col items-center">
        <!-- Avatar Area -->
        <div class="relative group">
          <div
            class="h-32 w-32 rounded-3xl overflow-hidden bg-violet-50 border-2 border-violet-200 flex items-center justify-center shadow-md relative"
          >
            <img
              v-if="form.photo"
              :src="form.photo"
              alt="Profil rasmi"
              class="h-full w-full object-cover"
            />
            <span
              v-else
              class="text-5xl font-black text-[#6D28D9] select-none"
            >
              {{ form.firstName?.charAt(0) || 'U' }}
            </span>

            <div
              @click="triggerFileInput"
              class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer rounded-3xl"
            >
              <Camera class="h-7 w-7 mb-1" />
              <span class="text-[11px] font-bold">O'zgartirish</span>
            </div>
          </div>

          <button
            @click="triggerFileInput"
            type="button"
            class="absolute -bottom-2 -right-2 h-9 w-9 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title="Rasm yuklash"
          >
            <Camera class="h-4.5 w-4.5" />
          </button>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileChange"
          />
        </div>

        <!-- Photo Actions -->
        <div class="flex items-center gap-2">
          <button
            @click="triggerFileInput"
            type="button"
            class="px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-[#6D28D9] text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Upload class="h-3.5 w-3.5" />
            <span>Rasm yuklash</span>
          </button>
          <button
            v-if="form.photo"
            @click="removePhoto"
            type="button"
            class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer flex items-center gap-1"
            title="Rasmni o'chirish"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>O'chirish</span>
          </button>
        </div>

        <!-- Name & Role -->
        <div>
          <h2 class="text-lg font-black text-slate-900">
            {{ form.firstName }} {{ form.lastName }}
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ form.email }}</p>
        </div>

        <!-- User Info Details -->
        <div class="w-full pt-4 border-t border-slate-100 space-y-3 text-left text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">Tizimdagi rol:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-violet-50 text-[#6D28D9] font-bold text-[11px]">
              O'qituvchi
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">Holati:</span>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] flex items-center gap-1">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Faol
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium">Faol guruhlar:</span>
            <span class="font-bold text-slate-800">{{ groups.length }} ta</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Edit Profile Form -->
      <div class="lg:col-span-2 space-y-6">
        <form @submit.prevent="handleSave" class="space-y-6">
          <!-- 1. Shaxsiy Ma'lumotlar Card -->
          <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
            <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div class="h-10 w-10 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center shrink-0">
                <UserIcon class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900">Shaxsiy Ma'lumotlar</h3>
                <p class="text-xs text-slate-400">Ism-sharif va aloqa ma'lumotlaringiz</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Ism *</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  placeholder="Ismingiz"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Familiya *</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  placeholder="Familiyangiz"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Telefon raqam *</label>
                <input
                  v-model="form.phone"
                  type="text"
                  required
                  placeholder="+998 90 123 45 67"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Email manzil</label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="namuna@nyver.uz"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Manzil</label>
                <input
                  v-model="form.address"
                  type="text"
                  placeholder="Shahar, tuman, ko'cha"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Tug'ilgan sana</label>
                <input
                  v-model="form.birthDate"
                  type="date"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>
            </div>
          </div>

          <!-- 2. Xavfsizlik & Parol Card -->
          <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-5">
            <div class="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div class="h-10 w-10 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center shrink-0">
                <Lock class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-base font-extrabold text-slate-900">Xavfsizlik</h3>
                <p class="text-xs text-slate-400">Parolni o'zgartirish (agar kerak bo'lsa)</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Yangi parol</label>
                <input
                  v-model="form.password"
                  type="password"
                  placeholder="Kamida 6 ta belgi"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1.5">Parolni tasdiqlash</label>
                <input
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="Yangi parolni takrorlang"
                  class="w-full h-11 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] focus:ring-2 focus:ring-[#6D28D9]/15 transition font-medium"
                />
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="initForm"
              class="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Save class="h-4 w-4" />
              <span>{{ saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Biriktirilgan Guruhlarim (Clean minimal section) -->
    <div class="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center shrink-0">
            <Layers class="h-5 w-5" />
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900">Biriktirilgan Guruhlarim</h3>
            <p class="text-xs text-slate-400">Siz dars berayotgan faol o'quv guruhlari</p>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-full bg-violet-50 text-[#6D28D9] font-bold text-xs">
          {{ groups.length }} ta guruh
        </span>
      </div>

      <div v-if="loading" class="py-8 text-center text-xs text-slate-400">
        Yuklanmoqda...
      </div>

      <div v-else-if="groups.length === 0" class="py-8 text-center text-xs text-slate-400">
        Biriktirilgan guruhlar topilmadi
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="grp in groups"
          :key="grp.id"
          class="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#6D28D9]/40 hover:shadow-2xs transition flex items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <h4 class="font-bold text-sm text-slate-900 truncate">{{ grp.name }}</h4>
            <p class="text-xs text-slate-500 truncate mt-0.5">{{ grp.courseName }} • {{ grp.roomName }}</p>
            <div class="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
              <span>{{ grp.startTime }} - {{ grp.endTime }}</span>
              <span>•</span>
              <span class="flex items-center gap-1 font-semibold text-slate-600">
                <Users class="w-3 h-3 text-slate-400" />
                {{ grp.studentsCount }} talaba
              </span>
            </div>
          </div>

          <router-link
            :to="`/teacher/groups/${grp.id}`"
            class="shrink-0 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-[#6D28D9] text-xs font-bold transition flex items-center gap-1"
          >
            <BookOpen class="w-3.5 h-3.5" />
            <span>Darslar</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
