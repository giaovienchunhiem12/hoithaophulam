import React, { useState, useMemo, useEffect } from 'react';
import { Match, SportCategory, Registration } from '../types/sports';
import { getTeamEmblem, isSystemPlaceholderTeam } from '../data/mockSportsData';
import { SCHOOL_LOGO_DATA_URI } from '../assets/logoData';
import { 
  Trophy, MapPin, Sparkles, MoveHorizontal, 
  ZoomIn, ZoomOut, RotateCcw, Edit3, Info,
  Printer, Flame, Search, Layers, ShieldCheck
} from 'lucide-react';
import { PrintBracketModal } from './PrintBracketModal';

export type DiagramFormatMode = 
  | 'auto' 
  | 'knockout_4'
  | 'knockout_5'
  | 'knockout_8'
  | 'knockout_16'
  | 'knockout_32'
  | 'knockout_64'
  | 'custom';

interface TournamentBracketTreeProps {
  matches: Match[];
  sports: SportCategory[];
  registrations?: Registration[];
  selectedSportId: string;
  onOpenMatchEdit?: (match: Match) => void;
  isAdmin?: boolean;
  onSwitchToDraw?: () => void;
  tournamentName?: string;
  tournamentTeamsCount?: number;
}

interface BracketSlotNode {
  index: number;
  label: string;
  teamName: string;
  emblem: string;
  subLabel: string;
  centerY: number;
}

interface BracketMatchNode {
  roundIndex: number; // 1..R
  matchIndex: number; // 0..count-1
  title: string;
  shortCode: string;
  teamA: string;
  teamB: string;
  scoreA?: number;
  scoreB?: number;
  status: 'Upcoming' | 'Live' | 'Finished';
  isBye: boolean;
  centerY: number;
  sourceTopY: number;
  sourceBotY?: number;
  matchRef?: Match;
}

const isPlaceholderTeamName = (name?: string, registrations: Registration[] = []): boolean => {
  return isSystemPlaceholderTeam(name, registrations);
};

