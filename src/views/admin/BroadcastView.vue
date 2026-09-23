<script setup lang="ts">
import { ref } from 'vue';
import {
  Send,
  Users,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
} from 'lucide-vue-next';
import Badge from '../../components/ui/Badge.vue';

const recipientGroup = ref('all_students');
const messageText = ref('');
const sending = ref(false);
const showSuccess = ref(false);

const history = ref([
  {
    id: 1,
    target: 'Barcha talabalar (52 nafar)',
    text: 'Eslatma: Ertaga o\'quv markazida bayram munosabati bilan darslar soat 10:00 dan boshlanadi.',
    sentAt: 'Bugun, 14:20',
    status: 'YETKAZILDI',
    count: 52,
  },
  {
    id: 2,
    target: 'Qarzdor talabalar (104 nafar)',
    text: 'Hurmatli o\'quvchi, joriy oy uchun o\'qish to\'lovini amalga oshirishingizni so\'raymiz.',
    sentAt: 'Kecha, 18:00',
    status: 'YETKAZILDI',
    count: 104,
  },
  {
    id: 3,
    target: 'Barcha o\'qituvchilar (8 nafar)',
    text: 'Hurmatli ustozlar, yangi guruhlar dars jadvali tasdiqlandi. Tizim orqali tanishib chiqing.',
    sentAt: '08-Sentyabr, 11:30',
    status: 'YETKAZILDI',
    count: 8,
  },
]);

