import { TournamentData, SportCategory, MedalTally, Registration, Match, Announcement, SportId, Tournament } from '../types/sports';

export const initialSports: SportCategory[] = [
  {
    id: 'football',
    name: 'Bóng đá',
    englishName: 'Football',
    iconName: 'Trophy',
    color: 'from-emerald-500 to-teal-700',
    venue: 'Sân bóng đá cỏ nhân tạo THPT Phú Lâm',
    description: 'Thi đấu bóng đá mini 5 người theo thể thức vòng bảng & loại trực tiếp.',
    subCategories: ['Bóng đá Nam Khối 10', 'Bóng đá Nam Khối 11', 'Bóng đá Nam Khối 12', 'Bóng đá Nữ Lớp Open'],
    maxTeamMembers: 10,
    minTeamMembers: 5,
    rulesSummary: 'Mỗi hiệp 20 phút. Thi đấu 5v5. Áp dụng luật bóng đá 5 người do VFF ban hành.'
  },
  {
    id: 'volleyball',
    name: 'Bóng chuyền',
    englishName: 'Volleyball',
    iconName: 'Activity',
    color: 'from-amber-500 to-orange-600',
    venue: 'Sân bóng chuyền ngoài trời',
    description: 'Giải bóng chuyền nam & nữ các khối lớp, thi đấu 6 người.',
    subCategories: ['Bóng chuyền Nam', 'Bóng chuyền Nữ'],
    maxTeamMembers: 12,
    minTeamMembers: 6,
    rulesSummary: 'Thi đấu 3 hiệp thắng 2 (mỗi hiệp 25 điểm, hiệp quyết định 15 điểm).'
  },
  {
    id: 'basketball',
    name: 'Bóng rổ',
    englishName: 'Basketball',
    iconName: 'Flame',
    color: 'from-orange-500 to-amber-600',
    venue: 'Sân bóng rổ Đa năng THPT Phú Lâm',
    description: 'Môn thi đấu sôi động hấp dẫn bậc nhất với thể thức 5x5 Toàn Trường và 3x3 Học Đường.',
    subCategories: [
      'Bóng rổ Nam Toàn Trường (5x5)',
      'Bóng rổ Nữ Học Đường (3x3)',
      'Bóng rổ Nam Khối 12',
      'Bóng rổ Nam Khối 11',
      'Bóng rổ Nam Khối 10'
    ],
    maxTeamMembers: 12,
    minTeamMembers: 5,
    rulesSummary: 'Thi đấu 4 hiệp x 10 phút (5v5) hoặc 10 phút / 21 điểm (3x3). Luật thi đấu FIBA học đường.'
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    englishName: 'Pickleball',
    iconName: 'Zap',
    color: 'from-lime-500 to-emerald-600',
    venue: 'Sân Pickleball mới THPT Phú Lâm',
    description: 'Môn thể thao hiện đại, sôi động thu hút đông đảo học sinh.',
    subCategories: ['Đôi Nam-Nữ Pickleball', 'Đôi Nam Pickleball', 'Đôi Nữ Pickleball'],
    maxTeamMembers: 2,
    minTeamMembers: 2,
    rulesSummary: 'Thi đấu 3 séc thắng 2, mỗi séc 11 điểm (chênh lệch 2 điểm).'
  },
  {
    id: 'badminton',
    name: 'Cầu lông',
    englishName: 'Badminton',
    iconName: 'Target',
    color: 'from-cyan-500 to-blue-600',
    venue: 'Nhà thi đấu đa năng Khối A',
    description: 'Thi đấu Đơn Nam, Đơn Nữ và Đôi Nam Nữ sôi nổi.',
    subCategories: ['Đơn Nam', 'Đơn Nữ', 'Đôi Nam Nữ'],
    maxTeamMembers: 2,
    minTeamMembers: 1,
    rulesSummary: 'Thi đấu 3 séc thắng 2, chạm 21 điểm (cách biệt 2 điểm).'
  },
  {
    id: 'tugofwar',
    name: 'Kéo co',
    englishName: 'Tug of War',
    iconName: 'Users',
    color: 'from-rose-500 to-red-700',
    venue: 'Sân trung tâm trường THPT Phú Lâm',
    description: 'Môn thi thể hiện tinh thần đoàn kết tuyệt đối của tập thể lớp.',
    subCategories: ['Đồng đội Nam-Nữ (5 Nam, 5 Nữ)'],
    maxTeamMembers: 12,
    minTeamMembers: 10,
    rulesSummary: 'Thi đấu 3 hiệp kéo thắng 2. Mỗi đội gồm 5 Nam và 5 Nữ.'
  },
  {
    id: 'chess',
    name: 'Cờ Vua',
    englishName: 'Chess',
    iconName: 'Crown',
    color: 'from-purple-500 to-indigo-700',
    venue: 'Phòng Truyền Thống / Thư viện trường',
    description: 'Trí tuệ học đường, thi đấu cờ nhanh cá nhân Nam/Nữ.',
    subCategories: ['Cờ Vua Nam', 'Cờ Vua Nữ'],
    maxTeamMembers: 1,
    minTeamMembers: 1,
    rulesSummary: 'Hệ Thụy Sĩ 5 ván. Thời gian 15 phút + 5 giây cho mỗi ván đấu.'
  },
  {
    id: 'xiangqi',
    name: 'Cờ Tướng',
    englishName: 'Xiangqi',
    iconName: 'Shield',
    color: 'from-amber-600 to-yellow-800',
    venue: 'Phòng Cờ Học Đường',
    description: 'Thi đấu Cờ Tướng truyền thống cá nhân.',
    subCategories: ['Cờ Tướng Nam', 'Cờ Tướng Nữ'],
    maxTeamMembers: 1,
    minTeamMembers: 1,
    rulesSummary: 'Thi đấu Hệ Thụy Sĩ 5 vòng. 15 phút mỗi bên.'
  },
  {
    id: 'caro',
    name: 'Cờ Caro',
    englishName: 'Gomoku / Caro',
    iconName: 'Grid',
    color: 'from-fuchsia-500 to-pink-600',
    venue: 'Khu vực Sảnh Sinh Hoạt',
    description: 'Môn thi đấu Caro vui nhộn, đòi hỏi tính toán cực kỳ nhạy bén.',
    subCategories: ['Cờ Caro Nam', 'Cờ Caro Nữ'],
    maxTeamMembers: 1,
    minTeamMembers: 1,
    rulesSummary: 'Luật 5 nước không bị chặn 2 đầu. Thi đấu 3 ván thắng 2.'
  }
];

