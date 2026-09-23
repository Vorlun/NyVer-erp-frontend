<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { apiClient } from '../../api/client';
import {
  MessageSquare,
  Search,
  Phone,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-vue-next';

// ─── Types ───────────────────────────────────────────────────────────────────
type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

interface ContactRequest {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}

interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Stats {
  new: number;
  inProgress: number;
  resolved: number;
  rejected: number;
}

// ─── State ───────────────────────────────────────────────────────────────────
const contacts = ref<ContactRequest[]>([]);
const meta = ref<ApiMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
const stats = ref<Stats>({ new: 0, inProgress: 0, resolved: 0, rejected: 0 });
const loading = ref(false);
const error = ref('');

const searchQuery = ref('');
const statusFilter = ref<ContactStatus | ''>('');
const currentPage = ref(1);

const expandedIds = ref<Set<number>>(new Set());
const updatingId = ref<number | null>(null);
const deletingId = ref<number | null>(null);

let searchTimeout: ReturnType<typeof setTimeout>;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_MAP: Record<ContactStatus, { label: string; color: string; dot: string }> = {
  NEW: { label: 'Yangi', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  IN_PROGRESS: { label: "Ko'rib chiqilmoqda", color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  RESOLVED: { label: 'Hal qilindi', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rad etildi', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const NEXT_STATUS: Record<ContactStatus, ContactStatus | null> = {
  NEW: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: null,
  REJECTED: null,
};

// ─── Computed ─────────────────────────────────────────────────────────────────
const statCards = computed(() => [
  { key: '', label: 'Jami', value: meta.value.total, color: 'from-violet-600 to-indigo-600' },
  { key: 'NEW', label: 'Yangi', value: stats.value.new, color: 'from-red-500 to-rose-600' },
  { key: 'IN_PROGRESS', label: "Ko'rib chiqilmoqda", value: stats.value.inProgress, color: 'from-amber-500 to-orange-500' },
  { key: 'RESOLVED', label: 'Hal qilindi', value: stats.value.resolved, color: 'from-emerald-500 to-teal-600' },
]);

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchContacts() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, string | number> = {
      page: currentPage.value,
      limit: 20,
    };
    if (statusFilter.value) params.status = statusFilter.value;
    if (searchQuery.value.trim()) params.search = searchQuery.value.trim();

    const res = await apiClient.get('/contacts', { params });
    const body = res.data?.data ?? res.data;
    contacts.value = body.data ?? [];
    meta.value = body.meta ?? meta.value;
    stats.value = body.stats ?? stats.value;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik';
  } finally {
    loading.value = false;
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function updateStatus(contact: ContactRequest, status: ContactStatus) {
  updatingId.value = contact.id;
  try {
    await apiClient.patch(`/contacts/${contact.id}/status`, { status });
    contact.status = status;
    await refreshStats();
  } catch {
    // silently fail — re-fetch on next load
  } finally {
    updatingId.value = null;
  }
}

async function deleteContact(id: number) {
  if (!confirm("Bu murojaatni o'chirishni tasdiqlaysizmi?")) return;
  deletingId.value = id;
  try {
    await apiClient.delete(`/contacts/${id}`);
    contacts.value = contacts.value.filter(c => c.id !== id);
    meta.value.total = Math.max(0, meta.value.total - 1);
    await refreshStats();
  } catch {
    // silently fail
  } finally {
    deletingId.value = null;
  }
}

async function refreshStats() {
  try {
    const res = await apiClient.get('/contacts', { params: { limit: 1, page: 1 } });
    const body = res.data?.data ?? res.data;
    stats.value = body.stats ?? stats.value;
  } catch { /* noop */ }
}

function toggleExpand(id: number) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id);
  } else {
    expandedIds.value.add(id);
  }
}

function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1;
    fetchContacts();
  }, 400);
}

function setStatusFilter(status: ContactStatus | '') {
  statusFilter.value = status;
  currentPage.value = 1;
  fetchContacts();
}

