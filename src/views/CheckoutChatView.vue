<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../api/erpService';
import type { PaymentType } from '../types';
import {
  Send,
  Upload,
  CheckCircle2,
  Copy,
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Sparkles,
  RotateCcw,
  Check,
  Image as ImageIcon,
  Clock,
  ChevronRight,
  Info,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// ===================== DATA TYPES =====================
interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  type?: 'text' | 'course_select' | 'user_form' | 'payment_select' | 'receipt_upload' | 'receipt_result';
  meta?: any;
  imageUrl?: string;
}

interface CourseItem {
  id: number;
  name: string;
  price: number;
  duration?: string;
  badge?: string;
  desc?: string;
}

// Fallback / Standart kurslar
const availableCourses = ref<CourseItem[]>([
  {
    id: 7,
    name: 'Frontend Dasturlash (Vue 3 / TypeScript)',
    price: 850000,
    duration: "5 oy",
    badge: 'Eng Ommabop',
    desc: "Vue 3, React, TypeScript, TailwindCSS va real loyihalar yaratish",
  },
  {
    id: 8,
    name: 'Backend Dasturlash (NestJS / PostgreSQL)',
    price: 950000,
    duration: "6 oy",
    badge: 'Katta Talab',
    desc: "Node.js, NestJS, Prisma ORM, PostgreSQL, Docker va Microservices",
  },
  {
    id: 10,
    name: 'Python & Data Science (AI Asoslari)',
    price: 900000,
    duration: "6 oy",
    badge: 'Kelajak Kasbi',
    desc: "Python, Machine Learning, Neyrotarmoqlar va AI loyihalar",
  },
  {
    id: 11,
    name: 'UI/UX Dizayn va Figma Masterclass',
    price: 700000,
    duration: "4 oy",
    badge: 'Kreativ',
    desc: "Figma, mobil va veb dizayn, UX tadqiqotlar va prototiplash",
  },
  {
    id: 9,
    name: 'IELTS Intensive (Band 7.5+)',
    price: 750000,
    duration: "3 oy",
    badge: 'Intensiv',
    desc: "Speaking, Writing, Reading & Listening professional metodikasi",
  },
]);

// ===================== STATE =====================
const messages = ref<ChatMessage[]>([]);
const isBotTyping = ref(false);
const chatContainer = ref<HTMLDivElement | null>(null);

// Form State
const selectedCourse = ref<CourseItem | null>(null);
const userForm = ref({
  fullName: '',
  phone: '+998 ',
  email: '',
});
const selectedPaymentType = ref<PaymentType>('CLICK');
const receiptImage = ref<string | null>(null);
const receiptFile = ref<File | null>(null);
const paymentNote = ref('');

// Step Tracking
// 1: Course Selection
// 2: User Details Form
// 3: Payment Method Selection
// 4: Screenshot Upload & Rekvizitlar
// 5: Finished / Confirmation
const currentStep = ref<number>(1);
const isSubmitting = ref(false);
const submitError = ref('');
const checkoutResult = ref<{
  paymentId: number;
  amount: number;
  courseName: string;
  status: string;
  isNewStudent: boolean;
} | null>(null);

// Card Details for Transfer
const cardDetails = {
  number: '8600 4920 1823 4910',
  holder: 'NYVER ACADEMY (MCHJ)',
  bank: "O'zmilliybank / Humo-Uzcard",
};

// Toast notification
const copiedText = ref(false);
function copyCardNumber() {
  navigator.clipboard.writeText(cardDetails.number.replace(/\s+/g, ''));
  copiedText.value = true;
  setTimeout(() => {
    copiedText.value = false;
  }, 2500);
}

function getTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Avtomatik scroll qilish
async function scrollToBottom() {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
}

