import React, { useState, useMemo } from 'react';
import { Match, SportCategory, Registration } from '../types/sports';
import { getTeamEmblem } from '../data/mockSportsData';
import { SCHOOL_LOGO_DATA_URI } from '../assets/logoData';
import { 
  Trophy, Clock, MapPin, Sparkles, MoveHorizontal, 
  ZoomIn, ZoomOut, RotateCcw, Edit3, Info,
  Printer, Flame, Search, Layers, ShieldCheck, Star, Swords
} from 'lucide-react';
import { PrintBracketModal } from './PrintBracketModal';

export type DiagramFormatMode = 
  | 'auto' 
  | 'group_2'   // 2 Groups (Bảng A & B)
  | 'group_4'   // 4 Groups (Bảng A, B, C, D)
  | 'knockout_4'  // 4 teams (2 each side)
  | 'knockout_8'  // 8 teams (4 each side)
  | 'knockout_16' // 16 teams (8 each side)
  | 'knockout_64';// 64 teams (32 each side)

interface TournamentBracketTreeProps {
  matches: Match[];
  sports: SportCategory[];
  registrations?: Registration[];
  selectedSportId: string;
  onOpenMatchEdit?: (match: Match) => void;
  isAdmin?: boolean;
  onSwitchToDraw?: () => void;
}

