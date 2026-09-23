<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { User, Course, Room, PaymentType, PaymentStatus, AttendanceStatus } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  ArrowLeft,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Search,
  ExternalLink,
  BarChart3,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Award,
  Sparkles,
  Send,
  FileText,
  Download,
  Video,
  HelpCircle,
  BookOpen,
  Calendar,
  Phone,
  Mail,
  Building2,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const groupId = computed(() => Number(route.params.id));
const loading = ref(true);
const group = ref<any>(null);
const allStudents = ref<User[]>([]);
const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const teachers = ref<User[]>([]);

// Tabs matching screenshot: Ma'lumotlar, Guruh darsliklari, Akademik davomati, Sozlamalar
const activeTab = ref<'OVERVIEW' | 'LESSONS' | 'ATTENDANCE' | 'SETTINGS'>('OVERVIEW');
const studentSearch = ref('');
const showStatsModal = ref(false);

// Modals
const showAddStudentModal = ref(false);
const selectedStudentId = ref<number | ''>('');
const isAddingStudent = ref(false);

const showEditGroupModal = ref(false);
const editName = ref('');
const editCourseId = ref<number | string>('');
const editRoomId = ref<number | string>('');
const editTeacherId = ref<number | string>('');
const editStartTime = ref('');
const editEndTime = ref('');
const editMaxStudents = ref(15);
const isSubmittingEdit = ref(false);

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
  formattedDate: string;
  lessonOrder: number;
  lessonId?: number;
  topic: string;
  description?: string;
  videoUrl?: string;
  isHeld: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean; // Saturday (6) or Sunday (0)
}

interface StudyMonth {
  index: number;
  title: string;
  isCurrent: boolean;
  monthName: string;
  days: StudyDay[];
}

const showMoreSchedules = ref(false);
const activeStudyMonthIndex = ref(0);
const showAllMonths = ref(false);
const selectedLessonDay = ref<StudyDay | null>(null);
const activeMentorRole = ref<'TEACHER' | 'ASSISTANT'>('TEACHER');
const topicMode = ref<'CURRICULUM' | 'CUSTOM'>('CURRICULUM');
const selectedSyllabusId = ref<number | ''>('');
const lessonTopicInput = ref('');
const lessonDescInput = ref('');
const lessonAttendanceMap = ref<Record<number, boolean>>({});
const isSavingAttendance = ref(false);

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