export interface SchoolClassTeam {
  className: string;
  grade: number;
  teacher: string;
  captain: string;
  phone: string;
  members: string[];
  emblem?: string;
}

export const DEFAULT_CLASS_EMBLEMS: Record<string, string> = {
  '10A1': '🦁', // Sư tử dũng mãnh
  '10A2': '🐯', // Hổ gầm
  '10A3': '🦅', // Đại bàng
  '10A4': '⚡', // Tia chớp
  '10A5': '🚀', // Tên lửa
  '10A6': '🐺', // Sói tuyết
  '10A7': '🐲', // Rồng thần
  '10A8': '🎯', // Bách phát
  '10A9': '🔥', // Chiến binh lửa
  '10A10': '👑', // Vương miện
  '11A1': '🛡️', // Khiên vàng
  '11A2': '💎', // Kim cương
  '12A1': '🌪️', // Cuồng phong
  '12A2': '🦈', // Cá mập
  '12A3': '🐼', // Gấu chiến
  '12A4': '🥊', // Găng đấm
  '12A5': '🏆', // Cúp vàng
  '12A7': '⭐', // Ngôi sao
  '12A8': '🐆', // Báo gấm
  '12A9': '🦄', // Kỳ lân
};

export const PRESET_EMBLEMS = [
  { icon: '🦁', name: 'Sư tử' },
  { icon: '🐯', name: 'Hổ gầm' },
  { icon: '🦅', name: 'Đại bàng' },
  { icon: '⚡', name: 'Tia chớp' },
  { icon: '🚀', name: 'Tên lửa' },
  { icon: '🐺', name: 'Sói tuyết' },
  { icon: '🐲', name: 'Rồng thần' },
  { icon: '🎯', name: 'Bách phát' },
  { icon: '🔥', name: 'Ngọn lửa' },
  { icon: '👑', name: 'Vương miện' },
  { icon: '🛡️', name: 'Khiên vàng' },
  { icon: '💎', name: 'Kim cương' },
  { icon: '🌪️', name: 'Cuồng phong' },
  { icon: '🦈', name: 'Cá mập' },
  { icon: '🐼', name: 'Gấu chiến' },
  { icon: '🥊', name: 'Găng đấm' },
  { icon: '🏆', name: 'Cúp vàng' },
  { icon: '⭐', name: 'Ngôi sao' },
  { icon: '🐆', name: 'Báo gấm' },
  { icon: '🦄', name: 'Kỳ lân' },
  { icon: '⚔️', name: 'Song kiếm' },
  { icon: '⚓', name: 'Mỏ neo' },
  { icon: '🌋', name: 'Núi lửa' },
  { icon: '☄️', name: 'Sao băng' },
];

