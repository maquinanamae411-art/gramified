import { AppState, AttemptLog, SurveyResponse } from '../types';

export interface SyncCallbacks {
  onInitState?: (state: AppState, logs: AttemptLog[], connectedDevices: number) => void;
  onLogAdded?: (log: AttemptLog, updatedAppState: AppState) => void;
  onLogDeleted?: (logId: string, updatedAppState: AppState, logs: AttemptLog[]) => void;
  onLogsCleared?: (team: string | undefined, updatedAppState: AppState, logs: AttemptLog[]) => void;
  onActivityDeleted?: (phase: string, team: string, updatedAppState: AppState, logs: AttemptLog[]) => void;
  onStateUpdated?: (updatedAppState: AppState) => void;
  onSurveyAdded?: (survey: SurveyResponse) => void;
  onPresenceUpdated?: (connectedDevices: number) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

class RealtimeSyncService {
  private socket: WebSocket | null = null;
  private callbacks: SyncCallbacks = {};
  private isConnected = false;
  private reconnectTimer: number | null = null;
  private pingInterval: number | null = null;

  init(callbacks: SyncCallbacks) {
    this.callbacks = callbacks;
    this.fetchInitialState();
    this.connectWebSocket();
  }

  updateCallbacks(callbacks: SyncCallbacks) {
    this.callbacks = callbacks;
  }

  private async fetchInitialState() {
    try {
      const res = await fetch('/api/sync');
      if (res.ok) {
        const data = await res.json();
        if (this.callbacks.onInitState && data.appState && data.logData) {
          this.callbacks.onInitState(data.appState, data.logData, data.connectedDevices || 1);
        }
      }
    } catch (err) {
      console.warn('[Sync] Initial HTTP fetch fallback notice:', err);
    }
  }

  private connectWebSocket() {
    if (typeof window === 'undefined') return;

    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.callbacks.onConnectionChange?.(true);

        // Keepalive ping
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = window.setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'PING' }));
          }
        }, 25000);
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (err) {
          console.error('[Sync] Error parsing message:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.callbacks.onConnectionChange?.(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.callbacks.onConnectionChange?.(false);
      };
    } catch (err) {
      console.error('[Sync] WebSocket connection error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = window.setTimeout(() => {
      this.connectWebSocket();
    }, 3000);
  }

  private handleIncomingMessage(msg: { type: string; payload?: unknown }) {
    switch (msg.type) {
      case 'INIT_STATE': {
        const data = msg.payload as { appState: AppState; logData: AttemptLog[]; connectedDevices: number };
        this.callbacks.onInitState?.(data.appState, data.logData, data.connectedDevices || 1);
        break;
      }
      case 'LOG_ADDED': {
        const data = msg.payload as { log: AttemptLog; appState: AppState };
        this.callbacks.onLogAdded?.(data.log, data.appState);
        break;
      }
      case 'LOG_DELETED': {
        const data = msg.payload as { logId: string; appState: AppState; logData: AttemptLog[] };
        this.callbacks.onLogDeleted?.(data.logId, data.appState, data.logData);
        break;
      }
      case 'LOGS_CLEARED': {
        const data = msg.payload as { team?: string; appState: AppState; logData: AttemptLog[] };
        this.callbacks.onLogsCleared?.(data.team, data.appState, data.logData);
        break;
      }
      case 'ACTIVITY_DELETED': {
        const data = msg.payload as { phase: string; team: string; appState: AppState; logData: AttemptLog[] };
        this.callbacks.onActivityDeleted?.(data.phase, data.team, data.appState, data.logData);
        break;
      }
      case 'STATE_UPDATED': {
        const data = msg.payload as AppState;
        this.callbacks.onStateUpdated?.(data);
        break;
      }
      case 'SURVEY_ADDED': {
        const data = msg.payload as SurveyResponse;
        this.callbacks.onSurveyAdded?.(data);
        break;
      }
      case 'PRESENCE': {
        const data = msg.payload as { connectedDevices: number };
        this.callbacks.onPresenceUpdated?.(data.connectedDevices);
        break;
      }
      case 'SYNC_FULL': {
        const data = msg.payload as { appState: AppState; logData: AttemptLog[] };
        this.callbacks.onInitState?.(data.appState, data.logData, 1);
        break;
      }
    }
  }

  // Action dispatches with WebSocket & HTTP fallback
  sendAttemptLog(log: AttemptLog) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'ATTEMPT_LOGGED', payload: log }));
    } else {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      }).catch(console.error);
    }
  }

  sendDeleteLog(logId: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'LOG_DELETED', payload: { logId } }));
    } else {
      fetch(`/api/logs/${encodeURIComponent(logId)}`, { method: 'DELETE' }).catch(console.error);
    }
  }

  sendClearLogs(team?: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'LOGS_CLEARED', payload: { team } }));
    } else {
      const url = team ? `/api/logs?team=${encodeURIComponent(team)}` : '/api/logs';
      fetch(url, { method: 'DELETE' }).catch(console.error);
    }
  }

  sendDeleteActivity(phase: string, team: string) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'ACTIVITY_DELETED', payload: { phase, team } }));
    } else {
      fetch(`/api/activity?phase=${encodeURIComponent(phase)}&team=${encodeURIComponent(team)}`, {
        method: 'DELETE',
      }).catch(console.error);
    }
  }

  sendStateUpdate(state: Partial<AppState>) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'STATE_UPDATED', payload: state }));
    } else {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(console.error);
    }
  }

  sendSurvey(survey: SurveyResponse) {
    fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(survey),
    }).catch(console.error);
  }
}

export const realtimeSync = new RealtimeSyncService();
