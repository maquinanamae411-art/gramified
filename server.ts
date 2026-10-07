import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DB_DIR, 'ggr_database.json');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface AttemptLog {
  id: string;
  ts: string;
  phase: string;
  phaseLabel?: string;
  weekLabel?: string;
  team: string;
  player: string;
  runnerIndex?: number;
  roleAtTurn?: string;
  questionNumber?: number;
  prompt: string;
  chosen: string;
  correctAnswer?: string;
  correct: boolean;
}

interface TeamGroup {
  name: string;
  members: string[];
}

interface SurveyResponse {
  id?: string;
  teamName: string;
  timestamp: string;
  q1Rating: number;
  q2Rating: number;
  q3Rating: number;
  comments?: string;
}

interface AppState {
  pin: string;
  currentPhaseIndex: number;
  completedToday: Record<string, number[]>;
  groups: TeamGroup[];
  surveyResponses?: SurveyResponse[];
}

const defaultAppState: AppState = {
  pin: '1234',
  currentPhaseIndex: 0,
  completedToday: {},
  groups: [0, 1, 2, 3].map((i) => ({
    name: `Team ${i + 1}`,
    members: [1, 2, 3, 4, 5].map((n) => `Runner ${n}`),
  })),
  surveyResponses: [],
};

let appState: AppState = { ...defaultAppState };
let logData: AttemptLog[] = [];

// Load persisted database
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.appState) {
      appState = { ...defaultAppState, ...parsed.appState };
    }
    if (Array.isArray(parsed.logData)) {
      logData = parsed.logData;
    }
    console.log(`[DB] Loaded ${logData.length} records from ${DB_FILE}`);
  }
} catch (err) {
  console.error('[DB] Error loading database file, initializing defaults:', err);
}

function saveDatabase() {
  try {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ appState, logData }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('[DB] Error saving database file:', err);
  }
}

const PHASE_ITEMS_COUNT: Record<string, number> = {
  pretest: 6,
  session1: 5,
  session2: 5,
  session3: 5,
  session4: 5,
  posttest: 6,
};

function recalculateCompleted(state: AppState, logs: AttemptLog[]): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const [phaseKey, count] of Object.entries(PHASE_ITEMS_COUNT)) {
    result[phaseKey] = [];
    state.groups.forEach((g, gIdx) => {
      const teamLogs = logs.filter((l) => l.team === g.name && l.phase === phaseKey);
      if (teamLogs.length >= count) {
        result[phaseKey].push(gIdx);
      }
    });
  }
  return result;
}

// App & HTTP server setup
const app = express();
app.use(express.json({ limit: '10mb' }));
const server = http.createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server });

function broadcast(message: object, excludeClient?: WebSocket) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastPresence() {
  broadcast({
    type: 'PRESENCE',
    payload: { connectedDevices: wss.clients.size },
  });
}

// REST Endpoints
app.get('/api/sync', (req, res) => {
  res.json({
    appState,
    logData,
    connectedDevices: wss.clients.size,
  });
});

app.post('/api/logs', (req, res) => {
  const newLog: AttemptLog = req.body;
  if (!newLog || !newLog.id) {
    return res.status(400).json({ error: 'Invalid attempt log' });
  }

  // Idempotent: avoid duplicate log id
  const existingIdx = logData.findIndex((l) => l.id === newLog.id);
  if (existingIdx >= 0) {
    logData[existingIdx] = newLog;
  } else {
    logData.push(newLog);
  }

  appState.completedToday = recalculateCompleted(appState, logData);
  saveDatabase();

  broadcast({
    type: 'LOG_ADDED',
    payload: { log: newLog, appState },
  });

  res.json({ success: true, appState });
});

app.post('/api/logs/batch', (req, res) => {
  const incomingLogs: AttemptLog[] = req.body.logs || [];
  const logMap = new Map<string, AttemptLog>();
  logData.forEach((l) => logMap.set(l.id, l));
  incomingLogs.forEach((l) => logMap.set(l.id, l));
  logData = Array.from(logMap.values());

  appState.completedToday = recalculateCompleted(appState, logData);
  saveDatabase();

  broadcast({
    type: 'SYNC_FULL',
    payload: { appState, logData },
  });

  res.json({ success: true, count: logData.length, appState });
});

app.delete('/api/logs/:id', (req, res) => {
  const logId = req.params.id;
  logData = logData.filter((l) => l.id !== logId);
  appState.completedToday = recalculateCompleted(appState, logData);
  saveDatabase();

  broadcast({
    type: 'LOG_DELETED',
    payload: { logId, appState, logData },
  });

  res.json({ success: true, appState });
});

