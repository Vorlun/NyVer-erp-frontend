<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Course, CourseSyllabus, CoursePlan, CoursePlanLesson } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Badge from '../../components/ui/Badge.vue';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Clock,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  Layers,
  Star,
  Copy,
  CheckCircle2,
  Sparkles,
} from 'lucide-vue-next';

const coursesList = ref<Course[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);

// Create course form state
const newName = ref('');
const newPrice = ref<number>(800000);
const newDuration = ref<number>(6);
const newLessonsPerMonth = ref<number>(12);
const newDesc = ref('');
const saving = ref(false);

const calculatedTotalLessons = computed(() => {
  return Number(newDuration.value || 1) * Number(newLessonsPerMonth.value || 12);
});

// ============ SAMPLE SYLLABUS & CURRICULUM TEMPLATES ============
interface SyllabusRow {
  id?: number;
  lessonOrder: number;
  topic: string;
  description?: string;
}

const defaultSyllabusSamples: Record<string, SyllabusRow[]> = {
  bootcamp: [
    { lessonOrder: 1, topic: "Kirish: Dasturlash asoslari va Muhitni sozlash", description: "VS Code, Git va terminal buyruqlari" },
    { lessonOrder: 2, topic: "HTML5 Semantik teglari va Zamonaviy CSS", description: "Flexbox, Grid va Adaptiv dizayn tamoyillari" },
    { lessonOrder: 3, topic: "JavaScript Asoslari: O'zgaruvchilar va Funksiyalar", description: "ES6+, Arrow functions va Scope" },
    { lessonOrder: 4, topic: "JavaScript DOM va Hodisalar bilan ishlash", description: "Event listeners, dynamic DOM manipulation" },
    { lessonOrder: 5, topic: "Asinxron JavaScript: Promises va Async/Await", description: "Fetch API va REST server bilan bog'lanish" },
    { lessonOrder: 6, topic: "Vue 3 Asoslari: Reaktivlik va Komponentlar", description: "Composition API, ref, reactive, computed" },
    { lessonOrder: 7, topic: "Vue Router va Ko'p sahifali ilova arxitekturasi", description: "Dynamic routes, navigation guards" },
    { lessonOrder: 8, topic: "Pinia: Holat boshqaruvi (State Management)", description: "Global store, actions va getters" },
    { lessonOrder: 9, topic: "Backend API bilan to'liq integratsiya", description: "Axios interceptors, JWT authentication" },
    { lessonOrder: 10, topic: "Tailwind CSS bilan zamonaviy UI yaratish", description: "Design systems, dark mode va animatsiyalar" },
    { lessonOrder: 11, topic: "Amaliy Loyiha: Full-featured Dashboard", description: "Haqiqiy ERP tizimi komponentlari" },
    { lessonOrder: 12, topic: "Deploy va Loyihani taqdimot qilish", description: "Vercel, Docker va Portfolio tayyorlash" },
  ],
  react: [
    { lessonOrder: 1, topic: "React Asoslari: JSX va Komponentlar", description: "React arxitekturasi va virtual DOM" },
    { lessonOrder: 2, topic: "Hooks chuqurlashtirilgan: useState, useEffect", description: "Komponent lifecycle va yon effektlar" },
    { lessonOrder: 3, topic: "Custom Hooks va Reaktiv logika", description: "Kod takrorlanishini oldini olish" },
    { lessonOrder: 4, topic: "Next.js App Router va Server Komponentlar", description: "SSR, SSG va zamonaviy routing" },
    { lessonOrder: 5, topic: "Tailwind & Zustand bilan Global State", description: "Zamonaviy holat boshqaruvi" },
    { lessonOrder: 6, topic: "Full-stack Next.js Loyiha va Deploy", description: "Vercel orqali deploy qilish" },
  ],
  python: [
    { lessonOrder: 1, topic: "Python Sintaksisi va Ma'lumot turlari", description: "Data structures, OOP asoslari" },
    { lessonOrder: 2, topic: "PostgreSQL va Relyatsion ma'lumotlar bazasi", description: "Jadvallar, SQL so'rovlar va indekslar" },
    { lessonOrder: 3, topic: "Django REST Framework: API yaratish", description: "Serializers, ViewSets va Routers" },
    { lessonOrder: 4, topic: "JWT Autentifikatsiya va Ruxsatlar", description: "Foydalanuvchilar xavfsizligi" },
    { lessonOrder: 5, topic: "Asinxron vazifalar: Celery va Redis", description: "Fon jarayonlarini boshqarish" },
    { lessonOrder: 6, topic: "Docker va Serverda Deploy qilish", description: "CI/CD va ishlab chiqarish muhiti" },
  ],
  ielts: [
    { lessonOrder: 1, topic: "Introduction to IELTS & Diagnostic Test", description: "Format of IELTS exam and scoring criteria" },
    { lessonOrder: 2, topic: "Listening Section 1: Form Completion & Notes", description: "Strategies for personal details and numbers" },
    { lessonOrder: 3, topic: "Reading Academic: Skimming & Scanning Skills", description: "Fast navigation and identifying keywords" },
    { lessonOrder: 4, topic: "Writing Task 1: Line Graphs & Bar Charts", description: "Describing trends, increases, and decreases" },
    { lessonOrder: 5, topic: "Speaking Part 1 & 2: Fluency and Cue Cards", description: "Coherence and lexical resources" },
    { lessonOrder: 6, topic: "Full Mock Test & Diagnostic Review", description: "Complete timed simulation" },
  ],
};

