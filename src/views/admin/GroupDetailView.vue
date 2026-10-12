<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { User, Course, Room, PaymentType, PaymentStatus, AttendanceStatus } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  ArrowLeft,
  Users,
  User as UserIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Search,
  ExternalLink,
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Building2,
  MoreVertical,
  UploadCloud,
  Play,
  FileText,
  File as FileIcon,
  Link as LinkIcon,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Eye,
  Check,
  Coins,
  Lock,
} from 'lucide-vue-next';
import { getTeacherPhoto } from '../../utils/teacherAvatars';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.isAdmin || authStore.user?.role === 'SUPERADMIN' || authStore.user?.role === 'ADMIN');

const groupId = computed(() => Number(route.params.id));
const loading = ref(true);
const group = ref<any>(null);
const allStudents = ref<User[]>([]);
const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const teachers = ref<User[]>([]);

// Tabs matching screenshots: Ma'lumotlar, Guruh darsliklari, Akademik davomati
const activeTab = ref<'OVERVIEW' | 'LESSONS' | 'ATTENDANCE' | 'SETTINGS'>('OVERVIEW');
const studentSearch = ref('');
const showStatsModal = ref(false);
const isParamsOpen = ref(true);
const isMentorsOpen = ref(true);

// Sync activeTab with route query ?tab=0,1,2
watch(
  () => route.query.tab,
  (tab) => {
    if (tab === '1') activeTab.value = 'LESSONS';
    else if (tab === '2') activeTab.value = 'ATTENDANCE';
    else if (tab === '0') activeTab.value = 'OVERVIEW';
  },
  { immediate: true }
);

function handleGoBack() {
  if (route.path.startsWith('/teacher')) {
    router.push('/teacher/dashboard');
  } else {
    router.push('/dashboard/groups');
  }
}

function handleNavigateStudent(studentId: number) {
  if (isAdmin.value) {
    router.push(`/dashboard/users/${studentId}`);
  }
}

function switchTab(tab: 'OVERVIEW' | 'LESSONS' | 'ATTENDANCE' | 'SETTINGS') {
  activeTab.value = tab;
  if (tab === 'LESSONS') {
    materialsViewMode.value = 'LIST';
    selectedHomework.value = null;
  }
  const tabNum = tab === 'OVERVIEW' ? '0' : tab === 'LESSONS' ? '1' : tab === 'ATTENDANCE' ? '2' : '0';
  router.replace({ query: { ...route.query, tab: tabNum } });
}

function handleOpenAddContent() {
  if (materialsSubTab.value === 'HOMEWORK') {
    openCreateHomeworkView();
  } else if (materialsSubTab.value === 'VIDEOS') {
    openAddVideoModal();
  } else if (materialsSubTab.value === 'EXAMS') {
    showAddExamModal.value = true;
  } else if (materialsSubTab.value === 'MATERIALS') {
    openAddMaterialModal();
  } else {
    showSyllabusModal.value = true;
  }
}

// Modals
const showAddStudentModal = ref(false);
const selectedStudentId = ref<number | ''>('');
const isAddingStudent = ref(false);

