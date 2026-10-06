<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { User, Role } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Badge from '../../components/ui/Badge.vue';
import { UserPlus, Search, Phone, Coins, Filter, Key, Copy } from 'lucide-vue-next';

const route = useRoute();
const users = ref<User[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const roleFilter = ref<string>('ALL');

async function loadUsers() {
  loading.value = true;
  try {
    const res = await erpService.getUsers({ limit: 100 });
    if (Array.isArray(res)) {
      users.value = res;
    } else if (res && Array.isArray((res as any).data)) {
      users.value = (res as any).data;
    }
  } catch (err) {
    console.error('Failed to load users:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadUsers();
});

// Modal states
const showCreateModal = ref(false);
const formFirstName = ref('');
const formLastName = ref('');
const formRole = ref<Role>('STUDENT');
const formPhone = ref('+998');
const formEmail = ref('');
const formPassword = ref('');
const formAddress = ref('');
const formError = ref('');

// Coin Adjust modal
const showCoinModal = ref(false);
const selectedUser = ref<User | null>(null);
const coinAmount = ref(10);
const coinReason = ref('Faollik va namunali xulq uchun');

function copyUserCredentials(u: User) {
  const text = `NyVer — Kirish Ma'lumotlari:\nFoydalanuvchi: ${u.firstName} ${u.lastName}\nLogin: ${u.email || u.phone}\nParol: ${u.tempPassword}\nKirish: ${window.location.origin}/login`;
  navigator.clipboard.writeText(text);
}

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    const matchesSearch =
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      u.phone.includes(searchQuery.value) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.value.toLowerCase()));

    const matchesRole = roleFilter.value === 'ALL' || u.role === roleFilter.value;

    return matchesSearch && matchesRole;
  });
});

function openCreateModal() {
  formFirstName.value = '';
  formLastName.value = '';
  formRole.value = 'STUDENT';
  formPhone.value = '+998';
  formEmail.value = '';
  formPassword.value = '123456';
  formAddress.value = '';
  formError.value = '';
  showCreateModal.value = true;
}

watch(
  () => route.query.role,
  (role) => {
    if (role && typeof role === 'string') {
      roleFilter.value = role;
    } else {
      roleFilter.value = 'ALL';
    }
  },
  { immediate: true }
);

watch(
  () => route.query.action,
  (action) => {
    if (action === 'create-student') {
      openCreateModal();
      formRole.value = 'STUDENT';
    } else if (action === 'create-teacher') {
      openCreateModal();
      formRole.value = 'TEACHER';
    }
  },
  { immediate: true }
);

async function handleCreateUser() {
  if (!formFirstName.value || !formLastName.value || !formPhone.value) {
    formError.value = 'Iltimos, barcha majburiy maydonlarni to\'ldiring.';
    return;
  }

  try {
    await erpService.createUser({
      firstName: formFirstName.value.trim(),
      lastName: formLastName.value.trim(),
      role: formRole.value,
      phone: formPhone.value.trim(),
      email: formEmail.value.trim() || undefined,
      password: formPassword.value.trim() || '123456',
      address: formAddress.value.trim() || undefined,
    });

    await loadUsers();
    showCreateModal.value = false;
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  }
}

function openCoinModal(user: User) {
  selectedUser.value = user;
  coinAmount.value = 10;
  coinReason.value = 'Darsdagi namunali faollik uchun';
  showCoinModal.value = true;
}