const defaultPlansMap: Record<string, CoursePlan[]> = {
  bootcamp: [
    {
      id: 101,
      courseId: 1,
      title: "Standart Dastur (2026)",
      description: "6 oylik to'liq kasbiy Full-stack dasturlash o'quv rejasi",
      isDefault: true,
      lessons: defaultSyllabusSamples.bootcamp.map((s) => ({ ...s, planId: 101 } as CoursePlanLesson)),
      _count: { groups: 3 },
    },
    {
      id: 102,
      courseId: 1,
      title: "Intensiv Bootcamp (Tezlashtirilgan)",
      description: "Haftada 5 kunlik kuchaytirilgan amaliy bootcamp rejasi",
      isDefault: false,
      lessons: defaultSyllabusSamples.bootcamp.slice(0, 8).map((s) => ({ ...s, planId: 102 } as CoursePlanLesson)),
      _count: { groups: 1 },
    },
  ],
  react: [
    {
      id: 201,
      courseId: 2,
      title: "React.js & Next.js Zamonaviy Reja",
      description: "React 19, Server Components, SSR va TypeScript",
      isDefault: true,
      lessons: defaultSyllabusSamples.react.map((s) => ({ ...s, planId: 201 } as CoursePlanLesson)),
      _count: { groups: 2 },
    },
    {
      id: 202,
      courseId: 2,
      title: "Frontend Foundation + React",
      description: "Boshlovchilar uchun soddalashtirilgan o'quv rejasi",
      isDefault: false,
      lessons: defaultSyllabusSamples.react.slice(0, 3).map((s) => ({ ...s, planId: 202 } as CoursePlanLesson)),
      _count: { groups: 0 },
    },
  ],
  python: [
    {
      id: 301,
      courseId: 3,
      title: "Python Backend & DRF Asosiy Reja",
      description: "Django REST Framework, PostgreSQL va Docker",
      isDefault: true,
      lessons: defaultSyllabusSamples.python.map((s) => ({ ...s, planId: 301 } as CoursePlanLesson)),
      _count: { groups: 2 },
    },
    {
      id: 302,
      courseId: 3,
      title: "Python Automation & Botlar",
      description: "Skriptlar, parserlar va Telegram botlar yaratish",
      isDefault: false,
      lessons: defaultSyllabusSamples.python.slice(0, 3).map((s) => ({ ...s, planId: 302 } as CoursePlanLesson)),
      _count: { groups: 0 },
    },
  ],
  ielts: [
    {
      id: 401,
      courseId: 4,
      title: "IELTS 7.5+ Target O'quv Rejasi",
      description: "Barcha 4 modul (Listening, Reading, Writing, Speaking)",
      isDefault: true,
      lessons: defaultSyllabusSamples.ielts.map((s) => ({ ...s, planId: 401 } as CoursePlanLesson)),
      _count: { groups: 1 },
    },
    {
      id: 402,
      courseId: 4,
      title: "IELTS Express (Qisqa Kurs)",
      description: "2 oylik intensiv imtihonga tayyorlanish rejasi",
      isDefault: false,
      lessons: defaultSyllabusSamples.ielts.slice(0, 3).map((s) => ({ ...s, planId: 402 } as CoursePlanLesson)),
      _count: { groups: 0 },
    },
  ],
};

const defaultCourses: Course[] = [
  {
    id: 1,
    name: 'Full-stack Bootcamp',
    price: 1200000,
    durationMonths: 6,
    lessonsPerMonth: 12,
    totalLessons: 72,
    status: 'ACTIVE',
    description: 'Frontend & Backend dasturlash kursi',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    syllabus: defaultSyllabusSamples.bootcamp as CourseSyllabus[],
    plans: defaultPlansMap.bootcamp,
  },
  {
    id: 2,
    name: 'React.js & Next.js',
    price: 900000,
    durationMonths: 4,
    lessonsPerMonth: 12,
    totalLessons: 48,
    status: 'ACTIVE',
    description: 'Zamonaviy Frontend web-ilovalari',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    syllabus: defaultSyllabusSamples.react as CourseSyllabus[],
    plans: defaultPlansMap.react,
  },
  {
    id: 3,
    name: 'Python Backend & Django',
    price: 950000,
    durationMonths: 5,
    lessonsPerMonth: 12,
    totalLessons: 60,
    status: 'ACTIVE',
    description: "Python arxitekturasi va ma'lumotlar bazasi",
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    syllabus: defaultSyllabusSamples.python as CourseSyllabus[],
    plans: defaultPlansMap.python,
  },
  {
    id: 4,
    name: "Foundation (IT Boshlang'ich)",
    price: 600000,
    durationMonths: 3,
    lessonsPerMonth: 12,
    totalLessons: 36,
    status: 'ACTIVE',
    description: 'Kompyuter savodxonligi va algoritmlar',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
    syllabus: defaultSyllabusSamples.bootcamp.slice(0, 6) as CourseSyllabus[],
    plans: defaultPlansMap.bootcamp.slice(0, 1),
  },
];

async function loadCourses() {
  loading.value = true;
  try {
    const res = await erpService.getCourses();
    const data = Array.isArray(res) ? res : (res as any)?.data || [];
    if (data.length > 0) {
      coursesList.value = data.map((c: any) => {
        const cName = (c.name || '').toLowerCase();
        const planKey = cName.includes('react')
          ? 'react'
          : cName.includes('python')
          ? 'python'
          : cName.includes('ielts')
          ? 'ielts'
          : 'bootcamp';

        if (!c.syllabus || c.syllabus.length === 0) {
          const matchedDef = defaultCourses.find((dc) => dc.name === c.name || dc.id === c.id);
          if (matchedDef?.syllabus) {
            c.syllabus = matchedDef.syllabus;
          }
        }

        if (!c.plans || c.plans.length === 0) {
          c.plans = (defaultPlansMap[planKey] || defaultPlansMap.bootcamp).map((p) => ({
            ...p,
            courseId: c.id,
          }));
        }
        return c;
      });
    } else {
      coursesList.value = defaultCourses;
    }
  } catch (err) {
    console.error('Failed to load courses', err);
    coursesList.value = defaultCourses;
  } finally {
    loading.value = false;
  }
}

async function handleCreateCourse() {
  if (!newName.value.trim()) return;
  saving.value = true;
  try {
    const duration = Number(newDuration.value) || 1;
    const perMonth = Number(newLessonsPerMonth.value) || 12;
    const total = duration * perMonth;

    const created = await erpService.createCourse({
      name: newName.value.trim(),
      price: Number(newPrice.value),
      durationMonths: duration,
      lessonsPerMonth: perMonth,
      totalLessons: total,
      description: newDesc.value.trim() || undefined,
    } as any);

    // Also automatically create an initial default plan
    try {
      const cId = (created as any)?.id || Date.now();
      await erpService.createCoursePlan(cId, {
        title: "Standart O'quv Reja (2026)",
        description: "Kursning asosiy dars jadvali",
        isDefault: true,
        lessons: defaultSyllabusSamples.bootcamp.slice(0, 12).map((s) => ({
          lessonOrder: s.lessonOrder,
          topic: s.topic,
          description: s.description,
        })),
      });
    } catch {
      // Ignore fallback
    }

    showCreateModal.value = false;
    resetCreateForm();
    await loadCourses();
  } catch (err) {
    console.error(err);
    const duration = Number(newDuration.value) || 1;
    const perMonth = Number(newLessonsPerMonth.value) || 12;
    coursesList.value.push({
      id: Date.now(),
      name: newName.value.trim(),
      price: Number(newPrice.value),
      durationMonths: duration,
      lessonsPerMonth: perMonth,
      totalLessons: duration * perMonth,
      description: newDesc.value.trim() || undefined,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      syllabus: defaultSyllabusSamples.bootcamp.slice(0, 12) as CourseSyllabus[],
      plans: defaultPlansMap.bootcamp,
    });
    showCreateModal.value = false;
    resetCreateForm();
  } finally {
    saving.value = false;
  }
}

function resetCreateForm() {
  newName.value = '';
  newPrice.value = 800000;
  newDuration.value = 6;
  newLessonsPerMonth.value = 12;
  newDesc.value = '';
}