export const isSystemPlaceholderTeam = (teamName?: string, registrations: Registration[] = []): boolean => {
  if (!teamName) return true;
  const trimmed = teamName.trim();
  if (!trimmed || trimmed === '---') return true;

  // If this exact name exists in registrations, it is NEVER a placeholder
  if (registrations.length > 0 && registrations.some((r) => r.className.trim() === trimmed)) {
    return false;
  }

  // System placeholder patterns generated for bracket progression
  if (
    /^---\s*\(Trống\)\s*---$/i.test(trimmed) ||
    trimmed.includes('--- Trống ---') ||
    trimmed.includes('Chờ xếp') ||
    /^(Thắng|Thua)\s+(Trận|Vòng|Tứ Kết|Bán Kết|Nhánh|Cặp|BK|TK|R\d|V\d|VL|Sơ Loại|Playoff)/i.test(trimmed) ||
    /^(Nhất|Nhì|Hạng\s+\d+|Quán quân|Á quân)\s+(Bảng|Vòng|Nhánh|Toàn)/i.test(trimmed) ||
    /^(Đội hạt giống|Hạt giống|Hạt Giống|Đội Đấu Vòng Loại|Đội Đấu Loại|Vị trí\s+[A-Z]?\d+|Miễn đấu|Miễn vòng|Đặc cách|Chờ đối thủ)/i.test(trimmed) ||
    /^Đội\s+\d+(\s+Bảng\s+[A-Z])?$/i.test(trimmed) ||
    /^[A-Z]\d+\s*\(Đội\s+\d+\)$/i.test(trimmed)
  ) {
    return true;
  }

  return false;
};

export const getTeamEmblem = (teamName: string, registrations: Registration[] = []): string => {
  if (!teamName) return '🏅';
  const clean = teamName.replace(/^Lớp\s+/i, '').trim().toUpperCase();

  // 1. Direct match or inclusion in registrations
  const reg = registrations.find((r) => {
    const regClass = r.className.toUpperCase();
    return regClass === clean || clean.includes(regClass) || regClass.includes(clean);
  });
  if (reg?.emblem) return reg.emblem;

  // 2. Status/placeholder labels in bracket progression (check before class match)
  if (isSystemPlaceholderTeam(teamName, registrations)) {
    return '⏳';
  }

  // 3. Check default class emblems mapping
  for (const [cls, emb] of Object.entries(DEFAULT_CLASS_EMBLEMS)) {
    if (clean.includes(cls)) return emb;
  }

  return '🏅';
};

