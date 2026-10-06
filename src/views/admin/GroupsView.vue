<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Group, Course, Room, User, WeekDay } from '../../types';
import {
  Users,
  UserCheck,
  GraduationCap,
  MoreVertical,
  RefreshCw,
  X,
  Clock,
  Calendar,
  Check,
  Archive,
  RotateCcw,
  Trash2,
  Pen,
  BookOpen,
} from 'lucide-vue-next';

const groups = ref<Group[]>([]);
const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const teachers = ref<User[]>([]);
const students = ref<User[]>([]);
const loading = ref(false);

const activeTab = ref<'GROUPS' | 'ARCHIVE'>('GROUPS');
const searchQuery = ref('');

// Slide-Over Drawer State (Images 4 & 5)
const showDrawer = ref(false);
const isEditing = ref(false);
const currentEditingId = ref<number | null>(null);

const formName = ref('');
const formCourseId = ref<number | string>('');
const formPlanId = ref<number | string>('');
const formRoomId = ref<number | string>('');
const formWeekDays = ref<WeekDay[]>(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
const formDurationMonths = ref<number>(3);
const formStartTime = ref('14:00');
const formStartDate = ref('2026-03-01');
const formMaxStudents = ref<number>(15);
const formMainTeacherId = ref<number | string>('');
const formAssistantTeacherId = ref<number | string>('');
const formDescription = ref('');
const formSelectedTeacherIds = ref<number[]>([]);
const formSelectedStudentIds = ref<number[]>([]);
const isSubmitting = ref(false);
const formError = ref('');
const showTeacherPicker = ref(false);
const showStudentPicker = ref(false);

const selectedCourseObj = computed(() => {
  if (!formCourseId.value) return null;
  return courses.value.find((c) => c.id === Number(formCourseId.value)) || null;
});

const availableCoursePlans = computed(() => {
  if (!selectedCourseObj.value?.plans) return [];
  // Latest plan (highest id or isDefault) first
  return [...selectedCourseObj.value.plans].sort((a, b) => b.id - a.id);
});

const currentSelectedPlan = computed(() => {
  if (!formPlanId.value || !selectedCourseObj.value?.plans) return null;
  return selectedCourseObj.value.plans.find((p) => p.id === Number(formPlanId.value)) || null;
});

watch(formCourseId, async (newId) => {
  if (!newId) {
    formPlanId.value = '';
    return;
  }
  const course = courses.value.find((c) => c.id === Number(newId));
  if (course) {
    if (course.durationMonths) {
      formDurationMonths.value = course.durationMonths;
    }

    // If plans not loaded yet, fetch them from server
    if (!course.plans || course.plans.length === 0) {
      try {
        const loadedPlans = await erpService.getCoursePlans(course.id);
        if (loadedPlans && loadedPlans.length > 0) {
          course.plans = loadedPlans;
        }
      } catch (e) {
        console.warn("Could not fetch course plans:", e);
      }
    }

    if (course.plans && course.plans.length > 0) {
      // Default: oxirgi dars jadval olinadi (highest id or isDefault)
      const sortedPlans = [...course.plans].sort((a, b) => b.id - a.id);
      const latestPlan = sortedPlans.find((p) => p.isDefault) || sortedPlans[0];
      formPlanId.value = latestPlan.id;
    } else {
      formPlanId.value = '';
    }
  }
});

// Dynamic lesson calculations based on selected days and durationMonths:
const daysPerWeekCount = computed(() => formWeekDays.value.length || 3);
const lessonsPerMonthCount = computed(() => daysPerWeekCount.value * 4);
const totalCalculatedLessons = computed(() => lessonsPerMonthCount.value * (Number(formDurationMonths.value) || 1));
const calculatedEndDate = computed(() => {
  if (!formStartDate.value) return '2026-06-01';
  try {
    const d = new Date(formStartDate.value);
    d.setMonth(d.getMonth() + (Number(formDurationMonths.value) || 3));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  } catch {
    return '2026-06-01';
  }
});

// Real Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

// All week days options matching Images 4 & 5 (2-column grid)
const weekDayOptions: { label: string; value: WeekDay }[] = [
  { label: 'Dushanba', value: 'MONDAY' },
  { label: 'Seshanba', value: 'TUESDAY' },
  { label: 'Chorshanba', value: 'WEDNESDAY' },
  { label: 'Payshanba', value: 'THURSDAY' },
  { label: 'Juma', value: 'FRIDAY' },
  { label: 'Shanba', value: 'SATURDAY' },
  { label: 'Yakshanba', value: 'SUNDAY' },
];

function toggleWeekDay(day: WeekDay) {
  const idx = formWeekDays.value.indexOf(day);
  if (idx > -1) {
    formWeekDays.value.splice(idx, 1);
  } else {
    formWeekDays.value.push(day);
  }
}

function formatWeekDaysList(days?: string[]): string {
  if (!days || days.length === 0) return 'Du, Se, Chor, Pay, Ju';
  const map: Record<string, string> = {
    MONDAY: 'Du',
    TUESDAY: 'Se',
    WEDNESDAY: 'Chor',
    THURSDAY: 'Pay',
    FRIDAY: 'Ju',
    SATURDAY: 'Shan',
    SUNDAY: 'Yak',
  };
  return days.map((d) => map[d] || d).join(', ');
}

const activeMenuGroupId = ref<number | null>(null);

function toggleRowMenu(id: number) {
  activeMenuGroupId.value = activeMenuGroupId.value === id ? null : id;
}

async function toggleGroupStatus(group: Group) {
  const newStatus = group.status === 'ACTIVE' ? 'PLANNED' : 'ACTIVE';
  try {
    await erpService.updateGroup(group.id, { status: newStatus as any });
    group.status = newStatus as any;
  } catch (err) {
    console.error('Statusni o\'zgartirishda xatolik:', err);
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [gRes, cRes, rRes, uRes] = await Promise.allSettled([
      erpService.getGroups(),
      erpService.getCourses(),
      erpService.getRooms(),
      erpService.getUsers({ limit: 100 }),
    ]);

    if (gRes.status === 'fulfilled' && gRes.value) {
      const val = gRes.value;
      groups.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (cRes.status === 'fulfilled' && cRes.value) {
      const val = cRes.value;
      courses.value = Array.isArray(val) ? val : (val as any).data || [];
      if (courses.value.length > 0 && !formCourseId.value) {
        formCourseId.value = courses.value[0].id;
      }
    }
    if (rRes.status === 'fulfilled' && rRes.value) {
      const val = rRes.value;
      rooms.value = Array.isArray(val) ? val : (val as any).data || [];
      if (rooms.value.length > 0 && !formRoomId.value) {
        formRoomId.value = rooms.value[0].id;
      }
    }
    if (uRes.status === 'fulfilled' && uRes.value) {
      const val = uRes.value;
      const allUsers: User[] = Array.isArray(val) ? val : (val as any).data || [];
      teachers.value = allUsers.filter((u) => u.role === 'TEACHER');
      students.value = allUsers.filter((u) => u.role === 'STUDENT');
      if (teachers.value.length > 0 && formSelectedTeacherIds.value.length === 0) {
        formSelectedTeacherIds.value = [teachers.value[0].id];
      }
    }
  } catch (err) {
    console.error('Guruhlar ma\'lumotlarini yuklashda xatolik:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

const activeGroupsCount = computed(
  () => groups.value.filter((g) => g.status === 'ACTIVE' || g.status === 'PLANNED').length
);
const archiveGroupsCount = computed(
  () => groups.value.filter((g) => g.status === 'COMPLETED' || g.status === 'CANCELLED').length
);

const filteredGroups = computed(() => {
  let list = groups.value;
  if (activeTab.value === 'ARCHIVE') {
    list = list.filter((g) => g.status === 'COMPLETED' || g.status === 'CANCELLED');
  } else {
    list = list.filter((g) => g.status === 'ACTIVE' || g.status === 'PLANNED');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.course?.name?.toLowerCase().includes(q) ||
        getGroupTeacher(g).toLowerCase().includes(q) ||
        g.room?.name?.toLowerCase().includes(q)
    );
  }
  return list;
});

// ================= REAL WORKING PAGINATION =================
const totalPages = computed(() => Math.max(1, Math.ceil(filteredGroups.value.length / itemsPerPage)));

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredGroups.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, activeTab], () => {
  currentPage.value = 1;
});

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function goToPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
  }
}

const paginationDisplayPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: (number | string)[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
  }
  return pages;
});

function getGroupTeacher(group: Group): string {
  if ((group as any).teachers && (group as any).teachers.length > 0) {
    const t = (group as any).teachers[0].teacher;
    if (t) return `${t.firstName} ${t.lastName || ''}`.trim();
  }
  return 'O\'qituvchi yo\'q';
}

function getGroupDuration(group: Group): string {
  if (group.course?.durationMonths) {
    return `${group.course.durationMonths} oy`;
  }
  return '4 oy';
}

function getStudentCount(group: Group): number {
  return (group as any)._count?.students ?? (group as any).students?.length ?? 0;
}

// ================= DRAWER OPEN / CLOSE =================
function openCreateDrawer() {
  isEditing.value = false;
  currentEditingId.value = null;
  formName.value = '';
  formCourseId.value = courses.value[0]?.id || '';
  const firstCourse = courses.value[0];
  formPlanId.value = firstCourse?.plans?.find((p) => p.isDefault)?.id || firstCourse?.plans?.[0]?.id || '';
  formRoomId.value = rooms.value[0]?.id || '';
  formWeekDays.value = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
  formDurationMonths.value = courses.value[0]?.durationMonths || 6;
  formStartTime.value = '14:00';
  formStartDate.value = new Date().toISOString().split('T')[0];
  formMaxStudents.value = 15;
  formDescription.value = '';
  formMainTeacherId.value = teachers.value[0]?.id || '';
  formAssistantTeacherId.value = teachers.value[1]?.id || '';
  formSelectedTeacherIds.value = teachers.value[0]?.id ? [teachers.value[0].id] : [];
  formSelectedStudentIds.value = [];
  formError.value = '';
  showTeacherPicker.value = false;
  showStudentPicker.value = false;
  showDrawer.value = true;
}