// ========================================================
// 1. COURSE PLANS MANAGEMENT (BIR NECHTA O'QUV REJALARI)
// ========================================================
const showPlansModal = ref(false);
const activePlanCourse = ref<Course | null>(null);
const currentPlans = ref<CoursePlan[]>([]);
const selectedPlan = ref<CoursePlan | null>(null);
const planLessons = ref<Array<{ id?: number; lessonOrder: number; topic: string; description?: string }>>([]);
const isSavingPlan = ref(false);
const planFeedback = ref<{ text: string; type: 'success' | 'error' } | null>(null);

// New plan drawer/card state
const showNewPlanForm = ref(false);
const newPlanTitle = ref('');
const newPlanDesc = ref('');
const newPlanIsDefault = ref(false);
const newPlanTemplateType = ref<'standard' | 'copy' | 'empty'>('standard');

// Import state within plan modal
const planImportMode = ref<'MANUAL' | 'UPLOAD' | 'PASTE'>('MANUAL');
const planPasteText = ref('');

async function openPlansManager(course: Course) {
  activePlanCourse.value = course;
  planFeedback.value = null;
  showNewPlanForm.value = false;
  planImportMode.value = 'MANUAL';
  planPasteText.value = '';

  try {
    const plans = await erpService.getCoursePlans(course.id);
    if (plans && plans.length > 0) {
      currentPlans.value = plans;
    } else if (course.plans && course.plans.length > 0) {
      currentPlans.value = [...course.plans];
    } else {
      const cName = course.name.toLowerCase();
      const planKey = cName.includes('react')
        ? 'react'
        : cName.includes('python')
        ? 'python'
        : cName.includes('ielts')
        ? 'ielts'
        : 'bootcamp';
      currentPlans.value = (defaultPlansMap[planKey] || defaultPlansMap.bootcamp).map((p) => ({
        ...p,
        courseId: course.id,
      }));
    }
  } catch {
    currentPlans.value = course.plans || [];
  }

  // Select the default plan or the first one
  const initial = currentPlans.value.find((p) => p.isDefault) || currentPlans.value[0] || null;
  selectPlan(initial);
  showPlansModal.value = true;
}

function selectPlan(plan: CoursePlan | null) {
  selectedPlan.value = plan;
  showNewPlanForm.value = false;
  planFeedback.value = null;
  planImportMode.value = 'MANUAL';
  planPasteText.value = '';

  if (plan && plan.lessons && plan.lessons.length > 0) {
    planLessons.value = JSON.parse(JSON.stringify(plan.lessons));
  } else if (plan) {
    planLessons.value = [];
  } else {
    planLessons.value = [];
  }
}

function openNewPlanModal() {
  showNewPlanForm.value = true;
  newPlanTitle.value = '';
  newPlanDesc.value = '';
  newPlanIsDefault.value = currentPlans.value.length === 0;
  newPlanTemplateType.value = 'standard';
  planFeedback.value = null;
}

async function handleCreateNewPlan() {
  if (!newPlanTitle.value.trim() || !activePlanCourse.value) return;
  isSavingPlan.value = true;
  planFeedback.value = null;

  try {
    let initialLessons: Array<{ lessonOrder: number; topic: string; description?: string }> = [];

    if (newPlanTemplateType.value === 'copy' && selectedPlan.value?.lessons) {
      initialLessons = selectedPlan.value.lessons.map((l, idx) => ({
        lessonOrder: idx + 1,
        topic: l.topic,
        description: l.description || undefined,
      }));
    } else if (newPlanTemplateType.value === 'standard') {
      const cName = activePlanCourse.value.name.toLowerCase();
      const sample = cName.includes('react')
        ? defaultSyllabusSamples.react
        : cName.includes('python')
        ? defaultSyllabusSamples.python
        : cName.includes('ielts')
        ? defaultSyllabusSamples.ielts
        : defaultSyllabusSamples.bootcamp;
      initialLessons = sample.map((s, idx) => ({
        lessonOrder: idx + 1,
        topic: s.topic,
        description: s.description,
      }));
    }

    let created: CoursePlan;
    try {
      created = await erpService.createCoursePlan(activePlanCourse.value.id, {
        title: newPlanTitle.value.trim(),
        description: newPlanDesc.value.trim() || undefined,
        isDefault: newPlanIsDefault.value,
        lessons: initialLessons,
      });
    } catch {
      // Local fallback
      created = {
        id: Date.now(),
        courseId: activePlanCourse.value.id,
        title: newPlanTitle.value.trim(),
        description: newPlanDesc.value.trim() || null,
        isDefault: newPlanIsDefault.value,
        lessons: initialLessons.map((l, idx) => ({
          id: idx + 1,
          lessonOrder: l.lessonOrder,
          topic: l.topic,
          description: l.description || null,
          planId: Date.now(),
        })),
        _count: { groups: 0 },
      };
    }

    if (newPlanIsDefault.value) {
      currentPlans.value.forEach((p) => (p.isDefault = false));
    }
    currentPlans.value.push(created);

    // Update in coursesList
    if (activePlanCourse.value) {
      activePlanCourse.value.plans = [...currentPlans.value];
      const match = coursesList.value.find((c) => c.id === activePlanCourse.value!.id);
      if (match) match.plans = [...currentPlans.value];
    }

    showNewPlanForm.value = false;
    selectPlan(created);
    planFeedback.value = {
      text: `"${created.title}" yangi o'quv rejasi muvaffaqiyatli yaratildi!`,
      type: 'success',
    };
  } catch (err: any) {
    planFeedback.value = {
      text: err?.response?.data?.message || "O'quv reja yaratishda xatolik yuz berdi",
      type: 'error',
    };
  } finally {
    isSavingPlan.value = false;
  }
}

async function handleSaveSelectedPlan() {
  if (!selectedPlan.value || !activePlanCourse.value) return;
  isSavingPlan.value = true;
  planFeedback.value = null;

  try {
    const validLessons = planLessons.value
      .filter((l) => l.topic.trim().length > 0)
      .map((l, idx) => ({
        lessonOrder: idx + 1,
        topic: l.topic.trim(),
        description: l.description?.trim() || undefined,
      }));

    if (validLessons.length === 0) {
      planFeedback.value = { text: "Kamida bitta dars mavzusi bo'lishi shart", type: 'error' };
      isSavingPlan.value = false;
      return;
    }

    try {
      await erpService.updateCoursePlan(activePlanCourse.value.id, selectedPlan.value.id, {
        title: selectedPlan.value.title.trim(),
        description: selectedPlan.value.description?.trim() || undefined,
        isDefault: selectedPlan.value.isDefault,
        lessons: validLessons,
      });
    } catch {
      // Local fallback
    }

    selectedPlan.value.lessons = validLessons.map((l, idx) => ({
      id: idx + 1,
      lessonOrder: l.lessonOrder,
      topic: l.topic,
      description: l.description || null,
      planId: selectedPlan.value!.id,
    }));

    planLessons.value = JSON.parse(JSON.stringify(selectedPlan.value.lessons));

    if (activePlanCourse.value) {
      const match = coursesList.value.find((c) => c.id === activePlanCourse.value!.id);
      if (match) match.plans = [...currentPlans.value];
    }

    planFeedback.value = {
      text: `"${selectedPlan.value.title}" dars rejasi saqlandi (${validLessons.length} ta dars)!`,
      type: 'success',
    };
  } catch (err: any) {
    planFeedback.value = {
      text: err?.response?.data?.message || "O'quv rejani saqlashda xatolik",
      type: 'error',
    };
  } finally {
    isSavingPlan.value = false;
  }
}