app.delete('/api/logs', (req, res) => {
  const team = req.query.team as string | undefined;
  if (team) {
    logData = logData.filter((l) => l.team !== team);
  } else {
    logData = [];
  }
  appState.completedToday = recalculateCompleted(appState, logData);
  saveDatabase();

  broadcast({
    type: 'LOGS_CLEARED',
    payload: { team, appState, logData },
  });

  res.json({ success: true, appState });
});

app.delete('/api/activity', (req, res) => {
  const phase = req.query.phase as string;
  const team = req.query.team as string;

  if (phase && team) {
    logData = logData.filter((l) => !(l.phase === phase && l.team === team));
  } else if (phase) {
    logData = logData.filter((l) => l.phase !== phase);
  }

  appState.completedToday = recalculateCompleted(appState, logData);
  saveDatabase();

  broadcast({
    type: 'ACTIVITY_DELETED',
    payload: { phase, team, appState, logData },
  });

  res.json({ success: true, appState });
});

app.post('/api/state', (req, res) => {
  const incomingState = req.body;
  if (incomingState) {
    appState = {
      ...appState,
      ...incomingState,
      completedToday: recalculateCompleted({ ...appState, ...incomingState }, logData),
    };
    saveDatabase();

    broadcast({
      type: 'STATE_UPDATED',
      payload: appState,
    });
  }
  res.json({ success: true, appState });
});

app.post('/api/surveys', (req, res) => {
  const survey: SurveyResponse = req.body;
  if (survey) {
    if (!appState.surveyResponses) appState.surveyResponses = [];
    appState.surveyResponses.push(survey);
    saveDatabase();

    broadcast({
      type: 'SURVEY_ADDED',
      payload: survey,
    });
  }
  res.json({ success: true });
});

// WebSocket Connection Management
wss.on('connection', (ws) => {
  // Send immediate authoritative full state on connect
  ws.send(
    JSON.stringify({
      type: 'INIT_STATE',
      payload: {
        appState,
        logData,
        connectedDevices: wss.clients.size,
      },
    })
  );

  broadcastPresence();

  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      if (msg.type === 'ATTEMPT_LOGGED') {
        const newLog: AttemptLog = msg.payload;
        if (newLog && newLog.id) {
          const idx = logData.findIndex((l) => l.id === newLog.id);
          if (idx >= 0) logData[idx] = newLog;
          else logData.push(newLog);

          appState.completedToday = recalculateCompleted(appState, logData);
          saveDatabase();

          broadcast({
            type: 'LOG_ADDED',
            payload: { log: newLog, appState },
          });
        }
      } else if (msg.type === 'LOGS_CLEARED') {
        const team = msg.payload?.team;
        if (team) {
          logData = logData.filter((l) => l.team !== team);
        } else {
          logData = [];
        }
        appState.completedToday = recalculateCompleted(appState, logData);
        saveDatabase();

        broadcast({
          type: 'LOGS_CLEARED',
          payload: { team, appState, logData },
        });
      } else if (msg.type === 'LOG_DELETED') {
        const logId = msg.payload?.logId;
        logData = logData.filter((l) => l.id !== logId);
        appState.completedToday = recalculateCompleted(appState, logData);
        saveDatabase();

        broadcast({
          type: 'LOG_DELETED',
          payload: { logId, appState, logData },
        });
      } else if (msg.type === 'ACTIVITY_DELETED') {
        const { phase, team } = msg.payload || {};
        if (phase && team) {
          logData = logData.filter((l) => !(l.phase === phase && l.team === team));
        }
        appState.completedToday = recalculateCompleted(appState, logData);
        saveDatabase();

        broadcast({
          type: 'ACTIVITY_DELETED',
          payload: { phase, team, appState, logData },
        });
      } else if (msg.type === 'STATE_UPDATED') {
        appState = {
          ...appState,
          ...msg.payload,
          completedToday: recalculateCompleted({ ...appState, ...msg.payload }, logData),
        };
        saveDatabase();

        broadcast({
          type: 'STATE_UPDATED',
          payload: appState,
        });
      } else if (msg.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
      }
    } catch (err) {
      console.error('[WS] Message handling error:', err);
    }
  });

  ws.on('close', () => {
    broadcastPresence();
  });
});

// Mount Vite or static server
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] GGR Real-Time Multi-Device Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