export const OFFICIAL_20_CLASSES: SchoolClassTeam[] = [
  { className: '10A1', grade: 10, teacher: 'Cô Vũ Thị Hà', captain: 'Đặng Ngọc Ánh', phone: '0901122334', emblem: '🦁', members: ['Đặng Ngọc Ánh', 'Nguyễn Văn Mạnh', 'Trần Quốc Bảo', 'Lê Hoàng Hải', 'Vũ Đức Thịnh'] },
  { className: '10A2', grade: 10, teacher: 'Thầy Phan Thanh Tùng', captain: 'Trần Minh Quân', phone: '0902233445', emblem: '🐯', members: ['Trần Minh Quân', 'Đỗ Thành Long', 'Nguyễn Anh Tuấn', 'Lê Tấn Lộc', 'Hoàng Minh Trí'] },
  { className: '10A3', grade: 10, teacher: 'Thầy Bùi Hoàng n', captain: 'Nguyễn Tấn Minh', phone: '0903344556', emblem: '🦅', members: ['Nguyễn Tấn Minh', 'Võ Hoàng Khang', 'Phan Văn Hiếu', 'Trương Bá Đạt', 'Lâm Gia Huy'] },
  { className: '10A4', grade: 10, teacher: 'Cô Đinh Thúy Nga', captain: 'Lê Hoàng Long', phone: '0904455667', emblem: '⚡', members: ['Lê Hoàng Long', 'Nguyễn Đức Thắng', 'Phạm Quốc Hùng', 'Bùi Văn Sang', 'Vũ Nhật Nam'] },
  { className: '10A5', grade: 10, teacher: 'Thầy Võ Quốc Tuấn', captain: 'Phạm Đức Duy', phone: '0905566778', emblem: '🚀', members: ['Phạm Đức Duy', 'Trần Hoàng Bách', 'Nguyễn Minh Quân', 'Lê Tuấn Tú', 'Đỗ Hải Đăng'] },
  { className: '10A6', grade: 10, teacher: 'Cô Hoàng Mai Lan', captain: 'Vũ Gia Bảo', phone: '0906677889', emblem: '🐺', members: ['Vũ Gia Bảo', 'Đặng Thành Công', 'Lý Tấn Phát', 'Trần Bảo Long', 'Nguyễn Hữu Tài'] },
  { className: '10A7', grade: 10, teacher: 'Thầy Ngô Kiến Huy', captain: 'Đỗ Tuấn Kiệt', phone: '0907788990', emblem: '🐲', members: ['Đỗ Tuấn Kiệt', 'Bùi Xuân Hinh', 'Phan Văn Toàn', 'Nguyễn Hoàng Đức', 'Võ Trọng Nghĩa'] },
  { className: '10A8', grade: 10, teacher: 'Cô Trần Mỹ Hạnh', captain: 'Hồ Tấn Đạt', phone: '0908899001', emblem: '🎯', members: ['Hồ Tấn Đạt', 'Nguyễn Hải Phong', 'Lê Gia Hưng', 'Trần Minh Triết', 'Vũ Tuấn Anh'] },
  { className: '10A9', grade: 10, teacher: 'Thầy Lâm Văn Hải', captain: 'Dương Thành Nhân', phone: '0909900112', emblem: '🔥', members: ['Dương Thành Nhân', 'Phan Quốc Việt', 'Lê Văn Hiệp', 'Nguyễn Phúc Nguyên', 'Hoàng Tấn Dũng'] },
  { className: '10A10', grade: 10, teacher: 'Cô Nguyễn Thu Thủy', captain: 'Bùi Đức Anh', phone: '0910011223', emblem: '👑', members: ['Bùi Đức Anh', 'Trần Hạo Nam', 'Nguyễn Tấn Tài', 'Lê Khắc Toàn', 'Võ Hoàng Phúc'] },
  { className: '11A1', grade: 11, teacher: 'Thầy Hoàng Tiến Dũng', captain: 'Nguyễn Mai Chi', phone: '0911122334', emblem: '🛡️', members: ['Nguyễn Mai Chi', 'Trần Văn Duy', 'Lê Quốc Khánh', 'Phạm Đình Trọng', 'Vũ Minh Hải'] },
  { className: '11A2', grade: 11, teacher: 'Cô Trần Thu Trang', captain: 'Lê Minh Triết', phone: '0912233445', emblem: '💎', members: ['Lê Minh Triết', 'Ngô Tấn Tài', 'Vũ Quốc Huy', 'Đào Hoàng Quân', 'Bùi Việt Cường'] },
  { className: '12A1', grade: 12, teacher: 'Thầy Nguyễn Văn Đức', captain: 'Trần Hoàng Nam', phone: '0913344556', emblem: '🌪️', members: ['Trần Hoàng Nam', 'Nguyễn Quốc Bảo', 'Phạm Minh Tuấn', 'Vũ Đức Anh', 'Đặng Hải Long'] },
  { className: '12A2', grade: 12, teacher: 'Cô Lê Thị Mai', captain: 'Phạm Văn Hùng', phone: '0914455667', emblem: '🦈', members: ['Phạm Văn Hùng', 'Hoàng Quốc Việt', 'Lê Tấn Phát', 'Đỗ Tiến Đạt', 'Trịnh Công Sơn'] },
  { className: '12A3', grade: 12, teacher: 'Thầy Trương Tấn Sang', captain: 'Huỳnh Bảo Long', phone: '0915566778', emblem: '🐼', members: ['Huỳnh Bảo Long', 'Nguyễn Văn Đạt', 'Lê Hoàng Sơn', 'Trần Trọng Nghĩa', 'Phan Gia Khiêm'] },
  { className: '12A4', grade: 12, teacher: 'Cô Mai Cẩm Tú', captain: 'Lâm Quốc Thịnh', phone: '0916677889', emblem: '🥊', members: ['Lâm Quốc Thịnh', 'Vũ Quang Huy', 'Đặng Tuấn Hải', 'Nguyễn Đức Bo', 'Trần Thiện Nhân'] },
  { className: '12A5', grade: 12, teacher: 'Thầy Đoàn Minh Khang', captain: 'Đào Việt Thắng', phone: '0917788990', emblem: '🏆', members: ['Đào Việt Thắng', 'Phan Văn Sang', 'Lê Hữu Đạt', 'Nguyễn Đình Bắc', 'Bùi Hoàng Việt'] },
  { className: '12A7', grade: 12, teacher: 'Cô Bạch Nhật Lệ', captain: 'Phan Tấn Tài', phone: '0918899001', emblem: '⭐', members: ['Phan Tấn Tài', 'Trương Minh Khôi', 'Vũ Văn Thanh', 'Đỗ Hùng Dũng', 'Nguyễn Tiến Linh'] },
  { className: '12A8', grade: 12, teacher: 'Thầy Cao Bá Quát', captain: 'Tạ Minh Khôi', phone: '0919900112', emblem: '🐆', members: ['Tạ Minh Khôi', 'Lê Văn Đô', 'Nguyễn Thanh Nhã', 'Hoàng Vĩnh Nguyên', 'Phạm Tuấn Hải'] },
  { className: '12A9', grade: 12, teacher: 'Cô Tống Khánh Linh', captain: 'Mai Đình Phong', phone: '0920011223', emblem: '🦄', members: ['Mai Đình Phong', 'Nguyễn Thái Sơn', 'Đinh Xuân Tiến', 'Lê Minh Bình', 'Trần Quang Thịnh'] },
];