const showEditGroupDrawer = ref(false);
const editName = ref('');
const editCourseId = ref<number | string>('');
const editRoomId = ref<number | string>('');
const editTeacherId = ref<number | string>('');
const editAssistantTeacherId = ref<number | string>('');
const editWeekDays = ref<string[]>(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
const editDurationMonths = ref<number>(3);
const editStartTime = ref('14:00');
const editEndTime = ref('16:00');
const editStartDate = ref('2026-03-01');
const editMaxStudents = ref(15);
const editDescription = ref('');
const editError = ref('');
const isSubmittingEdit = ref(false);

const weekDayOptions = [
  { label: 'Dushanba', value: 'MONDAY' },
  { label: 'Seshanba', value: 'TUESDAY' },
  { label: 'Chorshanba', value: 'WEDNESDAY' },
  { label: 'Payshanba', value: 'THURSDAY' },
  { label: 'Juma', value: 'FRIDAY' },
  { label: 'Shanba', value: 'SATURDAY' },
  { label: 'Yakshanba', value: 'SUNDAY' },
];

function toggleEditWeekDay(day: string) {
  const idx = editWeekDays.value.indexOf(day);
  if (idx > -1) {
    editWeekDays.value.splice(idx, 1);
  } else {
    editWeekDays.value.push(day);
  }
}

const editDaysPerWeekCount = computed(() => editWeekDays.value.length || 3);
const editLessonsPerMonthCount = computed(() => editDaysPerWeekCount.value * 4);
const editTotalCalculatedLessons = computed(() => editLessonsPerMonthCount.value * (Number(editDurationMonths.value) || 1));
const editCalculatedEndDate = computed(() => {
  if (!editStartDate.value) return '2026-06-01';
  try {
    const d = new Date(editStartDate.value);
    d.setMonth(d.getMonth() + (Number(editDurationMonths.value) || 3));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  } catch {
    return '2026-06-01';
  }
});

const showEditLessonModal = ref(false);
const editLessonTopic = ref('');
const editLessonDesc = ref('');
const editLessonVideoUrl = ref('');
const isSubmittingLessonEdit = ref(false);

const showPaymentModal = ref(false);
const payStudent = ref<any>(null);
const payAmount = ref<number | null>(850000);
const payType = ref<PaymentType>('CASH');
const payStatus = ref<PaymentStatus>('PAID');
const payPaidForDate = ref(new Date().toISOString().slice(0, 10));
const payComment = ref('');
const isSubmittingPayment = ref(false);

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

function formatUzbekDate(d: string | Date | null | undefined): string {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  const months = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
    'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
  ];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatWeekDays(days: any): string {
  if (!days) return 'Du/Se/Ch/Pa/Ju';
  if (Array.isArray(days)) {
    if (days.length === 0) return 'Du/Se/Ch/Pa/Ju';
    const map: Record<string, string> = {
      MONDAY: 'Du',
      TUESDAY: 'Se',
      WEDNESDAY: 'Ch',
      THURSDAY: 'Pa',
      FRIDAY: 'Ju',
      SATURDAY: 'Sh',
      SUNDAY: 'Ya',
    };
    return days.map((d: string) => map[d] || d).join('/');
  }
  return String(days);
}

// ========================================================
// 1. DARS JADVALI & STUDY MONTHS CALENDAR ENGINE
// ========================================================
interface StudyDay {
  date: Date;
  dateStr: string;
  monthShort: string;
  dayNum: number;
  dayOfWeekUz: string; // Du, Se, Chor, Pay, Ju...
  formattedDate: string;
  lessonOrder: number;
  lessonId?: number;
  topic: string;
  description?: string;
  videoUrl?: string;
  isHeld: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isWeekend: boolean; // Saturday (6) or Sunday (0)
}

interface StudyMonth {
  index: number;
  title: string;
  isCurrent: boolean;
  monthName: string;
  days: StudyDay[];
}

const showMoreSchedules = ref(true);
const activeStudyMonthIndex = ref(0);
const showAllMonths = ref(false);
const selectedLessonDay = ref<StudyDay | null>(null);
const activeMentorRole = ref<'TEACHER' | 'ASSISTANT'>('TEACHER');
const topicMode = ref<'CURRICULUM' | 'CUSTOM'>('CUSTOM');
const selectedSyllabusId = ref<number | ''>('');
const lessonTopicInput = ref('');
const lessonDescInput = ref('');
const assistantTopicInput = ref('');
const assistantDescInput = ref('');
const assistantVideoUrl = ref('');
const lessonAttendanceMap = ref<Record<number, boolean>>({});
const isSavingAttendance = ref(false);
const showExtraContent = ref(false);

// Unified Day Homework (1 ta vazifa)
const dayHwTitle = ref('');
const dayHwTask = ref('');
const dayHwDeadline = ref('');
const dayHwMaxScore = ref(100);

// Homework grading / submission check modal
const showCheckHomeworkModal = ref(false);
const gradingHomework = ref<any>(null);
const homeworkGradesMap = ref<Record<number, { score: number; feedback: string }>>({});
const isSavingHomeworkGrades = ref(false);

// Video Watch Modal
const showWatchVideoModal = ref(false);
const currentWatchVideo = ref<any>(null);

// Interactive Academic Attendance Matrix (dateStr -> studentId -> AttendanceStatus)
const gridAttendanceMap = ref<Record<string, Record<number, AttendanceStatus>>>({});

// Modals: O'quv reja biriktirish & Mentor biriktirish
const showSyllabusModal = ref(false);
const newSyllabusOrder = ref<number | ''>('');
const newSyllabusTopic = ref('');
const newSyllabusDesc = ref('');
const isSubmittingSyllabus = ref(false);

const showAssignMentorModal = ref(false);
const assignTeacherId = ref<number | ''>('');
const assignIsMain = ref(true);
const isSubmittingAssignMentor = ref(false);

export interface StudentGradeState {
  status: AttendanceStatus;
  score: number;
  coins: number;
  note: string;
}

const lessonScoresMap = ref<Record<number, StudentGradeState>>({});
const selectedLessonVideoUrl = ref('https://www.youtube.com/embed/dQw4w9WgXcQ');
const showEditVideoModal = ref(false);
const videoUrlInput = ref('');

const studentSubmissionText = ref('');
const studentSubmissionFileUrl = ref('');
const isSubmittingStudentHomework = ref(false);

// ============ EXAM CRUD STATE ============
const examList = ref<any[]>([]);
const showAddExamModal = ref(false);
const showEditExamModal = ref(false);
const newExamTitle = ref('');
const newExamDate = ref(new Date().toISOString().slice(0, 10));
const newExamMaxScore = ref(100);
const isSubmittingExam = ref(false);
const editingExam = ref<any>(null);
const editExamTitle = ref('');
const editExamDate = ref('');
const editExamMaxScore = ref(100);
const showExamResultsModal = ref(false);
const examForResults = ref<any>(null);
const examResultsMap = ref<Record<number, number>>({});
const isSubmittingExamResults = ref(false);

// ============ HOMEWORK EDIT STATE ============
const showEditHomeworkModal = ref(false);
const editingHomework = ref<any>(null);
const editHwTitle = ref('');
const editHwTask = ref('');
const editHwDeadline = ref('');
const editHwMaxScore = ref(100);
const isSubmittingHwEdit = ref(false);

const monthNamesShortEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayNamesUz = ['Yak', 'Du', 'Se', 'Chor', 'Pay', 'Ju', 'Shan'];

// Course Syllabus / Plan List (Defined early so studyMonths & selectLessonDay can use it)
const courseSyllabusList = computed<any[]>(() => {
  // 1. Group's specific assigned curriculum plan
  if (group.value?.plan?.lessons && group.value.plan.lessons.length > 0) {
    return group.value.plan.lessons;
  }
  // 2. Course's default curriculum plan
  if (group.value?.course?.plans && group.value.course.plans.length > 0) {
    const defPlan = group.value.course.plans.find((p: any) => p.isDefault) || group.value.course.plans[0];
    if (defPlan.lessons && defPlan.lessons.length > 0) {
      return defPlan.lessons;
    }
  }
  // 3. Course general syllabus
  if (group.value?.course?.syllabus && group.value.course.syllabus.length > 0) {
    return group.value.course.syllabus;
  }
  const cName = group.value?.course?.name || '';
  if (cName.toLowerCase().includes('ielts')) {
    return [
      { id: 1, lessonOrder: 1, topic: "Introduction to IELTS & Diagnostic Test", description: "Format of IELTS exam and scoring criteria" },
      { id: 2, lessonOrder: 2, topic: "Listening Section 1: Form Completion & Notes", description: "Strategies for personal details and numbers" },
      { id: 3, lessonOrder: 3, topic: "Reading Academic: Skimming & Scanning Skills", description: "Fast navigation and identifying keywords" },
      { id: 4, lessonOrder: 4, topic: "Writing Task 1: Line Graphs & Bar Charts", description: "Describing trends, increases, and decreases" },
      { id: 5, lessonOrder: 5, topic: "Speaking Part 1: Fluency & Daily Topics", description: "Natural conversation and confidence building" },
      { id: 6, lessonOrder: 6, topic: "Listening Section 2: Maps and Multiple Choice", description: "Following directions and map labelling" },
      { id: 7, lessonOrder: 7, topic: "Reading: True / False / Not Given Mastery", description: "Clear difference between False and Not Given" },
      { id: 8, lessonOrder: 8, topic: "Writing Task 2: Opinion Essays & Structure", description: "Introduction, body paragraphs, and strong thesis" },
      { id: 9, lessonOrder: 9, topic: "Speaking Part 2: Cue Card 2-minute Presentation", description: "Storytelling, vocabulary, and time management" },
      { id: 10, lessonOrder: 10, topic: "Listening Section 3 & 4: Academic Lectures", description: "Note taking in high speed lectures" },
      { id: 11, lessonOrder: 11, topic: "Writing Task 2: Discussion & Solution Essays", description: "Balanced view essays with clear examples" },
      { id: 12, lessonOrder: 12, topic: "Full Mock Exam & Intensive Feedback", description: "Real test conditions and individualized score analysis" },
    ];
  }
  return [
    { id: 1, lessonOrder: 1, topic: "Kirish: Dasturlash asoslari va Muhitni sozlash", description: "VS Code, Git va terminal buyruqlari" },
    { id: 2, lessonOrder: 2, topic: "HTML5 Semantik teglari va Zamonaviy CSS", description: "Flexbox, Grid va Adaptiv dizayn tamoyillari" },
    { id: 3, lessonOrder: 3, topic: "JavaScript Asoslari: O'zgaruvchilar va Funksiyalar", description: "ES6+, Arrow functions va Scope" },
    { id: 4, lessonOrder: 4, topic: "JavaScript DOM va Hodisalar bilan ishlash", description: "Event listeners, dynamic DOM manipulation" },
    { id: 5, lessonOrder: 5, topic: "Asinxron JavaScript: Promises va Async/Await", description: "Fetch API va REST server bilan bog'lanish" },
    { id: 6, lessonOrder: 6, topic: "Vue 3 Asoslari: Reaktivlik va Komponentlar", description: "Composition API, ref, reactive, computed" },
    { id: 7, lessonOrder: 7, topic: "Vue Router va Ko'p sahifali ilova arxitekturasi", description: "Dynamic routes, navigation guards" },
    { id: 8, lessonOrder: 8, topic: "Pinia: Holat boshqaruvi (State Management)", description: "Global store, actions va getters" },
    { id: 9, lessonOrder: 9, topic: "Backend API bilan to'liq integratsiya", description: "Axios interceptors, JWT authentication" },
    { id: 10, lessonOrder: 10, topic: "Tailwind CSS bilan zamonaviy UI yaratish", description: "Design systems, dark mode va animatsiyalar" },
    { id: 11, lessonOrder: 11, topic: "Amaliy Loyiha: Full-featured Dashboard", description: "Haqiqiy ERP tizimi komponentlari" },
    { id: 12, lessonOrder: 12, topic: "Deploy va Loyihani taqdimot qilish", description: "Vercel, Docker va Portfolio tayyorlash" },
  ];
});

function onSelectSyllabusTopic() {
  if (!selectedSyllabusId.value) return;
  const match = courseSyllabusList.value.find((s) => s.id === Number(selectedSyllabusId.value));
  if (match) {
    lessonTopicInput.value = `${match.lessonOrder}-dars: ${match.topic}`;
    if (match.description) {
      lessonDescInput.value = match.description;
    }
  }
}

// Generate dynamic study months with REAL calendar dates matching group cohort schedule
const studyMonths = computed<StudyMonth[]>(() => {
  const result: StudyMonth[] = [];
  const duration = Math.max(1, group.value?.course?.durationMonths || 6);
  const existingLessons = group.value?.lessons || [];

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let cur = new Date(2026, 0, 28);
  if (group.value?.startDate) {
    const parsed = new Date(group.value.startDate);
    if (!isNaN(parsed.getTime())) {
      cur = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  let cumulativeOrder = 1;

  for (let m = 0; m < duration; m++) {
    const studyDays: StudyDay[] = [];
    while (studyDays.length < 20) {
      const dayOfWeek = cur.getDay(); // 0: Sun, 6: Sat
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, '0');
        const dd = String(cur.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const formattedDate = `${cur.getDate()}-${monthNamesShortEn[cur.getMonth()]}, ${yyyy}`;
        const lessonOrderNum = cumulativeOrder++;

        const existing = existingLessons.find(
          (l: any) => l.lessonDate?.slice(0, 10) === dateStr || l.lessonOrder === lessonOrderNum
        );

        const curMidnight = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()).getTime();
        const isToday = curMidnight === todayMidnight;
        const isPast = curMidnight < todayMidnight;
        const isFuture = curMidnight > todayMidnight;
        const isHeld = existing?.status === 'ACTIVE' || existing?.status === 'COMPLETED' || isPast;

        const syl = courseSyllabusList.value.find((s: any) => s.lessonOrder === lessonOrderNum)
          || courseSyllabusList.value[lessonOrderNum - 1];
        const defaultTopic = syl ? `${syl.lessonOrder}-dars: ${syl.topic}` : `${lessonOrderNum}-dars: O'quv mavzusi`;
        const defaultDesc = syl?.description || '';

        studyDays.push({
          date: new Date(cur),
          dateStr,
          monthShort: monthNamesShortEn[cur.getMonth()],
          dayNum: cur.getDate(),
          dayOfWeekUz: dayNamesUz[dayOfWeek],
          formattedDate,
          lessonOrder: lessonOrderNum,
          lessonId: existing?.id,
          topic: existing?.topic || defaultTopic,
          description: existing?.description || defaultDesc,
          videoUrl: existing?.videoUrl || '',
          isHeld,
          isToday,
          isPast,
          isFuture,
          isWeekend: false,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    const hasToday = studyDays.some((d) => d.isToday);
    const hasRecent = studyDays.some((d) => !d.isFuture && (todayMidnight - new Date(d.date.getFullYear(), d.date.getMonth(), d.date.getDate()).getTime()) <= 3 * 24 * 60 * 60 * 1000);
    const isCurrent = hasToday || hasRecent;

    result.push({
      index: m,
      title: `${m + 1}-o'quv oyi`,
      isCurrent,
      monthName: studyDays.length > 0 ? `${studyDays[0].monthShort} - ${studyDays[studyDays.length - 1].monthShort}` : '',
      days: studyDays,
    });
  }

  return result;
});

const currentStudyMonth = computed<StudyMonth | undefined>(() => {
  return studyMonths.value[activeStudyMonthIndex.value] || studyMonths.value[0];
});

function prevStudyMonth() {
  if (activeStudyMonthIndex.value > 0) {
    activeStudyMonthIndex.value--;
  }
}

function nextStudyMonth() {
  if (activeStudyMonthIndex.value < studyMonths.value.length - 1) {
    activeStudyMonthIndex.value++;
  }
}

// Qat'iy qoidalar:
// 1. Admin: barcha kunlarga (eski, hozirgi, kelajak) to'liq kira oladi va darslarni boshqara oladi.
// 2. Teacher: kelajakdagi kunlar va juda eski kunlarni ko'ra olmaydi / kirolmaydi (yopiq, bosilmaydi).
// Faqat joriy kunlar (bugungi kun va oxirgi 3 kun ichidagi yaqin darslar) ochiq bo'ladi.
function isFutureDay(day: StudyDay | null | undefined): boolean {
  if (!day) return false;
  return !!day.isFuture;
}

function isVeryOldDay(day: StudyDay | null | undefined): boolean {
  if (!day) return false;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMidnight = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate()).getTime();
  const diffDays = Math.round((todayMidnight - dayMidnight) / (24 * 60 * 60 * 1000));
  // Agar bugundan 3 kundan ortiq o'tib ketgan bo'lsa (masalan 1 hafta yoki 1 oy oldingi darslar), bu juda eski kun
  return diffDays > 3;
}

function canAccessDay(day: StudyDay | null | undefined): boolean {
  if (!day) return false;
  // Admin barcha kunlarga to'liq erkin kira oladi
  if (isAdmin.value) return true;

  // Teacher bo'lsa:
  // 1. Kelajakdagi kunlar yopiq:
  if (isFutureDay(day)) return false;

  // 2. Juda eski kunlar yopiq:
  if (isVeryOldDay(day)) return false;

  // Faqat joriy/hozirgi kunlar (bugun va oxirgi 3 kun ichidagi darslar) ochiq
  return true;
}

function getDayTitle(day: StudyDay): string {
  if (isAdmin.value) {
    return `${day.formattedDate} — Admin ruxsati bilan ochiq`;
  }
  if (isFutureDay(day)) {
    return `${day.formattedDate} — Dars kuni hali kelmagan (Yopiq)`;
  }
  if (isVeryOldDay(day)) {
    return `${day.formattedDate} — Dars muddati o'tgan (Eski dars yopilgan)`;
  }
  return `${day.formattedDate} — Joriy dars kuni`;
}

function handleSelectDay(day: StudyDay, monthIndex?: number) {
  if (!canAccessDay(day)) {
    if (isFutureDay(day)) {
      showFeedback("Ushbu dars kuni hali kelmagan. Kelajakdagi kunlarga dars va yo'qlama kiritib bo'lmaydi.", "error");
    } else {
      showFeedback("Ushbu dars muddati o'tgan va yopilgan. O'qituvchilar faqat joriy kunlardagi darslarni ko'ra oladi.", "error");
    }
    return;
  }
  selectLessonDay(day, monthIndex);
}

function getFirstAccessibleDay(month?: StudyMonth): StudyDay | undefined {
  const m = month || currentStudyMonth.value || studyMonths.value[0];
  if (!m || !m.days) return undefined;
  if (isAdmin.value) return m.days[0];
  return m.days.find((d) => d.isToday) || m.days.find((d) => canAccessDay(d)) || m.days.find((d) => !d.isFuture) || m.days[0];
}

// 2-rasmdagi dars kuni formati: masalan "2026 M07 15"
function formatLessonDateDisplay(day: StudyDay | null): string {
  if (!day) return '-';
  const d = day.date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy} M${mm} ${dd}`;
}


function selectLessonDay(day: StudyDay, monthIndex?: number) {
  selectedLessonDay.value = day;
  if (monthIndex !== undefined) {
    activeStudyMonthIndex.value = monthIndex;
  }

  // Kalendardan kun bosilganda dars reja ham o'sha kunnikiga avtomatik o'zgaradi
  const matchSyl = courseSyllabusList.value.find((s: any) => s.lessonOrder === day.lessonOrder)
    || courseSyllabusList.value[day.lessonOrder - 1];

  if (matchSyl) {
    selectedSyllabusId.value = matchSyl.id;
  } else {
    selectedSyllabusId.value = '';
  }

  const existingLesson = group.value?.lessons?.find(
    (l: any) => l.id === day.lessonId || l.lessonOrder === day.lessonOrder
  );

  if (existingLesson && existingLesson.topic && existingLesson.isCustomTopic) {
    day.lessonId = existingLesson.id;
    day.topic = existingLesson.topic;
    day.description = existingLesson.description || existingLesson.content || '';
    day.videoUrl = existingLesson.videoUrl || '';
    lessonTopicInput.value = existingLesson.topic;
    lessonDescInput.value = existingLesson.description || existingLesson.content || (matchSyl?.description || '');
    assistantTopicInput.value = `Amaliyot: ${existingLesson.topic}`;
    assistantDescInput.value = "Topshiriqlar tahlili va amaliy ko'nikmalarni mustahkamlash";
    selectedLessonVideoUrl.value = existingLesson.videoUrl || '';
  } else if (matchSyl) {
    day.topic = `${matchSyl.lessonOrder}-dars: ${matchSyl.topic}`;
    day.description = matchSyl.description || '';
    lessonTopicInput.value = `${matchSyl.lessonOrder}-dars: ${matchSyl.topic}`;
    lessonDescInput.value = matchSyl.description || '';
    assistantTopicInput.value = `Amaliyot: ${matchSyl.topic}`;
    assistantDescInput.value = `${matchSyl.topic} bo'yicha mustaqil topshiriqlar va amaliy mashg'ulot`;
    selectedLessonVideoUrl.value = existingLesson?.videoUrl || day.videoUrl || '';
    if (existingLesson?.id) day.lessonId = existingLesson.id;
  } else {
    lessonTopicInput.value = day.topic || `${day.lessonOrder}-dars: O'quv mavzusi`;
    lessonDescInput.value = day.description || '';
    assistantTopicInput.value = `Amaliyot: ${day.lessonOrder}-dars amaliy mashg'uloti`;
    assistantDescInput.value = "Amaliy mashqlar va savol-javob";
    selectedLessonVideoUrl.value = day.videoUrl || '';
  }
  videoUrlInput.value = selectedLessonVideoUrl.value;

  // Single Unified Homework for this day
  const existingHw = homeworkList.value.find(
    (h: any) => h.lessonOrder === day.lessonOrder || h.lessonDate?.slice(0, 10) === day.dateStr
  );
  if (existingHw) {
    dayHwTitle.value = existingHw.title;
    dayHwTask.value = existingHw.task || existingHw.title;
    dayHwDeadline.value = existingHw.deadline || '';
    dayHwMaxScore.value = existingHw.maxScore || 100;
  } else {
    dayHwTitle.value = `${day.lessonOrder}-dars vazifasi: ${lessonTopicInput.value || "Amaliy topshiriq"}`;
    dayHwTask.value = "O'tilgan mavzu bo'yicha mustaqil amaliy mashg'ulotni yakunlab, natijani topshiring.";
    dayHwDeadline.value = `${day.dateStr}T23:59`;
    dayHwMaxScore.value = 100;
  }

  // Initialize attendance & scores map for students
  const scoreMap: Record<number, StudentGradeState> = {};
  const attMap: Record<number, boolean> = {};

  for (const s of groupStudents.value) {
    const existingStatus = gridAttendanceMap.value[day.dateStr]?.[s.id];
    const status: AttendanceStatus = existingStatus || (day.isHeld ? 'PRESENT' : 'PRESENT');
    attMap[s.id] = status === 'PRESENT';
    scoreMap[s.id] = {
      status,
      score: status === 'PRESENT' ? 90 : 0,
      coins: status === 'PRESENT' ? 1 : 0,
      note: '',
    };
  }
  lessonAttendanceMap.value = attMap;
  lessonScoresMap.value = scoreMap;
}

function setStudentStatus(studentId: number, status: AttendanceStatus) {
  if (!lessonScoresMap.value[studentId]) {
    lessonScoresMap.value[studentId] = {
      status,
      score: status === 'PRESENT' ? 90 : 0,
      coins: status === 'PRESENT' ? 1 : 0,
      note: '',
    };
  } else {
    lessonScoresMap.value[studentId].status = status;
    if (status === 'ABSENT') {
      lessonScoresMap.value[studentId].score = 0;
      lessonScoresMap.value[studentId].coins = 0;
    } else if (status === 'PRESENT' && lessonScoresMap.value[studentId].score === 0) {
      lessonScoresMap.value[studentId].score = 90;
      lessonScoresMap.value[studentId].coins = 1;
    }
  }
  lessonAttendanceMap.value[studentId] = status === 'PRESENT' || status === 'LATE';
}

function markAllStudentsPresent() {
  for (const s of groupStudents.value) {
    setStudentStatus(s.id, 'PRESENT');
  }
}

function markAllStudentsAbsent() {
  for (const s of groupStudents.value) {
    setStudentStatus(s.id, 'ABSENT');
  }
}

function navigateToLesson(day?: StudyDay, monthIndex?: number) {
  const targetDay = (day && canAccessDay(day)) ? day : getFirstAccessibleDay();
  if (targetDay && canAccessDay(targetDay)) {
    selectLessonDay(targetDay, monthIndex);
    activeTab.value = 'LESSONS';
  } else if (isAdmin.value && targetDay) {
    selectLessonDay(targetDay, monthIndex);
    activeTab.value = 'LESSONS';
  } else {
    showFeedback("Hozirgi ochiq dars kuni mavjud emas.", "error");
  }
}

function toggleStudentAttendance(studentId: number) {
  lessonAttendanceMap.value[studentId] = !lessonAttendanceMap.value[studentId];
  const newStatus: AttendanceStatus = lessonAttendanceMap.value[studentId] ? 'PRESENT' : 'ABSENT';
  setStudentStatus(studentId, newStatus);
}

// Interactive Academic Attendance Matrix helper functions
function getStudentAttendanceStatus(dateStr: string, studentId: number): AttendanceStatus {
  if (gridAttendanceMap.value[dateStr]?.[studentId]) {
    return gridAttendanceMap.value[dateStr][studentId];
  }
  return 'PRESENT';
}

async function toggleGridAttendance(dateStr: string, studentId: number) {
  const day = studyMonths.value.flatMap((m) => m.days).find((d) => d.dateStr === dateStr);
  if (!canAccessDay(day)) {
    if (day?.isFuture) {
      showFeedback("Ushbu dars kuni hali kelmagan. Davomat kiritib bo'lmaydi.", 'error');
    } else {
      showFeedback("Ushbu dars muddati o'tgan va yopilgan. O'qituvchilar faqat joriy kunlardagi darslarni boshqara oladi.", 'error');
    }
    return;
  }
  if (!gridAttendanceMap.value[dateStr]) {
    gridAttendanceMap.value[dateStr] = {};
  }
  const current = gridAttendanceMap.value[dateStr][studentId] || 'PRESENT';
  // On/off switch logic: if currently PRESENT, turn OFF (ABSENT, 0 coin); otherwise turn ON (PRESENT, +1 coin)
  const next: AttendanceStatus = current === 'PRESENT' ? 'ABSENT' : 'PRESENT';

  gridAttendanceMap.value[dateStr][studentId] = next;

  // Reactively adjust student's coins
  const student = groupStudents.value.find((s: any) => s.id === studentId);
  if (student) {
    if (next === 'PRESENT') {
      student.coins = (student.coins || 0) + 1;
      showFeedback(`${student.firstName} ${student.lastName}: Davomat qayd etildi (+1 coin)`, 'success');
    } else {
      student.coins = Math.max(0, (student.coins || 0) - 1);
    }
  }

  // Persist if lesson exists
  if (day?.lessonId) {
    try {
      await erpService.saveAttendance(day.lessonId, [
        {
          studentId,
          status: next,
          coinsEarned: next === 'PRESENT' ? 1 : 0,
        },
      ]);
    } catch (err) {
      console.warn('Grid davomat saqlashda xatolik:', err);
    }
  }
}

// Homework Submission Grading Modal functions
function openGradeHomeworkModal(hw: any) {
  gradingHomework.value = hw;
  const map: Record<number, { score: number; feedback: string }> = {};
  for (const s of groupStudents.value) {
    map[s.id] = { score: 95, feedback: "A'lo darajada bajarilgan!" };
  }
  homeworkGradesMap.value = map;
  showCheckHomeworkModal.value = true;
}

async function handleSaveHomeworkGrades() {
  if (!gradingHomework.value) return;
  isSavingHomeworkGrades.value = true;
  try {
    for (const s of groupStudents.value) {
      const item = homeworkGradesMap.value[s.id] || { score: 90, feedback: '' };
      const score = Number(item.score);
      const coinsEarned = score >= 90 ? 3 : score >= 70 ? 2 : score >= 60 ? 1 : 0;
      s.coins = (s.coins || 0) + coinsEarned;
    }
    showFeedback("Vazifalar baholandi va talabalarga tangalar (+3/+2/+1) berildi!");
    showCheckHomeworkModal.value = false;
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Baholashda xatolik', 'error');
  } finally {
    isSavingHomeworkGrades.value = false;
  }
}

// Watch Video Modal
function getEmbedUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('youtube.com/watch?v=')) {
    const videoId = url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
}

function openWatchVideoModal(videoItem: any) {
  currentWatchVideo.value = videoItem;
  showWatchVideoModal.value = true;
}

async function handleSaveLessonAttendance() {
  await handleSaveLessonAttendanceAndGrades();
}

async function handleSaveLessonAttendanceAndGrades() {
  if (!selectedLessonDay.value) return;
  isSavingAttendance.value = true;
  try {
    let lessonId = selectedLessonDay.value.lessonId;
    const activeTopic = lessonTopicInput.value || (activeMentorRole.value === 'TEACHER' ? `${selectedLessonDay.value.lessonOrder}-dars` : assistantTopicInput.value);
    const activeDesc = lessonDescInput.value || assistantDescInput.value;
    const activeTeacherId = currentActiveMentor.value?.id || (activeMentorRole.value === 'TEACHER' ? (mainMentor.value?.id || groupMentor.value?.id) : (assistantMentor.value?.id || 5));

    if (!lessonId) {
      const created = await erpService.createLesson({
        groupId: groupId.value,
        lessonOrder: selectedLessonDay.value.lessonOrder,
        topic: activeTopic || `${selectedLessonDay.value.lessonOrder}-dars`,
        description: activeDesc,
        videoUrl: selectedLessonVideoUrl.value || undefined,
        lessonDate: selectedLessonDay.value.dateStr,
        teacherId: activeTeacherId,
        roomId: group.value?.roomId,
      });
      lessonId = created?.id || Date.now();
      selectedLessonDay.value.lessonId = lessonId;
    } else {
      await erpService.updateLesson(lessonId, {
        topic: activeTopic,
        description: activeDesc,
        videoUrl: selectedLessonVideoUrl.value || undefined,
        teacherId: activeTeacherId,
      });
    }

    if (!group.value.lessons) group.value.lessons = [];
    const existingIdx = group.value.lessons.findIndex((l: any) => l.id === lessonId || l.lessonOrder === selectedLessonDay.value?.lessonOrder);
    const updatedLessonObj = {
      id: lessonId,
      groupId: groupId.value,
      lessonOrder: selectedLessonDay.value.lessonOrder,
      topic: activeTopic,
      description: activeDesc,
      videoUrl: selectedLessonVideoUrl.value || '',
      lessonDate: selectedLessonDay.value.dateStr,
      status: 'ACTIVE',
      isCustomTopic: true,
    };
    if (existingIdx !== -1) {
      group.value.lessons[existingIdx] = { ...group.value.lessons[existingIdx], ...updatedLessonObj };
    } else {
      group.value.lessons.push(updatedLessonObj);
    }

    selectedLessonDay.value.isHeld = true;
    selectedLessonDay.value.topic = activeTopic;
    selectedLessonDay.value.description = activeDesc;

    // Save Unified Homework (1 ta vazifa)
    if (dayHwTitle.value) {
      const existingHw = homeworkList.value.find(
        (h: any) => h.lessonOrder === selectedLessonDay.value?.lessonOrder || h.lessonId === lessonId
      );
      if (existingHw) {
        await erpService.updateHomework(existingHw.id, {
          title: dayHwTitle.value,
          task: dayHwTask.value,
          maxScore: dayHwMaxScore.value,
        });
        existingHw.title = dayHwTitle.value;
        existingHw.task = dayHwTask.value;
      } else {
        const createdHw = await erpService.createHomework({
          title: dayHwTitle.value,
          task: dayHwTask.value,
          lessonId,
          maxScore: dayHwMaxScore.value,
          deadline: dayHwDeadline.value ? new Date(dayHwDeadline.value).toISOString() : undefined,
        });
        homeworkList.value.unshift({
          id: createdHw?.id || Date.now(),
          title: dayHwTitle.value,
          task: dayHwTask.value,
          lessonOrder: selectedLessonDay.value.lessonOrder,
          lessonId,
          studentsCount: groupStudents.value.length || 1,
          pendingCount: 0,
          completedCount: 0,
          assignedAt: 'Bugun 11:14',
          deadline: dayHwDeadline.value?.replace('T', ' ') || '28 Aug, 2026 18:00',
          lessonDate: selectedLessonDay.value.formattedDate,
          maxScore: dayHwMaxScore.value,
        });
      }
    }

    // Save Attendance and award +1 coin for PRESENT
    if (groupStudents.value.length > 0 && lessonId) {
      const records = groupStudents.value.map((s: any) => {
        const item = lessonScoresMap.value[s.id] || {
          status: lessonAttendanceMap.value[s.id] ? 'PRESENT' : 'ABSENT',
          score: 90,
          coins: 1,
          note: '',
        };
        const coinsEarned = item.status === 'PRESENT' ? 1 : 0;

        if (!gridAttendanceMap.value[selectedLessonDay.value!.dateStr]) {
          gridAttendanceMap.value[selectedLessonDay.value!.dateStr] = {};
        }
        const prevStatus = gridAttendanceMap.value[selectedLessonDay.value!.dateStr][s.id];
        if (prevStatus !== 'PRESENT' && item.status === 'PRESENT') {
          s.coins = (s.coins || 0) + 1;
        } else if (prevStatus === 'PRESENT' && item.status !== 'PRESENT') {
          s.coins = Math.max(0, (s.coins || 0) - 1);
        }
        gridAttendanceMap.value[selectedLessonDay.value!.dateStr][s.id] = item.status;

        return {
          studentId: s.id,
          status: item.status,
          coinsEarned,
          note: item.note ? `${item.note} (Ball: ${item.score})` : `Dars bali: ${item.score}`,
        };
      });
      await erpService.saveAttendance(lessonId, records as any);
    }

    selectedLessonDay.value.isHeld = true;
    selectedLessonDay.value.topic = activeTopic;
    selectedLessonDay.value.description = activeDesc;
    selectedLessonDay.value.videoUrl = selectedLessonVideoUrl.value;

    showFeedback("Dars mavzusi, umumiy vazifa va yo'qlama (+1 tanga) muvaffaqiyatli saqlandi!", 'success');
  } catch (err: any) {
    console.error("Saqlashda xatolik:", err);
    showFeedback(err.response?.data?.message || 'Saqlashda xatolik yuz berdi', 'error');
  } finally {
    isSavingAttendance.value = false;
  }
}

async function handleSaveLessonVideo() {
  if (!selectedLessonDay.value) return;
  const url = videoUrlInput.value.trim();
  try {
    let lessonId = selectedLessonDay.value.lessonId;
    if (!lessonId) {
      const created = await erpService.createLesson({
        groupId: groupId.value,
        lessonOrder: selectedLessonDay.value.lessonOrder,
        topic: lessonTopicInput.value || `${selectedLessonDay.value.lessonOrder}-dars`,
        description: lessonDescInput.value || '',
        videoUrl: url,
        lessonDate: selectedLessonDay.value.dateStr,
        teacherId: groupMentor.value?.id,
        roomId: group.value?.roomId,
      });
      lessonId = created?.id || Date.now();
      selectedLessonDay.value.lessonId = lessonId;
    } else {
      await erpService.updateLesson(lessonId, {
        videoUrl: url,
      });
    }

    selectedLessonVideoUrl.value = url;
    selectedLessonDay.value.videoUrl = url;
    showEditVideoModal.value = false;
    showFeedback("Dars videosi muvaffaqiyatli saqlandi!");
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Video saqlashda xatolik', 'error');
  }
}

function openEditLessonModal() {
  if (!selectedLessonDay.value) return;
  editLessonTopic.value = selectedLessonDay.value.topic || '';
  editLessonDesc.value = selectedLessonDay.value.description || '';
  editLessonVideoUrl.value = selectedLessonDay.value.videoUrl || selectedLessonVideoUrl.value || '';
  showEditLessonModal.value = true;
}

async function handleSaveLessonDetails() {
  if (!selectedLessonDay.value) return;
  isSubmittingLessonEdit.value = true;
  try {
    let lessonId = selectedLessonDay.value.lessonId;
    if (!lessonId) {
      const created = await erpService.createLesson({
        groupId: groupId.value,
        lessonOrder: selectedLessonDay.value.lessonOrder,
        topic: editLessonTopic.value || `${selectedLessonDay.value.lessonOrder}-dars`,
        description: editLessonDesc.value || '',
        videoUrl: editLessonVideoUrl.value || '',
        lessonDate: selectedLessonDay.value.dateStr,
        teacherId: groupMentor.value?.id,
        roomId: group.value?.roomId,
      });
      lessonId = created?.id || Date.now();
      selectedLessonDay.value.lessonId = lessonId;
    } else {
      await erpService.updateLesson(lessonId, {
        topic: editLessonTopic.value,
        description: editLessonDesc.value,
        videoUrl: editLessonVideoUrl.value,
      });
    }

    selectedLessonDay.value.topic = editLessonTopic.value;
    selectedLessonDay.value.description = editLessonDesc.value;
    selectedLessonDay.value.videoUrl = editLessonVideoUrl.value;
    selectedLessonVideoUrl.value = editLessonVideoUrl.value;
    lessonTopicInput.value = editLessonTopic.value;
    lessonDescInput.value = editLessonDesc.value;

    showEditLessonModal.value = false;
    showFeedback("Dars ma'lumotlari muvaffaqiyatli yangilandi!");
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Darsni yangilashda xatolik', 'error');
  } finally {
    isSubmittingLessonEdit.value = false;
  }
}

async function handleStudentSubmitHomework() {
  if (!studentSubmissionText.value && !studentSubmissionFileUrl.value) {
    showFeedback("Iltimos, vazifa javobini yoki fayl havolasini kiriting", "error");
    return;
  }
  isSubmittingStudentHomework.value = true;
  try {
    const targetHwId = homeworkList.value[0]?.id || 1;
    await erpService.submitHomework(targetHwId, {
      textAnswer: studentSubmissionText.value,
      fileUrls: studentSubmissionFileUrl.value ? [studentSubmissionFileUrl.value] : [],
    });
    showFeedback("Topshiriq muvaffaqiyatli yuborildi!");
    studentSubmissionText.value = '';
    studentSubmissionFileUrl.value = '';
    await loadGroupHomeworks();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Topshirishda xatolik yuz berdi', 'error');
  } finally {
    isSubmittingStudentHomework.value = false;
  }
}

// ========================================================
// 2. GURUH DARSLIKLARI TAB (SCREENSHOTS 1, 2, 3, 4, 5)
// ========================================================
const materialsViewMode = ref<'LIST' | 'CREATE_HOMEWORK' | 'CHECK_HOMEWORK'>('LIST');
const materialsSubTab = ref<'HOMEWORK' | 'VIDEOS' | 'EXAMS' | 'MATERIALS' | 'JOURNAL'>('HOMEWORK');

function setMaterialsSubTab(tab: 'HOMEWORK' | 'VIDEOS' | 'EXAMS' | 'MATERIALS' | 'JOURNAL') {
  materialsSubTab.value = tab;
  materialsViewMode.value = 'LIST';
  selectedHomework.value = null;
}

// --------------------------------------------------------
// MATERIALS SUBTAB (Dars Materiallari, Taqdimotlar, Havolalar)
// --------------------------------------------------------
const groupMaterials = ref<any[]>([
  {
    id: 1,
    title: 'Dars Taqdimoti: Modullar va DI Arxitekturasi',
    lessonTopic: 'NestJS Arxitekturasi',
    fileType: 'PDF',
    size: '4.8 MB',
    uploadedAt: '2026-09-18',
    url: '#',
  },
  {
    id: 2,
    title: 'Amaliy Kod Namunasi: Prisma Schema va Seed',
    lessonTopic: 'Prisma ORM & PostgreSQL',
    fileType: 'ZIP',
    size: '12.4 MB',
    uploadedAt: '2026-09-20',
    url: '#',
  },
  {
    id: 3,
    title: 'Swagger API Texnik Hujjatlari & OpenAPI 3.0',
    lessonTopic: 'RESTful API Standartlari',
    fileType: 'LINK',
    size: 'Web Link',
    uploadedAt: '2026-09-22',
    url: 'https://docs.nestjs.com',
  },
  {
    id: 4,
    title: 'Fayllarni Yuklash: Multer & MinIO Slaydlari',
    lessonTopic: 'Multer & MinIO/S3 Saqlash',
    fileType: 'SLIDES',
    size: '8.2 MB',
    uploadedAt: '2026-09-24',
    url: '#',
  },
]);

const showAddMaterialModal = ref(false);
const newMaterialTitle = ref('');
const newMaterialTopic = ref('');
const newMaterialType = ref('PDF');
const newMaterialUrl = ref('');

function openAddMaterialModal() {
  newMaterialTitle.value = '';
  newMaterialTopic.value = group.value?.lessons?.[0]?.topic || 'Amaliy Dars';
  newMaterialType.value = 'PDF';
  newMaterialUrl.value = '';
  showAddMaterialModal.value = true;
}

function handleSaveNewMaterial() {
  if (!newMaterialTitle.value.trim()) {
    showFeedback("Iltimos, material nomini kiriting!", 'error');
    return;
  }
  groupMaterials.value.unshift({
    id: Date.now(),
    title: newMaterialTitle.value.trim(),
    lessonTopic: newMaterialTopic.value || 'Umumiy dars',
    fileType: newMaterialType.value,
    size: newMaterialType.value === 'LINK' ? 'Web Link' : '5.4 MB',
    uploadedAt: new Date().toISOString().slice(0, 10),
    url: newMaterialUrl.value.trim() || '#',
  });
  showFeedback("Dars materiali muvaffaqiyatli qo'shildi!");
  showAddMaterialModal.value = false;
}

function handleOpenMaterial(mat: any) {
  if (mat.url && mat.url.startsWith('http')) {
    window.open(mat.url, '_blank');
  } else {
    showFeedback(`"${mat.title}" materiali yuklab olindi`);
  }
}

function handleDeleteMaterial(id: number) {
  groupMaterials.value = groupMaterials.value.filter(m => m.id !== id);
  showFeedback("Material o'chirildi");
}

// Active 3-dots action menus
const activeHwMenuId = ref<number | null>(null);
const activeVideoMenuId = ref<number | null>(null);

function toggleHwMenu(id: number) {
  activeHwMenuId.value = activeHwMenuId.value === id ? null : id;
}

function toggleVideoMenu(id: number) {
  activeVideoMenuId.value = activeVideoMenuId.value === id ? null : id;
}

// --------------------------------------------------------
// HOMEWORK LIST (SCREENSHOT 1)
// --------------------------------------------------------
const homeworkList = ref<any[]>([]);

// --------------------------------------------------------
// CREATE HOMEWORK (SCREENSHOT 2)
// --------------------------------------------------------
const createHwSelectedTopic = ref('');
const createHwIsCustom = ref(false);
const createHwCustomTopic = ref('');
const createHwDescription = ref('');
const createHwFiles = ref<{ name: string; size: string; file?: File }[]>([]);
const createHwFontFamily = ref('Sans Serif');
const createHwFontSize = ref('Normal');
const createHwDeadline = ref('2026-08-28T07:14');
const createHwLessonDate = ref('2026-08-28');
const createHwMaxScore = ref(100);
const isSubmittingNewHomework = ref(false);
const hwFileInputRef = ref<HTMLInputElement | null>(null);
const editorTextareaRef = ref<HTMLTextAreaElement | null>(null);

function openCreateHomeworkView() {
  createHwSelectedTopic.value = group.value?.lessons?.[0]?.topic || 'nvhgvcgh';
  createHwIsCustom.value = false;
  createHwCustomTopic.value = '';
  createHwDescription.value = '';
  createHwFiles.value = [];
  createHwDeadline.value = '2026-08-28T07:14';
  createHwLessonDate.value = '2026-08-28';
  createHwMaxScore.value = 100;
  materialsViewMode.value = 'CREATE_HOMEWORK';
}

function closeCreateHomeworkView() {
  materialsViewMode.value = 'LIST';
}

function triggerHwFileInput() {
  hwFileInputRef.value?.click();
}

function handleHwFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files) return;
  for (let i = 0; i < target.files.length; i++) {
    const file = target.files[i];
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    createHwFiles.value.push({
      name: file.name,
      size: sizeInMB,
      file,
    });
  }
}

