// ------------------------------------------------------
// ENUMS (from server/prisma/schema.prisma)
// ------------------------------------------------------

export type Role = 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'ASSISTANT';

export const RoleEnum = {
  SUPERADMIN: 'SUPERADMIN' as Role,
  ADMIN: 'ADMIN' as Role,
  TEACHER: 'TEACHER' as Role,
  STUDENT: 'STUDENT' as Role,
  ASSISTANT: 'ASSISTANT' as Role,
};

export type Status = 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'ARCHIVED';

export type WeekDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type GroupStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type HomeworkSubmissionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'CHECKED'
  | 'REJECTED'
  | 'NOT_SUBMITTED';

export type PaymentType =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'PAYME'
  | 'CLICK'
  | 'UZUM';

export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED';

export type CoinReason =
  | 'ATTENDANCE'
  | 'HOMEWORK_EXCELLENT'
  | 'EXAM_TOP'
  | 'PRIZE_PURCHASE'
  | 'MANUAL_ADJUSTMENT';

// ------------------------------------------------------
// MODELS
// ------------------------------------------------------

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: Role;
  email?: string | null;
  phone: string;
  birthDate?: string | null;
  password?: string;
  photo?: string | null;
  coins: number;
  address?: string | null;
  tempPassword?: string | null;
  status: Status;
  created_at: string;
  updated_at: string;

  // Relations (optional when populated)
  studentEnrollments?: GroupStudent[];
  teachingGroups?: GroupTeacher[];
  createdLessons?: Lesson[];
  markedAttendances?: Attendance[];
  studentAttendances?: Attendance[];
  homeworkSubmissions?: HomeworkSubmission[];
  checkedSubmissions?: HomeworkSubmission[];
  coinTransactions?: CoinTransaction[];
  payments?: Payment[];
  examResults?: ExamResult[];
  prizeOrders?: PrizeOrder[];
}

export interface Course {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  durationMonths: number;
  lessonsPerMonth: number;
  totalLessons: number;
  status: Status;
  created_at: string;
  updated_at: string;

  groups?: Group[];
  syllabus?: CourseSyllabus[];
}

export interface CourseSyllabus {
  id: number;
  lessonOrder: number;
  topic: string;
  description?: string | null;
  courseId: number;
  course?: Course;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  status: Status;
  created_at: string;
  updated_at: string;

  groups?: Group[];
  lessons?: Lesson[];
}

export interface Group {
  id: number;
  name: string;
  startDate: string;
  endDate?: string | null;
  startTime: string; // "14:00"
  endTime: string;   // "16:00"
  maxStudents: number;
  weekDays: WeekDay[];
  status: GroupStatus;
  courseId: number;
  roomId: number;
  teacherId?: number;
  created_at: string;
  updated_at: string;

  course?: Course;
  room?: Room;
  students?: GroupStudent[];
  teachers?: GroupTeacher[];
  lessons?: Lesson[];
  exams?: Exam[];
}

export interface GroupStudent {
  id: number;
  studentId: number;
  groupId: number;
  joinedAt: string;
  status: Status;
  created_at: string;
  updated_at: string;

  student?: User;
  group?: Group;
}

export interface GroupTeacher {
  id: number;
  teacherId: number;
  groupId: number;
  isMain: boolean;
  status: Status;
  created_at: string;
  updated_at: string;

  teacher?: User;
  group?: Group;
}

export interface Lesson {
  id: number;
  lessonOrder: number;
  topic: string;
  description?: string | null;
  videoUrl?: string | null;
  content?: string | null;
  attachedFiles?: string[];
  lessonDate: string;
  startTime?: string | null;
  endTime?: string | null;
  groupId: number;
  teacherId?: number | null;
  roomId?: number | null;
  status: Status;
  created_at: string;
  updated_at: string;

  group?: Group;
  teacher?: User | null;
  room?: Room | null;
  attendances?: Attendance[];
  homework?: Homework | null;
  materials?: LessonMaterial[];
}

export interface LessonMaterial {
  id: number;
  title: string;
  fileUrl: string;
  fileType?: string | null;
  sizeMb?: number | null;
  lessonId: number;
  created_at: string;
  updated_at: string;

  lesson?: Lesson;
}

export interface Attendance {
  id: number;
  status: AttendanceStatus;
  coinsEarned: number;
  note?: string | null;
  studentId: number;
  lessonId: number;
  markedById: number;
  created_at: string;
  updated_at: string;

  student?: User;
  lesson?: Lesson;
  markedBy?: User;
}

export interface Homework {
  id: number;
  title: string;
  task: string;
  fileUrls: string[];
  maxScore: number;
  maxCoins: number;
  deadline?: string | null;
  lessonId: number;
  created_at: string;
  updated_at: string;

  lesson?: Lesson;
  submissions?: HomeworkSubmission[];
}

