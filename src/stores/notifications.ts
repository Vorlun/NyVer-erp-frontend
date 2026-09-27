import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  target: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS' | 'STAFF';
  channels: ('IN_APP' | 'SMS' | 'TELEGRAM')[];
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  createdAt: string;
  read: boolean;
  sourceEvent?: string;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  category: 'COIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM' | 'PAYMENT';
  description: string;
  defaultTemplate: string;
  templateText: string;
  variables: { name: string; desc: string }[];
}

const STORAGE_KEY = 'nyver_system_notifications';
const TEMPLATES_KEY = 'nyver_notification_templates';

const initialTemplates: NotificationTemplate[] = [
  {
    id: 'coin_reward',
    title: 'Coin Mukofoti / Jarima',
    category: 'COIN',
    description: 'Talabaga admin yoki tizim tomonidan coin berilganda yoki ayirilganda yuboriladigan xabarnoma',
    defaultTemplate: 'Sizga {amount} coin {action} qilindi! Sababi: {reason}. Izoh: {note}',
    templateText: 'Sizga {amount} coin {action} qilindi! Sababi: {reason}. Izoh: {note}',
    variables: [
      { name: '{studentName}', desc: 'Talabaning ismi' },
      { name: '{amount}', desc: 'Coin miqdori (masalan: +15)' },
      { name: '{action}', desc: 'Harakat turi (taqdim etildi / jarima qo\'llandi)' },
      { name: '{reason}', desc: 'Sababi (Uyga vazifa / Faollik / Admin)' },
      { name: '{note}', desc: 'Admin yoki mentorning aniq izohi' },
    ],
  },
  {
    id: 'homework_feedback',
    title: 'Uyga Vazifa & Mentor Feedback',
    category: 'HOMEWORK',
    description: 'Ustoz tomonidan uyga vazifa tekshirilib, baho va izoh kiritilganda talabaga boradigan xabarnoma',
    defaultTemplate: '"{homeworkTitle}" topshirig\'ingiz ustoz tomonidan tekshirildi! Baho: {score} ball (+{coins} coin). Ustoz fikri: "{feedback}"',
    templateText: '"{homeworkTitle}" topshirig\'ingiz ustoz tomonidan tekshirildi! Baho: {score} ball (+{coins} coin). Ustoz fikri: "{feedback}"',
    variables: [
      { name: '{homeworkTitle}', desc: 'Topshiriq nomi' },
      { name: '{score}', desc: 'To\'plangan ball (0-100)' },
      { name: '{coins}', desc: 'Ballga qarab berilgan coin' },
      { name: '{feedback}', desc: 'Ustozning shaxsiy taqrizi' },
      { name: '{teacherName}', desc: 'Tekshirgan ustoz ismi' },
    ],
  },
  {
    id: 'attendance_record',
    title: 'Dars Davomati Qayd Etilganda',
    category: 'ATTENDANCE',
    description: 'Guruh darsida talabaning ishtiroki qayd etilib, darsga kelganligi uchun coin berilganda',
    defaultTemplate: 'Bugungi "{groupName}" darsiga ishtirokingiz qayd etildi ({status}). Balansingizga +{coins} coin qo\'shildi.',
    templateText: 'Bugungi "{groupName}" darsiga ishtirokingiz qayd etildi ({status}). Balansingizga +{coins} coin qo\'shildi.',
    variables: [
      { name: '{groupName}', desc: 'Guruh nomi' },
      { name: '{status}', desc: 'Davomat holati (Qatnashdi / Kechikdi)' },
      { name: '{coins}', desc: 'Davomat uchun taqdim etilgan coin' },
    ],
  },
  {
    id: 'exam_result',
    title: 'Imtihon Natijalari',
    category: 'EXAM',
    description: 'Oraliq yoki yakuniy test imtihon baholari e\'lon qilinganda',
    defaultTemplate: '"{examTitle}" imtihoni natijangiz e\'lon qilindi! Natija: {score} ball (+{coins} coin mukofotlandi).',
    templateText: '"{examTitle}" imtihoni natijangiz e\'lon qilindi! Natija: {score} ball (+{coins} coin mukofotlandi).',
    variables: [
      { name: '{examTitle}', desc: 'Imtihon nomi' },
      { name: '{score}', desc: 'Imtihondan to\'plangan ball' },
      { name: '{coins}', desc: 'Imtihon bali uchun berilgan coin' },
    ],
  },
  {
    id: 'payment_reminder',
    title: 'To\'lov Muddati Eslatmasi',
    category: 'PAYMENT',
    description: 'Talaba oylik to\'lov muddati yetib kelganda yoki kechikkanida',
    defaultTemplate: 'Hurmatli {studentName}, {month} oyi uchun o\'qish to\'lovi muddati yetib keldi. To\'lovni amalga oshirishingizni so\'raymiz.',
    templateText: 'Hurmatli {studentName}, {month} oyi uchun o\'qish to\'lovi muddati yetib keldi. To\'lovni amalga oshirishingizni so\'raymiz.',
    variables: [
      { name: '{studentName}', desc: 'Talaba ismi' },
      { name: '{month}', desc: 'To\'lov oyi' },
    ],
  },
];