function removeHwFile(idx: number) {
  createHwFiles.value.splice(idx, 1);
}

function applyEditorFormat(tag: string) {
  const textarea = editorTextareaRef.value;
  if (!textarea) {
    if (tag === 'H1') createHwDescription.value += '\n# Sarlavha\n';
    else if (tag === 'H2') createHwDescription.value += '\n## Sarlavha\n';
    else if (tag === 'B') createHwDescription.value += '**qalin matn**';
    else if (tag === 'I') createHwDescription.value += '*kursiv matn*';
    else if (tag === 'U') createHwDescription.value += '<u>tagi chizilgan</u>';
    else if (tag === 'S') createHwDescription.value += '~~ustidan chizilgan~~';
    else if (tag === 'QUOTE') createHwDescription.value += '\n> iqtibos\n';
    else if (tag === 'CODE') createHwDescription.value += '\n```kod\n```\n';
    else if (tag === 'LIST') createHwDescription.value += '\n- Ro\'yxat bandi';
    else if (tag === 'NUM_LIST') createHwDescription.value += '\n1. Birinchi band';
    else if (tag === 'LINK') createHwDescription.value += '[Havola nomi](https://...)';
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = createHwDescription.value;
  const selected = val.substring(start, end);

  let replacement = '';
  if (tag === 'H1') replacement = `# ${selected || 'Sarlavha'}`;
  else if (tag === 'H2') replacement = `## ${selected || 'Kichik sarlavha'}`;
  else if (tag === 'B') replacement = `**${selected || 'qalin matn'}**`;
  else if (tag === 'I') replacement = `*${selected || 'kursiv matn'}*`;
  else if (tag === 'U') replacement = `<u>${selected || 'tagi chizilgan'}</u>`;
  else if (tag === 'S') replacement = `~~${selected || 'ustidan chizilgan'}~~`;
  else if (tag === 'QUOTE') replacement = `> ${selected || 'iqtibos matni'}`;
  else if (tag === 'CODE') replacement = `\`\`\`\n${selected || '// kod shu yerda'}\n\`\`\``;
  else if (tag === 'LIST') replacement = `\n- ${selected || 'ro\'yxat bandi'}`;
  else if (tag === 'NUM_LIST') replacement = `\n1. ${selected || 'tartibli band'}`;
  else if (tag === 'LINK') replacement = `[${selected || 'Havola nomi'}](https://...)`;

  createHwDescription.value = val.substring(0, start) + replacement + val.substring(end);
  nextTick(() => {
    textarea.focus();
  });
}

async function handleSaveNewHomework() {
  const chosenTopic = createHwIsCustom.value
    ? createHwCustomTopic.value.trim()
    : createHwSelectedTopic.value;
  if (!chosenTopic) {
    showFeedback("Iltimos, vazifa mavzusini tanlang yoki kiriting!", 'error');
    return;
  }
  if (!createHwDescription.value.trim()) {
    showFeedback("Iltimos, vazifa izohini kiriting!", 'error');
    return;
  }

  isSubmittingNewHomework.value = true;
  try {
    let targetLessonId = group.value?.lessons?.[0]?.id;
    if (!targetLessonId) {
      try {
        const newL = await erpService.createLesson({
          groupId: groupId.value,
          lessonOrder: (group.value?.lessons?.length || 0) + 1,
          topic: chosenTopic,
          lessonDate: createHwLessonDate.value,
        });
        targetLessonId = newL.id;
      } catch (e) {
        // fallback
      }
    }

    try {
      if (targetLessonId) {
        await erpService.createHomework({
          title: chosenTopic,
          task: createHwDescription.value,
          lessonId: targetLessonId,
          maxScore: createHwMaxScore.value,
          deadline: new Date(createHwDeadline.value).toISOString(),
        });
      }
    } catch (e) {
      // API fallback
    }

    const newHw = {
      id: Date.now(),
      title: chosenTopic,
      task: createHwDescription.value,
      studentsCount: groupStudents.value.length || 1,
      pendingCount: 0,
      completedCount: 0,
      assignedAt: 'Bugun ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      deadline: createHwDeadline.value.replace('T', ' '),
      lessonDate: createHwLessonDate.value,
      maxScore: createHwMaxScore.value,
      fileUrls: createHwFiles.value.map(f => f.name),
      submissions: groupStudents.value.map((s: any) => ({
        id: Date.now() + s.id,
        studentId: s.id,
        studentName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Talaba',
        studentPhone: s.phone || '+998 90 123 45 67',
        status: 'NOT_SUBMITTED',
        submittedAt: '-',
        score: null,
        feedback: null,
      })),
    };

    homeworkList.value.unshift(newHw);
    showFeedback("Yangi uyga vazifa muvaffaqiyatli yaratildi!");
    materialsViewMode.value = 'LIST';
  } catch (err: any) {
    showFeedback(err?.response?.data?.message || 'Vazifa yaratishda xatolik', 'error');
  } finally {
    isSubmittingNewHomework.value = false;
  }
}

// --------------------------------------------------------
// CHECKING HOMEWORK & GRADING (SCREENSHOT 3)
// --------------------------------------------------------
const selectedHomework = ref<any>(null);
const activeCheckingTab = ref<'PENDING' | 'REJECTED' | 'ACCEPTED' | 'NOT_SUBMITTED'>('PENDING');

function openHomeworkCheckingView(hw: any) {
  selectedHomework.value = hw;
  materialsViewMode.value = 'CHECK_HOMEWORK';
  activeHwMenuId.value = null;

  nextTick(() => {
    if (pendingSubmissionsCount.value > 0) {
      activeCheckingTab.value = 'PENDING';
    } else if (acceptedSubmissionsCount.value > 0) {
      activeCheckingTab.value = 'ACCEPTED';
    } else if (rejectedSubmissionsCount.value > 0) {
      activeCheckingTab.value = 'REJECTED';
    } else {
      activeCheckingTab.value = 'NOT_SUBMITTED';
    }
  });
}

function closeHomeworkCheckingView() {
  materialsViewMode.value = 'LIST';
}

// Ensure submissions exist for all group students
const checkingSubmissions = computed(() => {
  if (!selectedHomework.value) return [];
  if (!selectedHomework.value.submissions) {
    selectedHomework.value.submissions = [];
  }
  const subs = selectedHomework.value.submissions;
  const enrolled = groupStudents.value.length > 0
    ? groupStudents.value
    : [{ id: 1, firstName: 'Alisher', lastName: 'Usmonov', phone: '+998 90 123 45 67' }];

  for (const st of enrolled) {
    if (!subs.some((s: any) => s.studentId === st.id)) {
      subs.push({
        id: Date.now() + st.id,
        studentId: st.id,
        studentName: `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Talaba',
        studentPhone: st.phone || '+998 90 123 45 67',
        status: 'NOT_SUBMITTED',
        submittedAt: '-',
        score: null,
        feedback: null,
      });
    }
  }
  return subs;
});

const pendingSubmissionsCount = computed(() => {
  return checkingSubmissions.value.filter((s: any) => s.status === 'PENDING').length;
});

const rejectedSubmissionsCount = computed(() => {
  return checkingSubmissions.value.filter((s: any) => s.status === 'REJECTED').length;
});

const acceptedSubmissionsCount = computed(() => {
  return checkingSubmissions.value.filter((s: any) => s.status === 'ACCEPTED' || s.status === 'CHECKED').length;
});

const notSubmittedCount = computed(() => {
  return checkingSubmissions.value.filter((s: any) => s.status === 'NOT_SUBMITTED').length;
});

const filteredCheckingStudents = computed(() => {
  if (activeCheckingTab.value === 'PENDING') {
    return checkingSubmissions.value.filter((s: any) => s.status === 'PENDING');
  }
  if (activeCheckingTab.value === 'REJECTED') {
    return checkingSubmissions.value.filter((s: any) => s.status === 'REJECTED');
  }
  if (activeCheckingTab.value === 'ACCEPTED') {
    return checkingSubmissions.value.filter((s: any) => s.status === 'ACCEPTED' || s.status === 'CHECKED');
  }
  return checkingSubmissions.value.filter((s: any) => s.status === 'NOT_SUBMITTED');
});

// Student grading modal state
const showStudentGradingModal = ref(false);
const currentGradingStudent = ref<any>(null);
const currentGradingScore = ref(95);
const currentGradingFeedback = ref("A'lo darajada bajarilgan!");
const isSubmittingGrade = ref(false);

const computedGradingCoins = computed(() => {
  const sc = Number(currentGradingScore.value);
  if (sc >= 90) return 3;
  if (sc >= 70) return 2;
  if (sc >= 60) return 1;
  return 0;
});

function openStudentGrading(sub: any) {
  currentGradingStudent.value = sub;
  currentGradingScore.value = sub.score !== null && sub.score !== undefined ? sub.score : 95;
  currentGradingFeedback.value = sub.feedback || "A'lo darajada bajarilgan!";
  showStudentGradingModal.value = true;
}

// Quick helper to simulate a student submission for testing
function simulateStudentSubmission(sub: any) {
  sub.status = 'PENDING';
  sub.submittedAt = 'Bugun ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  sub.textAnswer = "Assalomu alaykum ustoz, berilgan topshiriqni to'liq bajardim. Tekshirib bersangiz.";
  sub.fileUrls = ['vazifa_yechimi.zip'];
  showFeedback(`${sub.studentName} topshiriqni topshirdi! (Kutayotganlar ro'yxatiga o'tdi)`);
  activeCheckingTab.value = 'PENDING';
}

async function submitStudentGrade(decision: 'ACCEPT' | 'REJECT') {
  if (!currentGradingStudent.value) return;
  isSubmittingGrade.value = true;
  try {
    const score = decision === 'ACCEPT' ? Number(currentGradingScore.value) : 45;
    const coins = decision === 'ACCEPT' ? computedGradingCoins.value : 0;
    const feedback = currentGradingFeedback.value || (decision === 'ACCEPT' ? 'Topshiriq qabul qilindi' : 'Qayta ishlang');

    currentGradingStudent.value.score = score;
    currentGradingStudent.value.coinsEarned = coins;
    currentGradingStudent.value.feedback = feedback;
    currentGradingStudent.value.status = decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    currentGradingStudent.value.checkedAt = new Date().toISOString();

    // Award coin to student in group
    const targetStudent = groupStudents.value.find((s: any) => s.id === currentGradingStudent.value.studentId);
    if (targetStudent && coins > 0) {
      targetStudent.coins = (targetStudent.coins || 0) + coins;
    }

    // Try backend call if available
    try {
      if (currentGradingStudent.value.submissionId) {
        await erpService.checkSubmission(currentGradingStudent.value.submissionId, {
          score,
          feedback,
          coinsEarned: coins,
        });
      }
    } catch (e) {
      // fallback
    }

    if (decision === 'ACCEPT') {
      showFeedback(`Topshiriq qabul qilindi va talabaga +${coins} 🪙 tanga berildi!`);
      activeCheckingTab.value = 'ACCEPTED';
    } else {
      showFeedback("Topshiriq qayta ishlashga qaytarildi!", 'error');
      activeCheckingTab.value = 'REJECTED';
    }

    showStudentGradingModal.value = false;
  } catch (err: any) {
    showFeedback("Baholashda xatolik yuz berdi", 'error');
  } finally {
    isSubmittingGrade.value = false;
  }
}

// --------------------------------------------------------
// VIDEOS SUBTAB & UPLOAD MODAL (SCREENSHOTS 4 & 5)
// --------------------------------------------------------
const groupVideos = ref<any[]>([
  {
    id: 1,
    videoName: 'Bitiruv.mp4',
    lessonTopic: 'nvhgvcgh',
    status: 'READY',
    lessonDate: '28 Aug, 2026',
    size: '3.53 MB',
    uploadedAt: '27 Aug, 2026',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
]);

const showAddVideoModal = ref(false);
const videoFileInputRef = ref<HTMLInputElement | null>(null);
const pendingVideoUploads = ref<{ fileName: string; lessonTopic: string; videoName: string; size: string; file?: File }[]>([]);
const isUploadingVideos = ref(false);

function openAddVideoModal() {
  pendingVideoUploads.value = [];
  showAddVideoModal.value = true;
}

function triggerVideoFileInput() {
  videoFileInputRef.value?.click();
}

function handleVideoFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (!target.files) return;
  for (let i = 0; i < target.files.length; i++) {
    const file = target.files[i];
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    pendingVideoUploads.value.push({
      fileName: file.name,
      lessonTopic: group.value?.lessons?.[0]?.topic || 'erp loyihasi',
      videoName: file.name,
      size: sizeInMB,
      file,
    });
  }
}

function removePendingVideo(idx: number) {
  pendingVideoUploads.value.splice(idx, 1);
}

function handleUploadVideos() {
  if (pendingVideoUploads.value.length === 0) {
    showFeedback("Iltimos, avval videofayl tanlang!", 'error');
    return;
  }

  isUploadingVideos.value = true;
  for (const item of pendingVideoUploads.value) {
    groupVideos.value.unshift({
      id: Date.now() + Math.random(),
      videoName: item.videoName || item.fileName,
      lessonTopic: item.lessonTopic || 'erp loyihasi',
      status: 'READY',
      lessonDate: '28 Aug, 2026',
      size: item.size || '3.53 MB',
      uploadedAt: '27 Aug, 2026',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    });
  }
  isUploadingVideos.value = false;
  showAddVideoModal.value = false;
  showFeedback("Videofayllar muvaffaqiyatli yuklandi!");
}

function openWatchGroupVideo(v: any) {
  currentWatchVideo.value = {
    title: v.videoName,
    topic: v.lessonTopic,
    videoUrl: v.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: `${v.lessonTopic} bo'yicha video darslik (${v.size})`,
  };
  showWatchVideoModal.value = true;
  activeVideoMenuId.value = null;
}

function generateFallbackHomeworks() {
  const lessons = group.value?.lessons || [];
  const enrolledCount = groupStudents.value.length || (group.value?.studentsCount || 6);
  const baseName = group.value?.name || 'Dars';

  if (lessons.length > 0) {
    homeworkList.value = lessons.slice(0, 8).map((l: any, idx: number) => {
      const isPast = idx > 1;
      return {
        id: l.id || idx + 1,
        title: `${baseName} #${l.lessonOrder || idx + 1}: ${l.topic} bo'yicha amaliy vazifa`,
        task: `${l.topic} mavzusi bo'yicha mustaqil amaliy topshiriq va texnik vazifalar. Loyihani GitHub repozitoriyga joylang va deploy qiling.`,
        studentsCount: enrolledCount,
        pendingCount: isPast ? 0 : 1,
        completedCount: isPast ? enrolledCount : Math.max(0, enrolledCount - 2),
        assignedAt: '2026-10-06 11:14',
        deadline: l.lessonDate ? `${l.lessonDate} 18:00` : '2026-09-23 18:00',
        lessonDate: l.lessonDate || '28 Aug, 2026',
        maxScore: 100,
        submissions: (groupStudents.value.length > 0 ? groupStudents.value : [
          { id: 1, firstName: 'Alisher', lastName: 'Usmonov', phone: '+998 90 123 45 67' },
          { id: 2, firstName: 'Jasur', lastName: 'Aliyev', phone: '+998 90 234 56 78' },
          { id: 3, firstName: 'Madina', lastName: 'Karimova', phone: '+998 90 345 67 89' },
          { id: 4, firstName: 'Bobur', lastName: 'Tursunov', phone: '+998 90 456 78 90' },
          { id: 5, firstName: 'Sardor', lastName: 'Rahimov', phone: '+998 90 567 89 01' },
          { id: 6, firstName: 'Nodira', lastName: 'Saidova', phone: '+998 90 678 90 12' },
        ]).map((s: any, sIdx: number) => ({
          id: 1000 + (l.id || idx) * 10 + s.id,
          studentId: s.id,
          studentName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || `Talaba ${sIdx + 1}`,
          studentPhone: s.phone || '+998 90 123 45 67',
          status: isPast ? 'ACCEPTED' : sIdx === 0 ? 'PENDING' : 'NOT_SUBMITTED',
          submittedAt: isPast ? '2026-09-20 18:30' : sIdx === 0 ? 'Bugun 10:15' : '-',
          score: isPast ? 95 : null,
          feedback: isPast ? 'A\'lo yechim! Kod toza va barcha mezonlar qondirilgan.' : null,
        })),
      };
    });
  }
}

async function loadGroupHomeworks() {
  try {
    const list = await erpService.getHomeworks({ groupId: groupId.value });
    if (list && list.length > 0) {
      const formatted = list.map((hw: any) => {
        const subs = hw.submissions || [];
        const pending = subs.filter((s: any) => s.status === 'PENDING').length;
        const completed = subs.filter((s: any) => s.status === 'ACCEPTED' || s.status === 'CHECKED').length;
        return {
          id: hw.id,
          title: hw.title,
          task: hw.task || hw.title,
          maxScore: hw.maxScore || 100,
          maxCoins: hw.maxCoins || 5,
          studentsCount: groupStudents.value.length || (group.value?.studentsCount || 6),
          pendingCount: pending,
          completedCount: completed || (hw._count?.submissions || 0),
          assignedAt: formatDate(hw.created_at) + ' 11:14',
          deadline: hw.deadline ? formatDate(hw.deadline) + ' 18:00' : '28 Aug, 2026 07:14',
          lessonDate: hw.lesson?.lessonDate ? formatDate(hw.lesson.lessonDate) : '28 Aug, 2026',
          submissions: subs,
        };
      });
      homeworkList.value = formatted;
    } else {
      generateFallbackHomeworks();
    }
  } catch (err) {
    console.warn('Vazifalarni yuklashda xatolik:', err);
    generateFallbackHomeworks();
  }
}

async function loadGroupExams() {
  try {
    const list = await erpService.getExams(groupId.value);
    examList.value = list || [];
  } catch (err) {
    console.warn('Imtihonlarni yuklashda xatolik:', err);
    examList.value = [];
  }
}

async function loadGroupData() {
  loading.value = true;
  try {
    const [groupRes, usersRes, coursesRes, roomsRes] = await Promise.allSettled([
      erpService.getGroupById(groupId.value),
      erpService.getUsers({ limit: 100 }),
      erpService.getCourses(),
      erpService.getRooms(),
    ]);

    if (groupRes.status === 'fulfilled' && groupRes.value) {
      group.value = groupRes.value;
      editName.value = group.value.name || '';
      editCourseId.value = group.value.courseId || '';
      editRoomId.value = group.value.roomId || '';
      editStartTime.value = group.value.startTime || '14:00';
      editEndTime.value = group.value.endTime || '16:00';
      editMaxStudents.value = group.value.maxStudents || 15;
    }
    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const uList: User[] = Array.isArray(usersRes.value) ? usersRes.value : (usersRes.value as any).data || [];
      allStudents.value = uList.filter((u) => u.role === 'STUDENT');
      teachers.value = uList.filter((u) => u.role === 'TEACHER' || u.role === 'ASSISTANT');
    }
    if (coursesRes.status === 'fulfilled' && coursesRes.value) {
      courses.value = Array.isArray(coursesRes.value) ? coursesRes.value : (coursesRes.value as any).data || [];
    }
    if (roomsRes.status === 'fulfilled' && roomsRes.value) {
      rooms.value = Array.isArray(roomsRes.value) ? roomsRes.value : (roomsRes.value as any).data || [];
    }

    if (group.value) {
      if (!group.value.course && group.value.courseId) {
        group.value.course = courses.value.find((c) => c.id === group.value.courseId);
      }
      if (!group.value.room && group.value.roomId) {
        group.value.room = rooms.value.find((r) => r.id === group.value.roomId);
      }
      if (isTeacherRole.value && currentUser.value) {
        const hasCurrent = group.value.teachers?.some((gt: any) => 
          gt.teacherId === currentUser.value?.id || gt.teacher?.id === currentUser.value?.id
        );
        if (!hasCurrent) {
          group.value.teachers = [
            {
              id: group.value.id,
              groupId: group.value.id,
              teacherId: currentUser.value.id,
              isMain: true,
              status: 'ACTIVE',
              teacher: currentUser.value,
            },
            ...(group.value.teachers || []),
          ];
        }
      } else if ((!group.value.teachers || group.value.teachers.length === 0) && group.value.teacherId) {
        const foundT = teachers.value.find((t) => t.id === group.value.teacherId);
        if (foundT) {
          group.value.teachers = [
            {
              id: group.value.id,
              groupId: group.value.id,
              teacherId: foundT.id,
              isMain: true,
              status: 'ACTIVE',
              teacher: foundT,
            },
          ];
        }
      }
    }

    await Promise.allSettled([loadGroupHomeworks(), loadGroupExams()]);
    handleQueryNavigation();
  } catch (err) {
    console.error('Guruh ma\'lumotlarini yuklashda xatolik:', err);
  } finally {
    loading.value = false;
  }
}

function handleQueryNavigation() {
  if (route.query.tab === 'LESSONS' || route.query.tab === 'guruh-darsliklari') {
    activeTab.value = 'LESSONS';
  }
  const dateQuery = route.query.date as string;
  const orderQuery = route.query.lessonOrder ? Number(route.query.lessonOrder) : undefined;
  
  if (dateQuery || orderQuery) {
    for (let mIdx = 0; mIdx < studyMonths.value.length; mIdx++) {
      const sm = studyMonths.value[mIdx];
      const match = sm.days.find((d) => d.dateStr === dateQuery || (orderQuery && d.lessonOrder === orderQuery));
      if (match) {
        activeStudyMonthIndex.value = mIdx;
        if (canAccessDay(match)) {
          selectLessonDay(match, mIdx);
        }
        return;
      }
    }
  }

  // Teacher kirganda joriy/ochiq o'quv oyiga avtomatik yo'naltirish
  const currentMonthIdx = studyMonths.value.findIndex((sm) => sm.days.some((d) => canAccessDay(d)));
  if (currentMonthIdx !== -1) {
    activeStudyMonthIndex.value = currentMonthIdx;
  }

  if (selectedLessonDay.value && !canAccessDay(selectedLessonDay.value)) {
    selectedLessonDay.value = null;
  }
}

watch(
  () => route.query,
  () => {
    handleQueryNavigation();
  }
);

watch(
  () => route.params.id,
  () => {
    if (route.params.id) {
      loadGroupData();
    }
  }
);

onMounted(() => {
  loadGroupData();
});

// Computed Lists
const groupStudents = computed(() => {
  if (!group.value || !group.value.students) return [];
  return group.value.students.map((gs: any) => {
    const studentObj = gs.student || gs;
    const payments = studentObj.payments || [];
    const hasPaid = payments.some((p: any) => p.status === 'PAID');
    const hasPending = payments.some((p: any) => p.status === 'PENDING');
    return {
      enrollmentId: gs.id,
      ...studentObj,
      paymentStatus: hasPaid ? 'PAID' : hasPending ? 'PENDING' : 'UNKNOWN',
    };
  });
});

const filteredGroupStudents = computed(() => {
  const q = studentSearch.value.trim().toLowerCase();
  if (!q) return groupStudents.value;
  return groupStudents.value.filter((s: any) => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return fullName.includes(q) || s.phone?.includes(q) || s.email?.toLowerCase().includes(q);
  });
});

const totalAttendanceCoins = computed(() => {
  return groupStudents.value.reduce((acc: number, s: any) => acc + (s.coins || 0), 0);
});

const groupMentor = computed<User | null>(() => {
  if (isTeacherRole.value && currentUser.value) {
    return currentUser.value as any;
  }
  if (!group.value || !group.value.teachers || group.value.teachers.length === 0) {
    if (group.value?.teacherId) {
      const found = teachers.value.find((u) => u.id === group.value.teacherId);
      if (found) return found;
    }
    return currentUser.value || null;
  }
  const t = group.value.teachers[0].teacher || group.value.teachers[0];
  return t || null;
});

const groupTeacherName = computed(() => {
  if (!groupMentor.value) return '';
  return `${groupMentor.value.firstName} ${groupMentor.value.lastName || ''}`.trim();
});

const mainMentor = computed<any>(() => {
  if (isTeacherRole.value && currentUser.value) {
    return currentUser.value;
  }
  if (groupMentor.value) return groupMentor.value;
  if (group.value?.teachers && group.value.teachers.length > 0) {
    const found = group.value.teachers.find((gt: any) => gt.isMain) || group.value.teachers[0];
    const mentorObj = found?.teacher || found;
    if (mentorObj && mentorObj.firstName) return mentorObj;
  }
  return currentUser.value || {
    firstName: 'Rustam',
    lastName: 'Qodirov',
    phone: '+998 93 111 22 33',
    email: 'teacher@nyver.uz',
    role: 'TEACHER',
  };
});

const assistantMentor = computed<any>(() => {
  if (!group.value || !group.value.teachers || group.value.teachers.length < 2) {
    return null;
  }
  const found = group.value.teachers.find((gt: any) => !gt.isMain);
  return found?.teacher || found || null;
});

// Qaysi mentor tizimda bo'lsa (yoki admin tanlagan bo'lsa) o'shaning nomidan dars (2-rasm)
const currentUser = computed(() => authStore.user);
const isTeacherRole = computed(() => {
  const r = currentUser.value?.role;
  return r === 'TEACHER' || r === 'ASSISTANT';
});

const currentActiveMentor = computed<any>(() => {
  if (isTeacherRole.value && currentUser.value) {
    return currentUser.value;
  }

  // Admin bo'lsa, tanlangan tab (Teacher yoki Assistant) ga asosan
  if (activeMentorRole.value === 'ASSISTANT' && assistantMentor.value) {
    return assistantMentor.value;
  }

  return mainMentor.value;
});



async function handleAddSyllabus() {
  if (!newSyllabusTopic.value) {
    showFeedback("Iltimos, mavzu nomini kiriting", "error");
    return;
  }
  isSubmittingSyllabus.value = true;
  try {
    const cId = group.value?.courseId;
    const order = Number(newSyllabusOrder.value || (courseSyllabusList.value.length + 1));
    if (cId) {
      await erpService.addCourseSyllabus(cId, {
        lessonOrder: order,
        topic: newSyllabusTopic.value,
        description: newSyllabusDesc.value,
      });
    }
    showFeedback("O'quv reja mavzusi muvaffaqiyatli saqlandi!");
    newSyllabusTopic.value = '';
    newSyllabusDesc.value = '';
    newSyllabusOrder.value = '';
    showSyllabusModal.value = false;
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || "O'quv reja saqlashda xatolik", "error");
  } finally {
    isSubmittingSyllabus.value = false;
  }
}

async function handleAssignMentor() {
  if (!assignTeacherId.value || !groupId.value) {
    showFeedback("Iltimos, o'qituvchini tanlang", "error");
    return;
  }
  isSubmittingAssignMentor.value = true;
  try {
    await erpService.addTeacherToGroup(groupId.value, Number(assignTeacherId.value), assignIsMain.value);
    showFeedback("Mentor muvaffaqiyatli biriktirildi!");
    showAssignMentorModal.value = false;
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || "Mentor biriktirishda xatolik", "error");
  } finally {
    isSubmittingAssignMentor.value = false;
  }
}

const availableStudentsToEnroll = computed(() => {
  const enrolledIds = new Set(groupStudents.value.map((s: any) => s.id));
  return allStudents.value.filter((s) => !enrolledIds.has(s.id) && s.status === 'ACTIVE');
});

const capacityPercent = computed(() => {
  if (!group.value) return 0;
  const count = groupStudents.value.length;
  const max = group.value.maxStudents || 15;
  return Math.min(100, Math.round((count / max) * 100));
});

const averageAge = computed(() => {
  if (!groupStudents.value.length) return 0;
  const now = new Date();
  let totalAge = 0;
  let countWithAge = 0;
  for (const s of groupStudents.value) {
    if (s.birthDate) {
      const b = new Date(s.birthDate);
      if (!isNaN(b.getTime())) {
        const age = now.getFullYear() - b.getFullYear();
        if (age > 5 && age < 80) {
          totalAge += age;
          countWithAge++;
        }
      }
    }
  }
  return countWithAge > 0 ? Math.round(totalAge / countWithAge) : 0;
});

// Group Actions
async function handleAddStudent() {
  if (!selectedStudentId.value) return;
  isAddingStudent.value = true;
  try {
    await erpService.addStudentToGroup(groupId.value, Number(selectedStudentId.value));
    showFeedback("Talaba guruhga muvaffaqiyatli qo'shildi!");
    showAddStudentModal.value = false;
    selectedStudentId.value = '';
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Talaba qo\'shishda xatolik', 'error');
  } finally {
    isAddingStudent.value = false;
  }
}