// Bot xabarini yozish animatsiyasi bilan qo'shish
async function appendBotMessage(
  text: string,
  type: ChatMessage['type'] = 'text',
  meta: any = null,
  delayMs = 450
) {
  isBotTyping.value = true;
  await scrollToBottom();

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  isBotTyping.value = false;
  messages.value.push({
    id: 'bot-' + Date.now() + '-' + Math.random(),
    sender: 'bot',
    text,
    time: getTimeString(),
    type,
    meta,
  });
  await scrollToBottom();
}

// Foydalanuvchi xabarini qo'shish
function appendUserMessage(text: string, imageUrl?: string) {
  messages.value.push({
    id: 'user-' + Date.now() + '-' + Math.random(),
    sender: 'user',
    text,
    time: getTimeString(),
    imageUrl,
  });
  scrollToBottom();
}

// ===================== FLOW HANDLERS =====================

// 1. Kursni tanlash
async function handleSelectCourse(course: CourseItem) {
  selectedCourse.value = course;
  appendUserMessage(`Men "${course.name}" kursini tanladim.`);

  currentStep.value = 2;

  await appendBotMessage(
    `Ajoyib tanlov! Siz **${course.name}** yo'nalishini tanladingiz.\n\n💰 Kurs to'lovi: **${course.price.toLocaleString('uz-UZ')} so'm**.\n\nShaxsiy kabinetingiz va o'quv shartnomasi uchun ma'lumotlaringizni to'ldiring:`,
    'user_form'
  );
}

// 2. Foydalanuvchi ma'lumotlarini tasdiqlash
async function handleSubmitUserForm() {
  submitError.value = '';
  if (!userForm.value.fullName.trim() || userForm.value.fullName.trim().length < 3) {
    submitError.value = "Iltimos, ism va familiyangizni to'liq kiriting.";
    return;
  }
  if (!userForm.value.phone.trim() || userForm.value.phone.replace(/[\s-]/g, '').length < 9) {
    submitError.value = "Iltimos, telefon raqamingizni to'g'ri kiriting.";
    return;
  }

  appendUserMessage(
    `👤 Ism: ${userForm.value.fullName}\n📞 Tel: ${userForm.value.phone}${userForm.value.email ? '\n📧 Email: ' + userForm.value.email : ''}`
  );

  currentStep.value = 3;

  await appendBotMessage(
    `Ma'lumotlar qabul qilindi, rahmat! Endi to'lovni qaysi tizim orqali amalga oshirish sizga qulay ekanligini tanlang:`,
    'payment_select'
  );
}

// 3. To'lov tizimini tanlash
async function handleSelectPaymentType(type: PaymentType) {
  selectedPaymentType.value = type;
  const labels: Record<string, string> = {
    CLICK: 'Click Up',
    PAYME: 'Payme',
    UZUM: 'Uzum Bank',
    CARD: 'Bank Kartasi (Humo/Uzcard)',
    CASH: 'Naqd Pul',
  };

  appendUserMessage(`To'lov usuli: ${labels[type] || type}`);

  currentStep.value = 4;

  await appendBotMessage(
    `Quyidagi rasmiy rekvizitlar orqali to'lovni amalga oshiring va **to'lov cheki skrinshotini (rasmini)** yuklang. Admin chekni tekshirib tasdiqlashi bilanoq o'quv kabinetingiz ochiladi:`,
    'receipt_upload'
  );
}

// 4. Skrinshot faylini yuklash va o'qish (File Picker & Drag-Drop & Paste)
function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    processImageFile(input.files[0]);
  }
}

function processImageFile(file: File) {
  if (!file.type.startsWith('image/')) {
    submitError.value = "Iltimos, faqat rasm faylini tanlang (PNG, JPG, WEBP).";
    return;
  }
  submitError.value = '';
  receiptFile.value = file;

  const reader = new FileReader();
  reader.onload = (e) => {
    receiptImage.value = e.target?.result as string;
    scrollToBottom();
  };
  reader.readAsDataURL(file);
}

function removeScreenshot() {
  receiptImage.value = null;
  receiptFile.value = null;
}