function goToPage(p: number) {
  if (p < 1 || p > meta.value.totalPages) return;
  currentPage.value = p;
  fetchContacts();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(fetchContacts);
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">

      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <MessageSquare class="text-white" :size="20" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 leading-tight">Murojaatlar</h1>
            <p class="text-sm text-slate-500">Saytdan kelgan barcha so'rovlar</p>
          </div>
        </div>
        <button
          id="contacts-refresh-btn"
          @click="fetchContacts"
          :disabled="loading"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:border-violet-300 hover:text-violet-700 transition-all"
        >
          <RefreshCw :size="15" :class="loading ? 'animate-spin' : ''" />
          Yangilash
        </button>
      </div>

      <!-- ── Stat Cards ──────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <button
          v-for="card in statCards"
          :key="card.key"
          :id="`contacts-filter-${card.key || 'all'}`"
          @click="setStatusFilter(card.key as ContactStatus | '')"
          :class="[
            'rounded-2xl p-4 text-left transition-all group',
            statusFilter === card.key
              ? `bg-gradient-to-br ${card.color} text-white shadow-lg`
              : 'bg-white border border-slate-200 hover:border-violet-200 hover:shadow-md'
          ]"
        >
          <div :class="['text-3xl font-black mb-1', statusFilter === card.key ? 'text-white' : 'text-slate-800']">
            {{ card.value }}
          </div>
          <div :class="['text-xs font-semibold', statusFilter === card.key ? 'text-white/80' : 'text-slate-500']">
            {{ card.label }}
          </div>
        </button>
      </div>

      <!-- ── Search & Filter Bar ────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div class="relative flex-1 min-w-48">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="16" />
          <input
            id="contacts-search"
            v-model="searchQuery"
            @input="onSearch"
            type="text"
            placeholder="Ism, telefon yoki xabar bo'yicha qidirish..."
            class="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-slate-50"
          />
        </div>
        <select
          id="contacts-status-select"
          v-model="statusFilter"
          @change="setStatusFilter(statusFilter as ContactStatus | '')"
          class="px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-violet-400 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="">Barcha statuslar</option>
          <option value="NEW">Yangi</option>
          <option value="IN_PROGRESS">Ko'rib chiqilmoqda</option>
          <option value="RESOLVED">Hal qilindi</option>
          <option value="REJECTED">Rad etildi</option>
        </select>
      </div>

      <!-- ── Error ──────────────────────────────────────────── -->
      <div v-if="error" class="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
        <AlertCircle :size="16" />
        {{ error }}
      </div>

      <!-- ── Table ──────────────────────────────────────────── -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        <!-- Loading overlay -->
        <div v-if="loading" class="flex items-center justify-center py-24">
          <div class="flex flex-col items-center gap-3">
            <Loader class="text-violet-600 animate-spin" :size="32" />
            <p class="text-slate-500 text-sm">Yuklanmoqda…</p>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="contacts.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <MessageSquare class="text-slate-400" :size="28" />
          </div>
          <p class="text-slate-700 font-semibold text-lg">Murojaatlar topilmadi</p>
          <p class="text-slate-400 text-sm mt-1">Hozircha birorta murojaat kelmagan</p>
        </div>

        <!-- Table -->
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/60">
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">#</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Murojaatchi</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Xabar</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Sana</th>
              <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">Status</th>
              <th class="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <template v-for="contact in contacts" :key="contact.id">
              <tr
                class="hover:bg-slate-50/70 transition-colors group"
                :class="contact.status === 'NEW' ? 'bg-red-50/30' : ''"
              >
                <!-- ID -->
                <td class="px-5 py-4 text-slate-400 font-mono text-xs">{{ contact.id }}</td>

                <!-- Murojaatchi -->
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {{ contact.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-semibold text-slate-800 leading-tight">{{ contact.name }}</p>
                      <a :href="`tel:${contact.phone}`" class="flex items-center gap-1 text-xs text-slate-500 hover:text-violet-600 mt-0.5">
                        <Phone :size="11" />{{ contact.phone }}
                      </a>
                      <a v-if="contact.email" :href="`mailto:${contact.email}`" class="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-600 mt-0.5">
                        <Mail :size="11" />{{ contact.email }}
                      </a>
                    </div>
                  </div>
                </td>

                <!-- Xabar -->
                <td class="px-5 py-4 max-w-xs">
                  <div v-if="contact.message">
                    <p class="text-slate-700 leading-relaxed whitespace-pre-line text-xs sm:text-sm" :class="expandedIds.has(contact.id) ? '' : 'line-clamp-2'">
                      {{ contact.message }}
                    </p>
                    <button
                      v-if="contact.message.length > 80"
                      @click="toggleExpand(contact.id)"
                      class="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 mt-1 font-medium"
                    >
                      <ChevronDown v-if="!expandedIds.has(contact.id)" :size="13" />
                      <ChevronUp v-else :size="13" />
                      {{ expandedIds.has(contact.id) ? 'Kamroq' : "Ko'proq" }}
                    </button>
                  </div>
                  <span v-else class="text-slate-400 italic text-xs">Xabar yo'q</span>
                </td>

                <!-- Sana -->
                <td class="px-5 py-4">
                  <div class="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Clock :size="12" class="text-slate-400" />
                    {{ formatDate(contact.created_at) }}
                  </div>
                </td>

                <!-- Status -->
                <td class="px-5 py-4">
                  <span
                    :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', STATUS_MAP[contact.status].color]"
                  >
                    <span :class="['w-1.5 h-1.5 rounded-full', STATUS_MAP[contact.status].dot]" />
                    {{ STATUS_MAP[contact.status].label }}
                  </span>
                </td>

                <!-- Amallar -->
                <td class="px-5 py-4">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Keyingi status tugmasi -->
                    <template v-if="NEXT_STATUS[contact.status]">
                      <button
                        :id="`contact-next-status-${contact.id}`"
                        @click="updateStatus(contact, NEXT_STATUS[contact.status]!)"
                        :disabled="updatingId === contact.id"
                        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-semibold transition-all disabled:opacity-50"
                        :title="`${STATUS_MAP[NEXT_STATUS[contact.status]!].label} ga o'tkazish`"
                      >
                        <Loader v-if="updatingId === contact.id" :size="12" class="animate-spin" />
                        <CheckCircle v-else :size="12" />
                        {{ STATUS_MAP[NEXT_STATUS[contact.status]!].label }}
                      </button>
                    </template>

                    <!-- Rad etish (faqat NEW va IN_PROGRESS uchun) -->
                    <button
                      v-if="contact.status === 'NEW' || contact.status === 'IN_PROGRESS'"
                      :id="`contact-reject-${contact.id}`"
                      @click="updateStatus(contact, 'REJECTED')"
                      :disabled="updatingId === contact.id"
                      class="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                      title="Rad etish"
                    >
                      <XCircle :size="14" />
                    </button>

                    <!-- O'chirish -->
                    <button
                      :id="`contact-delete-${contact.id}`"
                      @click="deleteContact(contact.id)"
                      :disabled="deletingId === contact.id"
                      class="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
                      title="O'chirish"
                    >
                      <Loader v-if="deletingId === contact.id" :size="14" class="animate-spin" />
                      <Trash2 v-else :size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="!loading && meta.totalPages > 1" class="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/40">
          <p class="text-sm text-slate-500">
            Jami <span class="font-semibold text-slate-700">{{ meta.total }}</span> ta murojaat,
            <span class="font-semibold text-slate-700">{{ meta.page }}</span>/{{ meta.totalPages }} sahifa
          </p>
          <div class="flex items-center gap-1.5">
            <button
              id="contacts-prev-page"
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft :size="16" />
            </button>
            <button
              v-for="p in meta.totalPages"
              :key="p"
              @click="goToPage(p)"
              :class="[
                'w-9 h-9 rounded-lg text-sm font-semibold transition-all',
                p === currentPage
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : 'border border-slate-200 text-slate-600 hover:bg-white'
              ]"
            >
              {{ p }}
            </button>
            <button
              id="contacts-next-page"
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage >= meta.totalPages"
              class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
