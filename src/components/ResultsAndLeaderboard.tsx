import React, { useState, useMemo, useEffect } from 'react';
import { MedalTally, Match, SportCategory, SportId, Registration, Tournament } from '../types/sports';
import { isSystemPlaceholderTeam } from '../data/mockSportsData';
import { 
  Trophy, Award, Sparkles, Search, MessageSquareText, Shield, 
  Star, RefreshCw, Flame, Activity, Zap, Target, Users, Crown, 
  Grid, ArrowRight, CheckCircle2, ChevronRight, Edit3, Dices, RotateCcw,
  Check, Layers, Medal, Calendar, MapPin, Eye, Clock, CheckCircle, BarChart3,
  ExternalLink, Play
} from 'lucide-react';

interface ResultsAndLeaderboardProps {
  medalTallies: MedalTally[];
  matches: Match[];
  sports: SportCategory[];
  registrations?: Registration[];
  tournaments?: Tournament[];
  selectedTournamentFilter?: string;
  setSelectedTournamentFilter?: (tourId: string) => void;
  selectedSportFilter?: string;
  setSelectedSportFilter?: (sport: string) => void;
  onGenerateAICommentary: (match: Match) => void;
  isAdmin: boolean;
  onOpenMatchEdit: (match: Match) => void;
  onApplyNewMatches?: (newMatches: Match[], newTournament?: Tournament) => void;
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
  tournaments = [],
  selectedTournamentFilter = 'all',
  setSelectedTournamentFilter,
  selectedSportFilter = 'all',
  setSelectedSportFilter,
  onGenerateAICommentary,
  isAdmin,
  onOpenMatchEdit,
  onApplyNewMatches
}) => {
  // Main View Tabs: 'tournament_cards' | 'sport_standings' | 'school_medals' | 'recent_matches' | 'athlete_stats'
  const [activeMainTab, setActiveMainTab] = useState<'tournament_cards' | 'sport_standings' | 'school_medals' | 'recent_matches' | 'athlete_stats'>('tournament_cards');

  // Athlete stats filters
  const [athleteSearch, setAthleteSearch] = useState<string>('');
  const [athleteSportFilter, setAthleteSportFilter] = useState<string>('all');
  const [athleteGradeFilter, setAthleteGradeFilter] = useState<string>('all');

  // Active selected tournament info
  const activeTournament = tournaments.find((t) => t.id === selectedTournamentFilter) || tournaments[0];

  // Sport selector state (defaults to active tournament's sport, or basketball)
  const [activeSportId, setActiveSportId] = useState<SportId>(
    activeTournament?.sportId ||
    (selectedSportFilter && selectedSportFilter !== 'all'
      ? (selectedSportFilter as SportId)
      : 'basketball')
  );

  // Synchronize active sport with active tournament if selected
  useEffect(() => {
    if (activeTournament) {
      setActiveSportId(activeTournament.sportId);
    }
  }, [activeTournament]);

  // Filter & Search for Medal Tally
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [classSearch, setClassSearch] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const currentSport = sports.find((s) => s.id === activeSportId) || sports[0];

  // Computed per-tournament result card data for every tournament individually (HIỂN THỊ RIÊNG TỪNG GIẢI ĐẤU)
  const tournamentsResultData = useMemo(() => {
    return tournaments.map((tour) => {
      const tourSport = sports.find((s) => s.id === tour.sportId) || sports[0];
      const tourMatches = matches.filter(
        (m) => m.tournamentId === tour.id || (!m.tournamentId && tournaments.length === 1)
      );
      const finishedMatches = tourMatches.filter((m) => m.status === 'Finished');
      const liveMatches = tourMatches.filter((m) => m.status === 'Live');
      const upcomingMatches = tourMatches.filter((m) => m.status === 'Upcoming');

      const finalMatch = tourMatches.find((m) => m.stage === 'Chung kết');
      const bronzeMatch = tourMatches.find(
        (m) => m.stage === 'Trận Tranh Hạng 3' || m.subCategory?.includes('Hạng 3') || m.subCategory?.includes('Đồng')
      );

      let champion: string | null = null;
      let runnerUp: string | null = null;
      let thirdPlace: string | null = null;

      if (finalMatch && finalMatch.status === 'Finished' && finalMatch.scoreA !== undefined && finalMatch.scoreB !== undefined) {
        champion = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB;
        runnerUp = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamB : finalMatch.teamA;
      }

      if (bronzeMatch && bronzeMatch.status === 'Finished' && bronzeMatch.scoreA !== undefined && bronzeMatch.scoreB !== undefined) {
        thirdPlace = bronzeMatch.scoreA > bronzeMatch.scoreB ? bronzeMatch.teamA : bronzeMatch.teamB;
      }

      const teamsSet = new Set<string>();
      tourMatches.forEach((m) => {
        if (m.teamA && !isSystemPlaceholderTeam(m.teamA, registrations)) {
          teamsSet.add(m.teamA);
        }
        if (m.teamB && !isSystemPlaceholderTeam(m.teamB, registrations)) {
          teamsSet.add(m.teamB);
        }
      });
      if (teamsSet.size === 0) {
        registrations
          .filter((r) => r.sportId === tour.sportId)
          .forEach((r) => teamsSet.add(r.className));
      }

      const progressPercent = tourMatches.length > 0
        ? Math.round((finishedMatches.length / tourMatches.length) * 100)
        : 0;

      const isCompleted = tourMatches.length > 0 && finishedMatches.length === tourMatches.length;

      return {
        tournament: tour,
        sport: tourSport,
        matches: tourMatches,
        finishedMatches,
        liveMatches,
        upcomingMatches,
        finalMatch,
        bronzeMatch,
        champion,
        runnerUp,
        thirdPlace,
        teamsCount: teamsSet.size,
        progressPercent,
        isCompleted
      };
    });
  }, [tournaments, sports, matches, registrations]);

  // If a specific tournament is selected, filter matches strictly by that tournament
  const tournamentMatches = useMemo(() => {
    if (selectedTournamentFilter === 'all') {
      return matches;
    }
    return matches.filter((m) => m.tournamentId === selectedTournamentFilter || (!m.tournamentId && tournaments.length === 1));
  }, [matches, selectedTournamentFilter, tournaments.length]);

  // Matches of the currently active sport within the selected tournament
  const sportMatches = useMemo(() => {
    return tournamentMatches.filter((m) => m.sportId === activeSportId);
  }, [tournamentMatches, activeSportId]);

  // Finished & live matches of the active sport
  const finishedSportMatches = useMemo(() => {
    return sportMatches.filter((m) => m.status === 'Finished' || m.status === 'Live');
  }, [sportMatches]);

  // Tournament Final Match & Champion calculations for the active tournament
  const tournamentFinalMatch = useMemo(() => {
    return sportMatches.find((m) => m.stage === 'Chung kết');
  }, [sportMatches]);

  const tournamentBronzeMatch = useMemo(() => {
    return sportMatches.find((m) => m.stage === 'Trận Tranh Hạng 3' || m.subCategory?.includes('Hạng 3') || m.subCategory?.includes('Đồng'));
  }, [sportMatches]);

  const tournamentChampion = useMemo(() => {
    if (tournamentFinalMatch && tournamentFinalMatch.status === 'Finished' && tournamentFinalMatch.scoreA !== undefined && tournamentFinalMatch.scoreB !== undefined) {
      return tournamentFinalMatch.scoreA > tournamentFinalMatch.scoreB ? tournamentFinalMatch.teamA : tournamentFinalMatch.teamB;
    }
    return null;
  }, [tournamentFinalMatch]);

  const tournamentRunnerUp = useMemo(() => {
    if (tournamentFinalMatch && tournamentFinalMatch.status === 'Finished' && tournamentFinalMatch.scoreA !== undefined && tournamentFinalMatch.scoreB !== undefined) {
      return tournamentFinalMatch.scoreA > tournamentFinalMatch.scoreB ? tournamentFinalMatch.teamB : tournamentFinalMatch.teamA;
    }
    return null;
  }, [tournamentFinalMatch]);

  const tournamentThirdPlace = useMemo(() => {
    if (tournamentBronzeMatch && tournamentBronzeMatch.status === 'Finished' && tournamentBronzeMatch.scoreA !== undefined && tournamentBronzeMatch.scoreB !== undefined) {
      return tournamentBronzeMatch.scoreA > tournamentBronzeMatch.scoreB ? tournamentBronzeMatch.teamA : tournamentBronzeMatch.teamB;
    }
    return null;
  }, [tournamentBronzeMatch]);

  // ==============================================================
  // DYNAMIC COMPUTATION OF SPORT STANDINGS
  // ==============================================================
  const { standingsByGroup, isGrouped, overallStandings } = useMemo(() => {
    // Collect all teams participating in this sport (from matches or registrations)
    const teamsInMatches = new Set<string>();
    sportMatches.forEach((m) => {
      if (m.teamA && !isSystemPlaceholderTeam(m.teamA, registrations)) {
        teamsInMatches.add(m.teamA);
      }
      if (m.teamB && !isSystemPlaceholderTeam(m.teamB, registrations)) {
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
  // ATHLETE PERSONAL STATISTICS COMPUTATION
  // ==============================================================
  const athleteStatsList = useMemo(() => {
    const statsMap: Record<string, {
      name: string;
      className: string;
      grade: number;
      sportId: SportId;
      played: number;
      won: number;
      lost: number;
      drawn: number;
      pointsFor: number;
      pointsAgainst: number;
      diff: number;
    }> = {};

    registrations.forEach(reg => {
      if (reg.status === 'Approved') {
        const grade = reg.grade || parseInt(reg.className.substring(0, 2)) || 10;
        if (reg.members) {
          reg.members.forEach(m => {
            const key = `${m.name}__${reg.className}__${reg.sportId}`;
            if (!statsMap[key]) {
              statsMap[key] = {
                name: m.name,
                className: reg.className,
                grade,
                sportId: reg.sportId,
                played: 0,
                won: 0,
                lost: 0,
                drawn: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                diff: 0
              };
            }
          });
        }
        if (reg.captainName) {
          const key = `${reg.captainName}__${reg.className}__${reg.sportId}`;
          if (!statsMap[key]) {
            statsMap[key] = {
              name: reg.captainName,
              className: reg.className,
              grade,
              sportId: reg.sportId,
              played: 0,
              won: 0,
              lost: 0,
              drawn: 0,
              pointsFor: 0,
              pointsAgainst: 0,
              diff: 0
            };
          }
        }
      }
    });

    matches.forEach(m => {
      if (m.teamA && !isSystemPlaceholderTeam(m.teamA, registrations)) {
        const key = `${m.teamA}__${m.teamA}__${m.sportId}`;
        if (!statsMap[key]) {
          const grade = parseInt(m.teamA.substring(0, 2)) || 10;
          statsMap[key] = {
            name: m.teamA,
            className: m.teamA,
            grade,
            sportId: m.sportId,
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            diff: 0
          };
        }
      }
      if (m.teamB && !isSystemPlaceholderTeam(m.teamB, registrations)) {
        const key = `${m.teamB}__${m.teamB}__${m.sportId}`;
        if (!statsMap[key]) {
          const grade = parseInt(m.teamB.substring(0, 2)) || 10;
          statsMap[key] = {
            name: m.teamB,
            className: m.teamB,
            grade,
            sportId: m.sportId,
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            diff: 0
          };
        }
      }
    });

    matches.filter(m => m.status === 'Finished' && m.scoreA !== undefined && m.scoreB !== undefined).forEach(m => {
      const sA = m.scoreA ?? 0;
      const sB = m.scoreB ?? 0;
      const teamA = m.teamA;
      const teamB = m.teamB;
      const sportId = m.sportId;

      Object.values(statsMap).forEach(stat => {
        if (stat.sportId === sportId) {
          const isTeamA = stat.className === teamA || stat.name === teamA || teamA.includes(stat.className) || teamA.includes(stat.name);
          const isTeamB = stat.className === teamB || stat.name === teamB || teamB.includes(stat.className) || teamB.includes(stat.name);

          if (isTeamA) {
            stat.played += 1;
            stat.pointsFor += sA;
            stat.pointsAgainst += sB;
            stat.diff = stat.pointsFor - stat.pointsAgainst;
            if (sA > sB) stat.won += 1;
            else if (sA === sB) stat.drawn += 1;
            else stat.lost += 1;
          } else if (isTeamB) {
            stat.played += 1;
            stat.pointsFor += sB;
            stat.pointsAgainst += sA;
            stat.diff = stat.pointsFor - stat.pointsAgainst;
            if (sB > sA) stat.won += 1;
            else if (sB === sA) stat.drawn += 1;
            else stat.lost += 1;
          }
        }
      });
    });

    return Object.values(statsMap).sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return b.pointsFor - a.pointsFor;
    });
  }, [registrations, matches]);

  const filteredAthleteStats = useMemo(() => {
    return athleteStatsList.filter(item => {
      const matchSearch = athleteSearch === '' || 
        item.name.toLowerCase().includes(athleteSearch.toLowerCase()) || 
        item.className.toLowerCase().includes(athleteSearch.toLowerCase());
      const matchSport = athleteSportFilter === 'all' || item.sportId === athleteSportFilter;
      const matchGrade = athleteGradeFilter === 'all' || item.grade.toString() === athleteGradeFilter;
      return matchSearch && matchSport && matchGrade;
    });
  }, [athleteStatsList, athleteSearch, athleteSportFilter, athleteGradeFilter]);

  // ==============================================================
  // QUICK SCORE SIMULATION FOR DEMO / FAST VERIFICATION
  // ==============================================================
  const handleQuickSimulateScores = async (targetTourId?: string) => {
    const tourIdToSim = targetTourId || (selectedTournamentFilter !== 'all' ? selectedTournamentFilter : undefined);
    const targetTournament = tourIdToSim ? tournaments.find((t) => t.id === tourIdToSim) : activeTournament;

    const upcomingMatches = tourIdToSim
      ? matches.filter((m) => (m.tournamentId === tourIdToSim || (!m.tournamentId && tournaments.length === 1)) && m.status === 'Upcoming')
      : sportMatches.filter((m) => m.status === 'Upcoming');

    if (upcomingMatches.length === 0) {
      showToast(targetTournament ? `Tất cả các trận của "${targetTournament.name}" đã có kết quả!` : 'Tất cả các trận đấu đã có tỉ số!');
      return;
    }

    const updatedMatches = [...matches];
    let simCount = 0;

    upcomingMatches.slice(0, 10).forEach((match) => {
      const matchIndex = updatedMatches.findIndex((m) => m.id === match.id);
      if (matchIndex !== -1) {
        simCount++;
        // Generate realistic scores based on sport
        let sA = 0;
        let sB = 0;
        let setDetail = '';

        if (match.sportId === 'basketball') {
          sA = Math.floor(45 + Math.random() * 25);
          sB = Math.floor(45 + Math.random() * 25);
          if (sA === sB) sA += 2;
          setDetail = `Q1: ${Math.floor(sA / 4)}-${Math.floor(sB / 4)}, Chung cuộc: ${sA}-${sB}`;
        } else if (match.sportId === 'football') {
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
    showToast(`Đã cập nhật tỉ số cho ${simCount} trận đấu của riêng giải "${targetTournament?.name || currentSport.name}"! Thẻ kết quả đã tự động nhảy số.`);
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
              onClick={() => setActiveMainTab('tournament_cards')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'tournament_cards'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80 ring-2 ring-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>1. Thẻ Kết Quả Từng Giải Đấu ({tournaments.length} Giải Riêng Biệt)</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-800 font-extrabold uppercase">
                Độc Lập
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('sport_standings')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'sport_standings'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80 ring-2 ring-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>2. Bảng Điểm & Xếp Hạng Chi Tiết ({activeTournament ? activeTournament.name.slice(0, 20) + '...' : currentSport.name})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('school_medals')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'school_medals'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80 ring-2 ring-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Medal className="w-4 h-4 text-yellow-400" />
              <span>3. Bảng Tổng Sắp Toàn Trường</span>
            </button>

            <button
              onClick={() => setActiveMainTab('recent_matches')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'recent_matches'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80 ring-2 ring-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <MessageSquareText className="w-4 h-4 text-cyan-400" />
              <span>4. Biên Bản & Bình Luận AI ({finishedSportMatches.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('athlete_stats')}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'athlete_stats'
                  ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white shadow-md border border-amber-400/80 ring-2 ring-amber-400/20'
                  : 'text-slate-600 hover:text-slate-950 hover:bg-white'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>5. Thống Kê VĐV ({athleteStatsList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickSimulateScores()}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-blue-950 rounded-xl text-xs font-black shadow transition-all flex items-center gap-1.5 cursor-pointer"
              title="Tự động cập nhật tỉ số các trận sắp diễn ra để xem bảng điểm và kết quả nhảy số"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Giả Lập Tỉ Số Nhanh</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: THẺ KẾT QUẢ RIÊNG BIỆT CHO TỪNG GIẢI ĐẤU ĐƯỢC TẠO        */}
        {/* ============================================================== */}
        {activeMainTab === 'tournament_cards' && (
          <div className="space-y-8">
            
            {/* Master Informative Floating Bar */}
            <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 border-3 border-amber-400/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black uppercase tracking-wider border border-amber-400/40 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thẻ Kết Quả Theo Từng Giải Đấu</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase border border-emerald-400/40">
                    Hiển Thị Riêng Lẻ Độc Lập
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight">
                  Thẻ Kết Quả Riêng Biệt Cho Từng Giải Đấu ({tournaments.length} Giải Độc Lập)
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 max-w-3xl leading-relaxed">
                  Mỗi lần tạo giải đấu, kết quả thi đấu, tỉ số các trận, danh sách đội và lễ trao giải quán quân đều được <strong>hiển thị riêng biệt trong từng thẻ</strong>, hoàn toàn không bị gộp chung vào 1 giải đấu chung.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuickSimulateScores()}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-blue-950 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Dices className="w-4 h-4 text-blue-950" />
                  <span>⚡ Giả Lập Tỉ Số Nhanh Toàn Bộ</span>
                </button>
              </div>
            </div>

            {/* LIST OF INDEPENDENT TOURNAMENT RESULT CARDS */}
            {tournamentsResultData.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3">
                <Trophy className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Chưa có giải đấu nào được khởi tạo</h3>
                <p className="text-xs text-slate-500">
                  Vui lòng chuyển qua tab &quot;Giải Đấu&quot; để tạo giải đấu mới. Mỗi giải được tạo sẽ tự động xuất hiện thành một thẻ kết quả riêng biệt tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {tournamentsResultData.map((item, idx) => {
                  const isSelected = selectedTournamentFilter === item.tournament.id;

                  return (
                    <div
                      key={item.tournament.id}
                      className={`bg-white rounded-3xl border-3 transition-all shadow-xl overflow-hidden ${
                        isSelected ? 'border-amber-400 ring-4 ring-amber-400/25' : 'border-slate-300 hover:border-blue-500'
                      }`}
                    >
                      {/* TOP HEADER OF THIS TOURNAMENT RESULT CARD */}
                      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-5 sm:p-6 border-b-2 border-amber-400/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-xl bg-amber-400 text-blue-950 text-xs font-black uppercase tracking-wider shadow">
                              🏆 Thẻ Kết Quả Giải #{idx + 1}
                            </span>
                            <span className="px-3 py-1 rounded-xl bg-blue-800/80 text-amber-300 text-xs font-bold border border-amber-400/40">
                              Môn: {item.sport.name}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-blue-200 text-[11px] font-semibold border border-white/20">
                              {item.tournament.format === 'knockout'
                                ? (item.tournament.numGroups && item.tournament.numGroups > 1 ? `Đấu loại trực tiếp (${item.tournament.numGroups} bảng)` : 'Đấu loại trực tiếp')
                                : item.tournament.format === 'round_robin'
                                ? (item.tournament.numGroups && item.tournament.numGroups > 1 ? `Đấu vòng loại (${item.tournament.numGroups} bảng)` : 'Đấu vòng loại')
                                : item.tournament.format === 'group_knockout'
                                ? `Đấu bảng loại trực tiếp (${item.tournament.numGroups || 2} bảng)`
                                : `Đấu theo bảng (${item.tournament.numGroups || 2} bảng)`}
                            </span>
                            {isSelected && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 text-[11px] font-black border border-amber-400/40">
                                ★ Đang chọn xem chi tiết
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                            {item.tournament.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-blue-100/90 font-medium">
                            {item.tournament.subCategory && (
                              <span>📋 Hạng mục: <strong className="text-white">{item.tournament.subCategory}</strong></span>
                            )}
                            <span>📍 Địa điểm: <strong className="text-white">{item.tournament.venue || item.sport.venue}</strong></span>
                            <span>📅 Ngày bắt đầu: <strong className="text-white">{item.tournament.startDate}</strong></span>
                            <span>👥 Số đội: <strong className="text-amber-300 font-mono font-bold">{item.teamsCount} đội</strong></span>
                          </div>
                        </div>

                        {/* Progress & Badge */}
                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2">
                            {item.isCompleted ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>✓ Đã Hoàn Thành Giải</span>
                              </span>
                            ) : item.liveMatches.length > 0 ? (
                              <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow animate-pulse">
                                <span className="w-2 h-2 rounded-full bg-white" />
                                <span>🔥 Đang Tranh Tài ({item.liveMatches.length} trận live)</span>
                              </span>
                            ) : item.finishedMatches.length > 0 ? (
                              <span className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow">
                                <span>⚡ Đang Thi Đấu Vòng Trong</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow border border-amber-400/40">
                                <span>⏱️ Sắp Khởi Tranh</span>
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="w-full sm:w-56 space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-blue-200 font-bold">
                              <span>Tiến độ thi đấu</span>
                              <span className="font-mono text-amber-300 font-black">{item.finishedMatches.length}/{item.matches.length} trận ({item.progressPercent}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-blue-950/80 rounded-full overflow-hidden border border-white/20">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 transition-all duration-500 rounded-full"
                                style={{ width: `${item.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BODY OF THIS INDEPENDENT TOURNAMENT CARD */}
                      <div className="p-5 sm:p-7 space-y-6">
                        {/* 1. PODIUM / HONORS IF FINALS PLAYED */}
                        {(item.champion || item.runnerUp || item.thirdPlace) && (
                          <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 p-5 rounded-2xl border-2 border-amber-500 shadow-md">
                            <div className="flex items-center justify-between pb-3 border-b border-blue-950/20 mb-3">
                              <div className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-blue-950" />
                                <h4 className="text-sm font-black text-blue-950 uppercase tracking-tight">
                                  Bảng Vinh Danh Trao Huy Chương Riêng: {item.tournament.name}
                                </h4>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-amber-300 text-[10px] font-black uppercase">
                                Kết Quả Chung Cuộc
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                              {item.champion && (
                                <div className="bg-white/90 p-3.5 rounded-xl border-2 border-amber-500 shadow-sm space-y-0.5">
                                  <div className="text-2xl">🥇</div>
                                  <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Quán Quân Vô Địch</div>
                                  <div className="text-base font-black text-blue-950 font-sans">{item.champion}</div>
                                </div>
                              )}
                              {item.runnerUp && (
                                <div className="bg-white/90 p-3.5 rounded-xl border-2 border-slate-300 shadow-sm space-y-0.5">
                                  <div className="text-2xl">🥈</div>
                                  <div className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Á Quân (Hạng Nhì)</div>
                                  <div className="text-base font-black text-blue-950 font-sans">{item.runnerUp}</div>
                                </div>
                              )}
                              {item.thirdPlace && (
                                <div className="bg-white/90 p-3.5 rounded-xl border-2 border-amber-700/50 shadow-sm space-y-0.5">
                                  <div className="text-2xl">🥉</div>
                                  <div className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Hạng Ba (Huy Chương Đồng)</div>
                                  <div className="text-base font-black text-blue-950 font-sans">{item.thirdPlace}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 2. MATCH RESULTS IN THIS TOURNAMENT (DANH SÁCH THẺ KẾT QUẢ TỪNG TRẬN CỦA RIÊNG GIẢI NÀY) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                              <Target className="w-4 h-4 text-blue-800" />
                              <span>Kết Quả Các Trận Đấu Của Riêng Giải Này ({item.matches.length} trận):</span>
                            </h4>
                            <span className="text-xs text-slate-500 font-semibold">
                              Chỉ hiển thị các trận thuộc giải <strong>{item.tournament.name}</strong> (không gộp giải khác)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {item.matches.map((m) => {
                              const isFinished = m.status === 'Finished';
                              const isLive = m.status === 'Live';
                              const winner = isFinished && m.scoreA !== undefined && m.scoreB !== undefined
                                ? m.scoreA > m.scoreB ? m.teamA : m.scoreB > m.scoreA ? m.teamB : 'Hòa'
                                : null;

                              return (
                                <div
                                  key={m.id}
                                  className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2.5 ${
                                    m.stage === 'Chung kết'
                                      ? 'bg-amber-50/70 border-amber-300 shadow-sm'
                                      : isLive
                                      ? 'bg-red-50/50 border-red-300'
                                      : isFinished
                                      ? 'bg-white border-slate-200'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-100">
                                    <span className="font-black text-blue-900 font-sans">
                                      {m.stage} {m.groupName ? `(${m.groupName})` : ''}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {isLive && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase animate-pulse">
                                          ● Đang đấu
                                        </span>
                                      )}
                                      {isFinished && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                          ✓ Xong
                                        </span>
                                      )}
                                      {!isFinished && !isLive && (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                                          {m.time} · {m.date}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Scores & Teams */}
                                  <div className="flex items-center justify-between text-xs font-bold gap-2">
                                    <span className={`truncate flex-1 ${winner === m.teamA ? 'text-amber-800 font-black' : 'text-slate-800'}`}>
                                      {m.teamA}
                                    </span>
                                    <span className="font-mono text-sm px-2.5 py-1 bg-slate-100 rounded-lg text-blue-950 font-black shrink-0 border border-slate-200">
                                      {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                                    </span>
                                    <span className={`truncate flex-1 text-right ${winner === m.teamB ? 'text-amber-800 font-black' : 'text-slate-800'}`}>
                                      {m.teamB}
                                    </span>
                                  </div>

                                  {m.setsDetail && (
                                    <div className="text-[10px] text-slate-500 font-mono text-center truncate bg-slate-50 py-0.5 rounded">
                                      {m.setsDetail}
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                                    {winner && winner !== 'Hòa' ? (
                                      <span className="text-emerald-700 font-bold truncate max-w-[150px]">
                                        Thắng: {winner}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">
                                        {m.venue || item.tournament.venue}
                                      </span>
                                    )}

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onGenerateAICommentary(m)}
                                        className="p-1 rounded text-purple-700 hover:bg-purple-50 transition-colors"
                                        title="Bình luận AI trận này"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                      </button>
                                      {isAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => onOpenMatchEdit(m)}
                                          className="p-1 rounded text-blue-700 hover:bg-blue-50 transition-colors font-bold"
                                          title="Sửa tỉ số trận"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. CARD BOTTOM ACTION BAR */}
                        <div className="pt-4 border-t-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-blue-900" />
                            <span>Giải đấu độc lập với {item.teamsCount} đội đăng ký, thẻ kết quả hiển thị riêng biệt.</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleQuickSimulateScores(item.tournament.id)}
                              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-blue-950 font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Cập nhật nhanh tỉ số cho riêng giải đấu này"
                            >
                              <Dices className="w-3.5 h-3.5" />
                              <span>⚡ Giả Lập Tỉ Số Nhanh Giải Này</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (setSelectedTournamentFilter) {
                                  setSelectedTournamentFilter(item.tournament.id);
                                }
                                setActiveSportId(item.sport.id);
                                if (setSelectedSportFilter) {
                                  setSelectedSportFilter(item.sport.id);
                                }
                                setActiveMainTab('sport_standings');
                              }}
                              className="px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white font-black text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer border border-amber-400/80"
                            >
                              <span>Xem Bảng Điểm Chi Tiết Giải Này</span>
                              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BẢNG ĐIỂM CHI TIẾT THEO MÔN THỂ THAO ĐƯỢC TẠO          */}
        {/* ============================================================== */}
        {activeMainTab === 'sport_standings' && (
          <div className="space-y-8">
            
            {/* ============================================================== */}
            {/* KHU VỰC CHỌN GIẢI ĐẤU RIÊNG BIỆT ĐỂ XEM KẾT QUẢ ĐỘC LẬP        */}
            {/* ============================================================== */}
            <div className="bg-slate-50 border-2 border-slate-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                    <h2 className="text-base sm:text-lg font-black text-blue-950 font-sans tracking-tight">
                      Xem Kết Quả Theo Từng Giải Đấu Riêng Biệt ({tournaments.length} Giải Độc Lập)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Hiển Thị Riêng Lẻ
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Bảng điểm, xếp hạng và kết quả thi đấu được tính riêng biệt cho từng giải, <strong>không hiển thị chung vào 1 giải</strong>.
                  </p>
                </div>

                {setSelectedTournamentFilter && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedTournamentFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedTournamentFilter === 'all'
                          ? 'bg-blue-950 text-amber-300 shadow border border-amber-400/60'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                      }`}
                    >
                      Xem Toàn Bộ Giải
                    </button>
                  </div>
                )}
              </div>

              {/* Tournament Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {tournaments.map((tour) => {
                  const sp = sports.find((s) => s.id === tour.sportId);
                  const isSelected = selectedTournamentFilter === tour.id;
                  const tourMatches = matches.filter((m) => m.tournamentId === tour.id);
                  const finishedCount = tourMatches.filter((m) => m.status === 'Finished').length;

                  return (
                    <div
                      key={tour.id}
                      onClick={() => {
                        if (setSelectedTournamentFilter) {
                          setSelectedTournamentFilter(tour.id);
                        }
                        setActiveSportId(tour.sportId);
                        if (setSelectedSportFilter) {
                          setSelectedSportFilter(tour.sportId);
                        }
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-sm relative ${
                        isSelected
                          ? 'bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white border-amber-400 ring-4 ring-amber-400/25 shadow-lg'
                          : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            isSelected ? 'bg-amber-400 text-blue-950' : 'bg-blue-50 text-blue-950 border border-blue-200'
                          }`}>
                            {sp?.name || tour.sportId}
                          </span>
                          {isSelected && (
                            <span className="text-amber-400 text-[10px] font-black uppercase flex items-center gap-1">
                              ★ Đang xem kết quả
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-xs sm:text-sm line-clamp-2 leading-snug">
                          {tour.name}
                        </h4>
                        {tour.subCategory && (
                          <p className={`text-[11px] font-medium line-clamp-1 mt-1 ${
                            isSelected ? 'text-blue-200' : 'text-slate-500'
                          }`}>
                            {tour.subCategory}
                          </p>
                        )}
                      </div>

                      <div className={`pt-2 border-t text-[10px] font-semibold flex items-center justify-between ${
                        isSelected ? 'border-blue-800 text-blue-200' : 'border-slate-100 text-slate-500'
                      }`}>
                        <span>{finishedCount}/{tourMatches.length} trận xong</span>
                        <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                          isSelected ? 'bg-blue-800 text-amber-300' : 'bg-slate-100 text-blue-950'
                        }`}>
                          {tour.status === 'Finished' ? 'Đã xong' : tour.status === 'Live' ? 'Đang đấu' : 'Sắp đấu'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* THẺ VINH DANH QUÁN QUÂN & HUY CHƯƠNG CHO GIẢI ĐẤU ĐANG CHỌN */}
            {activeTournament && (tournamentChampion || tournamentRunnerUp) && (
              <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-blue-950 rounded-3xl p-6 border-4 border-amber-300 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b-2 border-blue-950/20">
                  <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-blue-950" />
                    <h3 className="text-lg font-black uppercase tracking-tight">
                      Bảng Vinh Danh Trao Giải Riêng: {activeTournament.name}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-300 text-xs font-black uppercase">
                    Kết Quả Chính Thức
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  {/* Quán Quân */}
                  {tournamentChampion && (
                    <div className="bg-white/90 p-4 rounded-2xl border-2 border-amber-500 shadow-md space-y-1">
                      <div className="text-3xl">🥇</div>
                      <div className="text-[11px] font-black uppercase text-amber-800 tracking-wider">Hạng 1 - Quán Quân Vô Địch</div>
                      <div className="text-lg font-black text-blue-950">{tournamentChampion}</div>
                    </div>
                  )}

                  {/* Á Quân */}
                  {tournamentRunnerUp && (
                    <div className="bg-white/90 p-4 rounded-2xl border-2 border-slate-300 shadow-md space-y-1">
                      <div className="text-3xl">🥈</div>
                      <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Hạng 2 - Á Quân</div>
                      <div className="text-lg font-black text-blue-950">{tournamentRunnerUp}</div>
                    </div>
                  )}

                  {/* Hạng Ba */}
                  {tournamentThirdPlace && (
                    <div className="bg-white/90 p-4 rounded-2xl border-2 border-amber-700/50 shadow-md space-y-1">
                      <div className="text-3xl">🥉</div>
                      <div className="text-[11px] font-black uppercase text-amber-900 tracking-wider">Hạng 3 - Huy Chương Đồng</div>
                      <div className="text-lg font-black text-blue-950">{tournamentThirdPlace}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
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
                  {activeTournament ? `Bảng Điểm Xếp Hạng Riêng: ${activeTournament.name}` : `Bảng Điểm Xếp Hạng Môn ${currentSport.name}`}
                </span>
                <h2 className="text-2xl font-black font-sans font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>{activeTournament ? activeTournament.name : `Môn ${currentSport.name}`}</span>
                  <span className="text-sm font-normal text-blue-200">({currentSport.name} - {activeTournament?.subCategory || currentSport.englishName})</span>
                </h2>
                <p className="text-xs text-blue-100/90">
                  {activeTournament?.venue || currentSport.venue} · Kết quả tính riêng cho giải đấu này, hoàn toàn không gộp chung vào giải khác.
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

              {/* Tournament filter for AI commentary & match logs */}
              {setSelectedTournamentFilter && tournaments.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Lọc theo giải:</span>
                  <select
                    value={selectedTournamentFilter}
                    onChange={(e) => {
                      setSelectedTournamentFilter(e.target.value);
                      const t = tournaments.find((x) => x.id === e.target.value);
                      if (t) setActiveSportId(t.sportId);
                    }}
                    className="bg-slate-50 border border-slate-300 text-xs text-blue-950 px-3 py-1.5 rounded-xl font-bold focus:outline-none"
                  >
                    <option value="all">Tất cả giải đấu ({tournaments.length})</option>
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {finishedSportMatches.map((m) => {
                const sp = sports.find((s) => s.id === m.sportId);

                return (
                  <div key={m.id} className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 space-y-4 shadow-sm hover:border-blue-700 transition-all">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black text-blue-900">
                          {sp?.name || m.sportId} · {m.stage}
                        </span>
                        {m.tournamentName && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded w-fit">
                            🏆 {m.tournamentName}
                          </span>
                        )}
                      </div>
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

        {/* ============================================================== */}
        {/* TAB 5: THỐNG KÊ CÁ NHÂN VẬN ĐỘNG VIÊN                          */}
        {/* ============================================================== */}
        {activeMainTab === 'athlete_stats' && (
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 space-y-6 shadow-xl">
            <div className="pb-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-blue-950 flex items-center gap-2 font-sans font-bold">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Thống Kê Cá Nhân Vận Động Viên & Thành Viên Đội</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng hợp số trận đã đấu, số trận thắng, thua, hòa và hiệu số điểm số dựa trên các trận đấu đã hoàn thành.
                </p>
              </div>

              {/* Filters for athlete stats */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên VĐV hoặc lớp..."
                    value={athleteSearch}
                    onChange={(e) => setAthleteSearch(e.target.value)}
                    className="bg-slate-50 text-xs text-blue-950 pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 w-48 font-bold"
                  />
                </div>

                <select
                  value={athleteSportFilter}
                  onChange={(e) => setAthleteSportFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-xs text-blue-950 px-3 py-2 rounded-xl font-bold focus:outline-none"
                >
                  <option value="all">Tất cả các môn</option>
                  {sports.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <select
                  value={athleteGradeFilter}
                  onChange={(e) => setAthleteGradeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-xs text-blue-950 px-3 py-2 rounded-xl font-bold focus:outline-none"
                >
                  <option value="all">Tất cả các khối</option>
                  <option value="10">Khối 10</option>
                  <option value="11">Khối 11</option>
                  <option value="12">Khối 12</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-950 to-indigo-950 text-white text-xs font-black uppercase">
                    <th className="p-3.5 text-center w-14">STT</th>
                    <th className="p-3.5">Họ Tên Vận Động Viên</th>
                    <th className="p-3.5 text-center">Lớp</th>
                    <th className="p-3.5 text-center">Khối</th>
                    <th className="p-3.5">Môn Thi Đấu</th>
                    <th className="p-3.5 text-center">Đã Đấu</th>
                    <th className="p-3.5 text-center text-emerald-400">Thắng (W)</th>
                    <th className="p-3.5 text-center text-rose-400">Thua (L)</th>
                    <th className="p-3.5 text-center text-amber-300">Hòa (D)</th>
                    <th className="p-3.5 text-center">Điểm Ghi</th>
                    <th className="p-3.5 text-center">Điểm Lọt</th>
                    <th className="p-3.5 text-center font-black">Hiệu Số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredAthleteStats.map((item, index) => {
                    const spObj = sports.find(s => s.id === item.sportId);
                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-center font-bold text-slate-500 font-mono">{index + 1}</td>
                        <td className="p-3.5 font-black text-blue-950 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{item.name}</span>
                        </td>
                        <td className="p-3.5 text-center font-extrabold text-indigo-900 bg-indigo-50/50 rounded">{item.className}</td>
                        <td className="p-3.5 text-center font-bold text-slate-600">Khối {item.grade}</td>
                        <td className="p-3.5 font-bold text-slate-700">{spObj?.name || item.sportId}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800">{item.played}</td>
                        <td className="p-3.5 text-center font-mono font-black text-emerald-600 bg-emerald-50/60 rounded">
                          {item.won}
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-rose-600 bg-rose-50/60 rounded">
                          {item.lost}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-amber-600">{item.drawn}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-700">{item.pointsFor}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-700">{item.pointsAgainst}</td>
                        <td className={`p-3.5 text-center font-mono font-black ${
                          item.diff > 0 ? 'text-emerald-600' : item.diff < 0 ? 'text-rose-600' : 'text-slate-600'
                        }`}>
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAthleteStats.length === 0 && (
              <div className="py-16 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 space-y-2">
                <Users className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Không tìm thấy vận động viên nào phù hợp</h4>
                <p className="text-xs text-slate-500">
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc môn/khối.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

