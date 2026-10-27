import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initialTournamentData, getDefault20Registrations } from './src/data/mockSportsData.js';
import { Match, Registration, Announcement, Tournament } from './src/types/sports.js';

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

app.use(express.json());

// In-memory data store with initial data
let tournamentState = { ...initialTournamentData };

// Gemini AI setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// REST APIs
app.get('/api/data', (_req, res) => {
  res.json(tournamentState);
});

app.post('/api/register', (req, res) => {
  const newReg: Registration = {
    ...req.body,
    id: `REG-${Date.now().toString().slice(-4)}`,
    status: 'Approved', // Auto-approve for demo smoothness
    registeredAt: new Date().toISOString().split('T')[0],
  };
  
  tournamentState.registrations.unshift(newReg);
  res.json({ success: true, registration: newReg });
});

app.post('/api/register/bulk', (req, res) => {
  const newRegsPayload: any[] = req.body.registrations || [];
  const createdRegs: Registration[] = newRegsPayload.map((item, idx) => ({
    ...item,
    id: `REG-${(Date.now() + idx).toString().slice(-5)}`,
    status: 'Approved',
    registeredAt: new Date().toISOString().split('T')[0],
  }));

  tournamentState.registrations.unshift(...createdRegs);
  res.json({ success: true, count: createdRegs.length, registrations: createdRegs });
});

app.post('/api/register/delete', (req, res) => {
  const { id } = req.body;
  tournamentState.registrations = tournamentState.registrations.filter((r) => r.id !== id);
  res.json({ success: true, count: tournamentState.registrations.length });
});

app.post('/api/register/update', (req, res) => {
  const { id, ...updatedFields } = req.body;
  const index = tournamentState.registrations.findIndex((r) => r.id === id);
  if (index !== -1) {
    tournamentState.registrations[index] = {
      ...tournamentState.registrations[index],
      ...updatedFields,
    };
    res.json({ success: true, registration: tournamentState.registrations[index] });
  } else {
    res.status(404).json({ error: 'Registration not found' });
  }
});

app.post('/api/register/reset', (_req, res) => {
  tournamentState.registrations = [];
  res.json({ success: true, count: 0, registrations: [] });
});

app.post('/api/register/clear', (_req, res) => {
  tournamentState.registrations = [];
  res.json({ success: true, count: 0, registrations: [] });
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

  // 2. Add matches WITHOUT wiping out matches of other tournaments or other sports
  if (Array.isArray(matches) && matches.length > 0) {
    const newIds = new Set(matches.map((m: Match) => m.id));
    const remainingMatches = tournamentState.matches.filter((m: Match) => !newIds.has(m.id));
    tournamentState.matches = [...matches, ...remainingMatches];
  }

  res.json({ 
    success: true, 
    matchesCount: tournamentState.matches.length,
    tournamentsCount: tournamentState.tournaments?.length || 0,
    tournaments: tournamentState.tournaments,
    activeTournamentId: tournamentState.activeTournamentId
  });
});

app.post('/api/tournament/delete-tournament', (req, res) => {
  const { tournamentId } = req.body;
  if (!tournamentId) {
    return res.status(400).json({ error: 'Missing tournamentId' });
  }

  // Delete only matches linked to this tournament
  tournamentState.matches = tournamentState.matches.filter((m: Match) => m.tournamentId !== tournamentId);
  if (tournamentState.tournaments) {
    tournamentState.tournaments = tournamentState.tournaments.filter((t: Tournament) => t.id !== tournamentId);
  }
  if (tournamentState.activeTournamentId === tournamentId) {
    tournamentState.activeTournamentId = tournamentState.tournaments?.[0]?.id || 'all';
  }

  res.json({ 
    success: true, 
    matchesCount: tournamentState.matches.length,
    tournaments: tournamentState.tournaments,
    activeTournamentId: tournamentState.activeTournamentId
  });
});


app.post('/api/match/update', (req, res) => {
  const { id, scoreA, scoreB, setsDetail, status, mvpPlayer, commentary, date, time, venue } = req.body;
  const matchIndex = tournamentState.matches.findIndex((m) => m.id === id);

  if (matchIndex !== -1) {
    const updatedMatch = {
      ...tournamentState.matches[matchIndex],
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
    if (status === 'Finished' && updatedMatch.stage === 'Chung kết') {
      const winner = scoreA > scoreB ? updatedMatch.teamA : updatedMatch.teamB;
      const runnerUp = scoreA > scoreB ? updatedMatch.teamB : updatedMatch.teamA;

      // Clean class names (e.g., extract "12A1" from "12A1 (Trần Duy)")
      const cleanWinner = winner.match(/1[012][A-Z][0-9]+/)?.[0] || winner;
      const cleanRunnerUp = runnerUp.match(/1[012][A-Z][0-9]+/)?.[0] || runnerUp;

      // Update gold for winner
      const wIdx = tournamentState.medalTallies.findIndex((m) => m.className === cleanWinner);
      if (wIdx !== -1) {
        tournamentState.medalTallies[wIdx].gold += 1;
        tournamentState.medalTallies[wIdx].totalPoints += 3;
      } else {
        const grade = parseInt(cleanWinner.substring(0, 2)) || 10;
        tournamentState.medalTallies.push({ className: cleanWinner, grade, gold: 1, silver: 0, bronze: 0, totalPoints: 3 });
      }

      // Update silver for runnerUp
      const rIdx = tournamentState.medalTallies.findIndex((m) => m.className === cleanRunnerUp);
      if (rIdx !== -1) {
        tournamentState.medalTallies[rIdx].silver += 1;
        tournamentState.medalTallies[rIdx].totalPoints += 2;
      } else {
        const grade = parseInt(cleanRunnerUp.substring(0, 2)) || 10;
        tournamentState.medalTallies.push({ className: cleanRunnerUp, grade, gold: 0, silver: 1, bronze: 0, totalPoints: 2 });
      }

      // Re-sort medal tallies
      tournamentState.medalTallies.sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.totalPoints - a.totalPoints);
    }

    res.json({ success: true, match: updatedMatch, medalTallies: tournamentState.medalTallies });
  } else {
    res.status(404).json({ error: 'Match not found' });
  }
});

app.post('/api/tournament/delete', (req, res) => {
  const { sportId } = req.body;
  if (!sportId) {
    return res.status(400).json({ error: 'Missing sportId' });
  }
  tournamentState.matches = tournamentState.matches.filter((m) => m.sportId !== sportId);
  res.json({ success: true, count: tournamentState.matches.length });
});

app.post('/api/match/add', (req, res) => {
  const newMatch: Match = {
    ...req.body,
    id: `M-${Date.now().toString().slice(-4)}`,
    status: 'Upcoming',
  };
  tournamentState.matches.push(newMatch);
  res.json({ success: true, match: newMatch });
});

app.post('/api/announcement', (req, res) => {
  const newAnn: Announcement = {
    ...req.body,
    id: `ANN-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split('T')[0],
    author: req.body.author || 'Ban Tổ Chức Hội Thao',
  };
  tournamentState.announcements.unshift(newAnn);
  res.json({ success: true, announcement: newAnn });
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
