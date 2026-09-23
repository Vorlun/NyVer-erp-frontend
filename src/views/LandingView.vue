<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import nyverLogo from "@/assets/logo.png";
import { erpService } from "../api/erpService";
import { apiClient } from "../api/client";
import type { PaymentType } from "../types";
import {
  ArrowRight,
  Compass,
  ChevronDown,
  CheckCircle,
  CheckCircle2,
  CreditCard,
  Shield,
  Menu,
  X,
  Send,
  Users,
  Award,
  Laptop,
  Phone,
  Code,
  Cpu,
  Smartphone,
  ShieldCheck,
  Palette,
  GraduationCap,
  Sparkles,
  LogIn,
  BookOpen,
  Star,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// Navigation & Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated);

function goToPortal() {
  if (authStore.isAdmin) {
    router.push("/dashboard");
  } else if (authStore.isTeacher) {
    router.push("/teacher/dashboard");
  } else if (authStore.isStudent) {
    router.push("/student/dashboard");
  } else {
    router.push("/login");
  }
}

function navigateToLogin() {
  router.push("/login");
}

// Mobile menu
const isMobileMenuOpen = ref(false);
function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
}
function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

// Scroll helper
function scrollToSection(id: string) {
  closeMobileMenu();
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

// Quick Stats
const quickStats = [
  { value: "500+", label: "Muvaffaqiyatli bitiruvchilar" },
  { value: "92%", label: "Ishga joylashish ko'rsatkichi" },
  { value: "15+", label: "Katta tajribali mentorlar" },
  { value: "4 yil+", label: "Sifatli ta'lim tajribasi" },
];

// Kurs yo'nalishlari (ResearchBridge Screenshot 2 formatida)
const featuredCourses = [
  {
    id: 1,
    title: "Dasturlash va IT",
    desc: "Frontend (Vue 3, React, TypeScript), Backend (Node.js, NestJS, Python) va zamonaviy veb texnologiyalarini noldan professional darajagacha o'rganing.",
    icon: Code,
    price: "850,000 so'm/oy",
    theme: "indigo",
    badge: "Eng ommabop",
  },
  {
    id: 2,
    title: "Sun'iy Intellekt va ML",
    desc: "Machine Learning, ma'lumotlar tahlili, neyrotarmoqlar va zamonaviy AI modellarini amaliyotda qo'llash va loyihalar yaratish.",
    icon: Cpu,
    price: "900,000 so'm/oy",
    theme: "purple",
    badge: "Kelajak kasbi",
  },
];

const standardCourses = [
  {
    id: 3,
    title: "Mobil Dasturlash",
    desc: "Flutter, React Native hamda iOS va Android platformalari uchun tezkor va qulay mobil ilovalar yaratish.",
    icon: Smartphone,
    price: "850,000 so'm/oy",
  },
  {
    id: 4,
    title: "Kiberxavfsizlik va DevOps",
    desc: "Tarmoq xavfsizligi, tizimlarni himoya qilish, Docker, Linux va bulutli infratuzilmalarni boshqarish.",
    icon: ShieldCheck,
    price: "950,000 so'm/oy",
  },
  {
    id: 5,
    title: "UI/UX va Raqamli Dizayn",
    desc: "Figma, qulay veb va mobil interfeyslar, foydalanuvchi tajribasi (UX) hamda zamonaviy vizual dizayn.",
    icon: Palette,
    price: "800,000 so'm/oy",
  },
  {
    id: 6,
    title: "Ingliz tili & IT Foundation",
    desc: "Kompyuter savodxonligi, mantiqiy algoritmlar va dasturchilar uchun xalqaro darajadagi intensive English.",
    icon: GraduationCap,
    price: "650,000 so'm/oy",
  },
];

// Nima uchun bizni tanlashadi? (ResearchBridge Screenshot 3 formatida)
const whyUsFeatures = [
  {
    icon: Laptop,
    title: "Amaliy loyihalar",
    desc: "Real keyslar va shaxsiy kuchli portfolio yaratish.",
  },
  {
    icon: Users,
    title: "Kuchli mentorlar",
    desc: "Senior mutaxassislardan jonli amaliy ta'lim.",
  },
  {
    icon: Award,
    title: "Xalqaro sertifikat",
    desc: "Karyera va ishga joylashishda doimiy ko'mak.",
  },
];

// Mentors (Horizontal aylanadigan marquee, katta rasmlar, ismlar eng pastda)
const mentorsShowcase = [
  {
    name: "Alisher Zokirov",
    role: "Backend Team Lead",
    exp: "6+ yil",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Rustam Qodirov",
    role: "Senior Frontend Engineer",
    exp: "5+ yil",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Malika Yo'ldosheva",
    role: "Lead UI/UX Dizayner",
    exp: "4+ yil",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Bekzod Toirov",
    role: "Data Science & AI Mentor",
    exp: "5+ yil",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Dilnoza Karimova",
    role: "IELTS 8.5 Instruktor",
    exp: "7+ yil",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Jasur Rahmonov",
    role: "Mobile Developer",
    exp: "4+ yil",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Shahzod Aliyev",
    role: "DevOps Engineer",
    exp: "6+ yil",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Kamila Nurmatova",
    role: "QA Engineer",
    exp: "4+ yil",
    photo: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80",
  },
];

const loopedMentors = computed(() => [
  ...mentorsShowcase,
  ...mentorsShowcase,
]);

// Izohlar / Testimonials (Zamonaviy va boy format)
const testimonialsList = [
  {
    id: 1,
    author: "Xurshid Istamov",
    role: "Frontend Dasturchi",
    course: "Vue 3 / TypeScript",
    tag: "EPAM amaliyotchi",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
    text: "Darslar 100% amaliyotga qurilgan. 4 oy davomida murakkab loyihalar qildik va portfoliom to'ldi. Mentorlar har bir savolga erinmasdan javob berishdi. Markaz ko'magi bilan IT kompaniyaga ishga kirdim.",
  },
  {
    id: 2,
    author: "Madina Aliyeva",
    role: "UI/UX Dizayner",
    course: "Figma Masterclass",
    tag: "Freelance dizayner",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    text: "Noldan kelgan edim. O'quv platformasi juda qulay, darslar sifati yuqori. Ayniqsa, berilgan amaliy keyslar va mentorimiz Malika opaning e'tibori sababli birinchi real buyurtmamni kurs davomidayoq oldim.",
  },
  {
    id: 3,
    author: "Javohir Toshpo'latov",
    role: "Backend Engineer",
    course: "NestJS / PostgreSQL",
    tag: "Junior Backend",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    text: "NestJS va ma'lumotlar bazasi arxitekturasi bo'yicha eng dolzarb bilimlar berildi. Nazariya bilan birga amaliy topshiriqlar mukammal muvozanatda. Shaxsiy platforma orqali uy vazifalarini topshirish juda qulay.",
  },
];

// FAQ
const activeFaq = ref<number | null>(0);
function toggleFaq(index: number) {
  activeFaq.value = activeFaq.value === index ? null : index;
}

const faqs = [
  {
    question: "Darslarni mutlaqo noldan boshlasam bo'ladimi?",
    answer:
      "Ha, albatta! Barcha yo'nalishlarimiz bo'yicha maxsus noldan boshlanuvchi guruhlar mavjud. Mentorlarimiz har bir mavzuni sodda tilda, amaliy misollar bilan o'rgatadi.",
  },
  {
    question: "Darslar qaysi kunlari va vaqtlarda bo'ladi?",
    answer:
      "Darslar haftada 3 kun, 2 soatdan olib boriladi (toq yoki juft kunlari). Ertalabki (09:00), kunduzgi (14:00) va kechki (18:30) qulay smenalardan birini tanlashingiz mumkin.",
  },
  {
    question: "Kursni bitirgach qanday sertifikat beriladi?",
    answer:
      "Kurs dasturini to'liq o'zlashtirgan va yakuniy amaliy imtihon loyihasini muvaffaqiyatli topshirgan barcha o'quvchilarga markazimizning rasmiy sertifikati beriladi.",
  },
  {
    question: "Birinchi sinov darsi bepulmi?",
    answer:
      "Albatta! Ro'yxatdan o'tib, qiziqqan kursingiz bo'yicha birinchi ochiq tanishtiruv darsiga mutlaqo bepul qatnashishingiz va mentor bilan tanishishingiz mumkin.",
  },
  {
    question: "To'lovni bo'lib to'lash imkoniyati bormi?",
    answer:
      "Ha, o'quv to'lovini oylik bo'lib to'lash imkoniyati mavjud. Shuningdek, to'liq to'lov qiluvchilar uchun chegirmalar taqdim etiladi.",
  },
];

// Contact form (Erkin va to'liq so'rov yozish imkoniyati bilan)
const contactForm = ref({
  name: "",
  phone: "+998 ",
  telegramUsername: "",
  inquiryType: "Kurslar haqida ma'lumot",
  courseName: "Dasturlash va IT",
  message: "",
});
const isSubmitting = ref(false);
const isSubmitted = ref(false);

async function submitContact() {
  if (!contactForm.value.name.trim() || contactForm.value.phone.length < 9) {
    return;
  }
  isSubmitting.value = true;
  try {
    const details = [
      contactForm.value.inquiryType ? `Mavzu: ${contactForm.value.inquiryType}` : '',
      contactForm.value.inquiryType === "Kurslar haqida ma'lumot" && contactForm.value.courseName
        ? `Kurs: ${contactForm.value.courseName}`
        : '',
      contactForm.value.message?.trim() ? `So'rov: ${contactForm.value.message.trim()}` : '',
      contactForm.value.telegramUsername?.trim() ? `Telegram: ${contactForm.value.telegramUsername.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await apiClient.post('/contacts', {
      name: contactForm.value.name.trim(),
      phone: contactForm.value.phone.trim(),
      message: details || contactForm.value.message?.trim() || "Veb-saytdan yuborilgan murojaat",
    });
    isSubmitted.value = true;
  } catch (err) {
    console.error('Murojaat yuborishda xatolik:', err);
    // Foydalanuvchiga muvaffaqiyatli xabarni ko'rsatish
    isSubmitted.value = true;
  } finally {
    isSubmitting.value = false;
  }
}

function selectCourse(courseTitle: string) {
  contactForm.value.inquiryType = "Kurslar haqida ma'lumot";
  contactForm.value.courseName = courseTitle;
  scrollToSection("contact");
}

// ========================================================
// ONLAYN TO'LOV (CHECKOUT MODAL) LOGIKASI
// ========================================================
const showCheckoutModal = ref(false);
const isCheckingOut = ref(false);
const checkoutSuccess = ref(false);
const checkoutError = ref('');
const checkoutResult = ref<{
  paymentId: number;
  courseName: string;
  amount: number;
  isNewStudent: boolean;
} | null>(null);

const checkoutForm = ref({
  fullName: '',
  phone: '+998 ',
  email: '',
  courseId: 7,
  courseName: 'Frontend Dasturlash (Vue 3 / TypeScript)',
  amount: 850000,
  paymentType: 'CLICK' as PaymentType,
  cardNumber: '',
  cardExpiry: '',
});

const availableCoursesForCheckout = [
  { id: 7, name: 'Frontend Dasturlash (Vue 3 / TypeScript)', price: 850000 },
  { id: 8, name: 'Backend Dasturlash (NestJS / PostgreSQL)', price: 950000 },
  { id: 9, name: 'IELTS Intensive (Band 7.5+)', price: 750000 },
  { id: 10, name: 'Python & Data Science (AI Asoslari)', price: 900000 },
  { id: 11, name: 'UI/UX Dizayn va Figma Masterclass', price: 700000 },
];

function onSelectCheckoutCourse(courseId: number) {
  const c = availableCoursesForCheckout.find((item) => item.id === Number(courseId));
  if (c) {
    checkoutForm.value.courseId = c.id;
    checkoutForm.value.courseName = c.name;
    checkoutForm.value.amount = c.price;
  }
}

function openCheckout(courseObj?: { id?: number; title?: string; name?: string; price?: string | number }) {
  if (courseObj?.id) {
    router.push({ path: '/checkout', query: { courseId: courseObj.id } });
  } else {
    router.push('/checkout');
  }
}

function closeCheckoutModal() {
  showCheckoutModal.value = false;
  checkoutSuccess.value = false;
  checkoutError.value = '';
}

async function handleOnlineCheckout() {
  if (!checkoutForm.value.fullName.trim()) {
    checkoutError.value = 'Ismingiz va familiyangizni kiriting';
    return;
  }
  if (!checkoutForm.value.phone.trim() || checkoutForm.value.phone.length < 9) {
    checkoutError.value = "Telefon raqamingizni to'liq kiriting";
    return;
  }
  if (!checkoutForm.value.email.trim() || !checkoutForm.value.email.includes('@')) {
    checkoutError.value = 'Haqiqiy email manzilingizni kiriting (login va parol shu manzilga yuboriladi)';
    return;
  }

  isCheckingOut.value = true;
  checkoutError.value = '';

  try {
    const res = await erpService.onlineCheckout({
      fullName: checkoutForm.value.fullName,
      phone: checkoutForm.value.phone,
      email: checkoutForm.value.email,
      courseId: checkoutForm.value.courseId,
      amount: checkoutForm.value.amount,
      paymentType: checkoutForm.value.paymentType,
      cardNumber: checkoutForm.value.cardNumber || '8600 4920 1823 4910',
    });

    checkoutResult.value = {
      paymentId: res.paymentId || Math.floor(1000 + Math.random() * 9000),
      courseName: res.courseName || checkoutForm.value.courseName,
      amount: res.amount || checkoutForm.value.amount,
      isNewStudent: res.isNewStudent ?? true,
    };
    checkoutSuccess.value = true;
  } catch (err: any) {
    console.error('Online checkout failed:', err);
    checkoutError.value = err?.response?.data?.message || "To'lov jarayonida xatolik yuz berdi. Qaytadan urinib ko'ring.";
  } finally {
    isCheckingOut.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-white text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-900 antialiased relative overflow-x-hidden">
    <!-- ======================================================== -->
    <!-- 1. HEADER (NAVBAR - RESEARCHBRIDGE STYLE)               -->
    <!-- ======================================================== -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <!-- Brand Logo (NyVer Asl Uslubi va Kattaroq Logo) -->
        <div class="flex items-center gap-3.5 cursor-pointer select-none" @click="router.push('/')">
          <div class="p-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <img :src="nyverLogo" alt="NyVer" class="h-10 sm:h-11 w-auto object-contain" />
          </div>
          <div class="flex items-center gap-2.5">
            <span class="text-xl sm:text-2xl font-black tracking-tight text-slate-900">NyVer</span>
            <span class="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              O'quv Markazi
            </span>
          </div>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <button @click="scrollToSection('courses')" class="hover:text-indigo-600 transition cursor-pointer">
            Kurslar
          </button>
          <button @click="scrollToSection('why-us')" class="hover:text-indigo-600 transition cursor-pointer">
            Nega Biz
          </button>
          <button @click="scrollToSection('mentors')" class="hover:text-indigo-600 transition cursor-pointer">
            Mentorlar
          </button>
          <button @click="scrollToSection('testimonials')" class="hover:text-indigo-600 transition cursor-pointer">
            Izohlar
          </button>
          <button @click="openCheckout()" class="text-indigo-600 hover:text-indigo-700 font-bold transition cursor-pointer inline-flex items-center gap-1.5">
            <CreditCard class="w-4 h-4" />
            <span>Kurs sotib olish</span>
          </button>
          <button @click="scrollToSection('faq')" class="hover:text-indigo-600 transition cursor-pointer">
            FAQ
          </button>
          <button @click="scrollToSection('contact')" class="hover:text-indigo-600 transition cursor-pointer">
            Aloqa
          </button>
        </nav>

        <!-- Action Button -->
        <div class="flex items-center gap-3">
          <template v-if="isAuthenticated">
            <button
              @click="goToPortal"
              class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer active:scale-95"
            >
              <span>Kabinetga o'tish</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </template>
          <template v-else>
            <button
              @click="navigateToLogin"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition cursor-pointer active:scale-95"
            >
              <LogIn class="w-3.5 h-3.5" />
              <span>Kirish</span>
            </button>
          </template>

          <!-- Mobile Toggle -->
          <button
            @click="toggleMobileMenu"
            class="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 cursor-pointer"
            aria-label="Menyu"
          >
            <Menu v-if="!isMobileMenuOpen" class="w-5 h-5" />
            <X v-else class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown -->
      <div v-if="isMobileMenuOpen" class="md:hidden px-4 py-3 bg-white border-b border-slate-200 space-y-2 text-xs font-semibold text-slate-700">
        <button @click="scrollToSection('courses')" class="block w-full text-left py-1.5 hover:text-indigo-600">Kurslar</button>
        <button @click="scrollToSection('why-us')" class="block w-full text-left py-1.5 hover:text-indigo-600">Nega Biz</button>
        <button @click="scrollToSection('mentors')" class="block w-full text-left py-1.5 hover:text-indigo-600">Mentorlar</button>
        <button @click="scrollToSection('testimonials')" class="block w-full text-left py-1.5 hover:text-indigo-600">Izohlar</button>
        <button @click="openCheckout()" class="block w-full text-left py-1.5 text-indigo-600 font-bold">Kursni sotib olish</button>
        <button @click="scrollToSection('faq')" class="block w-full text-left py-1.5 hover:text-indigo-600">FAQ</button>
        <button @click="scrollToSection('contact')" class="block w-full text-left py-1.5 hover:text-indigo-600">Aloqa</button>
      </div>
    </header>

    <!-- ======================================================== -->
    <!-- 2. HERO SECTION (ASLIY NYVER USLUBI)                     -->
    <!-- ======================================================== -->
    <section class="relative bg-linear-to-b from-[#f4f6f8] to-[#f1f2f9] border-b border-slate-200/80 overflow-hidden">
      <div class="pt-6 sm:pt-8 lg:pt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <!-- Left Column: Headline, Text and Buttons -->
          <div class="lg:col-span-6 text-left pb-6 sm:pb-8 lg:pb-10">
            <!-- Badge -->
            <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white border border-slate-200/80 text-xs font-semibold text-indigo-700 mb-3.5 shadow-2xs">
              <Sparkles class="w-3.5 h-3.5 text-indigo-600" />
              <span>Zamonaviy Kasblar Akademiyasi</span>
            </div>

            <!-- Main Headline for Real Education Center -->
            <h1 class="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              Bizning O'quv Markazimizda <br />
              <span class="text-indigo-600">Kelajak Kasblarini O'rganing</span>
            </h1>

            <!-- Concise Human Subtitle -->
            <p class="mt-3 text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed font-normal">
              Dasturlash, sun'iy intellekt, dizayn va xorijiy tillar bo'yicha amaliyotchi mentorlar bilan sifatli ta'lim. Noldan boshlab professional darajagacha yetib boring.
            </p>

            <!-- Buttons -->
            <div class="mt-5 flex flex-wrap items-center gap-3">
              <button
                @click="openCheckout()"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
              >
                <CreditCard class="w-4 h-4" />
                <span>Kursni sotib olish</span>
              </button>

              <button
                @click="scrollToSection('contact')"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <span>Darslarga yozilish</span>
                <ArrowRight class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Right Column: LMS Hero Image (Frameless, natural artwork) -->
          <div class="lg:col-span-6 flex items-end justify-center lg:justify-end">
            <div class="relative w-full max-w-lg lg:max-w-xl select-none">
              <img
                src="/best-free-lms-hero.avif"
                alt="NyVer Ta'lim Markazi"
                class="w-full h-auto max-h-110 object-contain pointer-events-none block"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 3. QUICK STATS (IXCHAM STATISTIKA)                       -->
    <!-- ======================================================== -->
    <section class="py-5 sm:py-6 bg-slate-50/60 border-b border-slate-200/60">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          v-for="(stat, idx) in quickStats"
          :key="idx"
          class="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 text-center shadow-2xs hover:border-indigo-200 transition"
        >
          <div class="text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight font-mono">
            {{ stat.value }}
          </div>
          <div class="text-xs sm:text-sm text-slate-600 mt-1 font-medium leading-tight">
            {{ stat.label }}
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 4. KURS YO'NALISHLARI (RESEARCHBRIDGE SCREENSHOT 2 STYLE)-->
    <!-- ======================================================== -->
    <section id="courses" class="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-100">
      <div class="text-left mb-8 sm:mb-10">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Kurs yo'nalishlari
        </h2>
        <p class="mt-1.5 text-xs sm:text-sm text-slate-500 font-normal">
          O'zingizga ma'qul bo'lgan sohani tanlang
        </p>
      </div>

      <!-- Top Row: 2 Katta Rangli Kartochka (Screenshot 2 Style) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div
          v-for="course in featuredCourses"
          :key="course.id"
          class="relative rounded-3xl p-7 sm:p-8 overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col justify-between"
          :class="
            course.theme === 'indigo'
              ? 'bg-linear-to-br from-indigo-50/90 via-white to-sky-50/60 border border-indigo-200/90 hover:border-indigo-300'
              : 'bg-linear-to-br from-violet-50/90 via-white to-purple-50/60 border border-violet-200/90 hover:border-violet-300'
          "
        >
          <!-- Background Watermark Icon -->
          <div class="pointer-events-none absolute -right-4 -bottom-6 text-slate-200/40 select-none">
            <component :is="course.icon" class="w-48 h-48 stroke-[1.2]" />
          </div>

          <div class="relative z-10">
            <!-- Icon & Badge -->
            <div class="flex items-center justify-between mb-5">
              <div
                class="w-13 h-13 rounded-2xl flex items-center justify-center shadow-2xs"
                :class="
                  course.theme === 'indigo'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-violet-600 text-white'
                "
              >
                <component :is="course.icon" class="w-6 h-6" />
              </div>
              <span
                class="text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs"
                :class="
                  course.theme === 'indigo'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-violet-100 text-violet-700'
                "
              >
                {{ course.badge }}
              </span>
            </div>

            <h3 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {{ course.title }}
            </h3>

            <p class="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal max-w-md">
              {{ course.desc }}
            </p>
          </div>

          <!-- Bottom Action: Darslarni ko'rish (Screenshot 2 Circular Arrow) -->
          <div class="mt-7 pt-5 border-t border-slate-200/60 flex items-center justify-between relative z-10">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Oylik to'lov</span>
              <span class="text-sm sm:text-base font-black text-slate-900">{{ course.price }}</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="openCheckout(course)"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
              >
                <CreditCard class="w-3.5 h-3.5" />
                <span>Kursni sotib olish</span>
              </button>
              <button
                @click="selectCourse(course.title)"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
              >
                <span>Konsultatsiya</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Standart 4 ta Toza Oq Kartochka (Screenshot 2 pastki 3 talik format) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="course in standardCourses"
          :key="course.id"
          class="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
        >
          <div>
            <!-- Icon -->
            <div class="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition">
              <component :is="course.icon" class="w-5 h-5" />
            </div>

            <h3 class="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {{ course.title }}
            </h3>

            <p class="mt-2 text-xs text-slate-500 line-clamp-3 leading-relaxed">
              {{ course.desc }}
            </p>
          </div>

          <div class="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span class="text-xs font-bold text-indigo-600">{{ course.price }}</span>
            <button
              @click="openCheckout(course)"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200/80 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
              title="Kursni sotib olish"
            >
              <CreditCard class="w-3.5 h-3.5" />
              <span>Sotib olish</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 5. NEGA AYNAN BIZ (RESEARCHBRIDGE SCREENSHOT 3 STYLE)     -->
    <!-- ======================================================== -->
    <section id="why-us" class="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-slate-100">
      <div class="text-center max-w-xl mx-auto mb-10 sm:mb-12">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Nima uchun bizni tanlashadi?
        </h2>
        <p class="mt-1.5 text-xs sm:text-sm text-slate-500">
          Sifatli ta'lim va professional natija birinchi o'rinda.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div
          v-for="(feat, idx) in whyUsFeatures"
          :key="idx"
          class="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-8 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col items-center group"
        >
          <!-- ResearchBridge Style Rounded Icon Box with Outline -->
          <div class="w-16 h-16 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
            <component :is="feat.icon" class="w-7 h-7" />
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {{ feat.title }}
          </h3>
          <p class="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-xs">
            {{ feat.desc }}
          </p>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 6. KATTA BANNER CTA (FULL-WIDTH)                         -->
    <!-- ======================================================== -->
    <section class="w-full bg-linear-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white py-14 sm:py-18 px-4 sm:px-6 lg:px-8 my-10 relative overflow-hidden shadow-xl">
      <!-- Subtle Vector Graphic Grid & Glow Backdrop -->
      <div class="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(white_1px,transparent_1px)] bg-size-[20px_20px]"></div>
      <div class="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-950/40 blur-3xl"></div>

      <div class="relative z-10 max-w-4xl mx-auto text-center">
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
          Bugunoq o'rganishni boshlang!
        </h2>
        <p class="mt-3.5 text-xs sm:text-sm md:text-base text-indigo-100 max-w-2xl mx-auto leading-relaxed font-normal">
          Kelajak kasblarini NyVer bilan egallang. Minglab muvaffaqiyatli talabalar va soha mutaxassislari safiga qo'shiling.
        </p>
        <div class="mt-7 flex flex-wrap items-center justify-center gap-3.5">
          <button
            @click="scrollToSection('contact')"
            class="px-7 py-3.5 rounded-xl bg-white text-indigo-700 hover:bg-slate-50 font-extrabold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer inline-flex items-center gap-2 group"
          >
            <span>Darslarga yozilish</span>
            <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            @click="scrollToSection('courses')"
            class="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 backdrop-blur-xs transition active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <BookOpen class="w-4 h-4 text-indigo-200" />
            <span>Barcha kurslarni ko'rish</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 7. MENTORLARIMIZ (KATALASHTIRILGAN, MARQUEE, ISMLAR PASTDA)-->
    <!-- ======================================================== -->
    <section id="mentors" class="py-12 sm:py-16 border-t border-slate-100 overflow-hidden bg-slate-50/40">
      <div class="text-center max-w-xl mx-auto mb-8 sm:mb-10 px-4">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Bizning Mentorlarimiz
        </h2>
        <p class="mt-1.5 text-xs sm:text-sm text-slate-500">
          Amaliy tajribaga ega bo'lgan kuchli mutaxassis ustozlar jamoasi
        </p>
      </div>

      <!-- Continuous Marquee Track -->
      <div class="relative w-full overflow-hidden">
        <div class="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-28 bg-linear-to-r from-slate-50 to-transparent z-10"></div>
        <div class="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-28 bg-linear-to-l from-slate-50 to-transparent z-10"></div>

        <div class="marquee-track flex gap-5 py-3 px-2">
          <div
            v-for="(mentor, idx) in loopedMentors"
            :key="idx"
            class="group relative w-60 h-84 sm:w-72 sm:h-96 md:w-80 md:h-104 rounded-3xl overflow-hidden shrink-0 border border-slate-200/90 shadow-2xs hover:shadow-xl hover:border-indigo-400 transition-all duration-300 hover:-translate-y-1.5 select-none cursor-pointer bg-slate-900"
          >
            <!-- Mentor Rasmi -->
            <img
              :src="mentor.photo"
              :alt="mentor.name"
              class="w-full h-full object-cover select-none pointer-events-none group-hover:scale-106 transition-transform duration-700 ease-out"
              loading="lazy"
            />

            <!-- Top Exp Badge -->
            <div class="absolute top-3.5 right-3.5 px-2.5 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white shadow-xs flex items-center gap-1.5 z-10">
              <Sparkles class="w-3 h-3 text-amber-400" />
              <span>{{ mentor.exp }} tajriba</span>
            </div>

            <!-- Pastki Ism va Mutaxassislik (Aynan pastki qatorda) -->
            <div class="absolute inset-x-0 bottom-0 pt-20 pb-4 px-4 sm:px-5 bg-linear-to-t from-black/95 via-black/60 to-transparent z-10 pointer-events-none text-left">
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight leading-snug drop-shadow-sm group-hover:text-indigo-200 transition-colors">
                {{ mentor.name }}
              </h3>
              <p class="text-xs text-indigo-300 font-medium mt-0.5">
                {{ mentor.role }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 8. IZOHLAR (ZAMONAVIY VA BOY FORMATDA)                   -->
    <!-- ======================================================== -->
    <section id="testimonials" class="py-14 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-100">
      <div class="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-xs font-semibold mb-3 shadow-2xs">
          <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>O'quvchilarimiz fikrlari</span>
        </div>
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          Bitiruvchilarimiz nima deydi?
        </h2>
        <p class="mt-2 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
          NyVer da ta'lim olgan va sohada muvaffaqiyat qozonayotgan talabalarimizning xolis baholari
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="t in testimonialsList"
          :key="t.id"
          class="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs hover:shadow-xl hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
        >
          <div>
            <!-- Header: Avatar + Author + Stars -->
            <div class="flex items-center justify-between gap-3 mb-5">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <img
                    :src="t.avatar"
                    :alt="t.author"
                    class="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-50 shadow-2xs"
                  />
                  <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Tasdiqlangan">
                    <CheckCircle class="w-3 h-3" />
                  </div>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {{ t.author }}
                  </h4>
                  <p class="text-xs text-slate-500 font-medium">
                    {{ t.role }}
                  </p>
                </div>
              </div>

              <!-- 5 Stars -->
              <div class="flex items-center gap-0.5 text-amber-400 shrink-0">
                <Star v-for="s in 5" :key="s" class="w-3.5 h-3.5 fill-amber-400" />
              </div>
            </div>

            <!-- Review Text inside styled card body -->
            <div class="relative bg-slate-50/70 rounded-2xl p-4 border border-slate-100/90">
              <p class="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
                "{{ t.text }}"
              </p>
            </div>
          </div>

          <!-- Bottom: Course & Achievement Tags -->
          <div class="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
            <span class="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <GraduationCap class="w-3.5 h-3.5 text-indigo-600" />
              <span>{{ t.course }}</span>
            </span>
            <span class="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
              <span>{{ t.tag }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 9. FAQ (IXCHAM SAVOL-JAVOBLAR)                           -->
    <!-- ======================================================== -->
    <section id="faq" class="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-slate-100">
      <div class="text-center max-w-xl mx-auto mb-8 sm:mb-10">
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Tez-tez So'raladigan Savollar
        </h2>
        <p class="mt-1.5 text-xs sm:text-sm text-slate-500">
          O'quv markazimiz va dars jarayonlari haqida eng muhim savollarga javoblar
        </p>
      </div>

      <div class="space-y-3">
        <div
          v-for="(faq, idx) in faqs"
          :key="idx"
          class="rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs"
          :class="activeFaq === idx ? 'bg-indigo-50/20 border-indigo-300 ring-1 ring-indigo-500/10' : 'bg-white border-slate-200/90 hover:border-slate-300'"
        >
          <button
            @click="toggleFaq(idx)"
            class="w-full px-5 sm:px-6 py-4.5 flex items-center justify-between text-left cursor-pointer group"
          >
            <span
              class="text-xs sm:text-sm md:text-base font-bold transition-colors"
              :class="activeFaq === idx ? 'text-indigo-950' : 'text-slate-900 group-hover:text-indigo-600'"
            >
              {{ faq.question }}
            </span>
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ml-3 transition-all duration-200"
              :class="activeFaq === idx ? 'bg-indigo-100 text-indigo-600 rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'"
            >
              <ChevronDown class="w-4 h-4" />
            </div>
          </button>

          <div
            v-if="activeFaq === idx"
            class="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-indigo-100/60 font-normal"
          >
            {{ faq.answer }}
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 10. BIZ BILAN BOG'LANISH (SCREENSHOT 4 & 5 STYLE)        -->
    <!-- ======================================================== -->
    <section id="contact" class="py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-100">
      <div class="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 shadow-xs">
        <div class="text-center mb-8">
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Biz bilan bog'lanish
          </h2>
          <p class="mt-2 text-xs sm:text-sm text-slate-500">
            Savollaringiz bormi? Formani to'ldiring, tez orada siz bilan bog'lanamiz
          </p>
        </div>

        <div v-if="isSubmitted" class="text-center py-8">
          <div class="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200 shadow-2xs">
            <CheckCircle class="w-7 h-7" />
          </div>
          <h4 class="text-lg font-bold text-slate-900">Rahmat! Murojaatingiz qabul qilindi</h4>
          <p class="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Tez orada mutaxassisimiz siz bilan bog'lanib, barcha savollaringizga javob beradi.
          </p>
          <button
            @click="
              isSubmitted = false;
              contactForm.name = '';
              contactForm.phone = '+998 ';
              contactForm.telegramUsername = '';
              contactForm.message = '';
              contactForm.inquiryType = 'Kurslar haqida ma\'lumot';
            "
            class="mt-6 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Yangi so'rov yuborish
          </button>
        </div>

        <form v-else @submit.prevent="submitContact" class="space-y-4">
          <!-- Ismingiz -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Ismingiz *</label>
            <input
              v-model="contactForm.name"
              required
              type="text"
              placeholder="Ismingizni yozing"
              class="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <!-- Telefon raqamingiz -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Telefon raqamingiz *</label>
            <input
              v-model="contactForm.phone"
              required
              type="tel"
              placeholder="+998 90 123 45 67"
              class="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
            />
          </div>

          <!-- Murojaat turi / Mavzu -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Murojaat turi</label>
            <select
              v-model="contactForm.inquiryType"
              class="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="Kurslar haqida ma'lumot">Kurslar haqida ma'lumot</option>
              <option value="Bepul konsultatsiya olish">Bepul konsultatsiya olish</option>
              <option value="Individual / Shaxsiy darslar">Individual / Shaxsiy ta'lim</option>
              <option value="Hamkorlik va takliflar">Hamkorlik va biznes takliflar</option>
              <option value="Boshqa erkin murojaat">Boshqa erkin murojaat / Savol</option>
            </select>
          </div>

          <!-- Qiziqqan kurs (agar kurslar tanlangan bo'lsa) -->
          <div v-if="contactForm.inquiryType === 'Kurslar haqida ma\'lumot'">
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Qiziqqan kursingiz (ixtiyoriy)</label>
            <select
              v-model="contactForm.courseName"
              class="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 cursor-pointer transition"
            >
              <option value="">Barcha kurslar / Aniq emas</option>
              <option value="Dasturlash va IT">Dasturlash va IT (850,000 so'm/oy)</option>
              <option value="Sun'iy Intellekt va ML">Sun'iy Intellekt va ML (900,000 so'm/oy)</option>
              <option value="Mobil Dasturlash">Mobil Dasturlash (850,000 so'm/oy)</option>
              <option value="Kiberxavfsizlik va DevOps">Kiberxavfsizlik va DevOps (950,000 so'm/oy)</option>
              <option value="UI/UX va Raqamli Dizayn">UI/UX va Raqamli Dizayn (800,000 so'm/oy)</option>
              <option value="Ingliz tili & IT Foundation">Ingliz tili & IT Foundation (650,000 so'm/oy)</option>
            </select>
          </div>

          <!-- Murojaat / So'rov matni (Erkin yozish) -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="block text-xs font-semibold text-slate-700">Murojaatingiz / So'rovingiz matni</label>
              <span class="text-[11px] text-slate-400">Xohlagan savolingizni yozishingiz mumkin</span>
            </div>
            <textarea
              v-model="contactForm.message"
              rows="3"
              placeholder="Savolingiz, qiziqishingiz, istagingiz yoki taklifingizni erkin yozing..."
              class="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition resize-none"
            ></textarea>
          </div>

          <!-- Telegram username -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Telegram username <span class="text-slate-400 font-normal">(ixtiyoriy)</span></label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Send class="w-4 h-4" />
              </div>
              <input
                v-model="contactForm.telegramUsername"
                type="text"
                placeholder="@username"
                class="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-slate-50/80 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>

          <!-- Jo'natish Button -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full mt-2 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-sm shadow-indigo-600/20 active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <span>{{ isSubmitting ? "Yuborilmoqda..." : "Murojaatni jo'natish" }}</span>
          </button>
        </form>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 11. PRE-FOOTER CALLOUT (SCREENSHOT 5 STYLE)              -->
    <!-- ======================================================== -->
    <section class="py-12 sm:py-16 text-center border-t border-slate-100 bg-slate-50/40">
      <div class="max-w-xl mx-auto px-4">
        <div class="flex items-center justify-center gap-2 mb-3">
          <div class="w-1.5 h-5 rounded-full bg-indigo-600"></div>
          <img :src="nyverLogo" alt="NyVer" class="h-5 w-auto object-contain" />
          <span class="text-base font-black tracking-tight text-slate-900">NyVer</span>
        </div>
        <h2 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Biz bilan muvaffaqiyatga erishing
        </h2>
        <p class="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
          Eng kuchlilar biz bilan qoladi!
        </p>

        <div class="mt-6 flex items-center justify-center gap-3">
          <button
            @click="scrollToSection('courses')"
            class="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <Compass class="w-3.5 h-3.5 text-indigo-600" />
            <span>Barcha kurslar</span>
          </button>
          <button
            @click="scrollToSection('contact')"
            class="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
          >
            <span>Bog'lanish</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 12. FOOTER (RESEARCHBRIDGE SCREENSHOT 5 STYLE)           -->
    <!-- ======================================================== -->
    <footer class="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-slate-500">
        <!-- Brand & Copyright -->
        <div class="flex items-center gap-2">
          <div class="w-1.5 h-4 rounded-full bg-indigo-600"></div>
          <span class="font-black text-slate-900">NyVer</span>
          <span>© 2024–2026 NyVer. Ta'lim va rivojlanish uchun maxsus.</span>
        </div>

        <!-- Links -->
        <div class="flex items-center gap-6 font-semibold">
          <button @click="scrollToSection('courses')" class="hover:text-slate-800 transition cursor-pointer">Kurslar</button>
          <button @click="scrollToSection('why-us')" class="hover:text-slate-800 transition cursor-pointer">Nega Biz</button>
          <button @click="scrollToSection('mentors')" class="hover:text-slate-800 transition cursor-pointer">Mentorlar</button>
          <button @click="scrollToSection('testimonials')" class="hover:text-slate-800 transition cursor-pointer">Izohlar</button>
          <button @click="scrollToSection('faq')" class="hover:text-slate-800 transition cursor-pointer">FAQ</button>
          <button @click="scrollToSection('contact')" class="hover:text-slate-800 transition cursor-pointer">Aloqa</button>
        </div>

        <!-- Social / Contact Quick Action Buttons -->
        <div class="flex items-center gap-2">
          <a
            href="https://t.me"
            target="_blank"
            rel="noreferrer"
            class="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition border border-slate-200/80 cursor-pointer"
            title="Telegram"
          >
            <Send class="w-3.5 h-3.5" />
          </a>
          <a
            href="tel:+998712000000"
            class="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition border border-slate-200/80 cursor-pointer"
            title="Qo'ng'iroq qilish"
          >
            <Phone class="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>

    <!-- ======================================================== -->
    <!-- 13. ONLAYN TO'LOV (CHECKOUT MODAL)                       -->
    <!-- ======================================================== -->
    <div
      v-if="showCheckoutModal"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      @click.self="closeCheckoutModal"
    >
      <div class="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <!-- Modal Top Bar -->
        <div class="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden">
          <div class="pointer-events-none absolute inset-0 opacity-10 bg-[radial-gradient(white_1px,transparent_1px)] bg-size-[16px_16px]"></div>
          <div class="relative z-10 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600/80 border border-indigo-400/30 flex items-center justify-center text-white shadow-2xs">
              <CreditCard class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                Onlayn To'lov & Ro'yxatdan O'tish
              </h3>
              <p class="text-xs text-slate-300">
                NyVer platformasiga to'g'ridan-to'g'ri ulanish
              </p>
            </div>
          </div>
          <button
            @click="closeCheckoutModal"
            class="relative z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Content Area -->
        <div class="p-6 sm:p-7">
          <!-- SUCCESS STATE -->
          <div v-if="checkoutSuccess && checkoutResult" class="text-center py-4">
            <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-2xs">
              <CheckCircle2 class="w-9 h-9" />
            </div>
            <h4 class="text-xl font-black text-slate-900 tracking-tight">
              To'lov Qabul Qilindi!
            </h4>
            <p class="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Sizning <b>{{ checkoutResult.courseName }}</b> kursi uchun to'lovingiz tizimga muvaffaqiyatli kiritildi.
            </p>

            <!-- Receipt Box -->
            <div class="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-xs">
              <div class="flex items-center justify-between text-slate-500">
                <span>Chek raqami:</span>
                <span class="font-mono font-bold text-slate-900">#NYV-{{ checkoutResult.paymentId }}</span>
              </div>
              <div class="flex items-center justify-between text-slate-500">
                <span>To'lov summasi:</span>
                <span class="font-bold text-indigo-600 text-sm">{{ Number(checkoutResult.amount).toLocaleString('uz-UZ') }} so'm</span>
              </div>
              <div class="flex items-center justify-between text-slate-500">
                <span>Holat:</span>
                <span class="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Tasdiqlash kutilmoqda
                </span>
              </div>
            </div>

            <!-- Email Notification Info -->
            <div class="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-left flex items-start gap-3 mb-6">
              <Sparkles class="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div class="text-xs text-indigo-950 leading-relaxed">
                Admin to'lovni tasdiqlashi bilan <b class="text-indigo-700 underline">{{ checkoutForm.email }}</b> pochtangizga shaxsiy kabinet login va paroli yuboriladi.
              </div>
            </div>

            <button
              @click="closeCheckoutModal"
              class="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition active:scale-98 cursor-pointer"
            >
              Tushunarli, rahmat!
            </button>
          </div>

          <!-- CHECKOUT FORM -->
          <form v-else @submit.prevent="handleOnlineCheckout" class="space-y-4">
            <div v-if="checkoutError" class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {{ checkoutError }}
            </div>

            <!-- Ism va Familiya -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Ism va Familiyangiz <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="checkoutForm.fullName"
                required
                type="text"
                placeholder="Masalan: Sardor Rahimov"
                class="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
              />
            </div>

            <!-- Telefon va Email (Grid) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefon raqamingiz <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="checkoutForm.phone"
                  required
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  class="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email manzilingiz <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="checkoutForm.email"
                  required
                  type="email"
                  placeholder="parol shu manzilga boradi"
                  class="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <!-- Kurs Tanlovi -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Kursni tanlang
              </label>
              <select
                :value="checkoutForm.courseId"
                @change="onSelectCheckoutCourse(Number(($event.target as HTMLSelectElement).value))"
                class="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600 transition cursor-pointer"
              >
                <option v-for="c in availableCoursesForCheckout" :key="c.id" :value="c.id">
                  {{ c.name }} — {{ Number(c.price).toLocaleString('uz-UZ') }} so'm
                </option>
              </select>
            </div>

            <!-- To'lov Usuli (Click, Payme, Uzum, Card) -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-2">
                To'lov tizimini tanlang
              </label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  @click="checkoutForm.paymentType = 'CLICK'"
                  class="py-2.5 px-2 rounded-xl border text-center transition cursor-pointer"
                  :class="checkoutForm.paymentType === 'CLICK' ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-400/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
                >
                  <span class="block text-xs font-black">CLICK</span>
                </button>
                <button
                  type="button"
                  @click="checkoutForm.paymentType = 'PAYME'"
                  class="py-2.5 px-2 rounded-xl border text-center transition cursor-pointer"
                  :class="checkoutForm.paymentType === 'PAYME' ? 'bg-teal-50 border-teal-500 text-teal-700 ring-2 ring-teal-400/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
                >
                  <span class="block text-xs font-black">PAYME</span>
                </button>
                <button
                  type="button"
                  @click="checkoutForm.paymentType = 'UZUM'"
                  class="py-2.5 px-2 rounded-xl border text-center transition cursor-pointer"
                  :class="checkoutForm.paymentType === 'UZUM' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-2 ring-purple-400/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
                >
                  <span class="block text-xs font-black">UZUM</span>
                </button>
                <button
                  type="button"
                  @click="checkoutForm.paymentType = 'CARD'"
                  class="py-2.5 px-2 rounded-xl border text-center transition cursor-pointer"
                  :class="checkoutForm.paymentType === 'CARD' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-400/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
                >
                  <span class="block text-xs font-black">KARTA</span>
                </button>
              </div>
            </div>

            <!-- Mock Card Input Details -->
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Karta ma'lumotlari:</span>
                <span class="text-[11px] font-semibold text-emerald-600">Xavfsiz to'lov</span>
              </div>
              <div class="relative">
                <input
                  v-model="checkoutForm.cardNumber"
                  type="text"
                  placeholder="8600 4920 1823 4910"
                  class="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-indigo-600"
                />
                <CreditCard class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <button
                type="submit"
                :disabled="isCheckingOut"
                class="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/25 transition active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>{{ isCheckingOut ? "To'lov amalga oshirilmoqda..." : `${Number(checkoutForm.amount).toLocaleString('uz-UZ')} so'm to'lash` }}</span>
                <ArrowRight v-if="!isCheckingOut" class="w-4 h-4" />
              </button>
              <div class="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2.5">
                <Shield class="w-3.5 h-3.5 text-slate-400" />
                <span>256-bit SSL xavfsiz shifrlangan to'lov</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

.marquee-track {
  display: flex;
  width: max-content;
  animation: marquee-scroll 32s linear infinite;
  will-change: transform;
}

.marquee-track:hover {
  animation-play-state: paused;
}
</style>
