<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { Prize, PrizeOrder } from '../../types';
import Pagination from '../../components/ui/Pagination.vue';
import {
  CheckCircle,
  AlertCircle,
  Search,
  Package,
} from 'lucide-vue-next';

const authStore = useAuthStore();
const studentId = computed(() => authStore.user?.id || 5);

const activeTab = ref<'shop' | 'my_orders'>('shop');
const prizes = ref<Prize[]>([]);
const orders = ref<PrizeOrder[]>([]);
const loading = ref(false);

// ─── Filter States (Matching Image 4) ───────────────────────────────────────
const selectedCategory = ref<'ALL' | 'ACCESSORY' | 'GADGET' | 'CLOTHING' | 'STATIONERY'>('ALL');
const minPrice = ref<number | ''>('');
const maxPrice = ref<number | ''>('');
const searchName = ref('');
const canAffordOnly = ref(false);

function resetFilters() {
  selectedCategory.value = 'ALL';
  minPrice.value = '';
  maxPrice.value = '';
  searchName.value = '';
  canAffordOnly.value = false;
  prizesPage.value = 1;
}

// ─── Pagination ─────────────────────────────────────────────────────────────
const prizesPage = ref(1);
const prizesPageSize = ref(8);

const myOrdersPage = ref(1);
const myOrdersPageSize = ref(8);

function getPrizeCategory(name: string): 'ACCESSORY' | 'GADGET' | 'CLOTHING' | 'STATIONERY' {
  const n = name.toLowerCase();
  if (n.includes('hudi') || n.includes('hoodie') || n.includes('futbolka') || n.includes('t-shirt')) return 'CLOTHING';
  if (n.includes('klaviatura') || n.includes('sichqoncha') || n.includes('quloqchin') || n.includes('mouse')) return 'GADGET';
  if (n.includes('ruchka') || n.includes('bloknot') || n.includes('daftar')) return 'STATIONERY';
  return 'ACCESSORY';
}