async function handleSetPlanDefault(plan: CoursePlan) {
  if (!activePlanCourse.value) return;
  try {
    await erpService.updateCoursePlan(activePlanCourse.value.id, plan.id, { isDefault: true });
  } catch {
    // Local fallback
  }

  currentPlans.value.forEach((p) => {
    p.isDefault = p.id === plan.id;
  });

  planFeedback.value = {
    text: `"${plan.title}" asosiy (birlamchi) o'quv reja qilib belgilandi!`,
    type: 'success',
  };
}

async function handleDeletePlan(plan: CoursePlan) {
  if (!activePlanCourse.value) return;
  if (currentPlans.value.length <= 1) {
    alert("Kursda kamida bitta o'quv reja qolishi shart!");
    return;
  }
  if (!confirm(`"${plan.title}" o'quv rejasini o'chirishni tasdiqlaysizmi?`)) return;

  try {
    await erpService.deleteCoursePlan(activePlanCourse.value.id, plan.id);
  } catch {
    // Local fallback
  }

  const idx = currentPlans.value.findIndex((p) => p.id === plan.id);
  if (idx !== -1) currentPlans.value.splice(idx, 1);

  if (plan.isDefault && currentPlans.value.length > 0) {
    currentPlans.value[0].isDefault = true;
  }

  selectPlan(currentPlans.value[0] || null);
  planFeedback.value = {
    text: `"${plan.title}" o'quv rejasi o'chirildi`,
    type: 'success',
  };
}

function addPlanLessonRow() {
  const nextOrder = (planLessons.value.length > 0
    ? Math.max(...planLessons.value.map((l) => l.lessonOrder)) + 1
    : 1);
  planLessons.value.push({
    lessonOrder: nextOrder,
    topic: '',
    description: '',
  });
}

function removePlanLessonRow(index: number) {
  planLessons.value.splice(index, 1);
  planLessons.value.forEach((l, idx) => {
    l.lessonOrder = idx + 1;
  });
}

function applyParsedTextToPlan(text: string) {
  if (!text.trim()) return;
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parsedRows: Array<{ lessonOrder: number; topic: string; description: string }> = [];

  lines.forEach((line, idx) => {
    let parts: string[] = [];
    if (line.includes('\t')) parts = line.split('\t');
    else if (line.includes(';')) parts = line.split(';');
    else if (line.includes(',')) parts = line.split(',');
    else parts = [line];

    let order = idx + 1;
    let topic = '';
    let description = '';

    if (parts.length >= 3 && !isNaN(Number(parts[0].trim()))) {
      order = Number(parts[0].trim());
      topic = parts[1].trim();
      description = parts.slice(2).join(', ').trim();
    } else if (parts.length === 2) {
      if (!isNaN(Number(parts[0].trim()))) {
        order = Number(parts[0].trim());
        topic = parts[1].trim();
      } else {
        topic = parts[0].trim();
        description = parts[1].trim();
      }
    } else {
      topic = parts[0].trim();
    }

    const cleanedTopic = topic.replace(/^(?:#?\d+[\.\-\:\s]*dars[\.\-\:\s]*|#?\d+[\.\-\:\s]+)/i, '').trim();

    if (cleanedTopic) {
      parsedRows.push({
        lessonOrder: order,
        topic: cleanedTopic,
        description: description || '',
      });
    }
  });

  if (parsedRows.length > 0) {
    parsedRows.forEach((r, i) => (r.lessonOrder = i + 1));
    planLessons.value = parsedRows;
    planImportMode.value = 'MANUAL';
    planFeedback.value = {
      text: `${parsedRows.length} ta dars jadvalga muvaffaqiyatli yuklandi! "O'quv rejani saqlash" tugmasini bosing.`,
      type: 'success',
    };
  }
}

function handlePlanFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    applyParsedTextToPlan(content);
  };
  reader.readAsText(file);
}