export const getDefault20Registrations = (sportId: SportId = 'basketball', subCategory = 'Bóng rổ Nam Toàn Trường (5x5)'): Registration[] => {
  return OFFICIAL_20_CLASSES.map((cls, idx) => ({
    id: `REG-20-${idx + 1}`,
    sportId,
    subCategory,
    className: cls.className,
    grade: cls.grade,
    captainName: cls.captain,
    phone: cls.phone,
    teacherName: cls.teacher,
    emblem: cls.emblem || DEFAULT_CLASS_EMBLEMS[cls.className] || '🦁',
    members: cls.members.map((m, mIdx) => ({
      name: m,
      shirtSize: mIdx % 2 === 0 ? 'L' : 'M',
      jerseyNumber: (mIdx + 1) * 2 + (idx % 5)
    })),
    status: 'Approved',
    registeredAt: '2026-10-06',
    notes: `Đội hình tiêu chuẩn Lớp ${cls.className} (${cls.teacher})`
  }));
};

export const CARO_30_ATHLETES: { name: string; unit: string }[] = [
  { name: 'Nguyễn Trung Tính', unit: '12A5' },
  { name: 'Lê Minh Khang', unit: '10A4' },
  { name: 'Chí Cao', unit: '10A10' },
  { name: 'Phú Hưng', unit: '10A10' },
  { name: 'Nguyễn Bình Phương Oanh', unit: '12A3' },
  { name: 'Lê Trung Hiếu', unit: '12A1' },
  { name: 'Đinh Hoàng Gia Bảo', unit: '10A8' },
  { name: 'Nguyễn Gia Tường', unit: '12A9' },
  { name: 'Phan Minh Tiến', unit: '12A1' },
  { name: 'Nguyễn Văn Vui', unit: '11A2' },
  { name: 'Trần Đăng Khoa', unit: '10A4' },
  { name: 'Thành Phú', unit: '12A8' },
  { name: 'Lâm Thiên Phúc', unit: '11A2' },
  { name: 'Nguyễn Hùng Kiệt', unit: '12A7' },
  { name: 'Liễu Quốc Huy', unit: '12A5' },
  { name: 'Ngô Văn Chuẩn', unit: '12A7' },
  { name: 'Võ Hào Kiệt', unit: '10A2' },
  { name: 'Bùi Phát Đạt', unit: '10A2' },
  { name: 'Nguyễn Hoàng Quý', unit: '12A9' },
  { name: 'Trường Sơn', unit: '12A8' },
  { name: 'Lê Nguyễn Thành Đạt', unit: '10A6' },
  { name: 'Nguyễn Hoàng Đạt', unit: '10A6' },
  { name: 'Nguyễn Tấn Hoàng', unit: '10A8' },
  { name: 'Lý Trung Chánh', unit: '12A4' },
  { name: 'Nguyễn Quốc Thái', unit: '12A3' },
  { name: 'Lê Trịnh Khai Tâm', unit: '11A1' },
  { name: 'Nguyễn Thành Đạt', unit: '12A2' },
  { name: 'Lê Hoàng Tuấn', unit: '11A1' },
  { name: 'Lê Kim Hoàng Thắng', unit: '12A4' },
  { name: 'Trần Việt Nguyên Khang', unit: '12A2' },
];

