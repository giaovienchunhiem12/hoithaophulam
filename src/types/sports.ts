export type SportId =
  | 'football'
  | 'volleyball'
  | 'basketball'
  | 'pickleball'
  | 'badminton'
  | 'tugofwar'
  | 'chess'
  | 'xiangqi'
  | 'caro';

export interface SportCategory {
  id: SportId;
  name: string;
  englishName: string;
  iconName: string;
  color: string;
  venue: string;
  description: string;
  subCategories: string[];
  maxTeamMembers: number;
  minTeamMembers: number;
  rulesSummary: string;
}

export interface TeamMember {
  name: string;
  studentId?: string;
  shirtSize?: string;
  jerseyNumber?: number;
}

export interface Registration {
  id: string;
  sportId: SportId;
  subCategory: string;
  className: string; // e.g. "10A1", "11B2", "12C1"
  grade: number; // 10, 11, 12
  captainName: string;
  phone: string;
  teacherName: string; // GVCN
  members: TeamMember[];
  status: 'Approved' | 'Pending' | 'Rejected';
  registeredAt: string;
  emblem?: string; // Team icon / class mascot emblem emoji or symbol e.g. 🦁, 🐯, 🦅, ⚡
  notes?: string;
}

export type MatchStatus = 'Upcoming' | 'Live' | 'Finished';

export interface Match {
  id: string;
  sportId: SportId;
  subCategory: string;
  stage: 'Vòng bảng' | 'Tứ kết' | 'Bán kết' | 'Chung kết' | 'Trận Tranh Hạng 3';
  teamA: string; // e.g. "12A1" or "Nguyễn Văn A (10A3)"
  teamB: string; // e.g. "11B2" or "Lê Thị B (11B2)"
  teamAEmblem?: string;
  teamBEmblem?: string;
  scoreA?: number;
  scoreB?: number;
  setsDetail?: string; // e.g. "21-18, 19-21, 21-15" or "Hiệp 1: 1-0, Hiệp 2: 1-1"
  status: MatchStatus;
  date: string; // e.g. "2026-10-10"
  time: string; // e.g. "08:00"
  venue: string;
  mvpPlayer?: string;
  commentary?: string;
  groupName?: string; // "Bảng A", "Bảng B"
}

export interface MedalTally {
  className: string;
  grade: number;
  gold: number;
  silver: number;
  bronze: number;
  totalPoints: number; // Gold * 3 + Silver * 2 + Bronze * 1
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  category: 'Lịch thi đấu' | 'Kết quả' | 'Thông báo khẩn' | 'Quy định';
  author: string;
  isImportant?: boolean;
}

export interface TournamentData {
  sports: SportCategory[];
  registrations: Registration[];
  matches: Match[];
  medalTallies: MedalTally[];
  announcements: Announcement[];
}