export const TournamentBracketTree: React.FC<TournamentBracketTreeProps> = ({
  matches,
  sports,
  registrations = [],
  selectedSportId,
  onOpenMatchEdit,
  isAdmin = false,
  onSwitchToDraw,
  tournamentName,
  tournamentTeamsCount
}) => {
  const [selectedFormat, setSelectedFormat] = useState<DiagramFormatMode>('auto');
  const [customTeamCount, setCustomTeamCount] = useState<number>(16);
  const [viewMode, setViewMode] = useState<string>('combined');
  const [zoomLevel, setZoomLevel] = useState<number>(90);
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

  const isTournamentCreated = sportMatches.length > 0;

  // Available groups in current matches
  const availableGroups = useMemo(() => {
    if (!isTournamentCreated) return [];
    const groups = Array.from(
      new Set(
        sportMatches
          .map((m) => m.groupName)
          .filter((g): g is string => Boolean(g && g !== 'Toàn Trường'))
      )
    );
    return groups.sort();
  }, [sportMatches, isTournamentCreated]);

  // Matches filtered by active group tab (or all matches in 'combined' mode)
  const scopedMatches = useMemo(() => {
    if (viewMode === 'combined' || !availableGroups.includes(viewMode)) {
      return sportMatches;
    }
    return sportMatches.filter((m) => m.groupName === viewMode);
  }, [sportMatches, viewMode, availableGroups]);

  // Extract ordered real teams from scopedMatches or registrations
  const extractedTeams = useMemo(() => {
    const result: { name: string; emblem: string; sub: string }[] = [];
    const seen = new Set<string>();

    const addTeam = (rawName: string | undefined, groupLabel: string) => {
      if (!rawName || isPlaceholderTeamName(rawName, registrations)) return;
      const clean = rawName.trim();
      if (seen.has(clean)) return;
      seen.add(clean);
      result.push({
        name: clean,
        emblem: getTeamEmblem(clean, registrations),
        sub: groupLabel
      });
    };

    if (isTournamentCreated) {
      // 1. First extract from Round 1 / Vòng bảng / Tứ kết matches in order so pairings match R1 matches
      const r1Candidates = scopedMatches.filter(
        (m) =>
          m.stage === 'Vòng bảng' ||
          m.id.includes('R1') ||
          m.subCategory?.includes('Vòng Loại') ||
          m.subCategory?.includes('Vòng 1') ||
          m.subCategory?.includes('Cặp')
      );
      r1Candidates.forEach((m) => {
        addTeam(m.teamA, m.groupName || 'Toàn giải');
        addTeam(m.teamB, m.groupName || 'Toàn giải');
      });

      // 2. Then add any remaining real teams from all scopedMatches
      scopedMatches.forEach((m) => {
        addTeam(m.teamA, m.groupName || 'Toàn giải');
        addTeam(m.teamB, m.groupName || 'Toàn giải');
      });
    }

    // 3. Also include any registered teams for this sport when in combined view so no participating team is ever missing
    if ((result.length === 0 || viewMode === 'combined') && sportRegs.length > 0) {
      sportRegs.forEach((r) => {
        const label = r.className.trim();
        if (label && !seen.has(label)) {
          seen.add(label);
          result.push({
            name: label,
            emblem: r.emblem || getTeamEmblem(label, registrations),
            sub: r.subCategory || 'Chính thức'
          });
        }
      });
    }

    return result;
  }, [isTournamentCreated, scopedMatches, sportRegs, registrations, viewMode]);

  // Always reset to 'auto' (current tournament's exact teams) when tournament or matches change
  useEffect(() => {
    setSelectedFormat('auto');
    setViewMode('combined');
  }, [tournamentName, selectedSportId, matches.length]);

  // Determine target number of teams N to display in the single-branch left-to-right tree
  const targetTeamCount = useMemo(() => {
    if (selectedFormat === 'custom') return Math.max(2, Math.min(64, customTeamCount));

    // Always prioritize the exact number of teams in the current tournament / registrations
    const effectiveTournamentCount = viewMode === 'combined' && tournamentTeamsCount && tournamentTeamsCount >= 2
      ? tournamentTeamsCount
      : 0;

    if (extractedTeams.length >= 2 || effectiveTournamentCount >= 2) {
      return Math.max(extractedTeams.length, effectiveTournamentCount);
    }
    if (scopedMatches.length > 0) {
      const r1Count = scopedMatches.filter(
        (m) => m.stage === 'Vòng bảng' || m.stage === 'Tứ kết' || m.id.includes('R1')
      ).length;
      if (r1Count >= 2) return r1Count * 2;
    }
    return 8;
  }, [selectedFormat, customTeamCount, extractedTeams.length, scopedMatches, viewMode, tournamentTeamsCount]);

  const handleMatchClick = (m: Match) => {
    setSelectedMatchPreview(m);
    if (onOpenMatchEdit && isAdmin) {
      onOpenMatchEdit(m);
    }
  };

  const isSlotHighlighted = (teamName: string) => {
    if (!highlightQuery.trim() || !teamName || teamName === '---' || teamName.includes('Trống')) return false;
    return teamName.toLowerCase().includes(highlightQuery.toLowerCase().trim());
  };

  // =========================================================================
  // BUILD SINGLE-BRANCH LEFT-TO-RIGHT BRACKET TREE (VÒNG LOẠI ➔ CHUNG KẾT)
  // =========================================================================
  const bracketTree = useMemo(() => {
    const N = Math.max(2, targetTeamCount);
    const SLOT_TOP_OFFSET = 36;
    const SLOT_HEIGHT = 42;
    const SLOT_PITCH = 64;

    // 1. Build Column 0: N Team Slots on the Left
    const slots: BracketSlotNode[] = Array.from({ length: N }, (_, i) => {
      const realTeam = extractedTeams[i];
      const prefix = viewMode !== 'combined' && viewMode.startsWith('Bảng ')
        ? `${viewMode.replace('Bảng ', '')}${i + 1}`
        : `${i + 1}`;
      return {
        index: i,
        label: prefix,
        teamName: realTeam?.name || '',
        emblem: realTeam?.emblem || '',
        subLabel: realTeam?.sub || '',
        centerY: SLOT_TOP_OFFSET + i * SLOT_PITCH + SLOT_HEIGHT / 2
      };
    });

    // Calculate how many rounds are needed by pairing nodes 2-by-2 until 1 final match remains
    const roundCounts: number[] = [];
    let currentCount = N;
    while (currentCount > 1) {
      const nextCount = Math.ceil(currentCount / 2);
      roundCounts.push(nextCount);
      currentCount = nextCount;
    }
    const totalRounds = roundCounts.length; // e.g., N=16 -> [8, 4, 2, 1] (4 rounds); N=29 -> [15, 8, 4, 2, 1] (5 rounds)

    // Helper for naming each round based on distance from Final
    const getRoundMeta = (roundIdx: number, totalR: number) => {
      const distFromFinal = totalR - roundIdx; // 0 = Final, 1 = Semifinal, 2 = Quarterfinal, 3 = 1/8, 4 = 1/16, 5 = 1/32
      if (distFromFinal === 0) {
        return {
          headerTitle: '🏆 CHUNG KẾT & CÚP VÔ ĐỊCH',
          cardPrefix: 'CHUNG KẾT',
          winnerPrefix: 'Vô Địch'
        };
      }
      if (distFromFinal === 1) {
        return {
          headerTitle: 'VÒNG BÁN KẾT',
          cardPrefix: 'BÁN KẾT',
          winnerPrefix: 'Thắng BK'
        };
      }
      if (distFromFinal === 2) {
        return {
          headerTitle: 'VÒNG TỨ KẾT',
          cardPrefix: 'Tứ Kết',
          winnerPrefix: 'Thắng TK'
        };
      }
      if (distFromFinal === 3) {
        return {
          headerTitle: 'VÒNG 1/8',
          cardPrefix: 'Vòng 1/8',
          winnerPrefix: roundIdx === 1 ? 'Thắng R' : 'Thắng V1/8 '
        };
      }
      if (distFromFinal === 4) {
        return {
          headerTitle: 'VÒNG 1/16 (VÒNG LOẠI)',
          cardPrefix: 'Vòng 1/16',
          winnerPrefix: 'Thắng R'
        };
      }
      return {
        headerTitle: 'VÒNG 1/32 (SƠ LOẠI)',
        cardPrefix: 'Vòng 1/32',
        winnerPrefix: 'Thắng VL'
      };
    };

    // Organize actual matches from scopedMatches by stage so we can bind real scores & match objects
    const r1RealMatches = scopedMatches.filter(
      (m) =>
        m.stage === 'Vòng bảng' ||
        m.id.includes('R1') ||
        m.subCategory?.includes('Vòng Loại') ||
        m.subCategory?.includes('Vòng 1/16') ||
        m.subCategory?.includes('Vòng 1/8') ||
        m.subCategory?.includes('Cặp')
    );
    const qfRealMatches = scopedMatches.filter((m) => m.stage === 'Tứ kết');
    const sfRealMatches = scopedMatches.filter((m) => m.stage === 'Bán kết');
    const finRealMatches = scopedMatches.filter(
      (m) => m.stage === 'Chung kết' && !m.subCategory?.includes('Hạng 3')
    );

    const rounds: BracketMatchNode[][] = [];

    for (let r = 1; r <= totalRounds; r++) {
      const meta = getRoundMeta(r, totalRounds);
      const distFromFinal = totalRounds - r;
      const prevCount = r === 1 ? N : rounds[r - 2].length;
      const pairCount = Math.floor(prevCount / 2);
      const hasOddCarry = prevCount % 2 === 1;
      const currentNodes: BracketMatchNode[] = [];

      for (let mIdx = 0; mIdx < pairCount; mIdx++) {
        const topIndex = mIdx * 2;
        const botIndex = mIdx * 2 + 1;

        const sourceTopY = r === 1 ? slots[topIndex].centerY : rounds[r - 2][topIndex].centerY;
        const sourceBotY = r === 1 ? slots[botIndex].centerY : rounds[r - 2][botIndex].centerY;
        const centerY = (sourceTopY + sourceBotY) / 2;

        // Determine teamA and teamB names
        let teamA = '';
        let teamB = '';

        if (r === 1) {
          teamA = slots[topIndex].teamName || `Đội ${topIndex + 1}`;
          teamB = slots[botIndex].teamName || `Đội ${botIndex + 1}`;
        } else {
          const prevNodeA = rounds[r - 2][topIndex];
          const prevNodeB = rounds[r - 2][botIndex];

          const winnerA =
            prevNodeA.isBye
              ? prevNodeA.teamA
              : prevNodeA.status === 'Finished' &&
                prevNodeA.scoreA !== undefined &&
                prevNodeA.scoreB !== undefined
              ? prevNodeA.scoreA > prevNodeA.scoreB
                ? prevNodeA.teamA
                : prevNodeA.scoreB > prevNodeA.scoreA
                ? prevNodeA.teamB
                : prevNodeA.shortCode
              : prevNodeA.shortCode;

          const winnerB =
            prevNodeB.isBye
              ? prevNodeB.teamA
              : prevNodeB.status === 'Finished' &&
                prevNodeB.scoreA !== undefined &&
                prevNodeB.scoreB !== undefined
              ? prevNodeB.scoreA > prevNodeB.scoreB
                ? prevNodeB.teamA
                : prevNodeB.scoreB > prevNodeB.scoreA
                ? prevNodeB.teamB
                : prevNodeB.shortCode
              : prevNodeB.shortCode;

          teamA = winnerA;
          teamB = winnerB;
        }

        // Try to match with a real Match object from scopedMatches
        let matchedObj: Match | undefined;
        if (r === 1 && r1RealMatches[mIdx]) {
          matchedObj = r1RealMatches[mIdx];
        } else if (distFromFinal === 2 && qfRealMatches[mIdx]) {
          matchedObj = qfRealMatches[mIdx];
        } else if (distFromFinal === 1 && sfRealMatches[mIdx]) {
          matchedObj = sfRealMatches[mIdx];
        } else if (distFromFinal === 0 && finRealMatches[0]) {
          matchedObj = finRealMatches[finRealMatches.length - 1];
        } else {
          // Search by exact team names if both are real teams
          matchedObj = scopedMatches.find(
            (m) =>
              !isPlaceholderTeamName(teamA) &&
              !isPlaceholderTeamName(teamB) &&
              ((m.teamA === teamA && m.teamB === teamB) ||
                (m.teamA === teamB && m.teamB === teamA))
          );
        }

        const scoreA = matchedObj?.scoreA;
        const scoreB = matchedObj?.scoreB;
        const status = matchedObj?.status || 'Upcoming';

        const cardTitle =
          distFromFinal === 0
            ? 'CHUNG KẾT VÔ ĐỊCH'
            : distFromFinal === 1
            ? `BÁN KẾT ${mIdx + 1}`
            : distFromFinal === 2
            ? `Tứ Kết ${mIdx + 1}`
            : `${meta.cardPrefix} (${mIdx + 1})`;

        const shortCode =
          distFromFinal === 1
            ? `Thắng BK${mIdx + 1}`
            : distFromFinal === 2
            ? `Thắng TK${mIdx + 1}`
            : meta.winnerPrefix.endsWith(' ')
            ? `${meta.winnerPrefix}(${mIdx + 1})`
            : `${meta.winnerPrefix}${mIdx + 1}`;

        const fallbackMatchObj: Match = matchedObj || {
          id: `M-TREE-R${r}-${mIdx + 1}`,
          sportId: currentSport.id,
          subCategory: cardTitle,
          stage:
            distFromFinal === 0
              ? 'Chung kết'
              : distFromFinal === 1
              ? 'Bán kết'
              : distFromFinal === 2
              ? 'Tứ kết'
              : 'Vòng bảng',
          groupName: viewMode !== 'combined' ? viewMode : undefined,
          teamA,
          teamB,
          scoreA,
          scoreB,
          status,
          date: '2026-10-14',
          time: `${String(8 + r).padStart(2, '0')}:${mIdx % 2 === 0 ? '00' : '30'}`,
          venue: currentSport.venue
        };

        currentNodes.push({
          roundIndex: r,
          matchIndex: mIdx,
          title: cardTitle,
          shortCode,
          teamA,
          teamB,
          scoreA,
          scoreB,
          status,
          isBye: false,
          centerY,
          sourceTopY,
          sourceBotY,
          matchRef: {
            ...fallbackMatchObj,
            teamA,
            teamB
          }
        });
      }

      // Handle odd carryover node (Miễn đấu vòng này -> đi tiếp vào vòng sau)
      if (hasOddCarry) {
        const lastIdx = prevCount - 1;
        const sourceTopY = r === 1 ? slots[lastIdx].centerY : rounds[r - 2][lastIdx].centerY;
        const carryTeamName =
          r === 1
            ? slots[lastIdx].teamName || `Đội ${lastIdx + 1}`
            : rounds[r - 2][lastIdx].isBye
            ? rounds[r - 2][lastIdx].teamA
            : rounds[r - 2][lastIdx].status === 'Finished' &&
              rounds[r - 2][lastIdx].scoreA !== undefined &&
              rounds[r - 2][lastIdx].scoreB !== undefined
            ? rounds[r - 2][lastIdx].scoreA! > rounds[r - 2][lastIdx].scoreB!
              ? rounds[r - 2][lastIdx].teamA
              : rounds[r - 2][lastIdx].teamB
            : rounds[r - 2][lastIdx].shortCode;

        const mIdx = pairCount;
        const cardTitle = `${meta.cardPrefix} (${mIdx + 1})`;

        currentNodes.push({
          roundIndex: r,
          matchIndex: mIdx,
          title: cardTitle,
          shortCode: carryTeamName,
          teamA: carryTeamName,
          teamB: 'Miễn vòng',
          status: 'Finished',
          isBye: true,
          centerY: sourceTopY,
          sourceTopY
        });
      }

      rounds.push(currentNodes);
    }

    // 3rd Place Match (Tranh Hạng Ba) derived from Semifinal losers
    const semiRound = totalRounds >= 2 ? rounds[totalRounds - 2] : [];
    const sf1Node = semiRound[0];
    const sf2Node = semiRound[1];

    const getLoserLabel = (node?: BracketMatchNode, fallback = 'Thua Bán Kết') => {
      if (!node || node.isBye) return fallback;
      if (node.status === 'Finished' && node.scoreA !== undefined && node.scoreB !== undefined) {
        if (node.scoreA > node.scoreB) return node.teamB;
        if (node.scoreB > node.scoreA) return node.teamA;
      }
      return fallback;
    };

    const rawBronze = scopedMatches.find(
      (m) => m.stage === 'Trận Tranh Hạng 3' || m.subCategory?.includes('Hạng 3') || m.id.includes('BRONZE')
    );

    const bronzeMatch: Match = {
      ...(rawBronze || {
        id: 'M-TREE-BRONZE',
        sportId: currentSport.id,
        subCategory: 'Trận Tranh Hạng Ba Toàn Trường',
        stage: 'Trận Tranh Hạng 3',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '14:30',
        venue: currentSport.venue
      }),
      teamA: getLoserLabel(sf1Node, 'Thua Bán Kết 1'),
      teamB: getLoserLabel(sf2Node, 'Thua Bán Kết 2')
    };

    const roundHeaders = Array.from({ length: totalRounds }, (_, idx) =>
      getRoundMeta(idx + 1, totalRounds).headerTitle
    );

    const canvasHeight = Math.max(520, SLOT_TOP_OFFSET + N * SLOT_PITCH + 60);
    // Column coordinates:
    // Col 0 (Slots): left=30, width=210 (right=240)
    // Col r (1..totalRounds): left = 310 + (r - 1) * 275, width = 205 (or 250 for final column)
    const canvasWidth = Math.max(1220, 310 + (totalRounds - 1) * 275 + 260 + 40);

    return {
      slots,
      rounds,
      roundHeaders,
      totalRounds,
      bronzeMatch,
      canvasWidth,
      canvasHeight
    };
  }, [targetTeamCount, extractedTeams, viewMode, scopedMatches, currentSport]);

  const displayTournamentTitle = useMemo(() => {
    const raw = (tournamentName || `Giải ${currentSport.name} THPT Phú Lâm 2026`).trim();
    return raw
      .replace(/^sơ đồ(\s*thi đấu)?:\s*/i, '')
      .replace(/\s*\((bốc thăm[^)]*|loại trực tiếp[^)]*|\d+\s*bảng[^)]*)\)\s*$/i, '')
      .trim()
      .toUpperCase();
  }, [tournamentName, currentSport.name]);

  return (
    <div className="space-y-6 text-slate-900 select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL & ACTION TOOLBAR                                           */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-amber-400/90 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-amber-400 shadow-xs shrink-0 bg-white">
              <img
                src={SCHOOL_LOGO_DATA_URI}
                alt="Logo Trường THPT Phú Lâm"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              TRƯỜNG THPT PHÚ LÂM
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight uppercase">
            {displayTournamentTitle}
          </h2>
        </div>

        {/* Action Buttons & Zoom */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Quick Team Search / Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm lớp / VĐV (vd: 10A1)..."
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
              onClick={() => setZoomLevel(90)}
              title="Vừa màn hình (90%)"
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

      {/* Format Selector Bar & Custom Team Count (4 to 50+ Teams) */}
      <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {availableGroups.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-900" />
              <span>Phạm vi hiển thị:</span>
            </span>
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-300 flex-wrap">
              <button
                onClick={() => setViewMode('combined')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                  viewMode === 'combined' ? 'bg-blue-950 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                }`}
              >
                Toàn Giải (1 Nhánh)
              </button>
              {availableGroups.map((gName) => (
                <button
                  key={gName}
                  onClick={() => setViewMode(gName)}
                  className={`px-3 py-1.5 rounded-lg font-black transition-all ${
                    viewMode === gName ? 'bg-blue-950 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {gName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-900" />
            <span>Sơ đồ giải đấu (1 Nhánh Trái ➔ Phải):</span>
          </span>
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-300 flex-wrap">
            <button
              onClick={() => setSelectedFormat('auto')}
              className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                selectedFormat === 'auto'
                  ? 'bg-blue-950 text-amber-300 shadow-xs'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              ⚡ Theo giải vừa tạo ({extractedTeams.length >= 2 ? `${extractedTeams.length} đội` : `${targetTeamCount} đội`})
            </button>
          </div>

          {/* Custom Team Count Selector (4 to 64 Teams) */}
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl">
            <span className="font-bold text-blue-950 text-[11px]">Tự chọn số đội (4–64):</span>
            <select
              value={selectedFormat === 'custom' ? customTeamCount : targetTeamCount}
              onChange={(e) => {
                setCustomTeamCount(Number(e.target.value));
                setSelectedFormat('custom');
              }}
              className="bg-white border border-blue-300 text-blue-950 font-black text-xs px-2 py-1 rounded-lg outline-none cursor-pointer"
            >
              {Array.from({ length: 61 }, (_, idx) => idx + 4).map((num) => (
                <option key={num} value={num}>
                  {num} Đội ({num % 2 === 0 ? 'Chẵn' : 'Lẻ'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {!isTournamentCreated ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs shadow-sm">
          <div className="flex items-center gap-3 font-medium text-amber-950">
            <span className="flex items-center gap-1.5 font-bold text-amber-900 bg-amber-200 px-2.5 py-1 rounded-lg shrink-0">
              <Info className="w-4 h-4 text-amber-900" />
              <span>Sơ đồ mẫu 1 nhánh ({targetTeamCount} đội):</span>
            </span>
            <span>
              Các vị trí chưa có đội hiển thị <strong>--- (Trống) ---</strong> và nối vector trực tiếp từ Vòng loại đến Chung kết theo đúng mẫu chuẩn.
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
              <span>Sơ đồ 1 nhánh từ trái sang phải ({targetTeamCount} đội):</span>
            </span>
            <span>
              Hiển thị đầy đủ {targetTeamCount} đội từ cột bên trái, kết nối vector qua {bracketTree.totalRounds} vòng đấu thẳng tới Chung Kết & Cúp Vô Địch ở bên phải.
            </span>
          </div>
          <div className="flex items-center gap-1 text-blue-900 text-[11px] font-bold">
            <MoveHorizontal className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Cuộn ngang/dọc hoặc phóng to/thu nhỏ để xem toàn cảnh</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN SINGLE-BRANCH LEFT-TO-RIGHT TOURNAMENT DIAGRAM CANVAS             */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-b from-sky-200 via-sky-100 to-slate-100 rounded-3xl border-4 border-blue-900/30 shadow-2xl overflow-hidden p-3 sm:p-6 relative">
        <div className="overflow-x-auto horizontal-scroll-container pb-4">
          <div
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top left',
              width: `${bracketTree.canvasWidth}px`,
              minHeight: `${bracketTree.canvasHeight + 170}px`
            }}
            className="transition-transform duration-150 bg-white rounded-3xl border-2 border-blue-300 shadow-2xl p-6 relative"
          >
            {/* Header Banner */}
            <div className="relative mb-6 pb-4 border-b-2 border-blue-200">
              <div className="text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-amber-400 shadow-sm shrink-0 bg-white">
                    <img
                      src={SCHOOL_LOGO_DATA_URI}
                      alt="Logo Trường THPT Phú Lâm"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-sm sm:text-base font-black uppercase tracking-wider text-blue-900">
                    TRƯỜNG THPT PHÚ LÂM
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-blue-950 uppercase">
                  {displayTournamentTitle}
                </h1>
              </div>

              {/* Column Header Pills (Aligned Left-to-Right directly above each column) */}
              <div className="mt-5 relative h-9 text-xs font-black">
                {/* Col 0: Team Slots Header */}
                <div
                  style={{ position: 'absolute', left: '30px', width: '210px' }}
                  className="text-center"
                >
                  <span className="px-4 py-1.5 rounded-full bg-blue-950 text-white shadow border border-blue-800 uppercase tracking-wide block truncate">
                    DANH SÁCH ĐỘI ({targetTeamCount} ĐỘI)
                  </span>
                </div>

                {/* Col 1..R: Round Headers from Left to Right */}
                {bracketTree.roundHeaders.map((hTitle, idx) => {
                  const isFinalCol = idx === bracketTree.totalRounds - 1;
                  const colLeft = 310 + idx * 275;
                  const colWidth = isFinalCol ? 250 : 205;
                  return (
                    <div
                      key={`col-hdr-${idx}`}
                      style={{ position: 'absolute', left: `${colLeft}px`, width: `${colWidth}px` }}
                      className="text-center"
                    >
                      <span
                        className={`px-3.5 py-1.5 rounded-full shadow uppercase tracking-wide block truncate ${
                          isFinalCol
                            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-blue-950 font-black border-2 border-amber-300'
                            : idx === bracketTree.totalRounds - 2
                            ? 'bg-indigo-900 text-white border border-indigo-700'
                            : 'bg-blue-800 text-white border border-blue-600'
                        }`}
                      >
                        {hTitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* =================================================================== */}
            {/* SINGLE-BRANCH LEFT-TO-RIGHT BRACKET TREE CANVAS                     */}
            {/* =================================================================== */}
            <div
              style={{
                width: `${bracketTree.canvasWidth - 48}px`,
                height: `${bracketTree.canvasHeight}px`
              }}
              className="relative overflow-visible"
            >
              {/* SVG ORTHOGONAL VECTOR CONNECTORS WITH ARROWHEADS */}
              <svg
                width={bracketTree.canvasWidth - 48}
                height={bracketTree.canvasHeight}
                className="absolute inset-0 pointer-events-none z-0"
                style={{ shapeRendering: 'geometricPrecision' }}
              >
                <defs>
                  <marker
                    id="tree-arrow-blue"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#2563eb" />
                  </marker>
                  <marker
                    id="tree-arrow-indigo"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#4338ca" />
                  </marker>
                  <marker
                    id="tree-arrow-emerald"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#059669" />
                  </marker>
                  <marker
                    id="tree-arrow-gold"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#b45309" />
                  </marker>
                </defs>

                {/* Render orthogonal vector forks for every round r = 1..totalRounds */}
                {bracketTree.rounds.map((roundNodes, rIdx) => {
                  const r = rIdx + 1;
                  const isFinalRound = r === bracketTree.totalRounds;
                  const xPrevRight = r === 1 ? 240 : 310 + (r - 2) * 275 + 205;
                  const xCurrLeft = 310 + (r - 1) * 275;
                  const xMid = Math.round((xPrevRight + xCurrLeft) / 2);

                  const strokeColor = isFinalRound
                    ? '#b45309'
                    : r === 1
                    ? '#2563eb'
                    : '#4338ca';
                  const markerId = isFinalRound
                    ? 'url(#tree-arrow-gold)'
                    : r === 1
                    ? 'url(#tree-arrow-blue)'
                    : 'url(#tree-arrow-indigo)';

                  return roundNodes.map((node) => {
                    if (node.isBye || node.sourceBotY === undefined) {
                      // Single carryover / bye line
                      return (
                        <g key={`svg-r${r}-m${node.matchIndex}`}>
                          <path
                            d={`M ${xPrevRight} ${node.sourceTopY} H ${xCurrLeft - 2}`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth="6"
                            strokeLinecap="round"
                          />
                          <path
                            d={`M ${xPrevRight} ${node.sourceTopY} H ${xCurrLeft - 2}`}
                            fill="none"
                            stroke="#059669"
                            strokeWidth="2.8"
                            strokeDasharray="6 3"
                            strokeLinecap="round"
                            markerEnd="url(#tree-arrow-emerald)"
                          />
                        </g>
                      );
                    }

                    // Standard paired orthogonal bracket fork: top & bottom merge at xMid, then arrow to xCurrLeft
                    return (
                      <g key={`svg-r${r}-m${node.matchIndex}`}>
                        {/* White halo underlay */}
                        <path
                          d={`M ${xPrevRight} ${node.sourceTopY} H ${xMid} V ${node.sourceBotY} H ${xPrevRight} M ${xMid} ${node.centerY} H ${xCurrLeft - 2}`}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Orthogonal U-fork */}
                        <path
                          d={`M ${xPrevRight} ${node.sourceTopY} H ${xMid} V ${node.sourceBotY} H ${xPrevRight}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Horizontal stem with arrowhead pointing into match card */}
                        <path
                          d={`M ${xMid} ${node.centerY} H ${xCurrLeft - 2}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          markerEnd={markerId}
                        />
                        {/* Dashed branch to 3rd Place Match on the Final round */}
                        {isFinalRound && bracketTree.totalRounds >= 2 && (
                          <path
                            d={`M ${xMid} ${node.centerY} V ${node.centerY + 95} H ${xCurrLeft - 2}`}
                            fill="none"
                            stroke="#d97706"
                            strokeWidth="2.2"
                            strokeDasharray="4 4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </g>
                    );
                  });
                })}
              </svg>

              {/* ------------------------------------------------------------- */}
              {/* COLUMN 0: TEAM SLOTS ON THE FAR LEFT (left: 30px, width: 210px) */}
              {/* ------------------------------------------------------------- */}
              {bracketTree.slots.map((slot) => {
                const isHl = isSlotHighlighted(slot.teamName);
                const hasTeam = Boolean(slot.teamName);
                return (
                  <div
                    key={`tree-slot-${slot.index}`}
                    style={{
                      position: 'absolute',
                      left: '30px',
                      top: `${slot.centerY - 21}px`,
                      width: '210px',
                      height: '42px'
                    }}
                    className={`flex items-center rounded-2xl border-2 px-2.5 gap-2.5 transition-all z-10 overflow-hidden ${
                      isHl
                        ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-400 scale-105 shadow-md'
                        : hasTeam
                        ? 'bg-white border-blue-400 hover:border-blue-700 shadow-sm hover:shadow-md'
                        : 'bg-slate-50/90 border-dashed border-slate-300 text-slate-500 shadow-2xs'
                    }`}
                    title={
                      hasTeam
                        ? `Vị trí ${slot.label}: ${slot.teamName}`
                        : `Vị trí ${slot.label}: --- (Trống) ---`
                    }
                  >
                    <span className="w-7 h-7 rounded-full bg-blue-950 text-white text-xs font-black flex items-center justify-center shrink-0 font-mono shadow-xs">
                      {slot.label}
                    </span>
                    {hasTeam ? (
                      <div className="flex items-center gap-1.5 truncate w-full text-xs">
                        {slot.emblem && <span className="text-sm shrink-0">{slot.emblem}</span>}
                        <span className="font-bold text-blue-950 truncate">{slot.teamName}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500 font-mono tracking-tight truncate">
                        --- (Trống) ---
                      </span>
                    )}
                  </div>
                );
              })}

              {/* ------------------------------------------------------------- */}
              {/* COLUMNS 1..R: MATCH CARDS FROM LEFT TO RIGHT                  */}
              {/* ------------------------------------------------------------- */}
              {bracketTree.rounds.map((roundNodes, rIdx) => {
                const r = rIdx + 1;
                const isFinalRound = r === bracketTree.totalRounds;
                const isSemiRound = r === bracketTree.totalRounds - 1;
                const colLeft = 310 + (r - 1) * 275;

                if (isFinalRound) {
                  const finalNode = roundNodes[0];
                  if (!finalNode) return null;
                  const isFinished =
                    finalNode.status === 'Finished' &&
                    finalNode.scoreA !== undefined &&
                    finalNode.scoreB !== undefined;

                  return (
                    <React.Fragment key={`round-final-${r}`}>
                      {/* Golden Trophy Above Final Card */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${colLeft}px`,
                          top: `${Math.max(4, finalNode.centerY - 122)}px`,
                          width: '250px'
                        }}
                        className="flex flex-col items-center justify-center z-20 pointer-events-none"
                      >
                        <div className="w-14 h-14 flex items-center justify-center">
                          <Trophy className="w-12 h-12 text-amber-500 filter drop-shadow-md" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest text-amber-800 bg-amber-100/90 px-3 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                          CÚP VÔ ĐỊCH 🏆
                        </span>
                      </div>

                      {/* Grand Final Match Card (Centered at finalNode.centerY) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${colLeft}px`,
                          top: `${finalNode.centerY - 38}px`,
                          width: '250px',
                          height: '76px'
                        }}
                        onClick={() => finalNode.matchRef && handleMatchClick(finalNode.matchRef)}
                        className="bg-gradient-to-b from-red-600 via-red-700 to-red-800 text-white rounded-2xl p-3 border-2 border-amber-300 shadow-2xl flex flex-col justify-between cursor-pointer hover:scale-105 transition-all z-20"
                        title={finalNode.title}
                      >
                        <div className="flex items-center justify-between border-b border-red-400/60 pb-1">
                          <span className="font-black text-xs uppercase tracking-wider text-amber-200">
                            🏆 {finalNode.title}
                          </span>
                          {isFinished && (
                            <span className="bg-amber-300 text-blue-950 font-mono font-black text-[10px] px-1.5 py-0.2 rounded">
                              {finalNode.scoreA}:{finalNode.scoreB}
                            </span>
                          )}
                        </div>
                        <div className="h-6" />
                      </div>

                      {/* 3rd Place Match Card Below Final */}
                      {bracketTree.totalRounds >= 2 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${colLeft}px`,
                            top: `${finalNode.centerY + 60}px`,
                            width: '250px',
                            height: '68px'
                          }}
                          onClick={() => handleMatchClick(bracketTree.bronzeMatch)}
                          className="bg-white rounded-2xl p-2.5 border-2 border-amber-500 shadow-lg flex flex-col justify-between cursor-pointer hover:scale-105 transition-all z-20"
                          title="Tranh Hạng Ba"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                            <span className="font-black text-[11px] uppercase tracking-wider text-amber-800">
                              TRANH HẠNG BA 🥉
                            </span>
                            {bracketTree.bronzeMatch.status === 'Finished' &&
                              bracketTree.bronzeMatch.scoreA !== undefined &&
                              bracketTree.bronzeMatch.scoreB !== undefined && (
                                <span className="bg-amber-100 text-amber-900 font-mono font-black text-[10px] px-1.5 rounded">
                                  {bracketTree.bronzeMatch.scoreA}:{bracketTree.bronzeMatch.scoreB}
                                </span>
                              )}
                          </div>
                          <div className="h-5" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                // Regular Round Columns (Vòng 1/16, Vòng 1/8, Tứ Kết, Bán Kết)
                return roundNodes.map((node) => {
                  const isFinished =
                    !node.isBye &&
                    node.status === 'Finished' &&
                    node.scoreA !== undefined &&
                    node.scoreB !== undefined;
                  const isLive = !node.isBye && node.status === 'Live';

                  return (
                    <div
                      key={`card-r${r}-m${node.matchIndex}`}
                      style={{
                        position: 'absolute',
                        left: `${colLeft}px`,
                        top: `${node.centerY - 31}px`,
                        width: '205px',
                        height: '62px'
                      }}
                      onClick={() => node.matchRef && handleMatchClick(node.matchRef)}
                      className={`rounded-2xl border-2 px-3 py-2 flex flex-col justify-between transition-all z-10 ${
                        node.isBye
                          ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 shadow-sm'
                          : isSemiRound
                          ? 'bg-indigo-50/80 border-indigo-600 hover:border-indigo-900 shadow-md hover:shadow-lg cursor-pointer'
                          : r === 1
                          ? 'bg-white border-blue-500 hover:border-blue-800 shadow-md hover:shadow-lg cursor-pointer'
                          : 'bg-white border-indigo-500 hover:border-indigo-800 shadow-md hover:shadow-lg cursor-pointer'
                      }`}
                      title={node.title}
                    >
                      {/* Match Card Top Title + Horizontal Divider Line */}
                      <div className="flex items-center justify-between border-b border-blue-950/20 pb-1">
                        <span
                          className={`text-[11px] font-black tracking-tight truncate ${
                            node.isBye
                              ? 'text-emerald-900'
                              : isSemiRound
                              ? 'text-indigo-950 uppercase'
                              : 'text-blue-950'
                          }`}
                        >
                          {node.title}
                        </span>
                        {isFinished ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-black shrink-0">
                            {node.scoreA}:{node.scoreB}
                          </span>
                        ) : isLive ? (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded font-black animate-pulse shrink-0">
                            LIVE
                          </span>
                        ) : null}
                      </div>

                      {/* Match Card Bottom Result Line (Always left blank to record match result) */}
                      <div className="h-5" />
                    </div>
                  );
                });
              })}
            </div>

            {/* Bottom Footer Info on Diagram */}
            <div className="mt-8 pt-3 border-t border-blue-200 flex flex-wrap items-center justify-between gap-4 text-xs text-blue-950 font-bold">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-400 shrink-0">
                  <img src={SCHOOL_LOGO_DATA_URI} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span>Trường THPT Phú Lâm · Ban Tổ Chức Hội Thao Thể Thao Học Đường</span>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-slate-700">
                <span>
                  Quy mô sơ đồ:{' '}
                  <strong className="text-blue-950 font-black">
                    {targetTeamCount} đội · Sơ đồ 1 nhánh từ Vòng loại đến Chung kết ({bracketTree.totalRounds} vòng)
                  </strong>
                </span>
                <span>
                  Trạng thái:{' '}
                  <strong className={isTournamentCreated ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>
                    {isTournamentCreated ? 'Đã cập nhật danh sách đội & cặp đấu' : 'Sơ đồ mẫu (Đang chờ xếp đội)'}
                  </strong>
                </span>
                <span>
                  Địa điểm: <strong className="text-blue-950 font-black">{currentSport.venue}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS: MATCH DETAIL & PRINT MODAL                                      */}
      {/* ========================================================================= */}
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
              <span>
                Trạng thái:{' '}
                <strong>
                  {selectedMatchPreview.status === 'Finished'
                    ? 'Đã kết thúc'
                    : selectedMatchPreview.status === 'Live'
                    ? 'Đang diễn ra'
                    : 'Sắp diễn ra'}
                </strong>
              </span>
              <span>{selectedMatchPreview.time || '--:--'}</span>
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
          matches={scopedMatches}
          sports={sports}
          registrations={registrations}
          selectedSportId={selectedSportId}
          onClose={() => setIsPrintModalOpen(false)}
          tournamentName={
            viewMode !== 'combined' && tournamentName
              ? `${tournamentName} - ${viewMode}`
              : tournamentName
          }
          tournamentTeamsCount={viewMode === 'combined' ? targetTeamCount : undefined}
        />
      )}
    </div>
  );
};