async function handleAdjustCoins() {
  if (!selectedUser.value) return;
  try {
    await erpService.updateUserCoins(selectedUser.value.id, Number(coinAmount.value), coinReason.value);
    await loadUsers();
    showCoinModal.value = false;
  } catch (err) {
    console.error(err);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title & Add Button -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Foydalanuvchilar Boshqaruvi</h1>
        <p class="text-sm text-slate-500">
          Markaz o'qituvchilari, talabalari va ma'murlarini ro'yxatga olish va boshqarish.
        </p>
      </div>

      <button
        @click="openCreateModal"
        class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
      >
        <UserPlus class="h-4 w-4" />
        Yangi Foydalanuvchi Qo'shish
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="relative flex-1">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
          <Search class="h-4 w-4" />
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Ism, familiya yoki telefon bo'yicha qidirish..."
          class="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      <div class="flex items-center gap-2">
        <Filter class="h-4 w-4 text-slate-400" />
        <select
          v-model="roleFilter"
          class="rounded-xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
        >
          <option value="ALL">Barcha rollar</option>
          <option value="STUDENT">Faqat Talabalar</option>
          <option value="TEACHER">Faqat O'qituvchilar</option>
          <option value="ADMIN">Faqat Adminlar</option>
        </select>
      </div>
    </div>

    <!-- Users Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
            <tr>
              <th class="px-6 py-3.5">Foydalanuvchi</th>
              <th class="px-6 py-3.5">Rol</th>
              <th class="px-6 py-3.5">Aloqa</th>
              <th class="px-6 py-3.5">Tangalar</th>
              <th class="px-6 py-3.5">Status</th>
              <th class="px-6 py-3.5 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr
              v-for="u in filteredUsers"
              :key="u.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs"
                    :class="
                      u.role === 'TEACHER'
                        ? 'bg-emerald-100 text-emerald-700'
                        : u.role === 'ADMIN' || u.role === 'SUPERADMIN'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-amber-100 text-amber-700'
                    "
                  >
                    {{ u.firstName?.charAt(0) || 'U' }}{{ u.lastName?.charAt(0) || '' }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 text-sm">
                      {{ u.firstName }} {{ u.lastName }}
                    </p>
                    <p class="text-[11px] text-slate-400">ID: #{{ u.id }}</p>
                  </div>
                </div>
              </td>

              <td class="px-6 py-4">
                <Badge
                  :variant="
                    u.role === 'TEACHER'
                      ? 'success'
                      : u.role === 'ADMIN' || u.role === 'SUPERADMIN'
                      ? 'info'
                      : 'warning'
                  "
                >
                  {{ u.role }}
                </Badge>
              </td>

              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5 font-medium text-slate-800">
                  <Phone class="h-3 w-3 text-slate-400" />
                  <span>{{ u.phone }}</span>
                </div>
                <div v-if="u.email" class="text-slate-400 text-[11px] mt-0.5">
                  {{ u.email }}
                </div>
                <div v-if="u.tempPassword" class="mt-1.5 flex items-center gap-1">
                  <span class="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md" title="Vaqtinchalik parol">
                    <Key class="w-3 h-3 text-indigo-500" />
                    <span>{{ u.tempPassword }}</span>
                  </span>
                  <button
                    @click.stop="copyUserCredentials(u)"
                    class="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                    title="Login va parolni nusxalash"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <td class="px-6 py-4">
                <div v-if="u.role === 'STUDENT'" class="flex items-center gap-2">
                  <span class="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                    <Coins class="h-3.5 w-3.5" />
                    {{ u.coins }}
                  </span>
                  <button
                    @click="openCoinModal(u)"
                    title="Tanga berish yoki o'zgartirish"
                    class="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                  >
                    O'zgartirish
                  </button>
                </div>
                <span v-else class="text-slate-400">—</span>
              </td>

              <td class="px-6 py-4">
                <Badge :variant="u.status === 'ACTIVE' ? 'success' : 'danger'">
                  {{ u.status }}
                </Badge>
              </td>

              <td class="px-6 py-4 text-right">
                <span class="text-xs text-slate-400">
                  {{ new Date(u.created_at).toLocaleDateString('uz-UZ') }}
                </span>
              </td>
            </tr>

            <tr v-if="filteredUsers.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                Foydalanuvchilar topilmadi
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create User Modal -->
    <Modal
      :show="showCreateModal"
      title="Yangi Foydalanuvchi Qo'shish"
      description="Offline markaz qoidasi: Hisob faqat ma'muriyat tomonidan ochiladi."
      maxWidth="lg"
      @close="showCreateModal = false"
    >
      <div class="space-y-4 text-xs">
        <div v-if="formError" class="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
          {{ formError }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Ism *</label>
            <input
              v-model="formFirstName"
              type="text"
              required
              placeholder="Masalan: Anvar"
              class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Familiya *</label>
            <input
              v-model="formLastName"
              type="text"
              required
              placeholder="Masalan: Zokirov"
              class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Tizimdagi Roli *</label>
            <select
              v-model="formRole"
              class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="STUDENT">Talaba (Student)</option>
              <option value="TEACHER">O'qituvchi (Teacher)</option>
              <option value="ADMIN">Ma'mur (Admin)</option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Telefon Raqami *</label>
            <input
              v-model="formPhone"
              type="text"
              required
              placeholder="+998 90 123 45 67"
              class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Email (Ixtiyoriy)</label>
            <input
              v-model="formEmail"
              type="email"
              placeholder="one.humoyun@gmail.com"
              class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Boshlang'ich Parol *</label>
            <input
              v-model="formPassword"
              type="text"
              placeholder="123456"
              class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Manzil yoki Eslatma</label>
          <input
            v-model="formAddress"
            type="text"
            placeholder="Toshkent sh., Chilonzor tumani..."
            class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCreateModal = false"
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          @click="handleCreateUser"
          class="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] rounded-xl cursor-pointer shadow-xs"
        >
          Saqlash va Hisob Ochish
        </button>
      </template>
    </Modal>

    <!-- Adjust Coins Modal -->
    <Modal
      :show="showCoinModal"
      title="Talabaga Tanga Qo'shish / Ayirish"
      maxWidth="md"
      @close="showCoinModal = false"
    >
      <div v-if="selectedUser" class="space-y-3 text-xs">
        <p class="text-slate-600">
          Talaba: <span class="font-bold text-slate-900">{{ selectedUser.firstName }} {{ selectedUser.lastName }}</span>
          (Hozirgi balansi: <span class="text-amber-600 font-bold">{{ selectedUser.coins }} coin</span>)
        </p>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Tanga Miqdori (+/-)</label>
          <input
            v-model.number="coinAmount"
            type="number"
            placeholder="Masalan: +15 yoki -10"
            class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Sabab / Izoh</label>
          <input
            v-model="coinReason"
            type="text"
            placeholder="Faol qatnashganligi uchun..."
            class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      <template #footer>
        <button
          @click="showCoinModal = false"
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          @click="handleAdjustCoins"
          class="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer"
        >
          Tangalarni Yangilash
        </button>
      </template>
    </Modal>
  </div>
</template>
