<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNotificationsStore } from '../../stores/notifications';
import Pagination from '../../components/ui/Pagination.vue';
import {
  Send,
  Users,
  CheckCircle2,
  Globe,
  UserCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  History,
  Check,
  Search,
  Trash2,
  Repeat,
  MessageSquare,
  Phone,
  Bell,
  Wifi,
  BookOpen,
  Award,
  Shield,
} from 'lucide-vue-next';

const notificationsStore = useNotificationsStore();

// ─── Active Tab: 'broadcast' | 'templates' | 'history' ──────────────────────
const activeTab = ref<'broadcast' | 'templates' | 'history'>('broadcast');

// ─── Broadcast State ────────────────────────────────────────────────────────
const target = ref<'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS'>('ALL');
const channels = ref<('IN_APP' | 'SMS' | 'TELEGRAM')[]>(['IN_APP', 'SMS']);
const messageTitle = ref('');
const messageText = ref('');
const sending = ref(false);
const sentSuccess = ref(false);

interface BroadcastHistoryItem {
  id: string | number;
  target: string;
  targetKey: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS';
  title: string;
  text: string;
  channels: ('IN_APP' | 'SMS' | 'TELEGRAM')[];
  sentAt: string;
  status: string;
}

const historyList = ref<BroadcastHistoryItem[]>([
  {
    id: 1,
    target: 'Barcha foydalanuvchilar (Hammaga)',
    targetKey: 'ALL',
    title: 'Platformadagi yangilanishlar',
    text: 'Hurmatli talabalar va ustozlar, tizimda yangi qulayliklar va jonli bildirishnomalar ishga tushirildi.',
    channels: ['IN_APP', 'SMS'],
    sentAt: 'Bugun, 14:20',
    status: 'Yetkazildi',
  },
  {
    id: 2,
    target: 'Qarzdor talabalar',
    targetKey: 'DEBTORS',
    title: 'O\'qish to\'lovi eslatmasi',
    text: 'Hurmatli o\'quvchi, joriy oy uchun o\'qish to\'lovini amalga oshirishingizni so\'raymiz.',
    channels: ['SMS'],
    sentAt: 'Kecha, 18:00',
    status: 'Yetkazildi',
  },
  {
    id: 3,
    target: 'Barcha o\'qituvchilar',
    targetKey: 'TEACHERS',
    title: 'Yangi dars jadvali tasdiqlandi',
    text: 'Hurmatli ustozlar, yangi guruhlar dars jadvali tizimga kiritildi. Tanishib chiqing.',
    channels: ['IN_APP'],
    sentAt: 'Kecha, 11:30',
    status: 'Yetkazildi',
  },
  {
    id: 4,
    target: 'Barcha talabalar',
    targetKey: 'STUDENTS',
    title: 'Oraliq imtihon sanasi',
    text: 'Eslatma: Shanba kuni soat 14:00 da oraliq nazorat imtihoni bo\'lib o\'tadi. Kechikmang.',
    channels: ['IN_APP', 'SMS'],
    sentAt: '24-Sentabr, 10:15',
    status: 'Yetkazildi',
  },
  {
    id: 5,
    target: 'Barcha foydalanuvchilar (Hammaga)',
    targetKey: 'ALL',
    title: 'Nyver Hackathon 2026',
    text: 'O\'quv markazimizning yillik katta xakatoni uchun arizalar qabuli boshlandi!',
    channels: ['IN_APP', 'TELEGRAM'],
    sentAt: '22-Sentabr, 16:40',
    status: 'Yetkazildi',
  },
]);

// ─── History Filter & Pagination ────────────────────────────────────────────
const historySearch = ref('');
const historyTargetFilter = ref<'ALL_TARGETS' | 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS'>('ALL_TARGETS');
const historyPage = ref(1);
const historyPageSize = ref(4);

