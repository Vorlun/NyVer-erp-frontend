<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Prize, PrizeOrder } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Pagination from '../../components/ui/Pagination.vue';
import {
  Plus,
  Package,
  CheckCircle2,
  RefreshCw,
  Edit2,
  Search,
  Clock,
  Undo2,
} from 'lucide-vue-next';

const activeTab = ref<'prizes' | 'orders'>('prizes');
const prizesList = ref<Prize[]>([]);
const ordersList = ref<PrizeOrder[]>([]);
const loading = ref(false);

// ─── Filter States (Matching Image 4) ───────────────────────────────────────
const selectedCategory = ref<'ALL' | 'ACCESSORY' | 'GADGET' | 'CLOTHING' | 'STATIONERY'>('ALL');
const minPrice = ref<number | ''>('');
const maxPrice = ref<number | ''>('');
const searchName = ref('');
const inStockOnly = ref(false);

function resetFilters() {
  selectedCategory.value = 'ALL';
  minPrice.value = '';
  maxPrice.value = '';
  searchName.value = '';
  inStockOnly.value = false;
  prizesPage.value = 1;
}

// ─── Pagination States ──────────────────────────────────────────────────────
const prizesPage = ref(1);
const prizesPageSize = ref(8);

const ordersPage = ref(1);
const ordersPageSize = ref(8);

// Create modal
const showCreateModal = ref(false);
const newName = ref('');
const newPriceCoins = ref<number>(45);
const newStockCount = ref<number>(10);
const newDescription = ref('');
const newImageUrl = ref('');
const saving = ref(false);
const actionMsg = ref<string | null>(null);

// Edit modal
const showEditModal = ref(false);
const editingPrizeId = ref<number | null>(null);
const editName = ref('');
const editPriceCoins = ref<number>(45);
const editStockCount = ref<number>(10);
const editDescription = ref('');
const editImageUrl = ref('');