export interface HomeworkSubmission {
  id: number;
  textAnswer?: string | null;
  fileUrls: string[];
  fileUrl?: string | null;
  status: HomeworkSubmissionStatus;
  score?: number | null;
  coinsEarned: number;
  feedback?: string | null;
  homeworkId?: number;
  lessonId?: number | null;
  studentId: number;
  checkedById?: number | null;
  submittedAt: string;
  checkedAt?: string | null;
  updated_at: string;

  homework?: Homework;
  lesson?: Lesson;
  student?: User;
  checkedBy?: User | null;
}

export interface Exam {
  id: number;
  title: string;
  examDate: string;
  maxScore: number;
  groupId: number;
  created_at: string;
  updated_at: string;

  group?: Group;
  results?: ExamResult[];
}

export interface ExamResult {
  id: number;
  score: number;
  examId: number;
  studentId: number;
  created_at: string;
  updated_at: string;

  exam?: Exam;
  student?: User;
}

export interface CoinTransaction {
  id: number;
  amount: number;
  reason: CoinReason;
  description?: string | null;
  userId: number;
  created_at: string;

  user?: User;
}

export interface Prize {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceCoins: number;
  stockCount: number;
  status: Status;
  created_at: string;
  updated_at: string;

  orders?: PrizeOrder[];
}

export interface PrizeOrder {
  id: number;
  studentId: number;
  prizeId: number;
  coinsSpent: number;
  isGiven: boolean;
  created_at: string;
  updated_at: string;

  student?: User;
  prize?: Prize;
}

export interface Payment {
  id: number;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  paidForDate: string;
  comment?: string | null;
  receiptUrl?: string | null;
  studentId: number;
  courseId?: number | null;
  created_at: string;
  updated_at: string;

  student?: User;
  course?: Course | null;
}

export interface OnlineCheckoutDto {
  fullName: string;
  phone: string;
  email: string;
  courseId: number | string;
  amount: number;
  paymentType?: PaymentType;
  cardNumber?: string;
  receiptUrl?: string | null;
  notes?: string;
  comment?: string;
}

export interface ApprovePaymentResponse {
  success: boolean;
  message: string;
  paymentId: number;
  studentId: number;
  studentName: string;
  login: string;
  tempPassword: string | null;
  courseName: string;
  groupName: string | null;
  emailSent: boolean;
}

// ------------------------------------------------------
// AUTH TYPES & DTOs
// ------------------------------------------------------

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginDto {
  login: string; // phone or email
  password: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  role: Role;
  phone: string;
  email?: string;
  password?: string;
  address?: string;
}

export interface CreateGroupDto {
  name: string;
  courseId: number;
  roomId: number;
  teacherId: number;
  startDate: string;
  startTime: string;
  endTime: string;
  weekDays: WeekDay[];
  maxStudents?: number;
}

// ------------------------------------------------------
// TEACHER MODULE INTERFACES
// ------------------------------------------------------

export interface TeacherGroup {
  id: number;
  name: string;
  courseId: number;
  courseName: string;
  roomId: number;
  roomName: string;
  startTime: string;
  endTime: string;
  weekDays: WeekDay[];
  status: GroupStatus;
  maxStudents: number;
  studentsCount: number;
  lessonsCount: number;
  coursePrice?: number;
  groupMonthlyRevenue?: number;
  teacherEarnings?: number;
  students: Array<{
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    photo?: string | null;
    coins: number;
  }>;
  recentLessons: Array<{
    id: number;
    topic: string;
    lessonOrder: number;
    lessonDate: string | null;
    videoUrl?: string | null;
  }>;
}

export interface TeacherSubmission {
  id: number;
  homeworkId?: number;
  lessonId: number;
  lessonTopic: string;
  groupName: string;
  student: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    photo?: string | null;
    coins: number;
  };
  textAnswer?: string | null;
  fileUrls: string[];
  fileUrl?: string | null;
  status: HomeworkSubmissionStatus;
  score?: number | null;
  coinsEarned: number;
  feedback?: string | null;
  submittedAt: string;
  checkedAt?: string | null;
  checkedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

export interface CreateLessonTeacherPayload {
  topic: string;
  videoUrl?: string;
  content?: string;
  attachedFiles?: string[];
  homeworkTask?: string;
  lessonOrder?: number;
  lessonDate?: string;
  startTime?: string;
  endTime?: string;
}

export interface CreateTeacherHomeworkPayload {
  title: string;
  task: string;
  lessonId?: number;
  maxScore?: number;
  maxCoins?: number;
  deadline?: string;
  fileUrls?: string[];
}

export interface GradeSubmissionPayload {
  score: number;
  feedback?: string;
  coinsEarned?: number;
  status?: 'CHECKED' | 'ACCEPTED' | 'REJECTED';
}

export interface TeacherDashboardStats {
  groupsCount: number;
  studentsCount: number;
  pendingSubmissionsCount: number;
  checkedSubmissionsCount: number;
  totalPotentialRevenue?: number;
  totalTeacherEstimatedEarnings?: number;
}

