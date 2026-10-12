import React, { useState, useEffect, useMemo } from 'react';
import { SportCategory, Registration, Match, SportId } from '../types/sports';
import { 
  Shuffle, Trophy, Sparkles, CheckCircle2, RotateCcw, ArrowRight, 
  Layers, GitBranch, Play, Flame, RefreshCw, X, Shield, Star, 
  Award, Check, AlertCircle, Dices, ChevronRight, Zap, Users, Edit3, Printer
} from 'lucide-react';
import { PrintBracketModal } from './PrintBracketModal';
import { OFFICIAL_20_CLASSES, getTeamEmblem } from '../data/mockSportsData';

interface InteractiveBracketDrawProps {
  sports: SportCategory[];
  registrations: Registration[];
  selectedSportId?: SportId;
  onApplyMatches: (matches: Match[]) => void;
  onClose?: () => void;
  subCategory?: string;
  venue?: string;
  startDate?: string;
  numGroupsDefault?: number;
  onAddTeamsClick?: () => void;
}

export interface BracketSlot {
  slotId: string; // e.g. "A1", "A2", ..., "A10", "B1", ..., "B10"
  groupName: string; // "Bảng A", "Bảng B"
  label: string; // "Vị trí A1", "Hạt giống 1 Bảng A"
  assignedTeam: string | null;
  matchStage: 'Bán kết' | 'Tứ kết' | 'Vòng bảng';
  pairMatchIndex: number; // 1, 2, 3, 4, 5
  slotIndexInGroup: number; // 1 to 10
}

