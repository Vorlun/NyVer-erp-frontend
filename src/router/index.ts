import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { setupRouteGuards } from './guards';

// Lazy-loaded Layouts
const AdminLayout = () => import('../layouts/AdminLayout.vue');
const TeacherLayout = () => import('../layouts/TeacherLayout.vue');
const StudentLayout = () => import('../layouts/StudentLayout.vue');

// Lazy-loaded Views
const LandingView = () => import('../views/LandingView.vue');
const CheckoutChatView = () => import('../views/CheckoutChatView.vue');
const LoginView = () => import('../views/auth/LoginView.vue');
const SetPasswordView = () => import('../views/auth/SetPasswordView.vue');
const ForbiddenView = () => import('../views/errors/ForbiddenView.vue');
const NotFoundView = () => import('../views/errors/NotFoundView.vue');

// Lazy-loaded Admin Views
const AdminDashboard = () => import('../views/admin/DashboardView.vue');
const AdminTeachers = () => import('../views/admin/TeachersView.vue');
const AdminGroups = () => import('../views/admin/GroupsView.vue');
const AdminStudents = () => import('../views/admin/StudentsView.vue');
const AdminManagement = () => import('../views/admin/ManagementView.vue');
const AdminUsers = () => import('../views/admin/UsersView.vue');
const AdminCoinsManagement = () => import('../views/admin/CoinsManagementView.vue');
const AdminBroadcast = () => import('../views/admin/BroadcastView.vue');
const AdminPrizes = () => import('../views/admin/PrizesView.vue');
const AdminProfile = () => import('../views/admin/ProfileView.vue');
const AdminPayments = () => import('../views/admin/PaymentsView.vue');
const AdminUserDetail = () => import('../views/admin/UserDetailView.vue');
const AdminGroupDetail = () => import('../views/admin/GroupDetailView.vue');
const AdminContacts = () => import('../views/admin/ContactsView.vue');
const AdminStudentCoinDetail = () => import('../views/admin/StudentCoinDetailView.vue');

// Lazy-loaded Teacher Views
const TeacherDashboard = () => import('../views/teacher/DashboardView.vue');
const TeacherAttendance = () => import('../views/teacher/AttendanceView.vue');
const TeacherHomework = () => import('../views/teacher/HomeworkCheckView.vue');