// Global Paste (Ctrl+V) listener skrinshot nusxalanganda oson yuklash uchun
function handleGlobalPaste(e: ClipboardEvent) {
  if (currentStep.value !== 4) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        processImageFile(file);
        break;
      }
    }
  }
}

// 5. To'lov cheki bilan yakuniy arizani yuborish
async function submitPaymentWithReceipt() {
  if (!receiptImage.value) {
    submitError.value = "Iltimos, to'lov cheki skrinshotini yuklang.";
    return;
  }

  isSubmitting.value = true;
  submitError.value = '';

  try {
    // Backendga jo'natish
    const res = await erpService.onlineCheckout({
      fullName: userForm.value.fullName.trim(),
      phone: userForm.value.phone.trim(),
      email: userForm.value.email.trim() || `${userForm.value.phone.replace(/[^0-9]/g, '')}@nyver.uz`,
      courseId: selectedCourse.value?.id || 7,
      amount: selectedCourse.value?.price || 850000,
      paymentType: selectedPaymentType.value,
      receiptUrl: receiptImage.value,
      notes: paymentNote.value.trim() || undefined,
      comment: `Onlayn Chek (${selectedPaymentType.value}) - Kurs: ${selectedCourse.value?.name}`,
    });

    checkoutResult.value = {
      paymentId: res.paymentId,
      amount: res.amount,
      courseName: selectedCourse.value?.name || 'NyVer Kursi',
      status: 'PENDING',
      isNewStudent: res.isNewStudent,
    };

    // Foydalanuvchi yuborgan rasm va izohni chatga chiqarish
    appendUserMessage(
      `To'lov cheki yuklandi.${paymentNote.value ? '\nIzoh: ' + paymentNote.value : ''}`,
      receiptImage.value
    );

    currentStep.value = 5;

    await appendBotMessage(
      `🎉 **Tabriklaymiz! To'lov chekingiz va buyurtmangiz muvaffaqiyatli qabul qilindi!**\n\nChek raqami: **#NYV-${res.paymentId}**.\n\nHozirda to'lov ma'lumotlari admin panelga yuborildi. Administrator chekni tekshirib tasdiqlashi bilanoq sizga shaxsiy kabinet login va paroli yetkaziladi.`,
      'receipt_result',
      checkoutResult.value
    );
  } catch (err: any) {
    console.error("To'lov yuborishda xatolik:", err);
    submitError.value =
      err?.response?.data?.message || "To'lovni yuborishda texnik xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.";
  } finally {
    isSubmitting.value = false;
  }
}

// Bosh sahifaga qaytish
function goBackToLanding() {
  router.push('/');
}

// Qaytadan boshlash
function restartCheckout() {
  currentStep.value = 1;
  selectedCourse.value = null;
  receiptImage.value = null;
  receiptFile.value = null;
  checkoutResult.value = null;
  messages.value = [];
  initChat();
}

// Chatni boshlash
async function initChat() {
  try {
    const remoteCourses = await erpService.getCourses();
    if (Array.isArray(remoteCourses) && remoteCourses.length > 0) {
      const merged: CourseItem[] = remoteCourses.map((rc: any) => {
        const match = availableCourses.value.find(
          (ac) => ac.id === rc.id || ac.name.toLowerCase().includes(rc.name.toLowerCase())
        );
        return {
          id: rc.id,
          name: rc.name,
          price: rc.price,
          duration: match?.duration || (rc.durationMonths ? `${rc.durationMonths} oy` : '4 oy'),
          badge: match?.badge,
          desc: rc.description || match?.desc || "Professional amaliy ta'lim kursi",
        };
      });
      if (merged.length > 0) {
        availableCourses.value = merged;
      }
    }
  } catch (e) {
    console.warn('Using default availableCourses:', e);
  }

  // Query parametrlarini tekshirish
  const queryCourseId = route.query.courseId ? Number(route.query.courseId) : null;
  let preselected = queryCourseId ? availableCourses.value.find((c) => c.id === queryCourseId) : null;
  if (!preselected && queryCourseId) {
    // Agar aniq ID topilmasa, indeks bo'yicha yoki 1-kursni moslashtirish
    preselected = availableCourses.value[(queryCourseId - 1) % availableCourses.value.length] || availableCourses.value[0];
  }

  await appendBotMessage(
    "Assalomu alaykum! **NyVer Ta'lim Markazi** rasmiy qabul xizmatiga xush kelibsiz! 👋\n\nMen sizga kursga tezkor yozilish va to'lovni rasmiylashtirishda yordam beraman.",
    'text',
    null,
    200
  );

  if (preselected) {
    await handleSelectCourse(preselected);
  } else {
    await appendBotMessage(
      "O'zingiz qiziqqan yo'nalishni tanlang:",
      'course_select',
      null,
      350
    );
  }
}