function openEditDrawer(group: Group) {
  isEditing.value = true;
  currentEditingId.value = group.id;
  formName.value = group.name;
  formCourseId.value = group.courseId;
  formPlanId.value = group.planId || (group.plan ? group.plan.id : '');
  formRoomId.value = group.roomId;
  formWeekDays.value = (group.weekDays as WeekDay[]) || ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
  formDurationMonths.value = group.course?.durationMonths || 3;
  formStartTime.value = group.startTime || '14:00';
  formStartDate.value = group.startDate ? String(group.startDate).split('T')[0] : '2026-03-01';
  formMaxStudents.value = group.maxStudents || 15;
  formDescription.value = (group as any).description || '';

  const mainT = (group as any).teachers?.find((t: any) => t.isMain || t.role === 'MAIN')?.teacherId 
    || (group as any).teachers?.[0]?.teacherId 
    || (group as any).teachers?.[0]?.id 
    || teachers.value[0]?.id || '';
  const asstT = (group as any).teachers?.find((t: any) => !t.isMain || t.role === 'ASSISTANT')?.teacherId 
    || (group as any).teachers?.[1]?.teacherId 
    || (group as any).teachers?.[1]?.id || '';

  formMainTeacherId.value = mainT;
  formAssistantTeacherId.value = asstT;

  const tIds: number[] = [];
  if (mainT) tIds.push(Number(mainT));
  if (asstT) tIds.push(Number(asstT));
  formSelectedTeacherIds.value = tIds;

  const sIds: number[] = [];
  if ((group as any).students) {
    (group as any).students.forEach((item: any) => {
      if (item.studentId || item.student?.id) {
        sIds.push(item.studentId || item.student.id);
      }
    });
  }
  formSelectedStudentIds.value = sIds;

  formError.value = '';
  showTeacherPicker.value = false;
  showStudentPicker.value = false;
  showDrawer.value = true;
}

function closeDrawer() {
  showDrawer.value = false;
  showTeacherPicker.value = false;
  showStudentPicker.value = false;
}

function getTeacherNameById(id: number): string {
  const t = teachers.value.find((item) => item.id === id);
  return t ? `${t.firstName} ${t.lastName || ''}`.trim() : `Ustoz #${id}`;
}

function removeSelectedTeacher(id: number) {
  formSelectedTeacherIds.value = formSelectedTeacherIds.value.filter((item) => item !== id);
}

function toggleTeacherSelection(id: number) {
  const idx = formSelectedTeacherIds.value.indexOf(id);
  if (idx > -1) {
    formSelectedTeacherIds.value.splice(idx, 1);
  } else {
    formSelectedTeacherIds.value.push(id);
  }
}

function getStudentNameById(id: number): string {
  const s = students.value.find((item) => item.id === id);
  return s ? `${s.firstName} ${s.lastName || ''}`.trim() : `Talaba #${id}`;
}

function removeSelectedStudent(id: number) {
  formSelectedStudentIds.value = formSelectedStudentIds.value.filter((item) => item !== id);
}

function toggleStudentSelection(id: number) {
  const idx = formSelectedStudentIds.value.indexOf(id);
  if (idx > -1) {
    formSelectedStudentIds.value.splice(idx, 1);
  } else {
    formSelectedStudentIds.value.push(id);
  }
}

