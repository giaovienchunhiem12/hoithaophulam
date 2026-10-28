import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initialTournamentData } from './src/data/mockSportsData.js';
import { Match, Registration, Announcement, Tournament, TournamentData, DrawStateRecord } from './src/types/sports.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.removeHeader('X-Frame-Options');
  next();
});

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.resolve('./data');
const STATE_FILE = path.join(DATA_DIR, 'tournament-state.json');

function loadPersistedState(): TournamentData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sports)) {
        const hasContent =
          (Array.isArray(parsed.registrations) && parsed.registrations.length > 0) ||
          (Array.isArray(parsed.matches) && parsed.matches.length > 0) ||
          (Array.isArray(parsed.tournaments) && parsed.tournaments.length > 0) ||
          parsed.explicitlyCleared === true;
        if (hasContent) {
          return {
            ...initialTournamentData,
            ...parsed,
            sports: initialTournamentData.sports,
            drawStates: parsed.drawStates || {},
            updatedAt: parsed.updatedAt || Date.now(),
          };
        }
      }
    }
  } catch (err) {
    console.warn('Could not load persisted state, using default initial data:', err);
  }
  const fresh: TournamentData = {
    ...initialTournamentData,
    drawStates: initialTournamentData.drawStates || {},
    updatedAt: Date.now(),
  };
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(fresh), 'utf-8');
  } catch (e) {
    console.warn('Failed to write initial state file:', e);
  }
  return fresh;
}

// Authoritative server state persisted to disk
let tournamentState: TournamentData & { explicitlyCleared?: boolean } = loadPersistedState();

// Connected SSE clients for instant multi-device synchronization
const sseClients = new Set<express.Response>();

function saveStateAndBroadcast() {
  tournamentState.updatedAt = Date.now();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(tournamentState), 'utf-8');
  } catch (err) {
    console.error('Failed to persist tournament state:', err);
  }

  const payload = `event: sync\ndata: ${JSON.stringify(tournamentState)}\n\n`;
  sseClients.forEach((clientRes) => {
    try {
      clientRes.write(payload);
    } catch {
      sseClients.delete(clientRes);
    }
  });
}

// Keepalive heartbeat for SSE connections every 15s
setInterval(() => {
  sseClients.forEach((clientRes) => {
    try {
      clientRes.write(`: keepalive ${Date.now()}\n\n`);
    } catch {
      sseClients.delete(clientRes);
    }
  });
}, 15000);

// Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Real-time Server-Sent Events (SSE) stream for multi-device sync
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send immediate initial sync snapshot
  res.write(`event: sync\ndata: ${JSON.stringify(tournamentState)}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// REST APIs
app.get('/api/data', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(tournamentState);
});

// Full client-to-server state reconciliation endpoint
app.post('/api/sync', (req, res) => {
  const incoming = req.body as Partial<TournamentData>;
  if (!incoming) {
    return res.status(400).json({ error: 'Invalid sync payload' });
  }

  if (Array.isArray(incoming.registrations)) {
    tournamentState.registrations = incoming.registrations;
  }
  if (Array.isArray(incoming.matches)) {
    tournamentState.matches = incoming.matches;
  }
  if (Array.isArray(incoming.tournaments)) {
    tournamentState.tournaments = incoming.tournaments;
  }
  if (Array.isArray(incoming.medalTallies)) {
    tournamentState.medalTallies = incoming.medalTallies;
  }
  if (Array.isArray(incoming.announcements)) {
    tournamentState.announcements = incoming.announcements;
  }
  if (typeof incoming.activeTournamentId === 'string') {
    tournamentState.activeTournamentId = incoming.activeTournamentId;
  }
  if (incoming.drawStates && typeof incoming.drawStates === 'object') {
    tournamentState.drawStates = {
      ...(tournamentState.drawStates || {}),
      ...incoming.drawStates,
    };
  }
  tournamentState.explicitlyCleared = false;
  saveStateAndBroadcast();
  res.json({ success: true, data: tournamentState });
});

// Live Bracket Draw State Sync (syncs random wheel spins & slot assignments across devices)
app.post('/api/draw-state', (req, res) => {
  const { sportId, numGroups, groupPools, bracketSlots, customTournamentName, matches, tournament } = req.body;
  if (!sportId) {
    return res.status(400).json({ error: 'Missing sportId' });
  }

  if (!tournamentState.drawStates) {
    tournamentState.drawStates = {};
  }

  const record: DrawStateRecord = {
    sportId,
    numGroups: Number(numGroups) || 1,
    groupPools: groupPools || {},
    bracketSlots: Array.isArray(bracketSlots) ? bracketSlots : [],
    customTournamentName: customTournamentName || '',
    updatedAt: Date.now(),
  };

  tournamentState.drawStates[sportId] = record;

  // If live matches/tournament were also provided, update the active tournament matches immediately
  if (tournament) {
    if (!tournamentState.tournaments) {
      tournamentState.tournaments = [];
    }
    const existsIdx = tournamentState.tournaments.findIndex((t: Tournament) => t.id === tournament.id);
    if (existsIdx >= 0) {
      tournamentState.tournaments[existsIdx] = tournament;
    } else {
      tournamentState.tournaments.unshift(tournament);
    }
    tournamentState.activeTournamentId = tournament.id;
  }

  if (Array.isArray(matches) && matches.length > 0) {
    const targetTourId = tournament?.id || matches[0]?.tournamentId;
    const remainingMatches = tournamentState.matches.filter((m: Match) => {
      if (targetTourId && m.tournamentId === targetTourId) return false;
      if (!targetTourId && m.sportId === sportId) return false;
      return true;
    });
    tournamentState.matches = [...matches, ...remainingMatches];
  }

  saveStateAndBroadcast();
  res.json({
    success: true,
    drawState: record,
    updatedAt: tournamentState.updatedAt,
  });
});

app.post('/api/register', (req, res) => {
  const newReg: Registration = {
    ...req.body,
    id: req.body.id || `REG-${Date.now().toString().slice(-4)}`,
    status: 'Approved',
    registeredAt: req.body.registeredAt || new Date().toISOString().split('T')[0],
  };

  const existsIdx = tournamentState.registrations.findIndex((r) => r.id === newReg.id);
  if (existsIdx >= 0) {
    tournamentState.registrations[existsIdx] = newReg;
  } else {
    tournamentState.registrations.unshift(newReg);
  }
  tournamentState.explicitlyCleared = false;
  saveStateAndBroadcast();
  res.json({ success: true, registration: newReg, updatedAt: tournamentState.updatedAt });
});

app.post('/api/register/bulk', (req, res) => {
  const newRegsPayload: any[] = req.body.registrations || [];
  const createdRegs: Registration[] = newRegsPayload.map((item, idx) => ({
    ...item,
    id: item.id || `REG-${(Date.now() + idx).toString().slice(-5)}`,
    status: 'Approved',
    registeredAt: item.registeredAt || new Date().toISOString().split('T')[0],
  }));

  const existingIds = new Set(createdRegs.map((r) => r.id));
  const filteredExisting = tournamentState.registrations.filter((r) => !existingIds.has(r.id));
  tournamentState.registrations = [...createdRegs, ...filteredExisting];
  tournamentState.explicitlyCleared = false;
  saveStateAndBroadcast();
  res.json({ success: true, count: createdRegs.length, registrations: createdRegs, updatedAt: tournamentState.updatedAt });
});

app.post('/api/register/delete', (req, res) => {
  const { id } = req.body;
  tournamentState.registrations = tournamentState.registrations.filter((r) => r.id !== id);
  saveStateAndBroadcast();
  res.json({ success: true, count: tournamentState.registrations.length, updatedAt: tournamentState.updatedAt });
});

app.post('/api/register/update', (req, res) => {
  const { id, ...updatedFields } = req.body;
  const index = tournamentState.registrations.findIndex((r) => r.id === id);
  if (index !== -1) {
    tournamentState.registrations[index] = {
      ...tournamentState.registrations[index],
      ...updatedFields,
    };
    saveStateAndBroadcast();
    res.json({ success: true, registration: tournamentState.registrations[index], updatedAt: tournamentState.updatedAt });
  } else {
    res.status(404).json({ error: 'Registration not found' });
  }
});

app.post('/api/register/reset', (_req, res) => {
  tournamentState.registrations = [];
  tournamentState.explicitlyCleared = true;
  saveStateAndBroadcast();
  res.json({ success: true, count: 0, registrations: [], updatedAt: tournamentState.updatedAt });
});

app.post('/api/register/clear', (_req, res) => {
  tournamentState.registrations = [];
  tournamentState.explicitlyCleared = true;
  saveStateAndBroadcast();
  res.json({ success: true, count: 0, registrations: [], updatedAt: tournamentState.updatedAt });
});

app.post('/api/tournament/create', (req, res) => {
  const { matches, tournament } = req.body;

  // 1. Save or update the tournament in tournaments array
  if (tournament) {
    if (!tournamentState.tournaments) {
      tournamentState.tournaments = [];
    }
    const existsIdx = tournamentState.tournaments.findIndex((t: Tournament) => t.id === tournament.id);
    if (existsIdx >= 0) {
      tournamentState.tournaments[existsIdx] = tournament;
    } else {
      tournamentState.tournaments.unshift(tournament);
    }
    tournamentState.activeTournamentId = tournament.id;
  }

  // 2. Replace matches belonging to the same tournamentId (or same IDs) while preserving other tournaments
  if (Array.isArray(matches) && matches.length > 0) {
    const newIds = new Set(matches.map((m: Match) => m.id));
    const targetTourId = tournament?.id;
    const remainingMatches = tournamentState.matches.filter((m: Match) => {
      if (newIds.has(m.id)) return false;
      if (targetTourId && m.tournamentId === targetTourId) return false;
      return true;
    });
    tournamentState.matches = [...matches, ...remainingMatches];
  }

  tournamentState.explicitlyCleared = false;
  saveStateAndBroadcast();

  res.json({
    success: true,
    matchesCount: tournamentState.matches.length,
    tournamentsCount: tournamentState.tournaments?.length || 0,
    tournaments: tournamentState.tournaments,
    activeTournamentId: tournamentState.activeTournamentId,
    updatedAt: tournamentState.updatedAt,
  });
});

app.post('/api/tournament/delete-tournament', (req, res) => {
  const { tournamentId } = req.body;
  if (!tournamentId) {
    return res.status(400).json({ error: 'Missing tournamentId' });
  }

  tournamentState.matches = tournamentState.matches.filter((m: Match) => m.tournamentId !== tournamentId);
  if (tournamentState.tournaments) {
    tournamentState.tournaments = tournamentState.tournaments.filter((t: Tournament) => t.id !== tournamentId);
  }
  if (tournamentState.activeTournamentId === tournamentId) {
    tournamentState.activeTournamentId = tournamentState.tournaments?.[0]?.id || 'all';
  }

  saveStateAndBroadcast();
  res.json({
    success: true,
    matchesCount: tournamentState.matches.length,
    tournaments: tournamentState.tournaments,
    activeTournamentId: tournamentState.activeTournamentId,
    updatedAt: tournamentState.updatedAt,
  });
});

app.post('/api/match/update', (req, res) => {
  const {
    id,
    teamA,
    teamB,
    stage,
    groupName,
    subCategory,
    scoreA,
    scoreB,
    setsDetail,
    status,
    mvpPlayer,
    commentary,
    date,
    time,
    venue,
  } = req.body;
  const matchIndex = tournamentState.matches.findIndex((m) => m.id === id);

  if (matchIndex !== -1) {
    const updatedMatch = {
      ...tournamentState.matches[matchIndex],
      ...(teamA !== undefined ? { teamA } : {}),
      ...(teamB !== undefined ? { teamB } : {}),
      ...(stage !== undefined ? { stage } : {}),
      ...(groupName !== undefined ? { groupName } : {}),
      ...(subCategory !== undefined ? { subCategory } : {}),
      ...(scoreA !== undefined ? { scoreA } : {}),
      ...(scoreB !== undefined ? { scoreB } : {}),
      ...(setsDetail !== undefined ? { setsDetail } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(date !== undefined ? { date } : {}),
      ...(time !== undefined ? { time } : {}),
      ...(venue !== undefined ? { venue } : {}),
      ...(mvpPlayer !== undefined ? { mvpPlayer } : {}),
      ...(commentary !== undefined ? { commentary } : {}),
    };
    tournamentState.matches[matchIndex] = updatedMatch;

    // Recalculate medal tally if a final match finished
    if (status === 'Finished' && updatedMatch.stage === 'Chung kết' && scoreA !== undefined && scoreB !== undefined) {
      const winner = scoreA > scoreB ? updatedMatch.teamA : updatedMatch.teamB;
      const runnerUp = scoreA > scoreB ? updatedMatch.teamB : updatedMatch.teamA;

      const cleanWinner = winner.match(/1[012][A-Z][0-9]+/)?.[0] || winner;
      const cleanRunnerUp = runnerUp.match(/1[012][A-Z][0-9]+/)?.[0] || runnerUp;

      const wIdx = tournamentState.medalTallies.findIndex((m) => m.className === cleanWinner);
      if (wIdx !== -1) {
        tournamentState.medalTallies[wIdx].gold += 1;
        tournamentState.medalTallies[wIdx].totalPoints += 3;
      } else {
        const grade = parseInt(cleanWinner.substring(0, 2)) || 10;
        tournamentState.medalTallies.push({ className: cleanWinner, grade, gold: 1, silver: 0, bronze: 0, totalPoints: 3 });
      }

      const rIdx = tournamentState.medalTallies.findIndex((m) => m.className === cleanRunnerUp);
      if (rIdx !== -1) {
        tournamentState.medalTallies[rIdx].silver += 1;
        tournamentState.medalTallies[rIdx].totalPoints += 2;
      } else {
        const grade = parseInt(cleanRunnerUp.substring(0, 2)) || 10;
        tournamentState.medalTallies.push({ className: cleanRunnerUp, grade, gold: 0, silver: 1, bronze: 0, totalPoints: 2 });
      }

      tournamentState.medalTallies.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.totalPoints - a.totalPoints);
    }

    saveStateAndBroadcast();
    res.json({ success: true, match: updatedMatch, medalTallies: tournamentState.medalTallies, updatedAt: tournamentState.updatedAt });
  } else if (id && req.body.sportId) {
    // Upsert match if it was created on the client
    const newMatch: Match = {
      ...req.body,
      status: req.body.status || 'Upcoming',
    };
    tournamentState.matches.push(newMatch);
    saveStateAndBroadcast();
    res.json({ success: true, match: newMatch, medalTallies: tournamentState.medalTallies, updatedAt: tournamentState.updatedAt });
  } else {
    res.status(404).json({ error: 'Match not found' });
  }
});

app.post('/api/match/delete', (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing match id' });
  }
  tournamentState.matches = tournamentState.matches.filter((m) => m.id !== id);
  saveStateAndBroadcast();
  res.json({ success: true, count: tournamentState.matches.length, updatedAt: tournamentState.updatedAt });
});

app.post('/api/tournament/delete', (req, res) => {
  const { sportId } = req.body;
  if (!sportId) {
    return res.status(400).json({ error: 'Missing sportId' });
  }
  tournamentState.matches = tournamentState.matches.filter((m) => m.sportId !== sportId);
  if (tournamentState.tournaments) {
    tournamentState.tournaments = tournamentState.tournaments.filter((t) => t.sportId !== sportId);
  }
  if (tournamentState.drawStates && tournamentState.drawStates[sportId]) {
    delete tournamentState.drawStates[sportId];
  }
  saveStateAndBroadcast();
  res.json({ success: true, count: tournamentState.matches.length, updatedAt: tournamentState.updatedAt });
});

app.post('/api/match/add', (req, res) => {
  const newMatch: Match = {
    ...req.body,
    id: req.body.id || `M-${Date.now().toString().slice(-4)}`,
    status: req.body.status || 'Upcoming',
  };
  const existsIdx = tournamentState.matches.findIndex((m) => m.id === newMatch.id);
  if (existsIdx >= 0) {
    tournamentState.matches[existsIdx] = newMatch;
  } else {
    tournamentState.matches.push(newMatch);
  }
  saveStateAndBroadcast();
  res.json({ success: true, match: newMatch, updatedAt: tournamentState.updatedAt });
});

app.post('/api/announcement', (req, res) => {
  const newAnn: Announcement = {
    ...req.body,
    id: req.body.id || `ANN-${Date.now().toString().slice(-4)}`,
    date: req.body.date || new Date().toISOString().split('T')[0],
    author: req.body.author || 'Ban Tổ Chức Hội Thao',
  };
  const existsIdx = tournamentState.announcements.findIndex((a) => a.id === newAnn.id);
  if (existsIdx >= 0) {
    tournamentState.announcements[existsIdx] = newAnn;
  } else {
    tournamentState.announcements.unshift(newAnn);
  }
  saveStateAndBroadcast();
  res.json({ success: true, announcement: newAnn, updatedAt: tournamentState.updatedAt });
});

// Gemini AI APIs
app.post('/api/gemini/commentary', async (req, res) => {
  try {
    const { sportName, stage, teamA, teamB, scoreA, scoreB, setsDetail, mvpPlayer } = req.body;
    
    const prompt = `Bạn là một bình luận viên thể thao học đường cực kỳ sôi nổi, hào hứng và truyền cảm hứng của Trường THPT Phú Lâm.
Hãy viết một bài bình luận / tin bài tường thuật ngắn (khoảng 150-200 từ) về trận đấu sau:
- Môn thi đấu: ${sportName}
- Vòng đấu: ${stage}
- Đội 1: ${teamA}
- Đội 2: ${teamB}
- Tỉ số chung cuộc: ${scoreA} - ${scoreB}
- Chi tiết các séc / hiệp: ${setsDetail || 'Kịch tính'}
- VĐV Xuất sắc nhất (MVP): ${mvpPlayer || 'Chưa xác định'}

Yêu cầu: Viết bằng tiếng Việt, giọng văn hào hứng, giàu cảm xúc, ngợi khen tinh thần thể thao học đường THPT Phú Lâm, có tiêu đề bài viết giật gân, hấp dẫn và các hashtag liên quan như #THPTPhuLam #HoiThaoHocDuong.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ success: true, commentary: response.text });
  } catch (error: any) {
    console.error('Gemini Commentary Error:', error);
    res.status(500).json({ error: error?.message || 'Không thể tạo bình luận AI lúc này' });
  }
});