onMounted(() => {
  initChat();
  window.addEventListener('paste', handleGlobalPaste);
});
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
    <!-- Ambient Background Lighting -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]"></div>
      <div class="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px]"></div>
      <div class="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-[128px]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[24px_24px]"></div>
    </div>

    <!-- Top Navigation Header -->
    <header class="relative z-20 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl shrink-0">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
        <!-- Brand & Back Button -->
        <div class="flex items-center gap-3 sm:gap-4">
          <button
            @click="goBackToLanding"
            class="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white transition active:scale-95 cursor-pointer shadow-xs"
            title="Landing sahifasiga qaytish"
          >
            <ArrowLeft class="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div class="flex items-center gap-3">
            <!-- Bot Avatar with Live Status -->
            <div class="relative">
              <div class="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/20">
                <Sparkles class="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></span>
            </div>

            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-sm sm:text-base font-black text-white tracking-tight">
                  NyVer Qabul Assistent
                </h1>
                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Online
                </span>
              </div>
              <p class="text-[11px] text-slate-400 font-medium">
                24/7 Avtomatlashtirilgan Onlayn Qabul & To'lov
              </p>
            </div>
          </div>
        </div>

        <!-- Security Badge -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 text-xs font-semibold">
          <ShieldCheck class="w-4 h-4 text-emerald-400" />
          <span>256-bit Xavfsiz To'lov</span>
        </div>
      </div>
    </header>

    <!-- Main Chat Workspace -->
    <main class="relative z-10 flex-1 max-w-4xl w-full mx-auto flex flex-col p-3 sm:p-5 overflow-hidden">
      <!-- Chat Messages Container -->
      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pr-1 sm:pr-2 scroll-smooth py-2 sm:py-4"
      >
        <!-- Time Divider -->
        <div class="flex items-center justify-center my-2">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/50">
            Bugun, Rasmiy Muloqot
          </span>
        </div>

        <!-- Messages Loop -->
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="flex flex-col space-y-1.5"
          :class="msg.sender === 'user' ? 'items-end' : 'items-start'"
        >
          <!-- Message Bubble -->
          <div
            class="max-w-[92%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 transition-all duration-200 shadow-md"
            :class="
              msg.sender === 'user'
                ? 'bg-linear-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs shadow-indigo-600/20'
                : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-xs backdrop-blur-md shadow-black/20'
            "
          >
            <!-- User Uploaded Image Preview (If attached) -->
            <div v-if="msg.imageUrl" class="mb-3 rounded-2xl overflow-hidden border border-white/20 bg-slate-900/50 max-h-72">
              <img :src="msg.imageUrl" alt="To'lov cheki skrinshoti" class="w-full object-contain max-h-72" />
            </div>

            <!-- Text Content -->
            <div class="text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
              {{ msg.text }}
            </div>

            <!-- ================= INTERACTIVE COMPONENTS ================= -->

            <!-- 1. COURSE SELECTION COMPONENT -->
            <div v-if="msg.type === 'course_select' && currentStep === 1" class="mt-4 pt-3 border-t border-slate-700/60 space-y-2.5">
              <div class="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-indigo-400" />
                <span>O'zingizga ma'qul yo'nalishni bosing:</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  v-for="course in availableCourses"
                  :key="course.id"
                  @click="handleSelectCourse(course)"
                  type="button"
                  class="p-3.5 rounded-2xl text-left bg-slate-900/80 hover:bg-indigo-950/60 border border-slate-700/70 hover:border-indigo-500/70 transition-all duration-200 group cursor-pointer shadow-xs active:scale-98 flex flex-col justify-between"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <span class="font-bold text-white text-xs sm:text-sm group-hover:text-indigo-300 transition-colors">
                        {{ course.name }}
                      </span>
                      <span v-if="course.badge" class="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {{ course.badge }}
                      </span>
                    </div>
                    <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {{ course.desc }}
                    </p>
                  </div>

                  <div class="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span class="font-extrabold text-emerald-400">
                      {{ course.price.toLocaleString('uz-UZ') }} so'm / oy
                    </span>
                    <span class="text-[11px] font-bold text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      Tanlash <ChevronRight class="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <!-- 2. USER DETAILS FORM COMPONENT -->
            <div v-if="msg.type === 'user_form' && currentStep === 2" class="mt-4 pt-3 border-t border-slate-700/60">
              <form @submit.prevent="handleSubmitUserForm" class="space-y-3">
                <div v-if="submitError" class="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {{ submitError }}
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1">
                    To'liq Ism va Familiyangiz <span class="text-rose-400">*</span>
                  </label>
                  <input
                    v-model="userForm.fullName"
                    required
                    type="text"
                    placeholder="Masalan: Jamshid Qodirov"
                    class="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">
                      Telefon raqamingiz <span class="text-rose-400">*</span>
                    </label>
                    <input
                      v-model="userForm.phone"
                      required
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      class="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-300 mb-1">
                      Email manzilingiz <span class="text-slate-500 font-normal">(ixtiyoriy)</span>
                    </label>
                    <input
                      v-model="userForm.email"
                      type="email"
                      placeholder="parol shu pochtaga boradi"
                      class="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  class="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition active:scale-98 cursor-pointer"
                >
                  <span>Davom etish</span>
                  <ChevronRight class="w-4 h-4" />
                </button>
              </form>
            </div>

            <!-- 3. PAYMENT METHOD SELECTOR COMPONENT -->
            <div v-if="msg.type === 'payment_select' && currentStep === 3" class="mt-4 pt-3 border-t border-slate-700/60">
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  @click="handleSelectPaymentType('CLICK')"
                  class="p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-sky-950/60 border-slate-700 hover:border-sky-500 group active:scale-95"
                >
                  <div class="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs">
                    CL
                  </div>
                  <span class="font-extrabold text-xs text-white group-hover:text-sky-300">CLICK</span>
                  <span class="text-[10px] text-slate-400">Click Up orqali</span>
                </button>

                <button
                  type="button"
                  @click="handleSelectPaymentType('PAYME')"
                  class="p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-teal-950/60 border-slate-700 hover:border-teal-500 group active:scale-95"
                >
                  <div class="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xs">
                    PM
                  </div>
                  <span class="font-extrabold text-xs text-white group-hover:text-teal-300">PAYME</span>
                  <span class="text-[10px] text-slate-400">Payme ilovasida</span>
                </button>

                <button
                  type="button"
                  @click="handleSelectPaymentType('UZUM')"
                  class="p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-purple-950/60 border-slate-700 hover:border-purple-500 group active:scale-95"
                >
                  <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs">
                    UZ
                  </div>
                  <span class="font-extrabold text-xs text-white group-hover:text-purple-300">UZUM</span>
                  <span class="text-[10px] text-slate-400">Uzum Bank</span>
                </button>

                <button
                  type="button"
                  @click="handleSelectPaymentType('CARD')"
                  class="p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 bg-slate-900/80 hover:bg-indigo-950/60 border-slate-700 hover:border-indigo-500 group active:scale-95"
                >
                  <div class="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                    <CreditCard class="w-4 h-4" />
                  </div>
                  <span class="font-extrabold text-xs text-white group-hover:text-indigo-300">KARTA</span>
                  <span class="text-[10px] text-slate-400">Humo / Uzcard</span>
                </button>
              </div>
            </div>

            <!-- 4. REKVIZITLAR VA SKRINSHOT YUKLASH COMPONENT -->
            <div v-if="msg.type === 'receipt_upload' && currentStep === 4" class="mt-4 pt-3 border-t border-slate-700/60 space-y-3.5">
              <!-- Official Bank Card Box -->
              <div class="p-4 rounded-2xl bg-linear-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/40 relative overflow-hidden shadow-inner">
                <div class="flex items-center justify-between text-xs text-indigo-300 mb-2">
                  <span class="font-bold flex items-center gap-1.5">
                    <CreditCard class="w-4 h-4 text-indigo-400" />
                    Rasmiy Qabul Kartasi
                  </span>
                  <span class="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                    {{ cardDetails.bank }}
                  </span>
                </div>

                <!-- Card Number with One-Click Copy -->
                <div class="flex items-center justify-between bg-black/40 rounded-xl px-3.5 py-2.5 border border-indigo-500/30">
                  <span class="font-mono text-base sm:text-lg font-black tracking-widest text-white">
                    {{ cardDetails.number }}
                  </span>
                  <button
                    type="button"
                    @click="copyCardNumber"
                    class="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                    title="Karta raqamini nusxalash"
                  >
                    <Check v-if="copiedText" class="w-3.5 h-3.5 text-emerald-300" />
                    <Copy v-else class="w-3.5 h-3.5" />
                    <span>{{ copiedText ? "Nusxalandi!" : "Nusxa" }}</span>
                  </button>
                </div>

                <div class="mt-2.5 flex items-center justify-between text-xs text-slate-300">
                  <div>
                    <span class="text-[10px] text-slate-400 block">Qabul qiluvchi:</span>
                    <span class="font-bold text-white">{{ cardDetails.holder }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-[10px] text-slate-400 block">To'lov summasi:</span>
                    <span class="font-black text-emerald-400 text-sm">
                      {{ selectedCourse?.price.toLocaleString('uz-UZ') }} so'm
                    </span>
                  </div>
                </div>
              </div>

              <!-- SCREENSHOT DROPZONE / UPLOADER -->
              <div>
                <label class="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span class="flex items-center gap-1.5">
                    <ImageIcon class="w-3.5 h-3.5 text-indigo-400" />
                    To'lov cheki skrinshotini yuklang <span class="text-rose-400">*</span>
                  </span>
                  <span class="text-[10px] text-slate-400 font-normal">
                    (Ctrl+V orqali joylashtirish mumkin)
                  </span>
                </label>

                <!-- When Screenshot is Selected -->
                <div v-if="receiptImage" class="p-3 rounded-2xl bg-slate-900 border border-emerald-500/50 space-y-2.5">
                  <div class="relative rounded-xl overflow-hidden bg-black/50 max-h-56 border border-slate-800 flex items-center justify-center">
                    <img :src="receiptImage" alt="Chek skrinshoti" class="max-h-56 object-contain" />
                    <button
                      type="button"
                      @click="removeScreenshot"
                      class="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
                    >
                      Boshqa rasm tanlash
                    </button>
                  </div>
                  <div class="flex items-center justify-between text-xs text-emerald-400 font-bold px-1">
                    <span class="flex items-center gap-1.5">
                      <CheckCircle2 class="w-4 h-4" />
                      Skrinshot biriktirildi
                    </span>
                    <span class="text-slate-400 text-[11px] font-normal">
                      {{ receiptFile?.name || "Rasm fayli" }}
                    </span>
                  </div>
                </div>

                <!-- Empty Dropzone State -->
                <label
                  v-else
                  class="group border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-900/50 hover:bg-slate-900"
                >
                  <input
                    type="file"
                    accept="image/*"
                    @change="onFileSelected"
                    class="hidden"
                  />
                  <div class="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 group-hover:scale-110 flex items-center justify-center mb-2 transition-transform">
                    <Upload class="w-6 h-6" />
                  </div>
                  <div class="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300">
                    Chek rasmini bu yerga tashlang yoki tanlang
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1 max-w-xs">
                    PNG, JPG, WEBP yoki telefondan olingan skrinshot
                  </p>
                </label>
              </div>

              <!-- Optional Note Input -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">
                  Qo'shimcha izoh <span class="text-slate-500 font-normal">(ixtiyoriy)</span>
                </label>
                <input
                  v-model="paymentNote"
                  type="text"
                  placeholder="Masalan: Karta egasi Rustam B."
                  class="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <!-- Error Notification -->
              <div v-if="submitError" class="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {{ submitError }}
              </div>

              <!-- Submit Button -->
              <button
                type="button"
                @click="submitPaymentWithReceipt"
                :disabled="isSubmitting || !receiptImage"
                class="w-full py-3.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-600/25 transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span v-if="isSubmitting">Yuborilmoqda...</span>
                <span v-else>To'lov chekini tasdiqlash uchun yuborish</span>
                <Send v-if="!isSubmitting" class="w-4 h-4" />
              </button>
            </div>

            <!-- 5. FINAL RESULT / RECEIPT CARD -->
            <div v-if="msg.type === 'receipt_result' && msg.meta" class="mt-4 pt-3 border-t border-slate-700/60 space-y-3">
              <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-2.5 text-xs">
                <div class="flex items-center justify-between text-slate-400">
                  <span>Chek raqami:</span>
                  <span class="font-mono font-black text-indigo-400 text-sm">#NYV-{{ msg.meta.paymentId }}</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>Kurs nomi:</span>
                  <span class="font-bold text-white">{{ msg.meta.courseName }}</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>To'lov summasi:</span>
                  <span class="font-extrabold text-emerald-400">{{ Number(msg.meta.amount).toLocaleString('uz-UZ') }} so'm</span>
                </div>
                <div class="flex items-center justify-between text-slate-400">
                  <span>Holati:</span>
                  <span class="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md">
                    <Clock class="w-3 h-3 animate-spin" />
                    Admin tasdiqlashi kutilmoqda
                  </span>
                </div>
              </div>

              <div class="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed flex items-start gap-2.5">
                <Info class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  Admin to'lovni tasdiqlashi bilan <b class="text-white">{{ userForm.phone }}</b> raqamingizga va pochtangizga o'quvchi kabinetining login va paroli yuboriladi.
                </div>
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  @click="goBackToLanding"
                  class="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-98 cursor-pointer text-center"
                >
                  Bosh sahifaga qaytish
                </button>
                <button
                  type="button"
                  @click="restartCheckout"
                  class="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition active:scale-98 cursor-pointer"
                  title="Yana boshqa kurs tanlash"
                >
                  <RotateCcw class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Timestamp & Status -->
          <div class="text-[10px] text-slate-400 px-2 flex items-center gap-1 font-mono">
            <span>{{ msg.time }}</span>
            <span v-if="msg.sender === 'user'">• Yuborildi</span>
          </div>
        </div>

        <!-- Bot Typing Indicator -->
        <div v-if="isBotTyping" class="flex items-start gap-2">
          <div class="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles class="w-4 h-4" />
          </div>
          <div class="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
            <span>Assistent yozmoqda</span>
            <span class="inline-flex gap-1 items-center ml-1">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
            </span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