// Calculate endTime: 120 minutes after startTime
function calculateEndTime(start: string): string {
  if (!start) return '16:00';
  const parts = start.split(':');
  if (parts.length < 2) return '16:00';
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  hours = (hours + 2) % 24;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

async function handleSaveGroup() {
  if (!formName.value.trim()) {
    formError.value = "Iltimos, guruh nomini kiriting.";
    return;
  }
  if (!formCourseId.value) {
    formError.value = "Iltimos, kursni tanlang.";
    return;
  }
  if (!formRoomId.value) {
    formError.value = "Iltimos, xonani tanlang.";
    return;
  }
  if (formWeekDays.value.length === 0) {
    formError.value = "Iltimos, kamida bitta dars kunini tanlang.";
    return;
  }

  isSubmitting.value = true;
  formError.value = '';

  const calculatedEndTime = calculateEndTime(formStartTime.value);
  const mainT = formMainTeacherId.value ? Number(formMainTeacherId.value) : (teachers.value[0]?.id ?? 1);
  const asstT = formAssistantTeacherId.value ? Number(formAssistantTeacherId.value) : undefined;

  try {
    if (isEditing.value && currentEditingId.value) {
      await erpService.updateGroup(currentEditingId.value, {
        name: formName.value.trim(),
        courseId: Number(formCourseId.value),
        planId: formPlanId.value ? Number(formPlanId.value) : undefined,
        roomId: Number(formRoomId.value),
        startTime: formStartTime.value,
        endTime: calculatedEndTime,
        startDate: formStartDate.value,
        endDate: calculatedEndDate.value,
        teacherId: mainT,
        maxStudents: Number(formMaxStudents.value) || 15,
      });

      // Update teachers (Main & Assistant)
      try {
        await erpService.addTeacherToGroup(currentEditingId.value, mainT, true);
        if (asstT) {
          await erpService.addTeacherToGroup(currentEditingId.value, asstT, false);
        }
      } catch {
        // ignore
      }

      // Update students
      for (const sId of formSelectedStudentIds.value) {
        try {
          await erpService.addStudentToGroup(currentEditingId.value, sId);
        } catch {
          // ignore
        }
      }
    } else {
      const created = await erpService.createGroup({
        name: formName.value.trim(),
        courseId: Number(formCourseId.value),
        planId: formPlanId.value ? Number(formPlanId.value) : undefined,
        roomId: Number(formRoomId.value),
        teacherId: mainT,
        startDate: formStartDate.value,
        startTime: formStartTime.value,
        endTime: calculatedEndTime,
        weekDays: formWeekDays.value,
        maxStudents: Number(formMaxStudents.value) || 15,
      });

      const newGroupId = (created as any)?.id || (created as any)?.data?.id;
      if (newGroupId) {
        try {
          await erpService.addTeacherToGroup(newGroupId, mainT, true);
          if (asstT) {
            await erpService.addTeacherToGroup(newGroupId, asstT, false);
          }
        } catch {
          // ignore
        }

        for (const sId of formSelectedStudentIds.value) {
          try {
            await erpService.addStudentToGroup(newGroupId, sId);
          } catch {
            // ignore
          }
        }
      }
    }

    closeDrawer();
    await loadData();
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    isSubmitting.value = false;
  }
}

async function handleArchiveGroup(group: Group) {
  if (!confirm(`Haqiqatan ham "${group.name}" guruhini arxivlamoqchimisiz?`)) return;
  try {
    await erpService.updateGroup(group.id, { status: 'COMPLETED' as any });
    await loadData();
  } catch (err) {
    console.error('Arxivlashda xatolik:', err);
  }
}

async function handleRestoreGroup(group: Group) {
  try {
    await erpService.updateGroup(group.id, { status: 'ACTIVE' as any });
    await loadData();
  } catch (err) {
    console.error('Qayta tiklashda xatolik:', err);
  }
}

async function handleDeleteGroup(group: Group) {
  if (!confirm(`DIQQAT! "${group.name}" guruhi butunlay o'chiriladi. Rozimisiz?`)) return;
  try {
    await erpService.deleteGroup(group.id);
    await loadData();
  } catch (err) {
    console.error('O\'chirishda xatolik:', err);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- ================= TOP HEADER (Matching Image 3) ================= -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
        Guruhlar
      </h1>

      <!-- + Guruh qo'shish Button (Purple - Matching Image 3) -->
      <button
        @click="openCreateDrawer"
        type="button"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] active:bg-[#4c1d95] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
      >
        <span>+ Guruh qo'shish</span>
      </button>
    </div>

    <!-- ================= TABS: Guruhlar & Arxiv (Matching Image 3) ================= -->
    <div class="flex items-center gap-2">
      <button
        @click="activeTab = 'GROUPS'"
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border"
        :class="
          activeTab === 'GROUPS'
            ? 'bg-white text-slate-900 border-slate-300 font-extrabold shadow-xs'
            : 'bg-slate-100/80 text-slate-500 border-transparent hover:bg-slate-200/70'
        "
      >
        <span>Guruhlar</span>
      </button>
      <button
        @click="activeTab = 'ARCHIVE'"
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border"
        :class="
          activeTab === 'ARCHIVE'
            ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-extrabold shadow-xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        "
      >
        <Archive class="h-3.5 w-3.5" />
        <span>Arxiv</span>
        <span v-if="archiveGroupsCount > 0" class="ml-0.5 opacity-80">({{ archiveGroupsCount }})</span>
      </button>
    </div>

    <!-- ================= 3 STAT CARDS (Matching Image 3) ================= -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Card 1: Jami guruhlar -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative">
        <div class="flex items-center justify-between">
          <div class="h-9 w-9 rounded-xl bg-slate-100/90 text-slate-700 flex items-center justify-center">
            <Users class="h-4 w-4" />
          </div>
          <button type="button" class="text-slate-300 hover:text-slate-600 transition cursor-pointer p-1">
            <MoreVertical class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-3">
          <span class="text-xs font-semibold text-slate-400 block">Jami guruhlar</span>
          <span class="text-3xl font-extrabold text-slate-900 mt-1 block">
            {{ activeGroupsCount }}
          </span>
        </div>
      </div>

      <!-- Card 2: O'qituvchilar -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative">
        <div class="flex items-center justify-between">
          <div class="h-9 w-9 rounded-xl bg-slate-100/90 text-slate-700 flex items-center justify-center">
            <UserCheck class="h-4 w-4" />
          </div>
          <button type="button" class="text-slate-300 hover:text-slate-600 transition cursor-pointer p-1">
            <MoreVertical class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-3">
          <span class="text-xs font-semibold text-slate-400 block">O'qituvchilar</span>
          <span class="text-3xl font-extrabold text-slate-900 mt-1 block">
            {{ teachers.length }}
          </span>
        </div>
      </div>

      <!-- Card 3: O'quvchilar -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative">
        <div class="flex items-center justify-between">
          <div class="h-9 w-9 rounded-xl bg-slate-100/90 text-slate-700 flex items-center justify-center">
            <GraduationCap class="h-4 w-4" />
          </div>
          <button type="button" class="text-slate-300 hover:text-slate-600 transition cursor-pointer p-1">
            <MoreVertical class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-3 flex items-end justify-between">
          <div>
            <span class="text-xs font-semibold text-slate-400 block">O'quvchilar</span>
            <span class="text-3xl font-extrabold text-slate-900 mt-1 block">
              {{ students.length }}
            </span>
          </div>

          <!-- Overlapping colored student avatar badges matching Image 3 (I, M, S) -->
          <div class="flex -space-x-2 shrink-0 pb-1">
            <span class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-2xs">
              I
            </span>
            <span class="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-2xs">
              M
            </span>
            <span class="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-2xs">
              S
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= GROUPS TABLE (Matching Image 3) ================= -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
            <tr>
              <th scope="col" class="py-4 px-5 w-44 min-w-44">Status</th>
              <th scope="col" class="py-4 px-5 min-w-36">Guruh nomi</th>
              <th scope="col" class="py-4 px-5 min-w-44">Kurs</th>
              <th scope="col" class="py-4 px-5 min-w-28">Davomiyligi</th>
              <th scope="col" class="py-4 px-5 min-w-36">Dars vaqti</th>
              <th scope="col" class="py-4 px-5 min-w-28">Xona</th>
              <th scope="col" class="py-4 px-5 min-w-28">O'qituvchi</th>
              <th scope="col" class="py-4 px-5 min-w-24">Talabalar</th>
              <th scope="col" class="py-4 px-5 w-14 min-w-14 text-right">
                <button
                  @click="loadData"
                  type="button"
                  class="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title="Yangilash"
                >
                  <RefreshCw class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="9" class="py-20 text-center text-slate-400 text-xs">
                Guruhlar yuklanmoqda...
              </td>
            </tr>

            <!-- Empty State Matching Image 3: "Hozircha guruhlar yo'q" -->
            <tr v-else-if="paginatedGroups.length === 0">
              <td colspan="9" class="py-24 text-center text-slate-400 text-sm font-medium">
                Hozircha guruhlar yo'q
              </td>
            </tr>

            <!-- Table Rows when groups exist -->
            <tr
              v-for="group in paginatedGroups"
              :key="group.id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <!-- Status (Toggle Switch + FAOL badge - Image 1) -->
              <td class="py-4 px-5 w-44 min-w-44 whitespace-nowrap">
                <div class="flex items-center gap-2.5">
                  <button
                    @click.stop="toggleGroupStatus(group)"
                    type="button"
                    class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                    :class="group.status === 'ACTIVE' ? 'bg-[#6D28D9]' : 'bg-slate-300'"
                    :title="group.status === 'ACTIVE' ? 'Faolsizlantirish' : 'Faollashtirish'"
                  >
                    <span
                      class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out"
                      :class="group.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </button>
                  <span
                    class="w-16 min-w-16 text-center inline-block py-0.5 rounded-full text-[10px] font-bold border tracking-wider shrink-0 transition-colors"
                    :class="
                      group.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    "
                  >
                    {{ group.status === 'ACTIVE' ? 'FAOL' : 'NOFAOL' }}
                  </span>
                </div>
              </td>

              <!-- Guruh nomi -->
              <td class="py-4 px-5 font-bold text-slate-900 whitespace-nowrap">
                <router-link
                  :to="`/dashboard/groups/${group.id}`"
                  class="hover:text-[#6D28D9] hover:underline"
                >
                  {{ group.name }}
                </router-link>
              </td>

              <!-- Kurs (Pill badge with purple styling - Image 1) -->
              <td class="py-4 px-5 whitespace-nowrap">
                <span class="inline-block px-3 py-0.5 rounded-full border border-purple-200 bg-purple-50/70 text-[#6D28D9] font-medium text-xs">
                  {{ group.course?.name || 'full-stack bootcamp' }}
                </span>
              </td>

              <!-- Davomiyligi -->
              <td class="py-4 px-5 text-slate-600 whitespace-nowrap">
                {{ getGroupDuration(group) }}
              </td>

              <!-- Dars vaqti (Two lines: Time bold, Days below - Image 1) -->
              <td class="py-4 px-5 whitespace-nowrap">
                <div class="font-bold text-slate-900">{{ group.startTime || '09:30' }}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">{{ formatWeekDaysList(group.weekDays) }}</div>
              </td>

              <!-- Xona -->
              <td class="py-4 px-5 text-slate-700 whitespace-nowrap">
                {{ group.room?.name || 'MFactor' }}
              </td>

              <!-- O'qituvchi -->
              <td class="py-4 px-5 text-slate-800 whitespace-nowrap font-medium">
                {{ getGroupTeacher(group) }}
              </td>

              <!-- Talabalar (Just number e.g. 0 - Image 1) -->
              <td class="py-4 px-5 whitespace-nowrap font-mono text-slate-700">
                {{ getStudentCount(group) }}
              </td>

              <!-- Amallar (3-dots ⋮ Menu - Image 1) -->
              <td class="py-4 px-5 text-right whitespace-nowrap relative">
                <div class="relative inline-block text-left">
                  <button
                    @click.stop="toggleRowMenu(group.id)"
                    type="button"
                    class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Amallar"
                  >
                    <MoreVertical class="h-4 w-4" />
                  </button>

                  <!-- Popover Menu -->
                  <div
                    v-if="activeMenuGroupId === group.id"
                    class="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1 z-30 text-xs font-semibold"
                  >
                    <router-link
                      :to="`/dashboard/groups/${group.id}`"
                      class="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition"
                    >
                      <span>Batafsil</span>
                    </router-link>
                    <button
                      @click="openEditDrawer(group); activeMenuGroupId = null"
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 transition text-left cursor-pointer"
                    >
                      <Pen class="h-3.5 w-3.5 text-slate-400" />
                      <span>Tahrirlash</span>
                    </button>
                    <button
                      v-if="group.status === 'ACTIVE' || group.status === 'PLANNED'"
                      @click="handleArchiveGroup(group); activeMenuGroupId = null"
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2 text-amber-600 hover:bg-amber-50 transition text-left cursor-pointer"
                    >
                      <Archive class="h-3.5 w-3.5" />
                      <span>Arxivlash</span>
                    </button>
                    <button
                      v-else
                      @click="handleRestoreGroup(group); activeMenuGroupId = null"
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2 text-emerald-600 hover:bg-emerald-50 transition text-left cursor-pointer"
                    >
                      <RotateCcw class="h-3.5 w-3.5" />
                      <span>Qayta tiklash</span>
                    </button>
                    <button
                      @click="handleDeleteGroup(group); activeMenuGroupId = null"
                      type="button"
                      class="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition text-left border-t border-slate-100 cursor-pointer"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                      <span>O'chirish</span>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ================= REAL WORKING PAGINATION ================= -->
      <div
        v-if="filteredGroups.length > 0"
        class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100"
      >
        <!-- ← Previous Button -->
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
        >
          ← Previous
        </button>

        <!-- Page Numbers -->
        <div class="flex items-center gap-1.5 overflow-x-auto max-w-full">
          <button
            v-for="(p, index) in paginationDisplayPages"
            :key="index"
            @click="typeof p === 'number' ? goToPage(p) : null"
            :disabled="typeof p !== 'number'"
            type="button"
            class="w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs"
            :class="
              p === currentPage
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : typeof p === 'number'
                ? 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50'
                : 'bg-transparent text-slate-400 cursor-default'
            "
          >
            {{ p }}
          </button>
        </div>

        <!-- Next → Button -->
        <button
          @click="nextPage"
          :disabled="currentPage >= totalPages"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- ================= SLIDE-OVER RIGHT DRAWER (Guruh qo'shish - Matching Images 4 & 5) ================= -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="showDrawer"
        @click="closeDrawer"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300"
      ></div>

      <!-- Drawer Panel -->
      <div
        class="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
        :class="showDrawer ? 'translate-x-0' : 'translate-x-full'"
      >
        <!-- Drawer Header (Matching Image 4 & 5) -->
        <div class="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">
              {{ isEditing ? "Guruhni tahrirlash" : "Guruh qo'shish" }}
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              {{ isEditing ? "Guruh ma'lumotlarini o'zgartiring." : "Yangi guruh yaratish uchun quyidagi ma'lumotlarni kiriting." }}
            </p>
          </div>
          <button
            @click="closeDrawer"
            type="button"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Drawer Body Form -->
        <form @submit.prevent="handleSaveGroup" class="flex-1 overflow-y-auto p-6 space-y-4">
          <div v-if="formError" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {{ formError }}
          </div>

          <!-- 1. Kurs * (Guruh kursga bog'lanadi, oylar va kunlar soni kursdan olinadi) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Kurs *</label>
            <select
              v-model="formCourseId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="" disabled>Kursni tanlang</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.durationMonths }} oy / {{ c.totalLessons || c.durationMonths * 12 }} dars)
              </option>
            </select>

            <!-- Kurs ma'lumotlari kartasi -->
            <div v-if="selectedCourseObj" class="mt-2 p-3 bg-violet-50/70 border border-violet-200/80 rounded-xl space-y-1 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-[#6D28D9]">{{ selectedCourseObj.name }}</span>
                <span class="font-semibold text-slate-700">{{ Number(selectedCourseObj.price).toLocaleString() }} so'm/oy</span>
              </div>
              <div class="flex items-center gap-3 text-[11px] text-slate-500">
                <span>⏳ Kurs davomiyligi: <strong class="text-slate-800">{{ selectedCourseObj.durationMonths }} oy</strong> ({{ selectedCourseObj.totalLessons || selectedCourseObj.durationMonths * 12 }} ta dars)</span>
                <span>📚 <strong class="text-[#6D28D9]">{{ selectedCourseObj.plans?.length || 1 }} ta</strong> o'quv rejasi</span>
              </div>
            </div>

            <!-- Kurs o'quv rejalari (Dars jadvali tanlash) -->
            <div v-if="selectedCourseObj && availableCoursePlans.length > 0" class="mt-3">
              <label class="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                <span class="flex items-center gap-1.5">
                  <BookOpen class="h-3.5 w-3.5 text-[#6D28D9]" />
                  <span>Dars jadvali (O'quv rejasi)</span>
                </span>
                <span class="text-[10px] text-[#6D28D9] font-medium bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                  {{ formPlanId ? 'Oxirgi reja tanlandi' : 'Tanlanmagan' }}
                </span>
              </label>
              <select
                v-model="formPlanId"
                class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
              >
                <option value="">Rejasiz (bo'sh darslar)</option>
                <option v-for="plan in availableCoursePlans" :key="plan.id" :value="plan.id">
                  {{ plan.title }} {{ plan.isDefault ? '⭐ (Birlamchi)' : '' }} — {{ plan.lessons?.length || 0 }} ta dars
                </option>
              </select>

              <!-- Tanlangan reja ko'rinishi -->
              <div v-if="currentSelectedPlan" class="mt-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                <div class="flex items-center justify-between font-semibold text-slate-700">
                  <span class="flex items-center gap-1.5 text-slate-800">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#6D28D9]"></span>
                    {{ currentSelectedPlan.title }}
                  </span>
                  <span class="text-[10px] font-bold text-[#6D28D9] bg-violet-100/70 px-2 py-0.5 rounded-md">
                    {{ currentSelectedPlan.lessons?.length || 0 }} ta dars mavzusi
                  </span>
                </div>
                <p v-if="currentSelectedPlan.description" class="text-[11px] text-slate-500 line-clamp-1">
                  {{ currentSelectedPlan.description }}
                </p>
                <div v-if="currentSelectedPlan.lessons && currentSelectedPlan.lessons.length > 0" class="pt-1 text-[10px] text-slate-400 flex items-center gap-1 truncate">
                  <span class="text-slate-600 font-medium">1-dars mavzusi:</span>
                  <span class="truncate text-slate-700">{{ currentSelectedPlan.lessons[0].topic }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Guruh nomi * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Guruh nomi *</label>
            <input
              v-model="formName"
              type="text"
              required
              placeholder="n27"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
            />
          </div>

          <!-- Xona * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Xona *</label>
            <select
              v-model="formRoomId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="" disabled>Xonani tanlang</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <!-- Dars kunlari * (2-Column Checkbox Grid - Image 4 & 5) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Dars kunlari *</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="d in weekDayOptions"
                :key="d.value"
                type="button"
                @click="toggleWeekDay(d.value)"
                class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left"
                :class="
                  formWeekDays.includes(d.value)
                    ? 'border-[#6D28D9] bg-violet-50/40 text-[#6D28D9] font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                "
              >
                <!-- Checkbox Icon -->
                <div
                  class="w-4 h-4 rounded flex items-center justify-center shrink-0 border"
                  :class="
                    formWeekDays.includes(d.value)
                      ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                      : 'border-slate-300 bg-white'
                  "
                >
                  <Check v-if="formWeekDays.includes(d.value)" class="h-3 w-3 stroke-3" />
                </div>
                <span>{{ d.label }}</span>
              </button>
            </div>
          </div>

          <!-- O'quv oylari soni (davomiyligi) * -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-bold text-slate-800">
                O'quv oylari soni (davomiyligi) *
              </label>
              <span class="text-xs font-bold text-[#6D28D9]">{{ formDurationMonths }} oy</span>
            </div>

            <!-- Quick Month Selector Pills -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              <button
                v-for="m in [1, 2, 3, 4, 6, 9, 12]"
                :key="m"
                type="button"
                @click="formDurationMonths = m"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
                :class="formDurationMonths === m ? 'bg-[#6D28D9] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                {{ m }} oy
              </button>
            </div>

            <!-- Calculated Live Info Card (User Rule) -->
            <div class="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 space-y-1.5 text-xs text-slate-700">
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Haftasiga:</span>
                <span class="font-bold text-slate-900">{{ daysPerWeekCount }} kun/hafta</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">1 oydagi darslar soni:</span>
                <span class="font-bold text-[#6D28D9]">{{ lessonsPerMonthCount }} ta dars</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Jami darslar soni:</span>
                <span class="font-extrabold text-[#6D28D9]">{{ totalCalculatedLessons }} ta dars ({{ formDurationMonths }} oy)</span>
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-purple-100 text-[11px]">
                <span class="text-slate-400 font-medium">Rejalashtirilgan tugash sanasi:</span>
                <span class="font-bold text-slate-700">{{ calculatedEndDate }}</span>
              </div>
            </div>
          </div>

          <!-- Bosh o'qituvchi (Mentor) * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Bosh o'qituvchi (Mentor) *</label>
            <select
              v-model="formMainTeacherId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="" disabled>Bosh o'qituvchini tanlang</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.firstName }} {{ t.lastName || '' }} ({{ t.phone }})
              </option>
            </select>
          </div>

          <!-- Assistent (Yordamchi ustoz) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Assistent (Yordamchi ustoz)</label>
            <select
              v-model="formAssistantTeacherId"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="">-- Assistent biriktirilmagan (Ixtiyoriy) --</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.firstName }} {{ t.lastName || '' }} ({{ t.role || 'Ustoz' }})
              </option>
            </select>
          </div>

          <!-- Dars vaqti * -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Dars vaqti *</label>
              <div class="relative">
                <input
                  v-model="formStartTime"
                  type="time"
                  required
                  class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 font-mono"
                />
                <Clock class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <!-- O'quvchilar sig'imi -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">O'quvchilar sig'imi</label>
              <input
                v-model.number="formMaxStudents"
                type="number"
                min="1"
                max="100"
                class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
              />
            </div>
          </div>

          <!-- Boshlanish sanasi * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Boshlanish sanasi *</label>
            <div class="relative">
              <input
                v-model="formStartDate"
                type="date"
                required
                class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
              />
              <Calendar class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <!-- Tavsif -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Tavsif</label>
            <textarea
              v-model="formDescription"
              rows="2"
              placeholder="Guruh haqida qo'shimcha ma'lumot (ixtiyoriy)"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 resize-none"
            ></textarea>
          </div>

          <!-- O'qituvchilar (Tags & + Qo'shish - Image 5) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">O'qituvchilar</label>
            <div class="border border-slate-200 rounded-xl p-2.5 bg-white">
              <div v-if="formSelectedTeacherIds.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="tId in formSelectedTeacherIds"
                  :key="tId"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-[#6D28D9] border border-violet-100"
                >
                  {{ getTeacherNameById(tId) }}
                  <button
                    @click.prevent="removeSelectedTeacher(tId)"
                    class="text-[#6D28D9] hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              </div>

              <!-- + Qo'shish Button -->
              <button
                @click.prevent="showTeacherPicker = !showTeacherPicker"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] cursor-pointer py-1 px-2 rounded-lg hover:bg-violet-50 transition"
              >
                <span>+ Qo'shish</span>
              </button>

              <!-- Teacher Selector Dropdown -->
              <div
                v-if="showTeacherPicker"
                class="mt-2 pt-2 border-t border-slate-100 max-h-40 overflow-y-auto space-y-1"
              >
                <div
                  v-for="tch in teachers"
                  :key="tch.id"
                  @click="toggleTeacherSelection(tch.id)"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-50 transition"
                  :class="formSelectedTeacherIds.includes(tch.id) ? 'bg-violet-50/60 font-bold text-[#6D28D9]' : 'text-slate-700'"
                >
                  <span>{{ tch.firstName }} {{ tch.lastName }}</span>
                  <Check v-if="formSelectedTeacherIds.includes(tch.id)" class="h-3.5 w-3.5 text-[#6D28D9]" />
                </div>
              </div>
            </div>
          </div>

          <!-- Talabalar (Tags & + Qo'shish - Image 5) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Talabalar</label>
            <div class="border border-slate-200 rounded-xl p-2.5 bg-white">
              <div v-if="formSelectedStudentIds.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="sId in formSelectedStudentIds"
                  :key="sId"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-[#6D28D9] border border-violet-100"
                >
                  {{ getStudentNameById(sId) }}
                  <button
                    @click.prevent="removeSelectedStudent(sId)"
                    class="text-[#6D28D9] hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              </div>

              <!-- + Qo'shish Button -->
              <button
                @click.prevent="showStudentPicker = !showStudentPicker"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] cursor-pointer py-1 px-2 rounded-lg hover:bg-violet-50 transition"
              >
                <span>+ Qo'shish</span>
              </button>

              <!-- Student Selector Dropdown -->
              <div
                v-if="showStudentPicker"
                class="mt-2 pt-2 border-t border-slate-100 max-h-40 overflow-y-auto space-y-1"
              >
                <div
                  v-for="std in students"
                  :key="std.id"
                  @click="toggleStudentSelection(std.id)"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-50 transition"
                  :class="formSelectedStudentIds.includes(std.id) ? 'bg-violet-50/60 font-bold text-[#6D28D9]' : 'text-slate-700'"
                >
                  <span>{{ std.firstName }} {{ std.lastName }}</span>
                  <Check v-if="formSelectedStudentIds.includes(std.id)" class="h-3.5 w-3.5 text-[#6D28D9]" />
                </div>
              </div>
            </div>
          </div>

          <!-- Dars davomiyligi: 120 minut (Image 5) -->
          <p class="text-xs text-slate-400">
            Dars davomiyligi: 120 minut
          </p>
        </form>

        <!-- Drawer Footer (Bekor qilish & Saqlash) -->
        <div class="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            @click="closeDrawer"
            type="button"
            class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            @click="handleSaveGroup"
            type="button"
            :disabled="isSubmitting"
            class="px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] active:bg-[#4c1d95] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
