<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { Prize, PrizeOrder } from '../../types';
import Badge from '../../components/ui/Badge.vue';
import { Gift, Coins, CheckCircle, ShoppingBag, AlertCircle } from 'lucide-vue-next';

const authStore = useAuthStore();
const studentId = computed(() => authStore.user?.id || 5);

const prizes = ref<Prize[]>([]);
const orders = ref<PrizeOrder[]>([]);
const loading = ref(false);

const myOrders = computed(() => {
  return orders.value
    .filter((o) => o.studentId === studentId.value)
    .map((o) => ({
      ...o,
      prize: prizes.value.find((p) => p.id === o.prizeId),
    }));
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
      prizes.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (oRes.status === 'fulfilled' && oRes.value) {
      const val = oRes.value;
      orders.value = Array.isArray(val) ? val : (val as any).data || [];
    }
  } catch (err) {
    console.error('Failed to load shop data:', err);
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
    noticeMessage.value = { type: 'success', text: 'Sovrin muvaffaqiyatli xarid qilindi!' };
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
  }, 5000);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Balance Summary -->
    <div class="rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight">
          Sovrinlar Do'koni 🎁
        </h1>
        <p class="mt-1 text-sm text-amber-100 max-w-lg">
          Darslardagi namunali qatnashuv va uy vazifalaridan to'plagan tangalaringizni maxsus sovg'alarga almashtiring!
        </p>
      </div>

      <div class="bg-white/20 border border-white/30 rounded-2xl px-5 py-3 text-center self-start sm:self-auto backdrop-blur-xs">
        <span class="text-xs font-semibold text-amber-100 uppercase tracking-wider block">Mening Balansim</span>
        <div class="flex items-center justify-center gap-1.5 mt-0.5">
          <Coins class="h-5 w-5 text-amber-200" />
          <span class="text-3xl font-black">{{ authStore.user?.coins || 0 }}</span>
          <span class="text-xs font-bold text-amber-100">coin</span>
        </div>
      </div>
    </div>

    <!-- Feedback Notice Banner -->
    <div
      v-if="noticeMessage"
      class="p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border"
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

    <!-- Prizes Showcase Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <div
        v-for="prize in prizes"
        :key="prize.id"
        class="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs hover:shadow-lg transition-all flex flex-col justify-between"
      >
        <div>
          <!-- Prize Image -->
          <div class="h-44 w-full bg-slate-100 overflow-hidden relative">
            <img
              v-if="prize.imageUrl"
              :src="prize.imageUrl"
              :alt="prize.name"
              class="h-full w-full object-cover"
            />
            <div
              v-else
              class="h-full w-full flex items-center justify-center text-slate-400 bg-slate-100"
            >
              <Gift class="h-12 w-12" />
            </div>

            <!-- Price Tag Overlay -->
            <div class="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-amber-400 font-black text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <Coins class="h-3.5 w-3.5" />
              <span>{{ prize.priceCoins }} coin</span>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4 space-y-2">
            <h3 class="font-bold text-slate-900 text-sm leading-tight">{{ prize.name }}</h3>
            <p class="text-xs text-slate-500 line-clamp-2">{{ prize.description }}</p>

            <div class="text-[11px] font-medium text-slate-400 pt-1">
              Qoldi: <span class="font-bold text-slate-700">{{ prize.stockCount }} dona</span>
            </div>
          </div>
        </div>

        <!-- Buy Button -->
        <div class="p-4 pt-0">
          <button
            @click="handleBuy(prize)"
            :disabled="(authStore.user?.coins || 0) < prize.priceCoins || prize.stockCount <= 0"
            class="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            :class="
              (authStore.user?.coins || 0) >= prize.priceCoins && prize.stockCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            "
          >
            <ShoppingBag class="h-4 w-4" />
            <span>
              {{
                prize.stockCount <= 0
                  ? 'Zaxirada qolmagan'
                  : (authStore.user?.coins || 0) < prize.priceCoins
                  ? 'Tanga yetmaydi'
                  : 'Xarid Qilish'
              }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- My Orders Section -->
    <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      <h3 class="font-bold text-slate-800 text-base mb-4">Mening Buyurtmalarim</h3>

      <div class="divide-y divide-slate-100 text-xs">
        <div
          v-for="order in myOrders"
          :key="order.id"
          class="py-3.5 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Gift class="h-5 w-5" />
            </div>
            <div>
              <p class="font-bold text-slate-900">{{ order.prize?.name }}</p>
              <span class="text-slate-400 text-[11px]">
                Sana: {{ new Date(order.created_at).toLocaleDateString('uz-UZ') }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <span class="font-bold text-amber-600">-{{ order.coinsSpent }} coin</span>
            <Badge :variant="order.isGiven ? 'success' : 'warning'">
              {{ order.isGiven ? 'Topshirildi' : 'Kutilmoqda' }}
            </Badge>
          </div>
        </div>

        <div v-if="myOrders.length === 0" class="py-6 text-center text-slate-400">
          Sizda hali sovg'a buyurtmalari yo'q.
        </div>
      </div>
    </div>
  </div>
</template>
