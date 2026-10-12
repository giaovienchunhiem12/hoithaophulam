import React, { useState, useMemo } from 'react';
import { MedalTally, Match, SportCategory, SportId, Registration } from '../types/sports';
import { 
  Trophy, Award, Sparkles, Search, MessageSquareText, Shield, 
  Star, RefreshCw, Flame, Activity, Zap, Target, Users, Crown, 
  Grid, ArrowRight, CheckCircle2, ChevronRight, Edit3, Dices, RotateCcw
} from 'lucide-react';

interface ResultsAndLeaderboardProps {
  medalTallies: MedalTally[];
  matches: Match[];
  sports: SportCategory[];
  registrations?: Registration[];
  selectedSportFilter?: string;
  setSelectedSportFilter?: (sport: string) => void;
  onGenerateAICommentary: (match: Match) => void;
  isAdmin: boolean;
  onOpenMatchEdit: (match: Match) => void;
  onApplyNewMatches?: (newMatches: Match[]) => void;
}

interface TeamStanding {
  teamName: string;
  className: string;
  grade: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  groupName?: string;
}

export const ResultsAndLeaderboard: React.FC<ResultsAndLeaderboardProps> = ({
  medalTallies,
  matches,
  sports,
  registrations = [],
  selectedSportFilter = 'all',
  setSelectedSportFilter,
  onGenerateAICommentary,
  isAdmin,
  onOpenMatchEdit,
  onApplyNewMatches
}) => {
  // Main View Tabs: 'sport_standings' | 'school_medals' | 'recent_matches'
  const [activeMainTab, setActiveMainTab] = useState<'sport_standings' | 'school_medals' | 'recent_matches'>('sport_standings');

  // Sport selector state (defaults to basketball or current filter or first sport)
  const [activeSportId, setActiveSportId] = useState<SportId>(
    selectedSportFilter && selectedSportFilter !== 'all'
      ? (selectedSportFilter as SportId)
      : 'basketball'
  );

  // Filter & Search for Medal Tally
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classSearch, setClassSearch] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const currentSport = sports.find((s) => s.id === activeSportId) || sports[0];

  // Matches of the currently active sport
  const sportMatches = useMemo(() => {
    return matches.filter((m) => m.sportId === activeSportId);
  }, [matches, activeSportId]);

  // Finished & live matches of the active sport
  const finishedSportMatches = useMemo(() => {
    return sportMatches.filter((m) => m.status === 'Finished' || m.status === 'Live');
  }, [sportMatches]);

  // ==============================================================
  // DYNAMIC COMPUTATION OF SPORT STANDINGS
  // ==============================================================
  const { standingsByGroup, isGrouped, overallStandings } = useMemo(() => {
    // Collect all teams participating in this sport (from matches or registrations)
    const teamsInMatches = new Set<string>();
    sportMatches.forEach((m) => {
      if (m.teamA && !m.teamA.includes('Thắng') && !m.teamA.includes('Thua') && !m.teamA.includes('Nhất') && !m.teamA.includes('Nhì')) {
        teamsInMatches.add(m.teamA);
      }
      if (m.teamB && !m.teamB.includes('Thắng') && !m.teamB.includes('Thua') && !m.teamB.includes('Nhất') && !m.teamB.includes('Nhì')) {
        teamsInMatches.add(m.teamB);
      }
    });

    // If no match teams yet, fallback to registered teams for this sport
    if (teamsInMatches.size === 0) {
      registrations
        .filter((r) => r.sportId === activeSportId)
        .forEach((r) => teamsInMatches.add(r.className));
    }

    // Determine group map
    const teamGroupMap: Record<string, string> = {};
    sportMatches.forEach((m) => {
      if (m.groupName) {
        if (m.teamA) teamGroupMap[m.teamA] = m.groupName;
        if (m.teamB) teamGroupMap[m.teamB] = m.groupName;
      }
    });

    // Initialize team stats
    const stats: Record<string, TeamStanding> = {};
    teamsInMatches.forEach((team) => {
      const clsMatch = team.match(/1[012][A-Z][0-9]+/)?.[0] || team;
      const grade = parseInt(clsMatch.substring(0, 2)) || 10;
      stats[team] = {
        teamName: team,
        className: clsMatch,
        grade,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        points: 0,
        form: [],
        groupName: teamGroupMap[team] || 'Bảng A'
      };
    });

    // Process all finished matches of this sport
    sportMatches
      .filter((m) => m.status === 'Finished' && m.scoreA !== undefined && m.scoreB !== undefined)
      .forEach((m) => {
        const teamA = m.teamA;
        const teamB = m.teamB;
        const scoreA = m.scoreA ?? 0;
        const scoreB = m.scoreB ?? 0;

        if (stats[teamA]) {
          stats[teamA].played += 1;
          stats[teamA].pointsFor += scoreA;
          stats[teamA].pointsAgainst += scoreB;
          stats[teamA].diff = stats[teamA].pointsFor - stats[teamA].pointsAgainst;

          if (scoreA > scoreB) {
            stats[teamA].won += 1;
            stats[teamA].points += 3;
            stats[teamA].form.unshift('W');
          } else if (scoreA === scoreB) {
            stats[teamA].drawn += 1;
            stats[teamA].points += 1;
            stats[teamA].form.unshift('D');
          } else {
            stats[teamA].lost += 1;
            stats[teamA].points += 0;
            stats[teamA].form.unshift('L');
          }
        }

        if (stats[teamB]) {
          stats[teamB].played += 1;
          stats[teamB].pointsFor += scoreB;
          stats[teamB].pointsAgainst += scoreA;
          stats[teamB].diff = stats[teamB].pointsFor - stats[teamB].pointsAgainst;

          if (scoreB > scoreA) {
            stats[teamB].won += 1;
            stats[teamB].points += 3;
            stats[teamB].form.unshift('W');
          } else if (scoreB === scoreA) {
            stats[teamB].drawn += 1;
            stats[teamB].points += 1;
            stats[teamB].form.unshift('D');
          } else {
            stats[teamB].lost += 1;
            stats[teamB].points += 0;
            stats[teamB].form.unshift('L');
          }
        }
      });

    // Sort function: Points DESC -> Goal Difference DESC -> Points For DESC
    const sortFn = (a: TeamStanding, b: TeamStanding) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      return a.teamName.localeCompare(b.teamName);
    };

    const allList = Object.values(stats).sort(sortFn);

    // Grouping check
    const groupsObj: Record<string, TeamStanding[]> = {};
    let hasGroups = false;

    allList.forEach((t) => {
      const g = t.groupName || 'Chung';
      if (t.groupName) hasGroups = true;
      if (!groupsObj[g]) groupsObj[g] = [];
      groupsObj[g].push(t);
    });

    // Sort each group
    Object.keys(groupsObj).forEach((gKey) => {
      groupsObj[gKey].sort(sortFn);
    });

    return {
      standingsByGroup: groupsObj,
      isGrouped: hasGroups && Object.keys(groupsObj).length > 1,
      overallStandings: allList
    };
  }, [sportMatches, registrations, activeSportId]);

  // ==============================================================
  // QUICK SCORE SIMULATION FOR DEMO / FAST VERIFICATION
  // ==============================================================
  const handleQuickSimulateScores = async () => {
    const upcomingMatches = sportMatches.filter((m) => m.status === 'Upcoming');
    if (upcomingMatches.length === 0) {
      showToast('Tất cả các trận đấu của môn này đã có tỉ số!');
      return;
    }

    const updatedMatches = [...matches];
    let simCount = 0;

    upcomingMatches.slice(0, 8).forEach((match) => {
      const matchIndex = updatedMatches.findIndex((m) => m.id === match.id);
      if (matchIndex !== -1) {
        simCount++;
        // Generate realistic scores based on sport
        let sA = 0;
        let sB = 0;
        let setDetail = '';

        if (activeSportId === 'basketball') {
          sA = Math.floor(40 + Math.random() * 30);
          sB = Math.floor(40 + Math.random() * 30);
          if (sA === sB) sA += 2;
          setDetail = `Q1: ${Math.floor(sA / 4)}-${Math.floor(sB / 4)}, Q4: ${sA}-${sB}`;
        } else if (activeSportId === 'football') {
          sA = Math.floor(Math.random() * 4);
          sB = Math.floor(Math.random() * 4);
          setDetail = `Hiệp 1: ${Math.floor(sA / 2)}-${Math.floor(sB / 2)}`;
        } else {
          sA = 2;
          sB = Math.random() > 0.5 ? 1 : 0;
          setDetail = `Séc 1: 21-18, Séc 2: 21-19`;
        }

        updatedMatches[matchIndex] = {
          ...updatedMatches[matchIndex],
          status: 'Finished',
          scoreA: sA,
          scoreB: sB,
          setsDetail: setDetail,
          mvpPlayer: `${match.teamA} (Đội Trưởng)`
        };
      }
    });

    if (onApplyNewMatches) {
      onApplyNewMatches(updatedMatches);
    }
    showToast(`Đã cập nhật tỉ số cho ${simCount} trận đấu của môn ${currentSport.name}! Bảng điểm đã tự động cập nhật.`);
  };

  // Filter medal tallies
  const filteredTallies = medalTallies.filter((item) => {
    const matchGrade = gradeFilter === 'all' || item.grade.toString() === gradeFilter;
    const matchSearch = item.className.toLowerCase().includes(classSearch.toLowerCase());
    return matchGrade && matchSearch;
  });

  return (
    <div className="py-8 bg-white min-h-screen text-slate-900">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-950 to-indigo-950 text-white px-5 py-3 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center gap-3 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-bold font-sans font-bold">{toastMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* ROYAL BLUE FLOATING MASTER HEADER BAR                          */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 border-4 border-amber-400/90 shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/40">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Bảng Điểm Từng Môn & Tổng Sắp Toàn Trường</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[11px] font-bold border border-blue-400/30">
                {currentSport.name} ({sportMatches.length} trận đấu)
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-sans font-bold tracking-tight">
              Bảng Điểm, Xếp Hạng & Kết Quả Thi Đấu
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-3xl leading-relaxed">
              Tự động tính toán điểm số, số trận thắng/thua, hiệu số và vị trí xếp hạng cho môn thể thao được tạo (<strong className="text-amber-300">{currentSport.name}</strong>) cùng Bảng Tổng Sắp Huy Chương toàn trường.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setActiveMainTab('sport_standings')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeMainTab === 'sport_standings'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Award className="w-4 h-4 fill-current" />
              <span>Bảng Điểm Môn {currentSport.name}</span>
            </button>
            <button
              onClick={() => setActiveMainTab('school_medals')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeMainTab === 'school_medals'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-blue-950 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Tổng Sắp Huy Chương</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SUBTABS BAR: SWITCH VIEW MODE                                 */}
        {/* ============================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-300 shadow-sm">
            <button
              onClick={() => setActiveMainTab('sport_standings')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeMainTab === 'sport_standings'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>1. Bảng Điểm Theo Môn ({currentSport.name})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('school_medals')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeMainTab === 'school_medals'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>2. Bảng Tổng Sắp Toàn Trường</span>
            </button>

            <button
              onClick={() => setActiveMainTab('recent_matches')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeMainTab === 'recent_matches'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <MessageSquareText className="w-4 h-4 text-cyan-400" />
              <span>3. Biên Bản & Bình Luận AI ({finishedSportMatches.length})</span>
            </button>
          </div>

          {activeMainTab === 'sport_standings' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleQuickSimulateScores}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-blue-950 rounded-xl text-xs font-black shadow transition-all flex items-center gap-1.5"
                title="Tự động cập nhật tỉ số các trận sắp diễn ra để xem bảng điểm nhảy số"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Giả Lập Tỉ Số Nhanh</span>
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: BẢNG ĐIỂM CHI TIẾT THEO MÔN THỂ THAO ĐƯỢC TẠO          */}
        {/* ============================================================== */}
        {activeMainTab === 'sport_standings' && (
          <div className="space-y-8">
            
            {/* SPORT CAROUSEL PICKER */}
            <div className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>Chọn Môn Thể Thao Để Xem Bảng Điểm Xếp Hạng:</span>
                </label>
                <span className="text-xs text-slate-500 font-bold">
                  Đang xem: <strong className="text-blue-950">{currentSport.name}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
                {sports.map((sp) => {
                  const isSelected = sp.id === activeSportId;
                  const matchCount = matches.filter((m) => m.sportId === sp.id).length;
                  const isBasketball = sp.id === 'basketball';

                  return (
                    <button
                      key={sp.id}
                      type="button"
                      onClick={() => {
                        setActiveSportId(sp.id);
                        if (setSelectedSportFilter) setSelectedSportFilter(sp.id);
                      }}
                      className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 relative ${
                        isSelected
                          ? 'border-blue-900 bg-blue-50/90 text-blue-950 shadow-md ring-2 ring-blue-900/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {isBasketball && (
                        <span className="absolute -top-2 px-1.5 py-0.2 bg-orange-500 text-white text-[8px] font-black rounded-full shadow">
                          Hot
                        </span>
                      )}
                      <span className={`text-xs font-black font-sans font-bold ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                        {sp.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${isSelected ? 'bg-blue-900 text-white font-bold' : 'bg-slate-100 text-slate-500'}`}>
                        {matchCount} trận
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SPORT HEADER INFO CARD */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 rounded-3xl border-2 border-amber-400/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                  Bảng Điểm Xếp Hạng Chính Thức
                </span>
                <h2 className="text-2xl font-black font-sans font-bold text-white flex items-center gap-2">
                  <span>Môn {currentSport.name}</span>
                  <span className="text-sm font-normal text-blue-200">({currentSport.englishName})</span>
                </h2>
                <p className="text-xs text-blue-100/90">
                  {currentSport.venue} · Quy tắc tính điểm: {activeSportId === 'basketball' ? 'Thắng 2 điểm, Thua 1 điểm (Chuẩn FIBA)' : 'Thắng 3 điểm, Hòa 1 điểm, Thua 0 điểm'}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-2xl border border-white/20 text-xs">
                <div className="text-center">
                  <div className="text-lg font-black text-amber-300 font-mono">{sportMatches.length}</div>
                  <div className="text-[10px] text-blue-200 uppercase font-bold">Tổng Trận</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-lg font-black text-emerald-300 font-mono">{finishedSportMatches.length}</div>
                  <div className="text-[10px] text-blue-200 uppercase font-bold">Đã Đấu</div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-lg font-black text-orange-300 font-mono">{overallStandings.length}</div>
                  <div className="text-[10px] text-blue-200 uppercase font-bold">Đội Thi Đấu</div>
                </div>
              </div>
            </div>

            {/* STANDINGS TABLE RENDERING: GROUP BY GROUP OR OVERALL */}
            {isGrouped ? (
              // Case A: Grouped Standings (Bảng A, Bảng B, Bảng C, Bảng D)
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Object.entries(standingsByGroup).map(([groupTitle, teamRows]) => (
                  <div key={groupTitle} className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-lg space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b-2 border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black font-sans font-bold text-sm shadow">
                          {groupTitle.replace('Bảng ', '')}
                        </span>
                        <div>
                          <h3 className="text-base font-black text-blue-950 font-sans font-bold">
                            Bảng Điểm {groupTitle}
                          </h3>
                          <span className="text-[11px] text-slate-500 font-bold">{teamRows.length} đội thi đấu</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                        Top 2 Đi Tiếp
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="p-2.5 text-center w-10">#</th>
                            <th className="p-2.5">Đội / Lớp</th>
                            <th className="p-2.5 text-center font-mono">Đ</th>
                            <th className="p-2.5 text-center font-mono">T</th>
                            <th className="p-2.5 text-center font-mono">H</th>
                            <th className="p-2.5 text-center font-mono">B</th>
                            <th className="p-2.5 text-center font-mono">BT</th>
                            <th className="p-2.5 text-center font-mono">BB</th>
                            <th className="p-2.5 text-center font-mono">HS</th>
                            <th className="p-2.5 text-center font-mono text-blue-950 font-black">ĐTS</th>
                            <th className="p-2.5 text-center">Trạng Thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {teamRows.map((row, rIdx) => {
                            const isLeader = rIdx === 0;
                            const isRunnerUp = rIdx === 1;

                            return (
                              <tr key={row.teamName} className={`hover:bg-blue-50/40 transition-colors ${isLeader ? 'bg-amber-50/30' : ''}`}>
                                <td className="p-2.5 text-center font-black text-slate-800">
                                  {isLeader ? '🥇 1' : isRunnerUp ? '🥈 2' : rIdx + 1}
                                </td>
                                <td className="p-2.5 font-sans font-black text-blue-950 whitespace-nowrap">
                                  {row.teamName}
                                </td>
                                <td className="p-2.5 text-center font-bold text-slate-700">{row.played}</td>
                                <td className="p-2.5 text-center font-bold text-emerald-600">{row.won}</td>
                                <td className="p-2.5 text-center font-bold text-slate-500">{row.drawn}</td>
                                <td className="p-2.5 text-center font-bold text-rose-600">{row.lost}</td>
                                <td className="p-2.5 text-center text-slate-700">{row.pointsFor}</td>
                                <td className="p-2.5 text-center text-slate-500">{row.pointsAgainst}</td>
                                <td className={`p-2.5 text-center font-bold ${row.diff > 0 ? 'text-emerald-600' : row.diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                  {row.diff > 0 ? `+${row.diff}` : row.diff}
                                </td>
                                <td className="p-2.5 text-center font-black text-blue-900 text-sm bg-blue-50/50">
                                  {row.points}
                                </td>
                                <td className="p-2.5 text-center font-sans">
                                  {isLeader ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                      Nhất Bảng
                                    </span>
                                  ) : isRunnerUp ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                                      Nhì Bảng
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Vòng Bảng</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Case B: Unified Standings (Single Round-Robin League Table)
              <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500" />
                      <span>Bảng Điểm Xếp Hạng Vòng Tròn Toàn Giải - Môn {currentSport.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thứ hạng được sắp xếp theo: Tổng Điểm ➔ Hiệu Số (+/-) ➔ Tổng Bàn Thắng/Điểm Ghi Được
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-950 text-xs font-black border border-blue-300">
                    {overallStandings.length} Đội Tham Gia
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gradient-to-r from-blue-950 to-blue-900 text-white uppercase font-black text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3 text-center w-12 rounded-l-xl">Hạng</th>
                        <th className="p-3">Tên Đội / Lớp</th>
                        <th className="p-3 text-center font-mono">Khối</th>
                        <th className="p-3 text-center font-mono">Đã Đấu (Đ)</th>
                        <th className="p-3 text-center font-mono text-emerald-300">Thắng (T)</th>
                        <th className="p-3 text-center font-mono text-slate-300">Hòa (H)</th>
                        <th className="p-3 text-center font-mono text-rose-300">Thua (B)</th>
                        <th className="p-3 text-center font-mono">Điểm Ghi (BT)</th>
                        <th className="p-3 text-center font-mono">Điểm Thua (BB)</th>
                        <th className="p-3 text-center font-mono">Hiệu Số (HS)</th>
                        <th className="p-3 text-center font-mono text-amber-300 font-black text-sm">Điểm (ĐTS)</th>
                        <th className="p-3 text-center font-sans">Phong Độ</th>
                        <th className="p-3 text-center rounded-r-xl font-sans">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {overallStandings.map((row, idx) => {
                        const isTop1 = idx === 0;
                        const isTop2 = idx === 1;
                        const isTop3 = idx === 2;

                        return (
                          <tr key={row.teamName} className={`hover:bg-blue-50/50 transition-colors ${isTop1 ? 'bg-amber-50/40 font-bold' : ''}`}>
                            <td className="p-3 text-center font-sans font-black text-slate-800">
                              {isTop1 ? '🥇 1' : isTop2 ? '🥈 2' : isTop3 ? '🥉 3' : idx + 1}
                            </td>
                            <td className="p-3 font-sans font-black text-blue-950 text-sm whitespace-nowrap">
                              {row.teamName}
                            </td>
                            <td className="p-3 text-center font-sans text-slate-600">Khối {row.grade}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{row.played}</td>
                            <td className="p-3 text-center font-bold text-emerald-600">{row.won}</td>
                            <td className="p-3 text-center font-bold text-slate-500">{row.drawn}</td>
                            <td className="p-3 text-center font-bold text-rose-600">{row.lost}</td>
                            <td className="p-3 text-center font-bold text-slate-800">{row.pointsFor}</td>
                            <td className="p-3 text-center text-slate-500">{row.pointsAgainst}</td>
                            <td className={`p-3 text-center font-bold ${row.diff > 0 ? 'text-emerald-600' : row.diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              {row.diff > 0 ? `+${row.diff}` : row.diff}
                            </td>
                            <td className="p-3 text-center font-black text-blue-900 text-base bg-blue-50/70">
                              {row.points}
                            </td>
                            <td className="p-3 text-center font-sans">
                              <div className="flex items-center justify-center gap-1">
                                {row.form.length > 0 ? (
                                  row.form.slice(0, 4).map((f, fIdx) => (
                                    <span
                                      key={fIdx}
                                      className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white ${
                                        f === 'W' ? 'bg-emerald-500' : f === 'D' ? 'bg-amber-500' : 'bg-rose-500'
                                      }`}
                                    >
                                      {f}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Chưa đấu</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-center font-sans">
                              {isTop1 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-blue-950 shadow-sm border border-amber-500">
                                  Hạng 1 - Vô Địch
                                </span>
                              ) : isTop2 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-200 text-slate-900 border border-slate-300">
                                  Hạng 2 - Á Quân
                                </span>
                              ) : isTop3 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                  Hạng 3
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">Thi đấu</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MATCH RESULTS OF THE ACTIVE SPORT WITH FAST UPDATE BUTTON */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-blue-950 font-sans font-bold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-900" />
                    <span>Danh Sách & Tỉ Số Các Trận Đấu - Môn {currentSport.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cập nhật kết quả tỉ số các trận đấu để bảng điểm tự động nhảy số theo thời gian thực.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600">
                  {sportMatches.length} trận đấu đã xếp lịch
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {sportMatches.map((match) => {
                  const isFinished = match.status === 'Finished';
                  const isLive = match.status === 'Live';

                  return (
                    <div
                      key={match.id}
                      className="bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-700 p-4 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Top Stage + Group */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                          <span className="font-bold text-blue-900">
                            {match.groupName ? `${match.groupName} · ` : ''}{match.stage}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isFinished
                              ? 'bg-emerald-100 text-emerald-800'
                              : isLive
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isFinished ? 'Đã kết thúc' : isLive ? 'Đang diễn ra' : 'Sắp diễn ra'}
                          </span>
                        </div>

                        {/* Match Teams + Score */}
                        <div className="py-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-black text-blue-950 truncate max-w-[110px]">
                              {match.teamA}
                            </div>
                          </div>

                          <div className="px-3 py-1 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono font-black text-lg text-blue-950 min-w-[70px]">
                            {isFinished || isLive ? `${match.scoreA ?? 0} - ${match.scoreB ?? 0}` : 'VS'}
                          </div>

                          <div className="flex-1 text-right">
                            <div className="text-sm font-black text-blue-950 truncate max-w-[110px]">
                              {match.teamB}
                            </div>
                          </div>
                        </div>

                        {match.setsDetail && (
                          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg text-center truncate">
                            {match.setsDetail}
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-500">{match.date} · {match.time}</span>
                        <button
                          type="button"
                          onClick={() => onOpenMatchEdit(match)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isAdmin ? 'Cập Nhật Tỉ Số' : 'Xem / Sửa'}</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

              {sportMatches.length === 0 && (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
                  <Award className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">Chưa có lịch đấu nào cho môn {currentSport.name}</h4>
                  <p className="text-xs text-slate-500">
                    Vào tab &quot;Giải Đấu&quot; và bấm &quot;Bốc Thăm & Tạo Sơ Đồ Ngay&quot; để khởi tạo lịch đấu và bảng điểm cho môn này.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BẢNG TỔNG SẮP HUY CHƯƠNG TOÀN TRƯỜNG                   */}
        {/* ============================================================== */}
        {activeMainTab === 'school_medals' && (
          <div className="space-y-8">
            
            {/* Top 3 Medal Standings Spotlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredTallies.slice(0, 3).map((item, index) => {
                let rankColor = 'border-amber-400 bg-amber-50/50 text-amber-900';
                let medalEmoji = '🥇';
                let rankText = 'HẠNG 1 - VÔ ĐỊCH TOÀN TRƯỜNG';

                if (index === 1) {
                  rankColor = 'border-slate-300 bg-slate-50 text-slate-800';
                  medalEmoji = '🥈';
                  rankText = 'HẠNG 2 - Á QUN TOÀN TRƯỜNG';
                } else if (index === 2) {
                  rankColor = 'border-amber-300 bg-amber-50/30 text-amber-950';
                  medalEmoji = '🥉';
                  rankText = 'HẠNG 3 - HẠNG BA TOÀN TRƯỜNG';
                }

                return (
                  <div
                    key={item.className}
                    className={`bg-white rounded-3xl border-2 ${rankColor} p-6 flex flex-col justify-between shadow-xl relative overflow-hidden`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black tracking-widest uppercase text-blue-900">
                          {rankText}
                        </span>
                        <span className="text-3xl">{medalEmoji}</span>
                      </div>

                      <h3 className="text-3xl font-black text-blue-950 font-sans font-bold mt-2">
                        Lớp {item.className}
                      </h3>
                      <div className="text-xs text-slate-500 font-semibold mt-0.5">Khối {item.grade} THPT Phú Lâm</div>

                      {/* Medal Counters */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                        <div className="bg-amber-100/60 p-2 rounded-xl border border-amber-200">
                          <div className="text-[11px] text-amber-800 font-black">Vàng 🥇</div>
                          <div className="text-xl font-black font-mono text-amber-950 mt-0.5">{item.gold}</div>
                        </div>
                        <div className="bg-slate-100 p-2 rounded-xl border border-slate-200">
                          <div className="text-[11px] text-slate-700 font-black">Bạc 🥈</div>
                          <div className="text-xl font-black font-mono text-slate-900 mt-0.5">{item.silver}</div>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <div className="text-[11px] text-amber-900 font-black">Đồng 🥉</div>
                          <div className="text-xl font-black font-mono text-amber-950 mt-0.5">{item.bronze}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-slate-500">Tổng điểm tích lũy:</span>
                      <span className="text-blue-900 text-base font-black">{item.totalPoints} điểm</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full Medal Tally Table */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black text-blue-950 flex items-center gap-2 font-sans font-bold">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>Bảng Tổng Sắp Huy Chương Toàn Trường</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Quy đổi điểm thi đua: Huy chương Vàng = 3đ | Huy chương Bạc = 2đ | Huy chương Đồng = 1đ</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-44">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm Lớp..."
                      value={classSearch}
                      onChange={(e) => setClassSearch(e.target.value)}
                      className="w-full bg-slate-50 text-xs text-slate-900 pl-8 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-700"
                    />
                  </div>

                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-xs text-slate-800 px-3 py-2 rounded-xl focus:outline-none font-bold"
                  >
                    <option value="all">Tất cả Khối</option>
                    <option value="10">Khối 10 (10 lớp)</option>
                    <option value="11">Khối 11 (2 lớp)</option>
                    <option value="12">Khối 12 (8 lớp)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-gradient-to-r from-blue-950 to-blue-900 text-white uppercase font-black">
                    <tr>
                      <th className="p-3 text-center rounded-l-xl">Xếp Hạng</th>
                      <th className="p-3">Tên Lớp</th>
                      <th className="p-3">Khối</th>
                      <th className="p-3 text-center text-amber-300">HCV 🥇</th>
                      <th className="p-3 text-center text-slate-200">HCB 🥈</th>
                      <th className="p-3 text-center text-amber-400">HCĐ 🥉</th>
                      <th className="p-3 text-center rounded-r-xl">Tổng Điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredTallies.map((item, idx) => (
                      <tr key={item.className} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold font-sans text-slate-700">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td className="p-3 font-sans font-black text-blue-950 text-sm">Lớp {item.className}</td>
                        <td className="p-3 font-sans text-slate-600 font-semibold">Khối {item.grade}</td>
                        <td className="p-3 text-center font-bold text-amber-600">{item.gold}</td>
                        <td className="p-3 text-center font-bold text-slate-600">{item.silver}</td>
                        <td className="p-3 text-center font-bold text-amber-700">{item.bronze}</td>
                        <td className="p-3 text-center font-black text-blue-900 font-sans text-sm">
                          {item.totalPoints} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: BIÊN BẢN TRẬN ĐẤU & BÌNH LUẬN VIÊN AI                   */}
        {/* ============================================================== */}
        {activeMainTab === 'recent_matches' && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-6 shadow-xl">
            <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-blue-950 flex items-center gap-2 font-sans font-bold">
                  <Award className="w-5 h-5 text-orange-500" />
                  <span>Biên Bản Kết Quả & Bình Luận Viên Trực Tiếp</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tất cả các trận đấu đã hoàn thành có thể được bình luận tự động bởi AI.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {finishedSportMatches.map((m) => {
                const sp = sports.find((s) => s.id === m.sportId);

                return (
                  <div key={m.id} className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 space-y-4 shadow-sm hover:border-blue-700 transition-all">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-black text-blue-900">
                        {sp?.name || m.sportId} · {m.stage}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{m.date} · {m.time}</span>
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <div className="text-sm font-black text-blue-950">{m.teamA}</div>
                      </div>
                      <div className="px-4 font-mono font-black text-2xl text-blue-900">
                        {m.scoreA ?? 0} - {m.scoreB ?? 0}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-sm font-black text-blue-950">{m.teamB}</div>
                      </div>
                    </div>

                    {m.setsDetail && (
                      <div className="text-xs font-mono text-slate-600 bg-white p-2 rounded-xl text-center border border-slate-200">
                        {m.setsDetail}
                      </div>
                    )}

                    {m.commentary && (
                      <div className="text-xs text-slate-700 italic bg-amber-50 border border-amber-200 p-3 rounded-xl leading-relaxed">
                        &quot;{m.commentary}&quot;
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between">
                      <button
                        onClick={() => onGenerateAICommentary(m)}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tạo Bình Luận AI Trận Này</span>
                      </button>

                      <button
                        onClick={() => onOpenMatchEdit(m)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-colors"
                      >
                        Sửa Kết Quả
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {finishedSportMatches.length === 0 && (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
                <MessageSquareText className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Chưa có trận đấu nào có kết quả hoàn thành</h4>
                <p className="text-xs text-slate-500">
                  Hãy bấm &quot;Giả Lập Tỉ Số Nhanh&quot; hoặc cập nhật biên bản trận đấu để tạo bình luận.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