function downloadPlanTemplateCsv() {
  const csvContent =
    "Dars Tartibi,Mavzu Nomi,Tavsif\n" +
    "1,Kirish va Muhitni sozlash,Dasturlash vositalari va asoslar\n" +
    "2,Semantik HTML va CSS Flexbox,Zamonaviy veb sahifa karkasi\n" +
    "3,JavaScript Asoslari,O'zgaruvchilar va funksiyalar\n" +
    "4,DOM bilan ishlash,Hodisalar va reaktivlik\n" +
    "5,Asinxron JS va REST API,Ma'lumotlar bilan ishlash\n";

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${selectedPlan.value?.title || 'oquv_reja'}_dars_jadvali.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ========================================================
// 2. QUICK SYLLABUS MANAGEMENT (LEGACY COMPATIBILITY)
// ========================================================
const showSyllabusModal = ref(false);
const activeCourse = ref<Course | null>(null);
const syllabusRows = ref<SyllabusRow[]>([]);
const isSavingSyllabus = ref(false);
const syllabusFeedback = ref<{ text: string; type: 'success' | 'error' } | null>(null);
const importMode = ref<'MANUAL' | 'UPLOAD' | 'PASTE'>('MANUAL');
const pasteText = ref('');

function openSyllabusManager(course: Course) {
  activeCourse.value = course;
  syllabusFeedback.value = null;
  importMode.value = 'MANUAL';
  pasteText.value = '';

  let list: SyllabusRow[] = [];
  if (course.syllabus && course.syllabus.length > 0) {
    list = course.syllabus.map((s) => ({
      id: s.id,
      lessonOrder: s.lessonOrder,
      topic: s.topic,
      description: s.description || '',
    }));
  } else {
    const cName = course.name.toLowerCase();
    if (cName.includes('ielts')) list = [...defaultSyllabusSamples.ielts];
    else if (cName.includes('python')) list = [...defaultSyllabusSamples.python];
    else if (cName.includes('react')) list = [...defaultSyllabusSamples.react];
    else list = [...defaultSyllabusSamples.bootcamp];
  }

  list.sort((a, b) => a.lessonOrder - b.lessonOrder);
  syllabusRows.value = list;
  showSyllabusModal.value = true;
}

function addSyllabusRow() {
  const nextOrder = (syllabusRows.value.length > 0
    ? Math.max(...syllabusRows.value.map((r) => r.lessonOrder)) + 1
    : 1);
  syllabusRows.value.push({
    lessonOrder: nextOrder,
    topic: '',
    description: '',
  });
}

function removeSyllabusRow(index: number) {
  syllabusRows.value.splice(index, 1);
  syllabusRows.value.forEach((r, idx) => {
    r.lessonOrder = idx + 1;
  });
}

function applyParsedText(text: string) {
  if (!text.trim()) return;
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const parsedRows: SyllabusRow[] = [];

  lines.forEach((line, idx) => {
    let parts: string[] = [];
    if (line.includes('\t')) parts = line.split('\t');
    else if (line.includes(';')) parts = line.split(';');
    else if (line.includes(',')) parts = line.split(',');
    else parts = [line];

    let order = idx + 1;
    let topic = '';
    let description = '';

    if (parts.length >= 3 && !isNaN(Number(parts[0].trim()))) {
      order = Number(parts[0].trim());
      topic = parts[1].trim();
      description = parts.slice(2).join(', ').trim();
    } else if (parts.length === 2) {
      if (!isNaN(Number(parts[0].trim()))) {
        order = Number(parts[0].trim());
        topic = parts[1].trim();
      } else {
        topic = parts[0].trim();
        description = parts[1].trim();
      }
    } else {
      topic = parts[0].trim();
    }

    const cleanedTopic = topic.replace(/^(?:#?\d+[\.\-\:\s]*dars[\.\-\:\s]*|#?\d+[\.\-\:\s]+)/i, '').trim();

    if (cleanedTopic) {
      parsedRows.push({
        lessonOrder: order,
        topic: cleanedTopic,
        description: description || '',
      });
    }
  });

  if (parsedRows.length > 0) {
    parsedRows.forEach((r, i) => (r.lessonOrder = i + 1));
    syllabusRows.value = parsedRows;
    importMode.value = 'MANUAL';
    syllabusFeedback.value = {
      text: `${parsedRows.length} ta dars muvaffaqiyatli jadvalga o'tkazildi!`,
      type: 'success',
    };
  }
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    applyParsedText(content);
  };
  reader.readAsText(file);
}

function downloadTemplateCsv() {
  const csvContent =
    "Dars Tartibi,Mavzu Nomi,Tavsif\n" +
    "1,Kirish va Muhitni sozlash,Dasturlash asoslari va vositalar\n" +
    "2,HTML5 Semantik teglari,Zamonaviy veb-sahifalar strukturasi\n" +
    "3,CSS Grid va Flexbox,Adaptiv va responsiv dizayn\n" +
    "4,JavaScript Asoslari,O'zgaruvchilar va funksiyalar\n" +
    "5,Asinxron dasturlash,Promises va Async/Await\n";

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${activeCourse.value?.name || 'kurs'}_dars_jadvali_shablon.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function handleSaveSyllabus() {
  if (!activeCourse.value) return;
  isSavingSyllabus.value = true;
  syllabusFeedback.value = null;

  try {
    const validRows = syllabusRows.value
      .filter((r) => r.topic.trim().length > 0)
      .map((r, idx) => ({
        lessonOrder: idx + 1,
        topic: r.topic.trim(),
        description: r.description?.trim() || undefined,
      }));

    if (validRows.length === 0) {
      syllabusFeedback.value = { text: "Kamida bitta dars mavzusi kiritilishi shart", type: 'error' };
      isSavingSyllabus.value = false;
      return;
    }

    try {
      await erpService.batchSetCourseSyllabus(activeCourse.value.id, validRows);
    } catch {
      // Local fallback
    }

    activeCourse.value.syllabus = validRows.map((r, i) => ({
      id: i + 1,
      lessonOrder: r.lessonOrder,
      topic: r.topic,
      description: r.description || null,
      courseId: activeCourse.value!.id,
    })) as CourseSyllabus[];

    const courseInList = coursesList.value.find((c) => c.id === activeCourse.value!.id);
    if (courseInList) {
      courseInList.syllabus = activeCourse.value.syllabus;
    }

    syllabusFeedback.value = {
      text: `${validRows.length} ta dars rejasi saqlandi!`,
      type: 'success',
    };
    setTimeout(() => {
      showSyllabusModal.value = false;
    }, 1200);
  } catch (err: any) {
    syllabusFeedback.value = {
      text: err.response?.data?.message || "Dars jadvalini saqlashda xatolik",
      type: 'error',
    };
  } finally {
    isSavingSyllabus.value = false;
  }
}

onMounted(() => {
  loadCourses();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Kurslar va O'quv Rejalari</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          O'quv yo'nalishlari, narxlari va har bir kursga oldindan belgilangan bir nechta o'quv rejalari (dars jadvallari).
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="showCreateModal = true"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
        >
          <Plus class="h-4 w-4" />
          <span>Yangi Kurs Qo'shish</span>
        </button>
      </div>
    </div>

    <!-- Courses Table Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead class="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" class="py-3.5 px-6">Kurs nomi</th>
              <th scope="col" class="py-3.5 px-6">Davomiyligi</th>
              <th scope="col" class="py-3.5 px-6">Oylik narxi</th>
              <th scope="col" class="py-3.5 px-6">O'quv rejalari (Curricula)</th>
              <th scope="col" class="py-3.5 px-6">Holati</th>
              <th scope="col" class="py-3.5 px-6 text-right">
                <button
                  @click="loadCourses"
                  class="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer"
                  title="Yangilash"
                >
                  <RefreshCw class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="course in coursesList"
              :key="course.id"
              class="hover:bg-slate-50/60 transition-colors"
            >
              <!-- Kurs nomi -->
              <td class="py-4 px-6 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center font-bold text-xs shrink-0 border border-violet-100">
                    <BookOpen class="h-5 w-5" />
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 block text-sm">{{ course.name }}</span>
                    <span class="text-[11px] text-slate-400">{{ course.description || 'Amaliy darslar va portfolio' }}</span>
                  </div>
                </div>
              </td>

              <!-- Davomiyligi (necha oy, necha kun/dars) -->
              <td class="py-4 px-6 whitespace-nowrap font-medium text-slate-700">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-1.5 font-bold text-slate-900">
                    <Clock class="h-3.5 w-3.5 text-slate-400" />
                    <span>{{ course.durationMonths }} oy</span>
                  </div>
                  <div class="text-[11px] text-slate-500">
                    Jami {{ course.totalLessons || (course.durationMonths * 12) }} ta dars
                  </div>
                </div>
              </td>

              <!-- Oylik narxi -->
              <td class="py-4 px-6 whitespace-nowrap font-bold text-slate-900">
                {{ Number(course.price).toLocaleString() }} so'm
              </td>

              <!-- O'quv rejalari (Ko'rish va yangi reja qo'shish tugmasi) -->
              <td class="py-4 px-6 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="openPlansManager(course)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50/80 text-[#6D28D9] hover:bg-violet-100 font-bold text-xs transition cursor-pointer shadow-2xs group"
                    title="Kursning barcha o'quv rejalari ro'yxatini ko'rish va boshqarish"
                  >
                    <Layers class="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                    <span>{{ course.plans?.length || 1 }} ta o'quv rejasi</span>
                  </button>
                </div>
              </td>

              <!-- Holati -->
              <td class="py-4 px-6 whitespace-nowrap">
                <Badge variant="success" class="text-[10px] font-bold px-2 py-0.5">Faol</Badge>
              </td>

              <!-- Amallar (Asosiy O'quv rejalari tugmasi) -->
              <td class="py-4 px-6 whitespace-nowrap text-right">
                <div class="inline-flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    @click="openPlansManager(course)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6D28D9] text-white hover:bg-[#5B21B6] active:bg-[#4C1D95] text-xs font-bold transition cursor-pointer shadow-xs"
                    title="Kurs o'quv rejalari: ko'rish, tahrirlash va yangi reja qo'shish"
                  >
                    <Layers class="h-3.5 w-3.5" />
                    <span>O'quv rejalari</span>
                  </button>

                  <button
                    type="button"
                    @click="openSyllabusManager(course)"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
                    title="Tezkor dars jadvalini ko'rish"
                  >
                    <FileText class="h-3.5 w-3.5" />
                    <span>Dars jadvali</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- 1. KURS O'QUV REJALARI (CURRICULUM PLANS) ASOSIY MODALI  -->
    <!-- 1 ta kursda 1 nechta o'quv rejalari bo'lishi mumkin     -->
    <!-- ======================================================== -->
    <Modal
      :show="showPlansModal"
      :title="`${activePlanCourse?.name || 'Kurs'} — O'quv Rejalari (Curricula)`"
      max-width="2xl"
      @close="showPlansModal = false"
    >
      <div class="space-y-4">
        <!-- Kurs tavsifi va xulosa kartasi -->
        <div class="p-3.5 rounded-xl bg-violet-50/70 border border-violet-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <span>{{ activePlanCourse?.name }}</span>
              <span class="text-xs px-2 py-0.5 rounded-md bg-white border border-violet-200 text-[#6D28D9] font-bold">
                {{ activePlanCourse?.durationMonths }} oy / {{ activePlanCourse?.totalLessons || (activePlanCourse?.durationMonths || 1) * 12 }} dars
              </span>
            </div>
            <div class="text-slate-500 text-[11px]">
              Kurs uchun bir nechta o'quv rejalari oldindan belgilanadi. Guruh ochilganda mos o'quv reja biriktiriladi.
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="openNewPlanModal"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Plus class="h-3.5 w-3.5" />
              <span>Yangi Reja Qo'shish</span>
            </button>
          </div>
        </div>

        <!-- Feedback Alert -->
        <div
          v-if="planFeedback"
          class="p-3 rounded-xl text-xs font-semibold flex items-center justify-between"
          :class="planFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
        >
          <span>{{ planFeedback.text }}</span>
          <button @click="planFeedback = null" class="text-slate-400 hover:text-slate-600 font-bold ml-2">×</button>
        </div>

        <!-- O'QUV REJALAR TUGMALARI (TABS) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            v-for="plan in currentPlans"
            :key="plan.id"
            type="button"
            @click="selectPlan(plan)"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            :class="selectedPlan?.id === plan.id && !showNewPlanForm
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'"
          >
            <Star v-if="plan.isDefault" class="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span>{{ plan.title }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-md"
              :class="selectedPlan?.id === plan.id && !showNewPlanForm ? 'bg-white/20 text-white' : 'bg-white text-slate-600'"
            >
              {{ plan.lessons?.length || 0 }} dars
            </span>
          </button>

          <!-- + Yangi o'quv reja qo'shish tab -->
          <button
            type="button"
            @click="openNewPlanModal"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border border-dashed"
            :class="showNewPlanForm
              ? 'bg-violet-100 text-[#6D28D9] border-[#6D28D9]'
              : 'border-slate-300 text-slate-600 hover:border-[#6D28D9] hover:text-[#6D28D9] bg-white'"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>+ Yangi O'quv Reja</span>
          </button>
        </div>

        <!-- ==================================================== -->
        <!-- FORMA: YANGI O'QUV REJA QO'SHISH                     -->
        <!-- ==================================================== -->
        <div
          v-if="showNewPlanForm"
          class="p-4 rounded-xl border border-violet-200 bg-violet-50/40 space-y-4"
        >
          <div class="flex items-center justify-between border-b border-violet-200/60 pb-2">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-[#6D28D9]" />
              <span>Yangi O'quv Rejasi Yaratish</span>
            </h3>
            <button
              type="button"
              @click="showNewPlanForm = false"
              class="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Bekor qilish
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">O'quv reja nomi *</label>
              <input
                v-model="newPlanTitle"
                type="text"
                placeholder="Masalan: Standart 2026, Tezlashtirilgan Bootcamp"
                class="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#6D28D9]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tavsif (ixtiyoriy)</label>
              <input
                v-model="newPlanDesc"
                type="text"
                placeholder="Reja haqida qisqacha ma'lumot..."
                class="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#6D28D9]"
              />
            </div>
          </div>

          <!-- Boshlang'ich darslar turi -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Boshlang'ich darslar tarkibi:</label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label class="flex items-center gap-2 p-2.5 rounded-xl border bg-white cursor-pointer transition hover:border-[#6D28D9]" :class="newPlanTemplateType === 'standard' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]' : 'border-slate-200'">
                <input type="radio" v-model="newPlanTemplateType" value="standard" class="text-[#6D28D9]" />
                <div>
                  <div class="font-bold text-slate-800">Namunaviy darslar</div>
                  <div class="text-[10px] text-slate-400">Kurs bo'yicha tayyor mavzular</div>
                </div>
              </label>

              <label v-if="selectedPlan" class="flex items-center gap-2 p-2.5 rounded-xl border bg-white cursor-pointer transition hover:border-[#6D28D9]" :class="newPlanTemplateType === 'copy' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]' : 'border-slate-200'">
                <input type="radio" v-model="newPlanTemplateType" value="copy" class="text-[#6D28D9]" />
                <div>
                  <div class="font-bold text-slate-800">Rejadan nusxa olish</div>
                  <div class="text-[10px] text-slate-400">"{{ selectedPlan.title }}" asosida</div>
                </div>
              </label>

              <label class="flex items-center gap-2 p-2.5 rounded-xl border bg-white cursor-pointer transition hover:border-[#6D28D9]" :class="newPlanTemplateType === 'empty' ? 'border-[#6D28D9] ring-1 ring-[#6D28D9]' : 'border-slate-200'">
                <input type="radio" v-model="newPlanTemplateType" value="empty" class="text-[#6D28D9]" />
                <div>
                  <div class="font-bold text-slate-800">Bo'sh reja</div>
                  <div class="text-[10px] text-slate-400">Qo'lda kiritish yoki yuklash</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Birlamchi reja belgisi -->
          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefaultCheck"
              v-model="newPlanIsDefault"
              class="rounded text-[#6D28D9] focus:ring-[#6D28D9] h-4 w-4"
            />
            <label for="isDefaultCheck" class="text-xs font-semibold text-slate-700 cursor-pointer">
              Ushbu o'quv rejasini kursning asosiy (birlamchi) rejasi qilib belgilash
            </label>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-violet-200/60">
            <button
              type="button"
              @click="showNewPlanForm = false"
              class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              @click="handleCreateNewPlan"
              :disabled="!newPlanTitle.trim() || isSavingPlan"
              class="px-4 py-1.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {{ isSavingPlan ? 'Yaratilmoqda...' : 'Rejani Yaratish va Darslarni Kiritish' }}
            </button>
          </div>
        </div>

        <!-- ==================================================== -->
        <!-- TANLANGAN O'QUV REJA DARSLAR TARKIBI VA TAHRIRLASH   -->
        <!-- ==================================================== -->
        <div v-else-if="selectedPlan" class="space-y-3">
          <!-- Reja sarlavhasi, statusi va amallar paneli -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div class="flex items-center gap-2.5">
              <input
                v-model="selectedPlan.title"
                type="text"
                class="font-bold text-slate-900 text-sm bg-transparent border-b border-dashed border-slate-300 focus:border-[#6D28D9] focus:outline-none px-1 py-0.5"
                title="Reja nomini o'zgartirish"
              />
              <span
                v-if="selectedPlan.isDefault"
                class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800"
              >
                <Star class="h-3 w-3 fill-amber-500 text-amber-500" />
                <span>Asosiy Reja</span>
              </span>
              <button
                v-else
                type="button"
                @click="handleSetPlanDefault(selectedPlan)"
                class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-amber-600 px-2 py-0.5 rounded-md hover:bg-amber-50 border border-slate-200 cursor-pointer transition"
                title="Birlamchi reja qilib belgilash"
              >
                <Star class="h-3 w-3" />
                <span>Asosiy qilish</span>
              </button>
            </div>

            <!-- Import va fayl yuklash amallari -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="downloadPlanTemplateCsv"
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                title="CSV shablonni yuklab olish"
              >
                <Download class="h-3 w-3 text-slate-500" />
                <span>CSV Shablon</span>
              </button>

              <label class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer shadow-2xs">
                <UploadCloud class="h-3 w-3 text-slate-500" />
                <span>Fayl yuklash</span>
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  class="hidden"
                  @change="handlePlanFileUpload"
                />
              </label>

              <button
                type="button"
                @click="planImportMode = planImportMode === 'PASTE' ? 'MANUAL' : 'PASTE'"
                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
              >
                <Copy class="h-3 w-3 text-slate-500" />
                <span>{{ planImportMode === 'PASTE' ? 'Jadval ko\'rinish' : 'Matndan import' }}</span>
              </button>

              <button
                v-if="currentPlans.length > 1"
                type="button"
                @click="handleDeletePlan(selectedPlan)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Ushbu o'quv rejasini o'chirish"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Matndan nusxalash (Fast paste) bloki -->
          <div v-if="planImportMode === 'PASTE'" class="p-3 bg-violet-50/60 border border-violet-200 rounded-xl space-y-2">
            <div class="text-[11px] text-slate-600 font-medium">
              Excel, Word yoki Telegramdan darslar ro'yxatini nusxalab bu yerga joylang. Har bir qator alohida dars sifatida aniqlanadi:
            </div>
            <textarea
              v-model="planPasteText"
              rows="4"
              placeholder="1, Kirish va dasturlash asoslari, VS Code o'rnatish
2, HTML5 semantik teglari, Veb-sahifa strukturasi
3, CSS Flexbox va Grid, Adaptiv dizayn..."
              class="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-[#6D28D9]"
            ></textarea>
            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                @click="planImportMode = 'MANUAL'"
                class="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                @click="applyParsedTextToPlan(planPasteText)"
                :disabled="!planPasteText.trim()"
                class="px-4 py-1 rounded-lg bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] disabled:opacity-50 cursor-pointer"
              >
                Jadvalga o'tkazish
              </button>
            </div>
          </div>

          <!-- Darslar jadvali (Lessons Table) -->
          <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div class="max-h-80 overflow-y-auto">
              <table class="w-full text-left text-xs text-slate-700">
                <thead class="bg-slate-50 sticky top-0 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 z-10">
                  <tr>
                    <th class="py-2.5 px-3 w-16 text-center"># Tartib</th>
                    <th class="py-2.5 px-3">Dars mavzusi *</th>
                    <th class="py-2.5 px-3">Tavsif (ixtiyoriy)</th>
                    <th class="py-2.5 px-2 w-12 text-center">Amal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr
                    v-for="(row, idx) in planLessons"
                    :key="idx"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <td class="py-1.5 px-3 text-center">
                      <span class="font-extrabold text-[#6D28D9] text-xs">
                        {{ row.lessonOrder }}-dars
                      </span>
                    </td>
                    <td class="py-1.5 px-3">
                      <input
                        v-model="row.topic"
                        type="text"
                        placeholder="Mavzu nomi..."
                        class="w-full px-2.5 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#6D28D9]"
                      />
                    </td>
                    <td class="py-1.5 px-3">
                      <input
                        v-model="row.description"
                        type="text"
                        placeholder="Mavzu tavsifi..."
                        class="w-full px-2.5 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#6D28D9]"
                      />
                    </td>
                    <td class="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        @click="removePlanLessonRow(idx)"
                        class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>

                  <tr v-if="planLessons.length === 0">
                    <td colspan="4" class="py-8 text-center text-slate-400 text-xs">
                      Ushbu o'quv rejasida darslar mavjud emas. "+ Dars qo'shish" tugmasini bosing yoki fayl yuklang.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Table bottom quick action -->
            <div class="p-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                @click="addPlanLessonRow"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-[#6D28D9] hover:bg-violet-100 font-bold text-xs transition cursor-pointer"
              >
                <Plus class="h-3.5 w-3.5" />
                <span>+ Dars qo'shish</span>
              </button>

              <div class="text-[11px] text-slate-500 font-medium">
                Jami: <strong class="text-slate-800">{{ planLessons.length }} ta</strong> dars mavzusi
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-between pt-3 border-t border-slate-100">
            <div class="text-[11px] text-slate-400">
              Ushbu o'quv rejasi yangi guruhlar yaratishda avtomatik taqdim etiladi.
            </div>

            <div class="flex items-center gap-2">
              <button
                @click="showPlansModal = false"
                type="button"
                class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Yopish
              </button>
              <button
                type="button"
                @click="handleSaveSelectedPlan"
                :disabled="isSavingPlan"
                class="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] active:bg-[#4C1D95] disabled:opacity-50 transition cursor-pointer shadow-xs"
              >
                <CheckCircle2 v-if="!isSavingPlan" class="h-4 w-4" />
                <span>{{ isSavingPlan ? 'Saqlanmoqda...' : 'O\'quv Rejani Saqlash' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <!-- ======================================================== -->
    <!-- 2. TEZKOR DARS JADVALI MODALI (LEGACY/FAST SYLLABUS)     -->
    <!-- ======================================================== -->
    <Modal
      :show="showSyllabusModal"
      :title="`${activeCourse?.name || 'Kurs'} — Dars Jadvali`"
      max-width="2xl"
      @close="showSyllabusModal = false"
    >
      <div class="space-y-4">
        <!-- Kurs haqida xulosa kartasi -->
        <div class="p-3.5 rounded-xl bg-violet-50/70 border border-violet-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="space-y-0.5">
            <div class="font-bold text-slate-900 text-sm">{{ activeCourse?.name }}</div>
            <div class="text-slate-500 text-[11px]">
              Davomiyligi: <strong>{{ activeCourse?.durationMonths }} oy</strong> •
              Jami darslar: <strong>{{ activeCourse?.totalLessons || (activeCourse?.durationMonths || 1) * 12 }} ta</strong>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="downloadTemplateCsv"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
            >
              <Download class="h-3.5 w-3.5 text-slate-500" />
              <span>Namuna CSV</span>
            </button>

            <label class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6D28D9] text-white hover:bg-[#5B21B6] text-[11px] font-bold transition cursor-pointer shadow-2xs">
              <UploadCloud class="h-3.5 w-3.5" />
              <span>Jadval fayl yuklash</span>
              <input
                type="file"
                accept=".csv,.txt,.tsv"
                class="hidden"
                @change="handleFileUpload"
              />
            </label>
          </div>
        </div>

        <!-- Feedback Alert -->
        <div
          v-if="syllabusFeedback"
          class="p-3 rounded-xl text-xs font-semibold"
          :class="syllabusFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
        >
          {{ syllabusFeedback.text }}
        </div>

        <!-- Mode Selector Tabs: Manual table vs Paste text -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="importMode = 'MANUAL'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              :class="importMode === 'MANUAL' ? 'bg-[#6D28D9] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              Jadval bo'yicha
            </button>
            <button
              type="button"
              @click="importMode = 'PASTE'"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
              :class="importMode === 'PASTE' ? 'bg-[#6D28D9] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            >
              Tezkor matndan nusxa olish
            </button>
          </div>

          <button
            v-if="importMode === 'MANUAL'"
            type="button"
            @click="addSyllabusRow"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-[#6D28D9] hover:bg-violet-100 font-bold text-xs transition cursor-pointer"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Dars qo'shish</span>
          </button>
        </div>

        <!-- Mode 1: Fast Paste Text Area -->
        <div v-if="importMode === 'PASTE'" class="space-y-2">
          <p class="text-xs text-slate-500">
            Darslar ro'yxatini matn ko'rinishida joylang (masalan, Excel yoki Worddan nusxa oling).
          </p>
          <textarea
            v-model="pasteText"
            rows="6"
            placeholder="1, Kirish va dasturlash asoslari, VS Code o'rnatish
2, HTML5 semantik teglari, Veb-sahifa strukturasi
3, CSS Flexbox va Grid, Adaptiv dizayn..."
            class="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] font-mono"
          ></textarea>
          <div class="flex items-center justify-end gap-2">
            <button
              type="button"
              @click="applyParsedText(pasteText)"
              class="px-4 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] transition cursor-pointer"
            >
              Jadvalga o'tkazish
            </button>
          </div>
        </div>

        <!-- Mode 2: Interactive Table -->
        <div v-else class="space-y-3">
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs text-slate-700">
              <thead class="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th class="py-2.5 px-3 w-16 text-center">#</th>
                  <th class="py-2.5 px-3">Mavzu nomi *</th>
                  <th class="py-2.5 px-3">Qisqa tavsif</th>
                  <th class="py-2.5 px-2 w-12 text-center">O'chirish</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <tr
                  v-for="(row, idx) in syllabusRows"
                  :key="idx"
                  class="hover:bg-slate-50/60 transition-colors"
                >
                  <td class="py-2 px-3 text-center font-bold text-[#6D28D9]">
                    {{ row.lessonOrder }}
                  </td>
                  <td class="py-2 px-3">
                    <input
                      v-model="row.topic"
                      type="text"
                      placeholder="Mavzu nomi..."
                      class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#6D28D9]"
                    />
                  </td>
                  <td class="py-2 px-3">
                    <input
                      v-model="row.description"
                      type="text"
                      placeholder="Tavsif (ixtiyoriy)..."
                      class="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#6D28D9]"
                    />
                  </td>
                  <td class="py-2 px-2 text-center">
                    <button
                      type="button"
                      @click="removeSyllabusRow(idx)"
                      class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
                <tr v-if="syllabusRows.length === 0">
                  <td colspan="4" class="py-8 text-center text-slate-400 text-xs">
                    Ushbu kursga hali darslar biriktirilmagan. "Dars qo'shish" tugmasini bosing.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div class="text-[11px] text-slate-400">
            Jami: <strong class="text-slate-700">{{ syllabusRows.length }}</strong> ta dars rejasi
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="showSyllabusModal = false"
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              @click="handleSaveSyllabus"
              :disabled="isSavingSyllabus"
              class="px-6 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] disabled:opacity-50 transition cursor-pointer shadow-xs"
            >
              {{ isSavingSyllabus ? 'Saqlanmoqda...' : 'Dars Jadvalini Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- ======================================================== -->
    <!-- 3. CREATE COURSE MODAL                                   -->
    <!-- ======================================================== -->
    <Modal :show="showCreateModal" title="Yangi Kurs Qo'shish" max-width="md" @close="showCreateModal = false">
      <form @submit.prevent="handleCreateCourse" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Kurs nomi *</label>
          <input
            v-model="newName"
            type="text"
            required
            placeholder="Masalan, Python Backend & AI"
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Davomiyligi (oy) *</label>
            <input
              v-model="newDuration"
              type="number"
              min="1"
              max="24"
              required
              class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Oylik darslar soni *</label>
            <input
              v-model="newLessonsPerMonth"
              type="number"
              min="1"
              max="31"
              required
              class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9]"
            />
          </div>
        </div>

        <!-- Calculated Live Info -->
        <div class="p-2.5 rounded-xl bg-violet-50/70 border border-violet-100 flex items-center justify-between text-xs text-slate-600">
          <span>Jami rejalashtirilgan darslar:</span>
          <span class="font-extrabold text-[#6D28D9]">{{ calculatedTotalLessons }} ta dars</span>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Oylik to'lov narxi (so'm) *</label>
          <input
            v-model="newPrice"
            type="number"
            min="0"
            required
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tavsif (ixtiyoriy)</label>
          <textarea
            v-model="newDesc"
            rows="2"
            placeholder="Kurs haqida umumiy ma'lumot..."
            class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] resize-none"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving || !newName.trim()"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] active:bg-[#4C1D95] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Kursni Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
