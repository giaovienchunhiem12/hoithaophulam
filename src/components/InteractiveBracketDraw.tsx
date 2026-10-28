import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SportCategory, Registration, Match, SportId, Tournament, DrawStateRecord } from '../types/sports';
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
  activeTournamentId?: string;
  drawStates?: Record<string, DrawStateRecord>;
  onApplyMatches: (matches: Match[], newTournament?: Tournament) => void;
  onClose?: () => void;
  subCategory?: string;
  venue?: string;
  startDate?: string;
  numGroupsDefault?: number;
  onAddTeamsClick?: () => void;
  tournamentName?: string;
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
  selectedSportId: initialSportId = 'caro',
  activeTournamentId,
  drawStates = {},
  onApplyMatches,
  onClose,
  subCategory: propSubCategory,
  venue: propVenue,
  startDate: propStartDate = '2026-10-12',
  numGroupsDefault = 1,
  onAddTeamsClick,
  tournamentName: propTournamentName
}) => {
  const [sportId, setSportId] = useState<SportId>(initialSportId);
  const savedForSport = drawStates?.[sportId];
  const [numGroups, setNumGroups] = useState<number>(savedForSport?.numGroups || numGroupsDefault);
  const [customTournamentName, setCustomTournamentName] = useState<string>(
    savedForSport?.customTournamentName ||
      propTournamentName ||
      `Giải ${sports.find((s) => s.id === initialSportId)?.name || 'Thể Thao'} THPT Phú Lâm 2026`
  );
  const [selectedBranchGroup, setSelectedBranchGroup] = useState<string>('all'); // 'all' or 'Bảng A', 'Bảng B'...
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [branchViewMode, setBranchViewMode] = useState<'tree' | 'grid'>('tree');
  const lastSyncedDrawTimestampRef = useRef<number>(savedForSport?.updatedAt || 0);

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

    if (numGroups === 1) {
      pools['Bảng A'] = [...totalTeams];
    } else if (numGroups === 2) {
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

  const [groupPools, setGroupPools] = useState<Record<string, string[]>>(() => {
    if (savedForSport?.groupPools && Object.keys(savedForSport.groupPools).length > 0) {
      return savedForSport.groupPools;
    }
    return initializeGroupPools();
  });

  // When sportId, numGroups or candidateTeams changes, refresh group pools unless saved draw state matches
  useEffect(() => {
    const remote = drawStates?.[sportId];
    if (
      remote &&
      remote.numGroups === numGroups &&
      remote.groupPools &&
      Object.values(remote.groupPools).flat().length === candidateTeams.length
    ) {
      setGroupPools(remote.groupPools);
      return;
    }
    setGroupPools(initializeGroupPools());
  }, [sportId, numGroups, candidateTeams.length]);

  // Calculate dynamic slots per group based on team count in that group
  const getSlotsCountForGroup = (gName: string): number => {
    const pool = groupPools[gName] || [];
    return Math.max(2, pool.length > 0 ? pool.length : Math.max(4, Math.ceil(candidateTeams.length / Math.max(1, numGroups))));
  };

  // Initial slot structure generator for each group
  const initializeSlots = (overridePools?: Record<string, string[]>): BracketSlot[] => {
    const slots: BracketSlot[] = [];
    const groupsToGen = groupLetters.slice(0, numGroups).map((l) => `Bảng ${l}`);
    const currentPools = overridePools || groupPools;
    const freshPools = initializeGroupPools();

    groupsToGen.forEach((gName) => {
      const gLetter = gName.replace('Bảng ', '');
      const pool = (currentPools[gName] && currentPools[gName].length > 0)
        ? currentPools[gName]
        : (freshPools[gName] || []);
      const slotsCount = Math.max(
        2,
        pool.length > 0
          ? pool.length
          : Math.max(4, Math.ceil(candidateTeams.length / Math.max(1, numGroups)))
      );

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

  const [bracketSlots, setBracketSlots] = useState<BracketSlot[]>(() => {
    if (savedForSport?.bracketSlots && savedForSport.bracketSlots.length > 0) {
      return savedForSport.bracketSlots as BracketSlot[];
    }
    return initializeSlots();
  });

  // When sportId, numGroups or candidateTeams changes, re-initialize slots unless saved draw state matches
  useEffect(() => {
    const remote = drawStates?.[sportId];
    if (
      remote &&
      remote.numGroups === numGroups &&
      Array.isArray(remote.bracketSlots) &&
      remote.bracketSlots.length === candidateTeams.length
    ) {
      setBracketSlots(remote.bracketSlots as BracketSlot[]);
      return;
    }
    setBracketSlots((prev) => {
      const fresh = initializeSlots();
      if (prev.length === fresh.length && prev.some((s) => s.assignedTeam)) {
        return fresh.map((f, idx) =>
          prev[idx] && prev[idx].slotId === f.slotId
            ? { ...f, assignedTeam: prev[idx].assignedTeam }
            : f
        );
      }
      return fresh;
    });
  }, [sportId, numGroups, candidateTeams.length, groupPools]);

  // Receive live real-time draw updates from other devices
  useEffect(() => {
    const remote = drawStates?.[sportId];
    if (!remote || !remote.updatedAt) return;
    if (remote.updatedAt <= lastSyncedDrawTimestampRef.current) return;

    lastSyncedDrawTimestampRef.current = remote.updatedAt;
    if (remote.numGroups && remote.numGroups !== numGroups) {
      setNumGroups(remote.numGroups);
    }
    if (remote.groupPools && Object.keys(remote.groupPools).length > 0) {
      setGroupPools(remote.groupPools);
    }
    if (Array.isArray(remote.bracketSlots) && remote.bracketSlots.length > 0) {
      setBracketSlots(remote.bracketSlots as BracketSlot[]);
      setActiveSpinSlot((prevSlot) => {
        if (!prevSlot) return null;
        const updatedSlot = (remote.bracketSlots as BracketSlot[]).find((s) => s.slotId === prevSlot.slotId);
        return updatedSlot || prevSlot;
      });
    }
    if (remote.customTournamentName) {
      setCustomTournamentName(remote.customTournamentName);
    }
  }, [drawStates, sportId, numGroups]);

  // Shuffle pools between groups
  const handleShuffleGroupPools = () => {
    const totalTeams = [...candidateTeams].sort(() => Math.random() - 0.5);
    const pools: Record<string, string[]> = {};
    activeGroupNames.forEach((gn) => (pools[gn] = []));

    if (numGroups === 1) {
      pools['Bảng A'] = [...totalTeams];
    } else if (numGroups === 2) {
      const mid = Math.ceil(totalTeams.length / 2);
      pools['Bảng A'] = totalTeams.slice(0, mid);
      pools['Bảng B'] = totalTeams.slice(mid);
    } else {
      totalTeams.forEach((team, idx) => {
        const gName = activeGroupNames[idx % activeGroupNames.length];
        pools[gName].push(team);
      });
    }

    const resetSlots = initializeSlots(pools);
    setGroupPools(pools);
    setBracketSlots(resetSlots);
    syncDrawStateToServer(resetSlots, pools, numGroups);
  };

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
  const [spinPrevText, setSpinPrevText] = useState<string>('');
  const [spinNextText, setSpinNextText] = useState<string>('');
  const [drawnWinner, setDrawnWinner] = useState<string | null>(null);
  const [isAutoSpinningAll, setIsAutoSpinningAll] = useState<boolean>(false);
  const [isAutoSpinningGroup, setIsAutoSpinningGroup] = useState<string | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const formatTeamLabel = (name?: string | null): string => {
    if (!name) return '';
    const trimmed = name.trim();
    if (/^(10|11|12)[A-Z]\d+$/i.test(trimmed)) {
      return `Lớp ${trimmed}`;
    }
    return trimmed;
  };

  // Handle clicking a slot on the bracket tree diagram
  const handleSlotClick = (slot: BracketSlot) => {
    if (isSpinning || isAutoSpinningAll || isAutoSpinningGroup) return;
    setActiveSpinSlot(slot);
    setDrawnWinner(slot.assignedTeam || null);
    setSpinningDisplayText(slot.assignedTeam ? slot.assignedTeam : 'Sẵn sàng quay số');
    setSpinPrevText('');
    setSpinNextText('');
  };

  const handleJumpToNextEmptySlot = () => {
    if (!activeSpinSlot || isSpinning) return;
    const groupSlots = bracketSlots.filter((s) => s.groupName === activeSpinSlot.groupName);
    const currentIdx = groupSlots.findIndex((s) => s.slotId === activeSpinSlot.slotId);
    const nextEmpty =
      groupSlots.slice(currentIdx + 1).find((s) => !s.assignedTeam) ||
      groupSlots.find((s) => !s.assignedTeam);
    if (nextEmpty) {
      handleSlotClick(nextEmpty);
    }
  };

  // TRIGGER SPINNING WHEEL: ONLY DRAWS FROM THE CURRENT GROUP'S POOL WITH DECELERATING REEL EFFECT!
  const triggerSpinForSlot = (targetSlot: BracketSlot) => {
    const groupName = targetSlot.groupName;
    const groupPool = groupPools[groupName] || [];
    const assignedInGroup = getAssignedTeamsInGroup(groupName);

    // Filter: ONLY teams belonging to THIS specific group pool that are not yet assigned!
    const availableInGroup = groupPool.filter(
      (t) => !assignedInGroup.has(t) || t === targetSlot.assignedTeam
    );

    if (availableInGroup.length === 0) {
      return;
    }

    setIsSpinning(true);
    setDrawnWinner(null);

    const totalSteps = 32 + Math.floor(Math.random() * 10);
    const chosenWinner = availableInGroup[Math.floor(Math.random() * availableInGroup.length)];
    let step = 0;

    const runStep = () => {
      step++;
      const idx = Math.floor(Math.random() * availableInGroup.length);
      const currentCandidate = step >= totalSteps ? chosenWinner : availableInGroup[idx];
      const prevCandidate = availableInGroup[(idx - 1 + availableInGroup.length) % availableInGroup.length];
      const nextCandidate = availableInGroup[(idx + 1) % availableInGroup.length];

      setSpinningDisplayText(currentCandidate);
      setSpinPrevText(prevCandidate || '');
      setSpinNextText(nextCandidate || '');

      if (step >= totalSteps) {
        setSpinningDisplayText(chosenWinner);
        setDrawnWinner(chosenWinner);
        setIsSpinning(false);

        // Assign to slot, sync activeSpinSlot, and immediately push to server for cross-device sync
        setBracketSlots((prev) => {
          const updatedSlots = prev.map((s) =>
            s.slotId === targetSlot.slotId ? { ...s, assignedTeam: chosenWinner } : s
          );
          syncDrawStateToServer(updatedSlots, groupPools, numGroups);
          return updatedSlots;
        });
        setActiveSpinSlot((prev) => (prev ? { ...prev, assignedTeam: chosenWinner } : prev));
        return;
      }

      // Smooth deceleration curve: fast at start (40ms), dramatic slowdown at end (up to 220ms)
      const progress = step / totalSteps;
      const nextDelay = progress < 0.6
        ? 45
        : Math.round(45 + Math.pow((progress - 0.6) / 0.4, 2) * 185);
      setTimeout(runStep, nextDelay);
    };

    runStep();
  };

  // Auto spin for a SPECIFIC group only (e.g. Bảng A only from Bảng A pool)
  const handleAutoSpinSingleGroup = async (gName: string) => {
    if (isSpinning || isAutoSpinningAll || isAutoSpinningGroup) return;
    setIsAutoSpinningGroup(gName);

    const emptySlots = bracketSlots.filter((s) => s.groupName === gName && !s.assignedTeam);
    if (emptySlots.length === 0) {
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
        setSpinningDisplayText(formatTeamLabel(assigned));
        setDrawnWinner(assigned);

        currentSlots = currentSlots.map((s) =>
          s.slotId === slot.slotId ? { ...s, assignedTeam: assigned } : s
        );
        setBracketSlots([...currentSlots]);

        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    }

    syncDrawStateToServer(currentSlots, groupPools, numGroups);
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
          setSpinningDisplayText(formatTeamLabel(assigned));
          setDrawnWinner(assigned);

          currentSlots = currentSlots.map((s) =>
            s.slotId === slot.slotId ? { ...s, assignedTeam: assigned } : s
          );
          setBracketSlots([...currentSlots]);

          await new Promise((resolve) => setTimeout(resolve, 140));
        }
      }
    }

    syncDrawStateToServer(currentSlots, groupPools, numGroups);
    setIsAutoSpinningAll(false);
    setActiveSpinSlot(null);
  };

  // Reset entire draw
  const handleResetDraw = () => {
    const resetSlots = initializeSlots();
    setBracketSlots(resetSlots);
    setActiveSpinSlot(null);
    setDrawnWinner(null);
    setAppliedSuccess(false);
    syncDrawStateToServer(resetSlots, groupPools, numGroups);
  };

  // Build official tournament matches from any given slots list
  const buildMatchesAndTournamentFromSlots = (
    slotsToUse: BracketSlot[],
    groupsCountToUse: number = numGroups,
    preferExistingTourId = true,
    poolsToUse: Record<string, string[]> = groupPools
  ) => {
    const timestamp = preferExistingTourId ? sportId.toUpperCase() : Date.now().toString().slice(-4);
    const generatedMatches: Match[] = [];
    const groupsList = groupLetters.slice(0, groupsCountToUse).map((l) => `Bảng ${l}`);

    const groupSlotMap: Record<string, BracketSlot[]> = {};
    groupsList.forEach((gn) => (groupSlotMap[gn] = []));
    slotsToUse.forEach((s) => {
      if (groupSlotMap[s.groupName]) {
        groupSlotMap[s.groupName].push(s);
      }
    });

    // 1. Generate matches for each group branch
    Object.entries(groupSlotMap).forEach(([gName, sList], gIdx) => {
      const sortedSlots = [...sList].sort((a, b) => a.slotIndexInGroup - b.slotIndexInGroup);
      const totalInGroup = sortedSlots.length;
      const poolForGroup = poolsToUse[gName] || [];
      const alreadyAssigned = new Set(
        sortedSlots.map((s) => s.assignedTeam).filter((t): t is string => Boolean(t))
      );
      const remainingPoolTeams = poolForGroup.filter((t) => !alreadyAssigned.has(t));
      let fallbackIdx = 0;

      const resolvedTeams = sortedSlots.map((s, idx) => {
        if (s.assignedTeam) return s.assignedTeam;
        if (fallbackIdx < remainingPoolTeams.length) {
          return remainingPoolTeams[fallbackIdx++];
        }
        return `Vị trí ${gName.replace('Bảng ', '')}${idx + 1}`;
      });

      // ==============================================================
      // XỬ LÝ ĐẶC BIỆT CHO BẢNG CÓ ĐÚNG 5 ĐỘI:
      // KHÔNG THÊM ĐỘI CHỜ VÀ BỎ ĐI CÁC NHÁNH KHÔNG LIÊN QUAN!
      // ==============================================================
      if (totalInGroup === 5) {
        const team1 = resolvedTeams[0];
        const team2 = resolvedTeams[1];
        const team3 = resolvedTeams[2];
        const team4 = resolvedTeams[3];
        const team5 = resolvedTeams[4];

        // Trận Sơ Loại / Playoff Duy Nhất (Đội 4 vs Đội 5)
        generatedMatches.push({
          id: `M-BR-${timestamp}-${gIdx}-PLAYOFF`,
          sportId,
          subCategory: `${subCategory} - Vòng Sơ Loại ${gName}`,
          stage: 'Tứ kết',
          groupName: gName,
          teamA: team4,
          teamB: team5,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(8 + gIdx).padStart(2, '0')}:00`,
          venue
        });

        // Bán Kết 1 (Đội 1 vs Đội 2 vào thẳng)
        generatedMatches.push({
          id: `M-BR-${timestamp}-${gIdx}-SF1`,
          sportId,
          subCategory: `${subCategory} - Bán Kết 1 ${gName}`,
          stage: 'Bán kết',
          groupName: gName,
          teamA: team1,
          teamB: team2,
          status: 'Upcoming',
          date: '2026-10-13',
          time: `${String(8 + gIdx).padStart(2, '0')}:45`,
          venue
        });

        // Bán Kết 2 (Đội 3 Miễn Vòng vs Thắng Sơ Loại)
        generatedMatches.push({
          id: `M-BR-${timestamp}-${gIdx}-SF2`,
          sportId,
          subCategory: `${subCategory} - Bán Kết 2 ${gName}`,
          stage: 'Bán kết',
          groupName: gName,
          teamA: team3,
          teamB: `Thắng Vòng Sơ Loại ${gName}`,
          status: 'Upcoming',
          date: '2026-10-13',
          time: `${String(9 + gIdx).padStart(2, '0')}:30`,
          venue
        });

        // Chung Kết Bảng (Tranh Nhất Bảng)
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
        return;
      }

      // First round matches: pair consecutive slots (1 vs 2, 3 vs 4, 5 vs 6...)
      const pairCount = Math.floor(totalInGroup / 2);
      for (let p = 0; p < pairCount; p++) {
        const teamA = resolvedTeams[p * 2];
        const teamB = resolvedTeams[p * 2 + 1];
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

      // If odd number > 5 teams, remaining team gets preliminary match
      if (totalInGroup % 2 === 1) {
        const teamRemaining = resolvedTeams[totalInGroup - 1];
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
        teamA: totalInGroup >= 4 ? `Thắng Trận 1 ${gName}` : (resolvedTeams[0] || `Hạt giống ${gName} 1`),
        teamB: totalInGroup >= 4 ? `Thắng Trận 2 ${gName}` : (resolvedTeams[1] || `Hạt giống ${gName} 2`),
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
        teamA: totalInGroup >= 4 ? `Thắng Trận 3 ${gName}` : (resolvedTeams[2] || `Hạt giống ${gName} 3`),
        teamB: totalInGroup >= 4 ? `Thắng Trận 4 ${gName}` : (resolvedTeams[3] || `Hạt giống ${gName} 4`),
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

    // 2. Grand Final Toàn Trường between group winners (only when groupsCountToUse > 1)
    if (groupsCountToUse === 1) {
      generatedMatches.push({
        id: `M-BR-${timestamp}-GRAND-BRONZE`,
        sportId,
        subCategory: `${subCategory} - Tranh Huy Chương Đồng Toàn Trường`,
        stage: 'Trận Tranh Hạng 3',
        teamA: 'Thua Bán Kết 1 Bảng A',
        teamB: 'Thua Bán Kết 2 Bảng A',
        status: 'Upcoming',
        date: '2026-10-15',
        time: '14:30',
        venue
      });
    } else if (groupsCountToUse === 2) {
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
      // 3 or more groups -> Semifinals Toàn Trường -> Grand Final
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
        teamB: groupsCountToUse >= 4 ? 'Nhất Bảng D' : 'Nhì Bảng A',
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

    const tourId =
      preferExistingTourId && activeTournamentId && activeTournamentId !== 'all'
        ? activeTournamentId
        : `TOUR-${sportId.toUpperCase()}-2026`;
    const effectiveTourName =
      customTournamentName.trim() || `Giải ${currentSport?.name || 'Thể Thao'} THPT Phú Lâm 2026`;
    const assignedCount = slotsToUse.filter((s) => s.assignedTeam).length;
    const newTournamentObj: Tournament = {
      id: tourId,
      name: effectiveTourName,
      sportId,
      subCategory,
      format: groupsCountToUse > 1 ? 'group_knockout' : 'knockout',
      numGroups: groupsCountToUse,
      startDate: propStartDate,
      startTime: '08:00',
      venue,
      createdAt: new Date().toISOString(),
      status: 'Upcoming',
      teamsCount: Math.max(assignedCount, candidateTeams.length, slotsToUse.length),
      matchesCount: generatedMatches.length,
    };

    const matchesWithTour: Match[] = generatedMatches.map((m) => ({
      ...m,
      tournamentId: tourId,
      tournamentName: effectiveTourName,
    }));

    return { matchesWithTour, newTournamentObj };
  };

  // Push live draw state & updated matches to server so all devices sync immediately
  const syncDrawStateToServer = (
    slotsToSync: BracketSlot[],
    poolsToSync: Record<string, string[]> = groupPools,
    groupsCountToSync: number = numGroups
  ) => {
    const now = Date.now();
    lastSyncedDrawTimestampRef.current = now;
    const { matchesWithTour, newTournamentObj } = buildMatchesAndTournamentFromSlots(
      slotsToSync,
      groupsCountToSync,
      true,
      poolsToSync
    );

    fetch('/api/draw-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sportId,
        numGroups: groupsCountToSync,
        groupPools: poolsToSync,
        bracketSlots: slotsToSync,
        customTournamentName,
        matches: matchesWithTour,
        tournament: newTournamentObj,
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.drawState?.updatedAt) {
          lastSyncedDrawTimestampRef.current = res.drawState.updatedAt;
        }
      })
      .catch((e) => console.warn('Live draw sync error:', e));
  };

  // Convert drawn bracket slots into official Tournament Matches & Schedule with NO MISSING PAIRS!
  const handleConfirmAndApplyMatches = () => {
    const { matchesWithTour, newTournamentObj } = buildMatchesAndTournamentFromSlots(
      bracketSlots,
      numGroups,
      true
    );
    syncDrawStateToServer(bracketSlots, groupPools, numGroups);
    onApplyMatches(matchesWithTour, newTournamentObj);
    setAppliedSuccess(true);
  };

  const previewMatchesFromSlots = useMemo(() => {
    const list: Match[] = [];
    activeGroupNames.forEach((gName, gIdx) => {
      const gSlots = bracketSlots.filter((s) => s.groupName === gName);

      if (gSlots.length === 5) {
        const slot1 = gSlots[0];
        const slot2 = gSlots[1];
        const slot3 = gSlots[2];
        const slot4 = gSlots[3];
        const slot5 = gSlots[4];

        // 1. Vòng sơ loại (Đội 4 vs Đội 5)
        list.push({
          id: `M-PREV-${gIdx}-PLAYOFF`,
          sportId,
          subCategory: `${subCategory} - Vòng Sơ Loại (${gName})`,
          stage: 'Tứ kết',
          groupName: gName,
          teamA: slot4?.assignedTeam || `Vị trí ${slot4?.slotId || '4'}`,
          teamB: slot5?.assignedTeam || `Vị trí ${slot5?.slotId || '5'}`,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(8 + gIdx).padStart(2, '0')}:00`,
          venue
        });

        // 2. Bán kết 1 (Đội 1 vs Đội 2 vào thẳng)
        list.push({
          id: `M-PREV-${gIdx}-SF1`,
          sportId,
          subCategory: `${subCategory} - Bán Kết 1 (${gName})`,
          stage: 'Bán kết',
          groupName: gName,
          teamA: slot1?.assignedTeam || `Vị trí ${slot1?.slotId || '1'}`,
          teamB: slot2?.assignedTeam || `Vị trí ${slot2?.slotId || '2'}`,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(8 + gIdx).padStart(2, '0')}:45`,
          venue
        });

        // 3. Bán kết 2 (Đội 3 Miễn Vòng vs Thắng Sơ Loại)
        list.push({
          id: `M-PREV-${gIdx}-SF2`,
          sportId,
          subCategory: `${subCategory} - Bán Kết 2 (${gName})`,
          stage: 'Bán kết',
          groupName: gName,
          teamA: slot3?.assignedTeam || `Vị trí ${slot3?.slotId || '3'} (Miễn sơ loại)`,
          teamB: `Thắng Vòng Sơ Loại ${gName}`,
          status: 'Upcoming',
          date: propStartDate,
          time: `${String(9 + gIdx).padStart(2, '0')}:30`,
          venue
        });
        return;
      }

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
            <option value={1}>01 Bảng Đơn (Sơ đồ loại trực tiếp duy nhất toàn giải)</option>
            <option value={2}>02 Bảng (Bảng A, Bảng B)</option>
            <option value={3}>03 Bảng (Bảng A, B, C)</option>
            <option value={4}>04 Bảng (Bảng A, B, C, D)</option>
            <option value={5}>05 Bảng (Bảng A, B, C, D, E)</option>
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

                {/* Branch View Mode Selector */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Layers className="w-4 h-4 text-blue-900" />
                    <span>Chế độ hiển thị sơ đồ nhánh:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBranchViewMode('tree')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        branchViewMode === 'tree'
                          ? 'bg-blue-950 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                      }`}
                    >
                      <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sơ Đồ Nhánh Vector (Có đường nối đầy đủ)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBranchViewMode('grid')}
                      className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                        branchViewMode === 'grid'
                          ? 'bg-blue-950 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-300" />
                      <span>Dạng Thẻ Bảng Đấu (Lưới)</span>
                    </button>
                  </div>
                </div>

                {/* 1. VECTOR BRACKET TREE WITH FULL CONNECTING LINES */}
                {branchViewMode === 'tree' && (
                  <div className="overflow-x-auto py-2">
                    {totalInGroup === -16 ? (
                      /* =================== 16-TEAM CANONICAL VECTOR TREE =================== */
                      <div style={{ width: '1280px', height: '880px' }} className="relative mx-auto bg-slate-50/60 rounded-3xl p-4 border border-blue-200">
                        {/* SVG Vector Connecting Lines Layer for 16 Teams */}
                        <svg width={1280} height={880} className="absolute inset-0 pointer-events-none z-0" style={{ shapeRendering: 'geometricPrecision' }}>
                          <defs>
                            <marker id="idraw16-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1d4ed8" />
                            </marker>
                            <marker id="idraw16-arr-indigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4338ca" />
                            </marker>
                            <marker id="idraw16-arr-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                            </marker>
                          </defs>

                          {/* 8 Round 1 Matches to 4 QF Connections */}
                          {/* Match 1 (Y=65) & Match 2 (Y=175) -> QF 1 (Y=120) */}
                          <path d="M 540 65 H 580 V 175 H 540 M 580 120 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 65 H 580 V 175 H 540 M 580 120 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-blue)" />

                          {/* Match 3 (Y=285) & Match 4 (Y=395) -> QF 2 (Y=340) */}
                          <path d="M 540 285 H 580 V 395 H 540 M 580 340 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 285 H 580 V 395 H 540 M 580 340 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-blue)" />

                          {/* Match 5 (Y=505) & Match 6 (Y=615) -> QF 3 (Y=560) */}
                          <path d="M 540 505 H 580 V 615 H 540 M 580 560 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 505 H 580 V 615 H 540 M 580 560 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-blue)" />

                          {/* Match 7 (Y=725) & Match 8 (Y=835) -> QF 4 (Y=780) */}
                          <path d="M 540 725 H 580 V 835 H 540 M 580 780 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 725 H 580 V 835 H 540 M 580 780 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-blue)" />

                          {/* 4 QF to 2 SF Connections */}
                          {/* QF 1 (Y=120) & QF 2 (Y=340) -> SF 1 (Y=230) */}
                          <path d="M 850 120 H 890 V 340 H 850 M 890 230 H 930" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 850 120 H 890 V 340 H 850 M 890 230 H 930" fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-indigo)" />

                          {/* QF 3 (Y=560) & QF 4 (Y=780) -> SF 2 (Y=670) */}
                          <path d="M 850 560 H 890 V 780 H 850 M 890 670 H 930" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 850 560 H 890 V 780 H 850 M 890 670 H 930" fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-indigo)" />

                          {/* SF 1 (Y=230) & SF 2 (Y=670) -> Final (Y=450) */}
                          <path d="M 1160 230 H 1190 V 670 H 1160 M 1190 450 H 1220" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 1160 230 H 1190 V 670 H 1160 M 1190 450 H 1220" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw16-arr-gold)" />

                          {/* Final Winner stage */}
                          <path d="M 1250 450 H 1275" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 1250 450 H 1275" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw16-arr-gold)" />
                        </svg>

                        {/* Column 1: 16 Slots (left: 20px) */}
                        {[
                          { slot: groupSlots[0], num: 1, y: 15 },
                          { slot: groupSlots[1], num: 2, y: 68 },
                          { slot: groupSlots[2], num: 3, y: 125 },
                          { slot: groupSlots[3], num: 4, y: 178 },
                          { slot: groupSlots[4], num: 5, y: 235 },
                          { slot: groupSlots[5], num: 6, y: 288 },
                          { slot: groupSlots[6], num: 7, y: 345 },
                          { slot: groupSlots[7], num: 8, y: 398 },
                          { slot: groupSlots[8], num: 9, y: 455 },
                          { slot: groupSlots[9], num: 10, y: 508 },
                          { slot: groupSlots[10], num: 11, y: 565 },
                          { slot: groupSlots[11], num: 12, y: 618 },
                          { slot: groupSlots[12], num: 13, y: 675 },
                          { slot: groupSlots[13], num: 14, y: 728 },
                          { slot: groupSlots[14], num: 15, y: 785 },
                          { slot: groupSlots[15], num: 16, y: 838 },
                        ].map((item) => {
                          const s = item.slot;
                          return (
                            <div key={`draw-k16-slot-${item.num}`} style={{ position: 'absolute', left: '20px', top: `${item.y}px`, width: '210px', height: '42px' }} className="z-10">
                              {s ? (
                                <button type="button" onClick={() => handleSlotClick(s)} className="w-full h-full p-1.5 rounded-lg border-2 text-left transition-all flex items-center justify-between gap-1 shadow-xs bg-blue-950 text-white border-amber-400 hover:bg-blue-900">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="w-5 h-5 rounded bg-amber-400 text-blue-950 font-black text-[10px] flex items-center justify-center font-mono shrink-0">{s.slotId}</span>
                                    {s.assignedTeam && <span className="text-xs shrink-0">{getTeamEmblem(s.assignedTeam, registrations)}</span>}
                                    <span className="font-bold text-[10.5px] truncate">{s.assignedTeam ? `Lớp ${s.assignedTeam}` : `Vị trí ${s.slotId}`}</span>
                                  </div>
                                  <span className="text-[9px] opacity-75 shrink-0 font-bold">{s.assignedTeam ? 'Đổi' : 'Chọn'}</span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Column 2: 8 Round 1 Matches (left: 310px, width: 230px) */}
                        {[
                          { title: 'Trận 1 (1/16)', y: 34, tA: 'Đội 1', tB: 'Đội 2', time: '07:30' },
                          { title: 'Trận 2 (1/16)', y: 144, tA: 'Đội 3', tB: 'Đội 4', time: '07:55' },
                          { title: 'Trận 3 (1/16)', y: 254, tA: 'Đội 5', tB: 'Đội 6', time: '08:20' },
                          { title: 'Trận 4 (1/16)', y: 364, tA: 'Đội 7', tB: 'Đội 8', time: '08:45' },
                          { title: 'Trận 5 (1/16)', y: 474, tA: 'Đội 9', tB: 'Đội 10', time: '09:10' },
                          { title: 'Trận 6 (1/16)', y: 584, tA: 'Đội 11', tB: 'Đội 12', time: '09:35' },
                          { title: 'Trận 7 (1/16)', y: 694, tA: 'Đội 13', tB: 'Đội 14', time: '10:00' },
                          { title: 'Trận 8 (1/16)', y: 804, tA: 'Đội 15', tB: 'Đội 16', time: '10:25' },
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ position: 'absolute', left: '310px', top: `${m.y}px`, width: '230px', height: '58px' }} className="bg-white rounded-xl border-2 border-blue-700 shadow-sm p-1.5 flex flex-col justify-between text-xs z-10">
                            <div className="flex items-center justify-between text-[9.5px] font-black text-blue-950 border-b pb-0.5">
                              <span>{m.title}</span>
                              <span className="text-[8.5px] bg-blue-100 text-blue-950 px-1 rounded font-mono font-bold">{m.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx * 2]?.assignedTeam ? `Lớp ${groupSlots[mIdx * 2].assignedTeam}` : m.tA}</span>
                              <span className="text-[8.5px] text-blue-900 font-mono font-bold">M{mIdx*2+1}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx * 2 + 1]?.assignedTeam ? `Lớp ${groupSlots[mIdx * 2 + 1].assignedTeam}` : m.tB}</span>
                              <span className="text-[8.5px] text-blue-900 font-mono font-bold">M{mIdx*2+2}</span>
                            </div>
                          </div>
                        ))}

                        {/* Column 3: 4 Quarterfinals (left: 620px, width: 230px) */}
                        {[
                          { title: 'Tứ kết 1', y: 89, tA: 'Thắng Trận 1', tB: 'Thắng Trận 2', time: '11:00' },
                          { title: 'Tứ kết 2', y: 309, tA: 'Thắng Trận 3', tB: 'Thắng Trận 4', time: '11:30' },
                          { title: 'Tứ kết 3', y: 529, tA: 'Thắng Trận 5', tB: 'Thắng Trận 6', time: '12:00' },
                          { title: 'Tứ kết 4', y: 749, tA: 'Thắng Trận 7', tB: 'Thắng Trận 8', time: '12:30' },
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ position: 'absolute', left: '620px', top: `${m.y}px`, width: '230px', height: '60px' }} className="bg-white rounded-xl border-2 border-indigo-700 shadow-md p-2 flex flex-col justify-between text-xs z-10">
                            <div className="flex items-center justify-between text-[10px] font-black text-indigo-950 border-b pb-0.5">
                              <span>{m.title} ({gName})</span>
                              <span className="text-[9px] bg-indigo-100 text-indigo-950 px-1 rounded font-mono font-bold">{m.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{m.tA}</span>
                              <span className="text-[9px] text-indigo-900 font-mono font-bold">Q{mIdx+1}A</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{m.tB}</span>
                              <span className="text-[9px] text-indigo-900 font-mono font-bold">Q{mIdx+1}B</span>
                            </div>
                          </div>
                        ))}

                        {/* Column 4: 2 Semifinals (left: 930px, width: 230px) */}
                        <div style={{ position: 'absolute', left: '930px', top: '196px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-900 shadow-lg p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 1 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">14:00</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 1</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF1-A</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 2</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF1-B</span>
                          </div>
                        </div>

                        <div style={{ position: 'absolute', left: '930px', top: '636px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-900 shadow-lg p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 2 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">14:45</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 3</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF2-A</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 4</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF2-B</span>
                          </div>
                        </div>

                        {/* Column 5: Final & Winner (left: 1220px, width: 210px) */}
                        <div style={{ position: 'absolute', left: '1220px', top: '330px', width: '210px' }} className="space-y-3 z-10">
                          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-xl space-y-2">
                            <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                              <span>CHUNG KẾT {gName}</span>
                              <span className="text-slate-300 font-mono">16:00</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 1</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK1</span>
                            </div>
                            <div className="text-center text-[9px] font-black text-amber-400 font-mono">VS</div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 2</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK2</span>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-3 rounded-2xl border-2 border-amber-300 shadow-lg text-center space-y-1">
                            <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-950" />
                              <span>QUÁN QUÂN {gName}</span>
                            </div>
                            <div className="text-[10px] font-bold bg-blue-950 text-amber-300 py-1 px-2 rounded-lg font-mono">
                              Vào Vòng Chung Kết Toàn Trường 🏆
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : totalInGroup === -15 ? (
                      /* =================== 15-TEAM CANONICAL VECTOR TREE (1 BYE, PRELIMINARY MATCHES) =================== */
                      <div style={{ width: '1280px', height: '880px' }} className="relative mx-auto bg-slate-50/60 rounded-3xl p-4 border border-blue-200">
                        {/* SVG Vector Connecting Lines Layer for 15 Teams */}
                        <svg width={1280} height={880} className="absolute inset-0 pointer-events-none z-0" style={{ shapeRendering: 'geometricPrecision' }}>
                          <defs>
                            <marker id="idraw15-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1d4ed8" />
                            </marker>
                            <marker id="idraw15-arr-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                            </marker>
                            <marker id="idraw15-arr-indigo" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4338ca" />
                            </marker>
                            <marker id="idraw15-arr-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                            </marker>
                          </defs>

                          {/* Slot 1 (Y=20): Bye -> QF 1 (Y=120) */}
                          <path d="M 260 20 H 620" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw15-arr-emerald)" />

                          {/* 7 Preliminary Matches -> QF connections */}
                          <path d="M 540 65 H 580 V 175 H 540 M 580 120 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 65 H 580 V 175 H 540 M 580 120 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-blue)" />

                          <path d="M 540 285 H 580 V 395 H 540 M 580 340 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 285 H 580 V 395 H 540 M 580 340 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-blue)" />

                          <path d="M 540 505 H 580 V 615 H 540 M 580 560 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 505 H 580 V 615 H 540 M 580 560 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-blue)" />

                          <path d="M 540 725 H 580 V 835 H 540 M 580 780 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 540 725 H 580 V 835 H 540 M 580 780 H 620" fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-blue)" />

                          {/* QF to SF */}
                          <path d="M 850 120 H 890 V 340 H 850 M 890 230 H 930" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 850 120 H 890 V 340 H 850 M 890 230 H 930" fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-indigo)" />

                          <path d="M 850 560 H 890 V 780 H 850 M 890 670 H 930" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 850 560 H 890 V 780 H 850 M 890 670 H 930" fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-indigo)" />

                          {/* SF to Final */}
                          <path d="M 1160 230 H 1190 V 670 H 1160 M 1190 450 H 1220" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 1160 230 H 1190 V 670 H 1160 M 1190 450 H 1220" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw15-arr-gold)" />

                          {/* Final to Winner */}
                          <path d="M 1250 450 H 1275" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 1250 450 H 1275" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw15-arr-gold)" />
                        </svg>

                        {/* Column 1: 15 Slots */}
                        {[
                          { slot: groupSlots[0], num: 1, y: 15, note: '⭐ Miễn vòng (Vào thẳng QF)', highlight: true },
                          { slot: groupSlots[1], num: 2, y: 68 },
                          { slot: groupSlots[2], num: 3, y: 125 },
                          { slot: groupSlots[3], num: 4, y: 178 },
                          { slot: groupSlots[4], num: 5, y: 235 },
                          { slot: groupSlots[5], num: 6, y: 288 },
                          { slot: groupSlots[6], num: 7, y: 345 },
                          { slot: groupSlots[7], num: 8, y: 398 },
                          { slot: groupSlots[8], num: 9, y: 455 },
                          { slot: groupSlots[9], num: 10, y: 508 },
                          { slot: groupSlots[10], num: 11, y: 565 },
                          { slot: groupSlots[11], num: 12, y: 618 },
                          { slot: groupSlots[12], num: 13, y: 675 },
                          { slot: groupSlots[13], num: 14, y: 728 },
                          { slot: groupSlots[14], num: 15, y: 785 },
                        ].map((item) => {
                          const s = item.slot;
                          return (
                            <div key={`draw-k15-slot-${item.num}`} style={{ position: 'absolute', left: '20px', top: `${item.y}px`, width: '210px', height: '42px' }} className="z-10">
                              {s ? (
                                <button type="button" onClick={() => handleSlotClick(s)} className={`w-full h-full p-1.5 rounded-lg border-2 text-left transition-all flex items-center justify-between gap-1 shadow-xs ${item.highlight ? 'bg-emerald-950 text-white border-emerald-400' : 'bg-blue-950 text-white border-amber-400'} hover:opacity-90`}>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className={`w-5 h-5 rounded font-black text-[10px] flex items-center justify-center font-mono shrink-0 ${item.highlight ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-blue-950'}`}>{s.slotId}</span>
                                    {s.assignedTeam && <span className="text-xs shrink-0">{getTeamEmblem(s.assignedTeam, registrations)}</span>}
                                    <span className="font-bold text-[10.5px] truncate">{s.assignedTeam ? `Lớp ${s.assignedTeam}` : `Vị trí ${s.slotId}`}</span>
                                  </div>
                                  <span className="text-[9px] opacity-75 shrink-0 font-bold">{s.assignedTeam ? 'Đổi' : 'Chọn'}</span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Column 2: 7 Round 1 Matches */}
                        {[
                          { title: 'Trận 1 (Vòng loại)', y: 34, tA: 'Đội 2', tB: 'Đội 3', time: '07:30' },
                          { title: 'Trận 2 (Vòng loại)', y: 144, tA: 'Đội 4', tB: 'Đội 5', time: '07:55' },
                          { title: 'Trận 3 (Vòng loại)', y: 254, tA: 'Đội 6', tB: 'Đội 7', time: '08:20' },
                          { title: 'Trận 4 (Vòng loại)', y: 364, tA: 'Đội 8', tB: 'Đội 9', time: '08:45' },
                          { title: 'Trận 5 (Vòng loại)', y: 474, tA: 'Đội 10', tB: 'Đội 11', time: '09:10' },
                          { title: 'Trận 6 (Vòng loại)', y: 584, tA: 'Đội 12', tB: 'Đội 13', time: '09:35' },
                          { title: 'Trận 7 (Vòng loại)', y: 694, tA: 'Đội 14', tB: 'Đội 15', time: '10:00' },
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ position: 'absolute', left: '310px', top: `${m.y}px`, width: '230px', height: '58px' }} className="bg-white rounded-xl border-2 border-blue-700 shadow-sm p-1.5 flex flex-col justify-between text-xs z-10">
                            <div className="flex items-center justify-between text-[9.5px] font-black text-blue-950 border-b pb-0.5">
                              <span>{m.title}</span>
                              <span className="text-[8.5px] bg-blue-100 text-blue-950 px-1 rounded font-mono font-bold">{m.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx * 2 + 1]?.assignedTeam ? `Lớp ${groupSlots[mIdx * 2 + 1].assignedTeam}` : m.tA}</span>
                              <span className="text-[8.5px] text-blue-900 font-mono font-bold">M{mIdx+1}A</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx * 2 + 2]?.assignedTeam ? `Lớp ${groupSlots[mIdx * 2 + 2].assignedTeam}` : m.tB}</span>
                              <span className="text-[8.5px] text-blue-900 font-mono font-bold">M{mIdx+1}B</span>
                            </div>
                          </div>
                        ))}

                        {/* Column 3: 4 Quarterfinals */}
                        {[
                          { title: 'Tứ kết 1', y: 89, tA: 'Đội 1 (Miễn vòng)', tB: 'Thắng Trận 1', time: '11:00' },
                          { title: 'Tứ kết 2', y: 309, tA: 'Thắng Trận 2', tB: 'Thắng Trận 3', time: '11:30' },
                          { title: 'Tứ kết 3', y: 529, tA: 'Thắng Trận 4', tB: 'Thắng Trận 5', time: '12:00' },
                          { title: 'Tứ kết 4', y: 749, tA: 'Thắng Trận 6', tB: 'Thắng Trận 7', time: '12:30' },
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ position: 'absolute', left: '620px', top: `${m.y}px`, width: '230px', height: '60px' }} className="bg-white rounded-xl border-2 border-indigo-700 shadow-md p-2 flex flex-col justify-between text-xs z-10">
                            <div className="flex items-center justify-between text-[10px] font-black text-indigo-950 border-b pb-0.5">
                              <span>{m.title} ({gName})</span>
                              <span className="text-[9px] bg-indigo-100 text-indigo-950 px-1 rounded font-mono font-bold">{m.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{m.tA}</span>
                              <span className="text-[9px] text-indigo-900 font-mono font-bold">Q{mIdx+1}A</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{m.tB}</span>
                              <span className="text-[9px] text-indigo-900 font-mono font-bold">Q{mIdx+1}B</span>
                            </div>
                          </div>
                        ))}

                        {/* Column 4: 2 Semifinals */}
                        <div style={{ position: 'absolute', left: '930px', top: '196px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-900 shadow-lg p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 1 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">14:00</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 1</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF1-A</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 2</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF1-B</span>
                          </div>
                        </div>

                        <div style={{ position: 'absolute', left: '930px', top: '636px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-900 shadow-lg p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 2 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">14:45</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 3</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF2-A</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 4</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">SF2-B</span>
                          </div>
                        </div>

                        {/* Column 5: Final & Winner */}
                        <div style={{ position: 'absolute', left: '1220px', top: '330px', width: '210px' }} className="space-y-3 z-10">
                          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-xl space-y-2">
                            <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                              <span>CHUNG KẾT {gName}</span>
                              <span className="text-slate-300 font-mono">16:00</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 1</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK1</span>
                            </div>
                            <div className="text-center text-[9px] font-black text-amber-400 font-mono">VS</div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 2</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK2</span>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-3 rounded-2xl border-2 border-amber-300 shadow-lg text-center space-y-1">
                            <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-950" />
                              <span>QUÁN QUÂN {gName}</span>
                            </div>
                            <div className="text-[10px] font-bold bg-blue-950 text-amber-300 py-1 px-2 rounded-lg font-mono">
                              Vào Vòng Chung Kết Toàn Trường 🏆
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : totalInGroup === -8 ? (
                      /* =================== 8-TEAM CANONICAL POWER-OF-2 VECTOR TREE =================== */
                      <div style={{ width: '1160px', height: '520px' }} className="relative mx-auto bg-slate-50/60 rounded-3xl p-4 border border-blue-200">
                        {/* SVG Vector Connecting Lines Layer for 8 Teams */}
                        <svg width={1160} height={520} className="absolute inset-0 pointer-events-none z-0" style={{ shapeRendering: 'geometricPrecision' }}>
                          <defs>
                            <marker id="idraw8-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1d4ed8" />
                            </marker>
                            <marker id="idraw8-arr-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                            </marker>
                          </defs>

                          {/* Trận 1: Slot 1 (Y=44) & Slot 8 (Y=102) -> Match 1 (Y=73) -> Semifinal 1 (Y=133) */}
                          <path d="M 260 44 H 310 V 102 H 260 M 310 73 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 44 H 310 V 102 H 260 M 310 73 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-blue)" />

                          {/* Trận 2: Slot 4 (Y=164) & Slot 5 (Y=222) -> Match 2 (Y=193) -> Semifinal 1 (Y=133) */}
                          <path d="M 260 164 H 310 V 222 H 260 M 310 193 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 164 H 310 V 222 H 260 M 310 193 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-blue)" />

                          {/* Match 1 (Y=73) & Match 2 (Y=193) -> Semifinal 1 (Y=133) */}
                          <path d="M 590 73 H 630 V 193 H 590 M 630 133 H 670" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 590 73 H 630 V 193 H 590 M 630 133 H 670" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-blue)" />

                          {/* Trận 3: Slot 2 (Y=284) & Slot 7 (Y=342) -> Match 3 (Y=313) -> Semifinal 2 (Y=373) */}
                          <path d="M 260 284 H 310 V 342 H 260 M 310 313 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 284 H 310 V 342 H 260 M 310 313 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-blue)" />

                          {/* Trận 4: Slot 3 (Y=404) & Slot 6 (Y=462) -> Match 4 (Y=433) -> Semifinal 2 (Y=373) */}
                          <path d="M 260 404 H 310 V 462 H 260 M 310 433 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 404 H 310 V 462 H 260 M 310 433 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-blue)" />

                          {/* Match 3 (Y=313) & Match 4 (Y=433) -> Semifinal 2 (Y=373) */}
                          <path d="M 590 313 H 630 V 433 H 590 M 630 373 H 670" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 590 313 H 630 V 433 H 590 M 630 373 H 670" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-blue)" />

                          {/* Semifinal 1 (Y=133) & Semifinal 2 (Y=373) -> Final (Y=253) */}
                          <path d="M 900 133 H 930 V 373 H 900 M 930 253 H 970" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 900 133 H 930 V 373 H 900 M 930 253 H 970" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw8-arr-gold)" />

                          {/* Final (Y=253) -> Winner stage */}
                          <path d="M 1110 253 H 1140" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 1110 253 H 1140" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw8-arr-gold)" />
                        </svg>

                        {/* Column 1: 8 Slots (left: 20px) */}
                        {[
                          { slot: groupSlots[0], num: 1, y: 20 },
                          { slot: groupSlots[7], num: 8, y: 78 },
                          { slot: groupSlots[3], num: 4, y: 140 },
                          { slot: groupSlots[4], num: 5, y: 198 },
                          { slot: groupSlots[1], num: 2, y: 260 },
                          { slot: groupSlots[6], num: 7, y: 318 },
                          { slot: groupSlots[2], num: 3, y: 380 },
                          { slot: groupSlots[5], num: 6, y: 438 },
                        ].map((item) => {
                          const s = item.slot;
                          return (
                            <div
                              key={`draw-k8-slot-${item.num}`}
                              style={{ position: 'absolute', left: '20px', top: `${item.y}px`, width: '240px', height: '48px' }}
                              className="z-10"
                            >
                              {s ? (
                                <button
                                  type="button"
                                  onClick={() => handleSlotClick(s)}
                                  className="w-full h-full p-2 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 shadow-sm bg-blue-950 text-white border-amber-400 hover:bg-blue-900"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center font-mono shrink-0 bg-amber-400 text-blue-950">
                                      {s.slotId}
                                    </span>
                                    {s.assignedTeam && (
                                      <span className="text-sm shrink-0">{getTeamEmblem(s.assignedTeam, registrations)}</span>
                                    )}
                                    <div className="flex flex-col truncate">
                                      <span className="font-bold text-xs truncate">
                                        {s.assignedTeam ? `Lớp ${s.assignedTeam}` : `🎲 Vị trí ${s.slotId}`}
                                      </span>
                                      <span className="text-[8.5px] truncate font-medium text-amber-300">
                                        Vòng Tứ Kết
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] opacity-75 shrink-0 font-bold">
                                    {s.assignedTeam ? 'Đổi' : 'Chọn'}
                                  </span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Column 2: 4 Quarterfinal Matches (left: 360px, width: 230px) */}
                        {[
                          { title: 'Trận 1 (Tứ kết)', y: 42, tA: 'Đội 1', tB: 'Đội 8', time: '08:00' },
                          { title: 'Trận 2 (Tứ kết)', y: 162, tA: 'Đội 4', tB: 'Đội 5', time: '08:40' },
                          { title: 'Trận 3 (Tứ kết)', y: 282, tA: 'Đội 2', tB: 'Đội 7', time: '09:20' },
                          { title: 'Trận 4 (Tứ kết)', y: 402, tA: 'Đội 3', tB: 'Đội 6', time: '10:00' },
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ position: 'absolute', left: '360px', top: `${m.y}px`, width: '230px', height: '62px' }} className="bg-white rounded-xl border-2 border-blue-700 shadow-md p-2 flex flex-col justify-between text-xs z-10">
                            <div className="flex items-center justify-between text-[10px] font-black text-blue-950 border-b pb-0.5">
                              <span>{m.title}</span>
                              <span className="text-[9px] bg-blue-100 text-blue-950 px-1 rounded font-mono font-bold">{m.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx === 0 ? 0 : mIdx === 1 ? 3 : mIdx === 2 ? 1 : 2]?.assignedTeam ? `Lớp ${groupSlots[mIdx === 0 ? 0 : mIdx === 1 ? 3 : mIdx === 2 ? 1 : 2].assignedTeam}` : m.tA}</span>
                              <span className="text-[9px] text-blue-900 font-mono font-bold">Q{mIdx*2+1}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx === 0 ? 7 : mIdx === 1 ? 4 : mIdx === 2 ? 6 : 5]?.assignedTeam ? `Lớp ${groupSlots[mIdx === 0 ? 7 : mIdx === 1 ? 4 : mIdx === 2 ? 6 : 5].assignedTeam}` : m.tB}</span>
                              <span className="text-[9px] text-blue-900 font-mono font-bold">Q{mIdx*2+2}</span>
                            </div>
                          </div>
                        ))}

                        {/* Column 3: 2 Semifinals (left: 670px, width: 230px) */}
                        <div style={{ position: 'absolute', left: '670px', top: '99px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 1 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">13:30</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Trận 1</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W1</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Trận 2</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W2</span>
                          </div>
                        </div>

                        <div style={{ position: 'absolute', left: '670px', top: '339px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 2 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">14:15</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Trận 3</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W3</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Trận 4</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W4</span>
                          </div>
                        </div>

                        {/* Column 4: Final & Winner (left: 970px, width: 180px) */}
                        <div style={{ position: 'absolute', left: '970px', top: '140px', width: '180px' }} className="space-y-3 z-10">
                          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-xl space-y-2">
                            <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                              <span>CHUNG KẾT {gName}</span>
                              <span className="text-slate-300 font-mono">15:30</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 1</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK1</span>
                            </div>
                            <div className="text-center text-[9px] font-black text-amber-400 font-mono">VS</div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 2</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK2</span>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-3 rounded-2xl border-2 border-amber-300 shadow-lg text-center space-y-1">
                            <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-950" />
                              <span>QUÁN QUÂN {gName}</span>
                            </div>
                            <div className="text-[10px] font-bold bg-blue-950 text-amber-300 py-1 px-2 rounded-lg font-mono">
                              Vào Vòng Chung Kết Toàn Trường 🏆
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : totalInGroup === -7 ? (
                      /* =================== 7-TEAM CANONICAL VECTOR TREE (1 BYE, 3 QF MATCHES) =================== */
                      <div style={{ width: '1160px', height: '520px' }} className="relative mx-auto bg-slate-50/60 rounded-3xl p-4 border border-blue-200">
                        {/* SVG Vector Connecting Lines Layer for 7 Teams */}
                        <svg width={1160} height={520} className="absolute inset-0 pointer-events-none z-0" style={{ shapeRendering: 'geometricPrecision' }}>
                          <defs>
                            <marker id="idraw7-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1d4ed8" />
                            </marker>
                            <marker id="idraw7-arr-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                            </marker>
                            <marker id="idraw7-arr-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                            </marker>
                          </defs>

                          {/* Slot 1 (Y=46): Bye -> BK1 (x=360, Y=130) */}
                          <path d="M 260 46 H 360" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw7-arr-emerald)" />

                          {/* Tứ Kết 1: Slot 2 (Y=114) & Slot 7 (Y=174) -> Match 1 (Y=144) -> BK1 (x=360, Y=130) */}
                          <path d="M 260 114 H 310 V 174 H 260 M 310 144 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 114 H 310 V 174 H 260 M 310 144 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw7-arr-blue)" />

                          {/* Tứ Kết 2: Slot 3 (Y=234) & Slot 6 (Y=294) -> Match 2 (Y=264) -> BK2 (x=360, Y=340) */}
                          <path d="M 260 234 H 310 V 294 H 260 M 310 264 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 234 H 310 V 294 H 260 M 310 264 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw7-arr-blue)" />

                          {/* Tứ Kết 3: Slot 4 (Y=354) & Slot 5 (Y=414) -> Match 3 (Y=384) -> BK2 (x=360, Y=340) */}
                          <path d="M 260 354 H 310 V 414 H 260 M 310 384 H 360" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 354 H 310 V 414 H 260 M 310 384 H 360" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw7-arr-blue)" />

                          {/* BK1 (Y=130) & BK2 (Y=340) -> Final (Y=235) */}
                          <path d="M 590 130 H 630 V 340 H 590 M 630 235 H 670" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 590 130 H 630 V 340 H 590 M 630 235 H 670" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw7-arr-gold)" />

                          {/* Final -> Winner */}
                          <path d="M 900 235 H 930" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 900 235 H 930" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw7-arr-gold)" />
                        </svg>

                        {/* Column 1: 7 Slots */}
                        {[
                          { slot: groupSlots[0], num: 1, y: 24, note: '⭐ Miễn vòng (Vào thẳng BK1)', highlight: true },
                          { slot: groupSlots[1], num: 2, y: 92, note: 'Tứ kết 1' },
                          { slot: groupSlots[6], num: 7, y: 152, note: 'Tứ kết 1' },
                          { slot: groupSlots[2], num: 3, y: 212, note: 'Tứ kết 2' },
                          { slot: groupSlots[5], num: 6, y: 272, note: 'Tứ kết 2' },
                          { slot: groupSlots[3], num: 4, y: 332, note: 'Tứ kết 3' },
                          { slot: groupSlots[4], num: 5, y: 392, note: 'Tứ kết 3' },
                        ].map((item) => {
                          const s = item.slot;
                          return (
                            <div key={`draw-k7-slot-${item.num}`} style={{ position: 'absolute', left: '20px', top: `${item.y}px`, width: '240px', height: '44px' }} className="z-10">
                              {s ? (
                                <button type="button" onClick={() => handleSlotClick(s)} className={`w-full h-full p-2 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 shadow-sm ${s.assignedTeam ? (item.highlight ? 'bg-emerald-950 text-white border-emerald-400' : 'bg-blue-950 text-white border-amber-400') : 'bg-white text-slate-700 border-dashed border-slate-300'}`}>
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center font-mono shrink-0 ${item.highlight ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-blue-950'}`}>{s.slotId}</span>
                                    {s.assignedTeam && <span className="text-sm shrink-0">{getTeamEmblem(s.assignedTeam, registrations)}</span>}
                                    <div className="flex flex-col truncate">
                                      <span className="font-bold text-xs truncate">{s.assignedTeam ? `Lớp ${s.assignedTeam}` : `Vị trí ${s.slotId}`}</span>
                                      <span className={`text-[8.5px] truncate font-medium ${item.highlight ? 'text-emerald-300' : 'text-blue-300'}`}>{item.note}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] opacity-75 shrink-0 font-bold">{s.assignedTeam ? 'Đổi' : 'Chọn'}</span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Column 2: 3 QF Matches */}
                        {[
                          { title: 'Tứ kết 1', y: 114, tA: 'Đội 2', tB: 'Đội 7', time: '08:00' },
                          { title: 'Tứ kết 2', y: 234, tA: 'Đội 3', tB: 'Đội 6', time: '08:40' },
                          { title: 'Tứ kết 3', y: 354, tA: 'Đội 4', tB: 'Đội 5', time: '09:20' },
                        ].map((m, mIdx) => (
                          <div key={mIdx} style={{ position: 'absolute', left: '360px', top: `${m.y}px`, width: '230px', height: '62px' }} className="bg-white rounded-xl border-2 border-blue-700 shadow-md p-2 flex flex-col justify-between text-xs z-10">
                            <div className="flex items-center justify-between text-[10px] font-black text-blue-950 border-b pb-0.5">
                              <span>{m.title} ({gName})</span>
                              <span className="text-[9px] bg-blue-100 text-blue-950 px-1 rounded font-mono font-bold">{m.time}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx === 0 ? 1 : mIdx === 1 ? 2 : 3]?.assignedTeam ? `Lớp ${groupSlots[mIdx === 0 ? 1 : mIdx === 1 ? 2 : 3].assignedTeam}` : m.tA}</span>
                              <span className="text-[9px] text-blue-900 font-mono font-bold">Q{mIdx+1}A</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                              <span className="truncate">{groupSlots[mIdx === 0 ? 6 : mIdx === 1 ? 5 : 4]?.assignedTeam ? `Lớp ${groupSlots[mIdx === 0 ? 6 : mIdx === 1 ? 5 : 4].assignedTeam}` : m.tB}</span>
                              <span className="text-[9px] text-blue-900 font-mono font-bold">Q{mIdx+1}B</span>
                            </div>
                          </div>
                        ))}

                        {/* Column 3: Semifinals */}
                        <div style={{ position: 'absolute', left: '670px', top: '96px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 1 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">13:30</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[0]?.assignedTeam ? `Lớp ${groupSlots[0].assignedTeam}` : 'Đội 1 (Miễn vòng)'}</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">A1</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 1</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W(Q1)</span>
                          </div>
                        </div>

                        <div style={{ position: 'absolute', left: '670px', top: '306px', width: '230px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 2 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">14:15</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 2</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W(Q2)</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Tứ Kết 3</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W(Q3)</span>
                          </div>
                        </div>

                        {/* Column 4: Final & Winner */}
                        <div style={{ position: 'absolute', left: '930px', top: '140px', width: '210px' }} className="space-y-3 z-10">
                          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-xl space-y-2">
                            <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                              <span>CHUNG KẾT {gName}</span>
                              <span className="text-slate-300 font-mono">15:30</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 1</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK1</span>
                            </div>
                            <div className="text-center text-[9px] font-black text-amber-400 font-mono">VS</div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 2</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK2</span>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-3 rounded-2xl border-2 border-amber-300 shadow-lg text-center space-y-1">
                            <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-950" />
                              <span>QUÁN QUÂN {gName}</span>
                            </div>
                            <div className="text-[10px] font-bold bg-blue-950 text-amber-300 py-1 px-2 rounded-lg font-mono">
                              Vào Vòng Chung Kết Toàn Trường 🏆
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : totalInGroup === -6 ? (
                      /* =================== 6-TEAM CANONICAL VECTOR TREE =================== */
                      <div style={{ width: '1100px', height: '480px' }} className="relative mx-auto bg-slate-50/60 rounded-3xl p-4 border border-blue-200">
                        {/* SVG Vector Lines for 6 Teams */}
                        <svg width={1100} height={480} className="absolute inset-0 pointer-events-none z-0" style={{ shapeRendering: 'geometricPrecision' }}>
                          <defs>
                            <marker id="idraw6-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1d4ed8" />
                            </marker>
                            <marker id="idraw6-arr-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                            </marker>
                            <marker id="idraw6-arr-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                            </marker>
                          </defs>

                          {/* Slot 1: Bye -> BK1 (x=370, Y=90) */}
                          <path d="M 260 55 H 370" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw6-arr-emerald)" />

                          {/* Trận 1: Slot 3 (Y=160) & Slot 6 (Y=240) -> BK1 (x=370, Y=200) */}
                          <path d="M 260 160 H 310 V 240 H 260 M 310 200 H 370" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 160 H 310 V 240 H 260 M 310 200 H 370" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw6-arr-blue)" />

                          {/* Trận 2: Slot 4 (Y=295) & Slot 5 (Y=370) -> BK2 (x=370, Y=332) */}
                          <path d="M 260 295 H 310 V 370 H 260 M 310 332 H 370" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 295 H 310 V 370 H 260 M 310 332 H 370" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw6-arr-blue)" />

                          {/* Slot 2: Bye -> BK2 (x=370, Y=430) */}
                          <path d="M 260 430 H 370" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw6-arr-emerald)" />

                          {/* BK1 & BK2 -> Chung Kết */}
                          <path d="M 620 145 H 680 V 300 H 620 M 680 222 H 730" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 620 145 H 680 V 300 H 620 M 680 222 H 730" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw6-arr-gold)" />

                          {/* Chung Kết -> Quán Quân */}
                          <path d="M 960 222 H 990" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 960 222 H 990" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw6-arr-gold)" />
                        </svg>

                        {/* Column 1: 6 Slots */}
                        {[
                          { slot: groupSlots[0], num: 1, y: 32, note: '⭐ Miễn vòng (Vào thẳng BK1)', highlight: true },
                          { slot: groupSlots[1], num: 2, y: 104, note: '⭐ Miễn vòng (Vào thẳng BK2)', highlight: true },
                          { slot: groupSlots[2], num: 3, y: 176, note: 'Đấu sơ loại' },
                          { slot: groupSlots[3], num: 4, y: 248, note: 'Đấu sơ loại' },
                          { slot: groupSlots[4], num: 5, y: 320, note: 'Đấu sơ loại' },
                          { slot: groupSlots[5], num: 6, y: 392, note: 'Đấu sơ loại' },
                        ].map((item) => {
                          const s = item.slot;
                          return (
                            <div key={`draw-k6-slot-${item.num}`} style={{ position: 'absolute', left: '20px', top: `${item.y}px`, width: '240px', height: '44px' }} className="z-10">
                              {s ? (
                                <button type="button" onClick={() => handleSlotClick(s)} className={`w-full h-full p-2 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 shadow-sm ${s.assignedTeam ? (item.highlight ? 'bg-emerald-950 text-white border-emerald-400' : 'bg-blue-950 text-white border-amber-400') : 'bg-white text-slate-700 border-dashed border-slate-300'}`}>
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center font-mono shrink-0 ${item.highlight ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-blue-950'}`}>{s.slotId}</span>
                                    {s.assignedTeam && <span className="text-sm shrink-0">{getTeamEmblem(s.assignedTeam, registrations)}</span>}
                                    <div className="flex flex-col truncate">
                                      <span className="font-bold text-xs truncate">{s.assignedTeam ? `Lớp ${s.assignedTeam}` : `Vị trí ${s.slotId}`}</span>
                                      <span className={`text-[8.5px] truncate font-medium ${item.highlight ? 'text-emerald-300' : 'text-blue-300'}`}>{item.note}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] opacity-75 shrink-0 font-bold">{s.assignedTeam ? 'Đổi' : 'Chọn'}</span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Column 2: Semifinals & Preliminary matches */}
                        {/* BK1 */}
                        <div style={{ position: 'absolute', left: '370px', top: '75px', width: '250px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 1 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1 rounded font-mono font-bold">13:30</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[0]?.assignedTeam ? `Lớp ${groupSlots[0].assignedTeam}` : 'Đội 1 (Miễn vòng)'}</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">A1</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Trận 1</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W1</span>
                          </div>
                        </div>

                        {/* Trận 1 */}
                        <div style={{ position: 'absolute', left: '370px', top: '165px', width: '250px', height: '62px' }} className="bg-amber-50 rounded-2xl border-2 border-amber-600 shadow-md p-2 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10px] font-black text-amber-950 border-b pb-0.5">
                            <span>TRẬN 1 (SƠ LOẠI)</span>
                            <span className="text-[9px] bg-amber-200 text-amber-950 px-1 rounded font-bold">08:00</span>
                          </div>
                          <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[2]?.assignedTeam ? `Lớp ${groupSlots[2].assignedTeam}` : 'Đội 3'}</span>
                            <span className="text-[9px] text-amber-900 font-mono font-bold">A3</span>
                          </div>
                          <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[5]?.assignedTeam ? `Lớp ${groupSlots[5].assignedTeam}` : 'Đội 6'}</span>
                            <span className="text-[9px] text-amber-900 font-mono font-bold">A6</span>
                          </div>
                        </div>

                        {/* Trận 2 */}
                        <div style={{ position: 'absolute', left: '370px', top: '255px', width: '250px', height: '62px' }} className="bg-amber-50 rounded-2xl border-2 border-amber-600 shadow-md p-2 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10px] font-black text-amber-950 border-b pb-0.5">
                            <span>TRẬN 2 (SƠ LOẠI)</span>
                            <span className="text-[9px] bg-amber-200 text-amber-950 px-1 rounded font-bold">08:40</span>
                          </div>
                          <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[3]?.assignedTeam ? `Lớp ${groupSlots[3].assignedTeam}` : 'Đội 4'}</span>
                            <span className="text-[9px] text-amber-900 font-mono font-bold">A4</span>
                          </div>
                          <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[4]?.assignedTeam ? `Lớp ${groupSlots[4].assignedTeam}` : 'Đội 5'}</span>
                            <span className="text-[9px] text-amber-900 font-mono font-bold">A5</span>
                          </div>
                        </div>

                        {/* BK2 */}
                        <div style={{ position: 'absolute', left: '370px', top: '345px', width: '250px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span>BÁN KẾT 2 ({gName})</span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1 rounded font-mono font-bold">14:15</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">Thắng Trận 2</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">W2</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[1]?.assignedTeam ? `Lớp ${groupSlots[1].assignedTeam}` : 'Đội 2 (Miễn vòng)'}</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">A2</span>
                          </div>
                        </div>

                        {/* Column 3: Final & Winner */}
                        <div style={{ position: 'absolute', left: '730px', top: '120px', width: '220px' }} className="space-y-3 z-10">
                          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-xl space-y-2">
                            <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                              <span>CHUNG KẾT {gName}</span>
                              <span className="text-slate-300 font-mono">15:30</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 1</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK1</span>
                            </div>
                            <div className="text-center text-[9px] font-black text-amber-400 font-mono">VS</div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 2</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK2</span>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-3 rounded-2xl border-2 border-amber-300 shadow-lg text-center space-y-1">
                            <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-950" />
                              <span>QUÁN QUÂN {gName}</span>
                            </div>
                            <div className="text-[10px] font-bold bg-blue-950 text-amber-300 py-1 px-2 rounded-lg font-mono">
                              Vào Vòng Chung Kết Toàn Trường 🏆
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : totalInGroup === -5 ? (
                      /* =================== 5-TEAM CANONICAL VECTOR TREE =================== */
                      <div style={{ width: '1080px', height: '470px' }} className="relative mx-auto bg-slate-50/60 rounded-3xl p-4 border border-blue-200">
                        {/* SVG Vector Connecting Lines Layer */}
                        <svg width={1080} height={470} className="absolute inset-0 pointer-events-none z-0" style={{ shapeRendering: 'geometricPrecision' }}>
                          <defs>
                            <marker id="idraw5-arr-blue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1d4ed8" />
                            </marker>
                            <marker id="idraw5-arr-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
                            </marker>
                            <marker id="idraw5-arr-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d97706" />
                            </marker>
                            <marker id="idraw5-arr-gold" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b45309" />
                            </marker>
                          </defs>

                          {/* Fork: Slot 1 (Y=52) & Slot 2 (Y=128) -> Bán Kết 1 (x=370, Y=90) */}
                          <path d="M 260 52 H 310 V 128 H 260 M 310 90 H 370" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 52 H 310 V 128 H 260 M 310 90 H 370" fill="none" stroke="#1d4ed8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw5-arr-blue)" />
                          <rect x="275" y="80" width="85" height="18" rx="4" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1" />
                          <text x="317" y="92" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">VÀO BK1</text>

                          {/* Slot 3: MIỄN VÒNG LOẠI ⭐ (Y=210) -> Bán Kết 2 (x=370, Y=210) */}
                          <path d="M 260 210 H 370" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 260 210 H 370" fill="none" stroke="#059669" strokeWidth="3.2" strokeLinecap="round" markerEnd="url(#idraw5-arr-emerald)" />
                          <rect x="270" y="200" width="92" height="18" rx="4" fill="#065f46" stroke="#6ee7b7" strokeWidth="1" />
                          <text x="316" y="212" textAnchor="middle" fill="#d1fae5" fontSize="8" fontWeight="bold">⭐ MIỄN VÒNG</text>

                          {/* Fork: Slot 4 (Y=295) & Slot 5 (Y=370) -> Vòng Sơ Loại ⚔️ (x=370, Y=332) */}
                          <path d="M 260 295 H 310 V 370 H 260 M 310 332 H 370" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 260 295 H 310 V 370 H 260 M 310 332 H 370" fill="none" stroke="#d97706" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw5-arr-amber)" />
                          <rect x="275" y="322" width="85" height="18" rx="4" fill="#78350f" stroke="#fde68a" strokeWidth="1" />
                          <text x="317" y="334" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">ĐẤU SƠ LOẠI</text>

                          {/* Sơ loại winner (x=620, Y=332) connects to Bán Kết 2 (x=620, Y=235) */}
                          <path d="M 620 332 H 660 V 235 H 620" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 620 332 H 660 V 235 H 620" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw5-arr-amber)" />

                          {/* Fork: Bán Kết 1 (x=620, Y=90) & Bán Kết 2 (x=620, Y=210) -> Chung Kết (x=730, Y=150) */}
                          <path d="M 620 90 H 680 V 210 H 620 M 680 150 H 730" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M 620 90 H 680 V 210 H 620 M 680 150 H 730" fill="none" stroke="#b45309" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#idraw5-arr-gold)" />

                          {/* Chung Kết (x=960, Y=150) -> Quán Quân Stage (x=990) */}
                          <path d="M 960 150 H 990" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                          <path d="M 960 150 H 990" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" markerEnd="url(#idraw5-arr-gold)" />
                        </svg>

                        {/* Column 1: 5 Slots (left: 20px, width: 240px) */}
                        {[
                          { slot: groupSlots[0], num: 1, y: 30, note: 'Vào thẳng Bán Kết 1' },
                          { slot: groupSlots[1], num: 2, y: 106, note: 'Vào thẳng Bán Kết 1' },
                          { slot: groupSlots[2], num: 3, y: 188, note: '⭐ Miễn vòng loại (Vào BK2)', highlight: true },
                          { slot: groupSlots[3], num: 4, y: 273, note: '⚔️ Đấu trước vòng sơ loại' },
                          { slot: groupSlots[4], num: 5, y: 348, note: '⚔️ Đấu trước vòng sơ loại' }
                        ].map((item) => {
                          const s = item.slot;
                          return (
                            <div
                              key={`draw-k5-slot-${item.num}`}
                              style={{ position: 'absolute', left: '20px', top: `${item.y}px`, width: '240px', height: '44px' }}
                              className="z-10"
                            >
                              {s ? (
                                <button
                                  type="button"
                                  onClick={() => handleSlotClick(s)}
                                  className={`w-full h-full p-2 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-2 shadow-sm ${
                                    s.assignedTeam
                                      ? item.highlight
                                        ? 'bg-emerald-950 text-white border-emerald-400'
                                        : 'bg-blue-950 text-white border-amber-400'
                                      : item.highlight
                                      ? 'bg-emerald-50 text-emerald-900 border-dashed border-emerald-400 hover:border-emerald-600'
                                      : 'bg-white text-slate-700 border-dashed border-slate-300 hover:border-blue-900'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center font-mono shrink-0 ${
                                      item.highlight ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-blue-950'
                                    }`}>
                                      {s.slotId}
                                    </span>
                                    {s.assignedTeam && (
                                      <span className="text-sm shrink-0">{getTeamEmblem(s.assignedTeam, registrations)}</span>
                                    )}
                                    <div className="flex flex-col truncate">
                                      <span className="font-bold text-xs truncate">
                                        {s.assignedTeam ? `Lớp ${s.assignedTeam}` : `🎲 Bốc thăm vị trí ${s.slotId}`}
                                      </span>
                                      <span className={`text-[8.5px] truncate font-medium ${item.highlight ? 'text-emerald-300' : 'text-blue-300'}`}>
                                        {item.note}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] opacity-75 shrink-0 font-bold">
                                    {s.assignedTeam ? 'Đổi' : 'Chọn'}
                                  </span>
                                </button>
                              ) : null}
                            </div>
                          );
                        })}

                        {/* Column 2: Bán Kết 1, Bán Kết 2 & Vòng Sơ Loại (left: 370px, width: 250px) */}
                        {/* Bán Kết 1 */}
                        <div style={{ position: 'absolute', left: '370px', top: '56px', width: '250px', height: '68px' }} className="bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-indigo-950 border-b pb-0.5">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-indigo-700 fill-indigo-700" />
                              <span>BÁN KẾT 1 ({gName})</span>
                            </span>
                            <span className="text-[9px] bg-blue-100 text-blue-950 px-1.5 rounded font-mono font-bold">13:30</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[0]?.assignedTeam ? `Lớp ${groupSlots[0].assignedTeam}` : 'Đội 1 (Vào thẳng)'}</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">A1</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[1]?.assignedTeam ? `Lớp ${groupSlots[1].assignedTeam}` : 'Đội 2 (Vào thẳng)'}</span>
                            <span className="text-[10px] text-indigo-900 font-mono font-bold">A2</span>
                          </div>
                        </div>

                        {/* Bán Kết 2 */}
                        <div style={{ position: 'absolute', left: '370px', top: '176px', width: '250px', height: '68px' }} className="bg-emerald-50/80 rounded-2xl border-2 border-emerald-700 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-emerald-950 border-b border-emerald-200 pb-0.5">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                              <span>BÁN KẾT 2 ({gName})</span>
                            </span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1.5 rounded font-mono font-bold">14:15</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-emerald-950">
                            <span className="truncate">{groupSlots[2]?.assignedTeam ? `Lớp ${groupSlots[2].assignedTeam}` : 'Đội 3 (⭐ Miễn vòng)'}</span>
                            <span className="text-[10px] text-emerald-800 font-mono font-bold">A3</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-amber-950">
                            <span className="truncate">Thắng Vòng Sơ Loại</span>
                            <span className="text-[10px] text-amber-800 font-mono font-bold">W(Sơ loại)</span>
                          </div>
                        </div>

                        {/* Vòng Sơ Loại */}
                        <div style={{ position: 'absolute', left: '370px', top: '298px', width: '250px', height: '68px' }} className="bg-amber-50/80 rounded-2xl border-2 border-amber-600 shadow-md p-2.5 flex flex-col justify-between text-xs z-10">
                          <div className="flex items-center justify-between text-[10.5px] font-black text-amber-950 border-b border-amber-200 pb-0.5">
                            <span className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3 text-amber-700" />
                              <span>VÒNG SƠ LOẠI (PLAYOFF)</span>
                            </span>
                            <span className="text-[9px] bg-amber-200 text-amber-950 px-1.5 rounded font-bold">ĐẤU TRƯỚC</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[3]?.assignedTeam ? `Lớp ${groupSlots[3].assignedTeam}` : 'Đội 4'}</span>
                            <span className="text-[10px] text-amber-900 font-mono font-bold">A4</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-800">
                            <span className="truncate">{groupSlots[4]?.assignedTeam ? `Lớp ${groupSlots[4].assignedTeam}` : 'Đội 5'}</span>
                            <span className="text-[10px] text-amber-900 font-mono font-bold">A5</span>
                          </div>
                        </div>

                        {/* Column 3: Chung Kết & Quán Quân (left: 730px, width: 230px) */}
                        <div style={{ position: 'absolute', left: '730px', top: '106px', width: '230px' }} className="space-y-3 z-10">
                          {/* Chung Kết */}
                          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 rounded-2xl border-2 border-amber-400 shadow-xl space-y-2">
                            <div className="text-[10px] font-bold text-amber-300 uppercase flex justify-between">
                              <span>CHUNG KẾT {gName}</span>
                              <span className="text-slate-300 font-mono">15:30</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 1</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK1</span>
                            </div>
                            <div className="text-center text-[9px] font-black text-amber-400 font-mono">VS</div>
                            <div className="p-1.5 rounded-xl bg-white/10 border border-white/20 text-xs font-bold flex items-center justify-between">
                              <span className="truncate">Thắng Bán Kết 2</span>
                              <span className="text-[9px] text-amber-300 font-mono font-bold">BK2</span>
                            </div>
                          </div>

                          {/* Quán Quân */}
                          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 p-3 rounded-2xl border-2 border-amber-300 shadow-lg text-center space-y-1">
                            <div className="font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award className="w-4 h-4 text-blue-950" />
                              <span>QUÁN QUÂN {gName}</span>
                            </div>
                            <div className="text-[10px] font-bold bg-blue-950 text-amber-300 py-1 px-2 rounded-lg font-mono">
                              Vào Vòng Chung Kết Toàn Trường 🏆
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : (
                      /* =================== UNIFIED SINGLE-BRANCH LEFT-TO-RIGHT VECTOR TREE (ALL ROUNDS TO FINAL) =================== */
                      (() => {
                        const N = Math.max(2, totalInGroup);
                        const SLOT_W = 240;
                        const SLOT_H = 44;
                        const SLOT_X = 24;

                        const CARD_W = 225;
                        const CARD_H = 66;
                        const COL_START_X = 330;
                        const COL_STEP_X = 290;

                        const PAIR_PITCH = 128;
                        const INTRA_PAIR_GAP = 60;
                        const TOP_OFFSET = 50;

                        const slotItems = groupSlots.map((s, idx) => {
                          const pairIdx = Math.floor(idx / 2);
                          const isSecond = idx % 2 === 1;
                          const isOddSingle = idx === N - 1 && !isSecond;
                          const topY = isOddSingle
                            ? TOP_OFFSET + pairIdx * PAIR_PITCH + INTRA_PAIR_GAP / 2
                            : TOP_OFFSET + pairIdx * PAIR_PITCH + (isSecond ? INTRA_PAIR_GAP : 0);
                          return {
                            slot: s,
                            index: idx + 1,
                            x: SLOT_X,
                            y: topY,
                            w: SLOT_W,
                            h: SLOT_H,
                            centerY: topY + SLOT_H / 2,
                          };
                        });

                        const getRoundMeta = (matchCount: number, rIdx: number, totalR: number) => {
                          const remainingAfter = totalR - 1 - rIdx;
                          if (remainingAfter === 0) {
                            return {
                              colHeader: 'CHUNG KẾT',
                              cardTitle: () => 'CHUNG KẾT VÔ ĐỊCH',
                              shortCode: () => 'CK',
                            };
                          }
                          if (remainingAfter === 1) {
                            return {
                              colHeader: 'VÒNG BÁN KẾT',
                              cardTitle: (m: number) => `BÁN KẾT ${m}`,
                              shortCode: (m: number) => `BK${m}`,
                            };
                          }
                          if (remainingAfter === 2) {
                            return {
                              colHeader: 'VÒNG TỨ KẾT',
                              cardTitle: (m: number) => `Tứ Kết ${m}`,
                              shortCode: (m: number) => `TK${m}`,
                            };
                          }
                          if (remainingAfter === 3) {
                            return {
                              colHeader: 'VÒNG 1/8',
                              cardTitle: (m: number) => `Vòng 1/8 (${m})`,
                              shortCode: (m: number) => `R${m}`,
                            };
                          }
                          if (remainingAfter === 4) {
                            return {
                              colHeader: 'VÒNG 1/16',
                              cardTitle: (m: number) => `Vòng 1/16 (${m})`,
                              shortCode: (m: number) => `V16.${m}`,
                            };
                          }
                          return {
                            colHeader: `VÒNG LOẠI (${matchCount} TRẬN)`,
                            cardTitle: (m: number) => `Vòng Loại (${m})`,
                            shortCode: (m: number) => `VL${m}`,
                          };
                        };

                        let tempCount = N;
                        let totalRoundsCount = 0;
                        while (tempCount > 1) {
                          tempCount = Math.ceil(tempCount / 2);
                          totalRoundsCount++;
                        }
                        totalRoundsCount = Math.max(1, totalRoundsCount);

                        interface DrawRoundMatchNode {
                          roundIdx: number;
                          matchIdx: number;
                          title: string;
                          shortCode: string;
                          matchupText: string;
                          isByeAdvance: boolean;
                          x: number;
                          y: number;
                          w: number;
                          h: number;
                          centerY: number;
                          sourceTopY: number;
                          sourceBotY?: number;
                          sourceRightX: number;
                        }

                        const rounds: DrawRoundMatchNode[][] = [];
                        const colHeaders: { x: number; w: number; label: string; isFinal?: boolean }[] = [
                          { x: SLOT_X, w: SLOT_W, label: `DANH SÁCH ĐỘI (${N} ĐỘI)` },
                        ];

                        for (let r = 0; r < totalRoundsCount; r++) {
                          const prevCount = r === 0 ? slotItems.length : rounds[r - 1].length;
                          const matchCount = Math.ceil(prevCount / 2);
                          const meta = getRoundMeta(matchCount, r, totalRoundsCount);
                          const colX = COL_START_X + r * COL_STEP_X;

                          colHeaders.push({
                            x: colX,
                            w: CARD_W,
                            label: meta.colHeader,
                            isFinal: r === totalRoundsCount - 1,
                          });

                          const currentNodes: DrawRoundMatchNode[] = [];
                          for (let m = 0; m < matchCount; m++) {
                            const idxA = m * 2;
                            const idxB = m * 2 + 1;

                            if (r === 0) {
                              const sA = slotItems[idxA];
                              const sB = idxB < slotItems.length ? slotItems[idxB] : undefined;
                              const centerY = sB ? (sA.centerY + sB.centerY) / 2 : sA.centerY;
                              const topY = centerY - CARD_H / 2;

                              const labelA = sA.slot?.assignedTeam || `Đội ${sA.index}`;
                              const labelB = sB ? sB.slot?.assignedTeam || `Đội ${sB.index}` : null;
                              const matchupText = sB
                                ? `${labelA} vs ${labelB}`
                                : `${labelA} (Miễn đấu / Vào thẳng)`;

                              currentNodes.push({
                                roundIdx: r,
                                matchIdx: m,
                                title: meta.cardTitle(m + 1),
                                shortCode: meta.shortCode(m + 1),
                                matchupText,
                                isByeAdvance: !sB,
                                x: colX,
                                y: topY,
                                w: CARD_W,
                                h: CARD_H,
                                centerY,
                                sourceTopY: sA.centerY,
                                sourceBotY: sB?.centerY,
                                sourceRightX: SLOT_X + SLOT_W,
                              });
                            } else {
                              const prevRound = rounds[r - 1];
                              const pA = prevRound[idxA];
                              const pB = idxB < prevRound.length ? prevRound[idxB] : undefined;
                              const centerY = pB ? (pA.centerY + pB.centerY) / 2 : pA.centerY;
                              const topY = centerY - CARD_H / 2;

                              const refA = pA.isByeAdvance ? pA.matchupText.replace(' (Miễn đấu / Vào thẳng)', '') : `Thắng ${pA.shortCode}`;
                              const refB = pB
                                ? pB.isByeAdvance
                                  ? pB.matchupText.replace(' (Miễn đấu / Vào thẳng)', '')
                                  : `Thắng ${pB.shortCode}`
                                : null;

                              const matchupText = refB
                                ? `${refA} vs ${refB}`
                                : `${refA} (Vào thẳng vòng sau)`;

                              currentNodes.push({
                                roundIdx: r,
                                matchIdx: m,
                                title: meta.cardTitle(m + 1),
                                shortCode: meta.shortCode(m + 1),
                                matchupText,
                                isByeAdvance: !pB,
                                x: colX,
                                y: topY,
                                w: CARD_W,
                                h: CARD_H,
                                centerY,
                                sourceTopY: pA.centerY,
                                sourceBotY: pB?.centerY,
                                sourceRightX: pA.x + pA.w,
                              });
                            }
                          }
                          rounds.push(currentNodes);
                        }

                        const finalNode = rounds[rounds.length - 1][0];
                        const champX = finalNode.x + finalNode.w + 55;
                        const champW = 195;
                        const champH = 74;
                        const champY = finalNode.centerY - champH / 2;

                        const canvasWidth = champX + champW + 35;
                        const lastSlotBottom = slotItems.length > 0 ? slotItems[slotItems.length - 1].y + SLOT_H : 360;
                        const canvasHeight = Math.max(400, lastSlotBottom + 55);

                        return (
                          <div
                            style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
                            className="relative mx-auto bg-slate-50/70 rounded-3xl p-4 border border-slate-200/90"
                          >
                            {/* Top Column Badges */}
                            {colHeaders.map((col, cIdx) => (
                              <div
                                key={`draw-col-hdr-${gIdx}-${cIdx}`}
                                style={{ position: 'absolute', left: `${col.x}px`, top: '10px', width: `${col.w}px` }}
                                className="flex justify-center z-10"
                              >
                                <span
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs border ${
                                    cIdx === 0
                                      ? 'bg-slate-900 text-white border-slate-800'
                                      : col.isFinal
                                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-400'
                                      : 'bg-blue-50 text-blue-900 border-blue-200'
                                  }`}
                                >
                                  {col.label}
                                </span>
                              </div>
                            ))}

                            {/* SVG Vector Connecting Lines Layer */}
                            <svg
                              width={canvasWidth}
                              height={canvasHeight}
                              className="absolute inset-0 pointer-events-none z-0"
                              style={{ shapeRendering: 'geometricPrecision' }}
                            >
                              <defs>
                                <marker
                                  id={`idraw-arr-blue-${gIdx}`}
                                  viewBox="0 0 10 10"
                                  refX="8"
                                  refY="5"
                                  markerWidth="6"
                                  markerHeight="6"
                                  orient="auto-start-reverse"
                                >
                                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#2563eb" />
                                </marker>
                                <marker
                                  id={`idraw-arr-indigo-${gIdx}`}
                                  viewBox="0 0 10 10"
                                  refX="8"
                                  refY="5"
                                  markerWidth="6"
                                  markerHeight="6"
                                  orient="auto-start-reverse"
                                >
                                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#4f46e5" />
                                </marker>
                                <marker
                                  id={`idraw-arr-gold-${gIdx}`}
                                  viewBox="0 0 10 10"
                                  refX="8"
                                  refY="5"
                                  markerWidth="6"
                                  markerHeight="6"
                                  orient="auto-start-reverse"
                                >
                                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#b45309" />
                                </marker>
                              </defs>

                              {rounds.map((rNodes, rIdx) =>
                                rNodes.map((node) => {
                                  const startX = node.sourceRightX;
                                  const endX = node.x;
                                  const midX = Math.round(startX + (endX - startX) * 0.5);
                                  const isFinalRound = rIdx === rounds.length - 1;
                                  const strokeColor = isFinalRound ? '#b45309' : rIdx === 0 ? '#2563eb' : '#4f46e5';
                                  const markerUrl = isFinalRound
                                    ? `url(#idraw-arr-gold-${gIdx})`
                                    : rIdx === 0
                                    ? `url(#idraw-arr-blue-${gIdx})`
                                    : `url(#idraw-arr-indigo-${gIdx})`;

                                  if (node.sourceBotY !== undefined) {
                                    const d = `M ${startX} ${node.sourceTopY} H ${midX} V ${node.sourceBotY} H ${startX} M ${midX} ${node.centerY} H ${endX - 2}`;
                                    return (
                                      <g key={`draw-conn-${gIdx}-${rIdx}-${node.matchIdx}`}>
                                        <path
                                          d={d}
                                          fill="none"
                                          stroke="#ffffff"
                                          strokeWidth="6"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                        <path
                                          d={d}
                                          fill="none"
                                          stroke={strokeColor}
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          markerEnd={markerUrl}
                                        />
                                      </g>
                                    );
                                  } else {
                                    const d = `M ${startX} ${node.sourceTopY} H ${endX - 2}`;
                                    return (
                                      <g key={`draw-conn-single-${gIdx}-${rIdx}-${node.matchIdx}`}>
                                        <path d={d} fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                                        <path
                                          d={d}
                                          fill="none"
                                          stroke="#10b981"
                                          strokeWidth="2.5"
                                          strokeDasharray="6 4"
                                          strokeLinecap="round"
                                          markerEnd={markerUrl}
                                        />
                                      </g>
                                    );
                                  }
                                })
                              )}

                              {/* Final -> Champion connector */}
                              <path
                                d={`M ${finalNode.x + finalNode.w} ${finalNode.centerY} H ${champX - 2}`}
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="6"
                                strokeLinecap="round"
                              />
                              <path
                                d={`M ${finalNode.x + finalNode.w} ${finalNode.centerY} H ${champX - 2}`}
                                fill="none"
                                stroke="#b45309"
                                strokeWidth="3"
                                strokeLinecap="round"
                                markerEnd={`url(#idraw-arr-gold-${gIdx})`}
                              />
                            </svg>

                            {/* Column 0: Team Slot Buttons on the Left */}
                            {slotItems.map((item) => {
                              const s = item.slot;
                              const isSelected = activeSpinSlot?.slotId === s.slotId;
                              const isThisSpinning = isSpinning && activeSpinSlot?.slotId === s.slotId;
                              const displayTeam = isThisSpinning ? spinningDisplayText : s.assignedTeam;

                              return (
                                <div
                                  key={`draw-slot-${gIdx}-${s.slotId}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${item.x}px`,
                                    top: `${item.y}px`,
                                    width: `${item.w}px`,
                                    height: `${item.h}px`,
                                  }}
                                  className="z-10"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSlotClick(s)}
                                    className={`w-full h-full px-2.5 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-2 shadow-xs ${
                                      isThisSpinning
                                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-300 animate-pulse'
                                        : isSelected
                                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-300'
                                        : displayTeam
                                        ? 'bg-white border-slate-300 hover:border-blue-500'
                                        : 'bg-slate-50/95 border-dashed border-slate-300 hover:border-blue-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                                        {item.index}
                                      </span>
                                      {displayTeam ? (
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                          {getTeamEmblem(displayTeam, registrations)} {displayTeam}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-semibold text-slate-400 italic truncate">
                                          --- (Trống) ---
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9.5px] font-bold text-blue-700 shrink-0">
                                      {displayTeam ? 'Đổi' : 'Quay'}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}

                            {/* Match Columns from Left to Right */}
                            {rounds.map((rNodes, rIdx) =>
                              rNodes.map((node) => {
                                const isFinalRound = rIdx === rounds.length - 1;
                                const isSemiRound = rIdx === rounds.length - 2 && rounds.length >= 3;

                                return (
                                  <div
                                    key={`draw-match-${gIdx}-${rIdx}-${node.matchIdx}`}
                                    style={{
                                      position: 'absolute',
                                      left: `${node.x}px`,
                                      top: `${node.y}px`,
                                      width: `${node.w}px`,
                                      height: `${node.h}px`,
                                    }}
                                    className={`z-10 rounded-2xl border-2 px-3.5 py-2 flex flex-col justify-between shadow-sm ${
                                      isFinalRound
                                        ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50/80 border-amber-500 shadow-md'
                                        : node.isByeAdvance
                                        ? 'bg-emerald-50/80 border-emerald-500'
                                        : isSemiRound
                                        ? 'bg-indigo-50/60 border-indigo-500'
                                        : rIdx === 0
                                        ? 'bg-white border-blue-500'
                                        : 'bg-white border-indigo-400'
                                    }`}
                                  >
                                    <div
                                      className={`text-[11px] font-black pb-1 border-b truncate ${
                                        isFinalRound
                                          ? 'text-amber-900 border-amber-300 uppercase tracking-wide'
                                          : node.isByeAdvance
                                          ? 'text-emerald-900 border-emerald-200'
                                          : 'text-slate-900 border-slate-300'
                                      }`}
                                    >
                                      {node.title}
                                    </div>
                                    <div className="h-5" />
                                  </div>
                                );
                              })
                            )}

                            {/* Rightmost Champion Trophy Card */}
                            <div
                              style={{
                                position: 'absolute',
                                left: `${champX}px`,
                                top: `${champY}px`,
                                width: `${champW}px`,
                                height: `${champH}px`,
                              }}
                              className="z-10 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 p-3 shadow-lg flex flex-col justify-between text-center"
                            >
                              <div className="flex items-center justify-center gap-1.5 font-black text-xs uppercase tracking-wider border-b border-amber-600/30 pb-1">
                                <Award className="w-4 h-4 text-slate-950 shrink-0" />
                                <span>CÚP VÔ ĐỊCH 🏆</span>
                              </div>
                              <div className="h-5" />
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* 2. CARD GRID OVERVIEW (When toggled to Grid) */}
                {branchViewMode === 'grid' && (
                  <div className="overflow-x-auto py-2">
                    <div className="min-w-[860px] grid grid-cols-3 gap-6 items-center">
                      
                      {/* ROUND 1 */}
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

                      {/* ROUND 2 */}
                      <div className="space-y-4 pl-4 border-l-2 border-slate-200">
                        <div className="text-xs font-black uppercase text-blue-950 tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>Bán Kết & Chung Kết {gName}</span>
                        </div>

                        <div className="space-y-3">
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
                              <span>Thắng Trận 3 (Miễn vòng)</span>
                              <span className="text-[10px] text-blue-900 font-mono font-bold">W3</span>
                            </div>
                            <div className="text-center text-[10px] font-black text-slate-400">VS</div>
                            <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                              <span>Thắng Playoff (T4/T5)</span>
                              <span className="text-[10px] text-blue-900 font-mono font-bold">W(4/5)</span>
                            </div>
                          </div>

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
                      </div>

                      {/* ROUND 3 */}
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
                )}
              </div>
            );
          })}
      </div>

      {/* ============================================================== */}
      {/* FINAL ACTION BAR: CONFIRM & APPLY TO SCHEDULE                  */}
      {/* ============================================================== */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border-4 border-amber-400 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="space-y-2 flex-1 w-full">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-lg font-black text-amber-300">
              Hoàn Tất Bốc Thăm & Tạo Lịch Thi Đấu Riêng Lẻ
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
              Giải Độc Lập
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Giải đấu sẽ được lưu trữ riêng biệt với mã riêng, <strong>không nhập chung vào các giải khác</strong>.
          </p>
          <div className="pt-1 max-w-lg">
            <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
              Tên giải đấu riêng biệt này:
            </label>
            <input
              type="text"
              value={customTournamentName}
              onChange={(e) => setCustomTournamentName(e.target.value)}
              placeholder="VD: Giải Bóng Rổ Khối 10 THPT Phú Lâm..."
              className="w-full bg-slate-800 border-2 border-slate-600 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleConfirmAndApplyMatches}
            className="py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>✅ Tạo Giải Riêng Lẻ & Xem Sơ Đồ</span>
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
      {/* WIDE BROADCAST-GRADE LUCKY DRAW ROULETTE ARENA MODAL           */}
      {/* ============================================================== */}
      {activeSpinSlot && (() => {
        const currentGroupPool = groupPools[activeSpinSlot.groupName] || [];
        const assignedSet = getAssignedTeamsInGroup(activeSpinSlot.groupName);
        const unassignedList = getUnassignedTeamsForGroup(activeSpinSlot.groupName);
        const groupSlotsList = bracketSlots.filter((s) => s.groupName === activeSpinSlot.groupName);
        const filledInGroupCount = groupSlotsList.filter((s) => s.assignedTeam).length;
        const hasNextEmptySlot = groupSlotsList.some((s) => !s.assignedTeam && s.slotId !== activeSpinSlot.slotId);

        // Map teamName -> assigned slotId in this group
        const teamToSlotMap: Record<string, string> = {};
        groupSlotsList.forEach((s) => {
          if (s.assignedTeam) {
            teamToSlotMap[s.assignedTeam] = s.slotId;
          }
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
            <div className="bg-white border-4 border-amber-400 rounded-3xl w-full max-w-6xl shadow-[0_0_70px_rgba(251,191,36,0.3)] relative text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
              
              {/* 1. TOP ROYAL BLUE & GOLD BROADCAST HEADER */}
              <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 text-white px-5 py-4 sm:px-7 sm:py-5 border-b-4 border-amber-400 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute -top-12 -left-12 w-56 h-56 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 right-12 w-64 h-64 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

                <div className="space-y-1 relative z-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 px-3 py-1 rounded-full shadow-md">
                      <Sparkles className="w-3.5 h-3.5 text-blue-950 animate-spin" />
                      <span>SÂN KHẤU BỐC THĂM VỊ TRÍ {activeSpinSlot.slotId} · {activeSpinSlot.groupName}</span>
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-900/90 text-amber-300 border border-amber-400/40 font-mono">
                      Đã xếp: {filledInGroupCount}/{currentGroupPool.length} đội (Còn {unassignedList.length} đội chờ quay)
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-sans tracking-tight">
                    Quay Ngẫu Nhiên Đội Tuyển ({activeSpinSlot.groupName})
                  </h3>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center relative z-10">
                  {hasNextEmptySlot && !isSpinning && (
                    <button
                      type="button"
                      onClick={handleJumpToNextEmptySlot}
                      className="px-4 py-2.5 bg-blue-800/90 hover:bg-blue-700 text-amber-300 font-black text-xs rounded-xl border border-amber-400/50 shadow flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Vị Trí Trống Tiếp Theo</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSpinning) setActiveSpinSlot(null);
                    }}
                    disabled={isSpinning}
                    className="p-2.5 rounded-2xl bg-white/10 hover:bg-rose-500/90 text-white border border-white/20 transition-all disabled:opacity-30 cursor-pointer"
                    title="Đóng cửa sổ quay"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 2. QUICK SLOT NAVIGATION BAR (JUMP BETWEEN SLOTS A1..AN WITHOUT CLOSING MODAL) */}
              <div className="bg-slate-900 px-5 py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 shrink-0 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Chọn nhanh vị trí ({activeSpinSlot.groupName}):</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {groupSlotsList.map((s) => {
                    const isCurrent = s.slotId === activeSpinSlot.slotId;
                    const hasTeam = Boolean(s.assignedTeam);
                    return (
                      <button
                        key={s.slotId}
                        type="button"
                        disabled={isSpinning}
                        onClick={() => handleSlotClick(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                          isCurrent
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 ring-2 ring-white scale-105 shadow'
                            : hasTeam
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                        }`}
                        title={hasTeam ? `${s.slotId}: ${s.assignedTeam}` : `Vị trí ${s.slotId} (Chưa quay)`}
                      >
                        <span>{s.slotId}</span>
                        {hasTeam && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. MAIN WIDE 2-COLUMN BODY: LEFT = 3D SLOT STAGE, RIGHT = LIVE CANDIDATE GRID */}
              <div className="p-5 sm:p-7 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch bg-slate-50/70">
                
                {/* LEFT 5 COLUMNS: HIGH-IMPACT SLOT MACHINE & WINNER STAGE */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-blue-950 to-indigo-950 rounded-3xl p-6 border-4 border-amber-400 shadow-2xl relative overflow-hidden text-center min-h-[380px]">
                  {/* Animated decorative rings */}
                  <div
                    className={`w-72 h-72 rounded-full border-2 border-dashed border-amber-400/20 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
                      isSpinning ? 'animate-spin' : ''
                    }`}
                  />
                  <div
                    className={`w-96 h-96 rounded-full border border-blue-400/15 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${
                      isSpinning ? 'animate-ping' : ''
                    }`}
                  />

                  {/* Stage Status Badge */}
                  <div className="relative z-10 space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-inner">
                      {isSpinning ? (
                        <>
                          <Dices className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>🎰 ĐANG QUAY VÒNG BỐC THĂM...</span>
                        </>
                      ) : drawnWinner ? (
                        <>
                          <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
                          <span>🎉 CHÚC MỪNG ĐỘI TRÚNG THĂM VỊ TRÍ {activeSpinSlot.slotId}!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>SẴN SÀNG QUAY VỊ TRÍ {activeSpinSlot.slotId}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 3-ROW SLOT MACHINE WINDOW */}
                  <div className="relative z-10 my-5 space-y-2.5">
                    {/* Upper ghost slot row (visible while spinning) */}
                    <div
                      className={`h-9 rounded-xl border flex items-center justify-center px-4 text-xs font-bold transition-all duration-100 select-none ${
                        isSpinning && spinPrevText
                          ? 'bg-white/5 border-white/10 text-blue-200/60 scale-95 blur-[0.4px]'
                          : 'bg-white/5 border-transparent text-slate-500/40 scale-95'
                      }`}
                    >
                      <span className="truncate">
                        {isSpinning && spinPrevText ? formatTeamLabel(spinPrevText) : '• • • • • • • • •'}
                      </span>
                    </div>

                    {/* CENTER SPOTLIGHT REEL BOX */}
                    <div
                      className={`relative py-6 px-5 rounded-3xl border-3 transition-all duration-200 flex flex-col items-center justify-center gap-2 shadow-2xl ${
                        isSpinning
                          ? 'bg-gradient-to-r from-amber-500/25 via-blue-900/80 to-amber-500/25 border-amber-400 text-amber-300 scale-[1.03] shadow-[0_0_40px_rgba(251,191,36,0.45)]'
                          : drawnWinner
                          ? 'bg-gradient-to-br from-emerald-500/30 via-emerald-900/60 to-teal-900/70 border-emerald-400 text-emerald-200 scale-[1.03] shadow-[0_0_45px_rgba(16,185,129,0.5)]'
                          : 'bg-white/10 border-white/25 text-white'
                      }`}
                    >
                      {/* Side indicator arrows */}
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-black text-lg">
                        ▶
                      </div>
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 font-black text-lg">
                        ◀
                      </div>

                      {/* Emblem / Icon */}
                      <div className="flex items-center justify-center gap-2">
                        {isSpinning ? (
                          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center shadow-lg">
                            <Dices className="w-7 h-7 text-amber-300 animate-spin" />
                          </div>
                        ) : drawnWinner ? (
                          <div className="w-14 h-14 rounded-2xl bg-emerald-400/20 border-2 border-emerald-300 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                            {getTeamEmblem(drawnWinner, registrations)}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                            🎲
                          </div>
                        )}
                      </div>

                      {/* Main Team Name Display */}
                      <div
                        className={`text-xl sm:text-2xl md:text-3xl font-black font-sans tracking-tight leading-snug break-words max-w-full px-3 ${
                          isSpinning
                            ? 'text-amber-300'
                            : drawnWinner
                            ? 'text-white drop-shadow-[0_2px_10px_rgba(16,185,129,0.8)]'
                            : 'text-blue-100'
                        }`}
                      >
                        {formatTeamLabel(spinningDisplayText)}
                      </div>

                      {/* Position Confirmation Badge */}
                      {drawnWinner && !isSpinning && (
                        <div className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wide shadow-md">
                          <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
                          <span>Chính thức xếp vào Vị trí {activeSpinSlot.slotId} ({activeSpinSlot.groupName})</span>
                        </div>
                      )}
                    </div>

                    {/* Lower ghost slot row (visible while spinning) */}
                    <div
                      className={`h-9 rounded-xl border flex items-center justify-center px-4 text-xs font-bold transition-all duration-100 select-none ${
                        isSpinning && spinNextText
                          ? 'bg-white/5 border-white/10 text-blue-200/60 scale-95 blur-[0.4px]'
                          : 'bg-white/5 border-transparent text-slate-500/40 scale-95'
                      }`}
                    >
                      <span className="truncate">
                        {isSpinning && spinNextText ? formatTeamLabel(spinNextText) : '• • • • • • • • •'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons on Stage */}
                  <div className="relative z-10 space-y-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => triggerSpinForSlot(activeSpinSlot)}
                      disabled={isSpinning || (unassignedList.length === 0 && !activeSpinSlot.assignedTeam)}
                      className="w-full py-4 px-5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-[0_6px_25px_rgba(251,191,36,0.45)] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Shuffle className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
                      <span>
                        {isSpinning
                          ? 'ĐANG QUAY NGẪU NHIÊN...'
                          : drawnWinner
                          ? `🔄 QUAY LẠI VỊ TRÍ ${activeSpinSlot.slotId}`
                          : `🎲 BẮT ĐẦU QUAY ĐỘI ${activeSpinSlot.groupName}`}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      {hasNextEmptySlot ? (
                        <button
                          type="button"
                          onClick={handleJumpToNextEmptySlot}
                          disabled={isSpinning}
                          className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                          <span>Sang Ô Kế Tiếp</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="py-2.5 px-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đã đủ vị trí</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveSpinSlot(null)}
                        disabled={isSpinning}
                        className="py-2.5 px-4 bg-white/15 hover:bg-white/25 text-white border border-white/20 font-black text-xs uppercase tracking-wider rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Hoàn Tất / Đóng
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT 7 COLUMNS: EXPANDED CANDIDATE POOL GRID WITH LIVE SPOTLIGHTING */}
                <div className="lg:col-span-7 bg-white rounded-3xl border-2 border-slate-200 p-5 sm:p-6 flex flex-col justify-between shadow-md">
                  <div className="space-y-4">
                    {/* Pool Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-950 text-amber-400 font-black text-xs flex items-center justify-center shadow">
                          {currentGroupPool.length}
                        </span>
                        <div>
                          <h4 className="text-sm sm:text-base font-black text-blue-950 uppercase tracking-tight">
                            Danh Sách Đội Của {activeSpinSlot.groupName} ({currentGroupPool.length} Đội)
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Đèn vàng sẽ chạy ngẫu nhiên qua các đội chưa bốc thăm và dừng lại ở đội trúng vị trí <strong>{activeSpinSlot.slotId}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-blue-950">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-900 inline-block" />
                          Chưa quay ({unassignedList.length})
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          Đã có vị trí ({assignedSet.size})
                        </span>
                      </div>
                    </div>

                    {/* Wide Multi-Column Team Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {currentGroupPool.map((t, idx) => {
                        const assignedSlotId = teamToSlotMap[t];
                        const isAssignedToOther = Boolean(assignedSlotId && assignedSlotId !== activeSpinSlot.slotId);
                        const isCurrentSpinHighlight = isSpinning && spinningDisplayText === t;
                        const isThisWinner = !isSpinning && drawnWinner === t;

                        return (
                          <div
                            key={t}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-100 flex items-center justify-between gap-2 border-2 ${
                              isCurrentSpinHighlight
                                ? 'bg-amber-400 text-blue-950 border-amber-500 scale-105 ring-4 ring-amber-300/80 shadow-lg font-black z-10'
                                : isThisWinner
                                ? 'bg-emerald-500 text-white border-emerald-600 scale-[1.03] ring-4 ring-emerald-300/80 shadow-lg font-black z-10'
                                : isAssignedToOther
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-75'
                                : 'bg-blue-950 text-amber-300 border-blue-900 shadow-xs hover:border-amber-400'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={`w-5 h-5 rounded-md text-[10px] font-mono font-black flex items-center justify-center shrink-0 ${
                                  isCurrentSpinHighlight
                                    ? 'bg-blue-950 text-amber-300'
                                    : isThisWinner
                                    ? 'bg-white text-emerald-700'
                                    : isAssignedToOther
                                    ? 'bg-slate-200 text-slate-500'
                                    : 'bg-white/15 text-white'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="truncate" title={t}>
                                {t}
                              </span>
                            </div>

                            {isThisWinner ? (
                              <span className="px-2 py-0.5 rounded-md bg-white text-emerald-800 font-mono text-[10px] font-black shrink-0 shadow-2xs">
                                ★ {activeSpinSlot.slotId}
                              </span>
                            ) : assignedSlotId ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[10px] font-black shrink-0 no-underline">
                                {assignedSlotId}
                              </span>
                            ) : isCurrentSpinHighlight ? (
                              <span className="text-[10px] font-black uppercase shrink-0">⚡</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Helper Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
                    <span>
                      💡 Mẹo: Sau khi quay xong vị trí <strong>{activeSpinSlot.slotId}</strong>, nhấn <strong>&quot;Sang Ô Kế Tiếp&quot;</strong> để quay liên tục trên màn hình lớn.
                    </span>
                    <span className="font-mono font-bold text-blue-950">
                      {activeSpinSlot.groupName} · {currentSport?.name}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Print Bracket Diagram Modal */}
      {isPrintModalOpen && (
        <PrintBracketModal
          matches={previewMatchesFromSlots}
          sports={sports}
          registrations={registrations}
          selectedSportId={sportId}
          onClose={() => setIsPrintModalOpen(false)}
          tournamentName={
            customTournamentName.trim() ||
            `Giải ${currentSport?.name || ''} THPT Phú Lâm 2026`
          }
        />
      )}

    </div>
  );
};