export const initialRegistrations: Registration[] = CARO_30_ATHLETES.map((ath, idx) => {
  const fullLabel = `${ath.name} (${ath.unit})`;
  const grade = parseInt(ath.unit.slice(0, 2), 10) || 10;
  return {
    id: `REG-CARO-${idx + 1}`,
    sportId: 'caro',
    subCategory: 'Cờ Caro Nam',
    className: fullLabel,
    grade,
    captainName: ath.name,
    phone: `0901000${String(idx + 1).padStart(3, '0')}`,
    teacherName: `Đơn vị: ${ath.unit}`,
    emblem: DEFAULT_CLASS_EMBLEMS[ath.unit] || '🏅',
    members: [{ name: ath.name, shirtSize: 'M', jerseyNumber: idx + 1 }],
    status: 'Approved',
    registeredAt: '2026-10-12',
    notes: `VĐV Cờ Caro đơn vị ${ath.unit}`,
  };
});

const INITIAL_CARO_TOURNAMENT_ID = 'TOUR-CARO-2026';
const INITIAL_CARO_TOURNAMENT_NAME = 'Giải Cờ Caro THPT Phú Lâm 2026';

export const initialMatches: Match[] = [
  ...Array.from({ length: 15 }, (_, pIdx): Match => {
    const tA = `${CARO_30_ATHLETES[pIdx * 2].name} (${CARO_30_ATHLETES[pIdx * 2].unit})`;
    const tB = `${CARO_30_ATHLETES[pIdx * 2 + 1].name} (${CARO_30_ATHLETES[pIdx * 2 + 1].unit})`;
    const hour = 8 + Math.floor(pIdx / 3);
    const min = (pIdx % 3) * 20;
    return {
      id: `M-CARO-R1-${pIdx + 1}`,
      sportId: 'caro',
      subCategory: 'Cờ Caro Nam - Vòng 1/16',
      stage: 'Vòng bảng',
      groupName: 'Bảng A',
      teamA: tA,
      teamB: tB,
      status: 'Upcoming',
      date: '2026-10-12',
      time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      venue: 'Khu vực Sảnh Sinh Hoạt',
      tournamentId: INITIAL_CARO_TOURNAMENT_ID,
      tournamentName: INITIAL_CARO_TOURNAMENT_NAME,
    };
  }),
  {
    id: 'M-CARO-SF1',
    sportId: 'caro',
    subCategory: 'Cờ Caro Nam - Bán Kết 1 Bảng A',
    stage: 'Bán kết',
    groupName: 'Bảng A',
    teamA: 'Thắng Tứ Kết 1',
    teamB: 'Thắng Tứ Kết 2',
    status: 'Upcoming',
    date: '2026-10-14',
    time: '08:30',
    venue: 'Khu vực Sảnh Sinh Hoạt',
    tournamentId: INITIAL_CARO_TOURNAMENT_ID,
    tournamentName: INITIAL_CARO_TOURNAMENT_NAME,
  },
  {
    id: 'M-CARO-SF2',
    sportId: 'caro',
    subCategory: 'Cờ Caro Nam - Bán Kết 2 Bảng A',
    stage: 'Bán kết',
    groupName: 'Bảng A',
    teamA: 'Thắng Tứ Kết 3',
    teamB: 'Thắng Tứ Kết 4',
    status: 'Upcoming',
    date: '2026-10-14',
    time: '09:30',
    venue: 'Khu vực Sảnh Sinh Hoạt',
    tournamentId: INITIAL_CARO_TOURNAMENT_ID,
    tournamentName: INITIAL_CARO_TOURNAMENT_NAME,
  },
  {
    id: 'M-CARO-BRONZE',
    sportId: 'caro',
    subCategory: 'Cờ Caro Nam - Tranh Huy Chương Đồng Toàn Trường',
    stage: 'Trận Tranh Hạng 3',
    groupName: 'Bảng A',
    teamA: 'Thua Bán Kết 1',
    teamB: 'Thua Bán Kết 2',
    status: 'Upcoming',
    date: '2026-10-15',
    time: '14:00',
    venue: 'Khu vực Sảnh Sinh Hoạt',
    tournamentId: INITIAL_CARO_TOURNAMENT_ID,
    tournamentName: INITIAL_CARO_TOURNAMENT_NAME,
  },
  {
    id: 'M-CARO-FINAL',
    sportId: 'caro',
    subCategory: 'Cờ Caro Nam - Chung Kết Vô Địch',
    stage: 'Chung kết',
    groupName: 'Bảng A',
    teamA: 'Thắng Bán Kết 1',
    teamB: 'Thắng Bán Kết 2',
    status: 'Upcoming',
    date: '2026-10-15',
    time: '15:00',
    venue: 'Khu vực Sảnh Sinh Hoạt',
    tournamentId: INITIAL_CARO_TOURNAMENT_ID,
    tournamentName: INITIAL_CARO_TOURNAMENT_NAME,
  },
];

export const initialMedalTallies: MedalTally[] = [];

export const initialAnnouncements: Announcement[] = [];

export const initialTournaments: Tournament[] = [
  {
    id: INITIAL_CARO_TOURNAMENT_ID,
    name: INITIAL_CARO_TOURNAMENT_NAME,
    sportId: 'caro',
    subCategory: 'Cờ Caro Nam',
    format: 'knockout',
    numGroups: 1,
    startDate: '2026-10-12',
    startTime: '08:00',
    venue: 'Khu vực Sảnh Sinh Hoạt',
    notes: 'Giải đấu Cờ Caro học đường THPT Phú Lâm (30 VĐV tham gia)',
    createdAt: '2026-10-12T08:00:00.000Z',
    status: 'Upcoming',
    teamsCount: 30,
    matchesCount: 19,
  },
];

export const initialTournamentData: TournamentData = {
  sports: initialSports,
  registrations: initialRegistrations,
  matches: initialMatches,
  medalTallies: initialMedalTallies,
  announcements: initialAnnouncements,
  tournaments: initialTournaments,
  activeTournamentId: INITIAL_CARO_TOURNAMENT_ID,
  drawStates: {},
  updatedAt: 1729990000000,
};