export const InteractiveBracketDraw: React.FC<InteractiveBracketDrawProps> = ({
  sports,
  registrations,
  selectedSportId: initialSportId = 'basketball',
  onApplyMatches,
  onClose,
  subCategory: propSubCategory,
  venue: propVenue,
  startDate: propStartDate = '2026-10-12',
  numGroupsDefault = 2,
  onAddTeamsClick
}) => {
  const [sportId, setSportId] = useState<SportId>(initialSportId);
  const [numGroups, setNumGroups] = useState<number>(numGroupsDefault);
  const [selectedBranchGroup, setSelectedBranchGroup] = useState<string>('all'); // 'all' or 'Bảng A', 'Bảng B'...
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Get active sport
  const currentSport = sports.find((s) => s.id === sportId) || sports[0];
  const subCategory = propSubCategory || currentSport?.subCategories[0] || 'Chính thức';
  const venue = propVenue || currentSport?.venue || 'Sân Đa Năng THPT Phú Lâm';

  // Group letters: A, B, C, D, E, F, G, H
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const activeGroupNames = useMemo(() => {
    return groupLetters.slice(0, numGroups).map((l) => `Bảng ${l}`);
  }, [numGroups]);

  // List of candidate teams available for draw: strictly from user-created registrations
  const candidateTeams = useMemo(() => {
    const sportRegs = registrations
      .filter((r) => r.sportId === sportId)
      .map((r) => r.className);

    return Array.from(new Set(sportRegs));
  }, [registrations, sportId]);

  // ==============================================================
  // GROUP TEAM POOLS: Each group has its OWN dedicated list of teams!
  // E.g. Bảng A has teams, Bảng B has teams.
  // When drawing for Bảng A, we ONLY pick from Bảng A's pool!
  // ==============================================================
  const initializeGroupPools = (): Record<string, string[]> => {
    const pools: Record<string, string[]> = {};
    activeGroupNames.forEach((gn) => (pools[gn] = []));

    const totalTeams = candidateTeams;

    if (totalTeams.length === 0) {
      return pools;
    }

    if (numGroups === 2) {
      // For 2 groups: distribute evenly between Bảng A and Bảng B
      const mid = Math.ceil(totalTeams.length / 2);
      pools['Bảng A'] = totalTeams.slice(0, mid);
      pools['Bảng B'] = totalTeams.slice(mid);
    } else {
      // For 3, 4, 5, 6, 7, 8 groups: distribute evenly
      totalTeams.forEach((team, idx) => {
        const gName = activeGroupNames[idx % activeGroupNames.length];
        pools[gName].push(team);
      });
    }

    return pools;
  };

  const [groupPools, setGroupPools] = useState<Record<string, string[]>>(initializeGroupPools);

  // When numGroups or candidateTeams changes, refresh group pools
  useEffect(() => {
    setGroupPools(initializeGroupPools());
  }, [numGroups, candidateTeams.length]);

  // Shuffle pools between groups
  const handleShuffleGroupPools = () => {
    const totalTeams = [...candidateTeams].sort(() => Math.random() - 0.5);
    const pools: Record<string, string[]> = {};
    activeGroupNames.forEach((gn) => (pools[gn] = []));

    if (numGroups === 2) {
      const mid = Math.ceil(totalTeams.length / 2);
      pools['Bảng A'] = totalTeams.slice(0, mid);
      pools['Bảng B'] = totalTeams.slice(mid);
    } else {
      totalTeams.forEach((team, idx) => {
        const gName = activeGroupNames[idx % activeGroupNames.length];
        pools[gName].push(team);
      });
    }

    setGroupPools(pools);
    setBracketSlots(initializeSlots());
  };

  // Calculate dynamic slots per group based on team count in that group
  const getSlotsCountForGroup = (gName: string): number => {
    const pool = groupPools[gName] || [];
    return Math.max(4, pool.length);
  };

  // Initial slot structure generator for each group
  const initializeSlots = (): BracketSlot[] => {
    const slots: BracketSlot[] = [];
    const groupsToGen = groupLetters.slice(0, numGroups).map((l) => `Bảng ${l}`);

    groupsToGen.forEach((gName) => {
      const gLetter = gName.replace('Bảng ', '');
      const pool = groupPools[gName] || [];
      const slotsCount = Math.max(4, pool.length > 0 ? pool.length : (numGroups === 2 ? 10 : Math.ceil(candidateTeams.length / numGroups)));

      for (let i = 1; i <= slotsCount; i++) {
        const pairMatchIdx = Math.ceil(i / 2);
        slots.push({
          slotId: `${gLetter}${i}`,
          groupName: gName,
          label: `Vị trí ${gLetter}${i}`,
          assignedTeam: null,
          matchStage: slotsCount > 4 ? 'Vòng bảng' : 'Bán kết',
          pairMatchIndex: pairMatchIdx,
          slotIndexInGroup: i
        });
      }
    });

    return slots;
  };

  const [bracketSlots, setBracketSlots] = useState<BracketSlot[]>(initializeSlots);

  // When numGroups or candidateTeams changes, re-initialize slots
  useEffect(() => {
    setBracketSlots(initializeSlots());
  }, [numGroups, candidateTeams.length, groupPools]);

  // Track which teams have already been assigned to any slot in each group
  const getAssignedTeamsInGroup = (gName: string): Set<string> => {
    const set = new Set<string>();
    bracketSlots
      .filter((s) => s.groupName === gName && s.assignedTeam)
      .forEach((s) => set.add(s.assignedTeam!));
    return set;
  };

  // Get available unassigned teams for a specific group
  const getUnassignedTeamsForGroup = (gName: string): string[] => {
    const pool = groupPools[gName] || [];
    const assigned = getAssignedTeamsInGroup(gName);
    return pool.filter((t) => !assigned.has(t));
  };

  // ==============================================================
  // ROULETTE / SLOT MACHINE SPINNER STATE
  // ==============================================================
  const [activeSpinSlot, setActiveSpinSlot] = useState<BracketSlot | null>(null);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinningDisplayText, setSpinningDisplayText] = useState<string>('---');
  const [drawnWinner, setDrawnWinner] = useState<string | null>(null);
  const [isAutoSpinningAll, setIsAutoSpinningAll] = useState<boolean>(false);
  const [isAutoSpinningGroup, setIsAutoSpinningGroup] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Handle clicking a slot on the bracket tree diagram
  const handleSlotClick = (slot: BracketSlot) => {
    if (isSpinning || isAutoSpinningAll || isAutoSpinningGroup) return;
    setActiveSpinSlot(slot);
    setDrawnWinner(null);
    setSpinningDisplayText(slot.assignedTeam ? `Lớp ${slot.assignedTeam}` : 'Nhấn Bắt Đầu Quay');
  };

  // TRIGGER SPINNING WHEEL: ONLY DRAWS FROM THE CURRENT GROUP'S POOL!
  const triggerSpinForSlot = (targetSlot: BracketSlot) => {
    const groupName = targetSlot.groupName;
    const groupPool = groupPools[groupName] || [];
    const assignedInGroup = getAssignedTeamsInGroup(groupName);

    // Filter: ONLY teams belonging to THIS specific group pool that are not yet assigned!
    const availableInGroup = groupPool.filter(
      (t) => !assignedInGroup.has(t) || t === targetSlot.assignedTeam
    );

    if (availableInGroup.length === 0) {
      alert(`Đã bốc thăm hết toàn bộ đội trong danh sách của ${groupName}!`);
      return;
    }

    setIsSpinning(true);
    setDrawnWinner(null);

    let speed = 40;
    let iterations = 0;
    const maxIterations = 24 + Math.floor(Math.random() * 8);
    const chosenWinner = availableInGroup[Math.floor(Math.random() * availableInGroup.length)];

    const spinInterval = setInterval(() => {
      iterations++;
      const randomDisplay = availableInGroup[Math.floor(Math.random() * availableInGroup.length)];
      setSpinningDisplayText(randomDisplay);

      if (iterations >= maxIterations) {
        clearInterval(spinInterval);
        setSpinningDisplayText(`Lớp ${chosenWinner}`);
        setDrawnWinner(chosenWinner);
        setIsSpinning(false);

        // Assign to slot
        setBracketSlots((prev) =>
          prev.map((s) => (s.slotId === targetSlot.slotId ? { ...s, assignedTeam: chosenWinner } : s))
        );
      }
    }, speed);
  };

  // Auto spin for a SPECIFIC group only (e.g. Bảng A only from Bảng A pool)
  const handleAutoSpinSingleGroup = async (gName: string) => {
    if (isSpinning || isAutoSpinningAll || isAutoSpinningGroup) return;
    setIsAutoSpinningGroup(gName);

    const emptySlots = bracketSlots.filter((s) => s.groupName === gName && !s.assignedTeam);
    if (emptySlots.length === 0) {
      alert(`Tất cả các vị trí trong ${gName} đã được bốc thăm đầy đủ!`);
      setIsAutoSpinningGroup(null);
      return;
    }

    const unassignedInGroup = getUnassignedTeamsForGroup(gName).sort(() => Math.random() - 0.5);
    let currentSlots = [...bracketSlots];

    for (let i = 0; i < emptySlots.length; i++) {
      const slot = emptySlots[i];
      const assigned = unassignedInGroup[i] || (groupPools[gName] && groupPools[gName][i % groupPools[gName].length]);

      if (assigned) {
        setActiveSpinSlot(slot);
        setSpinningDisplayText(`Lớp ${assigned}`);
        setDrawnWinner(assigned);

        currentSlots = currentSlots.map((s) =>
          s.slotId === slot.slotId ? { ...s, assignedTeam: assigned } : s
        );
        setBracketSlots([...currentSlots]);

        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    }

    setIsAutoSpinningGroup(null);
    setActiveSpinSlot(null);
  };

  // Auto spin all remaining empty slots across ALL groups (each group strictly from its own pool!)
  const handleAutoSpinAll = async () => {
    if (isSpinning || isAutoSpinningAll || isAutoSpinningGroup) return;
    setIsAutoSpinningAll(true);

    let currentSlots = [...bracketSlots];

    for (const gName of activeGroupNames) {
      const emptySlots = currentSlots.filter((s) => s.groupName === gName && !s.assignedTeam);
      const unassignedInGroup = (groupPools[gName] || [])
        .filter((t) => !currentSlots.some((s) => s.groupName === gName && s.assignedTeam === t))
        .sort(() => Math.random() - 0.5);

      for (let i = 0; i < emptySlots.length; i++) {
        const slot = emptySlots[i];
        const assigned = unassignedInGroup[i] || (groupPools[gName] && groupPools[gName][i % groupPools[gName].length]);

        if (assigned) {
          setActiveSpinSlot(slot);
          setSpinningDisplayText(`Lớp ${assigned}`);
          setDrawnWinner(assigned);

          currentSlots = currentSlots.map((s) =>
            s.slotId === slot.slotId ? { ...s, assignedTeam: assigned } : s
          );
          setBracketSlots([...currentSlots]);

          await new Promise((resolve) => setTimeout(resolve, 140));
        }
      }
    }

    setIsAutoSpinningAll(false);
    setActiveSpinSlot(null);
  };

  // Reset entire draw
  const handleResetDraw = () => {
    setBracketSlots(initializeSlots());
    setActiveSpinSlot(null);
    setDrawnWinner(null);
    setAppliedSuccess(false);
  };

  // Convert drawn bracket slots into official Tournament Matches & Schedule with NO MISSING PAIRS!
  const handleConfirmAndApplyMatches = () => {
    const timestamp = Date.now().toString().slice(-4);
    const generatedMatches: Match[] = [];

    // Group the slots by Group Name
    const groupSlotMap: Record<string, BracketSlot[]> = {};
    activeGroupNames.forEach((gn) => (groupSlotMap[gn] = []));
    bracketSlots.forEach((s) => {
      if (groupSlotMap[s.groupName]) {
        groupSlotMap[s.groupName].push(s);
      }
    });

    // 1. Generate matches for each group branch (e.g. 10 teams in Bảng A -> 5 pairs, 10 teams in Bảng B -> 5 pairs)
    Object.entries(groupSlotMap).forEach(([gName, sList], gIdx) => {
      const sortedSlots = [...sList].sort((a, b) => a.slotIndexInGroup - b.slotIndexInGroup);
      const totalInGroup = sortedSlots.length;

      // First round matches: pair consecutive slots (1 vs 2, 3 vs 4, 5 vs 6, 7 vs 8, 9 vs 10...)
      const pairCount = Math.floor(totalInGroup / 2);
      for (let p = 0; p < pairCount; p++) {
        const teamA = sortedSlots[p * 2]?.assignedTeam || `Vị trí ${gName.replace('Bảng ', '')}${p * 2 + 1}`;
        const teamB = sortedSlots[p * 2 + 1]?.assignedTeam || `Vị trí ${gName.replace('Bảng ', '')}${p * 2 + 2}`;
        const matchNum = p + 1;
        const matchHour = 8 + gIdx + Math.floor(p / 3);
        const matchMin = (p % 3) * 30;

        generatedMatches.push({
          id: `M-BR-${timestamp}-${gIdx}-R1-${matchNum}`,
          sportId,
          subCategory: `${subCategory} - Vòng Loại ${gName}`,
          stage: totalInGroup > 4 ? 'Vòng bảng' : 'Bán kết',
          groupName: gName,
          teamA,
          teamB,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(matchHour).padStart(2, '0')}:${String(matchMin).padStart(2, '0')}`,
          venue
        });
      }

      // If odd number (e.g. 5 teams), add match for remaining team
      if (totalInGroup % 2 === 1) {
        const teamRemaining = sortedSlots[totalInGroup - 1]?.assignedTeam || `Vị trí ${gName.replace('Bảng ', '')}${totalInGroup}`;
        generatedMatches.push({
          id: `M-BR-${timestamp}-${gIdx}-R1-EXTRA`,
          sportId,
          subCategory: `${subCategory} - Suất Vòng Bảng ${gName}`,
          stage: 'Vòng bảng',
          groupName: gName,
          teamA: teamRemaining,
          teamB: `Đội Đấu Vòng Loại ${gName}`,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(8 + gIdx + 2).padStart(2, '0')}:30`,
          venue
        });
      }

      // Bán kết 1 của Bảng
      generatedMatches.push({
        id: `M-BR-${timestamp}-${gIdx}-SF1`,
        sportId,
        subCategory: `${subCategory} - Bán Kết 1 ${gName}`,
        stage: 'Bán kết',
        groupName: gName,
        teamA: totalInGroup >= 4 ? `Thắng Trận 1 ${gName}` : (sortedSlots[0]?.assignedTeam || `Hạt giống ${gName} 1`),
        teamB: totalInGroup >= 4 ? `Thắng Trận 2 ${gName}` : (sortedSlots[1]?.assignedTeam || `Hạt giống ${gName} 2`),
        status: 'Upcoming',
        date: '2026-10-13',
        time: `${String(8 + gIdx).padStart(2, '0')}:00`,
        venue
      });

      // Bán kết 2 của Bảng
      generatedMatches.push({
        id: `M-BR-${timestamp}-${gIdx}-SF2`,
        sportId,
        subCategory: `${subCategory} - Bán Kết 2 ${gName}`,
        stage: 'Bán kết',
        groupName: gName,
        teamA: totalInGroup >= 4 ? `Thắng Trận 3 ${gName}` : (sortedSlots[2]?.assignedTeam || `Hạt giống ${gName} 3`),
        teamB: totalInGroup >= 4 ? `Thắng Trận 4 ${gName}` : (sortedSlots[3]?.assignedTeam || `Hạt giống ${gName} 4`),
        status: 'Upcoming',
        date: '2026-10-13',
        time: `${String(8 + gIdx).padStart(2, '0')}:45`,
        venue
      });

      // Chung kết của Bảng (Tranh Nhất Bảng)
      generatedMatches.push({
        id: `M-BR-${timestamp}-${gIdx}-FIN`,
        sportId,
        subCategory: `${subCategory} - Chung Kết ${gName}`,
        stage: 'Chung kết',
        groupName: gName,
        teamA: `Thắng Bán Kết 1 ${gName}`,
        teamB: `Thắng Bán Kết 2 ${gName}`,
        status: 'Upcoming',
        date: '2026-10-14',
        time: `${String(14 + gIdx).padStart(2, '0')}:00`,
        venue
      });
    });

    // 2. Grand Final Toàn Trường between group winners
    if (numGroups === 2) {
      // 2 Groups -> Grand Final & 3rd Place Match
      generatedMatches.push({
        id: `M-BR-${timestamp}-GRAND-FINAL`,
        sportId,
        subCategory: `${subCategory} - Chung Kết Tranh Cúp Vàng Toàn Trường`,
        stage: 'Chung kết',
        teamA: 'Nhất Bảng A',
        teamB: 'Nhất Bảng B',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '16:00',
        venue
      });
      generatedMatches.push({
        id: `M-BR-${timestamp}-GRAND-BRONZE`,
        sportId,
        subCategory: `${subCategory} - Tranh Huy Chương Đồng Toàn Trường`,
        stage: 'Trận Tranh Hạng 3',
        teamA: 'Nhì Bảng A',
        teamB: 'Nhì Bảng B',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '14:30',
        venue
      });
    } else {
      // 4 or more groups -> Semifinals Toàn Trường -> Grand Final
      generatedMatches.push({
        id: `M-BR-${timestamp}-ALL-SF1`,
        sportId,
        subCategory: `${subCategory} - Bán Kết Toàn Trường 1`,
        stage: 'Bán kết',
        teamA: 'Nhất Bảng A',
        teamB: 'Nhất Bảng B',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '08:30',
        venue
      });
      generatedMatches.push({
        id: `M-BR-${timestamp}-ALL-SF2`,
        sportId,
        subCategory: `${subCategory} - Bán Kết Toàn Trường 2`,
        stage: 'Bán kết',
        teamA: 'Nhất Bảng C',
        teamB: numGroups >= 4 ? 'Nhất Bảng D' : 'Nhất Bảng C',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '09:30',
        venue
      });
      generatedMatches.push({
        id: `M-BR-${timestamp}-GRAND-BRONZE`,
        sportId,
        subCategory: `${subCategory} - Tranh Huy Chương Đồng`,
        stage: 'Trận Tranh Hạng 3',
        teamA: 'Thua Bán Kết Toàn Trường 1',
        teamB: 'Thua Bán Kết Toàn Trường 2',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '14:30',
        venue
      });
      generatedMatches.push({
        id: `M-BR-${timestamp}-GRAND-FINAL`,
        sportId,
        subCategory: `${subCategory} - Chung Kết Vô Địch Toàn Trường`,
        stage: 'Chung kết',
        teamA: 'Thắng Bán Kết Toàn Trường 1',
        teamB: 'Thắng Bán Kết Toàn Trường 2',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '16:00',
        venue
      });
    }

    onApplyMatches(generatedMatches);
    setAppliedSuccess(true);
  };

  const previewMatchesFromSlots = useMemo(() => {
    const list: Match[] = [];
    activeGroupNames.forEach((gName, gIdx) => {
      const gSlots = bracketSlots.filter((s) => s.groupName === gName);
      const pairCount = Math.floor(gSlots.length / 2);
      for (let pIdx = 0; pIdx < pairCount; pIdx++) {
        const slotA = gSlots[pIdx * 2];
        const slotB = gSlots[pIdx * 2 + 1];
        list.push({
          id: `M-PREV-${gIdx}-R1-${pIdx + 1}`,
          sportId,
          subCategory: `${subCategory} - Cặp ${pIdx + 1} (${gName})`,
          stage: 'Vòng bảng',
          groupName: gName,
          teamA: slotA?.assignedTeam || `Vị trí ${slotA?.slotId || 'A'}`,
          teamB: slotB?.assignedTeam || `Vị trí ${slotB?.slotId || 'B'}`,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(8 + pIdx).padStart(2, '0')}:00`,
          venue
        });
      }
    });
    return list;
  }, [bracketSlots, activeGroupNames, sportId, subCategory, propStartDate, venue]);

  const totalFilled = bracketSlots.filter((s) => s.assignedTeam).length;
  const totalSlots = bracketSlots.length;

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-2xl p-6 sm:p-8 space-y-7 text-slate-900">
      
      {/* Royal Blue Floating Header Bar */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 border-4 border-amber-400/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30 mb-2">
            <Shuffle className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Bốc Thăm Chuẩn Xác: Quay Đội Nào Thuộc Đúng Bảng Đó</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-sans font-bold tracking-tight text-white flex items-center gap-2">
            <span>Bốc Thăm Quay Vị Trí Theo Từng Bảng</span>
            <span className="text-amber-400 text-xl font-mono">
              ({numGroups} Bảng Đấu)
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-3xl">
            Khi nhấn quay vị trí của bảng nào (ví dụ Bảng A), hệ thống sẽ <strong>chỉ bốc thăm ngẫu nhiên trong danh sách các đội thuộc bảng đó</strong>, không bị lẫn sang bảng khác!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs rounded-xl shadow-lg border border-amber-300 transition-all flex items-center gap-2 cursor-pointer"
            title="In sơ đồ nhánh thi đấu dạng biểu đồ chuẩn A4"
          >
            <Printer className="w-4 h-4 text-blue-950" />
            <span>In Sơ Đồ Trận Đấu</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-900/80 hover:bg-blue-800 text-white font-bold text-xs rounded-xl border border-blue-700 shadow"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      {/* Warning banner when not enough manual teams */}
      {candidateTeams.length < 2 && (
        <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-950 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h4 className="font-bold text-sm text-amber-900">Chế độ tạo thủ công: Môn này hiện có {candidateTeams.length} đội tham gia</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Bạn cần tạo tối thiểu 2 đội để bắt đầu phân bảng và bốc thăm sơ đồ nhánh. Vui lòng bấm &quot;Thêm Đội Thủ Công&quot; để bổ sung các đội vào danh sách.
              </p>
            </div>
          </div>
          {onAddTeamsClick && (
            <button
              type="button"
              onClick={onAddTeamsClick}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              <span>+ Thêm Đội Thủ Công Ngay</span>
            </button>
          )}
        </div>
      )}

      {/* Control Bar: Sport Picker, Number of Groups, Action Buttons */}
      <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Sport Select */}
        <div>
          <label className="block text-xs font-black uppercase text-blue-950 mb-1.5 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Môn Thể Thao:</span>
          </label>
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value as SportId)}
            className="w-full bg-white border-2 border-slate-300 text-blue-950 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
          >
            {sports.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Number of Groups Select (2, 3, 4, 5, 6, 7, 8) */}
        <div>
          <label className="block text-xs font-black uppercase text-blue-950 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-900" />
            <span>Số Bảng Đấu:</span>
          </label>
          <select
            value={numGroups}
            onChange={(e) => setNumGroups(parseInt(e.target.value))}
            className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
          >
            <option value={2}>02 Bảng (Bảng A 10 đội, Bảng B 10 đội)</option>
            <option value={3}>03 Bảng (Bảng A, B, C)</option>
            <option value={4}>04 Bảng (Bảng A, B, C, D - 5 đội/bảng)</option>
            <option value={5}>05 Bảng (Bảng A, B, C, D, E - 4 đội/bảng)</option>
            <option value={6}>06 Bảng (Bảng A, B, C, D, E, F)</option>
            <option value={7}>07 Bảng (Bảng A, B, C, D, E, F, G)</option>
            <option value={8}>08 Bảng (Bảng A, B, C, D, E, F, G, H)</option>
          </select>
        </div>

        {/* Filter Branch View */}
        <div>
          <label className="block text-xs font-black uppercase text-blue-950 mb-1.5 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xem Nhánh Sơ Đồ:</span>
          </label>
          <select
            value={selectedBranchGroup}
            onChange={(e) => setSelectedBranchGroup(e.target.value)}
            className="w-full bg-white border-2 border-slate-300 text-slate-900 font-bold text-xs px-3 py-2.5 rounded-xl focus:border-blue-700 shadow-sm"
          >
            <option value="all">Toàn bộ tất cả {numGroups} Bảng Đấu ({totalSlots} vị trí)</option>
            {activeGroupNames.map((gn) => (
              <option key={gn} value={gn}>
                Chỉ xem Nhánh {gn} ({(groupPools[gn] || []).length} đội)
              </option>
            ))}
          </select>
        </div>

        {/* Quick Draw Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoSpinAll}
            disabled={isSpinning || isAutoSpinningAll || isAutoSpinningGroup !== null}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs uppercase tracking-wider rounded-xl shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Dices className={`w-4 h-4 ${isAutoSpinningAll ? 'animate-spin' : ''}`} />
            <span>{isAutoSpinningAll ? 'Đang Quay...' : '🎰 Quay Tự Động Toàn Bộ'}</span>
          </button>

          <button
            onClick={handleShuffleGroupPools}
            disabled={isSpinning || isAutoSpinningAll || isAutoSpinningGroup !== null}
            className="p-2.5 bg-white border-2 border-slate-300 hover:bg-slate-100 text-blue-950 rounded-xl shadow-sm transition-colors"
            title="Trộn ngẫu nhiên danh sách đội vào các bảng"
          >
            <Shuffle className="w-4 h-4 text-blue-900" />
          </button>

          <button
            onClick={handleResetDraw}
            disabled={isSpinning || isAutoSpinningAll || isAutoSpinningGroup !== null}
            className="p-2.5 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl shadow-sm transition-colors"
            title="Xoá & bốc thăm lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Group Pools Overview Cards: Shows clearly which teams belong to which group! */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {activeGroupNames.map((gName) => {
          const pool = groupPools[gName] || [];
          const assigned = getAssignedTeamsInGroup(gName);
          const unassigned = getUnassignedTeamsForGroup(gName);

          return (
            <div key={gName} className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-blue-950 text-amber-300 flex items-center justify-center font-black text-xs font-sans font-bold">
                    {gName.replace('Bảng ', '')}
                  </span>
                  <span className="text-xs font-black text-blue-950">Danh Sách {gName}</span>
                </div>
                <span className="text-[11px] font-bold font-mono text-slate-600">
                  {assigned.size} / {pool.length} vị trí
                </span>
              </div>

              {/* Team list badges */}
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                {pool.map((t) => {
                  const isAssigned = assigned.has(t);
                  return (
                    <span
                      key={t}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors ${
                        isAssigned
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 line-through opacity-60'
                          : 'bg-white text-blue-950 border border-slate-300 shadow-xs'
                      }`}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>

              <div className="text-[10px] text-slate-500 font-medium">
                Còn <strong className="text-blue-950 font-bold">{unassigned.length}</strong> đội chưa bốc thăm trong {gName}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* VISUAL BRACKET TREE ORGANIZED BY GROUP BRANCHES                */}
      {/* ============================================================== */}
      <div className="space-y-8">
        {activeGroupNames
          .filter((gName) => selectedBranchGroup === 'all' || selectedBranchGroup === gName)
          .map((gName, gIdx) => {
            const groupSlots = bracketSlots.filter((s) => s.groupName === gName);
            const totalInGroup = groupSlots.length;
            const pairCount = Math.floor(totalInGroup / 2);
            const pool = groupPools[gName] || [];
            const unassignedInGroup = getUnassignedTeamsForGroup(gName);

            return (
              <div
                key={gName}
                className="bg-white rounded-3xl border-2 border-slate-300 p-6 shadow-xl space-y-6 relative overflow-hidden"
              >
                {/* Branch Header with Dedicated "Quay Bảng Này" button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-950 to-indigo-900 text-amber-300 flex items-center justify-center font-black font-sans font-bold text-xl shadow-md border-2 border-amber-400/60">
                      {gName.replace('Bảng ', '')}
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                        <span>Nhánh Sơ Đồ Thi Đấu - {gName}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-950 border border-blue-300 font-sans font-black">
                          {pool.length} Đội ({pairCount} Cặp Đấu Vòng 1)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Chỉ quay ngẫu nhiên các đội thuộc <strong>{gName}</strong> ({pool.join(', ')})
                      </p>
                    </div>
                  </div>

                  {/* Actions for this specific group */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutoSpinSingleGroup(gName)}
                      disabled={isSpinning || isAutoSpinningAll || isAutoSpinningGroup !== null || unassignedInGroup.length === 0}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-900 to-indigo-950 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 border border-amber-400/70 disabled:opacity-40"
                    >
                      <Dices className={`w-3.5 h-3.5 text-amber-400 ${isAutoSpinningGroup === gName ? 'animate-spin' : ''}`} />
                      <span>{isAutoSpinningGroup === gName ? 'Đang Quay...' : `🎯 Quay Tự Động ${gName}`}</span>
                    </button>

                    <div className="text-xs text-slate-500 font-bold hidden sm:flex items-center gap-1">
                      {groupSlots.every((s) => s.assignedTeam) ? (
                        <span className="text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đủ {totalInGroup} đội
                        </span>
                      ) : (
                        <span className="text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          Còn {unassignedInGroup.length} đội
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Branch Tree Grid with Full Pairs */}
                <div className="overflow-x-auto py-2">
                  <div className="min-w-[860px] grid grid-cols-3 gap-6 items-center">
                    
                    {/* ROUND 1: TẤT CẢ CÁC CẶP ĐẤU VÒNG 1 TRONG BẢNG (E.G. 5 PAIRS FOR 10 TEAMS) */}
                    <div className="space-y-4">
                      <div className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="w-4 h-4 text-blue-900" />
                          <span>Vòng 1 {gName} ({pairCount} Cặp Đấu)</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal">Nhấn ô để quay</span>
                      </div>

                      <div className="space-y-3.5">
                        {Array.from({ length: pairCount }).map((_, pIdx) => {
                          const slotA = groupSlots[pIdx * 2];
                          const slotB = groupSlots[pIdx * 2 + 1];

                          return (
                            <div
                              key={pIdx}
                              className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 shadow-sm space-y-2 hover:border-blue-400 transition-colors"
                            >
                              <div className="text-[10px] font-bold text-blue-950 uppercase flex justify-between">
                                <span className="font-mono bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">
                                  Trận {pIdx + 1} ({gName})
                                </span>
                                <span className="text-slate-500 font-mono">
                                  {String(8 + gIdx + Math.floor(pIdx / 3)).padStart(2, '0')}:
                                  {String((pIdx % 3) * 30).padStart(2, '0')}
                                </span>
                              </div>

                              {/* Slot A */}
                              {slotA && (
                                <button
                                  type="button"
                                  onClick={() => handleSlotClick(slotA)}
                                  className={`w-full p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 group ${
                                    slotA.assignedTeam
                                      ? 'bg-blue-950 text-white border-amber-400 shadow-md'
                                      : 'bg-white text-slate-700 border-dashed border-slate-400 hover:border-blue-900 hover:bg-blue-50/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-blue-950 font-black text-xs flex items-center justify-center font-mono">
                                      {slotA.slotId}
                                    </span>
                                    {slotA.assignedTeam && (
                                      <span className="text-sm shrink-0" title="Biểu tượng đội">
                                        {getTeamEmblem(slotA.assignedTeam, registrations)}
                                      </span>
                                    )}
                                    <span className="font-bold text-xs truncate max-w-[130px]">
                                      {slotA.assignedTeam ? `Lớp ${slotA.assignedTeam}` : '🎲 Nhấn quay đội'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] opacity-75 group-hover:opacity-100 font-medium">
                                    {slotA.assignedTeam ? 'Đổi' : `Quay (${gName})`}
                                  </span>
                                </button>
                              )}

                              <div className="text-center text-[10px] font-black text-slate-400 font-mono">VS</div>

                              {/* Slot B */}
                              {slotB && (
                                <button
                                  type="button"
                                  onClick={() => handleSlotClick(slotB)}
                                  className={`w-full p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 group ${
                                    slotB.assignedTeam
                                      ? 'bg-blue-950 text-white border-amber-400 shadow-md'
                                      : 'bg-white text-slate-700 border-dashed border-slate-400 hover:border-blue-900 hover:bg-blue-50/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-blue-950 font-black text-xs flex items-center justify-center font-mono">
                                      {slotB.slotId}
                                    </span>
                                    {slotB.assignedTeam && (
                                      <span className="text-sm shrink-0" title="Biểu tượng đội">
                                        {getTeamEmblem(slotB.assignedTeam, registrations)}
                                      </span>
                                    )}
                                    <span className="font-bold text-xs truncate max-w-[130px]">
                                      {slotB.assignedTeam ? `Lớp ${slotB.assignedTeam}` : '🎲 Nhấn quay đội'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] opacity-75 group-hover:opacity-100 font-medium">
                                    {slotB.assignedTeam ? 'Đổi' : `Quay (${gName})`}
                                  </span>
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* If group has odd number of slots, render automatic Bye / Miễn vòng đấu */}
                        {groupSlots.length % 2 !== 0 && (
                          <div className="bg-amber-50/90 p-3 rounded-2xl border-2 border-amber-300 shadow-sm space-y-2">
                            <div className="text-[10px] font-bold text-amber-950 uppercase flex justify-between items-center">
                              <span className="font-mono bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-black">
                                ⚡ Đội Lẻ / Miễn Vòng (BYE)
                              </span>
                              <span className="text-amber-800 font-bold">Vào thẳng vòng trong</span>
                            </div>
                            {(() => {
                              const byeSlot = groupSlots[groupSlots.length - 1];
                              return byeSlot ? (
                                <button
                                  type="button"
                                  onClick={() => handleSlotClick(byeSlot)}
                                  className={`w-full p-2.5 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 group ${
                                    byeSlot.assignedTeam
                                      ? 'bg-amber-500 text-blue-950 border-amber-600 shadow-md font-black'
                                      : 'bg-white text-slate-700 border-dashed border-amber-400 hover:border-amber-600 hover:bg-amber-50/60'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-blue-950 text-amber-300 font-black text-xs flex items-center justify-center font-mono">
                                      {byeSlot.slotId}
                                    </span>
                                    {byeSlot.assignedTeam && (
                                      <span className="text-sm shrink-0" title="Biểu tượng đội">
                                        {getTeamEmblem(byeSlot.assignedTeam, registrations)}
                                      </span>
                                    )}
                                    <span className="font-bold text-xs truncate max-w-[150px]">
                                      {byeSlot.assignedTeam ? `Lớp ${byeSlot.assignedTeam}` : '🎲 Nhấn quay đội (Miễn vòng)'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] opacity-80 group-hover:opacity-100 font-bold">
                                    {byeSlot.assignedTeam ? 'Đổi' : 'Chọn'}
                                  </span>
                                </button>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ROUND 2: VÒNG BÁN KẾT & CHUNG KẾT BẢNG */}
                    <div className="space-y-4 pl-4 border-l-2 border-slate-200">
                      <div className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span>Bán Kết & Chung Kết {gName}</span>
                      </div>

                      {/* Bán kết 1 & Bán kết 2 (hoặc Chung kết bảng tùy theo số lượng cặp đấu) */}
                      <div className="space-y-3">
                        {pairCount >= 5 ? (
                          <>
                            <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 space-y-2">
                              <div className="text-[10px] font-bold text-blue-950 uppercase flex justify-between">
                                <span>Bán Kết 1 {gName}</span>
                                <span className="text-slate-500 font-mono">13:30</span>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 1 ({gName})</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">W1</span>
                              </div>
                              <div className="text-center text-[10px] font-black text-slate-400">VS</div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 2 ({gName})</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">W2</span>
                              </div>
                            </div>

                            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-300 space-y-1.5">
                              <div className="text-[10px] font-bold text-amber-900 uppercase flex justify-between">
                                <span>Playoff {gName} (Trận 4 vs Trận 5)</span>
                                <span className="text-slate-500 font-mono">11:00</span>
                              </div>
                              <div className="p-1.5 bg-white rounded-lg border border-amber-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 4 ({gName})</span>
                                <span className="text-[10px] text-amber-800 font-mono font-bold">W4</span>
                              </div>
                              <div className="text-center text-[9px] font-black text-amber-600">VS</div>
                              <div className="p-1.5 bg-white rounded-lg border border-amber-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 5 ({gName})</span>
                                <span className="text-[10px] text-amber-800 font-mono font-bold">W5</span>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 space-y-2">
                              <div className="text-[10px] font-bold text-blue-950 uppercase flex justify-between">
                                <span>Bán Kết 2 {gName}</span>
                                <span className="text-slate-500 font-mono">14:15</span>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 3 ({gName})</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">W3</span>
                              </div>
                              <div className="text-center text-[10px] font-black text-slate-400">VS</div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Playoff (T4/T5)</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">W(4/5)</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* For 2 pairs (5 teams: 2 matches + 1 BYE) */}
                            <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 space-y-2">
                              <div className="text-[10px] font-bold text-blue-950 uppercase flex justify-between">
                                <span>Bán Kết {gName}</span>
                                <span className="text-slate-500 font-mono">13:30</span>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 1 ({gName})</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">W1</span>
                              </div>
                              <div className="text-center text-[10px] font-black text-slate-400">VS</div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>{groupSlots.length % 2 !== 0 ? 'Đội Miễn Vòng (BYE)' : `Thắng Trận 2 (${gName})`}</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">{groupSlots.length % 2 !== 0 ? 'BYE' : 'W2'}</span>
                              </div>
                            </div>

                            <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-200 space-y-2">
                              <div className="text-[10px] font-bold text-blue-950 uppercase flex justify-between">
                                <span>Tranh Vé Vào Chung Kết</span>
                                <span className="text-slate-500 font-mono">14:15</span>
                              </div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Thắng Trận 2 ({gName})</span>
                                <span className="text-[10px] text-blue-900 font-mono font-bold">W2</span>
                              </div>
                              <div className="text-center text-[10px] font-black text-slate-400">VS</div>
                              <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                                <span>Đội Nhì Bảng / Chờ</span>
                                <span className="text-[10px] text-slate-500 font-mono font-bold">-</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Chung Kết Bảng */}
                      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-2xl border-2 border-amber-400/90 shadow-lg space-y-2.5">
                        <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                          <span>Chung Kết Tranh Nhất {gName}</span>
                          <span className="text-slate-300 font-mono">15:30</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                          <span>Thắng Bán Kết 1 {gName}</span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold">BK1</span>
                        </div>
                        <div className="text-center text-[10px] font-black text-amber-400 font-mono">VS</div>
                        <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                          <span>Thắng Bán Kết 2 {gName}</span>
                          <span className="text-[10px] text-amber-400 font-mono font-bold">BK2</span>
                        </div>
                      </div>
                    </div>

                    {/* ROUND 3: SUẤT VÀO VÒNG TOÀN TRƯỜNG */}
                    <div className="pl-4 border-l-2 border-amber-300 space-y-3 text-center">
                      <div className="text-xs font-black uppercase text-amber-800 tracking-wider">
                        Đại Diện {gName} Đi Tiếp
                      </div>

                      <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-5 rounded-2xl border-2 border-amber-300 shadow-xl space-y-3">
                        <Award className="w-9 h-9 text-blue-950 mx-auto" />
                        <div className="font-black text-sm uppercase tracking-wider">Quán Quân {gName}</div>
                        <div className="text-[11px] font-bold bg-blue-950 text-amber-300 py-1.5 px-2 rounded-lg font-mono shadow">
                          Tiến Vào Vòng Chung Kết Toàn Trường
                        </div>
                      </div>

                      <div className="bg-slate-100 text-slate-800 p-3 rounded-xl border border-slate-300 text-xs font-bold">
                        <div>Á Quân {gName}</div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          Tranh Huy Chương Đồng Toàn Trường
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ============================================================== */}
      {/* FINAL ACTION BAR: CONFIRM & APPLY TO SCHEDULE                  */}
      {/* ============================================================== */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border-4 border-amber-400 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div>
          <h3 className="text-lg font-black text-amber-300 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Hoàn Tất Bốc Thăm & Tạo Lịch Thi Đấu Đầy Đủ</span>
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Đã sẵn sàng tạo toàn bộ các cặp thi đấu cho tất cả {candidateTeams.length} đội tham gia, phân bổ lịch đấu từ vòng loại bảng đến chung kết toàn trường.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleConfirmAndApplyMatches}
            className="py-3 px-7 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <Check className="w-5 h-5" />
            <span>✅ Xác Nhận Lịch Thi Đấu & Cập Nhật Sơ Đồ</span>
          </button>
        </div>
      </div>

      {appliedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-emerald-950 text-xs font-bold flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              Đã cập nhật thành công toàn bộ lịch thi đấu và sơ đồ phân nhánh đầy đủ cho tất cả các đội vào hệ thống!
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
            >
              Xem Lịch Ngay
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* LUCKY DRAW ROULETTE POPUP MODAL                                */}
      {/* ============================================================== */}
      {activeSpinSlot && (
        <div className="fixed inset-0 z-50 bg-blue-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-4 border-amber-400 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-slate-900 animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => {
                if (!isSpinning) setActiveSpinSlot(null);
              }}
              disabled={isSpinning}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                <Shuffle className="w-3 h-3 text-amber-600" />
                <span>Bốc Thăm Vị Trí {activeSpinSlot.slotId} - {activeSpinSlot.groupName}</span>
              </span>
              <h3 className="text-xl font-black text-blue-950 font-sans font-bold">
                Quay Ngẫu Nhiên Đội Tuyển ({activeSpinSlot.groupName})
              </h3>
              <p className="text-xs text-slate-500">
                Chỉ bốc thăm trong <strong>{(groupPools[activeSpinSlot.groupName] || []).length} đội của {activeSpinSlot.groupName}</strong> (còn {getUnassignedTeamsForGroup(activeSpinSlot.groupName).length} đội chưa chọn vị trí)
              </p>
            </div>

            {/* Candidate Pool Badges for THIS Group */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-600 uppercase">
                Danh sách đội của {activeSpinSlot.groupName}:
              </div>
              <div className="flex flex-wrap gap-1">
                {(groupPools[activeSpinSlot.groupName] || []).map((t) => {
                  const isAssigned = getAssignedTeamsInGroup(activeSpinSlot.groupName).has(t) && t !== activeSpinSlot.assignedTeam;
                  return (
                    <span
                      key={t}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isAssigned
                          ? 'bg-slate-200 text-slate-400 line-through'
                          : 'bg-blue-900 text-amber-300 border border-amber-400/40'
                      }`}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Spinning Visual Reel */}
            <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-6 rounded-2xl border-2 border-amber-400 shadow-inner text-center space-y-3">
              <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                {isSpinning ? `🎰 Đang Quay Vòng Bốc Thăm ${activeSpinSlot.groupName}...` : drawnWinner ? '🎉 Đội Trúng Thăm Vị Trí' : 'Sẵn Sàng Bốc Thăm'}
              </div>

              {/* Reel Text Display */}
              <div
                className={`py-4 px-6 rounded-2xl bg-white/10 border-2 text-2xl font-black font-sans font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
                  isSpinning
                    ? 'border-amber-400 text-amber-300 animate-pulse scale-105 shadow-lg shadow-amber-400/20'
                    : drawnWinner
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-xl'
                    : 'border-white/20 text-white'
                }`}
              >
                {isSpinning && <Dices className="w-6 h-6 animate-spin text-amber-400" />}
                <span>{spinningDisplayText}</span>
              </div>

              {drawnWinner && (
                <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đã xếp Lớp {drawnWinner} vào Vị trí {activeSpinSlot.slotId} ({activeSpinSlot.groupName})</span>
                </div>
              )}
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => triggerSpinForSlot(activeSpinSlot)}
                disabled={isSpinning || getUnassignedTeamsForGroup(activeSpinSlot.groupName).length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Shuffle className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Đang Quay...' : `🎲 Bắt Đầu Quay Đội ${activeSpinSlot.groupName}`}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSpinSlot(null)}
                disabled={isSpinning}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Bracket Diagram Modal */}
      {isPrintModalOpen && (
        <PrintBracketModal
          matches={previewMatchesFromSlots}
          sports={sports}
          registrations={registrations}
          selectedSportId={sportId}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

    </div>
  );
};