// Preset images for instant selection
const presetImages = [
  { label: 'Nyver Xudi', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80' },
  { label: 'Smart Termos', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80' },
  { label: 'Stikerlar', url: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80' },
  { label: 'Sichqoncha', url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80' },
  { label: 'Klaviatura', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80' },
  { label: 'Bloknot', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80' },
];

function getPrizeImage(prize: Prize): string {
  if (prize.imageUrl && prize.imageUrl.trim().length > 5) {
    return prize.imageUrl;
  }
  const name = prize.name.toLowerCase();
  if (name.includes('hudi') || name.includes('t-shirt') || name.includes('futbolka') || name.includes('hoodie')) {
    return 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('termos') || name.includes('krujka') || name.includes('tumbler') || name.includes('stakan')) {
    return 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('stiker') || name.includes('vinyl') || name.includes('sticker')) {
    return 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('sichqon') || name.includes('mouse') || name.includes('gilamcha')) {
    return 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('klaviatura') || name.includes('keyboard')) {
    return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80';
}

function getPrizeCategory(name: string): 'ACCESSORY' | 'GADGET' | 'CLOTHING' | 'STATIONERY' {
  const n = name.toLowerCase();
  if (n.includes('hudi') || n.includes('hoodie') || n.includes('futbolka') || n.includes('t-shirt')) return 'CLOTHING';
  if (n.includes('klaviatura') || n.includes('sichqoncha') || n.includes('quloqchin') || n.includes('mouse')) return 'GADGET';
  if (n.includes('ruchka') || n.includes('bloknot') || n.includes('daftar')) return 'STATIONERY';
  return 'ACCESSORY';
}

const defaultPrizes: Prize[] = [
  {
    id: 1,
    name: "Nyver Brendli Ruchka",
    description: "Metall korpusli sifatli Nyver brendli qora ruchka.",
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
    priceCoins: 20,
    stockCount: 40,
    status: 'ACTIVE',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: "Stikerlar To'plami (Vinyl 60 dona)",
    description: "Vue, NestJS, TypeScript yuqori sifatli suv o'tmas stikerlar.",
    imageUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80',
    priceCoins: 10,
    stockCount: 50,
    status: 'ACTIVE',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 3,
    name: 'Nyver Smart Termos (LED Ekran)',
    description: 'Haroratni 24 soat saqlaydi, sensorli LED ekranli po\'lat termos.',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
    priceCoins: 45,
    stockCount: 20,
    status: 'ACTIVE',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 4,
    name: 'Sichqoncha Uchun Katta Gilamcha (Deskmat)',
    description: '900x400mm sirpanmas rezina asosli Nyver dasturchilar gilamchasi.',
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
    priceCoins: 30,
    stockCount: 25,
    status: 'ACTIVE',
    created_at: '2026-01-18T00:00:00Z',
    updated_at: '2026-01-18T00:00:00Z',
  },
  {
    id: 5,
    name: 'Nyver Ta\'lim Stakani (Keramika)',
    description: 'Nyver logotipi tushirilgan sifatli yashil keramika choy va kofe finjoni.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    priceCoins: 25,
    stockCount: 30,
    status: 'ACTIVE',
    created_at: '2026-01-20T00:00:00Z',
    updated_at: '2026-01-20T00:00:00Z',
  },
  {
    id: 6,
    name: 'Simsiz Ergonomik Sichqoncha (Silent)',
    description: 'Ovozsiz tugmali, 2.4GHz va Bluetooth qo\'llab-quvvatlovchi simsiz sichqoncha.',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
    priceCoins: 65,
    stockCount: 15,
    status: 'ACTIVE',
    created_at: '2026-01-22T00:00:00Z',
    updated_at: '2026-01-22T00:00:00Z',
  },
  {
    id: 7,
    name: 'Nyver Premium Xudi (Hoodie)',
    description: '100% paxta, qalin va issiq Nyver dasturchilar formasi.',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    priceCoins: 90,
    stockCount: 12,
    status: 'ACTIVE',
    created_at: '2026-01-25T00:00:00Z',
    updated_at: '2026-01-25T00:00:00Z',
  },
  {
    id: 8,
    name: 'RGB Mexanik Klaviatura',
    description: 'Hot-swap qizil switchli, dasturlanuvchi RGB yoritgichli mexanik klaviatura.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    priceCoins: 110,
    stockCount: 8,
    status: 'ACTIVE',
    created_at: '2026-01-28T00:00:00Z',
    updated_at: '2026-01-28T00:00:00Z',
  },
];

const sampleOrders: (PrizeOrder & { studentName?: string; groupName?: string })[] = [
  {
    id: 1,
    prizeId: 3,
    studentId: 1,
    coinsSpent: 45,
    studentName: 'Jasur Bekmirzayev',
    groupName: 'Frontend FE-201',
    isGiven: false,
    created_at: '2026-09-26T15:30:00Z',
    updated_at: '2026-09-26T15:30:00Z',
    prize: defaultPrizes[2],
  },
  {
    id: 2,
    prizeId: 2,
    studentId: 2,
    coinsSpent: 10,
    studentName: 'Shahlo Karimova',
    groupName: 'Frontend FE-201',
    isGiven: true,
    created_at: '2026-09-25T11:15:00Z',
    updated_at: '2026-09-25T11:15:00Z',
    prize: defaultPrizes[1],
  },
  {
    id: 3,
    prizeId: 5,
    studentId: 3,
    coinsSpent: 25,
    studentName: 'Asadbek Olimov',
    groupName: 'Backend BE-102',
    isGiven: true,
    created_at: '2026-09-24T09:40:00Z',
    updated_at: '2026-09-24T09:40:00Z',
    prize: defaultPrizes[4],
  },
];

// ─── Filtered Prizes ────────────────────────────────────────────────────────
const filteredPrizes = computed(() => {
  return prizesList.value.filter((p) => {
    if (selectedCategory.value !== 'ALL') {
      const cat = getPrizeCategory(p.name);
      if (cat !== selectedCategory.value) return false;
    }

    if (minPrice.value !== '' && p.priceCoins < Number(minPrice.value)) return false;
    if (maxPrice.value !== '' && p.priceCoins > Number(maxPrice.value)) return false;

    if (inStockOnly.value && p.stockCount <= 0) return false;

    if (searchName.value.trim()) {
      const q = searchName.value.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });
});

const prizesTotalPages = computed(() => Math.ceil(filteredPrizes.value.length / prizesPageSize.value) || 1);
const paginatedPrizes = computed(() => {
  const start = (prizesPage.value - 1) * prizesPageSize.value;
  return filteredPrizes.value.slice(start, start + prizesPageSize.value);
});

// ─── Orders Filtering & Pagination ──────────────────────────────────────────
const orderSearchQuery = ref('');
const orderStatusFilter = ref<'ALL' | 'PENDING' | 'GIVEN'>('ALL');

const filteredOrders = computed(() => {
  return ordersList.value.filter((o) => {
    if (orderStatusFilter.value === 'PENDING' && o.isGiven) return false;
    if (orderStatusFilter.value === 'GIVEN' && !o.isGiven) return false;

    if (orderSearchQuery.value.trim()) {
      const q = orderSearchQuery.value.toLowerCase();
      const sName = ((o as any).studentName || (o.student ? `${o.student.firstName} ${o.student.lastName}` : '')).toLowerCase();
      const pName = (o.prize?.name || '').toLowerCase();
      const gName = ((o as any).groupName || '').toLowerCase();
      if (!sName.includes(q) && !pName.includes(q) && !gName.includes(q)) {
        return false;
      }
    }
    return true;
  });
});

const ordersTotalPages = computed(() => Math.ceil(filteredOrders.value.length / ordersPageSize.value) || 1);
const paginatedOrders = computed(() => {
  const start = (ordersPage.value - 1) * ordersPageSize.value;
  return filteredOrders.value.slice(start, start + ordersPageSize.value);
});

async function loadData() {
  loading.value = true;
  try {
    const [pRes, oRes] = await Promise.allSettled([
      erpService.getPrizes(),
      erpService.getPrizeOrders(),
    ]);

    if (pRes.status === 'fulfilled' && pRes.value) {
      const data = Array.isArray(pRes.value) ? pRes.value : (pRes.value as any)?.data || [];
      prizesList.value = data.length > 0 ? data : defaultPrizes;
    } else {
      prizesList.value = defaultPrizes;
    }

    if (oRes.status === 'fulfilled' && oRes.value) {
      const data = Array.isArray(oRes.value) ? oRes.value : (oRes.value as any)?.data || [];
      ordersList.value = data.length > 0 ? data : sampleOrders;
    } else {
      ordersList.value = sampleOrders;
    }
  } catch (err) {
    console.error('Failed to load prize data', err);
    prizesList.value = defaultPrizes;
    ordersList.value = sampleOrders;
  } finally {
    loading.value = false;
  }
}

async function handleCreatePrize() {
  if (!newName.value.trim()) return;
  saving.value = true;
  try {
    await erpService.createPrize({
      name: newName.value.trim(),
      priceCoins: Number(newPriceCoins.value),
      stockCount: Number(newStockCount.value),
      description: newDescription.value.trim() || undefined,
      imageUrl: newImageUrl.value.trim() || undefined,
    });
    showCreateModal.value = false;
    newName.value = '';
    newDescription.value = '';
    newImageUrl.value = '';
    actionMsg.value = "Yangi sovg'a qo'shildi!";
    setTimeout(() => { actionMsg.value = null; }, 3000);
    await loadData();
  } catch {
    prizesList.value.unshift({
      id: Date.now(),
      name: newName.value.trim(),
      description: newDescription.value.trim() || undefined,
      imageUrl: newImageUrl.value.trim() || undefined,
      priceCoins: Number(newPriceCoins.value),
      stockCount: Number(newStockCount.value),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    showCreateModal.value = false;
  } finally {
    saving.value = false;
  }
}

function openEditModal(prize: Prize) {
  editingPrizeId.value = prize.id;
  editName.value = prize.name;
  editPriceCoins.value = prize.priceCoins;
  editStockCount.value = prize.stockCount;
  editDescription.value = prize.description || '';
  editImageUrl.value = prize.imageUrl || '';
  showEditModal.value = true;
}

async function handleUpdatePrize() {
  if (!editingPrizeId.value || !editName.value.trim()) return;
  saving.value = true;
  try {
    const updated = {
      name: editName.value.trim(),
      priceCoins: Number(editPriceCoins.value),
      stockCount: Number(editStockCount.value),
      description: editDescription.value.trim() || undefined,
      imageUrl: editImageUrl.value.trim() || undefined,
    };
    await erpService.updatePrize(editingPrizeId.value, updated);
    showEditModal.value = false;
    actionMsg.value = "Sovg'a ma'lumotlari yangilandi!";
    setTimeout(() => { actionMsg.value = null; }, 3000);
    await loadData();
  } catch {
    const p = prizesList.value.find(item => item.id === editingPrizeId.value);
    if (p) {
      p.name = editName.value.trim();
      p.priceCoins = Number(editPriceCoins.value);
      p.stockCount = Number(editStockCount.value);
      p.description = editDescription.value.trim() || undefined;
      p.imageUrl = editImageUrl.value.trim() || undefined;
    }
    showEditModal.value = false;
  } finally {
    saving.value = false;
  }
}

async function handleAddStock(prize: Prize, count = 5) {
  prize.stockCount += count;
  try {
    await erpService.updatePrize(prize.id, { stockCount: prize.stockCount });
  } catch {
    // offline
  }
}

async function handleToggleOrderGiven(order: PrizeOrder) {
  order.isGiven = !order.isGiven;
  try {
    await erpService.markOrderAsGiven(order.id);
  } catch {
    // offline
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}, ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

function getStudentInitials(name: string): string {
  if (!name) return 'TL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto font-sans pb-16">
    <!-- Top Action Message Banner -->
    <div
      v-if="actionMsg"
      class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2"
    >
      <CheckCircle2 class="h-4 w-4 text-emerald-600" />
      <span>{{ actionMsg }}</span>
    </div>

    <!-- Header & Action Buttons -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Sovg'alar Do'koni
        </h1>
        <span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-violet-50 text-[#6D28D9] border border-violet-100">
          {{ prizesList.length }} ta mahsulot
        </span>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="loadData"
          class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-2xs"
          title="Yangilash"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button
          @click="showCreateModal = true"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] text-white font-bold text-xs sm:text-sm hover:bg-[#5B21B6] transition cursor-pointer shadow-xs"
        >
          <Plus class="h-4 w-4" />
          <span>Yangi sovg'a qo'shish</span>
        </button>
      </div>
    </div>

    <!-- Tabs Navigation (Matching Image 4: Sotuvda | Sotilganlar tarixi) -->
    <div class="flex items-center gap-6 border-b border-slate-200 text-sm font-bold">
      <button
        @click="activeTab = 'prizes'"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="activeTab === 'prizes' ? 'text-[#6D28D9]' : 'text-slate-500 hover:text-slate-800'"
      >
        <span>Sotuvda ({{ prizesList.length }})</span>
        <span
          v-if="activeTab === 'prizes'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>

      <button
        @click="activeTab = 'orders'"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="activeTab === 'orders' ? 'text-[#6D28D9]' : 'text-slate-500 hover:text-slate-800'"
      >
        <span>Sotilganlar tarixi ({{ ordersList.length }})</span>
        <span
          v-if="activeTab === 'orders'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>
    </div>

    <!-- ─── TAB 1: SOTUVDA (CATALOG WITH IMAGE 4 FILTERS) ─────────────────── -->
    <div v-if="activeTab === 'prizes'" class="space-y-5">
      <!-- Filter Toolbar (Matching Image 4) -->
      <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
        <!-- 1. Kategoriya -->
        <div class="flex items-center gap-2">
          <span class="text-slate-500 text-xs">Kategoriya:</span>
          <select
            v-model="selectedCategory"
            class="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">Barchasi</option>
            <option value="ACCESSORY">Aksessuarlar</option>
            <option value="GADGET">Gadjetlar</option>
            <option value="CLOTHING">Kiyimlar</option>
            <option value="STATIONERY">Kantselyariya</option>
          </select>
        </div>

        <!-- 2. Aksessuar qiymati (dan ... gacha) -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 text-xs">Aksessuar qiymati:</span>
          <input
            v-model="minPrice"
            type="number"
            placeholder="dan"
            class="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-center font-bold focus:bg-white focus:outline-none text-xs"
          />
          <span class="text-slate-400">gacha</span>
          <input
            v-model="maxPrice"
            type="number"
            placeholder="gacha"
            class="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-center font-bold focus:bg-white focus:outline-none text-xs"
          />
        </div>

        <!-- 3. Aksessuar nomi (Qidirish) -->
        <div class="relative w-full sm:w-56">
          <Search class="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchName"
            type="text"
            placeholder="Aksessuar nomi..."
            class="w-full pl-7.5 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none text-xs font-medium"
          />
        </div>

        <!-- 4. Zaxirada bor (Switch Toggle) -->
        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="inStockOnly"
            class="sr-only peer"
          />
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]"></div>
          <span class="text-xs text-slate-600">Zaxirada bor</span>
        </label>

        <!-- 5. Reset button 🧹 -->
        <button
          @click="resetFilters"
          type="button"
          class="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
          title="Filtrlarni tozalash"
        >
          🧹
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-20 text-slate-400">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[#6D28D9] border-r-transparent"></div>
        <p class="text-xs font-medium text-slate-500 mt-2">Sovg'alar yuklanmoqda...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPrizes.length === 0" class="text-center py-20 text-slate-400 bg-white rounded-xl border border-slate-200/80 p-6">
        <Package class="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm font-bold text-slate-700">Sovg'alar topilmadi</p>
        <p class="text-xs text-slate-400 mt-1">Qidiruv yoki filtrlarni o'zgartirib ko'ring.</p>
      </div>

      <!-- Product Cards Grid (Matching Image 4) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="prize in paginatedPrizes"
          :key="prize.id"
          class="bg-white border border-slate-200/90 rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-[#6D28D9]/40 transition-all shadow-2xs group"
        >
          <div>
            <!-- Full Edge-to-Edge Image (No empty margins, cardni to'ldirib turadi) -->
            <div class="h-48 sm:h-52 w-full overflow-hidden relative border-b border-slate-100 bg-slate-100">
              <img
                :src="getPrizeImage(prize)"
                :alt="prize.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              <!-- Subtle top shadow for high contrast badge legibility -->
              <div class="absolute inset-x-0 top-0 h-14 bg-linear-to-b from-black/40 via-black/15 to-transparent pointer-events-none"></div>

              <!-- Top Left: Stock pill -->
              <span
                class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-sm backdrop-blur-xs border"
                :class="
                  prize.stockCount > 0
                    ? 'bg-emerald-600/90 text-white border-emerald-400/50'
                    : 'bg-rose-600/90 text-white border-rose-400/50'
                "
              >
                {{ prize.stockCount > 0 ? `${prize.stockCount} dona` : 'Tugagan' }}
              </span>
            </div>

            <!-- Title & Description -->
            <div class="p-3.5 space-y-1">
              <h3 class="font-bold text-slate-900 text-sm line-clamp-1 leading-snug group-hover:text-[#6D28D9] transition-colors" :title="prize.name">
                {{ prize.name }}
              </h3>
              <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-8">
                {{ prize.description || 'Nyver talabalari uchun maxsus sovg\'a' }}
              </p>
            </div>
          </div>

          <!-- Bottom Row: Price & Action Buttons -->
          <div class="p-3.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <!-- Price on Left -->
            <div class="flex items-center gap-1">
              <span class="text-sm font-black text-slate-900">{{ prize.priceCoins }}</span>
              <span class="text-xs font-bold text-amber-500">🪙</span>
            </div>

            <!-- Action Buttons on Right -->
            <div class="flex items-center gap-1.5">
              <button
                @click="handleAddStock(prize, 5)"
                type="button"
                class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                title="Zaxiraga +5 dona qo'shish"
              >
                +5 Zaxira
              </button>
              <button
                @click="openEditModal(prize)"
                type="button"
                class="p-1.5 rounded-lg border border-slate-200 hover:bg-violet-50 hover:text-[#6D28D9] text-slate-500 transition cursor-pointer"
                title="Tahrirlash"
              >
                <Edit2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Numeric Pagination Component -->
      <Pagination
        v-model:currentPage="prizesPage"
        :totalPages="prizesTotalPages"
        :totalItems="filteredPrizes.length"
        :pageSize="prizesPageSize"
      />
    </div>

    <!-- ─── TAB 2: SOTILGANLAR TARIXI (ORDERS TABLE + PAGINATION) ──────────── -->
    <div v-if="activeTab === 'orders'" class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs space-y-4 p-5">
      <!-- Toolbar Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-2.5">
          <h2 class="text-sm sm:text-base font-black text-slate-900">
            Sotilgan Sovg'alar Jurnali
          </h2>
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {{ filteredOrders.length }} ta buyurtma
          </span>
        </div>

        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- Search in orders -->
          <div class="relative w-full sm:w-56">
            <Search class="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="orderSearchQuery"
              type="text"
              placeholder="Talaba, sovg'a yoki guruh..."
              class="w-full pl-7.5 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none transition"
            />
          </div>

          <!-- Status filter segmented pills -->
          <div class="flex items-center p-0.5 rounded-lg bg-slate-100 text-xs font-bold">
            <button
              @click="orderStatusFilter = 'ALL'"
              type="button"
              class="px-2.5 py-1 rounded transition cursor-pointer"
              :class="orderStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
            >
              Hammasi
            </button>
            <button
              @click="orderStatusFilter = 'PENDING'"
              type="button"
              class="px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1"
              :class="orderStatusFilter === 'PENDING' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-amber-700'"
            >
              <Clock class="h-3 w-3" />
              <span>Kutilmoqda</span>
            </button>
            <button
              @click="orderStatusFilter = 'GIVEN'"
              type="button"
              class="px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1"
              :class="orderStatusFilter === 'GIVEN' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-emerald-700'"
            >
              <CheckCircle2 class="h-3 w-3" />
              <span>Topshirildi</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="filteredOrders.length === 0" class="text-center py-16">
        <Package class="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm font-bold text-slate-700">Buyurtmalar topilmadi</p>
        <p class="text-xs text-slate-400 mt-1">Qidiruv yoki filtrlarni o'zgartirib ko'ring.</p>
      </div>

      <!-- Modern Orders Table -->
      <div v-else class="overflow-x-auto border border-slate-200/80 rounded-xl">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/90 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4">Talaba</th>
              <th class="py-3 px-4">Sovg'a</th>
              <th class="py-3 px-4">Guruh</th>
              <th class="py-3 px-4">Sarflangan Coin</th>
              <th class="py-3 px-4">Sana</th>
              <th class="py-3 px-4">Holat</th>
              <th class="py-3 px-4 text-right">Amal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="order in paginatedOrders" :key="order.id" class="hover:bg-slate-50/70 transition">
              <!-- Student with avatar -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <div class="h-8 w-8 rounded-full bg-violet-100 text-[#6D28D9] font-black text-xs flex items-center justify-center shrink-0">
                    {{ getStudentInitials((order as any).studentName || (order.student ? `${order.student.firstName} ${order.student.lastName}` : 'JB')) }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900 leading-tight">
                      {{ (order as any).studentName || (order.student ? `${order.student.firstName} ${order.student.lastName}` : 'Jasur Bekmirzayev') }}
                    </div>
                    <span class="text-[11px] text-slate-400 font-medium">Talaba</span>
                  </div>
                </div>
              </td>

              <!-- Prize with thumbnail -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5 min-w-0">
                  <img
                    :src="order.prize ? getPrizeImage(order.prize) : (defaultPrizes[0].imageUrl || '')"
                    :alt="order.prize?.name || 'Sovg\'a'"
                    class="h-9 w-9 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                  />
                  <div class="min-w-0">
                    <span class="font-bold text-slate-800 line-clamp-1 block" :title="order.prize?.name">
                      {{ order.prize?.name || "Sovg'a" }}
                    </span>
                    <span class="text-[11px] text-slate-400">
                      Zaxira: {{ order.prize?.stockCount ?? 10 }} dona
                    </span>
                  </div>
                </div>
              </td>

              <!-- Group -->
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                  {{ (order as any).groupName || 'FE-201' }}
                </span>
              </td>

              <!-- Coins spent -->
              <td class="py-3 px-4">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 font-black text-xs">
                  <span>{{ order.coinsSpent || order.prize?.priceCoins || 45 }}</span>
                  <span class="text-xs">🪙</span>
                </span>
              </td>

              <!-- Date -->
              <td class="py-3 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                {{ formatDate(order.created_at) }}
              </td>

              <!-- Status -->
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                  :class="
                    order.isGiven
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  "
                >
                  <component :is="order.isGiven ? CheckCircle2 : Clock" class="h-3 w-3" />
                  <span>{{ order.isGiven ? 'Topshirildi' : 'Kutilmoqda' }}</span>
                </span>
              </td>

              <!-- Action button -->
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <button
                  @click="handleToggleOrderGiven(order)"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shadow-2xs"
                  :class="
                    order.isGiven
                      ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      : 'bg-[#6D28D9] text-white border-[#6D28D9] hover:bg-[#5B21B6]'
                  "
                >
                  <component :is="order.isGiven ? Undo2 : CheckCircle2" class="h-3.5 w-3.5" />
                  <span>{{ order.isGiven ? 'Qaytarish' : 'Topshirish' }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Numeric Pagination Component -->
      <Pagination
        v-model:currentPage="ordersPage"
        :totalPages="ordersTotalPages"
        :totalItems="filteredOrders.length"
        :pageSize="ordersPageSize"
      />
    </div>

    <!-- Create Prize Modal -->
    <Modal :show="showCreateModal" title="Yangi Sovg'a Qo'shish" @close="showCreateModal = false">
      <form @submit.prevent="handleCreatePrize" class="space-y-4 text-xs font-medium">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Nomi:</label>
          <input
            v-model="newName"
            type="text"
            required
            placeholder="Masalan: Nyver Termos..."
            class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Narxi (Coin):</label>
            <input
              v-model="newPriceCoins"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-bold"
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Boshlang'ich Zaxira:</label>
            <input
              v-model="newStockCount"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-bold"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Rasm URL:</label>
          <input
            v-model="newImageUrl"
            type="url"
            placeholder="https://..."
            class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          />
          <div class="flex items-center gap-1.5 mt-2 flex-wrap">
            <span class="text-[11px] text-slate-400">Tezkor tanlash:</span>
            <button
              v-for="img in presetImages"
              :key="img.label"
              type="button"
              @click="newImageUrl = img.url"
              class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-violet-50 hover:text-[#6D28D9] text-[10px] font-bold transition cursor-pointer"
            >
              {{ img.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Tavsifi:</label>
          <textarea
            v-model="newDescription"
            rows="2"
            class="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="showCreateModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Qo\'shish' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Edit Prize Modal -->
    <Modal :show="showEditModal" title="Sovg'ani Tahrirlash" @close="showEditModal = false">
      <form @submit.prevent="handleUpdatePrize" class="space-y-4 text-xs font-medium">
        <div>
          <label class="block font-bold text-slate-700 mb-1">Nomi:</label>
          <input
            v-model="editName"
            type="text"
            required
            class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Narxi (Coin):</label>
            <input
              v-model="editPriceCoins"
              type="number"
              min="1"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-bold"
            />
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Zaxira Soni:</label>
            <input
              v-model="editStockCount"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-bold"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Rasm URL:</label>
          <input
            v-model="editImageUrl"
            type="url"
            class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">Tavsifi:</label>
          <textarea
            v-model="editDescription"
            rows="2"
            class="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            @click="showEditModal = false"
            class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold cursor-pointer"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