const filteredHistory = computed(() => {
  return historyList.value.filter((item) => {
    if (historyTargetFilter.value !== 'ALL_TARGETS' && item.targetKey !== historyTargetFilter.value) {
      return false;
    }
    if (historySearch.value.trim()) {
      const q = historySearch.value.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const historyTotalPages = computed(() => Math.ceil(filteredHistory.value.length / historyPageSize.value) || 1);
const paginatedHistory = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize.value;
  return filteredHistory.value.slice(start, start + historyPageSize.value);
});

function deleteHistoryItem(id: string | number) {
  historyList.value = historyList.value.filter((h) => h.id !== id);
}

function resendHistoryItem(item: BroadcastHistoryItem) {
  messageTitle.value = item.title;
  messageText.value = item.text;
  target.value = item.targetKey;
  channels.value = [...item.channels];
  activeTab.value = 'broadcast';
}

function toggleChannel(ch: 'IN_APP' | 'SMS' | 'TELEGRAM') {
  if (channels.value.includes(ch)) {
    if (channels.value.length > 1) {
      channels.value = channels.value.filter((c) => c !== ch);
    }
  } else {
    channels.value.push(ch);
  }
}

function handleSendBroadcast() {
  if (!messageText.value.trim()) return;
  sending.value = true;

  const targetLabel =
    target.value === 'ALL'
      ? 'Hammaga (Barcha foydalanuvchilar)'
      : target.value === 'STUDENTS'
      ? 'Barcha talabalar'
      : target.value === 'TEACHERS'
      ? 'Barcha o\'qituvchilar'
      : 'Qarzdor talabalar';

  const titleToSend = messageTitle.value.trim() || 'Nyver Markazi Xabarnomasi';
  const textToSend = messageText.value.trim();

  // Send into store (synced over WebSocket & BroadcastChannel)
  notificationsStore.sendBroadcast({
    title: titleToSend,
    message: textToSend,
    target: target.value,
    channels: channels.value,
    priority: 'NORMAL',
  });

  setTimeout(() => {
    historyList.value.unshift({
      id: Date.now(),
      target: targetLabel,
      targetKey: target.value,
      title: titleToSend,
      text: textToSend,
      channels: [...channels.value],
      sentAt: 'Hozirgina',
      status: 'Yetkazildi',
    });

    sending.value = false;
    sentSuccess.value = true;
    messageTitle.value = '';
    messageText.value = '';

    setTimeout(() => {
      sentSuccess.value = false;
    }, 3000);
  }, 300);
}

// ─── Templates Management ───────────────────────────────────────────────────
const savedTplId = ref<string | null>(null);
const testedTplId = ref<string | null>(null);

// Comprehensive Automated Templates
const systemTemplates = ref([
  {
    key: 'HOMEWORK_ASSIGNED',
    category: 'STUDENT',
    icon: BookOpen,
    title: 'Uyga Vazifa Berildi',
    roleTag: 'Talabaga',
    roleColor: 'bg-violet-50 text-[#6D28D9] border-violet-200',
    description: 'Ustoz guruhga yangi uyga vazifa yuklaganida talaba paneliga yuboriladi',
    sampleTitle: 'Yangi uyga vazifa yuklandi',
    sampleText: 'Frontend Dasturlash: "Vue 3 Reaktivlik topshirig\'i" berildi. Belgilangan muddatgacha topshiring.',
  },
  {
    key: 'HOMEWORK_REVIEWED',
    category: 'STUDENT',
    icon: CheckCircle2,
    title: 'Uyga Vazifa Tekshirildi',
    roleTag: 'Talabaga',
    roleColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Ustoz vazifani tekshirib ball qo\'yganida va coin taqdim etilganda',
    sampleTitle: 'Uyga vazifangiz tekshirildi',
    sampleText: 'Topshiriq baholandi: 95 ball! A\'lo natija uchun sizga +3 Nyver Coin berildi.',
  },
  {
    key: 'EXAM_SCORED',
    category: 'STUDENT',
    icon: Award,
    title: 'Imtihon Natijasi',
    roleTag: 'Talabaga',
    roleColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Oraliq yoki modul imtihon bahosi e\'lon qilinganda',
    sampleTitle: 'Imtihon natijasi e\'lon qilindi',
    sampleText: 'HTML/CSS modul imtihonida 88 ball to\'pladingiz. Mukofot: +2 Nyver Coin.',
  },
  {
    key: 'COIN_AWARDED',
    category: 'STUDENT',
    icon: Sparkles,
    title: 'Coin Mukofoti Berildi',
    roleTag: 'Talabaga',
    roleColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Admin tomonidan maxsus rag\'batlantirish yoki faollik uchun coin qo\'shilganda',
    sampleTitle: '+5 Nyver Coin taqdim etildi! 🪙',
    sampleText: 'Tabriklaymiz! Guruhdagi namunali faolligingiz uchun balansingizga +5 coin qo\'shildi.',
  },
  {
    key: 'TEACHER_HOMEWORK_SUBMITTED',
    category: 'TEACHER',
    icon: UserCheck,
    title: 'Vazifa Tekshirishga Topshirildi',
    roleTag: 'Ustozga',
    roleColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Talaba uyga vazifasini topshirganda ustoz paneliga eslatma tushadi',
    sampleTitle: 'Yangi uyga vazifa topshirildi',
    sampleText: 'Jasur Bekmirzayev "Vue Router Navigation" topshirig\'ini tekshirish uchun yubordi.',
  },
  {
    key: 'ADMIN_REQUEST',
    category: 'ADMIN',
    icon: Shield,
    title: 'Adminga So\'rov / Sovg\'a Xaridi',
    roleTag: 'Adminga',
    roleColor: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Talaba sovrin buyurtma qilganda yoki yangi to\'lov kvitansiyasini yuklaganda',
    sampleTitle: 'Yangi sovg\'a so\'rovi qabul qilindi',
    sampleText: 'Shahlo Karimova (164 coin) Smart Termos sovg\'asini olish uchun ariza yubordi.',
  },
]);

function testTemplateTrigger(tpl: typeof systemTemplates.value[0]) {
  testedTplId.value = tpl.key;

  let targetRole: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS' = 'STUDENTS';
  if (tpl.category === 'TEACHER') targetRole = 'TEACHERS';
  else if (tpl.category === 'ADMIN') targetRole = 'ALL';

  notificationsStore.sendBroadcast({
    title: tpl.sampleTitle,
    message: tpl.sampleText,
    target: targetRole,
    channels: ['IN_APP', 'SMS'],
    priority: 'IMPORTANT',
    sourceEvent: tpl.key,
  });

  setTimeout(() => {
    testedTplId.value = null;
  }, 1500);
}

function saveCustomTemplate(key: string) {
  savedTplId.value = key;
  setTimeout(() => {
    savedTplId.value = null;
  }, 1500);
}
</script>

<template>
  <div class="space-y-6 max-w-6xl mx-auto font-sans pb-16">
    <!-- Top Header & Real-time WebSocket Status -->
    <div class="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="h-12 w-12 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center shrink-0">
          <Send class="h-6 w-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Xabar Yuborish & Bildirishnomalar
            </h1>
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors"
              :class="
                notificationsStore.isWebSocketConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-violet-50 text-[#6D28D9] border-violet-200'
              "
            >
              <Wifi class="h-3 w-3" />
              <span>{{ notificationsStore.isWebSocketConnected ? 'Jonli WebSocket faol' : 'Real-time faol' }}</span>
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">
            Ommaviy xabarlar, avtomatlashtirilgan doimiy tizim shablonlari va jonli yetkazish markazi
          </p>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold self-start md:self-auto">
        <button
          @click="activeTab = 'broadcast'"
          type="button"
          class="px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'broadcast' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'"
        >
          <Send class="h-3.5 w-3.5" />
          <span>Xabar Yuborish</span>
        </button>

        <button
          @click="activeTab = 'templates'"
          type="button"
          class="px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'templates' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'"
        >
          <Sparkles class="h-3.5 w-3.5" />
          <span>Doimiy Shablonlar</span>
        </button>

        <button
          @click="activeTab = 'history'"
          type="button"
          class="px-3.5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          :class="activeTab === 'history' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'"
        >
          <History class="h-3.5 w-3.5" />
          <span>Yuborilganlar</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {{ historyList.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- ─── TAB 1: XABAR YUBORISH (MINIMALIST & CLEAN) ──────────────────────── -->
    <div v-if="activeTab === 'broadcast'" class="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs space-y-6">
      <!-- Success Banner -->
      <div
        v-if="sentSuccess"
        class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fadeIn"
      >
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <span>Xabar muvaffaqiyatli tarqatildi va foydalanuvchilar panellariga yetkazildi!</span>
      </div>

      <form @submit.prevent="handleSendBroadcast" class="space-y-6">
        <!-- 1. Audience Selector -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Kimga Yuborilsin? (Auditoriya):
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              @click="target = 'ALL'"
              class="p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2"
              :class="target === 'ALL' ? 'bg-violet-50/70 border-[#6D28D9] text-[#6D28D9] ring-2 ring-[#6D28D9]/20' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <Globe class="h-4 w-4" />
                <span class="h-2 w-2 rounded-full" :class="target === 'ALL' ? 'bg-[#6D28D9]' : 'bg-slate-200'"></span>
              </div>
              <div>
                <p class="text-xs font-bold leading-tight">Hammaga</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Barcha rollar</p>
              </div>
            </button>

            <button
              type="button"
              @click="target = 'STUDENTS'"
              class="p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2"
              :class="target === 'STUDENTS' ? 'bg-violet-50/70 border-[#6D28D9] text-[#6D28D9] ring-2 ring-[#6D28D9]/20' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <Users class="h-4 w-4" />
                <span class="h-2 w-2 rounded-full" :class="target === 'STUDENTS' ? 'bg-[#6D28D9]' : 'bg-slate-200'"></span>
              </div>
              <div>
                <p class="text-xs font-bold leading-tight">O'quvchilarga</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Barcha talabalar</p>
              </div>
            </button>

            <button
              type="button"
              @click="target = 'TEACHERS'"
              class="p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2"
              :class="target === 'TEACHERS' ? 'bg-violet-50/70 border-[#6D28D9] text-[#6D28D9] ring-2 ring-[#6D28D9]/20' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <UserCheck class="h-4 w-4" />
                <span class="h-2 w-2 rounded-full" :class="target === 'TEACHERS' ? 'bg-[#6D28D9]' : 'bg-slate-200'"></span>
              </div>
              <div>
                <p class="text-xs font-bold leading-tight">O'qituvchilarga</p>
                <p class="text-[10px] text-slate-400 mt-0.5">Barcha mentorlar</p>
              </div>
            </button>

            <button
              type="button"
              @click="target = 'DEBTORS'"
              class="p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2"
              :class="target === 'DEBTORS' ? 'bg-rose-50/70 border-rose-500 text-rose-700 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <div class="flex items-center justify-between">
                <AlertTriangle class="h-4 w-4 text-rose-500" />
                <span class="h-2 w-2 rounded-full" :class="target === 'DEBTORS' ? 'bg-rose-500' : 'bg-slate-200'"></span>
              </div>
              <div>
                <p class="text-xs font-bold leading-tight">Qarzdorlarga</p>
                <p class="text-[10px] text-slate-400 mt-0.5">To'lovi kechikkanlar</p>
              </div>
            </button>
          </div>
        </div>

        <!-- 2. Delivery Channels -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Yetkazish Kanallari:
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              @click="toggleChannel('IN_APP')"
              class="px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-2"
              :class="channels.includes('IN_APP') ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
            >
              <Bell class="h-3.5 w-3.5" />
              <span>Tizim ichida (In-App)</span>
            </button>

            <button
              type="button"
              @click="toggleChannel('SMS')"
              class="px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-2"
              :class="channels.includes('SMS') ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
            >
              <Phone class="h-3.5 w-3.5" />
              <span>SMS Xabarnoma</span>
            </button>

            <button
              type="button"
              @click="toggleChannel('TELEGRAM')"
              class="px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-2"
              :class="channels.includes('TELEGRAM') ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
            >
              <MessageSquare class="h-3.5 w-3.5" />
              <span>Telegram Bot</span>
            </button>
          </div>
        </div>

        <!-- 3. Message Content -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Sarlavha (Ixtiyoriy):
            </label>
            <input
              v-model="messageTitle"
              type="text"
              placeholder="Masalan: Muhim E'lon yoki Dars Jadvali O'zgarishi..."
              class="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#6D28D9] focus:outline-none transition font-medium"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">
              Xabar Matni: <span class="text-rose-500">*</span>
            </label>
            <textarea
              v-model="messageText"
              rows="4"
              required
              placeholder="Foydalanuvchilarga yuboriladigan aniq va toza xabar matnini yozing..."
              class="w-full p-3.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#6D28D9] focus:outline-none transition leading-relaxed font-medium"
            ></textarea>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            :disabled="sending || !messageText.trim()"
            class="px-6 py-3 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-2"
          >
            <Send class="h-4 w-4" />
            <span>{{ sending ? 'Yuborilmoqda...' : 'Xabarni Tarqatish' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ─── TAB 2: DOIMIY SHABLONLAR (AUTOMATED SYSTEM TEMPLATES) ──────────── -->
    <div v-if="activeTab === 'templates'" class="space-y-4">
      <div class="bg-violet-50/60 border border-violet-100 rounded-2xl p-4 flex items-center justify-between text-xs text-violet-900">
        <div class="flex items-center gap-2.5">
          <Sparkles class="h-4 w-4 text-[#6D28D9] shrink-0" />
          <span>
            Quyidagi doimiy shablonlar tizimda sodir bo'ladigan hodisalar (uy vazifasi, imtihon, coin, sovg'a) paytida avtomatik tarzda yuboriladi. Har birini sinab ko'rishingiz mumkin.
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="tpl in systemTemplates"
          :key="tpl.key"
          class="bg-white rounded-xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <component :is="tpl.icon" class="h-4 w-4 text-[#6D28D9]" />
                <h3 class="text-sm font-bold text-slate-900">{{ tpl.title }}</h3>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border" :class="tpl.roleColor">
                {{ tpl.roleTag }}
              </span>
            </div>

            <p class="text-xs text-slate-500 leading-snug">{{ tpl.description }}</p>

            <!-- Editable Sample Text -->
            <div class="space-y-1.5 pt-1">
              <span class="text-[11px] font-bold text-slate-600">Shablon matni:</span>
              <textarea
                v-model="tpl.sampleText"
                rows="2"
                class="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-[#6D28D9] focus:outline-none transition leading-relaxed font-medium"
              ></textarea>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              @click="testTemplateTrigger(tpl)"
              type="button"
              class="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles class="h-3.5 w-3.5 text-amber-500" />
              <span>{{ testedTplId === tpl.key ? 'Jonli Yuborildi!' : 'Sinab ko\'rish' }}</span>
            </button>

            <button
              @click="saveCustomTemplate(tpl.key)"
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Check v-if="savedTplId === tpl.key" class="h-3.5 w-3.5" />
              <span>{{ savedTplId === tpl.key ? 'Saqlandi!' : 'Saqlash' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── TAB 3: YUBORILGANLAR TARIXI (UPGRADED CRISP UI + PAGINATION) ───── -->
    <div v-if="activeTab === 'history'" class="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
      <!-- Toolbar: Title, Search, Audience Filter -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>Yuborilgan Xabarnomalar Jurnali</span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {{ filteredHistory.length }} ta
            </span>
          </h2>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Audience Filter -->
          <select
            v-model="historyTargetFilter"
            class="px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL_TARGETS">Barcha Auditoriyalar</option>
            <option value="ALL">Hammaga</option>
            <option value="STUDENTS">O'quvchilarga</option>
            <option value="TEACHERS">O'qituvchilarga</option>
            <option value="DEBTORS">Qarzdorlarga</option>
          </select>

          <!-- Search -->
          <div class="relative w-full sm:w-48">
            <Search class="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="historySearch"
              type="text"
              placeholder="Qidirish..."
              class="w-full pl-7.5 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none transition"
            />
          </div>
        </div>
      </div>

      <!-- History Cards List -->
      <div v-if="paginatedHistory.length > 0" class="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
        <div
          v-for="item in paginatedHistory"
          :key="item.id"
          class="p-4 sm:p-4.5 bg-white hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
        >
          <div class="space-y-1.5 min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-black text-slate-900 text-sm">{{ item.title }}</span>

              <!-- Audience Pill -->
              <span
                class="px-2 py-0.5 rounded-md text-[11px] font-bold border"
                :class="
                  item.targetKey === 'DEBTORS'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : item.targetKey === 'TEACHERS'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : item.targetKey === 'STUDENTS'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-violet-50 text-[#6D28D9] border-violet-200'
                "
              >
                {{ item.target }}
              </span>

              <!-- Channels Pills -->
              <div class="flex items-center gap-1">
                <span
                  v-for="ch in item.channels"
                  :key="ch"
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1"
                >
                  <Bell v-if="ch === 'IN_APP'" class="h-2.5 w-2.5" />
                  <Phone v-else-if="ch === 'SMS'" class="h-2.5 w-2.5" />
                  <MessageSquare v-else class="h-2.5 w-2.5" />
                  <span>{{ ch === 'IN_APP' ? 'In-App' : ch }}</span>
                </span>
              </div>

              <!-- Timestamp -->
              <span class="text-xs text-slate-400 font-medium flex items-center gap-1 ml-auto md:ml-0">
                <Clock class="h-3 w-3" />
                <span>{{ item.sentAt }}</span>
              </span>
            </div>

            <p class="text-slate-600 font-medium line-clamp-2 leading-relaxed text-xs">
              {{ item.text }}
            </p>
          </div>

          <!-- Actions & Status -->
          <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
            <span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>{{ item.status }}</span>
            </span>

            <button
              @click="resendHistoryItem(item)"
              type="button"
              class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Qayta yuborish uchun tahrirlash"
            >
              <Repeat class="h-3.5 w-3.5" />
            </button>

            <button
              @click="deleteHistoryItem(item.id)"
              type="button"
              class="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
              title="O'chirish"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="py-12 text-center text-xs text-slate-400">
        Hech qanday yuborilgan xabarnoma topilmadi
      </div>

      <!-- Numeric Pagination Component -->
      <Pagination
        v-model:currentPage="historyPage"
        :totalPages="historyTotalPages"
        :totalItems="filteredHistory.length"
        :pageSize="historyPageSize"
      />
    </div>
  </div>
</template>