// Lazy-loaded Student Views
const StudentDashboard = () => import('../views/student/DashboardView.vue');
const StudentAttendance = () => import('../views/student/AttendanceView.vue');
const StudentHomework = () => import('../views/student/HomeworkView.vue');
const StudentCoinsShop = () => import('../views/student/CoinsShopView.vue');
const StudentGroupsView = () => import('../views/student/StudentGroupsView.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: LandingView,
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: '/set-password',
    name: 'set-password',
    component: SetPasswordView,
    meta: { requiresAuth: false },
  },
  {
    path: '/checkout',
    name: 'checkout-chat',
    component: CheckoutChatView,
    meta: { requiresAuth: false },
  },

  // PRIMARY DASHBOARD & MANAGEMENT ROUTES (Admin & SuperAdmin)
  {
    path: '/dashboard',
    component: AdminLayout,
    meta: { requiresAuth: true, roles: ['ADMIN', 'SUPERADMIN'] },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: AdminDashboard,
      },
      {
        path: 'teachers',
        name: 'admin-teachers',
        component: AdminTeachers,
      },
      {
        path: 'groups',
        name: 'admin-groups',
        component: AdminGroups,
      },
      {
        path: 'students',
        name: 'admin-students',
        component: AdminStudents,
      },
      {
        path: 'payments',
        name: 'admin-payments',
        component: AdminPayments,
      },
      {
        path: 'gifts',
        name: 'admin-gifts',
        component: AdminPrizes,
      },
      {
        path: 'contacts',
        name: 'admin-contacts',
        component: AdminContacts,
      },
      {
        path: 'profile',
        name: 'admin-profile',
        component: AdminProfile,
      },
      {
        path: 'users/:id',
        name: 'admin-user-detail',
        component: AdminUserDetail,
      },
      {
        path: 'groups/:id',
        name: 'admin-group-detail',
        component: AdminGroupDetail,
      },
    ],
  },
  {
    path: '/profile',
    redirect: '/dashboard/profile',
  },
  {
    path: '/management',
    component: AdminLayout,
    meta: { requiresAuth: true, roles: ['ADMIN', 'SUPERADMIN'] },
    children: [
      {
        path: '',
        redirect: '/management/course',
      },
      {
        path: 'course',
        name: 'admin-management-course',
        component: AdminManagement,
      },
      {
        path: 'rooms',
        name: 'admin-management-rooms',
        component: AdminManagement,
      },
      {
        path: 'staff',
        name: 'admin-management-staff',
        component: AdminManagement,
      },
      {
        path: 'coins',
        name: 'admin-management-coins',
        component: AdminCoinsManagement,
      },
      {
        path: 'coins/:id',
        name: 'admin-management-coin-detail',
        component: AdminStudentCoinDetail,
      },
      {
        path: 'broadcast',
        name: 'admin-management-broadcast',
        component: AdminBroadcast,
      },
      {
        path: 'teachers',
        name: 'admin-management-teachers',
        component: AdminTeachers,
      },
    ],
  },

  // LEGACY & ADMIN ALIAS ROUTES (SUPERADMIN & ADMIN)
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, roles: ['ADMIN', 'SUPERADMIN'] },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        redirect: '/dashboard',
      },
      {
        path: 'users',
        name: 'admin-users',
        component: AdminUsers,
      },
      {
        path: 'teachers',
        redirect: '/dashboard/teachers',
      },
      {
        path: 'groups',
        redirect: '/dashboard/groups',
      },
      {
        path: 'students',
        redirect: '/dashboard/students',
      },
      {
        path: 'courses',
        redirect: '/management/course',
      },
      {
        path: 'rooms',
        redirect: '/management/rooms',
      },
      {
        path: 'broadcast',
        name: 'admin-broadcast',
        component: AdminBroadcast,
      },
      {
        path: 'payments',
        redirect: '/dashboard/payments',
      },
      {
        path: 'prizes',
        redirect: '/dashboard/gifts',
      },
      {
        path: 'profile',
        redirect: '/dashboard/profile',
      },
      {
        path: 'users/:id',
        redirect: (to) => `/dashboard/users/${to.params.id}`,
      },
      {
        path: 'groups/:id',
        redirect: (to) => `/dashboard/groups/${to.params.id}`,
      },
      {
        path: 'students/:id',
        redirect: (to) => `/dashboard/users/${to.params.id}`,
      },
      {
        path: 'teachers/:id',
        redirect: (to) => `/dashboard/users/${to.params.id}`,
      },
    ],
  },

  // TEACHER ROUTES
  {
    path: '/teacher',
    component: TeacherLayout,
    meta: { requiresAuth: true, roles: ['TEACHER', 'ADMIN', 'SUPERADMIN'] },
    children: [
      {
        path: '',
        redirect: { name: 'teacher-dashboard' },
      },
      {
        path: 'dashboard',
        name: 'teacher-dashboard',
        component: TeacherDashboard,
      },
      {
        path: 'groups/:id',
        name: 'teacher-group-detail',
        component: AdminGroupDetail,
      },
      {
        path: 'attendance',
        name: 'teacher-attendance',
        component: TeacherAttendance,
      },
      {
        path: 'homework',
        name: 'teacher-homework',
        component: TeacherHomework,
      },
    ],
  },

  // STUDENT ROUTES
  {
    path: '/student',
    component: StudentLayout,
    meta: { requiresAuth: true, roles: ['STUDENT', 'ADMIN', 'SUPERADMIN'] },
    children: [
      {
        path: '',
        redirect: { name: 'student-dashboard' },
      },
      {
        path: 'dashboard',
        name: 'student-dashboard',
        component: StudentDashboard,
      },
      {
        path: 'attendance',
        name: 'student-attendance',
        component: StudentAttendance,
      },
      {
        path: 'homework',
        name: 'student-homework',
        component: StudentHomework,
      },
      {
        path: 'coins-shop',
        name: 'student-coins-shop',
        component: StudentCoinsShop,
      },
      {
        path: 'groups/:id',
        name: 'student-group-lessons',
        component: StudentGroupsView,
      },
    ],
  },

  // ERROR ROUTES
  {
    path: '/403',
    name: 'forbidden',
    component: ForbiddenView,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(setupRouteGuards);
