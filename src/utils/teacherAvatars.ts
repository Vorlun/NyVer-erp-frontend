// Professional curated photos for mentors & teachers
export interface TeacherProfileMeta {
  photo: string;
  specialty: string;
  experience: string;
  bio: string;
  rating: number;
  studentsCount: number;
}

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80', // Male Dev 1
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', // Male Dev 2
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80', // Female Instructor
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80', // Female Designer
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80', // Senior Lead
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', // Female Pro
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80', // Male Pro
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80', // Young Dev
];

export function getTeacherPhoto(teacher: { id?: number; firstName?: string; lastName?: string; email?: string | null }): string {
  const name = `${teacher.firstName || ''} ${teacher.lastName || ''}`.toLowerCase();
  const email = (teacher.email || '').toLowerCase();

  if (email.includes('alisher') || name.includes('alisher') || email.includes('backend')) {
    return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&h=1000&crop=faces&q=85';
  }
  if (email.includes('bekzod') || name.includes('bekzod') || email.includes('ai')) {
    return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&h=1000&crop=faces&q=85';
  }
  if (email.includes('dilnoza') || name.includes('dilnoza') || email.includes('ielts')) {
    return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&h=1000&crop=faces&q=85';
  }
  if (email.includes('malika') || name.includes('malika') || email.includes('design')) {
    return 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&h=1000&crop=faces&q=85';
  }
  if (email.includes('oybek') || name.includes('oybek') || email.includes('one.humoyun')) {
    return 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&h=1000&crop=faces&q=85';
  }
  if (email.includes('rustam') || name.includes('rustam') || email.includes('teacher')) {
    return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&h=1000&crop=faces&q=85';
  }

  // Consistent hash-based photo for any dynamic/new mentor
  const idNum = teacher.id || 0;
  let hash = idNum;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_PHOTOS.length;
  return DEFAULT_PHOTOS[index];
}

export function getTeacherMeta(teacher: { id?: number; firstName?: string; lastName?: string; email?: string | null }): TeacherProfileMeta {
  const name = `${teacher.firstName || ''} ${teacher.lastName || ''}`.toLowerCase();
  const email = (teacher.email || '').toLowerCase();
  const photo = getTeacherPhoto(teacher);

  if (email.includes('alisher') || name.includes('alisher') || email.includes('backend')) {
    return {
      photo,
      specialty: 'Backend Dasturlash (NestJS)',
      experience: '5+ yil tajriba',
      bio: 'Enterprise arxitektura va yuqori yuklamali NestJS/PostgreSQL tizimlari bo\'yicha mutaxassis.',
      rating: 4.9,
      studentsCount: 48,
    };
  }
  if (email.includes('bekzod') || name.includes('bekzod') || email.includes('ai')) {
    return {
      photo,
      specialty: 'Python & AI (Data Science)',
      experience: '4+ yil tajriba',
      bio: 'Machine Learning modellarini ishlab chiqish va sun\'iy intellekt amaliyotlari bo\'yicha yetakchi mentor.',
      rating: 5.0,
      studentsCount: 36,
    };
  }
  if (email.includes('dilnoza') || name.includes('dilnoza') || email.includes('ielts')) {
    return {
      photo,
      specialty: 'IELTS Intensive (8.5 Band)',
      experience: '7+ yil tajriba',
      bio: 'O\'quvchilarga 7.5+ va 8.0+ IELTS natijalarini kafolatlovchi xalqaro sertifikatli instruktor.',
      rating: 4.9,
      studentsCount: 62,
    };
  }
  if (email.includes('malika') || name.includes('malika') || email.includes('design')) {
    return {
      photo,
      specialty: 'UI/UX Dizayn & Figma Pro',
      experience: '4+ yil tajriba',
      bio: 'Figma, Design System va zamonaviy web/mobile interfeyslar bo\'yicha senior dizayner.',
      rating: 4.8,
      studentsCount: 42,
    };
  }
  if (email.includes('rustam') || name.includes('rustam') || email.includes('teacher')) {
    return {
      photo,
      specialty: 'Frontend Dasturlash (Vue 3)',
      experience: '6+ yil tajriba',
      bio: 'Vue 3, TypeScript va SPA ilovalar yaratish bo\'yicha yetakchi dasturchi va bosh mentor.',
      rating: 4.9,
      studentsCount: 54,
    };
  }

  return {
    photo,
    specialty: 'Bosh Mentor / Dasturchi',
    experience: '3+ yil tajriba',
    bio: 'Zamonaviy metodikalar bo\'yicha amaliy mashg\'ulotlar olib boruvchi tajribali o\'qituvchi.',
    rating: 4.8,
    studentsCount: 25,
  };
}
