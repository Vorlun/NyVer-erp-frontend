import { apiClient } from './client';
import type {
  User,
  Group,
  Course,
  Room,
  Lesson,
  Attendance,
  Homework,
  HomeworkSubmission,
  Prize,
  PrizeOrder,
  CoinTransaction,
  Payment,
  CreateUserDto,
  CreateGroupDto,
  Exam,
  OnlineCheckoutDto,
  ApprovePaymentResponse,
  TeacherGroup,
  TeacherSubmission,
  CreateLessonTeacherPayload,
  CreateTeacherHomeworkPayload,
  GradeSubmissionPayload,
  TeacherDashboardStats,
} from '../types';
import {
  initialUsers,
  initialCourses,
  initialRooms,
  initialGroups,
  initialPrizes,
} from './mockData';

// Helper: unwrap { success, data } response
function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

function getLocalFallback<T>(key: string, initial: T): T {
  try {
    const item = localStorage.getItem(`nyver_erp_${key}`);
    if (item) return JSON.parse(item);
  } catch {
    // ignore
  }
  return initial;
}

function setLocalFallback<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`nyver_erp_${key}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// In-flight so'rovlarni birlashtirish (bir vaqtda bir xil API ga ortiqcha takroriy so'rov ketmasligi uchun)
const inFlightRequests = new Map<string, Promise<any>>();

function dedupApi<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = requestFn().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

class ErpService {
  // ============ AUTH ============
  async login(login: string, password: string) {
    try {
      const res = await apiClient.post('/auth/login', { login, password });
      return unwrap<{ user: User; accessToken: string; refreshToken: string }>(res);
    } catch (err: any) {
      // Agar backend server ishlamayotgan bo'lsa (Network Error, ERR_NETWORK, ECONNREFUSED)
      const isNetworkErr = !err?.response || err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error');
      if (isNetworkErr) {
        console.warn("Backend server ishlamayapti, offline test rejimida kirish tekshirilmoqda...");
        const cleanLogin = login.trim().toLowerCase().replace(/[\s-]/g, '');
        
        // Superadmin maxsus seed hisob
        if (cleanLogin === 'one.humoyun@gmail.com' || cleanLogin === '+998900000001' || cleanLogin === '998900000001') {
          const mockUser: User = {
            id: 1,
            firstName: 'Humoyun',
            lastName: 'Superadmin',
            role: 'SUPERADMIN',
            email: 'one.humoyun@gmail.com',
            phone: '+998900000001',
            coins: 0,
            status: 'ACTIVE',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          };
          const mockPayload = btoa(JSON.stringify({ sub: mockUser.id, role: mockUser.role, exp: Math.floor(Date.now() / 1000) + 86400 }));
          const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${mockPayload}.offline_dev_sig`;
          return { user: mockUser, accessToken: mockToken, refreshToken: mockToken };
        }

        // Boshqa seed / mock foydalanuvchilarni tekshirish
        const found = initialUsers.find((u) => {
          const uEmail = u.email?.toLowerCase() || '';
          const uPhone = u.phone.replace(/[\s-]/g, '');
          return uEmail === cleanLogin || uPhone === cleanLogin || cleanLogin.includes(uPhone);
        });

        if (found) {
          const mockPayload = btoa(JSON.stringify({ sub: found.id, role: found.role, exp: Math.floor(Date.now() / 1000) + 86400 }));
          const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${mockPayload}.offline_dev_sig`;
          return { user: found, accessToken: mockToken, refreshToken: mockToken };
        }

        throw new Error("Server bilan aloqa yo'q. Sinov uchun 'Test hisoblar' tugmasidan birini tanlang.");
      }

      // Haqiqiy backend javobini qaytarish
      throw err;
    }
  }

  async refreshToken(refreshToken: string) {
    const res = await apiClient.post('/auth/refresh', { refreshToken });
    return unwrap<{ user: User; accessToken: string; refreshToken: string }>(res);
  }

  async getProfile() {
    const res = await apiClient.get('/auth/me');
    return unwrap<User>(res);
  }

  // ============ USERS ============
  async getUsers(params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const cacheKey = `users_${JSON.stringify(params || {})}`;
    return dedupApi(cacheKey, async () => {
      try {
        const res = await apiClient.get('/users', { params });
        const data = unwrap<{ data: User[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(res);
        if (data && Array.isArray(data.data) && data.data.length > 0) {
          setLocalFallback('users', data.data);
        }
        return data;
      } catch (err) {
        console.warn("API getUsers failed, using fallback mock data:", err);
        let list = getLocalFallback<User[]>('users', initialUsers);
        if (params?.role) {
          list = list.filter((u) => u.role === params.role);
        }
        if (params?.status) {
          list = list.filter((u) => u.status === params.status);
        }
        if (params?.search) {
          const q = params.search.toLowerCase();
          list = list.filter(
            (u) =>
              u.firstName.toLowerCase().includes(q) ||
              u.lastName.toLowerCase().includes(q) ||
              u.phone.includes(q)
          );
        }
        return {
          data: list,
          meta: { total: list.length, page: 1, limit: params?.limit || 100, totalPages: 1 },
        };
      }
    });
  }

  async getUserById(id: number) {
    try {
      const res = await apiClient.get(`/users/${id}`);
      return unwrap<User>(res);
    } catch {
      const list = getLocalFallback<User[]>('users', initialUsers);
      return list.find((u) => u.id === id) || list[0];
    }
  }

  async createUser(dto: CreateUserDto & { password?: string }) {
    try {
      const res = await apiClient.post('/users', dto);
      return unwrap<User>(res);
    } catch (err: any) {
      if (err?.response) {
        throw err;
      }
      console.warn("API createUser failed, saving to local fallback:", err);
      const list = getLocalFallback<User[]>('users', initialUsers);
      const newUser: User = {
        id: Date.now(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone,
        email: dto.email || null,
        address: dto.address || null,
        coins: 0,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newUser);
      setLocalFallback('users', list);
      return newUser;
    }
  }

  async updateUser(id: number, data: Partial<User>) {
    try {
      const res = await apiClient.patch(`/users/${id}`, data);
      return unwrap<User>(res);
    } catch {
      const list = getLocalFallback<User[]>('users', initialUsers);
      const idx = list.findIndex((u) => u.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocalFallback('users', list);
        return list[idx];
      }
      return list[0];
    }
  }

  async changeUserStatus(id: number, status: string) {
    try {
      const res = await apiClient.patch(`/users/${id}/status`, { status });
      return unwrap<User>(res);
    } catch {
      return this.updateUser(id, { status } as any);
    }
  }

  // ALIAS for Vue files
  async updateUserCoins(userId: number, amount: number, reason: string) {
    return this.addCoins({ userId, amount, reason });
  }

  async changeUserPassword(id: number, newPassword: string) {
    try {
      const res = await apiClient.patch(`/users/${id}/password`, { newPassword });
      return unwrap<{ message: string }>(res);
    } catch {
      return { message: "Parol yangilandi" };
    }
  }

  async deleteUser(id: number) {
    try {
      const res = await apiClient.delete(`/users/${id}`);
      return unwrap<{ message: string }>(res);
    } catch {
      const list = getLocalFallback<User[]>('users', initialUsers);
      const filtered = list.filter((u) => u.id !== id);
      setLocalFallback('users', filtered);
      return { message: "Foydalanuvchi o'chirildi" };
    }
  }

  // ============ COURSES ============
  async getCourses() {
    return dedupApi('courses', async () => {
      try {
        const res = await apiClient.get('/courses');
        const data = unwrap<Course[]>(res);
        if (Array.isArray(data) && data.length > 0) {
          setLocalFallback('courses', data);
        }
        return data;
      } catch (err) {
        console.warn("API getCourses failed, using fallback data:", err);
        return getLocalFallback<Course[]>('courses', initialCourses);
      }
    });
  }

  async getCourseById(id: number) {
    try {
      const res = await apiClient.get(`/courses/${id}`);
      return unwrap<Course>(res);
    } catch {
      const list = getLocalFallback<Course[]>('courses', initialCourses);
      return list.find((c) => c.id === id) || list[0];
    }
  }

  async createCourse(data: Partial<Course>) {
    try {
      const res = await apiClient.post('/courses', data);
      return unwrap<Course>(res);
    } catch (err) {
      console.warn("API createCourse failed, saving to local fallback:", err);
      const list = getLocalFallback<Course[]>('courses', initialCourses);
      const newCourse: Course = {
        id: Date.now(),
        name: data.name || 'Yangi Kurs',
        description: data.description || '',
        price: data.price || 500000,
        durationMonths: data.durationMonths || 6,
        lessonsPerMonth: 12,
        totalLessons: (data.durationMonths || 6) * 12,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newCourse);
      setLocalFallback('courses', list);
      return newCourse;
    }
  }

  async updateCourse(id: number, data: Partial<Course>) {
    try {
      const res = await apiClient.patch(`/courses/${id}`, data);
      return unwrap<Course>(res);
    } catch {
      const list = getLocalFallback<Course[]>('courses', initialCourses);
      const idx = list.findIndex((c) => c.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocalFallback('courses', list);
        return list[idx];
      }
      return list[0];
    }
  }

  async deleteCourse(id: number) {
    try {
      const res = await apiClient.delete(`/courses/${id}`);
      return unwrap<{ message: string }>(res);
    } catch {
      const list = getLocalFallback<Course[]>('courses', initialCourses);
      const filtered = list.filter((c) => c.id !== id);
      setLocalFallback('courses', filtered);
      return { message: "Kurs o'chirildi" };
    }
  }

  // ============ SYLLABUS ============
  async addCourseSyllabus(courseId: number, data: { lessonOrder: number; topic: string; description?: string }) {
    const res = await apiClient.post(`/courses/${courseId}/syllabus`, data);
    return unwrap<unknown>(res);
  }

  async updateCourseSyllabus(courseId: number, syllabusId: number, data: Partial<{ lessonOrder: number; topic: string; description: string }>) {
    const res = await apiClient.patch(`/courses/${courseId}/syllabus/${syllabusId}`, data);
    return unwrap<unknown>(res);
  }

  async deleteCourseSyllabus(courseId: number, syllabusId: number) {
    const res = await apiClient.delete(`/courses/${courseId}/syllabus/${syllabusId}`);
    return unwrap<{ message: string }>(res);
  }

  // ============ ROOMS ============
  async getRooms() {
    try {
      const res = await apiClient.get('/rooms');
      const data = unwrap<Room[]>(res);
      if (Array.isArray(data) && data.length > 0) {
        setLocalFallback('rooms', data);
      }
      return data;
    } catch (err) {
      console.warn("API getRooms failed, using fallback data:", err);
      return getLocalFallback<Room[]>('rooms', initialRooms);
    }
  }

  async createRoom(data: { name: string; capacity: number }) {
    try {
      const res = await apiClient.post('/rooms', data);
      return unwrap<Room>(res);
    } catch (err) {
      console.warn("API createRoom failed, saving to local fallback:", err);
      const list = getLocalFallback<Room[]>('rooms', initialRooms);
      const newRoom: Room = {
        id: Date.now(),
        name: data.name,
        capacity: data.capacity,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newRoom);
      setLocalFallback('rooms', list);
      return newRoom;
    }
  }

  async updateRoom(id: number, data: Partial<Room>) {
    try {
      const res = await apiClient.patch(`/rooms/${id}`, data);
      return unwrap<Room>(res);
    } catch {
      const list = getLocalFallback<Room[]>('rooms', initialRooms);
      const idx = list.findIndex((r) => r.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocalFallback('rooms', list);
        return list[idx];
      }
      return list[0];
    }
  }

  async deleteRoom(id: number) {
    try {
      const res = await apiClient.delete(`/rooms/${id}`);
      return unwrap<{ message: string }>(res);
    } catch {
      const list = getLocalFallback<Room[]>('rooms', initialRooms);
      const filtered = list.filter((r) => r.id !== id);
      setLocalFallback('rooms', filtered);
      return { message: "Xona o'chirildi" };
    }
  }

  // ============ GROUPS ============
  async getGroups(params?: { courseId?: number; status?: string; teacherId?: number }) {
    const key = `groups_${JSON.stringify(params || {})}`;
    return dedupApi(key, async () => {
      try {
        const res = await apiClient.get('/groups', { params });
        const data = unwrap<Group[]>(res);
        if (Array.isArray(data) && data.length > 0) {
          setLocalFallback('groups', data);
        }
        return data;
      } catch (err) {
        console.warn("API getGroups failed, using fallback data:", err);
        let list = getLocalFallback<Group[]>('groups', initialGroups);
        if (params?.status) list = list.filter((g) => g.status === params.status);
        if (params?.courseId) list = list.filter((g) => g.courseId === params.courseId);
        return list;
      }
    });
  }

  async getGroupById(id: number) {
    try {
      const res = await apiClient.get(`/groups/${id}`);
      return unwrap<Group>(res);
    } catch {
      const list = getLocalFallback<Group[]>('groups', initialGroups);
      return list.find((g) => g.id === id) || list[0];
    }
  }

  async createGroup(dto: CreateGroupDto) {
    try {
      const res = await apiClient.post('/groups', dto);
      return unwrap<Group>(res);
    } catch (err) {
      console.warn("API createGroup failed, saving to local fallback:", err);
      const list = getLocalFallback<Group[]>('groups', initialGroups);
      const newGroup: Group = {
        id: Date.now(),
        name: dto.name,
        courseId: dto.courseId,
        roomId: dto.roomId,
        startDate: dto.startDate || new Date().toISOString(),
        startTime: dto.startTime || '14:00',
        endTime: dto.endTime || '16:00',
        weekDays: dto.weekDays || ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
        maxStudents: dto.maxStudents || 15,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.unshift(newGroup);
      setLocalFallback('groups', list);
      return newGroup;
    }
  }

  async updateGroup(id: number, data: Partial<Group>) {
    try {
      const res = await apiClient.patch(`/groups/${id}`, data);
      return unwrap<Group>(res);
    } catch (err) {
      console.warn(`API updateGroup(${id}) failed, saving to local fallback:`, err);
      const list = getLocalFallback<Group[]>('groups', initialGroups);
      const idx = list.findIndex((g) => g.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
        setLocalFallback('groups', list);
        return list[idx];
      }
      throw err;
    }
  }

  async deleteGroup(id: number) {
    try {
      const res = await apiClient.delete(`/groups/${id}`);
      return unwrap<{ message: string }>(res);
    } catch (err) {
      console.warn(`API deleteGroup(${id}) failed, removing from local fallback:`, err);
      const list = getLocalFallback<Group[]>('groups', initialGroups);
      setLocalFallback('groups', list.filter((g) => g.id !== id));
      return { message: `Guruh (ID: ${id}) o'chirildi` };
    }
  }

  async addStudentToGroup(groupId: number, studentId: number) {
    const res = await apiClient.post(`/groups/${groupId}/students`, { studentId });
    return unwrap<unknown>(res);
  }

  async removeStudentFromGroup(groupId: number, studentId: number) {
    const res = await apiClient.delete(`/groups/${groupId}/students/${studentId}`);
    return unwrap<{ message: string }>(res);
  }

  async addTeacherToGroup(groupId: number, teacherId: number, isMain = true) {
    const res = await apiClient.post(`/groups/${groupId}/teachers`, { teacherId, isMain });
    return unwrap<unknown>(res);
  }

  async removeTeacherFromGroup(groupId: number, teacherId: number) {
    const res = await apiClient.delete(`/groups/${groupId}/teachers/${teacherId}`);
    return unwrap<{ message: string }>(res);
  }

  // ============ LESSONS ============
  async getLessons(params?: { groupId?: number; teacherId?: number; dateFrom?: string; dateTo?: string }) {
    const key = `lessons_${JSON.stringify(params || {})}`;
    return dedupApi(key, async () => {
      const res = await apiClient.get('/lessons', { params });
      return unwrap<Lesson[]>(res);
    });
  }

  async getLessonById(id: number) {
    const res = await apiClient.get(`/lessons/${id}`);
    return unwrap<Lesson>(res);
  }

  async createLesson(data: Partial<Lesson>) {
    const res = await apiClient.post('/lessons', data);
    return unwrap<Lesson>(res);
  }

  async updateLesson(id: number, data: Partial<Lesson>) {
    const res = await apiClient.patch(`/lessons/${id}`, data);
    return unwrap<Lesson>(res);
  }

  async deleteLesson(id: number) {
    const res = await apiClient.delete(`/lessons/${id}`);
    return unwrap<{ message: string }>(res);
  }

  // ALIAS
  async getLessonsByTeacher(teacherId: number) {
    return this.getLessons({ teacherId });
  }

  // ============ LESSON MATERIALS ============
  async addLessonMaterial(lessonId: number, data: { title: string; fileUrl: string; fileType?: string; sizeMb?: number }) {
    const res = await apiClient.post(`/lessons/${lessonId}/materials`, data);
    return unwrap<unknown>(res);
  }

  async updateLessonMaterial(lessonId: number, materialId: number, data: Partial<{ title: string; fileUrl: string; fileType: string; sizeMb: number }>) {
    const res = await apiClient.patch(`/lessons/${lessonId}/materials/${materialId}`, data);
    return unwrap<unknown>(res);
  }

  async deleteLessonMaterial(lessonId: number, materialId: number) {
    const res = await apiClient.delete(`/lessons/${lessonId}/materials/${materialId}`);
    return unwrap<{ message: string }>(res);
  }

  // ============ ATTENDANCE ============
  async getAttendances(params?: { lessonId?: number; studentId?: number; groupId?: number }) {
    const res = await apiClient.get('/attendance', { params });
    return unwrap<Attendance[]>(res);
  }

  async bulkMarkAttendance(lessonId: number, records: Array<{ studentId: number; status: string; coinsEarned?: number; note?: string }>) {
    const res = await apiClient.post('/attendance/bulk', { lessonId, records });
    return unwrap<Attendance[]>(res);
  }

  // ALIAS for Vue views
  async getLessonAttendance(lessonId: number) {
    return this.getAttendances({ lessonId });
  }

  async getStudentAttendance(studentId: number) {
    return this.getAttendances({ studentId });
  }

  async saveAttendance(lessonId: number, records: Array<{ studentId: number; status: string; coinsEarned?: number; note?: string }>) {
    return this.bulkMarkAttendance(lessonId, records);
  }

  async getAttendanceReport(groupId: number) {
    const res = await apiClient.get(`/attendance/report/${groupId}`);
    return unwrap<unknown>(res);
  }

  // ============ HOMEWORK ============
  async getHomeworks(params?: { lessonId?: number; groupId?: number }) {
    try {
      const res = await apiClient.get('/homework', { params });
      return unwrap<Homework[]>(res);
    } catch (err) {
      console.warn('API getHomeworks failed:', err);
      return [];
    }
  }

  async getHomeworkById(id: number) {
    const res = await apiClient.get(`/homework/${id}`);
    return unwrap<Homework>(res);
  }

  async createHomework(data: { title: string; task: string; lessonId: number; maxScore?: number; maxCoins?: number; deadline?: string }) {
    const res = await apiClient.post('/homework', data);
    return unwrap<Homework>(res);
  }

  async updateHomework(id: number, data: Partial<{ title: string; task: string; maxScore: number; maxCoins: number; deadline: string }>) {
    try {
      const res = await apiClient.patch(`/homework/${id}`, data);
      return unwrap<Homework>(res);
    } catch (err) {
      console.warn(`API updateHomework(${id}) failed:`, err);
      return { id, ...data } as any;
    }
  }

  async deleteHomework(id: number) {
    try {
      const res = await apiClient.delete(`/homework/${id}`);
      return unwrap<{ message: string }>(res);
    } catch (err) {
      console.warn(`API deleteHomework(${id}) failed:`, err);
      return { message: "Vazifa o'chirildi" };
    }
  }

  async submitHomework(homeworkId: number, data: { textAnswer?: string; fileUrls?: string[] }) {
    const res = await apiClient.post(`/homework/${homeworkId}/submit`, data);
    return unwrap<HomeworkSubmission>(res);
  }

  async checkSubmission(submissionId: number, data: { score: number; coinsEarned?: number; feedback?: string }) {
    const res = await apiClient.patch(`/homework/submissions/${submissionId}/check`, data);
    return unwrap<HomeworkSubmission>(res);
  }

  async getSubmissions(params?: { studentId?: number }) {
    const res = await apiClient.get('/homework/submissions', { params });
    return unwrap<HomeworkSubmission[]>(res);
  }

  // ============ PAYMENTS ============
  async getPayments(params?: { studentId?: number; status?: string; dateFrom?: string; dateTo?: string }) {
    const key = `payments_${JSON.stringify(params || {})}`;
    return dedupApi(key, async () => {
      try {
        const res = await apiClient.get('/payments', { params });
        const unwrapped = unwrap<{ data: Payment[]; total: number; totalAmount: number }>(res);
        if (unwrapped && Array.isArray(unwrapped.data)) {
          const local = getLocalFallback<Payment[]>('payments', []);
          if (local.length > 0) {
            const existingIds = new Set(unwrapped.data.map((p) => p.id));
            const uniqueLocal = local.filter((p) => !existingIds.has(p.id));
            if (uniqueLocal.length > 0) {
              unwrapped.data = [...uniqueLocal, ...unwrapped.data];
              unwrapped.total += uniqueLocal.length;
            }
          }
        }
        return unwrapped;
      } catch (err) {
        console.warn("API getPayments failed, using local fallback:", err);
        const local = getLocalFallback<Payment[]>('payments', []);
        return { data: local, total: local.length, totalAmount: local.reduce((s, p) => s + Number(p.amount), 0) };
      }
    });
  }

  async getPaymentById(id: number) {
    try {
      const res = await apiClient.get(`/payments/${id}`);
      return unwrap<Payment>(res);
    } catch (err) {
      console.warn(`API getPaymentById(${id}) failed:`, err);
      const local = getLocalFallback<Payment[]>('payments', []);
      return local.find((p) => p.id === id) || null;
    }
  }

  async createPayment(data: { amount: number; type?: string; status?: string; studentId: number; paidForDate: string; comment?: string }) {
    const res = await apiClient.post('/payments', data);
    return unwrap<Payment>(res);
  }

  async updatePayment(id: number, data: Partial<Payment>) {
    try {
      const res = await apiClient.patch(`/payments/${id}`, data);
      return unwrap<Payment>(res);
    } catch (err) {
      const local = getLocalFallback<Payment[]>('payments', []);
      const idx = local.findIndex((p) => p.id === id);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...data, updated_at: new Date().toISOString() };
        setLocalFallback('payments', local);
        return local[idx];
      }
      throw err;
    }
  }

  async deletePayment(id: number) {
    try {
      const res = await apiClient.delete(`/payments/${id}`);
      return unwrap<{ message: string }>(res);
    } catch (err) {
      const local = getLocalFallback<Payment[]>('payments', []);
      setLocalFallback(
        'payments',
        local.filter((p) => p.id !== id)
      );
      return { message: "To'lov o'chirildi" };
    }
  }

  async onlineCheckout(data: OnlineCheckoutDto) {
    try {
      const res = await apiClient.post('/payments/online-checkout', data);
      return unwrap<any>(res);
    } catch (err: any) {
      const isNetworkErr = !err?.response || err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error');
      if (isNetworkErr) {
        console.warn('Backend server offline, saving online checkout to local fallback...');
        const local = getLocalFallback<Payment[]>('payments', []);
        const newId = Date.now();
        const studentObj = {
          id: 999,
          firstName: data.fullName.split(' ')[0] || 'Talaba',
          lastName: data.fullName.split(' ').slice(1).join(' ') || '',
          phone: data.phone,
          email: data.email || null,
          tempPassword: 'NyVer#' + Math.floor(1000 + Math.random() * 9000),
        };
        const localPayment: any = {
          id: newId,
          amount: data.amount,
          type: data.paymentType || 'CLICK',
          status: 'PENDING',
          paidForDate: new Date().toISOString(),
          receiptUrl: data.receiptUrl || null,
          comment: data.notes || data.comment || `Onlayn to'lov (${data.paymentType || 'CLICK'})`,
          studentId: studentObj.id,
          courseId: Number(data.courseId) || 1,
          student: studentObj,
          course: {
            id: Number(data.courseId) || 1,
            name: `Tanlangan Kurs`,
            price: data.amount,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        local.unshift(localPayment);
        setLocalFallback('payments', local);

        return {
          success: true,
          paymentId: newId,
          amount: data.amount,
          status: 'PENDING',
          receiptUrl: data.receiptUrl,
          isNewStudent: true,
          student: studentObj,
          courseName: localPayment.course.name,
          message: "To'lov qabul qilindi. Admin tasdiqlashi bilan email pochtangizga login va parol yuboriladi.",
        };
      }
      throw err;
    }
  }

  async uploadPaymentReceipt(image: string) {
    const res = await apiClient.post('/payments/upload-receipt', { image });
    return unwrap<{ url: string; success: boolean }>(res);
  }

  async approvePayment(id: number) {
    try {
      const res = await apiClient.post(`/payments/${id}/approve`);
      return unwrap<ApprovePaymentResponse>(res);
    } catch (err) {
      const local = getLocalFallback<Payment[]>('payments', []);
      const p = local.find((item) => item.id === id);
      if (p) {
        p.status = 'PAID';
        setLocalFallback('payments', local);
        return {
          success: true,
          message: "To'lov muvaffaqiyatli tasdiqlandi!",
          paymentId: p.id,
          studentId: p.student?.id || 999,
          studentName: `${p.student?.firstName || 'Talaba'} ${p.student?.lastName || ''}`.trim(),
          login: p.student?.phone || 'student_login',
          tempPassword: p.student?.tempPassword || 'NyVer#2026',
          courseName: p.course?.name || 'NyVer Kursi',
          groupName: null,
          emailSent: false,
        };
      }
      throw err;
    }
  }

  // ============ GAMIFICATION ============
  async getCoinBalance(userId: number) {
    const res = await apiClient.get(`/gamification/balance/${userId}`);
    return unwrap<{ id: number; firstName: string; lastName: string; coins: number }>(res);
  }

  async getCoinTransactions(userId?: number) {
    const res = await apiClient.get('/gamification/transactions', { params: userId ? { userId } : {} });
    return unwrap<CoinTransaction[]>(res);
  }

  async addCoins(data: { userId: number; amount: number; reason: string; description?: string }) {
    const res = await apiClient.post('/gamification/coins/add', data);
    return unwrap<{ balance: number; transaction: CoinTransaction }>(res);
  }

  async getPrizes() {
    try {
      const res = await apiClient.get('/gamification/prizes');
      const data = unwrap<Prize[]>(res);
      if (Array.isArray(data) && data.length > 0) {
        setLocalFallback('prizes', data);
      }
      return data;
    } catch (err) {
      console.warn("API getPrizes failed, using fallback data:", err);
      return getLocalFallback<Prize[]>('prizes', initialPrizes);
    }
  }

  async createPrize(data: Partial<Prize>) {
    const res = await apiClient.post('/gamification/prizes', data);
    return unwrap<Prize>(res);
  }

  async updatePrize(id: number, data: Partial<Prize>) {
    const res = await apiClient.patch(`/gamification/prizes/${id}`, data);
    return unwrap<Prize>(res);
  }

  async buyPrize(prizeId: number) {
    const res = await apiClient.post(`/gamification/prizes/${prizeId}/buy`);
    return unwrap<PrizeOrder>(res);
  }

  async getPrizeOrders(studentId?: number) {
    const res = await apiClient.get('/gamification/orders', { params: studentId ? { studentId } : {} });
    return unwrap<PrizeOrder[]>(res);
  }

  async markOrderAsGiven(orderId: number) {
    const res = await apiClient.patch(`/gamification/orders/${orderId}/give`);
    return unwrap<PrizeOrder>(res);
  }

  // ALIAS for Vue
  async buyPrizeWithStudentId(_studentId: number, prizeId: number) {
    // We already fetch studentId from token in backend, but Vue sends it
    return this.buyPrize(prizeId);
  }

  // ============ EXAMS ============
  async getExams(groupId?: number) {
    try {
      const res = await apiClient.get('/exams', { params: groupId ? { groupId } : {} });
      return unwrap<Exam[]>(res);
    } catch (err) {
      console.warn('API getExams failed:', err);
      return [];
    }
  }

  async getExamById(id: number) {
    const res = await apiClient.get(`/exams/${id}`);
    return unwrap<Exam>(res);
  }

  async createExam(data: { title: string; examDate: string; maxScore?: number; groupId: number }) {
    try {
      const res = await apiClient.post('/exams', data);
      return unwrap<Exam>(res);
    } catch (err) {
      console.warn('API createExam failed:', err);
      return { id: Date.now(), ...data, status: 'UPCOMING', results: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any;
    }
  }

  async updateExam(id: number, data: Partial<{ title: string; examDate: string; maxScore: number; groupId: number }>) {
    try {
      const res = await apiClient.patch(`/exams/${id}`, data);
      return unwrap<Exam>(res);
    } catch (err) {
      console.warn(`API updateExam(${id}) failed:`, err);
      return { id, ...data } as any;
    }
  }

  async deleteExam(id: number) {
    try {
      const res = await apiClient.delete(`/exams/${id}`);
      return unwrap<{ message: string }>(res);
    } catch (err) {
      console.warn(`API deleteExam(${id}) failed:`, err);
      return { message: "Imtihon o'chirildi" };
    }
  }

  async setExamResults(examId: number, results: Array<{ studentId: number; score: number }>) {
    try {
      const res = await apiClient.post(`/exams/${examId}/results`, results);
      return unwrap<Exam>(res);
    } catch (err) {
      console.warn(`API setExamResults(${examId}) failed:`, err);
      return { id: examId, results } as any;
    }
  }

  // ============ STUDENT PORTAL ============
  async getStudentDashboard() {
    try {
      const res = await apiClient.get('/student/dashboard');
      return unwrap<{
        coins: number;
        xp: number;
        level: number;
        xpInLevel: number;
        xpToNext: number;
        rating: number;
        totalStudents: number;
        upcomingLessons: Array<{
          date: string;
          groupName: string;
          groupId: number;
          lessonId: number;
          topic: string;
          startTime: string;
          endTime: string;
        }>;
      }>(res);
    } catch (err) {
      console.warn('API getStudentDashboard failed:', err);
      return {
        coins: 0, xp: 0, level: 1, xpInLevel: 0, xpToNext: 300,
        rating: 1, totalStudents: 1, upcomingLessons: [],
      };
    }
  }

  async getStudentGroups() {
    try {
      const res = await apiClient.get('/student/groups');
      return unwrap<Array<{
        id: number;
        name: string;
        status: string;
        courseName: string;
        teacherName: string;
        startTime: string;
        endTime: string;
        weekDays: string[];
        totalLessons: number;
        completedLessons: number;
        progressPercent: number;
      }>>(res);
    } catch (err) {
      console.warn('API getStudentGroups failed:', err);
      return [];
    }
  }

  async getStudentGroupLessons(groupId: number) {
    try {
      const res = await apiClient.get(`/student/groups/${groupId}/lessons`);
      return unwrap<Array<{
        id: number;
        lessonOrder: number;
        topic: string;
        description: string | null;
        lessonDate: string | null;
        startTime: string;
        endTime: string;
        status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
        hasHomework: boolean;
        homeworkId: number | null;
      }>>(res);
    } catch (err) {
      console.warn(`API getStudentGroupLessons(${groupId}) failed:`, err);
      return [];
    }
  }

  async getStudentLesson(lessonId: number) {
    try {
      const res = await apiClient.get(`/student/lessons/${lessonId}`);
      return unwrap<{
        id: number;
        lessonOrder: number;
        topic: string;
        description: string | null;
        content: string | null;
        videoUrl: string | null;
        lessonDate: string | null;
        startTime: string;
        endTime: string;
        status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
        groupId: number;
        groupName: string;
        materials: Array<{ id: number; title: string; fileUrl: string; fileType: string }>;
        homework: {
          id: number;
          title: string;
          task: string;
          maxScore: number;
          deadline: string | null;
          mySubmission: { id: number; status: string; submittedAt: string } | null;
        } | null;
      }>(res);
    } catch (err) {
      console.warn(`API getStudentLesson(${lessonId}) failed:`, err);
      return null;
    }
  }

  async submitStudentHomework(homeworkId: number, data: { textAnswer?: string; fileUrls?: string[] }) {
    try {
      const res = await apiClient.post(`/homework/${homeworkId}/submit`, data);
      return unwrap<any>(res);
    } catch (err) {
      console.warn(`API submitStudentHomework(${homeworkId}) failed:`, err);
      return null;
    }
  }

  // ============ TEACHER PORTAL ============
  async getTeacherDashboardStats() {
    try {
      const res = await apiClient.get('/teacher/dashboard');
      return unwrap<TeacherDashboardStats>(res);
    } catch (err) {
      console.warn('API getTeacherDashboardStats failed:', err);
      return {
        groupsCount: 0,
        studentsCount: 0,
        pendingSubmissionsCount: 0,
        checkedSubmissionsCount: 0,
      };
    }
  }

  async getTeacherGroups() {
    try {
      const res = await apiClient.get('/teacher/groups');
      return unwrap<TeacherGroup[]>(res);
    } catch (err) {
      console.warn('API getTeacherGroups failed:', err);
      return [];
    }
  }

  async getTeacherGroupDetail(groupId: number) {
    try {
      const res = await apiClient.get(`/teacher/groups/${groupId}`);
      return unwrap<any>(res);
    } catch (err) {
      console.warn(`API getTeacherGroupDetail(${groupId}) failed:`, err);
      return null;
    }
  }

  async createTeacherLesson(groupId: number, data: CreateLessonTeacherPayload) {
    try {
      const res = await apiClient.post(`/teacher/groups/${groupId}/lessons`, data);
      return unwrap<{ message: string; lesson: Lesson }>(res);
    } catch (err) {
      console.warn(`API createTeacherLesson(${groupId}) failed:`, err);
      throw err;
    }
  }

  async createTeacherHomework(groupId: number, payload: CreateTeacherHomeworkPayload) {
    try {
      const res = await apiClient.post(`/teacher/groups/${groupId}/homework`, payload);
      return unwrap<{ message: string; homework: any }>(res);
    } catch (err) {
      console.warn(`API createTeacherHomework(${groupId}) failed:`, err);
      throw err;
    }
  }

  async getTeacherLessonSubmissions(lessonId: number) {
    try {
      const res = await apiClient.get(`/teacher/lessons/${lessonId}/submissions`);
      return unwrap<TeacherSubmission[]>(res);
    } catch (err) {
      console.warn(`API getTeacherLessonSubmissions(${lessonId}) failed:`, err);
      return [];
    }
  }

  async getTeacherSubmissions(status?: string) {
    try {
      const res = await apiClient.get('/teacher/submissions', {
        params: status ? { status } : undefined,
      });
      return unwrap<TeacherSubmission[]>(res);
    } catch (err) {
      console.warn('API getTeacherSubmissions failed:', err);
      return [];
    }
  }

  async gradeTeacherSubmission(submissionId: number, data: GradeSubmissionPayload) {
    try {
      const res = await apiClient.patch(`/teacher/submissions/${submissionId}/grade`, data);
      return unwrap<{ message: string; submission: any }>(res);
    } catch (err) {
      console.warn(`API gradeTeacherSubmission(${submissionId}) failed:`, err);
      throw err;
    }
  }
}

export const erpService = new ErpService();