function handleSend() {
  if (!messageText.value.trim()) return;
  sending.value = true;
  setTimeout(() => {
    sending.value = false;
    showSuccess.value = true;
    history.value.unshift({
      id: Date.now(),
      target:
        recipientGroup.value === 'all_students'
          ? 'Barcha talabalar (52 nafar)'
          : recipientGroup.value === 'all_teachers'
          ? 'Barcha o\'qituvchilar (8 nafar)'
          : recipientGroup.value === 'debtors'
          ? 'Qarzdor talabalar (104 nafar)'
          : 'Markaz xodimlari',
      text: messageText.value.trim(),
      sentAt: 'Hozirgina',
      status: 'YETKAZILDI',
      count: 52,
    });
    messageText.value = '';
    setTimeout(() => {
      showSuccess.value = false;
    }, 4000);
  }, 1000);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Xabar Yuborish</h1>
      <p class="text-xs sm:text-sm text-slate-500 mt-1">
        O'quv markazi talabalari, o'qituvchilari va guruhlariga ommaviy SMS va xabarnomalar jo'natish tizimi.
      </p>
    </div>

    <!-- Main Grid: Message Composer + Recent Broadcasts -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Composer Card (2 cols) -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4">
        <h2 class="text-base font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare class="h-4 w-4 text-indigo-600" />
          Yangi SMS Xabarnoma Yaratish
        </h2>

        <!-- Recipient Selector -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Qabul qiluvchilar guruhi *</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold"
              :class="recipientGroup === 'all_students' ? 'border-[#6D28D9] bg-violet-50/70 text-[#6D28D9]' : 'border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <input type="radio" v-model="recipientGroup" value="all_students" class="sr-only" />
              <Users class="h-4 w-4" />
              <span>Barcha talabalar (52 nafar)</span>
            </label>

            <label
              class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold"
              :class="recipientGroup === 'all_teachers' ? 'border-[#6D28D9] bg-violet-50/70 text-[#6D28D9]' : 'border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <input type="radio" v-model="recipientGroup" value="all_teachers" class="sr-only" />
              <Users class="h-4 w-4" />
              <span>Barcha o'qituvchilar (8 nafar)</span>
            </label>

            <label
              class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold"
              :class="recipientGroup === 'debtors' ? 'border-[#6D28D9] bg-violet-50/70 text-[#6D28D9]' : 'border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <input type="radio" v-model="recipientGroup" value="debtors" class="sr-only" />
              <AlertTriangle class="h-4 w-4 text-amber-600" />
              <span>Qarzdor talabalar (104 nafar)</span>
            </label>

            <label
              class="flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs font-semibold"
              :class="recipientGroup === 'staff' ? 'border-[#6D28D9] bg-violet-50/70 text-[#6D28D9]' : 'border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <input type="radio" v-model="recipientGroup" value="staff" class="sr-only" />
              <Users class="h-4 w-4" />
              <span>Markaz xodimlari</span>
            </label>
          </div>
        </div>

        <!-- Text Area -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-700">SMS Matni *</label>
            <span class="text-[11px] text-slate-400 font-mono">
              {{ messageText.length }} / 160 belgi ({{ Math.ceil(messageText.length / 160) || 1 }} ta SMS)
            </span>
          </div>

          <textarea
            v-model="messageText"
            rows="5"
            placeholder="Hurmatli o'quvchi, sizga NyVer Academy markazidan xabarnoma..."
            class="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500 transition"
          ></textarea>
        </div>

        <!-- Success notification alert -->
        <div
          v-if="showSuccess"
          class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold"
        >
          <CheckCircle2 class="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Xabarlar muvaffaqiyatli jo'natildi va navbatga qo'yildi!</span>
        </div>

        <!-- Action Button -->
        <div class="flex items-center justify-between pt-2">
          <div class="text-xs text-slate-400">
            SMS yetkazish shlyuzi: <span class="text-emerald-600 font-semibold">Faol (Eskiz SMS)</span>
          </div>

          <button
            @click="handleSend"
            :disabled="sending || !messageText.trim()"
            type="button"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send class="h-3.5 w-3.5" />
            <span>{{ sending ? 'Jo\'natilmoqda...' : 'Xabarni Yuborish' }}</span>
          </button>
        </div>
      </div>

      <!-- SMS Gateway Info Card (1 col) -->
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        <h3 class="text-sm font-bold text-slate-900">SMS Balansi & Holat</h3>

        <div class="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
          <span class="text-xs text-indigo-700 font-medium">Qoldiq SMS xabarlar</span>
          <div class="text-2xl font-black text-indigo-900 mt-1">4,850 ta</div>
          <span class="text-[10px] text-indigo-500 mt-0.5 block">2026-yil litsenziya paketi</span>
        </div>

        <div class="space-y-2 text-xs text-slate-600 divide-y divide-slate-100">
          <div class="flex items-center justify-between py-1.5">
            <span>Bugun yuborildi:</span>
            <span class="font-bold text-slate-800">52 ta</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span>Yetkazilish foizi:</span>
            <span class="font-bold text-emerald-600">99.4%</span>
          </div>
          <div class="flex items-center justify-between py-1.5">
            <span>Tarif:</span>
            <span class="font-bold text-slate-800">Pro Unlimited</span>
          </div>
        </div>
      </div>
    </div>

    <!-- History Table -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">Yaqinda Yuborilgan Xabarlar Tarixi</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead class="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" class="py-3.5 px-6">Qabul qiluvchilar</th>
              <th scope="col" class="py-3.5 px-6">Xabar matni</th>
              <th scope="col" class="py-3.5 px-6">Vaqt</th>
              <th scope="col" class="py-3.5 px-6">Holati</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in history" :key="item.id" class="hover:bg-slate-50/60 transition">
              <td class="py-4 px-6 whitespace-nowrap font-bold text-slate-800">
                {{ item.target }}
              </td>
              <td class="py-4 px-6 max-w-md truncate text-slate-700">
                {{ item.text }}
              </td>
              <td class="py-4 px-6 whitespace-nowrap text-slate-500 font-mono text-xs">
                {{ item.sentAt }}
              </td>
              <td class="py-4 px-6 whitespace-nowrap">
                <Badge variant="success" class="text-[10px] font-bold px-2 py-0.5">{{ item.status }}</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