// Generate dynamic study months matching group weekdays and schedule
const studyMonths = computed<StudyMonth[]>(() => {
  const result: StudyMonth[] = [];
  const duration = Math.max(1, group.value?.course?.durationMonths || 6);

  function generateDaysRange(year: number, startM: number, startD: number, endM: number, endD: number) {
    const days: { m: number; d: number }[] = [];
    const cur = new Date(year, startM, startD);
    const end = new Date(year, endM, endD);
    while (cur <= end) {
      days.push({ m: cur.getMonth(), d: cur.getDate() });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }

  // Month configurations including all consecutive days (with Saturday and Sunday)
  const baseYear = 2026;
  const monthConfigs = [
    {
      title: "1-o'quv oyi",
      monthName: "Yanvar - Fevral",
      isCurrent: false,
      days: generateDaysRange(baseYear, 0, 28, 1, 28), // Jan 28 to Feb 28: includes all Saturdays and Sundays
    },
    {
      title: "2-o'quv oyi",
      monthName: "Iyun",
      isCurrent: false,
      days: generateDaysRange(baseYear, 5, 1, 5, 30), // June 1 to June 30: includes all Saturdays and Sundays
    },
    {
      title: "3-o'quv oyi",
      monthName: "Iyul",
      isCurrent: false,
      days: generateDaysRange(baseYear, 6, 1, 6, 31), // July 1 to July 31: includes all Saturdays and Sundays
    },
    {
      title: "4-o'quv oyi",
      monthName: "Avgust",
      isCurrent: false,
      days: generateDaysRange(baseYear, 7, 1, 7, 31), // August 1 to August 31: includes all Saturdays and Sundays
    },
    {
      title: "5-o'quv oyi",
      monthName: "Sentabr",
      isCurrent: true, // "Joriy oy"
      days: generateDaysRange(baseYear, 8, 1, 8, 30), // September 1 to September 30: includes all Saturdays and Sundays
    },
    {
      title: "6-o'quv oyi",
      monthName: "Oktabr",
      isCurrent: false,
      days: generateDaysRange(baseYear, 9, 1, 9, 31), // October 1 to October 31: includes all Saturdays and Sundays
    },
  ];

  let cumulativeOrder = 1;
  const existingLessons = group.value?.lessons || [];

  for (let idx = 0; idx < Math.min(duration, monthConfigs.length); idx++) {
    const cfg = monthConfigs[idx];
    const studyDays: StudyDay[] = [];

    for (const item of cfg.days) {
      const dObj = new Date(baseYear, item.m, item.d);
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dObj.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const formattedDate = `${yyyy} M${mm} ${dObj.getDate()}`;

      const isPast = idx < 4 || (idx === 4 && item.d < 2);
      const isToday = idx === 4 && item.d === 2;
      const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;

      let lessonOrderNum = cumulativeOrder;
      let defaultTopic = '';

      if (isWeekend) {
        defaultTopic = dObj.getDay() === 6 ? "Dam olish kuni (Shanba)" : "Dam olish kuni (Yakshanba)";
      } else {
        lessonOrderNum = cumulativeOrder++;
        defaultTopic = `${lessonOrderNum}-dars: O'quv mavzusi`;
      }

      // Match existing lesson from DB
      const existing = existingLessons.find(
        (l: any) => l.lessonDate?.slice(0, 10) === dateStr || (!isWeekend && l.lessonOrder === lessonOrderNum)
      );

      studyDays.push({
        date: dObj,
        dateStr,
        monthShort: monthNamesShortEn[item.m],
        dayNum: item.d,
        formattedDate,
        lessonOrder: lessonOrderNum,
        lessonId: existing?.id,
        topic: existing?.topic || defaultTopic,
        description: existing?.description || '',
        videoUrl: existing?.videoUrl || '',
        isHeld: existing?.status === 'ACTIVE' || isPast,
        isToday,
        isPast,
        isWeekend,
      });
    }

    result.push({
      index: idx,
      title: cfg.title,
      isCurrent: cfg.isCurrent,
      monthName: cfg.monthName,
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

function selectLessonDay(day: StudyDay, monthIndex?: number) {
  selectedLessonDay.value = day;
  if (monthIndex !== undefined) {
    activeStudyMonthIndex.value = monthIndex;
  }

  const existingLesson = group.value?.lessons?.find(
    (l: any) => l.id === day.lessonId || l.lessonOrder === day.lessonOrder
  );

  if (existingLesson) {
    day.lessonId = existingLesson.id;
    day.topic = existingLesson.topic || day.topic;
    day.description = existingLesson.description || existingLesson.content || day.description || '';
    day.videoUrl = existingLesson.videoUrl || day.videoUrl || '';
    lessonTopicInput.value = existingLesson.topic;
    lessonDescInput.value = existingLesson.description || existingLesson.content || '';
    selectedLessonVideoUrl.value = existingLesson.videoUrl || '';
  } else {
    const matchSyl = courseSyllabusList.value.find((s) => s.lessonOrder === day.lessonOrder);
    if (matchSyl) {
      selectedSyllabusId.value = matchSyl.id;
      lessonTopicInput.value = `${matchSyl.lessonOrder}-dars: ${matchSyl.topic}`;
      lessonDescInput.value = matchSyl.description || '';
    } else {
      selectedSyllabusId.value = '';
      lessonTopicInput.value = day.topic || `${day.lessonOrder}-dars: O'quv mavzusi`;
      lessonDescInput.value = day.description || '';
    }
    selectedLessonVideoUrl.value = day.videoUrl || '';
  }
  videoUrlInput.value = selectedLessonVideoUrl.value;

  // Initialize attendance & scores map for students
  const scoreMap: Record<number, StudentGradeState> = {};
  const attMap: Record<number, boolean> = {};

  for (const s of groupStudents.value) {
    attMap[s.id] = day.isHeld;
    scoreMap[s.id] = {
      status: day.isHeld ? 'PRESENT' : 'PRESENT',
      score: day.isHeld ? 90 : 85,
      coins: day.isHeld ? 2 : 2,
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
      score: status === 'PRESENT' ? 85 : 0,
      coins: status === 'PRESENT' ? 2 : 0,
      note: '',
    };
  } else {
    lessonScoresMap.value[studentId].status = status;
    if (status === 'ABSENT') {
      lessonScoresMap.value[studentId].score = 0;
      lessonScoresMap.value[studentId].coins = 0;
    } else if (status === 'PRESENT' && lessonScoresMap.value[studentId].score === 0) {
      lessonScoresMap.value[studentId].score = 85;
      lessonScoresMap.value[studentId].coins = 2;
    }
  }
  lessonAttendanceMap.value[studentId] = status === 'PRESENT' || status === 'LATE';
}

function markAllStudentsPresent() {
  for (const s of groupStudents.value) {
    setStudentStatus(s.id, 'PRESENT');
  }
}

function navigateToLesson(day: StudyDay, monthIndex?: number) {
  selectLessonDay(day, monthIndex);
  activeTab.value = 'LESSONS';
}

function toggleStudentAttendance(studentId: number) {
  lessonAttendanceMap.value[studentId] = !lessonAttendanceMap.value[studentId];
  const newStatus: AttendanceStatus = lessonAttendanceMap.value[studentId] ? 'PRESENT' : 'ABSENT';
  setStudentStatus(studentId, newStatus);
}

async function handleSaveLessonAttendance() {
  await handleSaveLessonAttendanceAndGrades();
}

async function handleSaveLessonAttendanceAndGrades() {
  if (!selectedLessonDay.value) return;
  isSavingAttendance.value = true;
  try {
    let lessonId = selectedLessonDay.value.lessonId;

    if (!lessonId) {
      const created = await erpService.createLesson({
        groupId: groupId.value,
        lessonOrder: selectedLessonDay.value.lessonOrder,
        topic: lessonTopicInput.value || `${selectedLessonDay.value.lessonOrder}-dars`,
        description: lessonDescInput.value,
        videoUrl: selectedLessonVideoUrl.value || undefined,
        lessonDate: selectedLessonDay.value.dateStr,
        teacherId: groupMentor.value?.id,
        roomId: group.value?.roomId,
      });
      lessonId = created.id;
      selectedLessonDay.value.lessonId = lessonId;
    } else {
      await erpService.updateLesson(lessonId, {
        topic: lessonTopicInput.value,
        description: lessonDescInput.value,
        videoUrl: selectedLessonVideoUrl.value || undefined,
      });
    }

    if (groupStudents.value.length > 0 && lessonId) {
      const records = groupStudents.value.map((s: any) => {
        const item = lessonScoresMap.value[s.id] || {
          status: lessonAttendanceMap.value[s.id] ? 'PRESENT' : 'ABSENT',
          score: 85,
          coins: 2,
          note: '',
        };
        return {
          studentId: s.id,
          status: item.status,
          coinsEarned: Number(item.coins) || (item.status === 'PRESENT' ? 2 : 0),
          note: item.note ? `${item.note} (Ball: ${item.score})` : `Dars bali: ${item.score}`,
        };
      });
      await erpService.saveAttendance(lessonId, records as any);
    }

    selectedLessonDay.value.isHeld = true;
    selectedLessonDay.value.topic = lessonTopicInput.value;
    selectedLessonDay.value.description = lessonDescInput.value;
    selectedLessonDay.value.videoUrl = selectedLessonVideoUrl.value;

    showFeedback("Dars mavzusi, talabalar davomati va ballari muvaffaqiyatli saqlandi!");
    await loadGroupData();
  } catch (err: any) {
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
      lessonId = created.id;
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
    await loadGroupData();
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
      lessonId = created.id;
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
// 2. GURUH DARSLIKLARI TAB (SCREENSHOT 5)
// ========================================================
const materialsSubTab = ref<'HOMEWORK' | 'VIDEOS' | 'EXAMS' | 'JOURNAL'>('HOMEWORK');
const homeworkList = ref<any[]>([
  {
    id: 1,
    title: 'nvhgvcgh',
    studentsCount: 1,
    pendingCount: 0,
    completedCount: 0,
    assignedAt: '27 Aug, 2026 11:14',
    deadline: '28 Aug, 2026 07:14',
    lessonDate: '28 Aug, 2026',
  },
  {
    id: 2,
    title: 'nvhgvcgh',
    studentsCount: 1,
    pendingCount: 0,
    completedCount: 0,
    assignedAt: '27 Aug, 2026 11:19',
    deadline: '28 Aug, 2026 07:19',
    lessonDate: '28 Aug, 2026',
  },
]);

const showAddMaterialModal = ref(false);
const newHwTitle = ref('');
const newHwTask = ref('');
const newHwDeadline = ref('2026-09-25T18:00');
const newHwLessonDate = ref(new Date().toISOString().slice(0, 10));
const newHwMaxScore = ref(100);
const newHwCoins = ref(5);
const isSubmittingHomework = ref(false);

async function loadGroupHomeworks() {
  try {
    const list = await erpService.getHomeworks({ groupId: groupId.value });
    if (list && list.length > 0) {
      const formatted = list.map((hw: any) => ({
        id: hw.id,
        title: hw.title,
        task: hw.task || hw.title,
        maxScore: hw.maxScore || 100,
        maxCoins: hw.maxCoins || 5,
        studentsCount: groupStudents.value.length || 1,
        pendingCount: 0,
        completedCount: hw._count?.submissions || 0,
        assignedAt: formatDate(hw.created_at) + ' 11:14',
        deadline: hw.deadline ? formatDate(hw.deadline) + ' 18:00' : '28 Aug, 2026 07:14',
        lessonDate: hw.lesson?.lessonDate ? formatDate(hw.lesson.lessonDate) : '28 Aug, 2026',
      }));
      homeworkList.value = formatted;
    }
  } catch (err) {
    console.warn('Vazifalarni yuklashda xatolik:', err);
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

async function handleCreateHomework() {
  if (!newHwTitle.value) return;
  isSubmittingHomework.value = true;
  try {
    let targetLessonId = group.value?.lessons?.[0]?.id;
    if (!targetLessonId) {
      const newL = await erpService.createLesson({
        groupId: groupId.value,
        lessonOrder: 1,
        topic: newHwTitle.value,
        lessonDate: newHwLessonDate.value,
      });
      targetLessonId = newL.id;
    }

    const created = await erpService.createHomework({
      title: newHwTitle.value,
      task: newHwTask.value || newHwTitle.value,
      lessonId: targetLessonId,
      maxScore: newHwMaxScore.value,
      maxCoins: newHwCoins.value,
      deadline: new Date(newHwDeadline.value).toISOString(),
    });

    homeworkList.value.unshift({
      id: created.id,
      title: created.title,
      studentsCount: groupStudents.value.length || 1,
      pendingCount: 0,
      completedCount: 0,
      assignedAt: 'Bugun 11:14',
      deadline: newHwDeadline.value.replace('T', ' '),
      lessonDate: newHwLessonDate.value,
    });

    showFeedback("Yangi vazifa muvaffaqiyatli qo'shildi!");
    showAddMaterialModal.value = false;
    newHwTitle.value = '';
    newHwTask.value = '';
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Vazifa yaratishda xatolik', 'error');
  } finally {
    isSubmittingHomework.value = false;
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
        selectLessonDay(match, mIdx);
        return;
      }
    }
  }

  // If on LESSONS tab and no day selected yet, select first day
  if (activeTab.value === 'LESSONS' && !selectedLessonDay.value && studyMonths.value.length > 0) {
    const firstMonth = studyMonths.value[activeStudyMonthIndex.value] || studyMonths.value[0];
    if (firstMonth?.days.length > 0) {
      selectLessonDay(firstMonth.days[0], activeStudyMonthIndex.value);
    }
  }
}

watch(
  () => route.query,
  () => {
    handleQueryNavigation();
  }
);

watch(activeTab, (newTab) => {
  if (newTab === 'LESSONS' && !selectedLessonDay.value && studyMonths.value.length > 0) {
    const curMonth = studyMonths.value[activeStudyMonthIndex.value] || studyMonths.value[0];
    if (curMonth?.days.length > 0) {
      selectLessonDay(curMonth.days[0], activeStudyMonthIndex.value);
    }
  }
});

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

const groupMentor = computed<User | null>(() => {
  if (!group.value || !group.value.teachers || group.value.teachers.length === 0) {
    return null;
  }
  const t = group.value.teachers[0].teacher || group.value.teachers[0];
  return t || null;
});

const groupTeacherName = computed(() => {
  if (!groupMentor.value) return 'Oybek';
  return `${groupMentor.value.firstName} ${groupMentor.value.lastName}`;
});

const mainMentor = computed<any>(() => {
  if (!group.value || !group.value.teachers || group.value.teachers.length === 0) {
    return {
      firstName: 'Oybek',
      lastName: '',
      phone: '+998 90 123 45 67',
      email: 'oybek@nyver.uz',
      role: 'TEACHER',
    };
  }
  const found = group.value.teachers.find((gt: any) => gt.isMain) || group.value.teachers[0];
  return found?.teacher || found;
});

const assistantMentor = computed<any>(() => {
  if (!group.value || !group.value.teachers || group.value.teachers.length < 2) {
    return {
      firstName: 'Barchinoy',
      lastName: 'Yusupova',
      phone: '+998 93 111 22 33',
      email: 'barchinoy@nyver.uz',
      role: 'ASSISTANT',
    };
  }
  const found = group.value.teachers.find((gt: any) => !gt.isMain);
  return found?.teacher || found;
});

const courseSyllabusList = computed<any[]>(() => {
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
  editEndTime.value = group.value.endTime || '16:00';
  editMaxStudents.value = group.value.maxStudents || 15;
  const mainTeacher = group.value.teachers?.find((gt: any) => gt.isMain)?.teacher || group.value.teachers?.[0]?.teacher;
  editTeacherId.value = mainTeacher?.id || '';
  showEditGroupModal.value = true;
}

async function handleUpdateGroup() {
  if (!group.value) return;
  isSubmittingEdit.value = true;
  try {
    await erpService.updateGroup(group.value.id, {
      name: editName.value,
      courseId: Number(editCourseId.value),
      roomId: Number(editRoomId.value),
      teacherId: editTeacherId.value ? Number(editTeacherId.value) : undefined,
      startTime: editStartTime.value,
      endTime: editEndTime.value,
      maxStudents: Number(editMaxStudents.value),
    });
    showFeedback("Guruh ma'lumotlari muvaffaqiyatli yangilandi");
    showEditGroupModal.value = false;
    await loadGroupData();
  } catch (err: any) {
    showFeedback(err.response?.data?.message || 'Guruhni tahrirlashda xatolik', 'error');
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
    showFeedback('Imtihon natijalari saqlandi!');
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
        @click="router.push('/dashboard/groups')"
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
            @click="router.push('/dashboard/groups')"
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
      <!-- 2. TABS BAR (MATCHING SCREENSHOT)                       -->
      <!-- ======================================================== -->
      <div class="border-b border-slate-200">
        <nav class="flex space-x-8 -mb-px">
          <button
            @click="activeTab = 'OVERVIEW'"
            type="button"
            class="py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'OVERVIEW'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Ma'lumotlar
          </button>

          <button
            @click="activeTab = 'LESSONS'"
            type="button"
            class="py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'LESSONS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Guruh darsliklari
          </button>

          <button
            @click="activeTab = 'ATTENDANCE'"
            type="button"
            class="py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'ATTENDANCE'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Akademik davomati ({{ groupStudents.length }})
          </button>

          <button
            @click="activeTab = 'SETTINGS'"
            type="button"
            class="py-3 px-1 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
            :class="
              activeTab === 'SETTINGS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            "
          >
            Sozlamalar
          </button>
        </nav>
      </div>

      <!-- ======================================================== -->
      <!-- 3. TAB 1: MA'LUMOTLAR                                    -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'OVERVIEW'" class="space-y-6">
        <!-- Top Row: Guruh mentorlari & Parametrlar (Side-by-Side Cards) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left Card: Guruh mentorlari -->
          <div class="rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden bg-white flex flex-col justify-between">
            <div class="bg-blue-600 px-5 py-3.5 flex items-center justify-between text-white font-bold text-sm">
              <div class="flex items-center gap-2">
                <Users class="h-4 w-4" />
                <span>Guruh mentorlari</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="showAssignMentorModal = true"
                  class="text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Mentor biriktirish"
                >
                  <Plus class="h-3.5 w-3.5" />
                  <span>Biriktirish</span>
                </button>
                <button
                  type="button"
                  @click="openEditGroupModal()"
                  class="text-white/80 hover:text-white transition cursor-pointer p-1"
                  title="Tahrirlash"
                >
                  <Edit2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div class="p-5 space-y-4 flex-1">
              <!-- Mentors List: all assigned teachers -->
              <div class="space-y-3">
                <div
                  v-for="gt in (group.teachers || [])"
                  :key="gt.id || gt.teacherId"
                  class="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-start gap-3 min-w-0">
                      <div class="w-11 h-11 rounded-full bg-blue-100 border-2 border-blue-200 overflow-hidden flex items-center justify-center text-blue-700 text-lg font-bold shadow-2xs shrink-0">
                        <img
                          v-if="(gt.teacher || gt)?.photo"
                          :src="(gt.teacher || gt).photo"
                          :alt="(gt.teacher || gt)?.firstName"
                          class="w-full h-full object-cover"
                        />
                        <span v-else>{{ ((gt.teacher || gt)?.firstName || '?').charAt(0) }}</span>
                      </div>
                      <div class="min-w-0">
                        <span
                          class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                          :class="gt.isMain ? 'text-emerald-700 bg-emerald-100/80' : 'text-blue-700 bg-blue-100/80'"
                        >
                          {{ gt.isMain ? 'Teacher' : 'Assistant' }}
                        </span>
                        <div class="text-sm font-bold text-slate-900 mt-1 truncate">
                          {{ (gt.teacher || gt)?.firstName }} {{ (gt.teacher || gt)?.lastName || '' }}
                        </div>
                        <div class="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-1 truncate">
                          <Phone class="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{{ (gt.teacher || gt)?.phone || '-' }}</span>
                        </div>
                        <div class="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                          <Mail class="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{{ (gt.teacher || gt)?.email || '-' }}</span>
                        </div>
                      </div>
                    </div>
                    <!-- Remove Mentor Button (admin only) -->
                    <button
                      v-if="authStore.isAdmin || authStore.user?.role === 'SUPERADMIN'"
                      type="button"
                      @click="handleRemoveMentor((gt.teacher || gt)?.id || gt.teacherId, `${(gt.teacher || gt)?.firstName} ${(gt.teacher || gt)?.lastName || ''}`)"
                      class="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                      title="Mentorni guruhdan olib tashlash"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <!-- Empty state -->
                <div v-if="!group.teachers || group.teachers.length === 0" class="py-4 text-center text-xs text-slate-400">
                  Guruhga hali mentor biriktirilmagan
                </div>
              </div>

              <!-- Quick Workload & Syllabus Info Strip -->
              <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <div class="flex items-center gap-1.5">
                  <BookOpen class="h-3.5 w-3.5 text-blue-600" />
                  <span>O'quv rejasi:</span>
                  <span class="font-bold text-slate-900">{{ courseSyllabusList.length }} ta mavzu</span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="showSyllabusModal = true"
                    class="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus class="h-3 w-3" />
                    <span>Reja qo'shish</span>
                  </button>
                  <span class="text-slate-300">|</span>
                  <button
                    type="button"
                    @click="showAssignMentorModal = true"
                    class="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus class="h-3 w-3" />
                    <span>Mentor biriktirish</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Card: Parametrlar -->
          <div class="rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden bg-white">
            <div class="bg-blue-600 px-5 py-3.5 flex items-center justify-between text-white font-bold text-sm">
              <span>Parametrlar</span>
              <button
                type="button"
                @click="openEditGroupModal()"
                class="text-white/80 hover:text-white transition cursor-pointer p-1"
                title="Tahrirlash"
              >
                <Edit2 class="h-3.5 w-3.5" />
              </button>
            </div>

            <div class="p-5 divide-y divide-slate-100 text-xs">
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Kurs:</span>
                <span class="font-bold text-slate-900">{{ group.course?.name || 'IELTS Intensive (Band 7.5+)' }}</span>
              </div>
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">O'rta yosh:</span>
                <span class="font-bold text-slate-900">{{ averageAge }}</span>
              </div>
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">O'quvchilar sig'imi:</span>
                <span class="font-bold text-slate-900">{{ group.maxStudents || 18 }}</span>
              </div>
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Mavjud o'quvchilar:</span>
                <span class="font-bold text-slate-900">{{ groupStudents.length }}</span>
              </div>
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">O'quv oyidagi darslar soni:</span>
                <span class="font-bold text-slate-900">{{ group.course?.lessonsPerMonth || 12 }}</span>
              </div>
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Kurs davomiyligi (oy):</span>
                <span class="font-bold text-slate-900">{{ group.course?.durationMonths || 3 }}</span>
              </div>
              <div class="py-2.5 flex items-center justify-between">
                <span class="text-slate-500 font-medium">Jami darslar soni:</span>
                <span class="font-bold text-slate-900">{{ group.course?.totalLessons || group.lessons?.length || 36 }}</span>
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
                  @click="navigateToLesson(currentStudyMonth?.days[0] || studyMonths[0]?.days[0], activeStudyMonthIndex)"
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
                      {{ group.room?.name || 'Xona #201 (Linguistics Hall)' }} // {{ group.room?.capacity || group.maxStudents || 20 }}
                    </span>
                  </td>
                </tr>

                <!-- Teacher 2 (Assistant Teacher) -->
                <tr
                  v-if="showMoreSchedules"
                  @click="navigateToLesson(currentStudyMonth?.days[0] || studyMonths[0]?.days[0], activeStudyMonthIndex)"
                  class="hover:bg-blue-50/40 transition cursor-pointer group"
                >
                  <td class="py-3.5 px-4 font-bold text-blue-600 group-hover:underline">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {{ (assistantMentor?.firstName || 'B').charAt(0) }}
                      </div>
                      <span>+++{{ assistantMentor?.lastName }} {{ assistantMentor?.firstName }}</span>
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
                      08:00 dan - 09:30 gacha
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-medium text-slate-600">
                    {{ formatUzbekDate(group.startDate) }} - {{ group.endDate ? formatUzbekDate(group.endDate) : '27 Iyun, 2026' }}
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-700">
                    <span class="inline-flex items-center gap-1.5 text-slate-600">
                      <Building2 class="h-3.5 w-3.5 text-slate-400" />
                      {{ group.room?.name || 'Xona #201 (Linguistics Hall)' }} // {{ group.room?.capacity || group.maxStudents || 20 }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Caption & Toggle Button -->
          <div class="flex flex-col items-center gap-2 pt-1 pb-2">
            <span class="text-[11px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60 select-none">
              Guruh ustiga bosilganda ochiladi davomi pastda
            </span>

            <button
              @click="showMoreSchedules = !showMoreSchedules"
              type="button"
              class="px-4 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 shadow-2xs transition cursor-pointer active:scale-95"
            >
              {{ showMoreSchedules ? "Qisqartirish" : "Yana ko'rsatish (9)" }}
            </button>
          </div>

          <!-- ==================================================== -->
          <!-- 2. MONTHS CAROUSEL / NAVIGATOR & DAY PILLS           -->
          <!-- ==================================================== -->
          <div v-if="!showAllMonths" class="space-y-4 pt-2 border-t border-slate-100">
            <!-- Month Stepper: < 1-o'quv oyi > -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <button
                  @click="prevStudyMonth"
                  :disabled="activeStudyMonthIndex <= 0"
                  type="button"
                  class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Oldingi oy"
                >
                  <ChevronLeft class="h-4 w-4" />
                </button>

                <span class="text-sm font-bold text-slate-900">
                  {{ currentStudyMonth?.title }}
                </span>

                <span
                  v-if="currentStudyMonth?.isCurrent"
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  Joriy oy
                </span>

                <button
                  @click="nextStudyMonth"
                  :disabled="activeStudyMonthIndex >= studyMonths.length - 1"
                  type="button"
                  class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Keyingi oy"
                >
                  <ChevronRight class="h-4 w-4" />
                </button>
              </div>

              <!-- Weekend Legend Indicator -->
              <div class="flex items-center gap-3 text-[11px] text-slate-500">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Dars kuni
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                  Shanba / Yakshanba
                </span>
              </div>
            </div>

            <!-- Single Month Day Chips: Horizontal continuous line -->
            <div class="flex flex-wrap gap-2 items-center pt-2">
              <button
                v-for="day in currentStudyMonth?.days"
                :key="day.dateStr"
                @click="navigateToLesson(day, activeStudyMonthIndex)"
                type="button"
                class="w-12 h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer font-sans select-none shrink-0"
                :class="
                  selectedLessonDay?.dateStr === day.dateStr
                    ? day.isWeekend
                      ? 'bg-rose-600 text-white shadow-xs scale-105 ring-2 ring-rose-300 font-bold'
                      : 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-300 font-bold'
                    : day.isWeekend
                      ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200/90 shadow-2xs'
                      : 'bg-[#E8EDF4] hover:bg-[#DDE5ED] text-slate-700'
                "
                :title="`${day.monthShort} ${day.dayNum} ${day.isWeekend ? '(Dam olish kuni - Shanba / Yakshanba)' : ''}`"
              >
                <span
                  class="text-[11px] font-medium leading-tight mb-0.5"
                  :class="
                    selectedLessonDay?.dateStr === day.dateStr
                      ? 'text-white/90'
                      : day.isWeekend
                        ? 'text-rose-500 font-semibold'
                        : 'text-slate-400'
                  "
                >
                  {{ day.monthShort }}
                </span>
                <span
                  class="text-sm font-semibold leading-tight"
                  :class="
                    selectedLessonDay?.dateStr === day.dateStr
                      ? 'text-white'
                      : day.isWeekend
                        ? 'text-rose-700 font-bold'
                        : 'text-slate-700'
                  "
                >
                  {{ day.dayNum }}
                </span>
              </button>
            </div>

            <!-- Barchasini ko'rish Button -->
            <div class="flex justify-center pt-3">
              <button
                @click="showAllMonths = true"
                type="button"
                class="px-6 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer active:scale-95"
              >
                Barchasini ko'rish
              </button>
            </div>
          </div>

          <!-- ==================================================== -->
          <!-- 3. MULTI-MONTH VIEW (SCREENSHOTS 2 & 3)             -->
          <!-- ==================================================== -->
          <div v-else class="space-y-6 pt-2 border-t border-slate-100">
            <div v-for="sm in studyMonths" :key="sm.index" class="space-y-3">
              <div class="flex items-center gap-2.5">
                <h3 class="text-xs font-bold text-slate-900">{{ sm.title }}</h3>
                <span
                  v-if="sm.isCurrent"
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  Joriy oy
                </span>
              </div>

              <!-- Multi-month: Continuous horizontal row -->
              <div class="flex flex-wrap gap-2 items-center">
                <button
                  v-for="day in sm.days"
                  :key="day.dateStr"
                  @click="navigateToLesson(day, sm.index)"
                  type="button"
                  class="w-12 h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer font-sans select-none shrink-0"
                  :class="
                    selectedLessonDay?.dateStr === day.dateStr
                      ? day.isWeekend
                        ? 'bg-rose-600 text-white shadow-xs scale-105 ring-2 ring-rose-300 font-bold'
                        : 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-300 font-bold'
                      : day.isWeekend
                        ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200/90 shadow-2xs'
                        : 'bg-[#E8EDF4] hover:bg-[#DDE5ED] text-slate-700'
                  "
                  :title="`${day.monthShort} ${day.dayNum} ${day.isWeekend ? '(Dam olish kuni - Shanba / Yakshanba)' : ''}`"
                >
                  <span
                    class="text-[11px] font-medium leading-tight mb-0.5"
                    :class="
                      selectedLessonDay?.dateStr === day.dateStr
                        ? 'text-white/90'
                        : day.isWeekend
                          ? 'text-rose-500 font-semibold'
                          : 'text-slate-400'
                    "
                  >
                    {{ day.monthShort }}
                  </span>
                  <span
                    class="text-sm font-semibold leading-tight"
                    :class="
                      selectedLessonDay?.dateStr === day.dateStr
                        ? 'text-white'
                        : day.isWeekend
                          ? 'text-rose-700 font-bold'
                          : 'text-slate-700'
                    "
                  >
                    {{ day.dayNum }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Qisqartirish Button -->
            <div class="flex justify-center pt-2">
              <button
                @click="showAllMonths = false"
                type="button"
                class="px-6 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer active:scale-95"
              >
                Qisqartirish
              </button>
            </div>
          </div>

          <!-- ==================================================== -->
          <!-- 4. LESSON DAY DETAIL & ATTENDANCE (SCREENSHOT 4)     -->
          <!-- ==================================================== -->
          <div v-if="selectedLessonDay" class="space-y-5 pt-4 border-t border-slate-100">
            <!-- Mentor Role Tabs: Assistant | Teacher -->
            <div class="flex items-center gap-6 border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                @click="activeMentorRole = 'ASSISTANT'"
                class="pb-2.5 transition cursor-pointer"
                :class="
                  activeMentorRole === 'ASSISTANT'
                    ? 'text-emerald-600 border-b-2 border-emerald-500 font-bold'
                    : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
                "
              >
                Assistant
              </button>
              <button
                type="button"
                @click="activeMentorRole = 'TEACHER'"
                class="pb-2.5 transition cursor-pointer"
                :class="
                  activeMentorRole === 'TEACHER'
                    ? 'text-emerald-600 border-b-2 border-emerald-500 font-bold'
                    : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
                "
              >
                Teacher
              </button>
            </div>

            <!-- Card 1: Ma'lumot (Info Box) -->
            <div class="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <h4 class="text-xs font-bold text-slate-900 mb-3">Ma'lumot</h4>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <!-- Teacher Profile -->
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base shadow-2xs">
                    {{ groupTeacherName.charAt(0) }}
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900">{{ groupTeacherName }}</div>
                    <div class="text-[11px] text-slate-400 font-medium">Teacher</div>
                  </div>
                </div>

                <!-- Dars kuni -->
                <div>
                  <div class="text-[11px] text-slate-400 font-medium">Dars kuni</div>
                  <div class="text-xs font-bold text-slate-900 font-mono mt-0.5">
                    {{ selectedLessonDay.formattedDate }}
                  </div>
                </div>

                <!-- Holat -->
                <div>
                  <div class="text-[11px] text-slate-400 font-medium">Holat</div>
                  <div class="text-xs font-bold mt-0.5" :class="selectedLessonDay.isHeld ? 'text-emerald-600' : 'text-slate-600'">
                    {{ selectedLessonDay.isHeld ? "Dars o'tildi" : "Dars o'tilmagan" }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2: Yo'qlama va mavzu kiritish -->
            <div class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <h4 class="text-xs font-bold text-slate-900">Yo'qlama va mavzu kiritish</h4>

              <!-- Radio choices: O'quv reja bo'yicha vs Boshqa -->
              <div class="flex items-center gap-6 text-xs">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="CURRICULUM"
                    v-model="topicMode"
                    class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span class="font-medium text-slate-700">O'quv reja bo'yicha</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="CUSTOM"
                    v-model="topicMode"
                    class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span class="font-medium text-slate-700">Boshqa</span>
                </label>
              </div>

              <!-- Selection dropdown when CURRICULUM is chosen -->
              <div v-if="topicMode === 'CURRICULUM'" class="space-y-2">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-bold text-slate-700">
                    <span class="text-rose-500">*</span> O'quv rejasidan mavzu tanlang
                  </label>
                  <button
                    type="button"
                    @click="showSyllabusModal = true"
                    class="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus class="h-3 w-3" />
                    <span>Reja qo'shish / boshqarish</span>
                  </button>
                </div>

                <select
                  v-model="selectedSyllabusId"
                  @change="onSelectSyllabusTopic"
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs cursor-pointer"
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

                <!-- Preview / Customization of selected topic -->
                <div class="space-y-1 pt-1">
                  <label class="block text-[11px] font-medium text-slate-500">Mavzu nomi (tahrirlash mumkin)</label>
                  <input
                    v-model="lessonTopicInput"
                    type="text"
                    placeholder="Mavzuni kiriting..."
                    class="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <!-- Manual text input when CUSTOM is chosen -->
              <div v-else class="space-y-1">
                <label class="block text-xs font-bold text-slate-700">
                  <span class="text-rose-500">*</span> Mavzu
                </label>
                <input
                  v-model="lessonTopicInput"
                  type="text"
                  placeholder="Mavzuni kiriting..."
                  class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <!-- Tavsif (ixtiyoriy) textarea -->
              <div class="space-y-1">
                <label class="block text-xs font-medium text-slate-600">
                  Tavsif (ixtiyoriy)
                </label>
                <textarea
                  v-model="lessonDescInput"
                  rows="3"
                  placeholder="Dars haqida qo'shimcha ma'lumot..."
                  class="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs resize-none"
                ></textarea>
              </div>

              <!-- Attendance Table -->
              <div class="border-t border-slate-100 pt-3">
                <table class="w-full text-left text-xs">
                  <thead class="text-[11px] text-slate-400 border-b border-slate-100 pb-2">
                    <tr>
                      <th class="py-2 px-3 w-12 font-medium">#</th>
                      <th class="py-2 px-3 font-medium">O'quvchi ismi</th>
                      <th class="py-2 px-3 text-right font-medium">Keldi</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(s, idx) in groupStudents" :key="s.id" class="hover:bg-slate-50/70 transition">
                      <td class="py-3 px-3 font-mono text-slate-400">{{ Number(idx) + 1 }}</td>
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {{ s.firstName?.charAt(0) }}
                          </div>
                          <span class="font-bold text-slate-900">{{ s.firstName }} {{ s.lastName }}</span>
                        </div>
                      </td>
                      <td class="py-3 px-3 text-right">
                        <!-- iOS Toggle Switch -->
                        <button
                          type="button"
                          @click="toggleStudentAttendance(s.id)"
                          class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                          :class="lessonAttendanceMap[s.id] ? 'bg-emerald-500' : 'bg-slate-300'"
                        >
                          <span
                            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                            :class="lessonAttendanceMap[s.id] ? 'translate-x-5' : 'translate-x-0'"
                          />
                        </button>
                      </td>
                    </tr>
                    <tr v-if="groupStudents.length === 0">
                      <td colspan="3" class="py-4 text-center text-xs text-slate-400">
                        Ushbu guruhda talabalar mavjud emas
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Action buttons -->
              <div class="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  @click="selectedLessonDay = null"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  @click="handleSaveLessonAttendance"
                  :disabled="isSavingAttendance"
                  class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {{ isSavingAttendance ? "Saqlanmoqda..." : "Davomat va darsni saqlash" }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 4. TAB 2: GURUH DARSLIKLARI (SCREENSHOT 5)               -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'LESSONS'" class="space-y-6">
        <!-- 1. STUDY MONTH CALENDAR CHIPS (Admin & Teacher ko'radi, O'quvchiga chiqmaydi) -->
        <div v-if="!authStore.isStudent" class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <button
                @click="prevStudyMonth"
                :disabled="activeStudyMonthIndex <= 0"
                type="button"
                class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Oldingi oy"
              >
                <ChevronLeft class="h-4 w-4" />
              </button>

              <span class="text-sm font-bold text-slate-900">
                {{ currentStudyMonth?.title }}
              </span>

              <span
                v-if="currentStudyMonth?.isCurrent"
                class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                Joriy oy
              </span>

              <button
                @click="nextStudyMonth"
                :disabled="activeStudyMonthIndex >= studyMonths.length - 1"
                type="button"
                class="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Keyingi oy"
              >
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>

            <div class="flex items-center gap-2">
              <span v-if="selectedLessonDay" class="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                {{ selectedLessonDay.monthShort }} {{ selectedLessonDay.dayNum }} darsi
              </span>
            </div>
          </div>

          <!-- Calendar Day Chips: Horizontal line bo'yicha to'ldirib ketish -->
          <div class="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-100">
            <button
              v-for="day in currentStudyMonth?.days"
              :key="day.dateStr"
              @click="selectLessonDay(day, activeStudyMonthIndex)"
              type="button"
              class="w-12 h-14 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer font-sans select-none shrink-0"
              :class="
                selectedLessonDay?.dateStr === day.dateStr
                  ? day.isWeekend
                    ? 'bg-rose-600 text-white shadow-xs scale-105 ring-2 ring-rose-300 font-bold'
                    : 'bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-300 font-bold'
                  : day.isWeekend
                    ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-700 border border-rose-200/90 shadow-2xs'
                    : 'bg-[#E8EDF4] hover:bg-[#DDE5ED] text-slate-700'
              "
              :title="`${day.monthShort} ${day.dayNum} ${day.isWeekend ? '(Dam olish kuni - Shanba / Yakshanba)' : ''}`"
            >
              <span
                class="text-[11px] font-medium leading-tight mb-0.5"
                :class="
                  selectedLessonDay?.dateStr === day.dateStr
                    ? 'text-white/90'
                    : day.isWeekend
                      ? 'text-rose-500 font-semibold'
                      : 'text-slate-400'
                "
              >
                {{ day.monthShort }}
              </span>
              <span
                class="text-sm font-semibold leading-tight"
                :class="
                  selectedLessonDay?.dateStr === day.dateStr
                    ? 'text-white'
                    : day.isWeekend
                      ? 'text-rose-700 font-bold'
                      : 'text-slate-700'
                "
              >
                {{ day.dayNum }}
              </span>
            </button>
          </div>
        </div>

        <!-- 2. MAIN LESSON WORKSPACE -->
        <div v-if="selectedLessonDay" class="space-y-6">
          <!-- Lesson Header Bar -->
          <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
                  {{ selectedLessonDay.lessonOrder }}-dars
                </span>
                <span
                  class="px-2.5 py-0.5 rounded-lg text-xs font-bold"
                  :class="selectedLessonDay.isHeld ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'"
                >
                  {{ selectedLessonDay.isHeld ? "Dars o'tildi" : "Rejalashtirilgan" }}
                </span>
              </div>
              <h2 class="text-base sm:text-lg font-bold text-slate-900">{{ selectedLessonDay.topic }}</h2>
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1">
                <span>Sana: <strong class="text-slate-700">{{ selectedLessonDay.formattedDate || selectedLessonDay.dateStr }}</strong></span>
                <span>•</span>
                <span>Xona: <strong class="text-slate-700">{{ group.room?.name || 'F2 Autodesk // 18' }}</strong></span>
                <span>•</span>
                <span>Ustoz: <strong class="text-slate-700">{{ groupTeacherName }}</strong></span>
              </div>
            </div>

            <!-- Action buttons for teacher / admin -->
            <div v-if="!authStore.isStudent" class="flex items-center gap-2">
              <button
                @click="openEditLessonModal"
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 transition cursor-pointer"
              >
                <Edit2 class="h-3.5 w-3.5 text-blue-600" />
                <span>Darsni tahrirlash</span>
              </button>
              <button
                @click="showEditVideoModal = true"
                type="button"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                <Video class="h-3.5 w-3.5 text-blue-600" />
                <span>Videoni sozlash</span>
              </button>
            </div>
          </div>

          <!-- 2-Column Responsive Layout: Left: Video & Content & Homework | Right: Yo'qlama va Ballar -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- LEFT COLUMN (5 cols on lg): Video & Materials & Homework -->
            <div class="lg:col-span-5 space-y-6">
              <!-- A. Video Player Card -->
              <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div class="bg-slate-900 aspect-video flex items-center justify-center relative overflow-hidden">
                  <iframe
                    v-if="selectedLessonVideoUrl && (selectedLessonVideoUrl.includes('youtube.com') || selectedLessonVideoUrl.includes('youtu.be'))"
                    :src="selectedLessonVideoUrl.replace('watch?v=', 'embed/')"
                    class="w-full h-full"
                    title="Dars videosi"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                  <video
                    v-else-if="selectedLessonVideoUrl"
                    :src="selectedLessonVideoUrl"
                    controls
                    class="w-full h-full"
                  ></video>
                  <div v-else class="text-center p-6 text-slate-400">
                    <Video class="h-10 w-10 mx-auto text-slate-600 mb-2" />
                    <p class="text-xs font-semibold text-slate-300">Video havola kiritilmagan</p>
                    <button
                      v-if="!authStore.isStudent"
                      @click="showEditVideoModal = true"
                      type="button"
                      class="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      + Video qo'shish
                    </button>
                  </div>
                </div>

                <div class="p-4 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-900 truncate">{{ selectedLessonDay.topic }}</span>
                    <span class="text-slate-400 font-mono text-[11px] shrink-0">20:00 daqiqa</span>
                  </div>
                  <p class="text-xs text-slate-500 leading-relaxed">
                    {{ selectedLessonDay.description || "Ushbu darsda zamonaviy dasturlash standartlari va amaliy mashg'ulotlar o'rganiladi." }}
                  </p>
                </div>
              </div>

              <!-- B. Dars Materiallari -->
              <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
                <h3 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <BookOpen class="h-4 w-4 text-blue-600" />
                  <span>Dars materiallari va manbalar</span>
                </h3>

                <div class="space-y-2">
                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div class="flex items-center gap-2">
                      <FileText class="h-4 w-4 text-rose-500 shrink-0" />
                      <div>
                        <div class="font-bold text-slate-800">Dars Taqdimoti (Slides.pdf)</div>
                        <div class="text-[10px] text-slate-400">4.2 MB • PDF hujjati</div>
                      </div>
                    </div>
                    <button type="button" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition shadow-2xs cursor-pointer">
                      <Download class="h-4 w-4" />
                    </button>
                  </div>

                  <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div class="flex items-center gap-2">
                      <FileText class="h-4 w-4 text-blue-500 shrink-0" />
                      <div>
                        <div class="font-bold text-slate-800">Amaliy Mashg'ulot Kodlari (.zip)</div>
                        <div class="text-[10px] text-slate-400">1.8 MB • Manba kodi</div>
                      </div>
                    </div>
                    <button type="button" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition shadow-2xs cursor-pointer">
                      <Download class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- C. Uyga Vazifalar (real CRUD) -->
              <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Award class="h-4 w-4 text-amber-500" />
                    <span>Uyga Vazifalar</span>
                    <span class="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{{ homeworkList.length }}</span>
                  </h3>
                  <button
                    v-if="!authStore.isStudent"
                    type="button"
                    @click="showAddMaterialModal = true"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Plus class="h-3 w-3" />
                    <span>Vazifa qo'shish</span>
                  </button>
                </div>

                <!-- Homework List -->
                <div v-if="homeworkList.length > 0" class="space-y-2">
                  <div
                    v-for="hw in homeworkList"
                    :key="hw.id"
                    class="p-3 rounded-xl border border-amber-100 bg-amber-50/40 text-xs"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="font-bold text-slate-900 truncate">{{ hw.title }}</div>
                        <div class="text-[11px] text-amber-700 font-mono mt-0.5">Muddati: {{ hw.deadline }}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">Bajarildi: {{ hw.completedCount }}/{{ hw.studentsCount }}</div>
                      </div>
                      <div v-if="!authStore.isStudent" class="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          @click="openEditHomeworkModal(hw)"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit2 class="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          @click="handleDeleteHomework(hw.id, hw.title)"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="py-4 text-center text-xs text-slate-400">
                  Hali vazifa qo'shilmagan
                </div>

                <!-- Student Submission form -->
                <div v-if="authStore.isStudent && homeworkList.length > 0" class="space-y-3 pt-2 border-t border-slate-100">
                  <div class="text-xs font-bold text-slate-800">Topshiriqni yuborish</div>
                  <textarea
                    v-model="studentSubmissionText"
                    rows="3"
                    placeholder="Vazifa bo'yicha izoh yoki yechim matni..."
                    class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  ></textarea>
                  <input
                    v-model="studentSubmissionFileUrl"
                    type="url"
                    placeholder="GitHub yoki Google Drive havolasi..."
                    class="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 transition"
                  />
                  <button
                    @click="handleStudentSubmitHomework"
                    :disabled="isSubmittingStudentHomework"
                    type="button"
                    class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send class="h-3.5 w-3.5" />
                    <span>{{ isSubmittingStudentHomework ? "Yuborilmoqda..." : "Topshiriqni yuborish" }}</span>
                  </button>
                </div>
              </div>

              <!-- D. Imtihonlar (real CRUD) -->
              <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText class="h-4 w-4 text-indigo-500" />
                    <span>Imtihonlar</span>
                    <span class="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">{{ examList.length }}</span>
                  </h3>
                  <button
                    v-if="!authStore.isStudent"
                    type="button"
                    @click="showAddExamModal = true"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Plus class="h-3 w-3" />
                    <span>Imtihon qo'shish</span>
                  </button>
                </div>

                <!-- Exam List -->
                <div v-if="examList.length > 0" class="space-y-2">
                  <div
                    v-for="exam in examList"
                    :key="exam.id"
                    class="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 text-xs"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="font-bold text-slate-900 truncate">{{ exam.title }}</div>
                        <div class="text-[11px] text-indigo-700 font-mono mt-0.5">
                          Sana: {{ exam.examDate ? formatDate(exam.examDate) : '-' }} • Maks: {{ exam.maxScore || 100 }} ball
                        </div>
                        <div class="text-[10px] text-slate-400 mt-0.5">Natijalar: {{ exam.results?.length || 0 }} ta</div>
                      </div>
                      <div v-if="!authStore.isStudent" class="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          @click="openExamResultsModal(exam)"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                          title="Natijalarni kiritish"
                        >
                          <Check class="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          @click="openEditExamModal(exam)"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit2 class="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          @click="handleDeleteExam(exam.id, exam.title)"
                          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="py-4 text-center text-xs text-slate-400">
                  Hali imtihon qo'shilmagan
                </div>
              </div>
            </div>


            <!-- RIGHT COLUMN (7 cols on lg): Yo'qlama va Ballar -->
            <div class="lg:col-span-7">
              <!-- ADMIN & TEACHER: Yo'qlama va Ballar qo'yish -->
              <div v-if="!authStore.isStudent" class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 class="text-sm font-bold text-slate-900">Yo'qlama va Baholash</h3>
                    <p class="text-[11px] text-slate-400 mt-0.5">Davomat holati, dars bali va rag'batlantiruvchi tangalar</p>
                  </div>

                  <button
                    @click="markAllStudentsPresent"
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition cursor-pointer active:scale-95"
                  >
                    <Check class="h-3.5 w-3.5" />
                    <span>Barchani 'Keldi' qilish</span>
                  </button>
                </div>

                <!-- Students Grading List -->
                <div class="space-y-3 divide-y divide-slate-100">
                  <div
                    v-for="s in groupStudents"
                    :key="s.id"
                    class="pt-3 first:pt-0 space-y-2.5"
                  >
                    <!-- Student Header Row -->
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs">
                          {{ s.firstName?.charAt(0) }}
                        </div>
                        <div>
                          <div class="text-xs font-bold text-slate-900">{{ s.firstName }} {{ s.lastName }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">{{ s.phone }}</div>
                        </div>
                      </div>

                      <!-- Score and Coins Input Controls -->
                      <div class="flex items-center gap-3">
                        <div class="flex items-center gap-1">
                          <span class="text-[11px] font-bold text-slate-500">Ball:</span>
                          <input
                            v-if="lessonScoresMap[s.id]"
                            v-model.number="lessonScoresMap[s.id].score"
                            type="number"
                            min="0"
                            max="100"
                            class="w-16 h-8 text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div class="flex items-center gap-1">
                          <span class="text-[11px] font-bold text-amber-600">Tanga:</span>
                          <input
                            v-if="lessonScoresMap[s.id]"
                            v-model.number="lessonScoresMap[s.id].coins"
                            type="number"
                            min="0"
                            max="20"
                            class="w-14 h-8 text-center text-xs font-bold bg-amber-50/60 border border-amber-200 rounded-lg text-amber-800 focus:bg-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Attendance Status Buttons -->
                    <div class="flex items-center gap-2 pl-10.5">
                      <button
                        type="button"
                        @click="setStudentStatus(s.id, 'PRESENT')"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border"
                        :class="
                          lessonScoresMap[s.id]?.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        "
                      >
                        <Check class="h-3 w-3" />
                        <span>Keldi</span>
                      </button>

                      <button
                        type="button"
                        @click="setStudentStatus(s.id, 'ABSENT')"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border"
                        :class="
                          lessonScoresMap[s.id]?.status === 'ABSENT'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        "
                      >
                        <X class="h-3 w-3" />
                        <span>Kelmadi</span>
                      </button>

                      <button
                        type="button"
                        @click="setStudentStatus(s.id, 'LATE')"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border"
                        :class="
                          lessonScoresMap[s.id]?.status === 'LATE'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        "
                      >
                        <Clock class="h-3 w-3" />
                        <span>Kechikdi</span>
                      </button>

                      <button
                        type="button"
                        @click="setStudentStatus(s.id, 'EXCUSED')"
                        class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border"
                        :class="
                          lessonScoresMap[s.id]?.status === 'EXCUSED'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        "
                      >
                        <HelpCircle class="h-3 w-3" />
                        <span>Sababli</span>
                      </button>
                    </div>
                  </div>

                  <div v-if="groupStudents.length === 0" class="py-8 text-center text-xs text-slate-400">
                    Guruhda talabalar mavjud emas
                  </div>
                </div>

                <!-- Bottom Save Button -->
                <div class="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    @click="handleSaveLessonAttendanceAndGrades"
                    :disabled="isSavingAttendance"
                    type="button"
                    class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Check class="h-4 w-4" />
                    <span>{{ isSavingAttendance ? "Saqlanmoqda..." : "Davomat va Ballarni Saqlash" }}</span>
                  </button>
                </div>
              </div>

              <!-- STUDENT VIEW: Shaxsiy Natijalar -->
              <div v-else class="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
                <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles class="h-4.5 w-4.5 text-blue-600" />
                  <span>Sizning ushbu darsdagi natijalaringiz</span>
                </h3>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                    <div class="text-[11px] font-medium text-emerald-700">Davomat holati</div>
                    <div class="text-base font-bold text-emerald-800 mt-1">Kelgan ✓</div>
                  </div>

                  <div class="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <div class="text-[11px] font-medium text-blue-700">Darsdagi faollik bali</div>
                    <div class="text-base font-bold text-blue-800 mt-1">85 / 100 ball</div>
                  </div>

                  <div class="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                    <div class="text-[11px] font-medium text-amber-700">Qo'lga kiritilgan tanga</div>
                    <div class="text-base font-bold text-amber-800 mt-1">+2 tanga ⭐</div>
                  </div>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  <strong>O'qituvchi xulosasi:</strong> Dars materiallarini o'zlashtirish darajasi yuqori. Keyingi darsda amaliy topshiriqni bajargan holda qatnashing.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 5. TAB 3: AKADEMIK DAVOMATI (STUDENTS LIST)             -->
      <!-- ======================================================== -->
      <div v-if="activeTab === 'ATTENDANCE'" class="space-y-4">
        <!-- Search and Action header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="studentSearch"
              type="text"
              placeholder="Guruhdagi talabani qidirish..."
              class="w-full h-10 pl-9 pr-4 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
            />
          </div>

          <button
            @click="showAddStudentModal = true"
            type="button"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto active:scale-95"
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
                      @click="router.push(`/dashboard/users/${s.id}`)"
                      type="button"
                      class="flex items-center gap-2.5 text-left group/sname cursor-pointer"
                    >
                      <div class="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xs shrink-0">
                        {{ s.firstName?.charAt(0) }}{{ s.lastName?.charAt(0) }}
                      </div>
                      <div>
                        <div class="font-bold text-slate-900 group-hover/sname:text-indigo-600 transition">
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
                        s.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
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
                        @click="router.push(`/dashboard/users/${s.id}`)"
                        type="button"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                        title="360° Profilga o'tish"
                      >
                        <ExternalLink class="h-4 w-4" />
                      </button>

                      <button
                        @click="openPaymentForStudent(s)"
                        type="button"
                        class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                        title="To'lov qabul qilish"
                      >
                        <CreditCard class="h-4 w-4" />
                      </button>

                      <button
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

    <!-- MODAL: ADD MATERIAL / HOMEWORK / VIDEO (SCREENSHOT 5 ACTION) -->
    <Modal :show="showAddMaterialModal" :title="materialsSubTab === 'HOMEWORK' ? 'Yangi Uyga Vazifa Qo\'shish' : materialsSubTab === 'VIDEOS' ? 'Yangi Video Qo\'shish' : 'Yangi Element Qo\'shish'" @close="showAddMaterialModal = false">
      <form @submit.prevent="handleCreateHomework" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Mavzu / Nomi</label>
          <input
            v-model="newHwTitle"
            type="text"
            required
            placeholder="Mavzuni kiriting..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Vazifa Tavsifi</label>
          <textarea
            v-model="newHwTask"
            rows="3"
            placeholder="Vazifa topshirig'i batafsil..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Dars Sanasi</label>
            <input
              v-model="newHwLessonDate"
              type="date"
              required
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none bg-white"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Topshirish muddati</label>
            <input
              v-model="newHwDeadline"
              type="datetime-local"
              required
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none bg-white"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal Ball</label>
            <input
              v-model.number="newHwMaxScore"
              type="number"
              min="1"
              max="100"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Rag'bat (Tangalar)</label>
            <input
              v-model.number="newHwCoins"
              type="number"
              min="0"
              max="50"
              class="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showAddMaterialModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingHomework || !newHwTitle"
            class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingHomework ? "Saqlanmoqda..." : "Saqlash va Berish" }}
          </button>
        </div>
      </form>
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

    <!-- MODAL: EDIT GROUP -->
    <Modal :show="showEditGroupModal" title="Guruh ma'lumotlarini tahrirlash" @close="showEditGroupModal = false">
      <form @submit.prevent="handleUpdateGroup" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Guruh nomi *</label>
          <input
            v-model="editName"
            type="text"
            required
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">O'qituvchi (Mentor) *</label>
          <select
            v-model="editTeacherId"
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          >
            <option value="">O'qituvchini tanlang</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.firstName }} {{ t.lastName }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Kurs *</label>
            <select
              v-model="editCourseId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Xona *</label>
            <select
              v-model="editRoomId"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Dars boshlanish vaqti</label>
            <input
              v-model="editStartTime"
              type="time"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tugash vaqti</label>
            <input
              v-model="editEndTime"
              type="time"
              required
              class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal talabalar soni</label>
          <input
            v-model.number="editMaxStudents"
            type="number"
            min="1"
            max="100"
            class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="showEditGroupModal = false"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmittingEdit || !editName"
            class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {{ isSubmittingEdit ? "Saqlanmoqda..." : "Saqlash" }}
          </button>
        </div>
      </form>
    </Modal>

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
            <input
              v-if="examResultsMap[s.id] !== undefined"
              v-model.number="examResultsMap[s.id]"
              type="number"
              min="0"
              :max="examForResults?.maxScore || 100"
              class="w-20 h-8 text-center text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
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
  </div>
</template>
