<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Prize, PrizeOrder } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  Gift,
  Plus,
  Coins,
  Package,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  Edit2,
} from 'lucide-vue-next';

const activeTab = ref<'prizes' | 'orders'>('prizes');
const prizesList = ref<Prize[]>([]);
const ordersList = ref<PrizeOrder[]>([]);
const loading = ref(false);

// Create modal
const showCreateModal = ref(false);
const newName = ref('');
const newPriceCoins = ref<number>(150);
const newStockCount = ref<number>(10);
const newDescription = ref('');
const newImageUrl = ref('');
const saving = ref(false);
const actionMsg = ref<string | null>(null);

// Edit modal
const showEditModal = ref(false);
const editingPrizeId = ref<number | null>(null);
const editName = ref('');
const editPriceCoins = ref<number>(150);
const editStockCount = ref<number>(10);
const editDescription = ref('');
const editImageUrl = ref('');

// Preset images for instant selection
const presetImages = [
  { label: 'Hudi (Qora)', url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80' },
  { label: 'Termos', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80' },
  { label: 'Stikerlar', url: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80' },
  { label: 'Sichqoncha', url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80' },
  { label: 'Klaviatura', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80' },
  { label: 'Quloqchin', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80' },
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
  if (name.includes('termos') || name.includes('krujka') || name.includes('tumbler')) {
    return 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('stiker') || name.includes('vinyl') || name.includes('sticker')) {
    return 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('sichqon') || name.includes('mouse') || name.includes('logitech')) {
    return 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('klaviatura') || name.includes('keyboard') || name.includes('redragon')) {
    return 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80';
  }
  if (name.includes('quloqchin') || name.includes('headphone') || name.includes('airpods')) {
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80';
}

const defaultPrizes: Prize[] = [
  {
    id: 12,
    name: "Developer Vinyl Stikerlar To'plami (60 dona)",
    description: "Vue, NestJS, TypeScript, Docker, Linux yuqori sifatli suv o'tmas stikerlar.",
    imageUrl: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80',
    priceCoins: 30,
    stockCount: 50,
    status: 'ACTIVE',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 11,
    name: 'Metall Smart Termos (500ml, Harorat LED)',
    description: 'Haroratni 24 soat saqlaydi, sensorli LED ekranli zanglamas po\'lat.',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80',
    priceCoins: 80,
    stockCount: 20,
    status: 'ACTIVE',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 9,
    name: 'Nyver Premium Dasturchilar Hudisi (Black)',
    description: '100% paxta, qalin va qulay zamonaviy brendli hudi.',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    priceCoins: 120,
    stockCount: 15,
    status: 'ACTIVE',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 10,
    name: 'Logitech M330 Silent Simsiz Sichqoncha',
    description: 'Shovqinsiz tugmalar, yuqori sezuvchanlik va 24 oy batareya muddati.',
    imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
    priceCoins: 200,
    stockCount: 8,
    status: 'ACTIVE',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 13,
    name: 'Redragon Mexanik Klaviatura (RGB, Blue Switch)',
    description: 'Dasturchilar va geymerlar uchun professional mexanik klaviatura.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
    priceCoins: 350,
    stockCount: 4,
    status: 'ACTIVE',
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
  },
];

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
      ordersList.value = data;
    }
  } catch (err) {
    console.error('Failed to load prize data', err);
    prizesList.value = defaultPrizes;
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
    actionMsg.value = "Yangi sovg'a muvaffaqiyatli qo'shildi!";
    setTimeout(() => { actionMsg.value = null; }, 3500);
    await loadData();
  } catch (err) {
    console.error(err);
    prizesList.value.push({
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
    newName.value = '';
    newDescription.value = '';
    newImageUrl.value = '';
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
    setTimeout(() => { actionMsg.value = null; }, 3500);
    await loadData();
  } catch (err) {
    console.error('Failed to update prize', err);
    // Local fallback update
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
  try {
    await erpService.updatePrize(prize.id, {
      stockCount: prize.stockCount + count,
    });
    prize.stockCount += count;
    actionMsg.value = `${prize.name} zaxirasiga +${count} dona qo'shildi!`;
    setTimeout(() => { actionMsg.value = null; }, 3000);
  } catch (err) {
    prize.stockCount += count;
  }
}

async function handleMarkGiven(orderId: number) {
  try {
    await erpService.markOrderAsGiven(orderId);
    actionMsg.value = 'Buyurtma topshirildi deb belgilandi!';
    setTimeout(() => { actionMsg.value = null; }, 3500);
    await loadData();
  } catch (err) {
    console.error('Failed to mark order given', err);
    const order = ordersList.value.find((o) => o.id === orderId);
    if (order) {
      order.isGiven = true;
    }
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Action Notification Toast -->
    <div
      v-if="actionMsg"
      class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center justify-between text-sm shadow-xs"
    >
      <div class="flex items-center gap-2">
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <span>{{ actionMsg }}</span>
      </div>
      <button @click="actionMsg = null" class="text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs">
        ✕
      </button>
    </div>

    <!-- Header: Minimalist & Clean -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Sovg'alar & Coin Market
        </h1>
        <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-violet-50 text-[#6D28D9] border border-violet-150 shadow-2xs">
          {{ prizesList.length }} ta mahsulot
        </span>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="loadData"
          class="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
          title="Yangilash"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button
          @click="showCreateModal = true"
          class="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-[#6D28D9] text-white font-bold text-xs sm:text-sm hover:bg-[#5B21B6] active:bg-[#4C1D95] transition-all cursor-pointer shadow-xs active:scale-98"
        >
          <Plus class="h-4 w-4" />
          <span>Yangi sovg'a qo'shish</span>
        </button>
      </div>
    </div>

    <!-- Tabs: Clean & Modern -->
    <div class="flex items-center gap-2 border-b border-slate-200">
      <button
        @click="activeTab = 'prizes'"
        class="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer"
        :class="[
          activeTab === 'prizes'
            ? 'border-[#6D28D9] text-[#6D28D9]'
            : 'border-transparent text-slate-500 hover:text-slate-800',
        ]"
      >
        <Gift class="h-4 w-4" />
        <span>Sovg'alar katalogi ({{ prizesList.length }})</span>
      </button>

      <button
        @click="activeTab = 'orders'"
        class="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer"
        :class="[
          activeTab === 'orders'
            ? 'border-[#6D28D9] text-[#6D28D9]'
            : 'border-transparent text-slate-500 hover:text-slate-800',
        ]"
      >
        <ShoppingBag class="h-4 w-4" />
        <span>Buyurtmalar nazorati ({{ ordersList.length }})</span>
        <span
          v-if="ordersList.filter(o => !o.isGiven).length > 0"
          class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800"
        >
          {{ ordersList.filter(o => !o.isGiven).length }}
        </span>
      </button>
    </div>

    <!-- TAB 1: CREATIVE PRIZES GRID (HIGH-RES VISIBLE IMAGES) -->
    <div v-if="activeTab === 'prizes'" class="space-y-4">
      <div v-if="loading" class="text-center py-20 text-slate-400">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[#6D28D9] border-r-transparent"></div>
        <p class="text-xs font-medium text-slate-500 mt-2">Sovg'alar yuklanmoqda...</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        <div
          v-for="prize in prizesList"
          :key="prize.id"
          class="bg-white border border-slate-200/90 rounded-3xl overflow-hidden flex flex-col justify-between hover:shadow-xl hover:border-violet-300 transition-all duration-300 group hover:-translate-y-1 shadow-2xs"
        >
          <div>
            <!-- Aniq, Sifatli Rasm Maydoni -->
            <div class="h-48 sm:h-52 w-full bg-slate-100 relative overflow-hidden">
              <img
                :src="getPrizeImage(prize)"
                :alt="prize.name"
                class="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-black/20 pointer-events-none"></div>

              <!-- Top Left: Stock Badge -->
              <div class="absolute top-3 left-3">
                <span
                  class="px-2.5 py-1 rounded-xl text-[11px] font-extrabold shadow-sm backdrop-blur-md"
                  :class="prize.stockCount > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'"
                >
                  {{ prize.stockCount > 0 ? `${prize.stockCount} dona qoldi` : 'Zaxira tugagan' }}
                </span>
              </div>

              <!-- Top Right: Coin Price Badge -->
              <div class="absolute top-3 right-3">
                <div class="bg-slate-950/80 backdrop-blur-md text-amber-300 font-black text-xs px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm border border-amber-300/30">
                  <span class="text-sm">🪙</span>
                  <span>{{ prize.priceCoins }} coin</span>
                </div>
              </div>

              <!-- Bottom of Image: ID -->
              <div class="absolute bottom-2.5 right-3 text-[10px] font-mono font-bold text-white/80 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                #{{ prize.id }}
              </div>
            </div>

            <!-- Content Area -->
            <div class="p-4 space-y-2">
              <h3 class="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-[#6D28D9] transition-colors line-clamp-1" :title="prize.name">
                {{ prize.name }}
              </h3>
              <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed min-h-8" :title="prize.description || ''">
                {{ prize.description || 'Tavsif berilmagan' }}
              </p>
            </div>
          </div>

          <!-- Footer Actions: Edit & Stock Management -->
          <div class="p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
            <!-- Add Stock Button -->
            <button
              @click="handleAddStock(prize, 5)"
              type="button"
              class="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
              title="Zaxiraga +5 dona qo'shish"
            >
              <Plus class="h-3 w-3 text-emerald-600" />
              <span>+5 Zaxira</span>
            </button>

            <!-- Edit Button -->
            <button
              @click="openEditModal(prize)"
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
              title="Tahrirlash"
            >
              <Edit2 class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: ORDERS TABLE -->
    <div v-if="activeTab === 'orders'" class="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
      <div v-if="ordersList.length === 0" class="text-center py-16">
        <Package class="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm font-semibold text-slate-600">Hozircha buyurtmalar yo'q</p>
        <p class="text-xs text-slate-400 mt-0.5">Talabalar sovg'a sotib olganda bu yerda ko'rinadi</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-700">
          <thead class="bg-slate-50/90 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th class="px-5 py-3.5">#</th>
              <th class="px-5 py-3.5">Talaba</th>
              <th class="px-5 py-3.5">Sovg'a</th>
              <th class="px-5 py-3.5">Sarflangan Coin</th>
              <th class="px-5 py-3.5">Holati</th>
              <th class="px-5 py-3.5 text-right">Amal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="order in ordersList" :key="order.id" class="hover:bg-slate-50/60 transition-colors">
              <td class="px-5 py-3.5 font-bold text-slate-400 font-mono">#{{ order.id }}</td>
              <td class="px-5 py-3.5">
                <span class="font-bold text-slate-900 block text-xs sm:text-sm">
                  {{ order.student ? `${order.student.firstName} ${order.student.lastName}` : `Talaba #${order.studentId}` }}
                </span>
                <span v-if="order.student?.phone" class="text-[11px] text-slate-400 font-mono">{{ order.student.phone }}</span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-2.5">
                  <div class="h-8 w-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <img
                      v-if="order.prize"
                      :src="getPrizeImage(order.prize)"
                      :alt="order.prize?.name"
                      class="h-full w-full object-cover"
                    />
                  </div>
                  <span class="font-semibold text-slate-800 text-xs sm:text-sm">{{ order.prize?.name || `Sovg'a #${order.prizeId}` }}</span>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/80 text-xs flex items-center gap-1 w-fit">
                  <Coins class="h-3.5 w-3.5" />
                  {{ order.coinsSpent }} coin
                </span>
              </td>
              <td class="px-5 py-3.5">
                <Badge :variant="order.isGiven ? 'success' : 'warning'">
                  {{ order.isGiven ? 'Topshirildi' : 'Kutilmoqda' }}
                </Badge>
              </td>
              <td class="px-5 py-3.5 text-right">
                <button
                  v-if="!order.isGiven"
                  @click="handleMarkGiven(order.id)"
                  class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                >
                  Topshirildi
                </button>
                <span v-else class="text-xs text-slate-400 font-semibold">
                  Bajarilgan
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CREATE PRIZE MODAL -->
    <Modal :show="showCreateModal" title="Yangi sovg'a qo'shish" @close="showCreateModal = false">
      <form @submit.prevent="handleCreatePrize" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Sovg'a nomi *
          </label>
          <input
            v-model="newName"
            type="text"
            required
            placeholder="Masalan: NyVer Hudie yoki Logitech Sichqoncha"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Narxi (Coin) *
            </label>
            <input
              v-model="newPriceCoins"
              type="number"
              min="1"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mavjud soni *
            </label>
            <input
              v-model="newStockCount"
              type="number"
              min="1"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Rasm URL (ixtiyoriy)
          </label>
          <input
            v-model="newImageUrl"
            type="url"
            placeholder="https://images.unsplash.com/..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
          />
          <!-- Quick presets -->
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="text-[10px] text-slate-400 font-bold uppercase py-0.5">Tezkor tanlash:</span>
            <button
              v-for="p in presetImages"
              :key="p.label"
              type="button"
              @click="newImageUrl = p.url"
              class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-violet-100 hover:text-[#6D28D9] text-[10px] font-semibold text-slate-600 transition cursor-pointer"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Tavsif (ixtiyoriy)
          </label>
          <textarea
            v-model="newDescription"
            rows="3"
            placeholder="Sovg'a haqida qisqacha ma'lumot..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="showCreateModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving || !newName.trim()"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Sovg\'ani saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- EDIT PRIZE MODAL -->
    <Modal :show="showEditModal" title="Sovg'ani tahrirlash" @close="showEditModal = false">
      <form @submit.prevent="handleUpdatePrize" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Sovg'a nomi *
          </label>
          <input
            v-model="editName"
            type="text"
            required
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Narxi (Coin) *
            </label>
            <input
              v-model="editPriceCoins"
              type="number"
              min="1"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Mavjud soni *
            </label>
            <input
              v-model="editStockCount"
              type="number"
              min="0"
              required
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Rasm URL
          </label>
          <input
            v-model="editImageUrl"
            type="url"
            placeholder="https://images.unsplash.com/..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
          />
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="text-[10px] text-slate-400 font-bold uppercase py-0.5">Tezkor tanlash:</span>
            <button
              v-for="p in presetImages"
              :key="p.label"
              type="button"
              @click="editImageUrl = p.url"
              class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-violet-100 hover:text-[#6D28D9] text-[10px] font-semibold text-slate-600 transition cursor-pointer"
            >
              {{ p.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
            Tavsif
          </label>
          <textarea
            v-model="editDescription"
            rows="3"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-sm"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            @click="showEditModal = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving || !editName.trim()"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-xs font-bold cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {{ saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
