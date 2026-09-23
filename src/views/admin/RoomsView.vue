<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Room } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Badge from '../../components/ui/Badge.vue';
import {
  DoorOpen,
  Plus,
  Users,
  Pen,
  Trash2,
} from 'lucide-vue-next';

const roomsList = ref<Room[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);

const newName = ref('');
const newCapacity = ref<number>(20);
const saving = ref(false);

// Edit Room State
const showEditModal = ref(false);
const editingRoomId = ref<number | null>(null);
const editName = ref('');
const editCapacity = ref<number>(20);
const editSaving = ref(false);

const defaultRooms: Room[] = [
  {
    id: 1,
    name: 'MFactor (Asosiy Auditoriya)',
    capacity: 28,
    status: 'ACTIVE',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'Lab-101 (Kompyuter xonasi)',
    capacity: 22,
    status: 'ACTIVE',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 3,
    name: 'Lab-102 (Dasturlash laboratoriyasi)',
    capacity: 24,
    status: 'ACTIVE',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Kichik audit-3',
    capacity: 14,
    status: 'ACTIVE',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
];

async function loadRooms() {
  loading.value = true;
  try {
    const res = await erpService.getRooms();
    const data = Array.isArray(res) ? res : (res as any)?.data || [];
    if (data.length > 0) {
      roomsList.value = data;
    } else {
      roomsList.value = defaultRooms;
    }
  } catch (err) {
    console.error('Failed to load rooms', err);
    roomsList.value = defaultRooms;
  } finally {
    loading.value = false;
  }
}

async function handleCreateRoom() {
  if (!newName.value.trim()) return;
  saving.value = true;
  try {
    await erpService.createRoom({
      name: newName.value.trim(),
      capacity: Number(newCapacity.value),
    });
    showCreateModal.value = false;
    newName.value = '';
    await loadRooms();
  } catch (err) {
    console.error(err);
    roomsList.value.push({
      id: Date.now(),
      name: newName.value.trim(),
      capacity: Number(newCapacity.value),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    showCreateModal.value = false;
    newName.value = '';
  } finally {
    saving.value = false;
  }
}

function openEditModal(room: Room) {
  editingRoomId.value = room.id;
  editName.value = room.name;
  editCapacity.value = room.capacity;
  showEditModal.value = true;
}

async function handleSaveEditRoom() {
  if (!editingRoomId.value || !editName.value.trim()) return;
  editSaving.value = true;
  try {
    await erpService.updateRoom(editingRoomId.value, {
      name: editName.value.trim(),
      capacity: Number(editCapacity.value),
    });
    showEditModal.value = false;
    await loadRooms();
  } catch (err) {
    console.error('Failed to update room', err);
    const r = roomsList.value.find((x) => x.id === editingRoomId.value);
    if (r) {
      r.name = editName.value.trim();
      r.capacity = Number(editCapacity.value);
    }
    showEditModal.value = false;
  } finally {
    editSaving.value = false;
  }
}

async function handleDeleteRoom(room: Room) {
  if (!confirm(`Haqiqatan ham "${room.name}" xonasini o'chirmoqchimisiz?`)) return;
  try {
    await erpService.deleteRoom(room.id);
    await loadRooms();
  } catch (err) {
    console.error('Failed to delete room', err);
    roomsList.value = roomsList.value.filter((x) => x.id !== room.id);
  }
}

onMounted(() => {
  loadRooms();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Xonalar</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">O'quv markazining barcha auditoriyalari, sig'imi va jihozlanishi.</p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="showCreateModal = true"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
        >
          <Plus class="h-4 w-4" />
          <span>Yangi Xona Qo'shish</span>
        </button>
      </div>
    </div>

    <!-- Rooms Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="room in roomsList"
        :key="room.id"
        class="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all relative group"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <DoorOpen class="h-5 w-5" />
          </div>
          <div class="flex items-center gap-1.5">
            <Badge variant="success" class="text-[10px] font-bold px-2 py-0.5">Faol</Badge>
            <button
              @click="openEditModal(room)"
              type="button"
              class="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Tahrirlash"
            >
              <Pen class="h-3.5 w-3.5" />
            </button>
            <button
              @click="handleDeleteRoom(room)"
              type="button"
              class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="O'chirish"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h3 class="font-bold text-slate-900 text-base">{{ room.name }}</h3>
        
        <div class="mt-3 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span class="flex items-center gap-1.5 font-medium">
            <Users class="h-3.5 w-3.5 text-slate-400" />
            Sig'imi:
          </span>
          <span class="font-bold text-slate-800">{{ room.capacity }} kishi</span>
        </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <Modal :show="showCreateModal" title="Yangi Xona Kiritish" max-width="md" @close="showCreateModal = false">
      <form @submit.prevent="handleCreateRoom" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Xona nomi *</label>
          <input
            v-model="newName"
            type="text"
            required
            placeholder="Masalan, Audit-105"
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Sig'imi (talabalar soni) *</label>
          <input
            v-model="newCapacity"
            type="number"
            min="1"
            required
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving || !newName.trim()"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] active:bg-[#4C1D95] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Edit Room Modal -->
    <Modal :show="showEditModal" title="Xonani Tahrirlash" max-width="md" @close="showEditModal = false">
      <form @submit.prevent="handleSaveEditRoom" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Xona nomi *</label>
          <input
            v-model="editName"
            type="text"
            required
            placeholder="Masalan, Audit-105"
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Sig'imi (talabalar soni) *</label>
          <input
            v-model="editCapacity"
            type="number"
            min="1"
            required
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            @click="showEditModal = false"
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="editSaving || !editName.trim()"
            class="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {{ editSaving ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