const initialNotifications: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Uyga vazifa tekshirildi',
    message: '"React Hooks" topshirig\'ingiz ustoz tomonidan tekshirildi! Baho: 95 ball (+15 coin). Ustoz fikri: "A\'lo darajada bajarilgan!"',
    target: 'STUDENTS',
    channels: ['IN_APP'],
    priority: 'IMPORTANT',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    sourceEvent: 'HOMEWORK',
  },
  {
    id: 'notif-2',
    title: 'Coin mukofoti berildi (Admin berdi)',
    message: 'Sizga 20 coin taqdim etildi! Sababi: Guruhdagi yuqori faollik. Izoh: Oylik loyihani muddatidan oldin topshirganlik uchun',
    target: 'STUDENTS',
    channels: ['IN_APP', 'SMS'],
    priority: 'IMPORTANT',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: false,
    sourceEvent: 'ADMIN_COIN',
  },
  {
    id: 'notif-3',
    title: 'Dars jadvali yangilandi',
    message: 'Barcha guruhlar uchun shanba kuni soat 14:00 da oylik oraliq test imtihonlari o\'tkaziladi.',
    target: 'ALL',
    channels: ['IN_APP'],
    priority: 'NORMAL',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    read: true,
  },
];

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<SystemNotification[]>(loadNotifications());
  const templates = ref<NotificationTemplate[]>(loadTemplates());
  const isWebSocketConnected = ref(false);

  // Setup real-time cross-tab synchronization channel
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('nyver_realtime_notifications');
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_NOTIFICATION' && event.data.payload) {
          items.value.unshift(event.data.payload);
        } else if (event.data?.type === 'SYNC_ALL') {
          items.value = loadNotifications();
        }
      };
    }
  } catch (e) {
    console.warn('BroadcastChannel initialize bo\'lmadi:', e);
  }

  // ─── Native WebSocket Connection ──────────────────────────────────────────
  let wsSocket: WebSocket | null = null;
  let wsReconnectTimer: any = null;
  let wsPingInterval: any = null;
  let wsCurrentRole: string = 'ADMIN';
  let wsCurrentUserId: string | number = '';

  function initWebSocket() {
    if (typeof window === 'undefined') return;
    // close any existing connection
    if (wsSocket && wsSocket.readyState !== WebSocket.CLOSED) {
      wsSocket.close();
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const params = new URLSearchParams({
        role: wsCurrentRole,
        ...(wsCurrentUserId ? { userId: String(wsCurrentUserId) } : {}),
      });
      const wsUrl = `${protocol}//${host}:3000/api/ws?${params}`;

      wsSocket = new WebSocket(wsUrl);

      wsSocket.onopen = () => {
        isWebSocketConnected.value = true;
        console.log(`⚡ Nyver WebSocket ulandi: role=${wsCurrentRole}, userId=${wsCurrentUserId}`);

        // Register with server as well (for servers that need explicit register event)
        wsSocket!.send(JSON.stringify({
          event: 'register',
          data: { role: wsCurrentRole, userId: String(wsCurrentUserId) },
        }));

        // Ping every 30s to keep connection alive
        if (wsPingInterval) clearInterval(wsPingInterval);
        wsPingInterval = setInterval(() => {
          if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
            wsSocket.send(JSON.stringify({ event: 'ping' }));
          }
        }, 30000);
      };

      wsSocket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'notification' && parsed.data) {
            const d = parsed.data;
            const newNotif: SystemNotification = {
              id: d.id || 'ws-' + Date.now(),
              title: d.title,
              message: d.message,
              target: d.target || 'ALL',
              channels: d.channels || ['IN_APP'],
              priority: d.priority || 'IMPORTANT',
              createdAt: d.createdAt || new Date().toISOString(),
              read: false,
              sourceEvent: d.type,
            };

            // Avoid duplicate by ID
            if (!items.value.some((x) => x.id === newNotif.id)) {
              items.value.unshift(newNotif);
              saveNotifications();
              // Native browser notification if supported
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try {
                  new Notification(`Nyver – ${newNotif.title}`, {
                    body: newNotif.message,
                    icon: '/favicon.ico',
                  });
                } catch { /* ignore */ }
              }
            }
          }
        } catch {
          // ignore non-json
        }
      };

      wsSocket.onclose = () => {
        isWebSocketConnected.value = false;
        if (wsPingInterval) clearInterval(wsPingInterval);
        // Attempt reconnect after 5s
        if (!wsReconnectTimer) {
          wsReconnectTimer = setTimeout(() => {
            wsReconnectTimer = null;
            initWebSocket();
          }, 5000);
        }
      };

      wsSocket.onerror = () => {
        isWebSocketConnected.value = false;
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
      isWebSocketConnected.value = false;
    }
  }

  /**
   * Call this from each layout on mount — passes the real role to the server
   * so target-based notifications are routed correctly.
   */
  function connectWebSocket(role: 'ADMIN' | 'TEACHER' | 'STUDENT', userId?: string | number) {
    wsCurrentRole = role;
    wsCurrentUserId = userId ?? '';
    initWebSocket();
  }

  function disconnectWebSocket() {
    if (wsReconnectTimer) { clearTimeout(wsReconnectTimer); wsReconnectTimer = null; }
    if (wsPingInterval) { clearInterval(wsPingInterval); wsPingInterval = null; }
    if (wsSocket) { wsSocket.close(); wsSocket = null; }
    isWebSocketConnected.value = false;
  }

  function loadNotifications(): SystemNotification[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return initialNotifications;
  }

  function loadTemplates(): NotificationTemplate[] {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return initialTemplates;
  }

  function saveNotifications() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
      broadcastChannel?.postMessage({ type: 'SYNC_ALL' });
    } catch (e) {
      console.warn('Bildirishnomalarni saqlashda xatolik:', e);
    }
  }

  function saveTemplates() {
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates.value));
    } catch (e) {
      console.warn('Shablonlarni saqlashda xatolik:', e);
    }
  }

  const unreadCount = computed(() => {
    return items.value.filter((n) => !n.read).length;
  });

  const recentNotifications = computed(() => {
    return [...items.value].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  const teacherNotifications = computed(() => {
    return recentNotifications.value.filter(
      (n) => n.target === 'ALL' || n.target === 'TEACHERS' || n.target === 'STAFF'
    );
  });

  const teacherUnreadCount = computed(() => {
    return teacherNotifications.value.filter((n) => !n.read).length;
  });

  const studentNotifications = computed(() => {
    return recentNotifications.value.filter(
      (n) => n.target === 'ALL' || n.target === 'STUDENTS' || n.target === 'DEBTORS'
    );
  });

  const studentUnreadCount = computed(() => {
    return studentNotifications.value.filter((n) => !n.read).length;
  });

  const adminNotifications = computed(() => {
    return recentNotifications.value;
  });

  const adminUnreadCount = computed(() => {
    return items.value.filter((n) => !n.read).length;
  });

  function sendBroadcast(payload: {
    title: string;
    message: string;
    target: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS' | 'STAFF';
    channels: ('IN_APP' | 'SMS' | 'TELEGRAM')[];
    priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
    sourceEvent?: string;
  }) {
    const newNotif: SystemNotification = {
      id: 'notif-' + Date.now(),
      title: payload.title,
      message: payload.message,
      target: payload.target,
      channels: payload.channels,
      priority: payload.priority,
      createdAt: new Date().toISOString(),
      read: false,
      sourceEvent: payload.sourceEvent,
    };

    items.value.unshift(newNotif);
    saveNotifications();

    // Broadcast across browser tabs
    try {
      broadcastChannel?.postMessage({
        type: 'NEW_NOTIFICATION',
        payload: newNotif,
      });
    } catch {
      // ignore
    }

    // Broadcast over WebSocket if open
    try {
      if (wsSocket && wsSocket.readyState === WebSocket.OPEN) {
        wsSocket.send(
          JSON.stringify({
            event: 'broadcast',
            data: {
              id: newNotif.id,
              type: newNotif.sourceEvent || 'BROADCAST',
              target: newNotif.target,
              title: newNotif.title,
              message: newNotif.message,
              channels: newNotif.channels,
              createdAt: newNotif.createdAt,
            },
          })
        );
      }
    } catch (e) {
      console.warn('WS orqali yuborishda xatolik:', e);
    }

    return newNotif;
  }

  function updateTemplate(templateId: string, newText: string) {
    const found = templates.value.find((t) => t.id === templateId);
    if (found) {
      found.templateText = newText;
      saveTemplates();
    }
  }

  function resetTemplate(templateId: string) {
    const found = templates.value.find((t) => t.id === templateId);
    if (found) {
      found.templateText = found.defaultTemplate;
      saveTemplates();
    }
  }

  /**
   * Triggers an automated notification using the customized template text
   */
  function triggerTemplateNotification(
    templateId: string,
    replacements: Record<string, string | number>,
    target: 'ALL' | 'STUDENTS' | 'TEACHERS' | 'DEBTORS' | 'STAFF' = 'STUDENTS'
  ) {
    const tpl = templates.value.find((t) => t.id === templateId);
    if (!tpl) return null;

    let text = tpl.templateText;
    for (const [key, val] of Object.entries(replacements)) {
      text = text.replaceAll(key, String(val));
    }

    return sendBroadcast({
      title: tpl.title,
      message: text,
      target,
      channels: ['IN_APP', 'SMS'],
      priority: tpl.category === 'COIN' || tpl.category === 'EXAM' ? 'IMPORTANT' : 'NORMAL',
      sourceEvent: tpl.category,
    });
  }

  function markAsRead(id: string) {
    const item = items.value.find((n) => n.id === id);
    if (item && !item.read) {
      item.read = true;
      saveNotifications();
    }
  }

  function markAllAsRead() {
    items.value.forEach((n) => {
      n.read = true;
    });
    saveNotifications();
  }

  function deleteNotification(id: string) {
    items.value = items.value.filter((n) => n.id !== id);
    saveNotifications();
  }

  return {
    items,
    templates,
    isWebSocketConnected,
    unreadCount,
    recentNotifications,
    teacherNotifications,
    teacherUnreadCount,
    studentNotifications,
    studentUnreadCount,
    adminNotifications,
    adminUnreadCount,
    sendBroadcast,
    updateTemplate,
    resetTemplate,
    triggerTemplateNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    connectWebSocket,
    disconnectWebSocket,
  };
});