app.post('/api/gemini/schedule', async (req, res) => {
  try {
    const { sportsList, classesList } = req.body;

    const prompt = `Bạn là Chuyên gia Xếp lịch Thi đấu Thể thao cho Ban Tổ Chức Hội thao THPT Phú Lâm.
Dựa trên danh sách các môn thi: ${sportsList || 'Bóng đá, Bóng chuyền, Pickleball, Cầu lông, Kéo co, Cờ Vua, Cờ Tướng, Cờ Caro'} 
và các khối lớp 10, 11, 12, hãy lập đề xuất Lịch Thi Đấu thông minh không xung đột địa điểm cho 3 ngày tới.

Cung cấp kết quả dạng danh sách 4-5 trận đấu mẫu tối ưu theo format:
- Ngày - Giờ
- Môn & Hạng mục
- Đội A vs Đội B
- Khung giờ & Sân thi đấu phù hợp (Sân bóng cỏ nhân tạo, Sân Pickleball, Nhà đa năng, Sân bóng rổ, Sảnh cờ).
Kèm lời khuyên ngắn gọn cho Ban Tổ Chức về công tác chuẩn bị y tế, trọng tài và trang thiết bị.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ success: true, scheduleSuggestion: response.text });
  } catch (error: any) {
    console.error('Gemini Schedule Error:', error);
    res.status(500).json({ error: error?.message || 'Không thể đề xuất lịch lúc này' });
  }
});

// Vite Middleware Integration
async function startServer() {
  const path = await import('path');
  const fs = await import('fs');

  // Serve static files from public directory first
  app.use(express.static(path.resolve('./public')));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      const cleanPath = url.split('?')[0];

      // Bypass API requests and direct file requests with extensions
      if ((req.method !== 'GET' && req.method !== 'HEAD') || cleanPath.startsWith('/api') || path.extname(cleanPath) !== '') {
        return next();
      }

      try {
        let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' });
        if (req.method === 'HEAD') {
          return res.end();
        }
        res.end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve('./dist')));
    app.use('*', (req, res, next) => {
      const cleanPath = req.originalUrl.split('?')[0];
      if ((req.method !== 'GET' && req.method !== 'HEAD') || cleanPath.startsWith('/api') || path.extname(cleanPath) !== '') {
        return next();
      }
      if (req.method === 'HEAD') {
        return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end();
      }
      res.sendFile(path.resolve('./dist/index.html'));
    });
  }

  const host = '0.0.0.0';
  app.listen(Number(PORT), host, () => {
    console.log(`Server is running on http://${host}:${PORT}`);
  });
}

startServer();