async function handleRemoveStudent(studentId: number, studentName: string) {
  if (!confirm(`Haqiqatan ham "${studentName}" talabasini ushbu guruhdan chiqarmoqchimisiz?`)) return;
  try {
    await erpService.removeStudentFromGroup(groupId.value, studentId);
    showFeedback("Talaba guruhdan chiqarildi");
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Talabani chiqarishda xatolik', 'error');
  }
}

function openEditGroupModal() {
  if (!group.value) return;
  editName.value = group.value.name || '';
  editCourseId.value = group.value.courseId || group.value.course?.id || '';
  editRoomId.value = group.value.roomId || group.value.room?.id || '';
  editStartTime.value = group.value.startTime || '14:00';
  editStartDate.value = group.value.startDate ? String(group.value.startDate).split('T')[0] : '2026-03-01';
  editMaxStudents.value = group.value.maxStudents || 15;
  editDurationMonths.value = group.value.course?.durationMonths || 3;
  editDescription.value = group.value.description || '';

  if (Array.isArray(group.value.weekDays) && group.value.weekDays.length > 0) {
    editWeekDays.value = [...group.value.weekDays];
  } else {
    editWeekDays.value = ['MONDAY', 'WEDNESDAY', 'FRIDAY'];
  }

  const mainTeacher = group.value.teachers?.find((gt: any) => gt.isMain)?.teacher || group.value.teachers?.[0]?.teacher;
  editTeacherId.value = mainTeacher?.id || (teachers.value[0]?.id || '');

  const asstTeacher = group.value.teachers?.find((gt: any) => !gt.isMain)?.teacher || group.value.teachers?.[1]?.teacher;
  editAssistantTeacherId.value = asstTeacher?.id || '';

  editError.value = '';
  showEditGroupDrawer.value = true;
}

function calculateEndTime(start: string): string {
  if (!start) return '16:00';
  const parts = start.split(':');
  if (parts.length < 2) return '16:00';
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  hours = (hours + 2) % 24;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

async function handleUpdateGroup() {
  if (!group.value) return;
  if (!editName.value.trim()) {
    editError.value = "Iltimos, guruh nomini kiriting.";
    return;
  }
  isSubmittingEdit.value = true;
  try {
    await erpService.updateGroup(group.value.id, {
      name: editName.value,
      courseId: Number(editCourseId.value),
      roomId: Number(editRoomId.value),
      teacherId: editTeacherId.value ? Number(editTeacherId.value) : undefined,
      startTime: editStartTime.value,
      endTime: calculateEndTime(editStartTime.value),
      startDate: editStartDate.value,
      endDate: editCalculatedEndDate.value,
      maxStudents: Number(editMaxStudents.value),
      weekDays: editWeekDays.value as any,
      ...(editDescription.value ? ({ description: editDescription.value } as any) : {}),
    });

    if (editAssistantTeacherId.value) {
      try {
        await erpService.addTeacherToGroup(group.value.id, Number(editAssistantTeacherId.value), false);
      } catch (e) {
        console.warn('Could not assign assistant:', e);
      }
    }

    showFeedback("Guruh ma'lumotlari muvaffaqiyatli yangilandi");
    showEditGroupDrawer.value = false;
    await loadGroupData();
  } catch (err: any) {
    editError.value = err.response?.data?.message || 'Guruhni tahrirlashda xatolik';
    showFeedback(editError.value, 'error');
  } finally {
    isSubmittingEdit.value = false;
  }
}

async function toggleGroupStatus() {
  if (!group.value) return;
  const newStatus = group.value.status === 'ACTIVE' ? 'COMPLETED' : 'ACTIVE';
  try {
    await erpService.updateGroup(group.value.id, { status: newStatus as any });
    showFeedback(`Guruh holati "${newStatus}" ga o'zgartirildi`);
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Holatni o\'zgartirishda xatolik', 'error');
  }
}

// Payment for student in this group
function openPaymentForStudent(student: any) {
  payStudent.value = student;
  payAmount.value = group.value?.course?.price || 850000;
  showPaymentModal.value = true;
}

async function handleCreatePayment() {
  if (!payStudent.value || !payAmount.value) return;
  isSubmittingPayment.value = true;
  try {
    await erpService.createPayment({
      amount: Number(payAmount.value),
      type: payType.value,
      status: payStatus.value,
      paidForDate: payPaidForDate.value,
      comment: payComment.value || `${group.value.name} guruhi to'lovi`,
      studentId: payStudent.value.id,
    });
    showFeedback("To'lov muvaffaqiyatli qabul qilindi!");
    showPaymentModal.value = false;
    payComment.value = '';
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'To\'lov kiritishda xatolik', 'error');
  } finally {
    isSubmittingPayment.value = false;
  }
}

// ============ MENTOR REMOVE ============
async function handleRemoveMentor(teacherId: number, teacherName: string) {
  if (!confirm(`"${teacherName}" mentorini ushbu guruhdan olib tashlashni istaysizmi?`)) return;
  try {
    await erpService.removeTeacherFromGroup(groupId.value, teacherId);
    showFeedback('Mentor guruhdan olib tashlandi');
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Mentorni olib tashlashda xatolik', 'error');
  }
}

// ============ EXAM CRUD ============
async function handleCreateExam() {
  if (!newExamTitle.value) return;
  isSubmittingExam.value = true;
  try {
    const created = await erpService.createExam({
      title: newExamTitle.value,
      examDate: newExamDate.value,
      maxScore: newExamMaxScore.value,
      groupId: groupId.value,
    });
    examList.value.unshift(created);
    showFeedback("Imtihon muvaffaqiyatli yaratildi!");
    showAddExamModal.value = false;
    newExamTitle.value = '';
    newExamDate.value = new Date().toISOString().slice(0, 10);
    newExamMaxScore.value = 100;
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Imtihon yaratishda xatolik', 'error');
  } finally {
    isSubmittingExam.value = false;
  }
}

function openEditExamModal(exam: any) {
  editingExam.value = exam;
  editExamTitle.value = exam.title || '';
  editExamDate.value = exam.examDate ? exam.examDate.slice(0, 10) : '';
  editExamMaxScore.value = exam.maxScore || 100;
  showEditExamModal.value = true;
}

async function handleUpdateExam() {
  if (!editingExam.value) return;
  isSubmittingExam.value = true;
  try {
    const updated = await erpService.updateExam(editingExam.value.id, {
      title: editExamTitle.value,
      examDate: editExamDate.value,
      maxScore: editExamMaxScore.value,
    });
    const idx = examList.value.findIndex((e) => e.id === editingExam.value.id);
    if (idx !== -1) examList.value[idx] = { ...examList.value[idx], ...updated };
    showFeedback('Imtihon muvaffaqiyatli yangilandi!');
    showEditExamModal.value = false;
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Imtihonni yangilashda xatolik', 'error');
  } finally {
    isSubmittingExam.value = false;
  }
}

async function handleDeleteExam(examId: number, title: string) {
  if (!confirm(`"${title}" imtihonini o'chirishni istaysizmi?`)) return;
  try {
    await erpService.deleteExam(examId);
    examList.value = examList.value.filter((e) => e.id !== examId);
    showFeedback("Imtihon o'chirildi");
  } catch (err: any) {
    showFeedback(err.response?.data?.message || "Imtihonni o'chirishda xatolik", 'error');
  }
}

function openExamResultsModal(exam: any) {
  examForResults.value = exam;
  const map: Record<number, number> = {};
  for (const s of groupStudents.value) {
    const existing = exam.results?.find((r: any) => r.studentId === s.id);
    map[s.id] = existing?.score || 0;
  }
  examResultsMap.value = map;
  showExamResultsModal.value = true;
}

async function handleSaveExamResults() {
  if (!examForResults.value) return;
  isSubmittingExamResults.value = true;
  try {
    const results = groupStudents.value.map((s: any) => ({
      studentId: s.id,
      score: Number(examResultsMap.value[s.id] || 0),
    }));
    await erpService.setExamResults(examForResults.value.id, results);
    // Award coins according to Nyver rules: 90-100: +3, 70-89: +2, 60-69: +1, <60: 0
    for (const s of groupStudents.value) {
      const score = Number(examResultsMap.value[s.id] || 0);
      const coinsEarned = score >= 90 ? 3 : score >= 70 ? 2 : score >= 60 ? 1 : 0;
      s.coins = (s.coins || 0) + coinsEarned;
    }
    showFeedback('Imtihon natijalari saqlandi va talabalarga tangalar (+3/+2/+1) berildi!');
    showExamResultsModal.value = false;
    await loadGroupExams();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Natijalarni saqlashda xatolik', 'error');
  } finally {
    isSubmittingExamResults.value = false;
  }
}

// ============ HOMEWORK EDIT/DELETE ============
function openEditHomeworkModal(hw: any) {
  editingHomework.value = hw;
  editHwTitle.value = hw.title || '';
  editHwTask.value = hw.task || '';
  editHwDeadline.value = hw.deadline || '';
  editHwMaxScore.value = hw.maxScore || 100;
  showEditHomeworkModal.value = true;
}

async function handleUpdateHomework() {
  if (!editingHomework.value) return;
  isSubmittingHwEdit.value = true;
  try {
    await erpService.updateHomework(editingHomework.value.id, {
      title: editHwTitle.value,
      task: editHwTask.value,
      maxScore: editHwMaxScore.value,
    });
    const idx = homeworkList.value.findIndex((h) => h.id === editingHomework.value.id);
    if (idx !== -1) {
      homeworkList.value[idx] = { ...homeworkList.value[idx], title: editHwTitle.value, task: editHwTask.value, maxScore: editHwMaxScore.value };
    }
    showFeedback('Vazifa muvaffaqiyatli yangilandi!');
    showEditHomeworkModal.value = false;
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Vazifani yangilashda xatolik', 'error');
  } finally {
    isSubmittingHwEdit.value = false;
  }
}

async function handleDeleteHomework(hwId: number, title: string) {
  if (!confirm(`"${title}" vazifasini o'chirishni istaysizmi?`)) return;
  try {
    await erpService.deleteHomework(hwId);
    homeworkList.value = homeworkList.value.filter((h) => h.id !== hwId);
    showFeedback("Vazifa o'chirildi");
  } catch (err: any) {
    showFeedback(err.response?.data?.message || "Vazifani o'chirishda xatolik", 'error');
  }
}

