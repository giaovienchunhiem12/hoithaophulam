import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { SportsGrid } from './components/SportsGrid';
import { TournamentManager } from './components/TournamentManager';
import { ScheduleAndBracket } from './components/ScheduleAndBracket';
import { ResultsAndLeaderboard } from './components/ResultsAndLeaderboard';
import { AICommentator } from './components/AICommentator';
import { Announcements } from './components/Announcements';
import { MatchEditModal } from './components/MatchEditModal';
import { TournamentData, Match, Registration, Announcement, SportId, Tournament } from './types/sports';
import { initialTournamentData, isSystemPlaceholderTeam, getTeamEmblem } from './data/mockSportsData';
import { SCHOOL_LOGO_DATA_URI } from './assets/logoData';

const LOCAL_STORAGE_SYNC_KEY = 'phulam_realtime_tournament_data_v2';

export default function App() {
  const [data, setData] = useState<TournamentData>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_SYNC_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.sports) && (parsed.registrations?.length > 0 || parsed.matches?.length > 0)) {
          return {
            ...initialTournamentData,
            ...parsed,
            sports: initialTournamentData.sports,
          };
        }
      }
    } catch {
      // ignore storage read error
    }
    return initialTournamentData;
  });
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>('all');
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState<string>(
    initialTournamentData.activeTournamentId || (initialTournamentData.tournaments?.[0]?.id ?? 'all')
  );
  const [preselectedMatchForAI, setPreselectedMatchForAI] = useState<Match | null>(null);

  // Modal State
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const lastServerUpdatedAtRef = useRef<number>(0);

  // Save state snapshot to localStorage whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SYNC_KEY, JSON.stringify(data));
    } catch {
      // ignore quota errors
    }
  }, [data]);

  const applyServerSnapshot = useCallback((serverData: any, isInitial = false) => {
    if (!serverData || !Array.isArray(serverData.sports)) return;

    const incomingUpdatedAt = Number(serverData.updatedAt) || 0;
    if (!isInitial && incomingUpdatedAt > 0 && incomingUpdatedAt < lastServerUpdatedAtRef.current) {
      return;
    }
    if (incomingUpdatedAt > 0) {
      lastServerUpdatedAtRef.current = incomingUpdatedAt;
    }

    const existingRegs: Registration[] = Array.isArray(serverData.registrations)
      ? [...serverData.registrations]
      : [];
    const existingKeySet = new Set(
      existingRegs.map((r) => `${r.sportId}__${r.className.trim()}`)
    );
    const recoveredRegs: Registration[] = [];

    if (Array.isArray(serverData.matches)) {
      serverData.matches.forEach((m: Match, idx: number) => {
        [m.teamA, m.teamB].forEach((tName, sideIdx) => {
          if (!tName || isSystemPlaceholderTeam(tName, existingRegs)) return;
          const clean = tName.trim();
          const key = `${m.sportId}__${clean}`;
          if (existingKeySet.has(key)) return;
          existingKeySet.add(key);

          const unitMatch = clean.match(/\(([^)]+)\)/);
          const unit = unitMatch ? unitMatch[1].trim() : clean;
          const athleteName = clean.replace(/\s*\([^)]+\)\s*$/, '').trim() || clean;
          const gradeMatch = unit.match(/\b(10|11|12)\b/);
          const grade = gradeMatch ? parseInt(gradeMatch[1], 10) : 10;

          recoveredRegs.push({
            id: `REG-SYNC-${idx}-${sideIdx}`,
            sportId: m.sportId,
            subCategory: m.subCategory?.split(' - ')[0] || 'Chính thức',
            className: clean,
            grade,
            captainName: athleteName,
            phone: '0900000000',
            teacherName: unit !== clean ? `Đơn vị: ${unit}` : `GVCN ${unit}`,
            members: [{ name: athleteName, shirtSize: 'M', jerseyNumber: 1 }],
            status: 'Approved',
            registeredAt: m.date || '2026-10-12',
            emblem: getTeamEmblem(clean, existingRegs),
            notes: 'Đồng bộ từ danh sách đội thi đấu của giải'
          });
        });
      });
    }

    const mergedRegistrations = [...existingRegs, ...recoveredRegs];
    setData((prev) => ({
      ...prev,
      ...serverData,
      sports: initialTournamentData.sports,
      registrations: mergedRegistrations,
      drawStates: serverData.drawStates || prev.drawStates || {},
    }));

    if (recoveredRegs.length > 0 && existingRegs.length === 0) {
      fetch('/api/register/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations: recoveredRegs })
      }).catch(() => {});
    }

    if (Array.isArray(serverData.tournaments) && serverData.tournaments.length > 0) {
      setSelectedTournamentFilter((prevFilter) => {
        const exists = serverData.tournaments.some((t: Tournament) => t.id === prevFilter);
        if (isInitial || (!exists && prevFilter !== 'all')) {
          const activeTour =
            serverData.tournaments.find((t: Tournament) => t.id === serverData.activeTournamentId) ||
            serverData.tournaments[0];
          if (activeTour) {
            setSelectedSportFilter(activeTour.sportId);
            return activeTour.id;
          }
        }
        return prevFilter;
      });
    }
  }, []);

  // Real-time synchronization across all devices via SSE + Polling + Focus/Visibility
  useEffect(() => {
    let isMounted = true;

    const fetchLatestData = (isInitial = false) => {
      fetch('/api/data', { cache: 'no-store' })
        .then((res) => res.json())
        .then((serverData) => {
          if (!isMounted || !serverData) return;
          const serverEmpty =
            (!serverData.registrations || serverData.registrations.length === 0) &&
            (!serverData.matches || serverData.matches.length === 0) &&
            (!serverData.tournaments || serverData.tournaments.length === 0);

          if (isInitial && serverEmpty) {
            try {
              const cachedRaw = localStorage.getItem(LOCAL_STORAGE_SYNC_KEY);
              const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
              if (cached && (cached.registrations?.length > 0 || cached.matches?.length > 0)) {
                fetch('/api/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cached),
                })
                  .then((r) => r.json())
                  .then((resSync) => {
                    if (isMounted && resSync?.data) {
                      applyServerSnapshot(resSync.data, true);
                    }
                  })
                  .catch(() => {});
                return;
              }
            } catch {
              // ignore
            }
          }

          applyServerSnapshot(serverData, isInitial);
        })
        .catch((err) => console.warn('Sync poll fallback:', err));
    };

    // 1. Initial fetch
    fetchLatestData(true);

    // 2. Real-time Server-Sent Events (SSE) stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('sync', (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const parsed = JSON.parse(event.data);
          applyServerSnapshot(parsed, false);
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      });
    } catch (e) {
      console.warn('EventSource initialization error:', e);
    }

    // 3. Periodic poll every 3s + immediate sync on tab focus/visibility
    const pollInterval = window.setInterval(() => {
      fetchLatestData(false);
    }, 3000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchLatestData(false);
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      window.clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [applyServerSnapshot]);

  // Handlers
  const handleNewRegistration = async (newReg: Registration) => {
    setData((prev) => ({
      ...prev,
      registrations: [newReg, ...prev.registrations]
    }));
    try {
      await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReg)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRegistration = async (updatedReg: Registration) => {
    setData((prev) => ({
      ...prev,
      registrations: prev.registrations.map((r) => (r.id === updatedReg.id ? updatedReg : r))
    }));
    try {
      await fetch('/api/register/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReg)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkRegistration = async (newRegs: Registration[]) => {
    setData((prev) => ({
      ...prev,
      registrations: [...newRegs, ...prev.registrations]
    }));
    try {
      await fetch('/api/register/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrations: newRegs })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    setData((prev) => ({
      ...prev,
      registrations: prev.registrations.filter((r) => r.id !== id)
    }));
    try {
      await fetch('/api/register/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllRegistrations = async () => {
    setData((prev) => ({
      ...prev,
      registrations: []
    }));
    try {
      await fetch('/api/register/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTournament = async (newMatches: Match[], newTournament?: Tournament) => {
    setData((prev) => {
      const prevTournaments = prev.tournaments || [];
      const updatedTournaments = newTournament
        ? [newTournament, ...prevTournaments.filter((t) => t.id !== newTournament.id)]
        : prevTournaments;

      // PRESERVE ALL PREVIOUS MATCHES! Only replace matches if exact same ID
      const newIds = new Set(newMatches.map((m) => m.id));
      const remainingMatches = prev.matches.filter((m) => !newIds.has(m.id));
      return {
        ...prev,
        tournaments: updatedTournaments,
        matches: [...newMatches, ...remainingMatches],
        activeTournamentId: newTournament?.id || prev.activeTournamentId
      };
    });

    if (newTournament) {
      setSelectedTournamentFilter(newTournament.id);
      setSelectedSportFilter(newTournament.sportId);
    } else if (newMatches.length > 0) {
      setSelectedSportFilter(newMatches[0].sportId);
    }
    setActiveTab('schedule');

    try {
      await fetch('/api/tournament/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: newMatches, tournament: newTournament })
      });
    } catch (e) {
      console.warn('Updated tournament locally:', e);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    setData((prev) => ({
      ...prev,
      tournaments: (prev.tournaments || []).filter((t) => t.id !== tournamentId),
      matches: prev.matches.filter((m) => m.tournamentId !== tournamentId)
    }));

    if (selectedTournamentFilter === tournamentId) {
      setSelectedTournamentFilter('all');
    }

    try {
      await fetch('/api/tournament/delete-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId })
      });
    } catch (e) {
      console.warn('Deleted tournament locally:', e);
    }
  };


  const handleApplyNewMatches = (newMatches: Match[], newTournament?: Tournament) => {
    handleCreateTournament(newMatches, newTournament);
  };

  const handleMatchUpdate = async (updatedMatchData: Partial<Match>) => {
    if (!editingMatch) return;
    const matchId = editingMatch.id;
    
    setData((prev) => {
      const updatedMatches = prev.matches.map((m) =>
        m.id === matchId ? { ...m, ...updatedMatchData } : m
      );
      return {
        ...prev,
        matches: updatedMatches
      };
    });
    setEditingMatch(null);

    try {
      await fetch('/api/match/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: matchId, ...updatedMatchData })
      });
    } catch (e) {
      console.warn('Match updated locally:', e);
    }
  };

  const handleAddMatch = async () => {
    const newMatch: Partial<Match> = {
      sportId: 'football',
      subCategory: 'Bóng đá Nam Khối 11',
      stage: 'Bán kết',
      teamA: '11B1',
      teamB: '11B2',
      date: '2026-10-08',
      time: '15:00',
      venue: 'Sân bóng đá cỏ nhân tạo THPT Phú Lâm'
    };

    try {
      const res = await fetch('/api/match/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMatch)
      });
      const resData = await res.json();
      if (resData.success) {
        setData((prev) => ({
          ...prev,
          matches: [...prev.matches, resData.match]
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddAnnouncement = (ann: Announcement) => {
    setData((prev) => ({
      ...prev,
      announcements: [ann, ...prev.announcements]
    }));
  };

  const handleSelectSportForRegister = (sportId: SportId) => {
    setSelectedSportFilter(sportId);
    setActiveTab('tournament');
  };

  const handleSelectSportForSchedule = (sportId: SportId) => {
    setSelectedSportFilter(sportId);
    setActiveTab('schedule');
  };

  const handleGenerateAIForMatch = (match: Match) => {
    setPreselectedMatchForAI(match);
    setActiveTab('ai');
  };

  // Find live match for hero ticker
  const liveMatch = data.matches.find((m) => m.status === 'Live');

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans font-bold selection:bg-amber-400 selection:text-slate-950">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedSportFilter={selectedSportFilter}
        setSelectedSportFilter={setSelectedSportFilter}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <>
            <HeroBanner
              liveMatch={liveMatch}
              registrations={data.registrations}
              matches={data.matches}
              sports={data.sports}
              onRegisterClick={() => setActiveTab('tournament')}
              onScheduleClick={() => setActiveTab('schedule')}
            />
            <SportsGrid
              sports={data.sports}
              matches={data.matches}
              registrations={data.registrations}
              tournamentData={data}
              isAdmin={isAdmin}
              onSelectSportForRegister={handleSelectSportForRegister}
              onSelectSportForSchedule={handleSelectSportForSchedule}
              onUpdateRegistration={handleUpdateRegistration}
              onDeleteRegistration={handleDeleteRegistration}
              onAddNewMatch={(match) => {
                setData((prev) => ({ ...prev, matches: [...prev.matches, match] }));
                fetch('/api/match/add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(match),
                }).catch((e) => console.error(e));
              }}
              onUpdateMatch={(match) => {
                setData((prev) => ({
                  ...prev,
                  matches: prev.matches.map((m) => (m.id === match.id ? match : m)),
                }));
                fetch('/api/match/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(match),
                }).catch((e) => console.error(e));
              }}
              onDeleteMatch={(id) => {
                setData((prev) => ({
                  ...prev,
                  matches: prev.matches.filter((m) => m.id !== id),
                }));
                fetch('/api/match/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id }),
                }).catch((e) => console.error(e));
              }}
              onDeleteSport={(sportId) => {
                fetch('/api/tournament/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sportId })
                })
                .then(res => res.json())
                .then(() => {
                  setData(prev => ({
                    ...prev,
                    matches: prev.matches.filter(m => m.sportId !== sportId)
                  }));
                });
              }}
            />
          </>
        )}

        {(activeTab === 'tournament' || activeTab === 'register') && (
          <TournamentManager
            sports={data.sports}
            registrations={data.registrations}
            tournaments={data.tournaments || []}
            activeTournamentId={selectedTournamentFilter}
            drawStates={data.drawStates}
            onSelectTournament={(tourId) => {
              setSelectedTournamentFilter(tourId);
              const tour = data.tournaments?.find((t) => t.id === tourId);
              if (tour) setSelectedSportFilter(tour.sportId);
              setActiveTab('schedule');
            }}
            onDeleteTournament={handleDeleteTournament}
            onNewRegistration={handleNewRegistration}
            onUpdateRegistration={handleUpdateRegistration}
            onBulkRegistration={handleBulkRegistration}
            onDeleteRegistration={handleDeleteRegistration}
            onClearAllRegistrations={handleClearAllRegistrations}
            onCreateTournament={handleCreateTournament}
            preselectedSportId={selectedSportFilter !== 'all' ? (selectedSportFilter as SportId) : 'caro'}
            onNavigateToSchedule={() => setActiveTab('schedule')}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleAndBracket
            matches={data.matches}
            sports={data.sports}
            registrations={data.registrations}
            tournaments={data.tournaments || []}
            drawStates={data.drawStates}
            selectedTournamentFilter={selectedTournamentFilter}
            setSelectedTournamentFilter={setSelectedTournamentFilter}
            isAdmin={isAdmin}
            onOpenMatchEdit={(match) => setEditingMatch(match)}
            onOpenAddMatch={handleAddMatch}
            onApplyNewMatches={handleApplyNewMatches}
            selectedSportFilter={selectedSportFilter}
            setSelectedSportFilter={setSelectedSportFilter}
            onDeleteTournament={handleDeleteTournament}
            onNavigateToCreateTournament={() => setActiveTab('tournament')}
          />
        )}


        {activeTab === 'results' && (
          <ResultsAndLeaderboard
            medalTallies={data.medalTallies}
            matches={data.matches}
            sports={data.sports}
            registrations={data.registrations}
            tournaments={data.tournaments || []}
            selectedTournamentFilter={selectedTournamentFilter}
            setSelectedTournamentFilter={setSelectedTournamentFilter}
            selectedSportFilter={selectedSportFilter}
            setSelectedSportFilter={setSelectedSportFilter}
            onGenerateAICommentary={handleGenerateAIForMatch}
            isAdmin={isAdmin}
            onOpenMatchEdit={(match) => setEditingMatch(match)}
            onApplyNewMatches={handleApplyNewMatches}
          />
        )}

        {activeTab === 'ai' && (
          <AICommentator
            matches={data.matches}
            sports={data.sports}
            preselectedMatch={preselectedMatchForAI}
          />
        )}

        {activeTab === 'news' && (
          <Announcements
            announcements={data.announcements}
            isAdmin={isAdmin}
            onAddAnnouncement={handleAddAnnouncement}
          />
        )}
      </main>

      {/* Edit Match Score Modal */}
      {editingMatch && (
        <MatchEditModal
          match={editingMatch}
          onClose={() => setEditingMatch(null)}
          onSave={handleMatchUpdate}
        />
      )}

      {/* Royal Blue Floating Footer */}
      <footer className="mt-auto bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white border-t-4 border-amber-400/90 shadow-2xl py-8 text-xs">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-400 bg-white p-0.5 shrink-0 flex items-center justify-center shadow">
              <img 
                src={SCHOOL_LOGO_DATA_URI} 
                alt="Logo Trường THPT Phú Lâm" 
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <span className="font-bold text-white text-sm">Trường THPT Phú Lâm · Hội Thao Thể Thao Học Đường</span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <span>© 2026 - Ban Tổ Chức Hội Thao & Đoàn Trường THPT Phú Lâm</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold">Tự hào sức trẻ Phú Lâm</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