function getPrizeImage(prize: Prize): string {
  if (prize.imageUrl && prize.imageUrl.trim().length > 5) return prize.imageUrl;
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

const filteredPrizes = computed(() => {
  const userCoins = authStore.user?.coins || 0;
  return prizes.value.filter((p) => {
    if (selectedCategory.value !== 'ALL') {
      const cat = getPrizeCategory(p.name);
      if (cat !== selectedCategory.value) return false;
    }

    if (minPrice.value !== '' && p.priceCoins < Number(minPrice.value)) return false;
    if (maxPrice.value !== '' && p.priceCoins > Number(maxPrice.value)) return false;

    if (canAffordOnly.value && userCoins < p.priceCoins) return false;

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

const myOrders = computed(() => {
  return orders.value
    .filter((o) => o.studentId === studentId.value)
    .map((o) => ({
      ...o,
      prize: prizes.value.find((p) => p.id === o.prizeId) || defaultPrizes.find(p => p.id === o.prizeId),
    }));
});

const myOrdersTotalPages = computed(() => Math.ceil(myOrders.value.length / myOrdersPageSize.value) || 1);
const paginatedMyOrders = computed(() => {
  const start = (myOrdersPage.value - 1) * myOrdersPageSize.value;
  return myOrders.value.slice(start, start + myOrdersPageSize.value);
});

const noticeMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

async function loadData() {
  loading.value = true;
  try {
    const [pRes, oRes] = await Promise.allSettled([
      erpService.getPrizes(),
      erpService.getPrizeOrders(),
    ]);

    if (pRes.status === 'fulfilled' && pRes.value) {
      const val = pRes.value;
      const data = Array.isArray(val) ? val : (val as any).data || [];
      prizes.value = data.length > 0 ? data : defaultPrizes;
    } else {
      prizes.value = defaultPrizes;
    }

    if (oRes.status === 'fulfilled' && oRes.value) {
      const val = oRes.value;
      orders.value = Array.isArray(val) ? val : (val as any).data || [];
    }
  } catch (err) {
    console.error('Failed to load shop data:', err);
    prizes.value = defaultPrizes;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

async function handleBuy(prize: Prize) {
  noticeMessage.value = null;
  try {
    await erpService.buyPrize(prize.id);
    noticeMessage.value = { type: 'success', text: 'Sovg\'a muvaffaqiyatli xarid qilindi!' };
    authStore.refreshUserData();
    await loadData();
  } catch (err: any) {
    noticeMessage.value = {
      type: 'error',
      text: err.response?.data?.message || err.message || 'Xarid qilishda xatolik yuz berdi',
    };
  }

  setTimeout(() => {
    noticeMessage.value = null;
  }, 4000);
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
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto font-sans pb-16">
    <!-- Header with Balance Summary (Nyver theme) -->
    <div class="rounded-2xl bg-linear-to-r from-violet-700 via-[#6D28D9] to-indigo-800 p-6 sm:p-7 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
          <span>Sovg'alar Do'koni</span>
          <span class="text-2xl">🎁</span>
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-violet-100 max-w-lg">
          Dars davomati va topshiriqlardan to'plagan Nyver tangalaringizni maxsus sovg'alarga almashtiring!
        </p>
      </div>

      <div class="bg-white/15 border border-white/25 rounded-xl px-5 py-3 text-center self-start sm:self-auto backdrop-blur-xs">
        <span class="text-[11px] font-bold text-violet-200 uppercase tracking-wider block">Mening Balansim</span>
        <div class="flex items-center justify-center gap-1.5 mt-0.5">
          <span class="text-xl">🪙</span>
          <span class="text-3xl font-black">{{ authStore.user?.coins || 0 }}</span>
          <span class="text-xs font-bold text-violet-200">coin</span>
        </div>
      </div>
    </div>

    <!-- Feedback Notice Banner -->
    <div
      v-if="noticeMessage"
      class="p-4 rounded-xl text-xs font-bold flex items-center gap-3 border shadow-2xs"
      :class="
        noticeMessage.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-rose-50 border-rose-200 text-rose-800'
      "
    >
      <CheckCircle v-if="noticeMessage.type === 'success'" class="h-5 w-5 text-emerald-600 shrink-0" />
      <AlertCircle v-else class="h-5 w-5 text-rose-600 shrink-0" />
      <span>{{ noticeMessage.text }}</span>
    </div>

    <!-- Tabs Navigation (Matching Image 4: Sotuvda | Sotib olganlarim) -->
    <div class="flex items-center gap-6 border-b border-slate-200 text-sm font-bold">
      <button
        @click="activeTab = 'shop'"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="activeTab === 'shop' ? 'text-[#6D28D9]' : 'text-slate-500 hover:text-slate-800'"
      >
        <span>Sotuvda</span>
        <span
          v-if="activeTab === 'shop'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>

      <button
        @click="activeTab = 'my_orders'"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="activeTab === 'my_orders' ? 'text-[#6D28D9]' : 'text-slate-500 hover:text-slate-800'"
      >
        <span>Sotib olganlarim ({{ myOrders.length }})</span>
        <span
          v-if="activeTab === 'my_orders'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>
    </div>

    <!-- ─── TAB 1: SOTUVDA (IMAGE 4 REPLICA) ─────────────────────────────────── -->
    <div v-if="activeTab === 'shop'" class="space-y-5">
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
            placeholder="Qidirish..."
            class="w-full pl-7.5 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none text-xs font-medium"
          />
        </div>

        <!-- 4. Kumushlarim yetadi (Switch Toggle) -->
        <label class="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="canAffordOnly"
            class="sr-only peer"
          />
          <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6D28D9]"></div>
          <span class="text-xs text-slate-600">Kumushlarim yetadi</span>
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
        <p class="text-xs text-slate-400 mt-1">Filtrlarni o'zgartirib ko'ring yoki tangalaringizni ko'paytiring.</p>
      </div>

      <!-- Product Cards Grid (Matching Image 4) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="prize in paginatedPrizes"
          :key="prize.id"
          class="bg-white border border-slate-200/90 rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-[#6D28D9]/40 transition-all shadow-2xs group"
        >
          <div>
            <!-- Full Edge-to-Edge Image (No empty margins) -->
            <div class="h-48 sm:h-52 w-full overflow-hidden relative border-b border-slate-100 bg-slate-100">
              <img
                :src="getPrizeImage(prize)"
                :alt="prize.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              <!-- Subtle top gradient for badge contrast -->
              <div class="absolute inset-x-0 top-0 h-14 bg-linear-to-b from-black/40 via-black/15 to-transparent pointer-events-none"></div>

              <!-- Stock pill -->
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

          <!-- Bottom Row: Price on left & Button on right (Matching Image 4) -->
          <div class="p-3.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <!-- Price on Left -->
            <div class="flex items-center gap-1">
              <span class="text-sm font-black text-slate-900">{{ prize.priceCoins }}</span>
              <span class="text-xs font-bold text-amber-500">🪙</span>
            </div>

            <!-- Action Button on Right (Matching Image 4 "Sotib olish" / "Kumushingiz yetarli emas") -->
            <button
              v-if="(authStore.user?.coins || 0) >= prize.priceCoins && prize.stockCount > 0"
              @click="handleBuy(prize)"
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition cursor-pointer shadow-2xs"
            >
              Sotib olish
            </button>
            <button
              v-else
              type="button"
              disabled
              class="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 font-bold text-xs cursor-not-allowed select-none"
            >
              {{ prize.stockCount <= 0 ? 'Zaxirada yo\'q' : 'Kumushingiz yetarli emas' }}
            </button>
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

    <!-- ─── TAB 2: SOTIB OLGANLARIM ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'my_orders'" class="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs space-y-4 p-5">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 class="text-sm font-black text-slate-900">
          Mening Xaridlarim
        </h2>
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
          {{ myOrders.length }} ta buyurtma
        </span>
      </div>

      <div v-if="myOrders.length === 0" class="text-center py-16">
        <Package class="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm font-semibold text-slate-600">Siz hali sovg'a sotib olmadingiz</p>
        <p class="text-xs text-slate-400 mt-1">Darslarda faol qatnashing va tangalaringiz evaziga sovg'alarga ega bo'ling!</p>
      </div>

      <div v-else class="overflow-x-auto border border-slate-200/80 rounded-lg">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
            <tr>
              <th class="py-3 px-4">Sovg'a</th>
              <th class="py-3 px-4">Sarflangan Coin</th>
              <th class="py-3 px-4">Xarid Sanasi</th>
              <th class="py-3 px-4">Holat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="order in paginatedMyOrders" :key="order.id" class="hover:bg-slate-50/70 transition">
              <td class="py-3 px-4 font-bold text-slate-900">
                {{ order.prize?.name || 'Sovg\'a' }}
              </td>
              <td class="py-3 px-4 font-black text-amber-600">
                {{ order.prize?.priceCoins || 45 }} 🪙
              </td>
              <td class="py-3 px-4 text-slate-400 font-mono">
                {{ formatDate(order.created_at) }}
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                  :class="
                    order.isGiven
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  "
                >
                  {{ order.isGiven ? 'Qabul qilindi' : 'Kutilmoqda (Admin tasdig\'i)' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Numeric Pagination Component -->
      <Pagination
        v-model:currentPage="myOrdersPage"
        :totalPages="myOrdersTotalPages"
        :totalItems="myOrders.length"
        :pageSize="myOrdersPageSize"
      />
    </div>
  </div>
</template>