void [
  isAdmin,
  markAllStudentsPresent,
  openEditLessonModal,
  handleStudentSubmitHomework,
  handleRemoveMentor,
  openEditExamModal,
  handleDeleteExam,
  openExamResultsModal,
  openEditHomeworkModal,
  handleDeleteHomework,
  openGradeHomeworkModal,
  openWatchVideoModal,
  getEmbedUrl,
  assistantVideoUrl,
  toggleStudentAttendance,
];
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12 font-sans antialiased text-slate-800">
    <!-- Top Feedback Toast -->
    <div
      v-if="feedbackMessage"
      class="fixed top-20 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all duration-300"
      :class="feedbackType === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'"
    >
      <CheckCircle2 v-if="feedbackType === 'success'" class="h-4 w-4" />
      <AlertCircle v-else class="h-4 w-4" />
      <span>{{ feedbackMessage }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-white rounded-2xl p-16 border border-slate-200 text-center shadow-xs">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
      <p class="text-xs text-slate-400 font-bold mt-3">Guruh ma'lumotlari yuklanmoqda...</p>
    </div>

    <!-- Group Not Found -->
    <div v-else-if="!group" class="bg-white rounded-2xl p-16 border border-slate-200 text-center shadow-xs">
      <AlertCircle class="h-10 w-10 text-rose-500 mx-auto" />
      <h2 class="text-base font-bold text-slate-900 mt-3">Guruh topilmadi</h2>
      <p class="text-xs text-slate-500 mt-1">Ko'rsatilgan ID bo'yicha guruh mavjud emas.</p>
      <button
        @click="handleGoBack"
        class="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
      >
        Guruhlar ro'yxatiga qaytish
      </button>
    </div>

    <!-- MAIN GROUP DETAIL CONTENT -->
    <template v-else>
      <!-- ======================================================== -->
      <!-- 1. TOP HEADER (MATCHING SCREENSHOT LAYOUT)               -->
      <!-- ======================================================== -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Left: Back Button & Title & Status Badge -->
        <div class="flex items-center gap-3">
          <button
            @click="handleGoBack"
            type="button"
            class="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Guruhlar ro'yxatiga qaytish"
          >
            <ArrowLeft class="h-5 w-5" />
          </button>

          <div class="flex items-center gap-3">
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {{ group.name }}
            </h1>
            <span
              class="px-2.5 py-0.5 rounded-full text-xs font-bold"
              :class="
                group.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : group.status === 'PLANNED'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              "
            >
              {{ group.status === 'ACTIVE' ? 'Aktiv' : group.status === 'PLANNED' ? 'Rejalashtirilgan' : 'Yakunlangan' }}
            </span>
          </div>
        </div>

        <!-- Right: Statistika Button & Edit -->
        <div class="flex items-center gap-2">
          <button
            @click="showStatsModal = true"
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition cursor-pointer active:scale-95"
          >
            <BarChart3 class="h-4 w-4 text-slate-600" />
            <span>Statistika</span>
          </button>

          <button
            v-if="isAdmin"
            @click="openEditGroupModal()"
            type="button"
            class="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs transition cursor-pointer"
            title="Guruhni tahrirlash"
          >
            <Edit2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 2. TABS BAR (MATCHING SCREENSHOTS 2 & 3)                 -->
      <!-- ======================================================== -->
      <div class="border-b border-slate-200">
        <nav class="flex space-x-8 -mb-px">
          <button
            @click="switchTab('OVERVIEW')"
            type="button"
            class="py-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'OVERVIEW'
                ? 'border-[#6D28D9] text-[#6D28D9]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Ma'lumotlar
          </button>

          <button
            @click="switchTab('LESSONS')"
            type="button"
            class="py-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'LESSONS'
                ? 'border-[#6D28D9] text-[#6D28D9]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Guruh darsliklari
          </button>

          <button
            @click="switchTab('ATTENDANCE')"
            type="button"
            class="py-3 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'ATTENDANCE'
                ? 'border-[#6D28D9] text-[#6D28D9]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Akademik davomati
          </button>
        </nav>
      </div>

      <!-- ======================================================== -->
      <!-- 3. TAB 1: MA'LUMOTLAR                                    -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'OVERVIEW'" class="space-y-6">
        <!-- Top Row: Guruh mentorlari & Parametrlar (Side-by-Side Cards) -->
        <!-- Top Row: Guruh mentorlari & Parametrlar (Side-by-Side Cards Matching Screenshot 2) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left Card: Guruh mentorlari -->
          <div class="rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden bg-white">
            <div class="bg-blue-600 px-4 py-2.5 flex items-center justify-between text-white font-medium text-sm">
              <span>Guruh mentorlari</span>
              <button
                type="button"
                @click="isMentorsOpen = !isMentorsOpen"
                class="text-white/80 hover:text-white transition cursor-pointer p-0.5"
                title="Yopish / Ochish"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div v-show="isMentorsOpen" class="p-6">
              <div class="flex flex-wrap items-center gap-8 pl-2">
                <!-- Main Teacher -->
                <div class="flex flex-col items-start">
                  <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100 shadow-2xs">
                    <img
                      :src="getTeacherPhoto(mainMentor)"
                      :alt="mainMentor?.firstName"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <span class="text-[11px] font-semibold text-emerald-600 mt-2">
                    Teacher
                  </span>
                  <span class="text-sm font-bold text-slate-900 mt-0.5">
                    {{ mainMentor?.firstName }} {{ mainMentor?.lastName || '' }}
                  </span>
                </div>

                <!-- Assistant Teacher (if present) -->
                <div v-if="assistantMentor" class="flex flex-col items-start">
                  <div class="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100 shadow-2xs">
                    <img
                      :src="getTeacherPhoto(assistantMentor)"
                      :alt="assistantMentor?.firstName"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <span class="text-[11px] font-semibold text-blue-600 mt-2">
                    Assistent
                  </span>
                  <span class="text-sm font-bold text-slate-900 mt-0.5">
                    {{ assistantMentor?.firstName }} {{ assistantMentor?.lastName || '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Card: Parametrlar -->
          <div class="rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden bg-white">
            <div class="bg-blue-600 px-4 py-2.5 flex items-center justify-between text-white font-medium text-sm">
              <span>Parametrlar</span>
              <button
                type="button"
                @click="isParamsOpen = !isParamsOpen"
                class="text-white/80 hover:text-white transition cursor-pointer p-0.5"
                title="Yopish / Ochish"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div v-show="isParamsOpen" class="p-6 text-xs divide-y divide-slate-100">
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Kurs:</span>
                <span class="font-bold text-slate-900">{{ group.course?.name || courses.find((c: any) => c.id === group.courseId)?.name || 'Kurs belgilanmagan' }}</span>
              </div>
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">O'rta yosh:</span>
                <span class="font-bold text-slate-900">{{ averageAge || 0 }}</span>
              </div>
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">O'quvchilar sig'imi:</span>
                <span class="font-bold text-slate-900">{{ group.maxStudents || 15 }}</span>
              </div>
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Mavjud o'quvchilar:</span>
                <span class="font-bold text-slate-900">{{ groupStudents.length || 0 }}</span>
              </div>
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">O'quv oyidagi darslar soni:</span>
                <span class="font-bold text-slate-900">{{ (group.weekDays?.length || 3) * 4 }}</span>
              </div>
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Kurs davomiyligi (oy):</span>
                <span class="font-bold text-slate-900">{{ Number(group.course?.durationMonths || 3).toFixed(1) }}</span>
              </div>
              <div class="py-1.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Jami darslar soni:</span>
                <span class="font-bold text-slate-900">{{ ((group.weekDays?.length || 3) * 4) * (group.course?.durationMonths || 3) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ======================================================== -->
        <!-- BOTTOM: DARS JADVALI (SCREENSHOTS 1, 2, 3, 4)           -->
        <!-- ======================================================== -->
        <div class="rounded-2xl border border-slate-200/90 shadow-xs bg-white p-6 space-y-6">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-900">Dars jadvali</h2>
            <button
              v-if="selectedLessonDay"
              @click="selectedLessonDay = null"
              type="button"
              class="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
            >
              <X class="h-3.5 w-3.5" />
              <span>Dars tafsilotini yopish</span>
            </button>
          </div>

          <!-- 1. Teacher Schedule Table (Screenshot 1 & 2 Visual Elevation) -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <tbody class="divide-y divide-slate-100">
                <!-- Teacher 1 (Main Teacher) -->
                <tr
                  @click="navigateToLesson(getFirstAccessibleDay(currentStudyMonth), activeStudyMonthIndex)"
                  class="hover:bg-blue-50/40 transition cursor-pointer group"
                  title="Dars va yo'qlamaga o'tish"
                >
                  <td class="py-3.5 px-4 font-bold text-blue-600 group-hover:underline">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {{ (mainMentor?.firstName || groupTeacherName).charAt(0) }}
                      </div>
                      <span>{{ mainMentor?.firstName }} {{ mainMentor?.lastName || '' }}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      <Calendar class="h-3 w-3 text-slate-400" />
                      {{ formatWeekDays(group.weekDays) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-medium text-slate-600">
                    <span class="inline-flex items-center gap-1">
                      <Clock class="h-3 w-3 text-slate-400" />
                      {{ group.startTime }} dan - {{ group.endTime }} gacha
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-medium text-slate-600">
                    {{ formatUzbekDate(group.startDate) }} - {{ group.endDate ? formatUzbekDate(group.endDate) : '27 Iyun, 2026' }}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-700">
                    <span class="inline-flex items-center gap-1.5 text-slate-600">
                      <Building2 class="h-3.5 w-3.5 text-slate-400" />
                      {{ group.room?.name || 'Xona #101' }} // {{ group.room?.capacity || group.maxStudents || 15 }}
                    </span>
                  </td>
                </tr>

                <!-- Teacher 2 (Assistant Teacher - only if exists) -->
                <tr
                  v-if="assistantMentor && showMoreSchedules"
                  @click="navigateToLesson(getFirstAccessibleDay(currentStudyMonth), activeStudyMonthIndex)"
                  class="hover:bg-blue-50/40 transition cursor-pointer group"
                >
                  <td class="py-3.5 px-4 font-bold text-blue-600 group-hover:underline">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {{ (assistantMentor?.firstName || 'A').charAt(0) }}
                      </div>
                      <span>{{ assistantMentor?.firstName }} {{ assistantMentor?.lastName || '' }}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      <Calendar class="h-3 w-3 text-slate-400" />
                      {{ formatWeekDays(group.weekDays) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-medium text-slate-600">
                    <span class="inline-flex items-center gap-1">
                      <Clock class="h-3 w-3 text-slate-400" />
                      {{ group.startTime }} dan - {{ group.endTime }} gacha
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-medium text-slate-600">
                    {{ formatUzbekDate(group.startDate) }} - {{ group.endDate ? formatUzbekDate(group.endDate) : '27 Iyun, 2026' }}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-700">
                    <span class="inline-flex items-center gap-1.5 text-slate-600">
                      <Building2 class="h-3.5 w-3.5 text-slate-400" />
                      {{ group.room?.name || 'Xona #101' }} // {{ group.room?.capacity || group.maxStudents || 15 }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Yana ko'rsatish Centered Button (only if assistant exists) -->
          <div v-if="assistantMentor" class="flex justify-center pt-1">
            <button
              @click="showMoreSchedules = !showMoreSchedules"
              type="button"
              class="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-2xs transition cursor-pointer active:scale-95"
            >
              {{ showMoreSchedules ? "Qisqartirish" : "Yana ko'rsatish" }}
            </button>
          </div>

          <!-- ==================================================== -->
          <!-- 2. MONTHS CAROUSEL / NAVIGATOR & DAY PILLS           -->
          <!-- ==================================================== -->
          <!-- 1. Single Month View (Screenshot 4) -->
          <div v-if="!showAllMonths" class="space-y-4 pt-4 border-t border-slate-100">
            <!-- Month Stepper: < 1-o'quv oyi > -->
            <div class="flex items-center gap-2">
              <button
                @click="prevStudyMonth"
                :disabled="activeStudyMonthIndex <= 0"
                type="button"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Oldingi oy"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>

              <span class="text-sm font-bold text-slate-900">
                {{ currentStudyMonth?.title || "1-o'quv oyi" }}
              </span>

              <button
                @click="nextStudyMonth"
                :disabled="activeStudyMonthIndex >= studyMonths.length - 1"
                type="button"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Keyingi oy"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>

            <!-- Single Month Day Chips: 20 weekdays matching Screenshot 4 -->
            <div class="flex flex-wrap gap-2.5 items-center">
              <button
                v-for="day in currentStudyMonth?.days"
                :key="day.dateStr"
                @click="handleSelectDay(day, activeStudyMonthIndex)"
                :disabled="!canAccessDay(day)"
                type="button"
                class="w-11 h-13 rounded-xl flex flex-col items-center justify-center p-1.5 transition select-none relative"
                :class="[
                  day.dateStr === selectedLessonDay?.dateStr
                    ? 'bg-[#6D28D9] text-white shadow-md ring-2 ring-purple-300 font-extrabold scale-105'
                    : !canAccessDay(day)
                    ? 'opacity-30 cursor-not-allowed bg-slate-100/50 text-slate-400 border border-dashed border-slate-200'
                    : day.isHeld
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                ]"
                :title="getDayTitle(day)"
              >
                <!-- Lock indicator for closed/locked days -->
                <span
                  v-if="!canAccessDay(day)"
                  class="absolute -top-1 -right-1 p-0.5 rounded-full bg-slate-200 text-slate-500 shadow-2xs"
                  title="Yopiq"
                >
                  <Lock class="w-2.5 h-2.5" />
                </span>
                <!-- Today indicator dot -->
                <span
                  v-else-if="day.isToday"
                  class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                  title="Bugungi dars kuni"
                ></span>
                <span
                  class="text-[10px] font-medium leading-none mb-1"
                  :class="day.dateStr === selectedLessonDay?.dateStr ? 'text-purple-200' : 'text-slate-400'"
                >
                  {{ day.monthShort }}
                </span>
                <span class="text-xs font-bold leading-none">
                  {{ day.dayNum }}
                </span>
              </button>
            </div>

            <!-- Barchasini ko'rish Button -->
            <div class="flex justify-center pt-2">
              <button
                @click="showAllMonths = true"
                type="button"
                class="px-6 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition cursor-pointer active:scale-95"
              >
                Barchasini ko'rish
              </button>
            </div>
          </div>

          <!-- 2. Multi-Month View (Screenshot 5) -->
          <div v-else class="space-y-6 pt-4 border-t border-slate-100">
            <div
              v-for="sm in studyMonths"
              :key="sm.index"
              class="space-y-3"
            >
              <h3 class="text-xs font-bold text-slate-900">{{ sm.title }}</h3>

              <!-- Multi-month: Continuous horizontal row of 20 weekdays -->
              <div class="flex flex-wrap gap-2.5 items-center">
                <button
                  v-for="day in sm.days"
                  :key="day.dateStr"
                  @click="handleSelectDay(day, sm.index)"
                  :disabled="!canAccessDay(day)"
                  type="button"
                  class="w-11 h-13 rounded-xl flex flex-col items-center justify-center p-1.5 transition select-none relative"
                  :class="[
                    day.dateStr === selectedLessonDay?.dateStr
                      ? 'bg-[#6D28D9] text-white shadow-md ring-2 ring-purple-300 font-extrabold scale-105'
                    : !canAccessDay(day)
                    ? 'opacity-30 cursor-not-allowed bg-slate-100/50 text-slate-400 border border-dashed border-slate-200'
                    : day.isHeld
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                  ]"
                  :title="getDayTitle(day)"
                >
                  <!-- Lock indicator for closed/locked days -->
                  <span
                    v-if="!canAccessDay(day)"
                    class="absolute -top-1 -right-1 p-0.5 rounded-full bg-slate-200 text-slate-500 shadow-2xs"
                    title="Yopiq"
                  >
                    <Lock class="w-2.5 h-2.5" />
                  </span>
                  <!-- Today indicator dot -->
                  <span
                    v-else-if="day.isToday"
                    class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                    title="Bugungi dars kuni"
                  ></span>
                  <span
                    class="text-[10px] font-medium leading-none mb-1"
                    :class="day.dateStr === selectedLessonDay?.dateStr ? 'text-purple-200' : 'text-slate-400'"
                  >
                    {{ day.monthShort }}
                  </span>
                  <span class="text-xs font-bold leading-none">
                    {{ day.dayNum }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Yopish Button (Screenshot 5) -->
            <div class="flex justify-center pt-2">
              <button
                @click="showAllMonths = false"
                type="button"
                class="px-6 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition cursor-pointer active:scale-95"
              >
                Yopish
              </button>
            </div>
          </div>

          <!-- ==================================================== -->
          <!-- 3. SELECTED LESSON DAY (SCREENSHOTS 2, 3, 4)         -->
          <!-- ==================================================== -->
          <div v-if="selectedLessonDay" class="space-y-5 pt-4 border-t border-slate-200/80">
            <!-- Mentor Tabs (Screenshot 3): Assistant vs Teacher -->
            <div v-if="isAdmin" class="flex items-center gap-6 border-b border-slate-200 pb-1 text-sm font-semibold">
              <button
                type="button"
                @click="activeMentorRole = 'ASSISTANT'"
                class="pb-2 cursor-pointer transition relative"
                :class="activeMentorRole === 'ASSISTANT' ? 'text-slate-900 border-b-2 border-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-700'"
              >
                Assistant
              </button>
              <button
                type="button"
                @click="activeMentorRole = 'TEACHER'"
                class="pb-2 cursor-pointer transition relative"
                :class="activeMentorRole === 'TEACHER' ? 'text-slate-900 border-b-2 border-emerald-500 font-bold' : 'text-slate-400 hover:text-slate-700'"
              >
                Teacher
              </button>
            </div>

            <!-- 1. MA'LUMOT KARTASI (Screenshot 2) -->
            <div class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
              <h3 class="text-sm font-bold text-slate-800">Ma'lumot</h3>

              <div class="flex flex-wrap items-center gap-10">
                <!-- Mentor Avatar + Ism + Roli (Qaysi mentor bo'lsa o'shaning nomidan) -->
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base shadow-2xs">
                    {{ (currentActiveMentor.firstName || 'O').charAt(0) }}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-slate-900">{{ currentActiveMentor.firstName }} {{ currentActiveMentor.lastName || '' }}</div>
                    <div class="text-xs text-slate-400 font-medium">{{ currentActiveMentor.role }}</div>
                  </div>
                </div>

                <!-- Dars kuni: Masalan 2026 M07 15 -->
                <div>
                  <div class="text-[11px] text-slate-400 font-medium">Dars kuni</div>
                  <div class="text-xs font-bold text-slate-900 mt-0.5">
                    {{ formatLessonDateDisplay(selectedLessonDay) }}
                  </div>
                </div>

                <!-- Holat: Dars o'tilmagan / Dars o'tilgan -->
                <div>
                  <div class="text-[11px] text-slate-400 font-medium">Holat</div>
                  <div
                    class="text-xs font-bold mt-0.5"
                    :class="selectedLessonDay.isHeld ? 'text-emerald-600' : 'text-slate-600'"
                  >
                    {{ selectedLessonDay.isHeld ? "Dars o'tilgan" : "Dars o'tilmagan" }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. YO'QLAMA VA MAVZU KIRITISH (Screenshot 2) -->
            <div class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
              <h3 class="text-sm font-bold text-slate-900">Yo'qlama va mavzu kiritish</h3>

              <!-- Radio: O'quv reja bo'yicha vs Boshqa -->
              <div class="flex items-center gap-6 text-xs">
                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    value="CURRICULUM"
                    v-model="topicMode"
                    class="h-4 w-4 text-[#6D28D9] focus:ring-[#6D28D9] border-slate-300"
                  />
                  <span>O'quv reja bo'yicha</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    value="CUSTOM"
                    v-model="topicMode"
                    class="h-4 w-4 text-[#6D28D9] focus:ring-[#6D28D9] border-slate-300"
                  />
                  <span>Boshqa</span>
                </label>
              </div>

              <!-- O'quv reja bo'yicha tanlanganda -->
              <div v-if="topicMode === 'CURRICULUM'" class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-bold text-slate-700">
                    <span class="text-rose-500">*</span> O'quv rejasidan mavzu
                  </label>
                  <button
                    type="button"
                    @click="showSyllabusModal = true"
                    class="text-[11px] font-semibold text-[#6D28D9] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus class="h-3 w-3" />
                    <span>Reja qo'shish / boshqarish</span>
                  </button>
                </div>

                <select
                  v-model="selectedSyllabusId"
                  @change="onSelectSyllabusTopic"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9] shadow-2xs cursor-pointer"
                >
                  <option value="" disabled>-- O'quv rejasidan mavzuni tanlang --</option>
                  <option
                    v-for="s in courseSyllabusList"
                    :key="s.id"
                    :value="s.id"
                  >
                    {{ s.lessonOrder }}-dars: {{ s.topic }}
                  </option>
                </select>
              </div>

              <!-- * Mavzu (Screenshot 2) -->
              <div class="space-y-1.5">
                <label class="block text-xs font-bold text-slate-700">
                  <span class="text-rose-500">*</span> Mavzu
                </label>
                <input
                  v-model="lessonTopicInput"
                  type="text"
                  placeholder="Mavzuni kiriting..."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9] shadow-2xs"
                />
              </div>

              <!-- Tavsif (ixtiyoriy) (Screenshot 2) -->
              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-slate-600">Tavsif (ixtiyoriy)</label>
                <textarea
                  v-model="lessonDescInput"
                  rows="2"
                  placeholder="Dars haqida qo'shimcha ma'lumot..."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9] shadow-2xs resize-none"
                ></textarea>
              </div>

              <!-- Topshiriq (Uyga vazifa) va Video darslik (Ixtiyoriy ochiluvchi blok) -->
              <div class="border border-slate-100 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-800">Topshiriq (Uyga vazifa) va Video darslik</span>
                    <span class="text-[10px] text-slate-400 font-medium">(Ixtiyoriy)</span>
                  </div>
                  <button
                    type="button"
                    @click="showExtraContent = !showExtraContent"
                    class="text-xs font-semibold text-[#6D28D9] hover:underline cursor-pointer"
                  >
                    {{ showExtraContent ? 'Yashirish' : "Ko'rsatish" }}
                  </button>
                </div>

                <div v-show="showExtraContent" class="space-y-3 pt-2 border-t border-slate-200/60">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="block text-[11px] font-medium text-slate-600">Video darslik havolasi (YouTube)</label>
                      <input
                        v-model="selectedLessonVideoUrl"
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6D28D9]"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="block text-[11px] font-medium text-slate-600">Topshirish muddati (Deadline)</label>
                      <input
                        v-model="dayHwDeadline"
                        type="datetime-local"
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#6D28D9]"
                      />
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="block text-[11px] font-medium text-slate-600">Vazifa topshirig'i</label>
                    <textarea
                      v-model="dayHwTask"
                      rows="2"
                      placeholder="Dars yuzasidan amaliy topshiriq matni..."
                      class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6D28D9] resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <!-- O'quvchilar yo'qlamasi jadvali (ON / OFF yo'qlama) -->
              <div class="space-y-2 pt-2">
                <div class="flex flex-wrap items-center justify-between gap-2 pb-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-800">Talabalar yo'qlamasi</span>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-[#6D28D9]">
                      {{ Object.values(lessonAttendanceMap).filter(Boolean).length }}/{{ groupStudents.length }} keldi
                    </span>
                  </div>

                  <!-- ON / OFF Barchasini boshqarish -->
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      @click="markAllStudentsPresent"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition cursor-pointer"
                    >
                      <Check class="h-3 w-3 stroke-3" />
                      <span>Barchasi ON (+1)</span>
                    </button>
                    <button
                      type="button"
                      @click="markAllStudentsAbsent"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                    >
                      <X class="h-3 w-3 stroke-3" />
                      <span>Barchasi OFF (0)</span>
                    </button>
                  </div>
                </div>

                <div class="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-2xs">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50/80 border-b border-slate-100 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th class="py-2.5 px-4 w-12">#</th>
                        <th class="py-2.5 px-4">O'quvchi ismi</th>
                        <th class="py-2.5 px-4 text-right w-44">Yo'qlama (ON / OFF)</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-medium">
                      <tr v-for="(s, idx) in groupStudents" :key="s.id" class="hover:bg-slate-50/60 transition">
                        <td class="py-3 px-4 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                        <td class="py-3 px-4">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                              {{ s.firstName?.charAt(0) }}
                            </div>
                            <div>
                              <div class="font-bold text-slate-900">{{ s.firstName }} {{ s.lastName }}</div>
                              <div class="text-[10px] text-slate-400">{{ s.phone }}</div>
                            </div>
                          </div>
                        </td>
                        <td class="py-3 px-4 text-right">
                          <!-- ON / OFF yo'qlama switch + badge -->
                          <div class="inline-flex items-center justify-end gap-2.5">
                            <!-- Toggle switch -->
                            <button
                              type="button"
                              role="switch"
                              :aria-checked="!!lessonAttendanceMap[s.id]"
                              @click="toggleStudentAttendance(s.id)"
                              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              :class="lessonAttendanceMap[s.id] ? 'bg-blue-600 shadow-xs' : 'bg-slate-300'"
                              :title="lessonAttendanceMap[s.id] ? '+1 (ON)' : '0 (OFF)'"
                            >
                              <span
                                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                                :class="lessonAttendanceMap[s.id] ? 'translate-x-5' : 'translate-x-0'"
                              />
                            </button>

                            <!-- Button status indicator (+1 / 0) -->
                            <button
                              type="button"
                              @click="toggleStudentAttendance(s.id)"
                              class="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer select-none min-w-16"
                              :class="lessonAttendanceMap[s.id] ? 'bg-blue-600 text-white shadow-2xs hover:bg-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                            >
                              <span>{{ lessonAttendanceMap[s.id] ? '+1' : '0' }}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr v-if="groupStudents.length === 0">
                        <td colspan="3" class="py-8 text-center text-slate-400 text-xs">
                          O'quvchilar yuklanmoqda...
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Saqlash tugmasi (Screenshot 2: o'ng pastdagi binafsha Saqlash tugmasi) -->
              <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  @click="selectedLessonDay = null"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Yopish
                </button>

                <button
                  type="button"
                  @click="handleSaveLessonAttendance"
                  :disabled="isSavingAttendance"
                  class="px-8 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-2"
                >
                  <span>{{ isSavingAttendance ? 'Saqlanmoqda...' : 'Saqlash' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 4. TAB 2: GURUH DARSLIKLARI (SCREENSHOTS 1, 2, 3, 4)      -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'LESSONS'" class="space-y-6">
        <!-- Persistent Top Header Bar with Sub-Tabs & Qo'shish Button (Screenshot 2) -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-base font-extrabold text-slate-900 mr-2">Guruh darsliklari</h2>
            <!-- Sub-tab Pills -->
            <div class="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl">
              <button
                type="button"
                @click="setMaterialsSubTab('HOMEWORK')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                :class="materialsSubTab === 'HOMEWORK' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Uyga vazifa
              </button>
              <button
                type="button"
                @click="setMaterialsSubTab('VIDEOS')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                :class="materialsSubTab === 'VIDEOS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Videolar
              </button>
              <button
                type="button"
                @click="setMaterialsSubTab('EXAMS')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                :class="materialsSubTab === 'EXAMS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Imtihonlar
              </button>
              <button
                type="button"
                @click="setMaterialsSubTab('MATERIALS')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                :class="materialsSubTab === 'MATERIALS' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Materiallar
              </button>
              <button
                type="button"
                @click="setMaterialsSubTab('JOURNAL')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                :class="materialsSubTab === 'JOURNAL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Jurnal
              </button>
            </div>
          </div>

          <!-- Green Qo'shish Button (Screenshot 1 & 4) -->
          <button
            type="button"
            @click="handleOpenAddContent"
            class="px-5 py-2.5 rounded-xl bg-[#00B533] hover:bg-[#009E2C] text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95 self-start sm:self-auto flex items-center gap-1.5"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Qo'shish</span>
          </button>
        </div>

        <!-- MODE 1: CREATE HOMEWORK (SCREENSHOT 2) -->
        <div v-if="materialsViewMode === 'CREATE_HOMEWORK'" class="space-y-6">
          <!-- Top Navigation with Back Arrow -->
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="closeCreateHomeworkView"
              class="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Orqaga"
            >
              <ChevronLeft class="h-6 w-6 text-slate-800" />
            </button>
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Yangi uyga vazifa yaratish</h1>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-8 space-y-6">
            <!-- * Mavzu -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-700">
                <span class="text-rose-500">*</span> Mavzu
              </label>
              <div v-if="!createHwIsCustom" class="relative">
                <select
                  v-model="createHwSelectedTopic"
                  @change="(e: any) => { if (e.target.value === '__CUSTOM__') { createHwIsCustom = true; createHwCustomTopic = ''; } }"
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#00B533] shadow-2xs cursor-pointer appearance-none pr-10"
                >
                  <option value="" disabled>Mavzulardan birini tanlang</option>
                  <option
                    v-for="lesson in (group?.lessons || [{ id: 1, topic: 'nvhgvcgh' }])"
                    :key="lesson.id"
                    :value="lesson.topic"
                  >
                    {{ lesson.topic }}
                  </option>
                  <option value="__CUSTOM__">+ Yangi mavzu kiritish...</option>
                </select>
                <ChevronRight class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-90 pointer-events-none" />
              </div>

              <div v-else class="flex items-center gap-2">
                <input
                  v-model="createHwCustomTopic"
                  type="text"
                  placeholder="Mavzu nomini kiriting..."
                  class="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#00B533] shadow-2xs"
                />
                <button
                  type="button"
                  @click="createHwIsCustom = false"
                  class="px-4 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Ro'yxatdan tanlash
                </button>
              </div>
            </div>

            <!-- * Izoh (Rich Text Editor Toolbar matching Screenshot 2) -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-700">
                <span class="text-rose-500">*</span> Izoh
              </label>
              <div class="border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00B533] focus-within:ring-2 focus-within:ring-emerald-500/20 transition shadow-2xs">
                <!-- Toolbar -->
                <div class="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 select-none">
                  <button
                    type="button"
                    @click="applyEditorFormat('H1')"
                    class="px-2 py-1 rounded hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                    title="Sarlavha 1"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('H2')"
                    class="px-2 py-1 rounded hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                    title="Sarlavha 2"
                  >
                    H2
                  </button>

                  <span class="w-px h-4 bg-slate-200 mx-1"></span>

                  <!-- Font selector -->
                  <div class="relative">
                    <select
                      v-model="createHwFontFamily"
                      class="px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer outline-none"
                    >
                      <option value="Sans Serif">Sans Serif</option>
                      <option value="Serif">Serif</option>
                      <option value="Monospace">Monospace</option>
                    </select>
                  </div>

                  <!-- Size selector -->
                  <div class="relative">
                    <select
                      v-model="createHwFontSize"
                      class="px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer outline-none"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Katta">Katta</option>
                      <option value="Kichik">Kichik</option>
                    </select>
                  </div>

                  <span class="w-px h-4 bg-slate-200 mx-1"></span>

                  <!-- Formatting -->
                  <button
                    type="button"
                    @click="applyEditorFormat('B')"
                    class="p-1.5 rounded hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                    title="Qalin (Bold)"
                  >
                    <Bold class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('I')"
                    class="p-1.5 rounded hover:bg-slate-100 italic text-slate-700 cursor-pointer"
                    title="Kursiv (Italic)"
                  >
                    <Italic class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('U')"
                    class="p-1.5 rounded hover:bg-slate-100 underline text-slate-700 cursor-pointer"
                    title="Tagiga chizilgan (Underline)"
                  >
                    <Underline class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('S')"
                    class="p-1.5 rounded hover:bg-slate-100 line-through text-slate-700 cursor-pointer"
                    title="Ustidan chizilgan (Strikethrough)"
                  >
                    <Strikethrough class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('QUOTE')"
                    class="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Iqtibos (Quote)"
                  >
                    <Quote class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('CODE')"
                    class="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer font-mono"
                    title="Kod (Code)"
                  >
                    &lt;&gt;
                  </button>

                  <span class="w-px h-4 bg-slate-200 mx-1"></span>

                  <button
                    type="button"
                    @click="applyEditorFormat('LIST')"
                    class="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Belgili ro'yxat"
                  >
                    <List class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('NUM_LIST')"
                    class="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Tartibli ro'yxat"
                  >
                    <ListOrdered class="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    @click="applyEditorFormat('LINK')"
                    class="p-1.5 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Havola qo'shish"
                  >
                    <LinkIcon class="h-3.5 w-3.5" />
                  </button>
                </div>

                <!-- Textarea -->
                <textarea
                  ref="editorTextareaRef"
                  v-model="createHwDescription"
                  rows="6"
                  placeholder="Vazifa haqida batafsil ma'lumot kiriting..."
                  class="w-full p-4 text-xs font-normal text-slate-800 placeholder-slate-400 focus:outline-none resize-none bg-white"
                  :style="{
                    fontFamily: createHwFontFamily === 'Serif' ? 'serif' : createHwFontFamily === 'Monospace' ? 'monospace' : 'sans-serif',
                    fontSize: createHwFontSize === 'Katta' ? '14px' : createHwFontSize === 'Kichik' ? '11px' : '12px',
                  }"
                ></textarea>
              </div>
            </div>

            <!-- Upload Dropzone (matching Screenshot 2) -->
            <div class="space-y-2">
              <input
                ref="hwFileInputRef"
                type="file"
                multiple
                class="hidden"
                @change="handleHwFileSelect"
              />
              <div
                @click="triggerHwFileInput"
                @dragover.prevent
                @drop.prevent="(e) => { if (e.dataTransfer?.files) handleHwFileSelect({ target: { files: e.dataTransfer.files } } as any); }"
                class="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-8 text-center bg-slate-50/40 hover:bg-emerald-50/20 transition cursor-pointer group"
              >
                <div class="w-12 h-12 rounded-full bg-emerald-50 text-[#00B533] flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud class="h-6 w-6 text-[#00B533]" />
                </div>
                <div class="text-xs font-medium text-slate-600">
                  Faylni tanlash yoki shu yerga tashlang
                </div>
              </div>

              <!-- Uploaded Files List -->
              <div v-if="createHwFiles.length > 0" class="flex flex-wrap gap-2 pt-2">
                <div
                  v-for="(f, fIdx) in createHwFiles"
                  :key="fIdx"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                >
                  <FileText class="h-3.5 w-3.5 text-slate-500" />
                  <span class="max-w-50 truncate">{{ f.name }}</span>
                  <span class="text-[10px] text-slate-400">({{ f.size }})</span>
                  <button
                    type="button"
                    @click.stop="removeHwFile(fIdx)"
                    class="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Extra Parameters -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Dars sanasi</label>
                <input
                  v-model="createHwLessonDate"
                  type="date"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00B533] shadow-2xs bg-white"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Topshirish muddati (Tugash vaqti)</label>
                <input
                  v-model="createHwDeadline"
                  type="datetime-local"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00B533] shadow-2xs bg-white"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal ball</label>
                <input
                  v-model.number="createHwMaxScore"
                  type="number"
                  min="1"
                  max="100"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00B533] shadow-2xs bg-white"
                />
              </div>
            </div>

            <!-- Footer Actions (Screenshot 2) -->
            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                @click="closeCreateHomeworkView"
                class="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                @click="handleSaveNewHomework"
                :disabled="isSubmittingNewHomework"
                class="px-6 py-2.5 rounded-xl bg-[#00B533] hover:bg-[#009E2C] text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {{ isSubmittingNewHomework ? "Saqlanmoqda..." : "Saqlash" }}
              </button>
            </div>
          </div>
        </div>

        <!-- MODE 2: CHECK HOMEWORK SUBMISSIONS (SCREENSHOT 3) -->
        <div v-else-if="materialsViewMode === 'CHECK_HOMEWORK'" class="space-y-6">
          <!-- Top Navigation with Back Arrow & Breadcrumbs -->
          <div class="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div class="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                @click="closeHomeworkCheckingView"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Barcha vazifalarga qaytish"
              >
                <ChevronLeft class="h-4 w-4" />
                <span>Barcha vazifalar</span>
              </button>
              <span class="text-slate-300">/</span>
              <h1 class="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate">
                {{ selectedHomework?.title }}
              </h1>
            </div>
            <button
              type="button"
              @click="closeHomeworkCheckingView"
              class="text-xs font-bold text-[#6D28D9] hover:underline cursor-pointer shrink-0"
            >
              Ro'yxatga qaytish
            </button>
          </div>

          <!-- Homework Info Card (Screenshot 3) -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div class="text-xs font-medium text-slate-400">Mavzu</div>
                <div class="text-sm font-bold text-slate-900 mt-1">{{ selectedHomework?.title || 'nvhgvcgh' }}</div>
              </div>
              <div>
                <div class="text-xs font-medium text-slate-400">Tugash vaqti</div>
                <div class="text-sm font-bold text-slate-900 mt-1">{{ selectedHomework?.deadline || '28 Aug, 2026 07:14' }}</div>
              </div>
            </div>
          </div>

          <!-- Status Tabs with Count Badges (Screenshot 3) -->
          <div class="border-b border-slate-200 flex items-center gap-8 text-xs font-semibold overflow-x-auto select-none">
            <!-- Kutayotganlar -->
            <button
              type="button"
              @click="activeCheckingTab = 'PENDING'"
              class="pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap"
              :class="
                activeCheckingTab === 'PENDING'
                  ? 'border-[#00B533] text-[#00B533] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              "
            >
              <span>Kutayotganlar</span>
              <span class="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[10px] font-bold">
                {{ pendingSubmissionsCount }}
              </span>
            </button>

            <!-- Qaytarilganlar -->
            <button
              type="button"
              @click="activeCheckingTab = 'REJECTED'"
              class="pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap"
              :class="
                activeCheckingTab === 'REJECTED'
                  ? 'border-[#00B533] text-[#00B533] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              "
            >
              <span>Qaytarilganlar</span>
              <span class="w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-[10px] font-bold">
                {{ rejectedSubmissionsCount }}
              </span>
            </button>

            <!-- Qabul qilinganlar -->
            <button
              type="button"
              @click="activeCheckingTab = 'ACCEPTED'"
              class="pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap"
              :class="
                activeCheckingTab === 'ACCEPTED'
                  ? 'border-[#00B533] text-[#00B533] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              "
            >
              <span>Qabul qilinganlar</span>
              <span class="w-5 h-5 rounded-full bg-[#00B533] text-white flex items-center justify-center text-[10px] font-bold">
                {{ acceptedSubmissionsCount }}
              </span>
            </button>

            <!-- Bajarilmagan -->
            <button
              type="button"
              @click="activeCheckingTab = 'NOT_SUBMITTED'"
              class="pb-3 flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap"
              :class="
                activeCheckingTab === 'NOT_SUBMITTED'
                  ? 'border-[#00B533] text-[#00B533] font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              "
            >
              <span>Bajarilmagan</span>
              <span class="w-5 h-5 rounded-full bg-[#00B533] text-white flex items-center justify-center text-[10px] font-bold">
                {{ notSubmittedCount }}
              </span>
            </button>
          </div>

          <!-- Submissions Table (Screenshot 3) -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
                  <tr>
                    <th scope="col" class="py-3.5 px-6">O'quvchi ismi</th>
                    <th scope="col" class="py-3.5 px-6">Uyga vazifa jo'natilgan vaqt</th>
                    <th scope="col" class="py-3.5 px-6 text-right">Amallar</th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr
                    v-for="sub in filteredCheckingStudents"
                    :key="sub.id"
                    class="hover:bg-slate-50/70 transition-colors"
                  >
                    <td class="py-4 px-6 font-bold text-slate-900">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {{ sub.studentName?.charAt(0) || 'T' }}
                        </div>
                        <div>
                          <div>{{ sub.studentName }}</div>
                          <div class="text-[10px] text-slate-400 font-normal">{{ sub.studentPhone }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-4 px-6 text-slate-500">
                      {{ sub.submittedAt || '-' }}
                    </td>
                    <td class="py-4 px-6 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-2">
                        <!-- If PENDING -->
                        <button
                          v-if="sub.status === 'PENDING'"
                          type="button"
                          @click="openStudentGrading(sub)"
                          class="px-3.5 py-1.5 rounded-xl bg-[#00B533] hover:bg-[#009E2C] text-white text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          Tekshirish
                        </button>

                        <!-- If NOT_SUBMITTED -->
                        <div v-else-if="sub.status === 'NOT_SUBMITTED'" class="flex items-center gap-2">
                          <button
                            type="button"
                            @click="simulateStudentSubmission(sub)"
                            class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6D28D9] text-xs font-bold transition cursor-pointer"
                            title="Talaba nomidan topshiriq yuborish (Test qilish uchun)"
                          >
                            Topshirdi deb belgilash
                          </button>
                          <button
                            type="button"
                            @click="openStudentGrading(sub)"
                            class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
                          >
                            Baholash
                          </button>
                        </div>

                        <!-- If ACCEPTED -->
                        <div v-else-if="sub.status === 'ACCEPTED' || sub.status === 'CHECKED'" class="flex items-center gap-2">
                          <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                            {{ sub.score || 95 }} ball (+{{ sub.coinsEarned ?? 3 }} 🪙)
                          </span>
                          <button
                            type="button"
                            @click="openStudentGrading(sub)"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Qayta baholash"
                          >
                            <Edit2 class="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <!-- If REJECTED -->
                        <div v-else class="flex items-center gap-2">
                          <span class="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs">
                            Qaytarilgan
                          </span>
                          <button
                            type="button"
                            @click="openStudentGrading(sub)"
                            class="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                          >
                            Qayta ko'rish
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <!-- Empty State Matching Screenshot 3 -->
                  <tr v-if="filteredCheckingStudents.length === 0">
                    <td colspan="3" class="py-20 text-center text-slate-400 text-xs font-medium">
                      Ma'lumot mavjud emas
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- MODE 3: DEFAULT LIST (SCREENSHOTS 1 & 4) -->
        <div v-else class="space-y-6">
          <!-- Table Matching Screenshot 1 & 4 -->
          <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <!-- 1. HOMEWORK SUBTAB (SCREENSHOT 1) -->
                <template v-if="materialsSubTab === 'HOMEWORK'">
                  <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
                    <tr>
                      <th scope="col" class="py-3.5 px-4 w-12">#</th>
                      <th scope="col" class="py-3.5 px-4">Mavzu</th>
                      <th scope="col" class="py-3.5 px-4 text-center w-16">
                        <UserIcon class="h-4 w-4 mx-auto text-slate-400" />
                      </th>
                      <th scope="col" class="py-3.5 px-4 text-center w-16">
                        <Clock class="h-4 w-4 mx-auto text-amber-500" />
                      </th>
                      <th scope="col" class="py-3.5 px-4 text-center w-16">
                        <CheckCircle2 class="h-4 w-4 mx-auto text-emerald-500" />
                      </th>
                      <th scope="col" class="py-3.5 px-4">Berilgan vaqt</th>
                      <th scope="col" class="py-3.5 px-4">Tugash vaqti</th>
                      <th scope="col" class="py-3.5 px-4">Dars sanasi</th>
                      <th scope="col" class="py-3.5 px-4 text-center w-12"></th>
                    </tr>
                  </thead>

                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr
                      v-for="(hw, idx) in homeworkList"
                      :key="hw.id"
                      @click="openHomeworkCheckingView(hw)"
                      class="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td class="py-3.5 px-4 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                      <td class="py-3.5 px-4 font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        <div>{{ hw.title }}</div>
                      </td>
                      <td class="py-3.5 px-4 text-center font-semibold text-slate-600">{{ hw.studentsCount || groupStudents.length || 1 }}</td>
                      <td class="py-3.5 px-4 text-center font-semibold text-slate-600">{{ hw.pendingCount || 0 }}</td>
                      <td class="py-3.5 px-4 text-center font-semibold text-slate-600">{{ hw.completedCount || 0 }}</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ hw.assignedAt || '-' }}</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ hw.deadline || '-' }}</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ hw.lessonDate || '-' }}</td>
                      <td class="py-3.5 px-4 text-center relative" @click.stop>
                        <button
                          type="button"
                          @click="toggleHwMenu(hw.id)"
                          class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <MoreVertical class="h-4 w-4" />
                        </button>

                        <!-- Floating 3-dots Menu for Homework -->
                        <div
                          v-if="activeHwMenuId === hw.id"
                          class="absolute right-3 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 text-left font-medium text-xs text-slate-700 space-y-0.5"
                        >
                          <button
                            type="button"
                            @click="openHomeworkCheckingView(hw)"
                            class="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition cursor-pointer"
                          >
                            <Eye class="h-3.5 w-3.5 text-emerald-600" />
                            <span>Tekshirish</span>
                          </button>
                          <button
                            type="button"
                            @click="openEditHomeworkModal(hw); activeHwMenuId = null;"
                            class="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition cursor-pointer"
                          >
                            <Edit2 class="h-3.5 w-3.5 text-slate-500" />
                            <span>Tahrirlash</span>
                          </button>
                          <button
                            type="button"
                            @click="handleDeleteHomework(hw.id, hw.title); activeHwMenuId = null;"
                            class="w-full px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 class="h-3.5 w-3.5 text-rose-500" />
                            <span>O'chirish</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="homeworkList.length === 0">
                      <td colspan="9" class="py-16 text-center text-slate-400 text-xs font-medium">
                        Hozircha uyga vazifalar yo'q. Qo'shish uchun "Qo'shish" tugmasini bosing.
                      </td>
                    </tr>
                  </tbody>
                </template>

                <!-- 2. VIDEOS SUBTAB (SCREENSHOT 4) -->
                <template v-else-if="materialsSubTab === 'VIDEOS'">
                  <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
                    <tr>
                      <th scope="col" class="py-3.5 px-4 w-12">#</th>
                      <th scope="col" class="py-3.5 px-4">Video nomi</th>
                      <th scope="col" class="py-3.5 px-4">Dars nomi</th>
                      <th scope="col" class="py-3.5 px-4">Status</th>
                      <th scope="col" class="py-3.5 px-4">Dars sanasi</th>
                      <th scope="col" class="py-3.5 px-4">Hajmi</th>
                      <th scope="col" class="py-3.5 px-4">Qo'shilgan vaqti</th>
                      <th scope="col" class="py-3.5 px-4 text-center w-12"></th>
                    </tr>
                  </thead>

                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr
                      v-for="(vItem, idx) in groupVideos"
                      :key="vItem.id"
                      class="hover:bg-slate-50/70 transition-colors"
                    >
                      <td class="py-3.5 px-4 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                      <td class="py-3.5 px-4 font-bold">
                        <button
                          type="button"
                          @click="openWatchGroupVideo(vItem)"
                          class="flex items-center gap-2 text-[#2563eb] hover:underline cursor-pointer font-semibold text-xs"
                        >
                          <Play class="h-3.5 w-3.5 text-[#2563eb] fill-[#2563eb]/20" />
                          <span>{{ vItem.videoName }}</span>
                        </button>
                      </td>
                      <td class="py-3.5 px-4 text-slate-700 font-medium">{{ vItem.lessonTopic }}</td>
                      <td class="py-3.5 px-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ecfdf5] text-[#059669]">
                          Tayyor
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-600">{{ vItem.lessonDate }}</td>
                      <td class="py-3.5 px-4 text-slate-600">{{ vItem.size }}</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ vItem.uploadedAt }}</td>
                      <td class="py-3.5 px-4 text-center relative" @click.stop>
                        <button
                          type="button"
                          @click="toggleVideoMenu(vItem.id)"
                          class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <MoreVertical class="h-4 w-4" />
                        </button>

                        <!-- Floating 3-dots Menu for Video -->
                        <div
                          v-if="activeVideoMenuId === vItem.id"
                          class="absolute right-3 top-10 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 text-left font-medium text-xs text-slate-700 space-y-0.5"
                        >
                          <button
                            type="button"
                            @click="openWatchGroupVideo(vItem)"
                            class="w-full px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition cursor-pointer"
                          >
                            <Play class="h-3.5 w-3.5 text-blue-600" />
                            <span>Ko'rish</span>
                          </button>
                          <button
                            type="button"
                            @click="groupVideos.splice(idx, 1); activeVideoMenuId = null; showFeedback('Video o\'chirildi');"
                            class="w-full px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 class="h-3.5 w-3.5 text-rose-500" />
                            <span>O'chirish</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    <tr v-if="groupVideos.length === 0">
                      <td colspan="8" class="py-16 text-center text-slate-400 text-xs font-medium">
                        Hozircha video darsliklar mavjud emas. Qo'shish uchun "Qo'shish" tugmasini bosing.
                      </td>
                    </tr>
                  </tbody>
                </template>

                <!-- 3. EXAMS SUBTAB -->
                <template v-if="materialsSubTab === 'EXAMS'">
                  <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
                    <tr>
                      <th scope="col" class="py-3.5 px-4 w-12">#</th>
                      <th scope="col" class="py-3.5 px-4">Imtihon nomi</th>
                      <th scope="col" class="py-3.5 px-4 text-center">Talabalar</th>
                      <th scope="col" class="py-3.5 px-4 text-center">Maksimal Ball</th>
                      <th scope="col" class="py-3.5 px-4 text-center">Holat</th>
                      <th scope="col" class="py-3.5 px-4">Berilgan vaqt</th>
                      <th scope="col" class="py-3.5 px-4">Tugash vaqti</th>
                      <th scope="col" class="py-3.5 px-4">Dars sanasi</th>
                      <th scope="col" class="py-3.5 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr
                      v-for="(exam, idx) in examList"
                      :key="exam.id"
                      class="hover:bg-slate-50/70 transition-colors"
                    >
                      <td class="py-3.5 px-4 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                      <td class="py-3.5 px-4 font-bold text-slate-900">{{ exam.title }}</td>
                      <td class="py-3.5 px-4 text-center font-semibold text-slate-600">{{ groupStudents.length }}</td>
                      <td class="py-3.5 px-4 text-center font-semibold text-amber-600">{{ exam.maxScore }} ball</td>
                      <td class="py-3.5 px-4 text-center font-semibold text-emerald-600">✓</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ formatUzbekDate(exam.examDate) }}</td>
                      <td class="py-3.5 px-4 text-slate-500">-</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ formatUzbekDate(exam.examDate) }}</td>
                      <td class="py-3.5 px-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            @click="openExamResultsModal(exam)"
                            class="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-[#6D28D9] font-bold text-[11px] transition cursor-pointer"
                            title="Natijalarni kiritish va tangalar berish"
                          >
                            Natijalar (+🪙)
                          </button>
                          <button
                            type="button"
                            @click="openEditExamModal(exam)"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 class="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            @click="handleDeleteExam(exam.id, exam.title)"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 class="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="examList.length === 0">
                      <td colspan="9" class="py-16 text-center text-slate-400 text-xs font-medium">
                        Hozircha imtihonlar mavjud emas. Qo'shish uchun "+ Qo'shish" tugmasini bosing.
                      </td>
                    </tr>
                  </tbody>
                </template>

                <!-- 4. MATERIALS SUBTAB -->
                <template v-if="materialsSubTab === 'MATERIALS'">
                  <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
                    <tr>
                      <th scope="col" class="py-3.5 px-4 w-12">#</th>
                      <th scope="col" class="py-3.5 px-4">Material nomi</th>
                      <th scope="col" class="py-3.5 px-4">Tegishli dars</th>
                      <th scope="col" class="py-3.5 px-4 text-center">Fayl turi</th>
                      <th scope="col" class="py-3.5 px-4">Hajmi</th>
                      <th scope="col" class="py-3.5 px-4">Yuklangan sana</th>
                      <th scope="col" class="py-3.5 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr
                      v-for="(mat, idx) in groupMaterials"
                      :key="mat.id"
                      class="hover:bg-slate-50/70 transition-colors"
                    >
                      <td class="py-3.5 px-4 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                      <td class="py-3.5 px-4 font-bold text-slate-900">
                        <div class="flex items-center gap-2">
                          <FileText class="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{{ mat.title }}</span>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-slate-600">{{ mat.lessonTopic }}</td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          {{ mat.fileType }}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-500 font-mono text-xs">{{ mat.size }}</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ mat.uploadedAt }}</td>
                      <td class="py-3.5 px-4 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            @click="handleOpenMaterial(mat)"
                            class="px-3 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-[#6D28D9] font-bold text-xs transition cursor-pointer"
                          >
                            Yuklab olish
                          </button>
                          <button
                            type="button"
                            @click="handleDeleteMaterial(mat.id)"
                            class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="groupMaterials.length === 0">
                      <td colspan="7" class="py-16 text-center text-slate-400 text-xs font-medium">
                        Hozircha dars materiallari yuklanmagan. Qo'shish uchun "+ Qo'shish" tugmasini bosing.
                      </td>
                    </tr>
                  </tbody>
                </template>

                <!-- 5. JOURNAL SUBTAB -->
                <template v-if="materialsSubTab === 'JOURNAL'">
                  <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
                    <tr>
                      <th scope="col" class="py-3.5 px-4 w-12">#</th>
                      <th scope="col" class="py-3.5 px-4">Mavzu</th>
                      <th scope="col" class="py-3.5 px-4 text-center">Talabalar</th>
                      <th scope="col" class="py-3.5 px-4 text-center">Davomiyligi</th>
                      <th scope="col" class="py-3.5 px-4 text-center">O'tildi</th>
                      <th scope="col" class="py-3.5 px-4">Rejalashtirilgan sana</th>
                      <th scope="col" class="py-3.5 px-4">Xona</th>
                      <th scope="col" class="py-3.5 px-4">Dars sanasi</th>
                      <th scope="col" class="py-3.5 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium">
                    <tr
                      v-for="(day, idx) in studyMonths[activeStudyMonthIndex]?.days"
                      :key="day.dateStr"
                      @click="handleSelectDay(day, activeStudyMonthIndex)"
                      class="transition-colors"
                      :class="!canAccessDay(day) ? 'opacity-40 cursor-not-allowed bg-slate-50/50' : 'hover:bg-slate-50/70 cursor-pointer'"
                    >
                      <td class="py-3.5 px-4 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                      <td class="py-3.5 px-4 font-bold text-slate-900">
                        <div class="flex items-center gap-1.5">
                          <Lock v-if="!canAccessDay(day)" class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{{ day.topic }}</span>
                        </div>
                      </td>
                      <td class="py-3.5 px-4 text-center font-semibold text-slate-600">{{ groupStudents.length }}</td>
                      <td class="py-3.5 px-4 text-center font-semibold text-slate-400">90 daq</td>
                      <td class="py-3.5 px-4 text-center">
                        <span :class="day.isHeld ? 'text-emerald-600 font-bold' : 'text-slate-300'">{{ day.isHeld ? '✓' : '—' }}</span>
                      </td>
                      <td class="py-3.5 px-4 text-slate-500">{{ day.formattedDate }}</td>
                      <td class="py-3.5 px-4 text-slate-500">-</td>
                      <td class="py-3.5 px-4 text-slate-500">{{ day.formattedDate }}</td>
                      <td class="py-3.5 px-4 text-right">
                        <button
                          v-if="canAccessDay(day)"
                          type="button"
                          @click.stop="handleSelectDay(day, activeStudyMonthIndex)"
                          class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#6D28D9] text-white hover:bg-[#5b21b6] cursor-pointer shadow-2xs transition"
                        >
                          Darsga o'tish
                        </button>
                        <span
                          v-else
                          class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"
                        >
                          <Lock class="w-3 h-3 text-slate-400" />
                          Yopiq
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </template>
            </table>
          </div>
        </div>
      </div>
    </div>

      <!-- ======================================================== -->
      <!-- 5. TAB 3: AKADEMIK DAVOMATI (INTERACTIVE MATRIX + LIST)   -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'ATTENDANCE'" class="space-y-6">
        <!-- TOP KPI STATS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <CheckCircle class="h-5 w-5" />
            </div>
            <div>
              <div class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">O'rtacha Davomat</div>
              <div class="text-xl font-extrabold text-slate-900 mt-0.5">96.4%</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-[#6D28D9] flex items-center justify-center shrink-0 border border-purple-100">
              <Calendar class="h-5 w-5" />
            </div>
            <div>
              <div class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">O'tilgan Darslar</div>
              <div class="text-xl font-extrabold text-slate-900 mt-0.5">15 / 20 ta dars</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Coins class="h-5 w-5" />
            </div>
            <div>
              <div class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Davomat Tangalari</div>
              <div class="text-xl font-extrabold text-amber-600 mt-0.5">
                {{ totalAttendanceCoins }} coin berilgan
              </div>
            </div>
          </div>
        </div>

        <!-- INTERACTIVE ATTENDANCE MATRIX -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div class="flex items-center gap-3">
              <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Akademik Davomat Matritsasi</h3>
              <span class="text-[10px] text-slate-400 font-medium">On/off yo'qlama (Keldi: +1)</span>
            </div>

            <!-- Month Navigator in Attendance Matrix -->
            <div class="flex items-center gap-2">
              <button
                @click="prevStudyMonth"
                :disabled="activeStudyMonthIndex <= 0"
                type="button"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Oldingi oy"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>

              <span class="text-xs font-bold text-slate-900">
                {{ currentStudyMonth?.title || "1-o'quv oyi" }}
              </span>

              <button
                @click="nextStudyMonth"
                :disabled="activeStudyMonthIndex >= studyMonths.length - 1"
                type="button"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Keyingi oy"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th scope="col" class="py-3 px-3 w-10 text-center sticky left-0 bg-slate-50 z-10 shadow-r">#</th>
                  <th scope="col" class="py-3 px-3 min-w-40 sticky left-10 bg-slate-50 z-10 shadow-r">Talaba</th>
                  <!-- 20 study day columns -->
                  <th
                    v-for="day in currentStudyMonth?.days"
                    :key="day.dateStr"
                    scope="col"
                    class="py-2.5 px-2 text-center min-w-10 border-l border-slate-100"
                    :class="day.isToday ? 'bg-purple-50 text-[#6D28D9]' : ''"
                  >
                    <div class="text-[9px] font-semibold text-slate-400">{{ day.monthShort }}</div>
                    <div class="text-xs font-bold text-slate-800">{{ day.dayNum }}</div>
                  </th>
                  <th scope="col" class="py-3 px-3 text-center min-w-20 border-l border-slate-200 bg-slate-50">Qatnashdi</th>
                  <th scope="col" class="py-3 px-3 text-center min-w-16 bg-slate-50">Davomat %</th>
                  <th scope="col" class="py-3 px-3 text-center min-w-20 bg-slate-50 text-amber-600">Tangalar</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-100 text-xs font-medium">
                <tr
                  v-for="(s, sIdx) in groupStudents"
                  :key="s.id"
                  class="hover:bg-slate-50/60 transition"
                >
                  <td class="py-3 px-3 text-center text-slate-400 font-mono sticky left-0 bg-white z-10">
                    {{ Number(sIdx) + 1 }}
                  </td>
                  <td class="py-3 px-3 font-bold text-slate-900 sticky left-10 bg-white z-10 whitespace-nowrap shadow-r">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full bg-slate-100 text-[#6D28D9] flex items-center justify-center font-bold text-[10px] shrink-0">
                        {{ s.firstName?.charAt(0) }}
                      </div>
                      <span>{{ s.firstName }} {{ s.lastName }}</span>
                    </div>
                  </td>

                  <!-- 20 Attendance Cells (Textless On/Off Check Toggle Switch - Blue) -->
                  <td
                    v-for="day in currentStudyMonth?.days"
                    :key="day.dateStr"
                    class="py-2.5 px-2 text-center border-l border-slate-100"
                    :class="day.isToday ? 'bg-purple-50/30' : ''"
                  >
                    <button
                      type="button"
                      @click="toggleGridAttendance(day.dateStr, s.id)"
                      :disabled="!canAccessDay(day)"
                      class="relative inline-flex h-4.5 w-8 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none mx-auto"
                      :class="[
                        !canAccessDay(day)
                          ? 'opacity-30 cursor-not-allowed bg-slate-200'
                          : getStudentAttendanceStatus(day.dateStr, s.id) === 'PRESENT'
                          ? 'bg-blue-600 cursor-pointer'
                          : 'bg-slate-200 hover:bg-slate-300 cursor-pointer'
                      ]"
                      :title="!canAccessDay(day) ? 'Dars yopiq' : (getStudentAttendanceStatus(day.dateStr, s.id) === 'PRESENT' ? '+1' : '0')"
                    >
                      <span
                        class="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out mt-0.5"
                        :class="getStudentAttendanceStatus(day.dateStr, s.id) === 'PRESENT' ? 'translate-x-4' : 'translate-x-0.5'"
                      />
                    </button>
                  </td>

                  <!-- Summary Stats Columns -->
                  <td class="py-3 px-3 text-center font-bold text-slate-700 border-l border-slate-200 bg-slate-50/30">
                    14 / 15
                  </td>
                  <td class="py-3 px-3 text-center font-extrabold text-blue-600 bg-slate-50/30">
                    93%
                  </td>
                  <td class="py-3 px-3 text-center font-bold text-amber-600 bg-slate-50/30">
                    {{ s.coins || 0 }} 🪙
                  </td>
                </tr>

                <tr v-if="groupStudents.length === 0">
                  <td colspan="25" class="py-12 text-center text-slate-400 text-xs">
                    Guruhda talabalar mavjud emas
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- SEARCH AND TALABALAR RO'YXATI TABLE -->
        <div class="space-y-4 pt-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="relative flex-1 max-w-md">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                v-model="studentSearch"
                type="text"
                placeholder="Guruhdagi talabani qidirish..."
                class="w-full h-10 pl-9 pr-4 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9] shadow-2xs"
              />
            </div>

            <button
              @click="showAddStudentModal = true"
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-semibold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto active:scale-95"
            >
              <Plus class="h-3.5 w-3.5" />
              <span>+ Talaba qo'shish</span>
            </button>
          </div>

          <div v-if="filteredGroupStudents.length === 0" class="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
            <Users class="h-10 w-10 text-slate-300 mx-auto" />
            <h3 class="text-sm font-bold text-slate-700 mt-2">Ushbu guruhda talabalar yo'q</h3>
            <p class="text-xs text-slate-500 mt-0.5">Yangi talaba qo'shish uchun "+ Talaba qo'shish" tugmasini bosing.</p>
          </div>

          <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-600">
                <thead class="text-[11px] bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-4">#</th>
                    <th class="py-3 px-4">Talaba Nomi</th>
                    <th class="py-3 px-4">Telefon</th>
                    <th class="py-3 px-4">To'lov Holati</th>
                    <th class="py-3 px-4">Tangalar</th>
                    <th class="py-3 px-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr v-for="(s, idx) in filteredGroupStudents" :key="s.id" class="hover:bg-slate-50/70 transition">
                    <td class="py-3.5 px-4 text-slate-400 font-mono">{{ Number(idx) + 1 }}</td>
                    <td class="py-3.5 px-4">
                      <button
                        @click="handleNavigateStudent(s.id)"
                        type="button"
                        class="flex items-center gap-2.5 text-left group/sname"
                        :class="isAdmin ? 'cursor-pointer' : 'cursor-default'"
                      >
                        <div class="h-8 w-8 rounded-full bg-purple-50 text-[#6D28D9] border border-purple-100 flex items-center justify-center font-bold text-xs shrink-0">
                          {{ s.firstName?.charAt(0) }}{{ s.lastName?.charAt(0) }}
                        </div>
                        <div>
                          <div class="font-bold text-slate-900 group-hover/sname:text-[#6D28D9] transition">
                            {{ s.firstName }} {{ s.lastName }}
                          </div>
                          <div class="text-[10px] text-slate-400">{{ s.email || '-' }}</div>
                        </div>
                      </button>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-slate-700">
                      {{ s.phone }}
                    </td>
                    <td class="py-3.5 px-4">
                      <span
                        class="px-2 py-0.5 rounded-md text-[11px] font-bold"
                        :class="
                          s.paymentStatus === 'PAID' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          s.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        "
                      >
                        {{ s.paymentStatus === 'PAID' ? "To'langan" : s.paymentStatus === 'PENDING' ? "Kutilmoqda" : "Qayd yo'q" }}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 font-bold text-amber-600">
                      {{ s.coins || 0 }} coin 🪙
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          v-if="isAdmin"
                          @click="handleNavigateStudent(s.id)"
                          type="button"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-purple-50 transition cursor-pointer"
                          title="360° Profilga o'tish"
                        >
                          <ExternalLink class="h-4 w-4" />
                        </button>

                        <button
                          v-if="isAdmin"
                          @click="openPaymentForStudent(s)"
                          type="button"
                          class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title="To'lov qabul qilish"
                        >
                          <CreditCard class="h-4 w-4" />
                        </button>

                        <button
                          v-if="isAdmin"
                          @click="handleRemoveStudent(s.id, `${s.firstName} ${s.lastName}`)"
                          type="button"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Guruhdan chiqarish"
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
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 6. TAB 4: SOZLAMALAR                                    -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'SETTINGS'" class="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl space-y-4 shadow-xs">
        <h3 class="text-sm font-bold text-slate-900">Guruh Ma'lumotlarini Yangilash</h3>

        <form @submit.prevent="handleUpdateGroup" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Guruh Nomi</label>
            <input
              v-model="editName"
              type="text"
              required
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none font-bold"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Kurs</label>
              <select
                v-model="editCourseId"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
              >
                <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Xona</label>
              <select
                v-model="editRoomId"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
              >
                <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Boshlanish vaqti</label>
              <input
                v-model="editStartTime"
                type="time"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Tugash vaqti</label>
              <input
                v-model="editEndTime"
                type="time"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Maks. Talabalar</label>
              <input
                v-model.number="editMaxStudents"
                type="number"
                min="1"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
              />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="isSubmittingEdit"
              class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
            >
              {{ isSubmittingEdit ? "Saqlanmoqda..." : "O'zgarishlarni Saqlash" }}
            </button>

            <button
              type="button"
              @click="toggleGroupStatus"
              class="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {{ group.status === 'ACTIVE' ? "Guruhni yakunlash" : "Faollashtirish" }}
            </button>
          </div>
        </form>
      </div>
    </template>

    <!-- ======================================================== -->
    <!-- MODAL: STATISTIKA                                        -->
    <!-- ======================================================== -->
    <Modal :show="showStatsModal" title="Guruh Statistikasi" @close="showStatsModal = false">
      <div v-if="group" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-500">Jami Talabalar</div>
            <div class="text-xl font-extrabold text-slate-900 mt-1">{{ groupStudents.length }} ta</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Maksimal: {{ group.maxStudents || 21 }}</div>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-500">Guruh To'liqligi</div>
            <div class="text-xl font-extrabold text-indigo-600 mt-1">{{ capacityPercent }}%</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Sig'im ko'rsatkichi</div>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-500">Kurs Narxi (Oylik)</div>
            <div class="text-base font-extrabold text-emerald-600 mt-1">{{ formatMoney(group.course?.price) }}</div>
            <div class="text-[10px] text-slate-400 mt-0.5">1 talaba uchun</div>
          </div>

          <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div class="text-[10px] uppercase font-bold text-slate-500">Potentsial Tushum</div>
            <div class="text-base font-extrabold text-indigo-700 mt-1">
              {{ formatMoney((group.course?.price || 0) * groupStudents.length) }}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">Oylik kutilma</div>
          </div>
        </div>

        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-700">Sig'im balansi:</span>
            <span class="font-bold text-slate-900">{{ groupStudents.length }} / {{ group.maxStudents || 21 }} talaba</span>
          </div>
          <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="capacityPercent >= 90 ? 'bg-rose-500' : capacityPercent >= 60 ? 'bg-indigo-600' : 'bg-emerald-500'"
              :style="{ width: `${capacityPercent}%` }"
            ></div>
          </div>
        </div>

        <div class="flex justify-end pt-3 border-t border-slate-100">
          <button
            @click="showStatsModal = false"
            type="button"
            class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>

    <!-- MODAL: ADD STUDENT TO GROUP -->
    <Modal :show="showAddStudentModal" title="Guruhga talaba qo'shish" @close="showAddStudentModal = false">
      <form @submit.prevent="handleAddStudent" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Talabani tanlang</label>
          <select
            v-model="selectedStudentId"
            required
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
          >
            <option value="" disabled>Talabani tanlang...</option>
            <option v-for="s in availableStudentsToEnroll" :key="s.id" :value="s.id">
              {{ s.firstName }} {{ s.lastName }} ({{ s.phone }})
            </option>
          </select>
          <p v-if="availableStudentsToEnroll.length === 0" class="text-[11px] text-amber-600 mt-1">
            Barcha talabalar allaqachon biriktirilgan.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showAddStudentModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isAddingStudent || !selectedStudentId"
            class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            {{ isAddingStudent ? "Qo'shilmoqda..." : "Guruhga Qo'shish" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: QUICK PAYMENT FOR STUDENT -->
    <Modal :show="showPaymentModal" title="Guruh talabasi to'lovi" @close="showPaymentModal = false">
      <form @submit.prevent="handleCreatePayment" class="space-y-4">
        <div v-if="payStudent" class="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
          <span class="text-xs font-bold text-slate-900">{{ payStudent.firstName }} {{ payStudent.lastName }}</span>
          <span class="text-[11px] font-mono text-slate-500">{{ payStudent.phone }}</span>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-bold text-slate-700">To'lov Summasi (so'm)</label>
            <span v-if="payAmount" class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {{ formatMoney(payAmount) }}
            </span>
          </div>
          <input
            v-model.number="payAmount"
            type="number"
            min="0"
            step="any"
            required
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">To'lov Usuli</label>
            <select
              v-model="payType"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
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
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
            >
              <option value="PAID">To'langan</option>
              <option value="PENDING">Kutilmoqda</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Qaysi oy uchun</label>
          <input
            v-model="payPaidForDate"
            type="date"
            required
            class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none bg-white"
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
            class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {{ isSubmittingPayment ? "Kiritilmoqda..." : "To'lovni Kiritish" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: ADD VIDEO (SCREENSHOT 5) -->
    <Modal :show="showAddVideoModal" title="Qo'shish" @close="showAddVideoModal = false">
      <div class="space-y-6">
        <!-- Hidden input for file picking -->
        <input
          ref="videoFileInputRef"
          type="file"
          accept=".mp4,.webm,.mpeg,.avi,.mkv,.m4v,.ogm,.mov,video/*"
          multiple
          class="hidden"
          @change="handleVideoFileSelect"
        />

        <!-- Big Dashed Upload Dropzone Matching Screenshot 5 -->
        <div
          @click="triggerVideoFileInput"
          class="border-2 border-dashed border-emerald-300 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-emerald-50/20 hover:bg-emerald-50/40 transition cursor-pointer select-none group"
        >
          <!-- Green Padlock / Folder icon as in Screenshot 5 -->
          <div class="w-14 h-14 rounded-2xl bg-white border border-emerald-200 shadow-2xs flex items-center justify-center text-[#00B533] mb-4 group-hover:scale-105 transition-transform">
            <svg class="w-7 h-7 text-[#00B533]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              <line x1="12" y1="15" x2="12" y2="18"></line>
              <line x1="10.5" y1="16.5" x2="13.5" y2="16.5"></line>
            </svg>
          </div>

          <p class="text-sm font-bold text-slate-800 max-w-lg mb-2">
            Videofaylni yuklash uchun ushbu hudud ustiga bosing yoki faylni shu yerga olib keling
          </p>
          <p class="text-[11px] text-slate-400 font-medium">
            Videofayl: .mp4, .webm, .mpeg, .avi, .mkv, .m4v, .ogm, .mov formatlaridan birida bo'lishi kerak
          </p>
        </div>

        <!-- Pending Uploads Table (Matching Screenshot 5) -->
        <div v-if="pendingVideoUploads.length > 0" class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th class="py-3 px-4">File name</th>
                <th class="py-3 px-4">
                  <span class="text-rose-500">*</span> Dars
                </th>
                <th class="py-3 px-4">
                  <span class="text-rose-500">*</span> Video nomi
                </th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(item, idx) in pendingVideoUploads" :key="idx" class="bg-white">
                <td class="py-3 px-4 font-medium text-slate-700 max-w-37.5 truncate" :title="item.fileName">
                  {{ item.fileName }}
                </td>
                <td class="py-3 px-4">
                  <select
                    v-model="item.lessonTopic"
                    class="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00B533] bg-white cursor-pointer"
                  >
                    <option
                      v-for="l in (group?.lessons || [{ id: 1, topic: 'erp loyihasi' }])"
                      :key="l.id"
                      :value="l.topic"
                    >
                      {{ l.topic }}
                    </option>
                  </select>
                </td>
                <td class="py-3 px-4">
                  <input
                    type="text"
                    v-model="item.videoName"
                    class="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00B533]"
                  />
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    @click="removePendingVideo(idx)"
                    class="p-1 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer Actions (Screenshot 5) -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showAddVideoModal = false"
            class="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            @click="handleUploadVideos"
            :disabled="isUploadingVideos || pendingVideoUploads.length === 0"
            class="px-5 py-2.5 rounded-xl bg-[#00B533] hover:bg-[#009E2C] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {{ isUploadingVideos ? "Yuklanmoqda..." : "Fayllarni yuklash" }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- MODAL: CHECK / GRADE HOMEWORK SUBMISSION (SCREENSHOT 3) -->
    <Modal :show="showStudentGradingModal" title="Vazifani tekshirish" @close="showStudentGradingModal = false">
      <div v-if="currentGradingStudent" class="space-y-5">
        <!-- Student Info Header -->
        <div class="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#6D28D9] text-white font-bold flex items-center justify-center text-sm shadow-2xs">
              {{ currentGradingStudent.studentName?.charAt(0) || 'T' }}
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900">{{ currentGradingStudent.studentName }}</div>
              <div class="text-[11px] text-slate-500 font-medium">{{ currentGradingStudent.studentPhone }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-slate-400 uppercase font-bold">Topshirilgan vaqt</div>
            <div class="text-xs font-bold text-slate-700">{{ currentGradingStudent.submittedAt || "Kutilmoqda" }}</div>
          </div>
        </div>

        <!-- Submission Content / Text / Attached Files -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700">Talaba javobi va sharhi</label>
          <div class="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 min-h-17.5">
            {{ currentGradingStudent.submissionText || "Uyga vazifa to'liq bajarildi va topshirildi." }}
          </div>
        </div>

        <!-- Attached File if any -->
        <div v-if="currentGradingStudent.submissionFile || true" class="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <FileIcon class="h-4 w-4" />
            </div>
            <div>
              <div class="text-xs font-bold text-slate-800">{{ currentGradingStudent.submissionFile || "uyga_vazifa_yechim.zip" }}</div>
              <div class="text-[10px] text-slate-400">1.8 MB • Fayl ilova qilingan</div>
            </div>
          </div>
          <button
            type="button"
            class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Yuklab olish
          </button>
        </div>

        <!-- Grading Inputs: Score & Auto-calculated Coin Badge according to Nyver rules -->
        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1">
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Ball (0 - 100)
              </label>
              <input
                type="number"
                v-model.number="currentGradingScore"
                min="0"
                max="100"
                class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <!-- Nyver Coin Formula Badge -->
            <div class="flex-1">
              <label class="block text-xs font-bold text-slate-700 mb-1">
                Beriladigan Coin (Avtomatik)
              </label>
              <div class="px-3.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between">
                <span class="text-xs font-bold text-amber-900">
                  +{{ computedGradingCoins }} Coin 🪙
                </span>
                <span class="text-[10px] font-semibold text-amber-700">
                  {{ currentGradingScore >= 90 ? "A'lo (90-100)" : currentGradingScore >= 70 ? "Yaxshi (70-89)" : currentGradingScore >= 60 ? "Qoniqarli (60-69)" : "Ball past (<60)" }}
                </span>
              </div>
            </div>
          </div>

          <!-- Teacher Feedback -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">O'qituvchi izohi (Feedback)</label>
            <textarea
              v-model="currentGradingFeedback"
              rows="2"
              placeholder="Talabaga tavsiya yoki izoh yozing..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Decision Buttons -->
        <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="submitStudentGrade('REJECT')"
            :disabled="isSubmittingGrade"
            class="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
          >
            Qaytarish (Rad etish)
          </button>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="showStudentGradingModal = false"
              class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              @click="submitStudentGrade('ACCEPT')"
              :disabled="isSubmittingGrade"
              class="px-5 py-2.5 rounded-xl bg-[#00B533] hover:bg-[#009E2C] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {{ isSubmittingGrade ? "Saqlanmoqda..." : "Qabul qilish va Baholash" }}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- MODAL: EDIT LESSON VIDEO -->
    <Modal :show="showEditVideoModal" title="Dars videosini sozlash" @close="showEditVideoModal = false">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Video havolasi (YouTube yoki MP4)</label>
          <input
            v-model="videoUrlInput"
            type="url"
            placeholder="https://www.youtube.com/embed/..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
          />
          <p class="text-[11px] text-slate-400 mt-1">
            YouTube embed havolasi yoki to'g'ridan-to'g'ri MP4 video manzilini kiriting.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showEditVideoModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            @click="handleSaveLessonVideo"
            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Saqlash
          </button>
        </div>
      </div>
    </Modal>

    <!-- MODAL: COURSE SYLLABUS MANAGEMENT -->
    <Modal :show="showSyllabusModal" title="O'quv rejasini boshqarish va biriktirish" @close="showSyllabusModal = false">
      <div class="space-y-5">
        <div class="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
          <div>
            <div class="text-[11px] text-blue-500 font-medium">Tanlangan kurs</div>
            <div class="text-xs font-bold text-blue-900">{{ group?.course?.name || 'IELTS Intensive' }}</div>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-[11px]">
            {{ courseSyllabusList.length }} ta dars mavzusi
          </span>
        </div>

        <!-- Add New Topic to Course Syllabus -->
        <form @submit.prevent="handleAddSyllabus" class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
          <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus class="h-3.5 w-3.5 text-blue-600" />
            <span>Yangi dars mavzusi qo'shish</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div class="sm:col-span-1">
              <label class="block text-[11px] font-medium text-slate-600 mb-1">Dars raqami</label>
              <input
                v-model="newSyllabusOrder"
                type="number"
                min="1"
                :placeholder="String(courseSyllabusList.length + 1)"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              />
            </div>
            <div class="sm:col-span-3">
              <label class="block text-[11px] font-medium text-slate-600 mb-1">
                <span class="text-rose-500">*</span> Dars mavzusi
              </label>
              <input
                v-model="newSyllabusTopic"
                type="text"
                placeholder="Masalan: Listening Part 1 & Vocabulary..."
                required
                class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-600 mb-1">Tavsif (ixtiyoriy)</label>
            <input
              v-model="newSyllabusDesc"
              type="text"
              placeholder="Mavzu haqida qisqacha ma'lumot..."
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
            />
          </div>

          <div class="flex justify-end pt-1">
            <button
              type="submit"
              :disabled="isSubmittingSyllabus || !newSyllabusTopic"
              class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs flex items-center gap-1.5"
            >
              <Plus class="h-3.5 w-3.5" />
              <span>{{ isSubmittingSyllabus ? "Saqlanmoqda..." : "Rejaga qo'shish" }}</span>
            </button>
          </div>
        </form>

        <!-- Current Syllabus List -->
        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-700">Mavjud darslar ro'yxati</div>
          <div class="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
            <div
              v-for="s in courseSyllabusList"
              :key="s.id"
              class="p-2.5 flex items-center justify-between hover:bg-slate-50 transition text-xs"
            >
              <div class="flex items-center gap-2.5">
                <span class="w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-[11px] flex items-center justify-center border border-blue-100 shrink-0">
                  {{ s.lessonOrder }}
                </span>
                <div>
                  <div class="font-bold text-slate-900">{{ s.topic }}</div>
                  <div v-if="s.description" class="text-[11px] text-slate-400 truncate max-w-sm">
                    {{ s.description }}
                  </div>
                </div>
              </div>
              <span class="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Biriktirilgan
              </span>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="showSyllabusModal = false"
            class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>

    <!-- MODAL: ASSIGN MENTOR TO GROUP -->
    <Modal :show="showAssignMentorModal" title="Guruhga mentor biriktirish" @close="showAssignMentorModal = false">
      <form @submit.prevent="handleAssignMentor" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            <span class="text-rose-500">*</span> O'qituvchini tanlang
          </label>
          <select
            v-model="assignTeacherId"
            required
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none cursor-pointer"
          >
            <option value="" disabled>-- O'qituvchini tanlang --</option>
            <option
              v-for="t in teachers"
              :key="t.id"
              :value="t.id"
            >
              {{ t.firstName }} {{ t.lastName }} ({{ t.phone || t.email }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Guruhdagi roli</label>
          <div class="grid grid-cols-2 gap-3">
            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition text-xs"
              :class="assignIsMain ? 'border-blue-500 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200 text-slate-600'"
            >
              <input
                type="radio"
                :value="true"
                v-model="assignIsMain"
                class="text-blue-600 focus:ring-blue-500"
              />
              <span>Asosiy o'qituvchi (Teacher)</span>
            </label>

            <label
              class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition text-xs"
              :class="!assignIsMain ? 'border-emerald-500 bg-emerald-50/50 font-bold text-emerald-900' : 'border-slate-200 text-slate-600'"
            >
              <input
                type="radio"
                :value="false"
                v-model="assignIsMain"
                class="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Yordamchi mentor (Assistant)</span>
            </label>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showAssignMentorModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingAssignMentor || !assignTeacherId"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingAssignMentor ? "Biriktirilmoqda..." : "Mentor biriktirish" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- ================= SLIDE-OVER RIGHT DRAWER (Guruhni tahrirlash - Matching GroupsView) ================= -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="showEditGroupDrawer"
        @click="showEditGroupDrawer = false"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300"
      ></div>

      <!-- Drawer Panel -->
      <div
        class="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
        :class="showEditGroupDrawer ? 'translate-x-0' : 'translate-x-full'"
      >
        <!-- Drawer Header -->
        <div class="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">
              Guruhni tahrirlash
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              Guruh ma'lumotlarini o'zgartiring.
            </p>
          </div>
          <button
            @click="showEditGroupDrawer = false"
            type="button"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Drawer Body Form -->
        <form @submit.prevent="handleUpdateGroup" class="flex-1 overflow-y-auto p-6 space-y-4">
          <div v-if="editError" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {{ editError }}
          </div>

          <!-- Guruh nomi * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Guruh nomi *</label>
            <input
              v-model="editName"
              type="text"
              required
              placeholder="n27"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
            />
          </div>

          <!-- Kurs * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Kurs *</label>
            <select
              v-model="editCourseId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="" disabled>Kursni tanlang</option>
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>

          <!-- Xona * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Xona *</label>
            <select
              v-model="editRoomId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="" disabled>Xonani tanlang</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <!-- Dars kunlari * (2-Column Checkbox Grid) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Dars kunlari *</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="d in weekDayOptions"
                :key="d.value"
                type="button"
                @click="toggleEditWeekDay(d.value)"
                class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left"
                :class="
                  editWeekDays.includes(d.value)
                    ? 'border-[#6D28D9] bg-violet-50/40 text-[#6D28D9] font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                "
              >
                <div
                  class="w-4 h-4 rounded flex items-center justify-center shrink-0 border"
                  :class="
                    editWeekDays.includes(d.value)
                      ? 'bg-[#6D28D9] border-[#6D28D9] text-white'
                      : 'border-slate-300 bg-white'
                  "
                >
                  <Check v-if="editWeekDays.includes(d.value)" class="h-3 w-3 stroke-3" />
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
              <span class="text-xs font-bold text-[#6D28D9]">{{ editDurationMonths }} oy</span>
            </div>

            <!-- Quick Month Selector Pills -->
            <div class="flex flex-wrap gap-1.5 mb-2">
              <button
                v-for="m in [1, 2, 3, 4, 6, 9, 12]"
                :key="m"
                type="button"
                @click="editDurationMonths = m"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
                :class="editDurationMonths === m ? 'bg-[#6D28D9] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                {{ m }} oy
              </button>
            </div>

            <!-- Calculated Live Info Card -->
            <div class="p-3.5 rounded-xl border border-purple-100 bg-purple-50/50 space-y-1.5 text-xs text-slate-700">
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Haftasiga:</span>
                <span class="font-bold text-slate-900">{{ editDaysPerWeekCount }} kun/hafta</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">1 oydagi darslar soni:</span>
                <span class="font-bold text-[#6D28D9]">{{ editLessonsPerMonthCount }} ta dars</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500 font-medium">Jami darslar soni:</span>
                <span class="font-extrabold text-[#6D28D9]">{{ editTotalCalculatedLessons }} ta dars ({{ editDurationMonths }} oy)</span>
              </div>
              <div class="flex items-center justify-between pt-1 border-t border-purple-100 text-[11px]">
                <span class="text-slate-400 font-medium">Rejalashtirilgan tugash sanasi:</span>
                <span class="font-bold text-slate-700">{{ editCalculatedEndDate }}</span>
              </div>
            </div>
          </div>

          <!-- Bosh o'qituvchi (Mentor) * -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Bosh o'qituvchi (Mentor) *</label>
            <select
              v-model="editTeacherId"
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
              v-model="editAssistantTeacherId"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 cursor-pointer"
            >
              <option value="">-- Assistent biriktirilmagan (Ixtiyoriy) --</option>
              <option v-for="t in teachers" :key="t.id" :value="t.id">
                {{ t.firstName }} {{ t.lastName || '' }} ({{ t.role || 'Ustoz' }})
              </option>
            </select>
          </div>

          <!-- Dars vaqti * & O'quvchilar sig'imi -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">Dars boshlanish vaqti *</label>
              <div class="relative">
                <input
                  v-model="editStartTime"
                  type="time"
                  required
                  class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 font-mono"
                />
                <Clock class="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">O'quvchilar sig'imi</label>
              <input
                v-model.number="editMaxStudents"
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
                v-model="editStartDate"
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
              v-model="editDescription"
              rows="2"
              placeholder="Guruh haqida qo'shimcha ma'lumot (ixtiyoriy)"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 resize-none"
            ></textarea>
          </div>

          <!-- Drawer Footer Buttons -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showEditGroupDrawer = false"
              class="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              :disabled="isSubmittingEdit || !editName"
              class="px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {{ isSubmittingEdit ? "Saqlanmoqda..." : "Saqlash" }}
            </button>
          </div>
        </form>
      </div>
    </Teleport>

    <!-- MODAL: EDIT LESSON DETAILS -->
    <Modal :show="showEditLessonModal" title="Dars ma'lumotlarini tahrirlash" @close="showEditLessonModal = false">
      <form @submit.prevent="handleSaveLessonDetails" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Dars mavzusi *</label>
          <input
            v-model="editLessonTopic"
            type="text"
            required
            placeholder="Masalan: HTML Semantic teglari va tuzilishi"
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Dars matni va tavsifi</label>
          <textarea
            v-model="editLessonDesc"
            rows="4"
            placeholder="Ushbu darsda o'rganiladigan asosiy tushunchalar va amaliy ko'rsatmalar..."
            class="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Video darslik havolasi (YouTube yoki MP4)</label>
          <input
            v-model="editLessonVideoUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
          <p class="text-[11px] text-slate-400 mt-1">
            YouTube havola yoki to'g'ridan-to'g'ri MP4 video manzilini kiriting.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showEditLessonModal = false"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingLessonEdit || !editLessonTopic"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
        {{ isSubmittingLessonEdit ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: ADD EXAM -->
    <Modal :show="showAddExamModal" title="Yangi Imtihon qo'shish" @close="showAddExamModal = false">
      <form @submit.prevent="handleCreateExam" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Imtihon nomi *</label>
          <input
            v-model="newExamTitle"
            type="text"
            required
            placeholder="Masalan: 1-oraliq nazorat"
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Imtihon sanasi *</label>
            <input
              v-model="newExamDate"
              type="date"
              required
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal ball</label>
            <input
              v-model.number="newExamMaxScore"
              type="number"
              min="1"
              max="1000"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" @click="showAddExamModal = false" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingExam || !newExamTitle"
            class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingExam ? "Saqlanmoqda..." : "Imtihon yaratish" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: ADD MATERIAL -->
    <Modal :show="showAddMaterialModal" title="Dars materiali qo'shish" @close="showAddMaterialModal = false">
      <form @submit.prevent="handleSaveNewMaterial" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Material nomi *</label>
          <input
            v-model="newMaterialTitle"
            type="text"
            required
            placeholder="Masalan: Dars taqdimoti yoki Amaliy kod namunalari"
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Dars mavzusi</label>
            <select
              v-model="newMaterialTopic"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9] cursor-pointer"
            >
              <option value="" disabled>Mavzuni tanlang</option>
              <option v-for="l in (group?.lessons || [])" :key="l.id" :value="l.topic">
                {{ l.lessonOrder ? `${l.lessonOrder}. ` : '' }}{{ l.topic }}
              </option>
              <option value="Umumiy dars materiali">Umumiy dars materiali</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Fayl turi</label>
            <select
              v-model="newMaterialType"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9] cursor-pointer"
            >
              <option value="PDF">PDF Hujjat</option>
              <option value="ZIP">ZIP / Kod arxivi</option>
              <option value="SLIDES">Taqdimot (PPTX / Slayd)</option>
              <option value="LINK">Tashqi Havola (GitHub)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Havola yoki Fayl URL manzili</label>
          <input
            v-model="newMaterialUrl"
            type="text"
            placeholder="https://github.com/... yoki resurs havolasi"
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-[#6D28D9]"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" @click="showAddMaterialModal = false" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="!newMaterialTitle"
            class="px-5 py-2 rounded-xl bg-[#00B533] hover:bg-[#009E2C] text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            Materialni saqlash
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: EDIT EXAM -->
    <Modal :show="showEditExamModal" title="Imtihonni tahrirlash" @close="showEditExamModal = false">
      <form @submit.prevent="handleUpdateExam" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Imtihon nomi *</label>
          <input
            v-model="editExamTitle"
            type="text"
            required
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Imtihon sanasi</label>
            <input
              v-model="editExamDate"
              type="date"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal ball</label>
            <input
              v-model.number="editExamMaxScore"
              type="number"
              min="1"
              max="1000"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" @click="showEditExamModal = false" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingExam || !editExamTitle"
            class="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingExam ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: EXAM RESULTS -->
    <Modal :show="showExamResultsModal" :title="examForResults ? `Natijalar: ${examForResults.title}` : 'Imtihon natijalari'" @close="showExamResultsModal = false">
      <div class="space-y-4">
        <p class="text-xs text-slate-500">Har bir talaba uchun ball kiriting (maks: {{ examForResults?.maxScore || 100 }})</p>

        <div class="space-y-2 max-h-72 overflow-y-auto">
          <div v-for="s in groupStudents" :key="s.id" class="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {{ s.firstName?.charAt(0) }}
              </div>
              <span class="font-medium text-slate-900">{{ s.firstName }} {{ s.lastName }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="
                  Number(examResultsMap[s.id] || 0) >= 90
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : Number(examResultsMap[s.id] || 0) >= 70
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : Number(examResultsMap[s.id] || 0) >= 60
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-500'
                "
              >
                {{
                  Number(examResultsMap[s.id] || 0) >= 90
                    ? '+3 🪙'
                    : Number(examResultsMap[s.id] || 0) >= 70
                    ? '+2 🪙'
                    : Number(examResultsMap[s.id] || 0) >= 60
                    ? '+1 🪙'
                    : '0 🪙'
                }}
              </span>
              <input
                v-if="examResultsMap[s.id] !== undefined"
                v-model.number="examResultsMap[s.id]"
                type="number"
                min="0"
                :max="examForResults?.maxScore || 100"
                class="w-20 h-8 text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div v-if="groupStudents.length === 0" class="py-4 text-center text-xs text-slate-400">
            Guruhda talabalar mavjud emas
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" @click="showExamResultsModal = false" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
            Bekor qilish
          </button>
          <button
            type="button"
            @click="handleSaveExamResults"
            :disabled="isSubmittingExamResults"
            class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingExamResults ? "Saqlanmoqda..." : "Natijalarni Saqlash" }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- MODAL: EDIT HOMEWORK -->
    <Modal :show="showEditHomeworkModal" title="Vazifani tahrirlash" @close="showEditHomeworkModal = false">
      <form @submit.prevent="handleUpdateHomework" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Vazifa nomi *</label>
          <input
            v-model="editHwTitle"
            type="text"
            required
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Vazifa tavsifi</label>
          <textarea
            v-model="editHwTask"
            rows="3"
            placeholder="Vazifa topshirig'i batafsil..."
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal ball</label>
          <input
            v-model.number="editHwMaxScore"
            type="number"
            min="1"
            max="100"
            class="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" @click="showEditHomeworkModal = false" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingHwEdit || !editHwTitle"
            class="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingHwEdit ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- MODAL: CHECK & GRADE HOMEWORK (Topshirilgan vazifalarni tekshirish va tangalar berish) -->
    <Modal
      :show="showCheckHomeworkModal"
      :title="gradingHomework ? `Vazifani tekshirish: ${gradingHomework.title}` : 'Uyga vazifani baholash'"
      @close="showCheckHomeworkModal = false"
    >
      <div class="space-y-4">
        <!-- Coin tariff info banner -->
        <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div class="flex items-center gap-2 text-amber-900 font-bold">
            <span>🪙 Tanga berish qoidasi:</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 font-bold text-[11px] text-amber-800">
            <span class="bg-amber-100 px-2 py-0.5 rounded-md">90-100 ball: +3 🪙</span>
            <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">70-89 ball: +2 🪙</span>
            <span class="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">60-69 ball: +1 🪙</span>
          </div>
        </div>

        <!-- Student submission list -->
        <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
          <div
            v-for="s in groupStudents"
            :key="s.id"
            class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full bg-purple-100 text-[#6D28D9] flex items-center justify-center font-bold text-xs shrink-0">
                  {{ s.firstName?.charAt(0) }}
                </div>
                <div>
                  <div class="font-bold text-slate-900">{{ s.firstName }} {{ s.lastName }}</div>
                  <div class="text-[11px] text-slate-500">Mavjud balans: <span class="font-bold text-amber-600">{{ s.coins || 0 }} 🪙</span></div>
                </div>
              </div>

              <!-- Live Coin Badge & Score Input -->
              <div class="flex items-center gap-2">
                <span
                  v-if="homeworkGradesMap[s.id]"
                  class="px-2.5 py-1 rounded-full text-[11px] font-bold"
                  :class="
                    Number(homeworkGradesMap[s.id].score) >= 90
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : Number(homeworkGradesMap[s.id].score) >= 70
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : Number(homeworkGradesMap[s.id].score) >= 60
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  "
                >
                  {{
                    Number(homeworkGradesMap[s.id].score) >= 90
                      ? '+3 🪙 Tanga'
                      : Number(homeworkGradesMap[s.id].score) >= 70
                      ? '+2 🪙 Tanga'
                      : Number(homeworkGradesMap[s.id].score) >= 60
                      ? '+1 🪙 Tanga'
                      : '0 🪙'
                  }}
                </span>

                <div class="flex items-center gap-1">
                  <input
                    v-if="homeworkGradesMap[s.id]"
                    v-model.number="homeworkGradesMap[s.id].score"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Ball"
                    class="w-16 h-8 text-center text-xs font-bold bg-white border border-slate-300 rounded-lg focus:border-[#6D28D9] focus:outline-none shadow-2xs"
                  />
                  <span class="text-slate-400 font-bold text-xs">/100</span>
                </div>
              </div>
            </div>

            <!-- Feedback / Izoh input -->
            <div v-if="homeworkGradesMap[s.id]">
              <input
                v-model="homeworkGradesMap[s.id].feedback"
                type="text"
                placeholder="Ustoz izohi va tahlili (masalan: Kod toza, ammo reaktivlik to'g'ri qo'llanilishi kerak)..."
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder-slate-400 focus:outline-none focus:border-[#6D28D9]"
              />
            </div>
          </div>

          <div v-if="groupStudents.length === 0" class="py-6 text-center text-xs text-slate-400">
            Guruhda o'quvchilar mavjud emas
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showCheckHomeworkModal = false"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            @click="handleSaveHomeworkGrades"
            :disabled="isSavingHomeworkGrades"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 class="h-4 w-4" />
            <span>{{ isSavingHomeworkGrades ? "Saqlanmoqda..." : "Baholash va Tangalarni berish" }}</span>
          </button>
        </div>
      </div>
    </Modal>

    <!-- MODAL: WATCH VIDEO -->
    <Modal :show="showWatchVideoModal" :title="currentWatchVideo ? `Video dars: ${currentWatchVideo.title || currentWatchVideo.topic}` : 'Video darslik'" @close="showWatchVideoModal = false">
      <div class="space-y-4">
        <div v-if="currentWatchVideo?.videoUrl" class="w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <iframe
            v-if="currentWatchVideo.videoUrl.includes('youtube.com') || currentWatchVideo.videoUrl.includes('youtu.be')"
            :src="getEmbedUrl(currentWatchVideo.videoUrl)"
            class="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
          <video
            v-else
            :src="currentWatchVideo.videoUrl"
            controls
            class="w-full h-full object-contain"
          ></video>
        </div>
        <div v-else class="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
          Ushbu darslik uchun video havola biriktirilmagan.
        </div>

        <div v-if="currentWatchVideo?.description" class="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
          <span class="font-bold text-slate-800">Tavsif: </span>{{ currentWatchVideo.description }}
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <a
            v-if="currentWatchVideo?.videoUrl"
            :href="currentWatchVideo.videoUrl"
            target="_blank"
            class="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9] hover:underline"
          >
            <ExternalLink class="h-3.5 w-3.5" />
            <span>Brauzerda alohida ochish</span>
          </a>
          <div v-else></div>

          <button
            type="button"
            @click="showWatchVideoModal = false"
            class="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
