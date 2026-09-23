<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { Course, Room, User } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Badge from '../../components/ui/Badge.vue';
import {
  X,
  Trash2,
  Pen,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// Active Tab: 'courses' | 'rooms' | 'staff'
const activeTab = ref<'courses' | 'rooms' | 'staff'>('courses');

const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const staff = ref<User[]>([]);
const loading = ref(false);

// Slide-over Drawer for Course Create (Matching Image 5)
const showCourseDrawer = ref(false);
const courseFormName = ref('');
const courseFormLessonDuration = ref('80 daqiqa');
const courseFormMonths = ref<number>(6);
const courseFormPrice = ref<number | string>('');
const courseFormDescription = ref('');
const courseSubmitting = ref(false);
const courseError = ref('');

// Room Modal
const showRoomModal = ref(false);
const isEditingRoom = ref(false);
const editingRoomId = ref<number | null>(null);
const roomFormName = ref('');
const roomFormCapacity = ref(20);
const roomSubmitting = ref(false);

// Staff Modal
const showStaffModal = ref(false);
const staffFormFirstName = ref('');
const staffFormLastName = ref('');
const staffFormRole = ref<'ADMIN' | 'ASSISTANT'>('ADMIN');
const staffFormPhone = ref('+998');
const staffFormEmail = ref('');
const staffFormPassword = ref('123456');
const staffSubmitting = ref(false);

async function loadData() {
  loading.value = true;
  try {
    const [coursesRes, roomsRes, usersRes] = await Promise.allSettled([
      erpService.getCourses(),
      erpService.getRooms(),
      erpService.getUsers({ limit: 100 }),
    ]);

    if (coursesRes.status === 'fulfilled' && coursesRes.value) {
      const val = coursesRes.value;
      courses.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (roomsRes.status === 'fulfilled' && roomsRes.value) {
      const val = roomsRes.value;
      rooms.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      const allUsers: User[] = Array.isArray(val) ? val : (val as any).data || [];
      staff.value = allUsers.filter((u) => u.role === 'ADMIN' || u.role === 'SUPERADMIN' || u.role === 'ASSISTANT');
    }
  } catch (err) {
    console.error("Boshqaruv ma'lumotlarini yuklashda xatolik:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

// Sync route with active tab
watch(
  () => route.path,
  (path) => {
    if (path.includes('/course') || path === '/management/course') {
      activeTab.value = 'courses';
    } else if (path.includes('/room') || path === '/management/rooms') {
      activeTab.value = 'rooms';
    } else if (path.includes('/staff') || path === '/management/staff') {
      activeTab.value = 'staff';
    }
  },
  { immediate: true }
);

function switchTab(tab: 'courses' | 'rooms' | 'staff') {
  activeTab.value = tab;
  if (tab === 'courses') router.push('/management/course');
  else if (tab === 'rooms') router.push('/management/rooms');
  else if (tab === 'staff') router.push('/management/staff');
}

// Course Drawer methods
function openCreateCourseDrawer() {
  courseFormName.value = '';
  courseFormLessonDuration.value = '80 daqiqa';
  courseFormMonths.value = 6;
  courseFormPrice.value = '';
  courseFormDescription.value = '';
  courseError.value = '';
  showCourseDrawer.value = true;
}

async function handleSaveCourse() {
  if (!courseFormName.value.trim() || !courseFormPrice.value) {
    courseError.value = 'Kurs nomi va narxini kiritish shart.';
    return;
  }
  courseSubmitting.value = true;
  try {
    await erpService.createCourse({
      name: courseFormName.value.trim(),
      price: Number(courseFormPrice.value),
      durationMonths: Number(courseFormMonths.value),
      description: courseFormDescription.value.trim() || undefined,
      lessonsPerMonth: 12,
      totalLessons: Number(courseFormMonths.value) * 12,
    });
    showCourseDrawer.value = false;
    await loadData();
  } catch (err: any) {
    courseError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    courseSubmitting.value = false;
  }
}

async function handleDeleteCourse(course: Course) {
  if (!confirm(`Haqiqatan ham "${course.name}" kursini o'chirmoqchimisiz?`)) return;
  try {
    await erpService.deleteCourse(course.id);
    await loadData();
  } catch (err) {
    console.error("Kursni o'chirishda xatolik:", err);
  }
}

// Room methods
function openCreateRoomModal() {
  editingRoomId.value = null;
  isEditingRoom.value = false;
  roomFormName.value = '';
  roomFormCapacity.value = 20;
  showRoomModal.value = true;
}

function openEditRoomModal(room: Room) {
  editingRoomId.value = room.id;
  isEditingRoom.value = true;
  roomFormName.value = room.name;
  roomFormCapacity.value = room.capacity;
  showRoomModal.value = true;
}

async function handleSaveRoom() {
  if (!roomFormName.value.trim()) return;
  roomSubmitting.value = true;
  try {
    if (isEditingRoom.value && editingRoomId.value) {
      await erpService.updateRoom(editingRoomId.value, {
        name: roomFormName.value.trim(),
        capacity: Number(roomFormCapacity.value),
      });
    } else {
      await erpService.createRoom({
        name: roomFormName.value.trim(),
        capacity: Number(roomFormCapacity.value),
      });
    }
    showRoomModal.value = false;
    roomFormName.value = '';
    editingRoomId.value = null;
    isEditingRoom.value = false;
    await loadData();
  } catch (err) {
    console.error("Xonani saqlashda xatolik:", err);
  } finally {
    roomSubmitting.value = false;
  }
}

async function handleDeleteRoom(room: Room) {
  if (!confirm(`Haqiqatan ham "${room.name}" xonasini o'chirmoqchimisiz?`)) return;
  try {
    await erpService.deleteRoom(room.id);
    await loadData();
  } catch (err) {
    console.error("Xonani o'chirishda xatolik:", err);
  }
}

// Staff methods
async function handleCreateStaff() {
  if (!staffFormFirstName.value || !staffFormLastName.value || !staffFormPhone.value) return;
  staffSubmitting.value = true;
  try {
    await erpService.createUser({
      firstName: staffFormFirstName.value.trim(),
      lastName: staffFormLastName.value.trim(),
      role: staffFormRole.value,
      phone: staffFormPhone.value.trim(),
      email: staffFormEmail.value.trim() || undefined,
      password: staffFormPassword.value.trim() || '123456',
    });
    showStaffModal.value = false;
    await loadData();
  } catch (err) {
    console.error("Xodim qo'shishda xatolik:", err);
  } finally {
    staffSubmitting.value = false;
  }
}

function formatMoney(amount: number | string): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}
</script>

<template>
  <div class="space-y-6 relative">
    <!-- Top Header: Title (Matching Image 4) -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
        Boshqarish
      </h1>
    </div>

    <!-- Sub-navigation Tabs: Kurslar, Xonalar, Xodimlar (Matching Image 4) -->
    <div class="flex items-center gap-6 border-b border-slate-200/80 text-sm font-semibold">
      <button
        @click="switchTab('courses')"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="
          activeTab === 'courses'
            ? 'text-[#6D28D9] font-bold'
            : 'text-slate-500 hover:text-slate-800'
        "
      >
        <span>Kurslar</span>
        <span
          v-if="activeTab === 'courses'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>

      <button
        @click="switchTab('rooms')"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="
          activeTab === 'rooms'
            ? 'text-[#6D28D9] font-bold'
            : 'text-slate-500 hover:text-slate-800'
        "
      >
        <span>Xonalar</span>
        <span
          v-if="activeTab === 'rooms'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>

      <button
        @click="switchTab('staff')"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="
          activeTab === 'staff'
            ? 'text-[#6D28D9] font-bold'
            : 'text-slate-500 hover:text-slate-800'
        "
      >
        <span>Xodimlar</span>
        <span
          v-if="activeTab === 'staff'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>
    </div>

    <!-- TAB 1: KURSLAR (Matching Image 4 Card Layout) -->
    <div v-if="activeTab === 'courses'" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
      <!-- Card Header: Left title "Kurslar", Right purple button "+ Kurslar qo'shish" -->
      <div class="flex items-center justify-between">
        <h2 class="text-base font-extrabold text-slate-900">
          Kurslar
        </h2>

        <button
          @click="openCreateCourseDrawer"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
        >
          <span class="text-base leading-none">+</span>
          <span>Kurslar qo'shish</span>
        </button>
      </div>

      <!-- Courses Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-[12px] bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
            <tr>
              <th class="py-3 px-4">Kurs Nomi</th>
              <th class="py-3 px-4">Davomiyligi</th>
              <th class="py-3 px-4">Oylik Narxi</th>
              <th class="py-3 px-4">Ta'rif (Description)</th>
              <th class="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="5" class="py-8 text-center text-slate-400">Kurslar yuklanmoqda...</td>
            </tr>
            <tr v-else-if="courses.length === 0">
              <td colspan="5" class="py-8 text-center text-slate-400">Hozircha kurslar mavjud emas</td>
            </tr>
            <tr v-for="c in courses" :key="c.id" class="hover:bg-slate-50/60 transition-colors">
              <td class="py-3.5 px-4 font-bold text-slate-900 text-sm">
                {{ c.name }}
              </td>
              <td class="py-3.5 px-4 font-semibold text-slate-700">
                {{ c.durationMonths }} oy ({{ c.totalLessons }} dars)
              </td>
              <td class="py-3.5 px-4 font-extrabold text-[#6D28D9]">
                {{ formatMoney(c.price) }}
              </td>
              <td class="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                {{ c.description || '-' }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <button
                  @click="handleDeleteCourse(c)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="O'chirish"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: XONALAR -->
    <div v-if="activeTab === 'rooms'" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-extrabold text-slate-900">
          Xonalar
        </h2>

        <button
          @click="openCreateRoomModal"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
        >
          <span class="text-base leading-none">+</span>
          <span>Xona qo'shish</span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-[12px] bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
            <tr>
              <th class="py-3 px-4">Xona Nomi</th>
              <th class="py-3 px-4">O'rinlar Sig'imi</th>
              <th class="py-3 px-4">Holati</th>
              <th class="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="rooms.length === 0">
              <td colspan="4" class="py-8 text-center text-slate-400">Hozircha xonalar mavjud emas</td>
            </tr>
            <tr v-for="r in rooms" :key="r.id" class="hover:bg-slate-50/60 transition-colors">
              <td class="py-3.5 px-4 font-bold text-slate-900 text-sm">
                {{ r.name }}
              </td>
              <td class="py-3.5 px-4 font-bold text-slate-700">
                {{ r.capacity }} o'rin
              </td>
              <td class="py-3.5 px-4">
                <Badge variant="success">{{ r.status }}</Badge>
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="openEditRoomModal(r)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pen class="h-4 w-4" />
                  </button>
                  <button
                    @click="handleDeleteRoom(r)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: XODIMLAR -->
    <div v-if="activeTab === 'staff'" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-extrabold text-slate-900">
          Xodimlar
        </h2>

        <button
          @click="showStaffModal = true"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
        >
          <span class="text-base leading-none">+</span>
          <span>Xodim qo'shish</span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-[12px] bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
            <tr>
              <th class="py-3 px-4">F.I.Sh.</th>
              <th class="py-3 px-4">Lavozim</th>
              <th class="py-3 px-4">Telefon</th>
              <th class="py-3 px-4">Email</th>
              <th class="py-3 px-4">Holat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-for="s in staff" :key="s.id" class="hover:bg-slate-50/60 transition-colors">
              <td class="py-3.5 px-4 font-bold text-slate-900 text-sm">
                {{ s.firstName }} {{ s.lastName }}
              </td>
              <td class="py-3.5 px-4">
                <Badge :variant="s.role === 'SUPERADMIN' ? 'danger' : 'info'">{{ s.role }}</Badge>
              </td>
              <td class="py-3.5 px-4 font-mono text-slate-700">
                {{ s.phone }}
              </td>
              <td class="py-3.5 px-4 text-slate-500">
                {{ s.email || '-' }}
              </td>
              <td class="py-3.5 px-4">
                <Badge variant="success">{{ s.status }}</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= SLIDE-OVER DRAWER: KURS QO'SHISH (Matching Image 5) ================= -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showCourseDrawer"
        class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end"
        @click="showCourseDrawer = false"
      >
        <div
          class="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
          @click.stop
        >
          <!-- Drawer Header (Matching Image 5) -->
          <div class="p-6 pb-4 border-b border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-slate-900 leading-tight">
                  Kurs qo'shish
                </h3>
                <p class="text-xs text-slate-500 mt-1">
                  Bu yerda siz yangi kurs qo'shishingiz mumkin.
                </p>
              </div>

              <button
                @click="showCourseDrawer = false"
                type="button"
                class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Drawer Body: Form Fields matching Image 5 -->
          <form @submit.prevent="handleSaveCourse" id="courseForm" class="p-6 space-y-4.5 flex-1">
            <div v-if="courseError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {{ courseError }}
            </div>

            <!-- 1. Nomi -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Nomi</label>
              <input
                v-model="courseFormName"
                type="text"
                required
                placeholder="HR Manager..."
                class="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400"
              />
            </div>

            <!-- 2. Dars davomiyligi -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Dars davomiyligi</label>
              <select
                v-model="courseFormLessonDuration"
                class="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-slate-700"
              >
                <option value="60 daqiqa">60 daqiqa</option>
                <option value="80 daqiqa">80 daqiqa</option>
                <option value="90 daqiqa">90 daqiqa</option>
                <option value="120 daqiqa">120 daqiqa</option>
              </select>
            </div>

            <!-- 3. Kurs davomiyligi (oylarda) -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Kurs davomiyligi (oylarda)</label>
              <select
                v-model="courseFormMonths"
                class="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-slate-700"
              >
                <option :value="1">1 oy</option>
                <option :value="2">2 oy</option>
                <option :value="3">3 oy</option>
                <option :value="4">4 oy</option>
                <option :value="5">5 oy</option>
                <option :value="6">6 oy</option>
                <option :value="9">9 oy</option>
                <option :value="12">12 oy</option>
              </select>
            </div>

            <!-- 4. Narx -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Narx</label>
              <input
                v-model="courseFormPrice"
                type="number"
                required
                min="0"
                step="10000"
                placeholder="Narxini kiriting"
                class="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400"
              />
            </div>

            <!-- 5. Description -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Description</label>
              <textarea
                v-model="courseFormDescription"
                rows="4"
                placeholder="A little about the company and the team that you'll be working with."
                class="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400 resize-none"
              ></textarea>
              <p class="text-[11px] text-slate-400 mt-1">This is a hint text to help user.</p>
            </div>
          </form>

          <!-- Drawer Footer: Bekor qilish & Saqlash (Matching Image 5) -->
          <div class="p-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              @click="showCourseDrawer = false"
              type="button"
              class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              form="courseForm"
              :disabled="courseSubmitting"
              class="px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {{ courseSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Room Modal -->
    <Modal :show="showRoomModal" :title="isEditingRoom ? 'Xonani Tahrirlash' : 'Yangi Xona Qo\'shish'" @close="showRoomModal = false">
      <form @submit.prevent="handleSaveRoom" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Xona Nomi *</label>
          <input
            v-model="roomFormName"
            type="text"
            required
            placeholder="Xona #301 (Design Studio)"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">O'rinlar Sig'imi *</label>
          <input
            v-model="roomFormCapacity"
            type="number"
            min="1"
            max="100"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button @click="showRoomModal = false" type="button" class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">
            Bekor qilish
          </button>
          <button type="submit" :disabled="roomSubmitting" class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition cursor-pointer shadow-xs">
            Saqlash
          </button>
        </div>
      </form>
    </Modal>

    <!-- Staff Modal -->
    <Modal :show="showStaffModal" title="Yangi Xodim Qo'shish" @close="showStaffModal = false">
      <form @submit.prevent="handleCreateStaff" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ism *</label>
            <input v-model="staffFormFirstName" type="text" required class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Familiya *</label>
            <input v-model="staffFormLastName" type="text" required class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
            <input v-model="staffFormPhone" type="text" required class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Lavozim *</label>
            <select v-model="staffFormRole" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]">
              <option value="ADMIN">Admin</option>
              <option value="ASSISTANT">Assistent</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Email</label>
          <input v-model="staffFormEmail" type="email" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
        </div>
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button @click="showStaffModal = false" type="button" class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">
            Bekor qilish
          </button>
          <button type="submit" :disabled="staffSubmitting" class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition cursor-pointer shadow-xs">
            Saqlash
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