export const TournamentBracketTree: React.FC<TournamentBracketTreeProps> = ({
  matches,
  sports,
  registrations = [],
  selectedSportId,
  onOpenMatchEdit,
  isAdmin = false,
  onSwitchToDraw
}) => {
  // Manual format override ('auto' by default)
  const [selectedFormat, setSelectedFormat] = useState<DiagramFormatMode>('auto');
  const [zoomLevel, setZoomLevel] = useState<number>(75);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedMatchPreview, setSelectedMatchPreview] = useState<Match | null>(null);
  const [highlightQuery, setHighlightQuery] = useState<string>('');

  // Active sport
  const currentSport = useMemo(() => {
    return sports.find((s) => s.id === selectedSportId) || sports[0];
  }, [sports, selectedSportId]);

  // Filter matches for selected sport
  const sportMatches = useMemo(() => {
    return selectedSportId === 'all'
      ? matches
      : matches.filter((m) => m.sportId === selectedSportId);
  }, [matches, selectedSportId]);

  // Registrations for selected sport
  const sportRegs = useMemo(() => {
    return registrations.filter((r) => selectedSportId === 'all' || r.sportId === selectedSportId);
  }, [registrations, selectedSportId]);

  // Flag: tournament created
  const isTournamentCreated = useMemo(() => {
    return sportMatches.length > 0;
  }, [sportMatches]);

  // Distinct real teams extracted from matches
  const realTeamsInMatches = useMemo(() => {
    if (!isTournamentCreated) return [];
    const all = sportMatches.flatMap((m) => [m.teamA, m.teamB]);
    return Array.from(new Set(all)).filter(
      (t) => t && !t.includes('Thắng') && !t.includes('Nhất') && !t.includes('Nhì') && !t.includes('Thua') && !t.includes('Hạt giống') && t !== '---'
    );
  }, [sportMatches, isTournamentCreated]);

  // Groups in current matches
  const matchGroups = useMemo(() => {
    if (!isTournamentCreated) return [];
    return Array.from(new Set(sportMatches.map((m) => m.groupName).filter(Boolean))) as string[];
  }, [sportMatches, isTournamentCreated]);

  // =========================================================================
  // 1. SMART AUTO-DETECTION: Match Diagram EXACTLY to tournament format & teams
  // =========================================================================
  const detectedMode = useMemo<DiagramFormatMode>(() => {
    if (isTournamentCreated) {
      if (matchGroups.length >= 3) return 'group_4';
      if (matchGroups.includes('Bảng A') && matchGroups.includes('Bảng B')) return 'group_2';
      
      const count = realTeamsInMatches.length;
      if (count <= 4 && count > 0) return 'knockout_4';
      if (count <= 8 && count > 0) return 'knockout_8';
      if (count <= 16 && count > 0) return 'knockout_16';
      if (count > 32) return 'knockout_64';
      return 'group_2';
    }

    const regCount = sportRegs.length;
    if (regCount >= 17) return 'group_2';
    if (regCount > 8 && regCount <= 16) return 'knockout_16';
    if (regCount > 4 && regCount <= 8) return 'knockout_8';
    if (regCount > 0 && regCount <= 4) return 'knockout_4';
    if (regCount > 32) return 'knockout_64';

    return 'group_2';
  }, [isTournamentCreated, matchGroups, realTeamsInMatches, sportRegs]);

  // Effective mode used for rendering
  const activeMode: DiagramFormatMode = useMemo(() => {
    if (selectedFormat === 'auto') {
      return detectedMode;
    }
    return selectedFormat;
  }, [selectedFormat, detectedMode]);

  // Match result helper
  const getResults = (m: Match) => {
    const isFinished = m.status === 'Finished' && m.scoreA !== undefined && m.scoreB !== undefined;
    const isLive = m.status === 'Live';
    return {
      isFinished,
      isLive,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      winner: isFinished && m.scoreA! > m.scoreB! ? m.teamA : isFinished && m.scoreB! > m.scoreA! ? m.teamB : null
    };
  };

  const handleMatchClick = (m: Match) => {
    setSelectedMatchPreview(m);
    if (onOpenMatchEdit && isAdmin) {
      onOpenMatchEdit(m);
    }
  };

  const isSlotHighlighted = (teamName: string) => {
    if (!highlightQuery.trim() || !teamName || teamName === '---') return false;
    return teamName.toLowerCase().includes(highlightQuery.toLowerCase().trim());
  };

  // =========================================================================
  // 2. DYNAMIC GROUP DATA EXTRACTION (Co giãn theo số đội thực tế của từng bảng)
  // =========================================================================
  const groupAData = useMemo(() => {
    const r1Matches = sportMatches.filter(
      (m) => (m.groupName === 'Bảng A' || !m.groupName) && (m.stage === 'Vòng bảng' || m.id.includes('R1') || m.subCategory?.includes('Vòng Loại') || m.subCategory?.includes('Vòng 1') || m.subCategory?.includes('Cặp'))
    );
    const sfMatches = sportMatches.filter(
      (m) => m.groupName === 'Bảng A' && (m.stage === 'Bán kết' || m.id.includes('SF'))
    );
    const finMatch = sportMatches.find(
      (m) => m.groupName === 'Bảng A' && (m.stage === 'Chung kết' || m.id.includes('FIN') || m.subCategory?.includes('Chung Kết Bảng'))
    );

    let teams: { name: string; emblem: string; sub: string }[] = [];
    if (isTournamentCreated) {
      const distinct = new Set<string>();
      sportMatches
        .filter((m) => m.groupName === 'Bảng A')
        .forEach((m) => {
          if (m.teamA && !m.teamA.includes('Thắng') && !m.teamA.includes('Nhất') && !m.teamA.includes('Nhì') && !m.teamA.includes('Hạt giống') && m.teamA !== '---') {
            distinct.add(m.teamA);
          }
          if (m.teamB && !m.teamB.includes('Thắng') && !m.teamB.includes('Nhất') && !m.teamB.includes('Nhì') && !m.teamB.includes('Hạt giống') && m.teamB !== '---') {
            distinct.add(m.teamB);
          }
        });
      
      teams = Array.from(distinct).map((t) => ({
        name: t,
        emblem: getTeamEmblem(t, registrations),
        sub: 'Bảng A'
      }));

      if (teams.length === 0 && r1Matches.length > 0) {
        teams = Array.from({ length: Math.min(10, r1Matches.length * 2) }, () => ({
          name: '',
          emblem: '',
          sub: 'Bảng A'
        }));
      }
    } else {
      const count = Math.min(10, Math.max(4, Math.ceil(sportRegs.length / 2) || 4));
      teams = Array.from({ length: count }, () => ({
        name: '',
        emblem: '',
        sub: 'Bảng A'
      }));
    }

    if (teams.length < 4) {
      const pad = 4 - teams.length;
      for (let k = 0; k < pad; k++) {
        teams.push({ name: '', emblem: '', sub: 'Bảng A' });
      }
    }

    // Playoff match between T4 and T5
    const m4 = r1Matches[3];
    const m5 = r1Matches[4];
    const playoffMatch: Match = {
      id: 'M-PLAYOFF-A',
      sportId: currentSport.id,
      subCategory: 'Vòng Playoff Đấu Trước (Bảng A)',
      stage: 'Tứ kết',
      groupName: 'Bảng A',
      teamA: m4 ? (m4.status === 'Finished' && m4.scoreA !== undefined && m4.scoreB !== undefined ? (m4.scoreA > m4.scoreB ? m4.teamA : m4.teamB) : 'Thắng Trận 4') : 'Thắng Trận 4',
      teamB: m5 ? (m5.status === 'Finished' && m5.scoreA !== undefined && m5.scoreB !== undefined ? (m5.scoreA > m5.scoreB ? m5.teamA : m5.teamB) : 'Thắng Trận 5') : 'Thắng Trận 5',
      status: 'Upcoming',
      date: '2026-10-13',
      time: '10:30',
      venue: currentSport.venue
    };

    return { teams, r1Matches, sfMatches, finMatch, playoffMatch };
  }, [sportMatches, sportRegs, registrations, isTournamentCreated, currentSport]);

  const groupBData = useMemo(() => {
    const r1Matches = sportMatches.filter(
      (m) => m.groupName === 'Bảng B' && (m.stage === 'Vòng bảng' || m.id.includes('R1') || m.subCategory?.includes('Vòng Loại') || m.subCategory?.includes('Vòng 1') || m.subCategory?.includes('Cặp'))
    );
    const sfMatches = sportMatches.filter(
      (m) => m.groupName === 'Bảng B' && (m.stage === 'Bán kết' || m.id.includes('SF'))
    );
    const finMatch = sportMatches.find(
      (m) => m.groupName === 'Bảng B' && (m.stage === 'Chung kết' || m.id.includes('FIN') || m.subCategory?.includes('Chung Kết Bảng'))
    );

    let teams: { name: string; emblem: string; sub: string }[] = [];
    if (isTournamentCreated) {
      const distinct = new Set<string>();
      sportMatches
        .filter((m) => m.groupName === 'Bảng B')
        .forEach((m) => {
          if (m.teamA && !m.teamA.includes('Thắng') && !m.teamA.includes('Nhất') && !m.teamA.includes('Nhì') && !m.teamA.includes('Hạt giống') && m.teamA !== '---') {
            distinct.add(m.teamA);
          }
          if (m.teamB && !m.teamB.includes('Thắng') && !m.teamB.includes('Nhất') && !m.teamB.includes('Nhì') && !m.teamB.includes('Hạt giống') && m.teamB !== '---') {
            distinct.add(m.teamB);
          }
        });
      
      teams = Array.from(distinct).map((t) => ({
        name: t,
        emblem: getTeamEmblem(t, registrations),
        sub: 'Bảng B'
      }));

      if (teams.length === 0 && r1Matches.length > 0) {
        teams = Array.from({ length: Math.min(10, r1Matches.length * 2) }, () => ({
          name: '',
          emblem: '',
          sub: 'Bảng B'
        }));
      }
    } else {
      const count = Math.min(10, Math.max(4, Math.floor(sportRegs.length / 2) || 4));
      teams = Array.from({ length: count }, () => ({
        name: '',
        emblem: '',
        sub: 'Bảng B'
      }));
    }

    if (teams.length < 4) {
      const pad = 4 - teams.length;
      for (let k = 0; k < pad; k++) {
        teams.push({ name: '', emblem: '', sub: 'Bảng B' });
      }
    }

    const m4 = r1Matches[3];
    const m5 = r1Matches[4];
    const playoffMatch: Match = {
      id: 'M-PLAYOFF-B',
      sportId: currentSport.id,
      subCategory: 'Vòng Playoff Đấu Trước (Bảng B)',
      stage: 'Tứ kết',
      groupName: 'Bảng B',
      teamA: m4 ? (m4.status === 'Finished' && m4.scoreA !== undefined && m4.scoreB !== undefined ? (m4.scoreA > m4.scoreB ? m4.teamA : m4.teamB) : 'Thắng Trận 4') : 'Thắng Trận 4',
      teamB: m5 ? (m5.status === 'Finished' && m5.scoreA !== undefined && m5.scoreB !== undefined ? (m5.scoreA > m5.scoreB ? m5.teamA : m5.teamB) : 'Thắng Trận 5') : 'Thắng Trận 5',
      status: 'Upcoming',
      date: '2026-10-13',
      time: '11:00',
      venue: currentSport.venue
    };

    return { teams, r1Matches, sfMatches, finMatch, playoffMatch };
  }, [sportMatches, sportRegs, registrations, isTournamentCreated, currentSport]);

  // Grand Finals & 3rd Place Match
  const grandFinalMatch = useMemo(() => {
    return (
      sportMatches.find(
        (m) => (m.stage === 'Chung kết' || m.subCategory?.includes('Toàn Trường')) && (!m.groupName || m.groupName === 'Toàn Trường' || m.id.includes('GRAND-FINAL') || m.id.includes('FINAL'))
      ) || {
        id: 'M-GRAND-FINAL',
        sportId: currentSport.id,
        subCategory: 'Chung Kết Tranh Cúp Vô Địch Toàn Trường',
        stage: 'Chung kết' as const,
        teamA: isTournamentCreated ? 'Nhất Bảng A' : '---',
        teamB: isTournamentCreated ? 'Nhất Bảng B' : '---',
        status: 'Upcoming' as const,
        date: '2026-10-15',
        time: '16:00',
        venue: currentSport.venue
      }
    );
  }, [sportMatches, currentSport, isTournamentCreated]);

  const grandBronzeMatch = useMemo(() => {
    return (
      sportMatches.find(
        (m) => (m.stage === 'Trận Tranh Hạng 3' || m.subCategory?.includes('Hạng 3') || m.subCategory?.includes('Đồng')) && (!m.groupName || m.groupName === 'Toàn Trường' || m.id.includes('BRONZE'))
      ) || {
        id: 'M-GRAND-BRONZE',
        sportId: currentSport.id,
        subCategory: 'Trận Tranh Huy Chương Đồng Toàn Trường',
        stage: 'Trận Tranh Hạng 3' as const,
        teamA: isTournamentCreated ? 'Nhì Bảng A' : '---',
        teamB: isTournamentCreated ? 'Nhì Bảng B' : '---',
        status: 'Upcoming' as const,
        date: '2026-10-15',
        time: '14:30',
        venue: currentSport.venue
      }
    );
  }, [sportMatches, currentSport, isTournamentCreated]);

  // Total active teams count for display
  const currentTotalTeamCount = useMemo(() => {
    if (activeMode === 'group_2') {
      return groupAData.teams.length + groupBData.teams.length;
    }
    if (activeMode === 'knockout_4') return 4;
    if (activeMode === 'knockout_8') return 8;
    if (activeMode === 'knockout_16') return 16;
    if (activeMode === 'knockout_64') return 64;
    return groupAData.teams.length + groupBData.teams.length;
  }, [activeMode, groupAData.teams.length, groupBData.teams.length]);

  return (
    <div className="space-y-6 text-slate-900 select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL & ACTION TOOLBAR                                           */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-amber-400/90 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30 mb-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>SƠ ĐỒ PHÂN NHÁNH RÕ RÀNG · CẶP ĐẤU TRƯỚC & CẶP MIỄN VÒNG MINH BẠCH</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight flex items-center gap-2">
            <span>Cây Sơ Đồ Thi Đấu Hội Thao THPT Phú Lâm</span>
            <span className="text-amber-400 font-mono text-base font-bold">
              ({currentSport.name})
            </span>
          </h2>
          <p className="text-xs text-blue-100/90 mt-1 max-w-2xl">
            Sơ đồ thể hiện rõ nhánh cặp nào <strong>đấu trước</strong> (vòng sơ loại/playoff) và cặp nào <strong>được miễn 1 vòng</strong> (vào thẳng bán kết), các nhánh đối xứng chuẩn xác hội tụ về Cúp Vô Địch ở trung tâm.
          </p>
        </div>

        {/* Action Buttons & Zoom */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick Team Search / Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm lớp / đội (vd: 12A1)..."
              value={highlightQuery}
              onChange={(e) => setHighlightQuery(e.target.value)}
              className="bg-blue-950/90 border-2 border-blue-800 focus:border-amber-400 text-white placeholder-blue-300 text-xs rounded-xl px-3 py-2 pl-8 w-44 sm:w-52 outline-none font-bold shadow-inner"
            />
            <Search className="w-3.5 h-3.5 text-blue-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {highlightQuery && (
              <button
                onClick={() => setHighlightQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Zoom Controller */}
          <div className="flex items-center gap-1 bg-blue-950/90 px-2 py-1.5 rounded-xl border-2 border-blue-800 text-xs text-blue-100 shadow-inner">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 10))}
              title="Thu nhỏ sơ đồ"
              className="p-1 hover:bg-blue-800 rounded transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-1 font-bold text-amber-300">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
              title="Phóng to sơ đồ"
              className="p-1 hover:bg-blue-800 rounded transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(75)}
              title="Vừa màn hình (75%)"
              className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-800 hover:bg-blue-700 text-amber-300 rounded cursor-pointer ml-0.5"
            >
              Vừa
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              title="Đặt lại 100%"
              className="p-1 text-blue-200 hover:text-white rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print Bracket Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-lg border border-amber-300 transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            title="In sơ đồ nhánh thi đấu dạng biểu đồ chuẩn A4/A3 hoặc xuất file ảnh PNG"
          >
            <Printer className="w-4 h-4 text-blue-950" />
            <span>In Sơ Đồ Thi Đấu</span>
          </button>
        </div>
      </div>

      {/* Format Selector Bar & Legend */}
      <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-900" />
            <span>Định dạng sơ đồ:</span>
          </span>
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-300 flex-wrap">
            <button
              onClick={() => setSelectedFormat('auto')}
              className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                selectedFormat === 'auto'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              ⚡ Tự động (Chuẩn giải đấu)
            </button>
            <button
              onClick={() => setSelectedFormat('group_2')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedFormat === 'group_2'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              2 Bảng A & B ({groupAData.teams.length + groupBData.teams.length} đội)
            </button>
            <button
              onClick={() => setSelectedFormat('knockout_8')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedFormat === 'knockout_8'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              8 Đội (Tứ Kết)
            </button>
            <button
              onClick={() => setSelectedFormat('knockout_16')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedFormat === 'knockout_16'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              16 Đội (Vòng 1/8)
            </button>
            <button
              onClick={() => setSelectedFormat('knockout_4')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedFormat === 'knockout_4'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              4 Đội (Bán Kết)
            </button>
            <button
              onClick={() => setSelectedFormat('knockout_64')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedFormat === 'knockout_64'
                  ? 'bg-blue-950 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              64 Đội Cúp Toàn Diện
            </button>
          </div>
        </div>

        {/* Legend for Byes and Preliminary Matches */}
        <div className="flex items-center gap-3 font-bold text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-200" />
            <span>⭐ Miễn 1 vòng (Vào thẳng BK)</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-800">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ring-2 ring-amber-200" />
            <span>⚔️ Đấu trước (Tranh vé BK)</span>
          </div>
        </div>
      </div>

      {/* Guide or Empty Status Banner */}
      {!isTournamentCreated ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs shadow-sm">
          <div className="flex items-center gap-3 font-medium text-amber-950">
            <span className="flex items-center gap-1.5 font-bold text-amber-900 bg-amber-200 px-2.5 py-1 rounded-lg shrink-0">
              <Info className="w-4 h-4 text-amber-900" />
              <span>Chưa tạo giải đấu:</span>
            </span>
            <span>
              Tên các đội trên cây sơ đồ hiện đang để trống <strong>(---)</strong>. Nhánh đấu đã phân định rõ cặp đấu trước và cặp miễn 1 vòng. Bấm nút bên phải để bốc thăm & lập lịch ngay!
            </span>
          </div>
          {onSwitchToDraw && (
            <button
              onClick={onSwitchToDraw}
              className="px-4 py-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Bốc Thăm & Tạo Giải Đấu</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 rounded-2xl bg-blue-50 border-2 border-blue-200 text-xs shadow-sm">
          <div className="flex items-center gap-3 font-medium text-slate-700">
            <span className="flex items-center gap-1.5 font-bold text-blue-950">
              <ShieldCheck className="w-4 h-4 text-blue-800" />
              <span>Cấu trúc phân nhánh rõ ràng:</span>
            </span>
            <span>
              {activeMode === 'group_2' && 'Nhánh dưới mỗi bảng có 3 cặp: Cặp Trận 3 được MIỄN 1 VÒNG đi thẳng vào Bán Kết 2; Cặp Trận 4 & Trận 5 ĐẤU TRƯỚC ở trận Playoff để tranh tấm vé thứ 2 vào Bán Kết 2.'}
              {activeMode === 'knockout_8' && '8 Đội thi đấu Tứ kết ➔ Bán kết ➔ Chung kết toàn trường.'}
              {activeMode === 'knockout_16' && '16 Đội thi đấu Vòng 1/8 ➔ Tứ kết ➔ Bán kết ➔ Chung kết toàn trường.'}
              {activeMode === 'knockout_4' && '4 Đội thi đấu Bán kết ➔ Chung kết toàn trường & Tranh hạng 3.'}
              {activeMode === 'knockout_64' && '64 Đội thi đấu Cúp vô địch toàn trường đối xứng.'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-blue-900 text-[11px] font-bold">
            <MoveHorizontal className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Cuộn ngang hoặc phóng to/thu nhỏ</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN TOURNAMENT DIAGRAM CANVAS                                         */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-b from-sky-300 via-sky-200 to-sky-100 rounded-3xl border-4 border-blue-900/40 shadow-2xl overflow-hidden p-2 sm:p-5 relative">
        
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400/20 via-sky-200/10 to-transparent pointer-events-none" />

        <div className="overflow-x-auto horizontal-scroll-container pb-4">
          <div 
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              width: '2380px',
              minHeight: activeMode === 'knockout_4' ? '480px' : activeMode === 'knockout_8' ? '540px' : '680px'
            }}
            className="transition-transform duration-150 mx-auto bg-white/95 backdrop-blur-md rounded-3xl border-2 border-blue-400/50 shadow-2xl p-6 relative"
          >
            
            {/* Header Banner */}
            <div className="relative mb-6 pb-4 border-b-2 border-blue-300/60">
              <div className="absolute left-6 top-2 flex items-center gap-2">
                <span className="text-4xl filter drop-shadow">🇻🇳</span>
                <div className="w-16 h-1 bg-amber-400 rounded-full" />
              </div>
              <div className="absolute right-6 top-2 flex items-center gap-2">
                <div className="w-16 h-1 bg-amber-400 rounded-full" />
                <span className="text-4xl filter drop-shadow">🇻🇳</span>
              </div>

              <div className="text-center space-y-1">
                <div className="inline-block px-8 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-black text-sm uppercase tracking-widest shadow-md border-2 border-amber-300">
                  HỘI THAO THỂ THAO HỌC ĐƯỜNG TRƯỜNG THPT PHÚ LÂM
                </div>

                <h1 className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-blue-950 uppercase filter drop-shadow-sm flex items-center justify-center gap-3">
                  <span>TRANH CÚP VÔ ĐỊCH HỘI THAO</span>
                  <span className="text-red-600 font-extrabold">2026</span>
                </h1>

                <div className="inline-block px-5 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow">
                  MÔN THI ĐẤU: {currentSport.name.toUpperCase()} · LẦN THỨ 31 NĂM HỌC 2026 - 2027
                </div>
              </div>

              {/* Stage Indicators along Header - Perfectly positioned above columns */}
              <div className="mt-5 relative h-9 text-xs font-black">
                {/* Left indicators */}
                <div style={{ position: 'absolute', left: '30px', width: '365px' }} className="flex items-center justify-between">
                  <span className="px-4 py-1.5 rounded-full bg-blue-950 text-white shadow border border-blue-800 uppercase tracking-wide">
                    {activeMode === 'group_2' ? `Vòng 1 Bảng A (${groupAData.teams.length} đội)` : 'Vòng Khởi Đầu'}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '445px', width: '145px' }} className="text-center">
                  <span className="px-3 py-1.5 rounded-full bg-blue-900 text-white shadow border border-blue-800 uppercase tracking-wide block truncate">
                    {activeMode === 'group_2' ? 'BK 1 & Playoff' : 'Tứ Kết'}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '650px', width: '145px' }} className="text-center">
                  <span className="px-3 py-1.5 rounded-full bg-indigo-900 text-white shadow border border-indigo-700 uppercase tracking-wide block truncate">
                    {activeMode === 'group_2' ? 'Bán Kết 2 (A)' : 'Bán Kết 1'}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '855px', width: '145px' }} className="text-center">
                  <span className="px-3 py-1.5 rounded-full bg-red-600 text-white shadow border border-red-500 uppercase tracking-wide block truncate">
                    {activeMode === 'group_2' ? 'Chung Kết A' : 'Chung Kết'}
                  </span>
                </div>

                {/* Center Indicator */}
                <div style={{ position: 'absolute', left: '1060px', width: '260px' }} className="text-center">
                  <span className="px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-blue-950 font-black shadow-lg uppercase tracking-wide text-xs border-2 border-amber-300 inline-block animate-pulse">
                    🏆 VCK TOÀN TRƯỜNG
                  </span>
                </div>

                {/* Right indicators */}
                <div style={{ position: 'absolute', left: '1380px', width: '145px' }} className="text-center">
                  <span className="px-3 py-1.5 rounded-full bg-red-600 text-white shadow border border-red-500 uppercase tracking-wide block truncate">
                    {activeMode === 'group_2' ? 'Chung Kết B' : 'Chung Kết'}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '1585px', width: '145px' }} className="text-center">
                  <span className="px-3 py-1.5 rounded-full bg-indigo-900 text-white shadow border border-indigo-700 uppercase tracking-wide block truncate">
                    {activeMode === 'group_2' ? 'Bán Kết 2 (B)' : 'Bán Kết 2'}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '1790px', width: '145px' }} className="text-center">
                  <span className="px-3 py-1.5 rounded-full bg-blue-900 text-white shadow border border-blue-800 uppercase tracking-wide block truncate">
                    {activeMode === 'group_2' ? 'BK 1 & Playoff' : 'Tứ Kết'}
                  </span>
                </div>
                <div style={{ position: 'absolute', left: '1985px', width: '365px' }} className="flex items-center justify-end">
                  <span className="px-4 py-1.5 rounded-full bg-blue-950 text-white shadow border border-blue-800 uppercase tracking-wide">
                    {activeMode === 'group_2' ? `Vòng 1 Bảng B (${groupBData.teams.length} đội)` : 'Vòng Khởi Đầu'}
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* 2.1 RENDER BRACKET TREE: 2 GROUPS (BẢNG A & B)                     */}
            {/* =================================================================== */}
            {(activeMode === 'group_2' || activeMode === 'group_4') && (() => {
              const countA = groupAData.teams.length;
              const countB = groupBData.teams.length;
              const maxCount = Math.max(countA, countB, 4);
              const heightCanvas = Math.max(580, 40 + maxCount * 56);
              const pairsA = Math.floor(countA / 2);
              const pairsB = Math.floor(countB / 2);

              return (
                <div 
                  style={{ width: '2380px', height: `${heightCanvas}px` }} 
                  className="relative overflow-visible"
                >
                  {/* SVG Connecting Lines Layer for 2 Groups */}
                  <svg 
                    width={2380} 
                    height={heightCanvas} 
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{ shapeRendering: 'geometricPrecision' }}
                  >
                    {/* ---------------- LEFT WING CONNECTORS ---------------- */}
                    {/* Left Wing 1: Slots A (x=210) to Vòng 1 Matches (x=250) */}
                    {Array.from({ length: pairsA }, (_, k) => {
                      const yTop = 30 + (2 * k) * 56 + 18;
                      const yBot = 30 + (2 * k + 1) * 56 + 18;
                      const yMid = (yTop + yBot) / 2;
                      return (
                        <g key={`svg-g2-l-slots-r1-${k}`}>
                          <path
                            d={`M 210 ${yTop} H 230 V ${yBot} H 210 M 230 ${yMid} H 250`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={`M 210 ${yTop} H 230 V ${yBot} H 210 M 230 ${yMid} H 250`}
                            fill="none"
                            stroke="#1d4ed8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      );
                    })}

                    {/* Left Wing 2A: Trận 1 (Y=76) & Trận 2 (Y=188) to Bán Kết 1 (x=445, Y=132) */}
                    <g key="svg-g2-l-r1-bk1">
                      <path
                        d="M 395 76 H 420 V 188 H 395 M 420 132 H 445"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 395 76 H 420 V 188 H 395 M 420 132 H 445"
                        fill="none"
                        stroke="#1e40af"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Left Wing 2B: Trận 4 (Y=412) & Trận 5 (Y=524) ĐẤU TRƯỚC to Playoff (x=445, Y=468) */}
                    <g key="svg-g2-l-r1-playoff">
                      <path
                        d="M 395 412 H 420 V 524 H 395 M 420 468 H 445"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 395 412 H 420 V 524 H 395 M 420 468 H 445"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Left Wing 3: Trận 3 (MIỄN 1 VÒNG, Y=300) & Playoff (Y=468) to Bán Kết 2 (x=650, Y=384) */}
                    <g key="svg-g2-l-t3-bk2">
                      {/* Trận 3 MIỄN VÒNG: Line màu xanh ngọc/vàng nổi bật đi thẳng tới BK2 */}
                      <path
                        d="M 395 300 H 620 V 384 H 650"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 395 300 H 620 V 384 H 650"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Playoff nối lên BK2 */}
                      <path
                        d="M 590 468 H 620 V 384"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 590 468 H 620 V 384"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Left Wing 4: Bán Kết 1 (Y=132) & Bán Kết 2 (Y=384) to Chung Kết Bảng A (x=855, Y=258) */}
                    <g key="svg-g2-l-bk-ck">
                      <path
                        d="M 590 132 H 825 V 384 H 795 M 825 258 H 855"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 590 132 H 825 V 384 H 795 M 825 258 H 855"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Left Wing 5: Chung Kết Bảng A (x=1000, Y=258) to Center Stage (x=1060) */}
                    <g key="svg-g2-l-ck-center">
                      <path
                        d="M 1000 258 H 1030 V 142 H 1060"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1000 258 H 1030 V 142 H 1060"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Dashed to 3rd place match (Y=275) */}
                      <path
                        d="M 1030 258 V 275 H 1060"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* ---------------- RIGHT WING CONNECTORS (EXACT MIRROR) ---------------- */}
                    {/* Right Wing 5: Chung Kết Bảng B (x=1380, Y=258) to Center Stage (x=1320) */}
                    <g key="svg-g2-r-ck-center">
                      <path
                        d="M 1380 258 H 1350 V 142 H 1320"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1380 258 H 1350 V 142 H 1320"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1350 258 V 275 H 1320"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Right Wing 4: Bán Kết 1 (B) (Y=132) & Bán Kết 2 (B) (Y=384) to Chung Kết Bảng B (x=1525, Y=258) */}
                    <g key="svg-g2-r-bk-ck">
                      <path
                        d="M 1790 132 H 1555 V 384 H 1585 M 1555 258 H 1525"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1790 132 H 1555 V 384 H 1585 M 1555 258 H 1525"
                        fill="none"
                        stroke="#b45309"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Right Wing 3: Trận 3 Bảng B (MIỄN 1 VÒNG, Y=300) & Playoff B (Y=468) to Bán Kết 2 (B) (x=1730, Y=384) */}
                    <g key="svg-g2-r-t3-bk2">
                      <path
                        d="M 1985 300 H 1760 V 384 H 1730"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1985 300 H 1760 V 384 H 1730"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1790 468 H 1760 V 384"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1790 468 H 1760 V 384"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Right Wing 2B: Trận 4 & 5 Bảng B ĐẤU TRƯỚC to Playoff B (x=1935, Y=468) */}
                    <g key="svg-g2-r-r1-playoff">
                      <path
                        d="M 1985 412 H 1960 V 524 H 1985 M 1960 468 H 1935"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1985 412 H 1960 V 524 H 1985 M 1960 468 H 1935"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Right Wing 2A: Trận 1 & 2 Bảng B to Bán Kết 1 (B) (x=1935, Y=132) */}
                    <g key="svg-g2-r-r1-bk1">
                      <path
                        d="M 1985 76 H 1960 V 188 H 1985 M 1960 132 H 1935"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 1985 76 H 1960 V 188 H 1985 M 1960 132 H 1935"
                        fill="none"
                        stroke="#1e40af"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>

                    {/* Right Wing 1: Slots B (x=2170) to Vòng 1 Matches B (x=2130) */}
                    {Array.from({ length: pairsB }, (_, k) => {
                      const yTop = 30 + (2 * k) * 56 + 18;
                      const yBot = 30 + (2 * k + 1) * 56 + 18;
                      const yMid = (yTop + yBot) / 2;
                      return (
                        <g key={`svg-g2-r-slots-r1-${k}`}>
                          <path
                            d={`M 2170 ${yTop} H 2150 V ${yBot} H 2170 M 2150 ${yMid} H 2130`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d={`M 2170 ${yTop} H 2150 V ${yBot} H 2170 M 2150 ${yMid} H 2130`}
                            fill="none"
                            stroke="#1d4ed8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* ------------------------------------------------------------- */}
                  {/* 1. LEFT SIDE: BẢNG A                                          */}
                  {/* ------------------------------------------------------------- */}
                  {/* Team Slots Bảng A (left: 30px, width: 180px) */}
                  {groupAData.teams.map((team, i) => {
                    const yTop = 30 + i * 56;
                    const isHl = isSlotHighlighted(team.name);
                    return (
                      <div
                        key={`slot-g2-a-${i}`}
                        style={{
                          position: 'absolute',
                          left: '30px',
                          top: `${yTop}px`,
                          width: '180px',
                          height: '36px'
                        }}
                        className={`flex items-center rounded-xl border shadow-xs transition-all z-10 overflow-hidden ${
                          isHl
                            ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400 scale-105'
                            : team.name
                            ? 'bg-white border-blue-300 hover:border-blue-700 hover:shadow-md cursor-pointer'
                            : 'bg-slate-50/70 border-dashed border-slate-300 text-slate-400'
                        }`}
                        title={team.name ? `Đội A${i + 1}: ${team.name}` : `Hạt giống A${i + 1}: Trống (Chưa tạo giải)`}
                      >
                        <span className={`w-8 h-full text-xs font-black flex items-center justify-center shrink-0 font-mono ${
                          team.name ? 'bg-blue-950 text-white' : 'bg-slate-300 text-slate-700'
                        }`}>
                          A{i + 1}
                        </span>
                        {team.name ? (
                          <div className="px-2 flex items-center justify-between w-full text-xs leading-tight truncate">
                            <span className="font-bold text-blue-950 truncate flex items-center gap-1.5">
                              <span className="text-sm">{team.emblem}</span>
                              <span>{team.name}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 truncate ml-1">{team.sub}</span>
                          </div>
                        ) : (
                          <div className="px-2 flex items-center justify-between w-full text-[11px] leading-tight text-slate-400 italic">
                            <span className="font-mono text-slate-400 tracking-wider">--- Trống ---</span>
                            <span className="text-[10px] text-slate-400">Chờ xếp</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Matches Vòng 1 Bảng A (left: 250px, width: 145px) */}
                  {Array.from({ length: pairsA }, (_, k) => {
                    const m = groupAData.r1Matches[k];
                    const yCenter = (30 + (2 * k) * 56 + 18 + 30 + (2 * k + 1) * 56 + 18) / 2;
                    const teamA = m?.teamA || groupAData.teams[2 * k]?.name || '---';
                    const teamB = m?.teamB || groupAData.teams[2 * k + 1]?.name || '---';
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };

                    // Badges for bye or preliminary matches
                    const isBye = k === 2; // Trận 3: MIỄN 1 VÒNG
                    const isPrelim = k >= 3; // Trận 4 & 5: ĐẤU TRƯỚC

                    return (
                      <div
                        key={`match-g2-a-r1-${k}`}
                        style={{
                          position: 'absolute',
                          left: '250px',
                          top: `${yCenter - 28}px`,
                          width: '145px',
                          height: '56px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className={`bg-white rounded-xl border-2 shadow-md p-1.5 flex flex-col justify-between text-xs cursor-pointer hover:shadow-lg transition-all z-10 group ${
                          isBye 
                            ? 'border-emerald-600 ring-2 ring-emerald-300/60' 
                            : isPrelim 
                            ? 'border-amber-600 ring-2 ring-amber-300/60' 
                            : 'border-blue-700'
                        }`}
                        title={m ? `${m.subCategory}: ${teamA} vs ${teamB}` : `Trận ${k + 1} Bảng A`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black border-b border-slate-100 pb-0.5">
                          <span className={isBye ? 'text-emerald-800 flex items-center gap-1' : isPrelim ? 'text-amber-800 flex items-center gap-1' : 'text-blue-900'}>
                            {isBye && <Star className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />}
                            {isPrelim && <Swords className="w-2.5 h-2.5 text-amber-600" />}
                            <span>Trận {k + 1}</span>
                            {isBye && <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">MIỄN VÒNG</span>}
                            {isPrelim && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold">ĐẤU TRƯỚC</span>}
                          </span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="truncate max-w-[90px]">{teamA}</span>
                          <span className="font-mono text-blue-900">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="truncate max-w-[90px]">{teamB}</span>
                          <span className="font-mono text-blue-900">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bán Kết 1 (A) (left: 445px, width: 145px, top: 100px) */}
                  {(() => {
                    const m = groupAData.sfMatches[0];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '445px',
                          top: '100px',
                          width: '145px',
                          height: '64px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-blue-50/90 rounded-xl border-2 border-indigo-700 shadow-lg p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Bán Kết 1 (A): Thắng Trận 1 vs Thắng Trận 2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-indigo-950 border-b border-indigo-200 pb-0.5">
                          <span>BÁN KẾT 1 (A)</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamA || 'Thắng Trận 1'}</span>
                          <span className="font-mono">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamB || 'Thắng Trận 2'}</span>
                          <span className="font-mono">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TRẬN PLAYOFF ĐẤU TRƯỚC (BẢNG A) (left: 445px, width: 145px, top: 436px) */}
                  {(() => {
                    const m = groupAData.playoffMatch;
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '445px',
                          top: '436px',
                          width: '145px',
                          height: '64px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-amber-50 rounded-xl border-2 border-amber-600 shadow-md p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Vòng Đấu Trước (Playoff): Thắng Trận 4 vs Thắng Trận 5 tranh vé vào Bán Kết 2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-amber-950 border-b border-amber-200 pb-0.5">
                          <span className="flex items-center gap-1">
                            <Swords className="w-3 h-3 text-amber-700" />
                            <span>PLAYOFF ĐẤU TRƯỚC</span>
                          </span>
                          {isFinished && <span className="bg-amber-200 text-amber-900 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamA || 'Thắng Trận 4'}</span>
                          <span className="font-mono">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamB || 'Thắng Trận 5'}</span>
                          <span className="font-mono">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bán Kết 2 (A) (left: 650px, width: 145px, top: 352px) */}
                  {/* Hội tụ từ: Đội Miễn 1 Vòng (Trận 3) vs Đội Thắng Playoff */}
                  {(() => {
                    const m = groupAData.sfMatches[1];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '650px',
                          top: '352px',
                          width: '145px',
                          height: '64px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-emerald-50/90 rounded-xl border-2 border-emerald-700 shadow-lg p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Bán Kết 2 (A): Thắng Trận 3 (Miễn vòng) vs Thắng Playoff"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-emerald-950 border-b border-emerald-200 pb-0.5">
                          <span>BÁN KẾT 2 (A)</span>
                          {isFinished && <span className="bg-emerald-200 text-emerald-900 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px] text-emerald-900">{m?.teamA || 'Thắng T3 (Miễn)'}</span>
                          <span className="font-mono">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px] text-amber-900">{m?.teamB || 'Thắng Playoff'}</span>
                          <span className="font-mono">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Chung Kết Bảng A (left: 855px, width: 145px, top: 224px) */}
                  {(() => {
                    const m = groupAData.finMatch;
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '855px',
                          top: '224px',
                          width: '145px',
                          height: '68px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-gradient-to-br from-blue-900 via-blue-950 to-indigo-950 text-white rounded-xl border-2 border-amber-400 shadow-xl p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Chung Kết Bảng A (Vào Chung Kết Toàn Trường)"
                      >
                        <div className="text-[10px] font-black text-amber-300 border-b border-blue-800 pb-0.5">
                          CHUNG KẾT BẢNG A
                        </div>
                        <div className="text-[11px] font-bold text-white flex justify-between items-center">
                          <span className="truncate max-w-[85px]">{m?.teamA || 'Thắng BK 1'}</span>
                          <span className="font-mono text-amber-300 font-bold">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-white flex justify-between items-center">
                          <span className="truncate max-w-[85px]">{m?.teamB || 'Thắng BK 2'}</span>
                          <span className="font-mono text-amber-300 font-bold">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ------------------------------------------------------------- */}
                  {/* 2. CENTER STAGE: CÚP VÔ ĐỊCH, CHUNG KẾT & TRANH HẠNG 3        */}
                  {/* (left: 1060px, width: 260px - ĐỐI XỨNG TUYỆT ĐỐI)             */}
                  {/* ------------------------------------------------------------- */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '1060px',
                      top: '10px',
                      width: '260px'
                    }}
                    className="flex flex-col items-center justify-center space-y-3 z-30"
                  >
                    {/* Golden Trophy */}
                    <div className="relative text-center group cursor-pointer" title="CÚP VÔ ĐỊCH HỘI THAO 2026">
                      <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-xl scale-125 animate-pulse" />
                      <div className="w-16 h-16 mx-auto flex items-center justify-center">
                        <Trophy className="w-14 h-14 text-amber-500 filter drop-shadow-lg" />
                      </div>
                      <span className="font-black text-xs uppercase tracking-widest text-amber-800 block">
                        CÚP VÔ ĐỊCH 🏆
                      </span>
                    </div>

                    {/* Chung kết Toàn Trường */}
                    <div
                      onClick={() => handleMatchClick(grandFinalMatch)}
                      className="w-full bg-gradient-to-b from-red-600 via-red-700 to-red-800 text-white rounded-2xl p-3 border-2 border-amber-300 shadow-2xl space-y-1.5 cursor-pointer hover:scale-105 transition-all text-center"
                    >
                      <div className="font-black text-xs uppercase tracking-wider text-amber-200">
                        CHUNG KẾT TOÀN TRƯỜNG
                      </div>
                      <div className="text-[10px] text-amber-100 italic">
                        {isTournamentCreated ? '(Nhất Bảng A ⚔️ Nhất Bảng B)' : '(Chờ bốc thăm giải đấu)'}
                      </div>
                      <div className="pt-1 border-t border-red-500/80 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-white px-2">
                          <span className="truncate max-w-[140px]">{grandFinalMatch.teamA || 'Nhất Bảng A'}</span>
                          <span className="font-mono text-amber-300 font-black text-sm">{grandFinalMatch.scoreA !== undefined ? grandFinalMatch.scoreA : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-white px-2">
                          <span className="truncate max-w-[140px]">{grandFinalMatch.teamB || 'Nhất Bảng B'}</span>
                          <span className="font-mono text-amber-300 font-black text-sm">{grandFinalMatch.scoreB !== undefined ? grandFinalMatch.scoreB : '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tranh Hạng Ba */}
                    <div
                      onClick={() => handleMatchClick(grandBronzeMatch)}
                      className="w-full bg-white rounded-2xl p-2.5 border-2 border-amber-500 shadow-lg space-y-1 cursor-pointer hover:scale-105 transition-all text-center"
                    >
                      <div className="font-black text-[11px] uppercase tracking-wider text-amber-800">
                        Tranh Hạng Ba 🥉
                      </div>
                      <div className="text-[9px] text-slate-500 italic">
                        {isTournamentCreated ? '(Nhì Bảng A ⚔️ Nhì Bảng B)' : '(Chờ bốc thăm giải đấu)'}
                      </div>
                      <div className="pt-1 border-t border-slate-200 text-xs space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-slate-900 px-2">
                          <span className="truncate max-w-[140px]">{grandBronzeMatch.teamA || 'Nhì Bảng A'}</span>
                          <span className="font-mono text-blue-900 font-bold">{grandBronzeMatch.scoreA !== undefined ? grandBronzeMatch.scoreA : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-slate-900 px-2">
                          <span className="truncate max-w-[140px]">{grandBronzeMatch.teamB || 'Nhì Bảng B'}</span>
                          <span className="font-mono text-blue-900 font-bold">{grandBronzeMatch.scoreB !== undefined ? grandBronzeMatch.scoreB : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* 3. RIGHT SIDE: BẢNG B (ĐỐI XỨNG CÂN ĐỐI 100%)                  */}
                  {/* ------------------------------------------------------------- */}
                  {/* Chung Kết Bảng B (left: 1380px, width: 145px, top: 224px) */}
                  {(() => {
                    const m = groupBData.finMatch;
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '1380px',
                          top: '224px',
                          width: '145px',
                          height: '68px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-gradient-to-br from-blue-900 via-blue-950 to-indigo-950 text-white rounded-xl border-2 border-amber-400 shadow-xl p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Chung Kết Bảng B (Vào Chung Kết Toàn Trường)"
                      >
                        <div className="text-[10px] font-black text-amber-300 border-b border-blue-800 pb-0.5">
                          CHUNG KẾT BẢNG B
                        </div>
                        <div className="text-[11px] font-bold text-white flex justify-between items-center">
                          <span className="truncate max-w-[85px]">{m?.teamA || 'Thắng BK 1'}</span>
                          <span className="font-mono text-amber-300 font-bold">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-white flex justify-between items-center">
                          <span className="truncate max-w-[85px]">{m?.teamB || 'Thắng BK 2'}</span>
                          <span className="font-mono text-amber-300 font-bold">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bán Kết 2 (B) (left: 1585px, width: 145px, top: 352px) */}
                  {(() => {
                    const m = groupBData.sfMatches[1];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '1585px',
                          top: '352px',
                          width: '145px',
                          height: '64px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-emerald-50/90 rounded-xl border-2 border-emerald-700 shadow-lg p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Bán Kết 2 (B): Thắng Trận 3 (Miễn vòng) vs Thắng Playoff"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-emerald-950 border-b border-emerald-200 pb-0.5">
                          <span>BÁN KẾT 2 (B)</span>
                          {isFinished && <span className="bg-emerald-200 text-emerald-900 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px] text-emerald-900">{m?.teamA || 'Thắng T3 (Miễn)'}</span>
                          <span className="font-mono">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px] text-amber-900">{m?.teamB || 'Thắng Playoff'}</span>
                          <span className="font-mono">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bán Kết 1 (B) (left: 1790px, width: 145px, top: 100px) */}
                  {(() => {
                    const m = groupBData.sfMatches[0];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '1790px',
                          top: '100px',
                          width: '145px',
                          height: '64px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-blue-50/90 rounded-xl border-2 border-indigo-700 shadow-lg p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Bán Kết 1 (B): Thắng Trận 1 vs Thắng Trận 2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-indigo-950 border-b border-indigo-200 pb-0.5">
                          <span>BÁN KẾT 1 (B)</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamA || 'Thắng Trận 1'}</span>
                          <span className="font-mono">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamB || 'Thắng Trận 2'}</span>
                          <span className="font-mono">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* TRẬN PLAYOFF ĐẤU TRƯỚC (BẢNG B) (left: 1790px, width: 145px, top: 436px) */}
                  {(() => {
                    const m = groupBData.playoffMatch;
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left: '1790px',
                          top: '436px',
                          width: '145px',
                          height: '64px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-amber-50 rounded-xl border-2 border-amber-600 shadow-md p-2 flex flex-col justify-between text-xs cursor-pointer hover:scale-105 transition-all z-10"
                        title="Vòng Đấu Trước (Playoff): Thắng Trận 4 vs Thắng Trận 5 tranh vé vào Bán Kết 2"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-amber-950 border-b border-amber-200 pb-0.5">
                          <span className="flex items-center gap-1">
                            <Swords className="w-3 h-3 text-amber-700" />
                            <span>PLAYOFF ĐẤU TRƯỚC</span>
                          </span>
                          {isFinished && <span className="bg-amber-200 text-amber-900 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamA || 'Thắng Trận 4'}</span>
                          <span className="font-mono">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-900 flex justify-between">
                          <span className="truncate max-w-[90px]">{m?.teamB || 'Thắng Trận 5'}</span>
                          <span className="font-mono">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Matches Vòng 1 Bảng B (left: 1985px, width: 145px) */}
                  {Array.from({ length: pairsB }, (_, k) => {
                    const m = groupBData.r1Matches[k];
                    const yCenter = (30 + (2 * k) * 56 + 18 + 30 + (2 * k + 1) * 56 + 18) / 2;
                    const teamA = m?.teamA || groupBData.teams[2 * k]?.name || '---';
                    const teamB = m?.teamB || groupBData.teams[2 * k + 1]?.name || '---';
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };

                    const isBye = k === 2; // Trận 3: MIỄN 1 VÒNG
                    const isPrelim = k >= 3; // Trận 4 & 5: ĐẤU TRƯỚC

                    return (
                      <div
                        key={`match-g2-b-r1-${k}`}
                        style={{
                          position: 'absolute',
                          left: '1985px',
                          top: `${yCenter - 28}px`,
                          width: '145px',
                          height: '56px'
                        }}
                        onClick={() => m && handleMatchClick(m)}
                        className={`bg-white rounded-xl border-2 shadow-md p-1.5 flex flex-col justify-between text-xs cursor-pointer hover:shadow-lg transition-all z-10 group ${
                          isBye 
                            ? 'border-emerald-600 ring-2 ring-emerald-300/60' 
                            : isPrelim 
                            ? 'border-amber-600 ring-2 ring-amber-300/60' 
                            : 'border-blue-700'
                        }`}
                        title={m ? `${m.subCategory}: ${teamA} vs ${teamB}` : `Trận ${k + 1} Bảng B`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black border-b border-slate-100 pb-0.5">
                          <span className={isBye ? 'text-emerald-800 flex items-center gap-1' : isPrelim ? 'text-amber-800 flex items-center gap-1' : 'text-blue-900'}>
                            {isBye && <Star className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />}
                            {isPrelim && <Swords className="w-2.5 h-2.5 text-amber-600" />}
                            <span>Trận {k + 1}</span>
                            {isBye && <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">MIỄN VÒNG</span>}
                            {isPrelim && <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-bold">ĐẤU TRƯỚC</span>}
                          </span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="truncate max-w-[90px]">{teamA}</span>
                          <span className="font-mono text-blue-900">{scoreA !== undefined ? scoreA : '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="truncate max-w-[90px]">{teamB}</span>
                          <span className="font-mono text-blue-900">{scoreB !== undefined ? scoreB : '-'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Team Slots Bảng B (left: 2170px, width: 180px) */}
                  {groupBData.teams.map((team, i) => {
                    const yTop = 30 + i * 56;
                    const isHl = isSlotHighlighted(team.name);
                    return (
                      <div
                        key={`slot-g2-b-${i}`}
                        style={{
                          position: 'absolute',
                          left: '2170px',
                          top: `${yTop}px`,
                          width: '180px',
                          height: '36px'
                        }}
                        className={`flex items-center rounded-xl border shadow-xs transition-all z-10 overflow-hidden ${
                          isHl
                            ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400 scale-105'
                            : team.name
                            ? 'bg-white border-blue-300 hover:border-blue-700 hover:shadow-md cursor-pointer'
                            : 'bg-slate-50/70 border-dashed border-slate-300 text-slate-400'
                        }`}
                        title={team.name ? `Đội B${i + 1}: ${team.name}` : `Hạt giống B${i + 1}: Trống (Chưa tạo giải)`}
                      >
                        {team.name ? (
                          <div className="px-2 flex items-center justify-between w-full text-xs leading-tight truncate">
                            <span className="text-[10px] text-slate-400 truncate mr-1">{team.sub}</span>
                            <span className="font-bold text-blue-950 truncate flex items-center gap-1.5">
                              <span>{team.name}</span>
                              <span className="text-sm">{team.emblem}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="px-2 flex items-center justify-between w-full text-[11px] leading-tight text-slate-400 italic">
                            <span className="text-[10px] text-slate-400">Chờ xếp</span>
                            <span className="font-mono text-slate-400 tracking-wider">--- Trống ---</span>
                          </div>
                        )}
                        <span className={`w-8 h-full text-xs font-black flex items-center justify-center shrink-0 font-mono ${
                          team.name ? 'bg-blue-950 text-white' : 'bg-slate-300 text-slate-700'
                        }`}>
                          B{i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* =================================================================== */}
            {/* 2.2 RENDER BRACKET TREE: 8-TEAM KNOCKOUT                            */}
            {/* =================================================================== */}
            {activeMode === 'knockout_8' && (() => {
              const qfMatches = sportMatches.filter((m) => m.stage === 'Tứ kết');
              const sfMatches = sportMatches.filter((m) => m.stage === 'Bán kết');
              return (
                <div 
                  style={{ width: '2380px', height: '520px' }} 
                  className="relative overflow-visible"
                >
                  <svg width={2380} height={520} className="absolute inset-0 pointer-events-none z-0">
                    {[
                      { yTop: 50, yBot: 140, yMid: 95 },
                      { yTop: 230, yBot: 320, yMid: 275 }
                    ].map((fork, idx) => (
                      <g key={`svg-k8-l0-${idx}`}>
                        <path d={`M 340 ${fork.yTop} H 400 V ${fork.yBot} H 340 M 400 ${fork.yMid} H 460`} fill="none" stroke="#ffffff" strokeWidth="6" />
                        <path d={`M 340 ${fork.yTop} H 400 V ${fork.yBot} H 340 M 400 ${fork.yMid} H 460`} fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
                      </g>
                    ))}
                    <g key="svg-k8-l-sf">
                      <path d="M 605 95 H 660 V 275 H 605 M 660 185 H 710" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 605 95 H 660 V 275 H 605 M 660 185 H 710" fill="none" stroke="#1e40af" strokeWidth="2.5" />
                    </g>
                    <g key="svg-k8-l-fin">
                      <path d="M 855 185 H 960 V 142 H 1060" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 855 185 H 960 V 142 H 1060" fill="none" stroke="#b45309" strokeWidth="3.5" />
                      <path d="M 960 185 V 275 H 1060" fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray="4 4" />
                    </g>
                    <g key="svg-k8-r-fin">
                      <path d="M 1525 185 H 1420 V 142 H 1320" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 1525 185 H 1420 V 142 H 1320" fill="none" stroke="#b45309" strokeWidth="3.5" />
                      <path d="M 1420 185 V 275 H 1320" fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray="4 4" />
                    </g>
                    <g key="svg-k8-r-sf">
                      <path d="M 1775 95 H 1720 V 275 H 1775 M 1720 185 H 1670" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 1775 95 H 1720 V 275 H 1775 M 1720 185 H 1670" fill="none" stroke="#1e40af" strokeWidth="2.5" />
                    </g>
                    {[
                      { yTop: 50, yBot: 140, yMid: 95 },
                      { yTop: 230, yBot: 320, yMid: 275 }
                    ].map((fork, idx) => (
                      <g key={`svg-k8-r0-${idx}`}>
                        <path d={`M 2040 ${fork.yTop} H 1980 V ${fork.yBot} H 2040 M 1980 ${fork.yMid} H 1920`} fill="none" stroke="#ffffff" strokeWidth="6" />
                        <path d={`M 2040 ${fork.yTop} H 1980 V ${fork.yBot} H 2040 M 1980 ${fork.yMid} H 1920`} fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
                      </g>
                    ))}
                  </svg>

                  {/* Left: 4 Team Slots (x=160, width=180) */}
                  {[0, 1, 2, 3].map((i) => {
                    const teamName = isTournamentCreated ? realTeamsInMatches[i] || '' : '';
                    const y = 30 + i * 90;
                    return (
                      <div
                        key={`k8-slot-l-${i}`}
                        style={{ position: 'absolute', left: '160px', top: `${y}px`, width: '180px', height: '40px' }}
                        className={`rounded-xl border shadow-sm flex items-center px-2 text-xs font-bold ${
                          teamName ? 'bg-white border-blue-300' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-blue-950 text-white flex items-center justify-center font-mono mr-2 text-[11px] shrink-0">{i + 1}</span>
                        <span className="truncate text-blue-950">{teamName ? `Lớp ${teamName}` : '--- (Trống) ---'}</span>
                      </div>
                    );
                  })}

                  {/* Left: 2 QFs (x=460, width=145) */}
                  {[
                    { top: 65, title: 'Tứ Kết 1', match: qfMatches[0] },
                    { top: 245, title: 'Tứ Kết 2', match: qfMatches[1] }
                  ].map((qf, idx) => {
                    const m = qf.match;
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        key={`k8-qf-l-${idx}`}
                        style={{ position: 'absolute', left: '460px', top: `${qf.top}px`, width: '145px', height: '60px' }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-white rounded-xl border-2 border-blue-800 shadow-md p-2 text-xs flex flex-col justify-between cursor-pointer hover:border-blue-950"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-blue-900 border-b pb-0.5">
                          <span>{qf.title}</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <span className="truncate text-slate-800 font-bold">{m?.teamA || `Đội ${idx * 2 + 1}`} vs {m?.teamB || `Đội ${idx * 2 + 2}`}</span>
                      </div>
                    );
                  })}

                  {/* Left: 1 Semifinal (x=710, width=145) */}
                  {(() => {
                    const m = sfMatches[0];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{ position: 'absolute', left: '710px', top: '155px', width: '145px', height: '60px' }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-blue-50 rounded-xl border-2 border-indigo-700 shadow-lg p-2 text-xs flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-indigo-950 border-b pb-0.5">
                          <span>BÁN KẾT 1</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <span className="truncate text-slate-800 font-bold">{m?.teamA || 'Thắng TK1'} vs {m?.teamB || 'Thắng TK2'}</span>
                      </div>
                    );
                  })()}

                  {/* Center: Grand Final & 3rd Place (x=1060, width=260) */}
                  <div
                    style={{ position: 'absolute', left: '1060px', top: '15px', width: '260px' }}
                    className="flex flex-col items-center space-y-3 z-30"
                  >
                    <Trophy className="w-14 h-14 text-amber-500 filter drop-shadow animate-pulse" />
                    <div 
                      onClick={() => handleMatchClick(grandFinalMatch)}
                      className="w-full bg-gradient-to-b from-red-600 to-red-800 text-white rounded-2xl p-3 border-2 border-amber-300 shadow-xl text-center cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="font-black text-xs uppercase text-amber-200">CHUNG KẾT VÔ ĐỊCH</div>
                      <div className="text-[10px] pt-1">{grandFinalMatch.teamA || 'Thắng Bán Kết 1'} ⚔️ {grandFinalMatch.teamB || 'Thắng Bán Kết 2'}</div>
                    </div>
                    <div 
                      onClick={() => handleMatchClick(grandBronzeMatch)}
                      className="w-full bg-white rounded-xl p-2 border-2 border-amber-500 text-center text-xs cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="font-bold text-amber-800 text-[10px] uppercase">Tranh Hạng Ba 🥉</div>
                      <div className="text-[9px] text-slate-500">{grandBronzeMatch.teamA || 'Thua Bán Kết 1'} ⚔️ {grandBronzeMatch.teamB || 'Thua Bán Kết 2'}</div>
                    </div>
                  </div>

                  {/* Right: 1 Semifinal (x=1525, width=145) */}
                  {(() => {
                    const m = sfMatches[1];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{ position: 'absolute', left: '1525px', top: '155px', width: '145px', height: '60px' }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-blue-50 rounded-xl border-2 border-indigo-700 shadow-lg p-2 text-xs flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-indigo-950 border-b pb-0.5">
                          <span>BÁN KẾT 2</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <span className="truncate text-slate-800 font-bold">{m?.teamA || 'Thắng TK3'} vs {m?.teamB || 'Thắng TK4'}</span>
                      </div>
                    );
                  })()}

                  {/* Right: 2 QFs (x=1775, width=145) */}
                  {[
                    { top: 65, title: 'Tứ Kết 3', match: qfMatches[2] },
                    { top: 245, title: 'Tứ Kết 4', match: qfMatches[3] }
                  ].map((qf, idx) => {
                    const m = qf.match;
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        key={`k8-qf-r-${idx}`}
                        style={{ position: 'absolute', left: '1775px', top: `${qf.top}px`, width: '145px', height: '60px' }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-white rounded-xl border-2 border-blue-800 shadow-md p-2 text-xs flex flex-col justify-between cursor-pointer hover:border-blue-950"
                      >
                        <div className="flex items-center justify-between text-[10px] font-black text-blue-900 border-b pb-0.5">
                          <span>{qf.title}</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <span className="truncate text-slate-800 font-bold">{m?.teamA || `Đội ${idx * 2 + 5}`} vs {m?.teamB || `Đội ${idx * 2 + 6}`}</span>
                      </div>
                    );
                  })}

                  {/* Right: 4 Team Slots (x=2040, width=180) */}
                  {[0, 1, 2, 3].map((i) => {
                    const teamName = isTournamentCreated ? realTeamsInMatches[i + 4] || '' : '';
                    const y = 30 + i * 90;
                    return (
                      <div
                        key={`k8-slot-r-${i}`}
                        style={{ position: 'absolute', left: '2040px', top: `${y}px`, width: '180px', height: '40px' }}
                        className={`rounded-xl border shadow-sm flex items-center justify-between px-2 text-xs font-bold ${
                          teamName ? 'bg-white border-blue-300' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                        }`}
                      >
                        <span className="truncate text-blue-950">{teamName ? `Lớp ${teamName}` : '--- (Trống) ---'}</span>
                        <span className="w-6 h-6 rounded-full bg-blue-950 text-white flex items-center justify-center font-mono ml-2 text-[11px] shrink-0">{i + 5}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* =================================================================== */}
            {/* 2.3 RENDER BRACKET TREE: 4-TEAM KNOCKOUT                            */}
            {/* =================================================================== */}
            {activeMode === 'knockout_4' && (() => {
              const sfMatches = sportMatches.filter((m) => m.stage === 'Bán kết');
              return (
                <div 
                  style={{ width: '2380px', height: '440px' }} 
                  className="relative overflow-visible"
                >
                  <svg width={2380} height={440} className="absolute inset-0 pointer-events-none z-0">
                    <g key="svg-k4-l0">
                      <path d="M 440 120 H 540 V 280 H 440 M 540 200 H 640" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 440 120 H 540 V 280 H 440 M 540 200 H 640" fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
                    </g>
                    <g key="svg-k4-l-fin">
                      <path d="M 820 200 H 940 V 142 H 1060" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 820 200 H 940 V 142 H 1060" fill="none" stroke="#b45309" strokeWidth="3.5" />
                      <path d="M 940 200 V 275 H 1060" fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray="4 4" />
                    </g>
                    <g key="svg-k4-r-fin">
                      <path d="M 1560 200 H 1440 V 142 H 1320" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 1560 200 H 1440 V 142 H 1320" fill="none" stroke="#b45309" strokeWidth="3.5" />
                      <path d="M 1440 200 V 275 H 1320" fill="none" stroke="#d97706" strokeWidth="2.5" strokeDasharray="4 4" />
                    </g>
                    <g key="svg-k4-r0">
                      <path d="M 1940 120 H 1840 V 280 H 1940 M 1840 200 H 1740" fill="none" stroke="#ffffff" strokeWidth="6" />
                      <path d="M 1940 120 H 1840 V 280 H 1940 M 1840 200 H 1740" fill="none" stroke="#1d4ed8" strokeWidth="2.5" />
                    </g>
                  </svg>

                  {/* Left: 2 Team Slots */}
                  {[0, 1].map((i) => {
                    const teamName = isTournamentCreated ? realTeamsInMatches[i] || '' : '';
                    const y = i === 0 ? 98 : 258;
                    return (
                      <div
                        key={`k4-slot-l-${i}`}
                        style={{ position: 'absolute', left: '220px', top: `${y}px`, width: '220px', height: '44px' }}
                        className={`rounded-xl border shadow-sm flex items-center px-3 text-xs font-bold ${
                          teamName ? 'bg-white border-blue-300' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                        }`}
                      >
                        <span className="w-7 h-7 rounded-full bg-blue-950 text-white flex items-center justify-center font-mono mr-2.5 text-xs shrink-0">{i + 1}</span>
                        <span className="truncate text-blue-950">{teamName ? `Lớp ${teamName}` : '--- (Trống) ---'}</span>
                      </div>
                    );
                  })}

                  {/* Left: Semifinal 1 */}
                  {(() => {
                    const m = sfMatches[0];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{ position: 'absolute', left: '640px', top: '165px', width: '180px', height: '70px' }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-blue-50 rounded-2xl border-2 border-indigo-700 shadow-xl p-2.5 text-xs flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-indigo-950 border-b pb-1">
                          <span>BÁN KẾT 1</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1.5 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <span className="truncate text-slate-800 font-bold">{m?.teamA || 'Đội 1'} vs {m?.teamB || 'Đội 2'}</span>
                      </div>
                    );
                  })()}

                  {/* Center: Grand Final & 3rd Place */}
                  <div
                    style={{ position: 'absolute', left: '1060px', top: '15px', width: '260px' }}
                    className="flex flex-col items-center space-y-3 z-30"
                  >
                    <Trophy className="w-16 h-16 text-amber-500 filter drop-shadow animate-pulse" />
                    <div 
                      onClick={() => handleMatchClick(grandFinalMatch)}
                      className="w-full bg-gradient-to-b from-red-600 to-red-800 text-white rounded-2xl p-3 border-2 border-amber-300 shadow-xl text-center cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="font-black text-xs uppercase text-amber-200">CHUNG KẾT VÔ ĐỊCH</div>
                      <div className="text-[10px] pt-1">{grandFinalMatch.teamA || 'Thắng Bán Kết 1'} ⚔️ {grandFinalMatch.teamB || 'Thắng Bán Kết 2'}</div>
                    </div>
                    <div 
                      onClick={() => handleMatchClick(grandBronzeMatch)}
                      className="w-full bg-white rounded-xl p-2.5 border-2 border-amber-500 text-center text-xs cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="font-bold text-amber-800 text-[10px] uppercase">Tranh Hạng Ba 🥉</div>
                      <div className="text-[9px] text-slate-500">{grandBronzeMatch.teamA || 'Thua Bán Kết 1'} ⚔️ {grandBronzeMatch.teamB || 'Thua Bán Kết 2'}</div>
                    </div>
                  </div>

                  {/* Right: Semifinal 2 */}
                  {(() => {
                    const m = sfMatches[1];
                    const { isFinished, scoreA, scoreB } = m ? getResults(m) : { isFinished: false, scoreA: undefined, scoreB: undefined };
                    return (
                      <div
                        style={{ position: 'absolute', left: '1560px', top: '165px', width: '180px', height: '70px' }}
                        onClick={() => m && handleMatchClick(m)}
                        className="bg-blue-50 rounded-2xl border-2 border-indigo-700 shadow-xl p-2.5 text-xs flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-indigo-950 border-b pb-1">
                          <span>BÁN KẾT 2</span>
                          {isFinished && <span className="bg-emerald-100 text-emerald-800 px-1.5 rounded font-mono">{scoreA}:{scoreB}</span>}
                        </div>
                        <span className="truncate text-slate-800 font-bold">{m?.teamA || 'Đội 3'} vs {m?.teamB || 'Đội 4'}</span>
                      </div>
                    );
                  })()}

                  {/* Right: 2 Team Slots */}
                  {[0, 1].map((i) => {
                    const teamName = isTournamentCreated ? realTeamsInMatches[i + 2] || '' : '';
                    const y = i === 0 ? 98 : 258;
                    return (
                      <div
                        key={`k4-slot-r-${i}`}
                        style={{ position: 'absolute', left: '1940px', top: `${y}px`, width: '220px', height: '44px' }}
                        className={`rounded-xl border shadow-sm flex items-center justify-between px-3 text-xs font-bold ${
                          teamName ? 'bg-white border-blue-300' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                        }`}
                      >
                        <span className="truncate text-blue-950">{teamName ? `Lớp ${teamName}` : '--- (Trống) ---'}</span>
                        <span className="w-7 h-7 rounded-full bg-blue-950 text-white flex items-center justify-center font-mono ml-2.5 text-xs shrink-0">{i + 3}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* =================================================================== */}
            {/* 2.4 RENDER BRACKET TREE: 16-TEAM KNOCKOUT                           */}
            {/* =================================================================== */}
            {activeMode === 'knockout_16' && (() => {
              return (
                <div 
                  style={{ width: '2380px', height: '620px' }} 
                  className="relative overflow-visible"
                >
                  {/* Left 8 teams slots, Right 8 teams slots */}
                  {Array.from({ length: 8 }, (_, i) => {
                    const teamLeft = isTournamentCreated ? realTeamsInMatches[i] || '' : '';
                    const teamRight = isTournamentCreated ? realTeamsInMatches[i + 8] || '' : '';
                    const y = 20 + i * 70;
                    return (
                      <React.Fragment key={`k16-slots-${i}`}>
                        <div
                          style={{ position: 'absolute', left: '60px', top: `${y}px`, width: '180px', height: '36px' }}
                          className={`rounded-xl border shadow-xs flex items-center px-2 text-xs font-bold ${
                            teamLeft ? 'bg-white border-blue-300' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                          }`}
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-950 text-white flex items-center justify-center font-mono mr-2 text-[11px] shrink-0">{i + 1}</span>
                          <span className="truncate text-blue-950">{teamLeft ? `Lớp ${teamLeft}` : '--- (Trống) ---'}</span>
                        </div>
                        <div
                          style={{ position: 'absolute', left: '2140px', top: `${y}px`, width: '180px', height: '36px' }}
                          className={`rounded-xl border shadow-xs flex items-center justify-between px-2 text-xs font-bold ${
                            teamRight ? 'bg-white border-blue-300' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                          }`}
                        >
                          <span className="truncate text-blue-950">{teamRight ? `Lớp ${teamRight}` : '--- (Trống) ---'}</span>
                          <span className="w-6 h-6 rounded-full bg-blue-950 text-white flex items-center justify-center font-mono ml-2 text-[11px] shrink-0">{i + 9}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Left 4 R1 Matches (x=300, width=140) */}
                  {Array.from({ length: 4 }, (_, k) => {
                    const y = 35 + k * 140;
                    return (
                      <div
                        key={`k16-r1-l-${k}`}
                        style={{ position: 'absolute', left: '300px', top: `${y}px`, width: '140px', height: '54px' }}
                        className="bg-white rounded-xl border-2 border-blue-700 shadow-md p-1.5 flex flex-col justify-between text-xs"
                      >
                        <span className="text-[10px] font-black text-blue-900 border-b pb-0.5">Vòng 1/8 ({k + 1})</span>
                        <span className="truncate text-slate-800 text-[11px] font-bold">Đội {k * 2 + 1} vs {k * 2 + 2}</span>
                      </div>
                    );
                  })}

                  {/* Left 2 QFs (x=500, width=130) */}
                  {[0, 1].map((k) => (
                    <div
                      key={`k16-qf-l-${k}`}
                      style={{ position: 'absolute', left: '500px', top: `${105 + k * 280}px`, width: '130px', height: '54px' }}
                      className="bg-white rounded-xl border-2 border-indigo-800 shadow-md p-1.5 flex flex-col justify-between text-xs"
                    >
                      <span className="text-[10px] font-black text-indigo-900 border-b pb-0.5">Tứ Kết {k + 1}</span>
                      <span className="truncate text-slate-800 text-[11px] font-bold">Thắng R1 vs R2</span>
                    </div>
                  ))}

                  {/* Left 1 SF (x=700, width=130) */}
                  <div
                    style={{ position: 'absolute', left: '700px', top: '245px', width: '130px', height: '54px' }}
                    className="bg-blue-50 rounded-xl border-2 border-indigo-900 shadow-lg p-1.5 flex flex-col justify-between text-xs"
                  >
                    <span className="text-[10px] font-black text-indigo-950 border-b pb-0.5">BÁN KẾT 1</span>
                    <span className="truncate text-slate-800 text-[11px] font-bold">Thắng TK1 vs TK2</span>
                  </div>

                  {/* Center: Grand Final & 3rd Place (x=1060, width=260) */}
                  <div
                    style={{ position: 'absolute', left: '1060px', top: '40px', width: '260px' }}
                    className="flex flex-col items-center space-y-3 z-30"
                  >
                    <Trophy className="w-16 h-16 text-amber-500 filter drop-shadow animate-pulse" />
                    <div 
                      onClick={() => handleMatchClick(grandFinalMatch)}
                      className="w-full bg-gradient-to-b from-red-600 to-red-800 text-white rounded-2xl p-3 border-2 border-amber-300 shadow-xl text-center cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="font-black text-xs uppercase text-amber-200">CHUNG KẾT VÔ ĐỊCH 16 ĐỘI</div>
                      <div className="text-[10px] pt-1">{grandFinalMatch.teamA || 'Thắng BK 1'} ⚔️ {grandFinalMatch.teamB || 'Thắng BK 2'}</div>
                    </div>
                    <div 
                      onClick={() => handleMatchClick(grandBronzeMatch)}
                      className="w-full bg-white rounded-xl p-2.5 border-2 border-amber-500 text-center text-xs cursor-pointer hover:scale-105 transition-all"
                    >
                      <div className="font-bold text-amber-800 text-[10px] uppercase">Tranh Hạng Ba 🥉</div>
                      <div className="text-[9px] text-slate-500">{grandBronzeMatch.teamA || 'Thua BK 1'} ⚔️ {grandBronzeMatch.teamB || 'Thua BK 2'}</div>
                    </div>
                  </div>

                  {/* Right 1 SF (x=1550, width=130) */}
                  <div
                    style={{ position: 'absolute', left: '1550px', top: '245px', width: '130px', height: '54px' }}
                    className="bg-blue-50 rounded-xl border-2 border-indigo-900 shadow-lg p-1.5 flex flex-col justify-between text-xs"
                  >
                    <span className="text-[10px] font-black text-indigo-950 border-b pb-0.5">BÁN KẾT 2</span>
                    <span className="truncate text-slate-800 text-[11px] font-bold">Thắng TK3 vs TK4</span>
                  </div>

                  {/* Right 2 QFs (x=1750, width=130) */}
                  {[0, 1].map((k) => (
                    <div
                      key={`k16-qf-r-${k}`}
                      style={{ position: 'absolute', left: '1750px', top: `${105 + k * 280}px`, width: '130px', height: '54px' }}
                      className="bg-white rounded-xl border-2 border-indigo-800 shadow-md p-1.5 flex flex-col justify-between text-xs"
                    >
                      <span className="text-[10px] font-black text-indigo-900 border-b pb-0.5">Tứ Kết {k + 3}</span>
                      <span className="truncate text-slate-800 text-[11px] font-bold">Thắng R3 vs R4</span>
                    </div>
                  ))}

                  {/* Right 4 R1 Matches (x=1940, width=140) */}
                  {Array.from({ length: 4 }, (_, k) => {
                    const y = 35 + k * 140;
                    return (
                      <div
                        key={`k16-r1-r-${k}`}
                        style={{ position: 'absolute', left: '1940px', top: `${y}px`, width: '140px', height: '54px' }}
                        className="bg-white rounded-xl border-2 border-blue-700 shadow-md p-1.5 flex flex-col justify-between text-xs"
                      >
                        <span className="text-[10px] font-black text-blue-900 border-b pb-0.5">Vòng 1/8 ({k + 5})</span>
                        <span className="truncate text-slate-800 text-[11px] font-bold">Đội {k * 2 + 9} vs {k * 2 + 10}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* =================================================================== */}
            {/* 2.5 RENDER BRACKET TREE: 64-TEAM GRAND TOURNAMENT                    */}
            {/* =================================================================== */}
            {activeMode === 'knockout_64' && (
              <div 
                style={{ width: '2380px', height: '1100px' }} 
                className="relative overflow-visible"
              >
                <div className="flex items-center justify-center p-8 bg-blue-50/50 rounded-2xl border-2 border-dashed border-blue-300 text-center">
                  <div className="space-y-2">
                    <Trophy className="w-12 h-12 text-amber-500 mx-auto" />
                    <h3 className="font-black text-base text-blue-950">Sơ Đồ Cúp Vô Địch 64 Đội Toàn Diện</h3>
                    <p className="text-xs text-slate-600 max-w-lg mx-auto">
                      Áp dụng cho các giải đấu quy mô lớn toàn trường với 64 đội hoặc khi người dùng muốn in toàn bộ cây cúp 64 nhánh theo chuẩn bản vẽ thi đấu thể thao học đường.
                    </p>
                    <button
                      onClick={() => setIsPrintModalOpen(true)}
                      className="px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold hover:bg-blue-900 cursor-pointer"
                    >
                      Mở Bản Vẽ In Khổ A3 / A4
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Footer Info on Diagram */}
            <div className="mt-8 pt-3 border-t border-blue-300/80 flex items-center justify-between text-xs text-blue-950 font-bold">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400 shrink-0">
                  <img src={SCHOOL_LOGO_DATA_URI} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span>Trường THPT Phú Lâm · Ban Tổ Chức Hội Thao Thể Thao Học Đường</span>
              </div>
              <div className="flex items-center gap-6 text-slate-700">
                <span>Số đội sơ đồ: <strong className="text-blue-950 font-black">
                  {currentTotalTeamCount} đội (Phân nhánh Playoff & Miễn vòng chuẩn xác)
                </strong></span>
                <span>Trạng thái: <strong className={isTournamentCreated ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
                  {isTournamentCreated ? 'Đã tạo lịch thi đấu chuẩn' : 'Chưa tạo giải đấu (Để trống tên đội)'}
                </strong></span>
                <span>Địa điểm: <strong className="text-blue-950 font-black">{currentSport.venue}</strong></span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS: MATCH DETAIL & PRINT MODAL                                      */}
      {/* ========================================================================= */}

      {/* Selected Match Quick Preview Card */}
      {selectedMatchPreview && (
        <div className="fixed bottom-6 right-6 z-40 bg-white border-2 border-blue-900 rounded-2xl shadow-2xl p-4 w-84 space-y-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-black uppercase text-blue-950 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{selectedMatchPreview.subCategory}</span>
            </span>
            <button 
              onClick={() => setSelectedMatchPreview(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <span>{selectedMatchPreview.teamAEmblem || getTeamEmblem(selectedMatchPreview.teamA, registrations)}</span>
                <span className="truncate max-w-[150px]">{selectedMatchPreview.teamA}</span>
              </span>
              <span className="font-mono text-base font-black text-blue-900">
                {selectedMatchPreview.scoreA !== undefined ? selectedMatchPreview.scoreA : '-'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <span>{selectedMatchPreview.teamBEmblem || getTeamEmblem(selectedMatchPreview.teamB, registrations)}</span>
                <span className="truncate max-w-[150px]">{selectedMatchPreview.teamB}</span>
              </span>
              <span className="font-mono text-base font-black text-blue-900">
                {selectedMatchPreview.scoreB !== undefined ? selectedMatchPreview.scoreB : '-'}
              </span>
            </div>

            <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Trạng thái: <strong>{
                !isTournamentCreated 
                  ? 'Chưa tạo giải đấu' 
                  : selectedMatchPreview.status === 'Finished' 
                  ? 'Đã kết thúc' 
                  : selectedMatchPreview.status === 'Live' 
                  ? 'Đang diễn ra' 
                  : 'Sắp diễn ra'
              }</strong></span>
              <span>{isTournamentCreated ? selectedMatchPreview.time : '--:--'}</span>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{selectedMatchPreview.venue}</span>
            </div>
          </div>

          {!isTournamentCreated && onSwitchToDraw ? (
            <button
              onClick={() => {
                setSelectedMatchPreview(null);
                onSwitchToDraw();
              }}
              className="w-full py-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Bốc Thăm & Tạo Lịch Đấu Ngay</span>
            </button>
          ) : isAdmin && onOpenMatchEdit ? (
            <button
              onClick={() => {
                onOpenMatchEdit(selectedMatchPreview);
                setSelectedMatchPreview(null);
              }}
              className="w-full py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Cập Nhật Tỉ Số & Kết Quả</span>
            </button>
          ) : null}
        </div>
      )}

      {/* Print Bracket Diagram Modal */}
      {isPrintModalOpen && (
        <PrintBracketModal
          matches={matches}
          sports={sports}
          registrations={registrations}
          selectedSportId={selectedSportId}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

    </div>
  );
};
