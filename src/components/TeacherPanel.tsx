import React, { useState } from 'react';
import { AppState, AttemptLog } from '../types';
import { PHASES, GROUP_COLORS, BANK } from '../data/phases';
import {
  generateExcelWorkbook,
  generateMasterCSV,
  downloadFile,
  calculateStudentSummaries,
  calculateSessionDetail,
  recalculateCompletedToday,
} from '../utils/exportUtils';
import { getDepEdRating } from '../data/ggrCurriculum';
import { ActivityRecordsManager } from './ActivityRecordsManager';
import { sounds } from '../utils/audio';
import { realtimeSync } from '../services/realtimeSync';

interface TeacherPanelProps {
  appState: AppState;
  logData: AttemptLog[];
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  setLogData: React.Dispatch<React.SetStateAction<AttemptLog[]>>;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  themes: Array<{ id: string; name: string; preview: string }>;
  adminNotification: string | null;
  setAdminNotification: (msg: string | null) => void;
  onOpenCsvSync: () => void;
  onSeedSampleData: () => void;
  onClose: () => void;
}

export const TeacherPanel: React.FC<TeacherPanelProps> = ({
  appState,
  logData,
  setAppState,
  setLogData,
  currentTheme,
  setCurrentTheme,
  themes,
  adminNotification,
  setAdminNotification,
  onOpenCsvSync,
  onSeedSampleData,
  onClose,
}) => {
  const [adminTab, setAdminTab] = useState<'overview' | 'sessions' | 'records' | 'rosters' | 'reports'>('overview');
  const [activeSessionDrillPhaseKey, setActiveSessionDrillPhaseKey] = useState<string>('session1');
  const [drillTeamFilter, setDrillTeamFilter] = useState<string>('all');
  const [inspectedQuestionDetail, setInspectedQuestionDetail] = useState<{
    student: string;
    team: string;
    questionNum: number;
    prompt: string;
    chosen: string;
    correct: boolean;
  } | null>(null);

  const [newPinInput, setNewPinInput] = useState<string>('');
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmBtnText?: string;
    onConfirm: () => void;
  } | null>(null);

  const totalClassAttempts = logData.length;
  const totalClassCorrect = logData.filter((l) => l.correct).length;
  const classAccuracy =
    totalClassAttempts > 0 ? Math.round((totalClassCorrect / totalClassAttempts) * 100) : 0;

  const teamStats = appState.groups.map((g, gi) => {
    const tLogs = logData.filter((l) => l.team === g.name);
    const attempts = tLogs.length;
    const correct = tLogs.filter((l) => l.correct).length;
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
    const completedPhases = PHASES.filter((ph) =>
      (appState.completedToday[ph.key] || []).includes(gi)
    );
    const isTodayDone = (appState.completedToday[PHASES[appState.currentPhaseIndex].key] || []).includes(gi);
    return {
      index: gi,
      group: g,
      color: GROUP_COLORS[gi % GROUP_COLORS.length],
      attempts,
      correct,
      accuracy,
      completedPhases,
      isTodayDone,
    };
  });

  const leadingTeam = [...teamStats].sort((a, b) => b.correct - a.correct)[0];
  const allStudentSummaries = calculateStudentSummaries(appState, logData);
  const activeDrillPhase =
    PHASES.find((p) => p.key === activeSessionDrillPhaseKey) || PHASES[1];
  const sessionDetailData = calculateSessionDetail(
    activeSessionDrillPhaseKey,
    appState,
    logData
  );
  const drillBankItems = BANK[activeSessionDrillPhaseKey as keyof typeof BANK] || [];
  const filteredDrillStudents =
    drillTeamFilter === 'all'
      ? sessionDetailData.students
      : sessionDetailData.students.filter((s) => s.teamName === drillTeamFilter);

  const renderAccuracyBadge = (accuracy: number | null, attempts: number) => {
    if (attempts === 0 || accuracy === null) {
      return <span className="acc-badge acc-none">Pending</span>;
    }
    if (accuracy >= 80) {
      return <span className="acc-badge acc-high">{accuracy}% High</span>;
    } else if (accuracy >= 60) {
      return <span className="acc-badge acc-mid">{accuracy}% Mid</span>;
    } else {
      return <span className="acc-badge acc-low">{accuracy}% Low</span>;
    }
  };

  const handleSetActivePhase = (index: number) => {
    sounds.playTap();
    const updated = { ...appState, currentPhaseIndex: index };
    setAppState(updated);
    realtimeSync.sendStateUpdate(updated);
  };

  const handleRenameGroup = (groupIndex: number, newName: string) => {
    const updated = appState.groups.map((g, idx) =>
      idx === groupIndex ? { ...g, name: newName || `Team ${idx + 1}` } : g
    );
    const updatedState = { ...appState, groups: updated };
    setAppState(updatedState);
    realtimeSync.sendStateUpdate(updatedState);
  };

  const handleRenameMember = (groupIndex: number, memberIndex: number, newName: string) => {
    const updated = appState.groups.map((g, idx) => {
      if (idx !== groupIndex) return g;
      const newMembers = [...g.members];
      newMembers[memberIndex] = newName || `Runner ${memberIndex + 1}`;
      return { ...g, members: newMembers };
    });
    const updatedState = { ...appState, groups: updated };
    setAppState(updatedState);
    realtimeSync.sendStateUpdate(updatedState);
  };

  const handleResetTodayCompletions = () => {
    sounds.playTap();
    const ph = PHASES[appState.currentPhaseIndex];
    const updatedCompleted = {
      ...appState.completedToday,
      [ph.key]: [],
    };
    const updatedState = { ...appState, completedToday: updatedCompleted };
    setAppState(updatedState);
    realtimeSync.sendStateUpdate(updatedState);
    setAdminNotification(`Reset completions for ${ph.label}. All teams can now access it again!`);
    setTimeout(() => setAdminNotification(null), 3000);
  };

  const handleChangePin = () => {
    sounds.playTap();
    if (newPinInput.trim().length >= 4) {
      setAppState((prev) => ({ ...prev, pin: newPinInput.trim() }));
      setNewPinInput('');
      setAdminNotification('PIN updated successfully.');
      setTimeout(() => setAdminNotification(null), 3000);
    } else {
      setAdminNotification('Use at least 4 digits.');
      setTimeout(() => setAdminNotification(null), 3000);
    }
  };

  const handleExportExcel = async () => {
    sounds.playTap();
    setIsExportingExcel(true);
    try {
      const blob = await generateExcelWorkbook(appState, logData, appState.surveyResponses);
      const filename = `Binanuahan_ES_GGR_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadFile(blob, filename);
      setAdminNotification('Excel report generated and downloaded!');
      setTimeout(() => setAdminNotification(null), 4000);
    } catch (err) {
      console.error(err);
      setAdminNotification('Failed to generate Excel file.');
      setTimeout(() => setAdminNotification(null), 3000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCSV = () => {
    sounds.playTap();
    const csvContent = generateMasterCSV(appState, logData, appState.surveyResponses);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `Binanuahan_ES_GGR_Master_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadFile(blob, filename);
    setAdminNotification('Master CSV downloaded!');
    setTimeout(() => setAdminNotification(null), 4000);
  };

  return (
    <div className="modal-backdrop show">
      <div className="modal-box modal-wide">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <h2>Teacher &amp; Researcher Area</h2>
          <button
            className="icon-btn"
            style={{ width: '32px', height: '32px' }}
            onClick={() => {
              sounds.playTap();
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="modal-sub">
          Binanuahan ES Grade 6 &middot; Gamified Grammar Relay &middot; Coach Dash
        </div>

        {adminNotification && (
          <div
            style={{
              background: '#E4F7EC',
              color: 'var(--track-dark)',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 800,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            }}
          >
            <span>🔔</span>
            <span>{adminNotification}</span>
          </div>
        )}

        {/* 5 Tabs Navigation */}
        <div className="tab-bar">
          <button
            type="button"
            className={`tab-btn ${adminTab === 'overview' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setAdminTab('overview');
            }}
          >
            🏆 Overview &amp; Standings
          </button>
          <button
            type="button"
            className={`tab-btn ${adminTab === 'sessions' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setAdminTab('sessions');
            }}
          >
            🔍 Items Drilldown
          </button>
          <button
            type="button"
            className={`tab-btn ${adminTab === 'records' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setAdminTab('records');
            }}
          >
            🗂️ Activity Records
          </button>
          <button
            type="button"
            className={`tab-btn ${adminTab === 'rosters' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setAdminTab('rosters');
            }}
          >
            👥 5-Runner Rosters
          </button>
          <button
            type="button"
            className={`tab-btn ${adminTab === 'reports' ? 'active' : ''}`}
            onClick={() => {
              sounds.playTap();
              setAdminTab('reports');
            }}
          >
            📊 Export Excel &amp; CSV
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & STANDINGS */}
        {/* ======================================================== */}
        {adminTab === 'overview' && (
          <div>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-num">{totalClassAttempts}</div>
                <div className="kpi-label">Answers Logged</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-num">
                  {totalClassAttempts > 0 ? (
                    <span
                      style={{
                        color:
                          classAccuracy >= 80
                            ? 'var(--track-dark)'
                            : classAccuracy >= 60
                            ? '#B45309'
                            : 'var(--danger)',
                      }}
                    >
                      {classAccuracy}%
                    </span>
                  ) : (
                    '0%'
                  )}
                </div>
                <div className="kpi-label">Overall Class Accuracy</div>
              </div>
              <div className="kpi-card">
                <div
                  className="kpi-num"
                  style={{ fontSize: '18px', color: leadingTeam ? leadingTeam.color : 'inherit' }}
                >
                  {leadingTeam && leadingTeam.correct > 0 ? leadingTeam.group.name : 'In Progress'}
                </div>
                <div className="kpi-label">
                  Leader &middot; {leadingTeam ? `${leadingTeam.correct} pts` : 'No score'}
                </div>
              </div>
            </div>

            {/* 4 Teams Progress */}
            <div className="admin-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3>4 Teams Progress (5 Runners Each)</h3>
                <span className="small-note">
                  Active Station: <b>{PHASES[appState.currentPhaseIndex].label}</b>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamStats.map((t) => {
                  const progressPct = Math.round((t.completedPhases.length / PHASES.length) * 100);
                  return (
                    <div
                      key={t.index}
                      className="team-progress-card"
                      style={{ borderLeft: `6px solid ${t.color}` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: t.color,
                              display: 'inline-block',
                            }}
                          />
                          <strong style={{ fontSize: '15px', fontFamily: 'Baloo 2' }}>
                            {t.group.name}
                          </strong>
                          <span style={{ fontSize: '11px', opacity: 0.7 }}>(5 Runners)</span>
                        </div>
                        <div>
                          {t.isTodayDone ? (
                            <span className="completed-chip">Finished today ✓</span>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink)', opacity: 0.6 }}>
                              Ready for {PHASES[appState.currentPhaseIndex].label} 🔓
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <span>
                          Score: <b style={{ color: 'var(--track-dark)' }}>{t.correct} correct</b> ({t.attempts} answered)
                        </span>
                        <span>
                          Accuracy: {renderAccuracyBadge(t.accuracy, t.attempts)}
                        </span>
                        <span>
                          Stations: <b>{t.completedPhases.length} / {PHASES.length}</b>
                        </span>
                      </div>
                      <div className="progress-track" style={{ height: '7px', marginBottom: '8px' }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.max(5, progressPct)}%`, background: t.color }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {PHASES.map((ph, pi) => {
                          const isDone = (appState.completedToday[ph.key] || []).includes(t.index);
                          const isCurrent = pi === appState.currentPhaseIndex;
                          return (
                            <span
                              key={ph.key}
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '6px',
                                background: isDone ? 'var(--track)' : isCurrent ? '#FFF1BF' : 'var(--cream-2)',
                                color: isDone ? '#fff' : isCurrent ? '#8A5200' : 'var(--ink)',
                                opacity: isDone || isCurrent ? 1 : 0.6,
                              }}
                            >
                              {ph.label} {isDone ? '✓' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pretest vs Posttest Mean Gain Analysis */}
            <div className="admin-section">
              <h3>Pretest vs Posttest Mean Gain Summary</h3>
              <div style={{ background: 'var(--cream)', borderRadius: '14px', border: '2px solid var(--line)', overflowX: 'auto' }}>
                <table className="score-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Team</th>
                      <th style={{ textAlign: 'center' }}>Pretest %</th>
                      <th style={{ textAlign: 'center' }}>Posttest %</th>
                      <th style={{ textAlign: 'center' }}>Mean Gain</th>
                      <th style={{ textAlign: 'right' }}>DepEd Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStudentSummaries.map((s, idx) => {
                      const pre = s.phases['pretest']?.accuracy ?? null;
                      const post = s.phases['posttest']?.accuracy ?? null;
                      const gain = pre !== null && post !== null ? post - pre : null;
                      const rating = s.totalAttempts > 0 ? getDepEdRating(s.overallAccuracy) : null;
                      return (
                        <tr key={idx}>
                          <td>{s.studentName}</td>
                          <td style={{ fontSize: '11px', opacity: 0.8 }}>{s.teamName}</td>
                          <td style={{ textAlign: 'center' }}>{pre !== null ? `${pre}%` : '—'}</td>
                          <td style={{ textAlign: 'center' }}>{post !== null ? `${post}%` : '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {gain !== null ? (
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: gain >= 0 ? '#0F5132' : '#842029',
                                  background: gain >= 0 ? '#D1E7DD' : '#F8D7DA',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                }}
                              >
                                {gain >= 0 ? `+${gain}%` : `${gain}%`}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {rating ? (
                              <span
                                className="deped-badge"
                                style={{ background: rating.bg, color: rating.color }}
                              >
                                {rating.label.split(' ')[0]}
                              </span>
                            ) : (
                              'Pending'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: WEEKLY SESSIONS DRILLDOWN */}
        {/* ======================================================== */}
        {adminTab === 'sessions' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ marginBottom: '2px' }}>Items Drilldown</h3>
                <div className="small-note">
                  See whether each student got each question <b>RIGHT (✓)</b> or <b>WRONG (✗)</b>, with color-coded accuracy scores.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-sky"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
              >
                {isExportingExcel ? 'Exporting...' : '📊 Download Excel (.xlsx)'}
              </button>
            </div>

            {/* Station / Week Selector Pills */}
            <div className="session-pill-strip">
              {PHASES.map((ph) => {
                const isActive = ph.key === activeSessionDrillPhaseKey;
                const phaseAttempts = logData.filter((l) => l.phase === ph.key).length;
                return (
                  <button
                    key={ph.key}
                    type="button"
                    className={`session-pill-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      sounds.playTap();
                      setActiveSessionDrillPhaseKey(ph.key);
                    }}
                  >
                    <span>{ph.icon}</span> {ph.label} ({ph.weekLabel})
                    {phaseAttempts > 0 && (
                      <span
                        style={{
                          marginLeft: '6px',
                          background: isActive ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.08)',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                        }}
                      >
                        {phaseAttempts} ans
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Station Banner */}
            <div
              style={{
                background: 'var(--cream-2)',
                border: '2px solid var(--line)',
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'Baloo 2' }}>
                  {activeDrillPhase.label} &middot; {activeDrillPhase.eyebrow}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.75 }}>
                  Intervention: <b>{activeDrillPhase.weekLabel}</b> &bull; Domain: <b>{activeDrillPhase.domain}</b> &bull; {drillBankItems.length} Relay Questions
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, opacity: 0.7 }}>Filter:</span>
                <select
                  className="text-input"
                  style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                  value={drillTeamFilter}
                  onChange={(e) => setDrillTeamFilter(e.target.value)}
                >
                  <option value="all">All 4 Teams (20 Runners)</option>
                  {appState.groups.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} (5 Runners)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Accuracy Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '11px',
                fontWeight: 800,
                marginBottom: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span>Accuracy Legend:</span>
              <span className="acc-badge acc-high">≥ 80% High Accuracy</span>
              <span className="acc-badge acc-mid">60% - 79% Moderate</span>
              <span className="acc-badge acc-low">&lt; 60% Needs Support</span>
              <span style={{ borderLeft: '2px solid var(--line)', paddingLeft: '8px', display: 'inline-flex', gap: '8px' }}>
                <span style={{ color: '#0F5132' }}>✓ = Right</span>
                <span style={{ color: '#842029' }}>✗ = Wrong</span>
                <span style={{ opacity: 0.5 }}>— = Pending</span>
              </span>
            </div>

            {/* Question-by-Question Matrix */}
            <div style={{ background: 'var(--cream)', borderRadius: '14px', border: '2px solid var(--line)', overflowX: 'auto', marginBottom: '14px' }}>
              <table className="score-table" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>Student Runner</th>
                    <th style={{ width: '100px' }}>Team</th>
                    <th style={{ textAlign: 'center', width: '70px' }}>Answered</th>
                    <th style={{ textAlign: 'center', width: '70px' }}>Correct</th>
                    <th style={{ textAlign: 'center', width: '110px' }}>Accuracy Score</th>
                    {drillBankItems.map((_, qIdx) => (
                      <th
                        key={qIdx}
                        style={{
                          textAlign: 'center',
                          width: '36px',
                          padding: '6px 2px',
                          cursor: 'help',
                        }}
                        title={`Question ${qIdx + 1}: ${drillBankItems[qIdx].p}`}
                      >
                        Q{qIdx + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDrillStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5 + drillBankItems.length} style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>
                        No runner records found for this station.
                      </td>
                    </tr>
                  ) : (
                    filteredDrillStudents.map((stu, sIdx) => (
                      <tr key={sIdx}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background:
                                  GROUP_COLORS[
                                    appState.groups.findIndex((g) => g.name === stu.teamName) %
                                      GROUP_COLORS.length
                                  ],
                              }}
                            />
                            <span>{stu.studentName}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '11px', opacity: 0.8 }}>
                          {stu.teamName} <small>(R#{stu.runnerIndex})</small>
                        </td>
                        <td style={{ textAlign: 'center' }}>{stu.attempts}</td>
                        <td style={{ textAlign: 'center' }}>
                          <strong style={{ color: stu.correct > 0 ? 'var(--track-dark)' : 'inherit' }}>
                            {stu.correct}
                          </strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {renderAccuracyBadge(stu.accuracy, stu.attempts)}
                        </td>
                        {drillBankItems.map((_, qIdx) => {
                          const qNumber = qIdx + 1;
                          const qRes = stu.questionResults[qNumber];
                          if (!qRes) {
                            return (
                              <td key={qIdx} style={{ textAlign: 'center', padding: '4px 2px' }}>
                                <span className="q-result-pill q-result-empty" title="Not answered by this runner">—</span>
                              </td>
                            );
                          }
                          return (
                            <td key={qIdx} style={{ textAlign: 'center', padding: '4px 2px' }}>
                              <button
                                type="button"
                                className={`q-result-pill ${qRes.correct ? 'q-result-right' : 'q-result-wrong'}`}
                                title={`Q${qNumber}: ${qRes.correct ? 'RIGHT' : 'WRONG'}. Selected: "${qRes.chosen}". Tap for details.`}
                                onClick={() => {
                                  sounds.playTap();
                                  setInspectedQuestionDetail({
                                    student: stu.studentName,
                                    team: stu.teamName,
                                    questionNum: qNumber,
                                    prompt: qRes.prompt,
                                    chosen: qRes.chosen,
                                    correct: qRes.correct,
                                  });
                                }}
                              >
                                {qRes.correct ? '✓' : '✗'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {inspectedQuestionDetail && (
              <div
                style={{
                  background: inspectedQuestionDetail.correct ? '#E4F7EC' : '#FCE7E4',
                  border: `2px solid ${inspectedQuestionDetail.correct ? 'var(--track)' : 'var(--danger)'}`,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px' }}>
                    Question #{inspectedQuestionDetail.questionNum} &bull; {inspectedQuestionDetail.student} ({inspectedQuestionDetail.team})
                  </strong>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    style={{ padding: '2px 8px' }}
                    onClick={() => setInspectedQuestionDetail(null)}
                  >
                    ✕ Close
                  </button>
                </div>
                <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                  Prompt: &ldquo;{inspectedQuestionDetail.prompt}&rdquo;
                </div>
                <div style={{ fontSize: '12px', fontWeight: 800 }}>
                  Student Selected: <span style={{ color: inspectedQuestionDetail.correct ? 'var(--track-dark)' : 'var(--danger)' }}>&ldquo;{inspectedQuestionDetail.chosen}&rdquo;</span> — Result:{' '}
                  {inspectedQuestionDetail.correct ? '✓ Got it RIGHT' : '✗ Got it WRONG'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ACTIVITY & RECORDS MANAGER (NEW DEDICATED TAB)     */}
        {/* ======================================================== */}
        {adminTab === 'records' && (
          <ActivityRecordsManager
            appState={appState}
            logData={logData}
            setAppState={setAppState}
            setLogData={setLogData}
            onOpenCsvSync={onOpenCsvSync}
            setAdminNotification={setAdminNotification}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 4: ROSTERS & CONTROLS */}
        {/* ======================================================== */}
        {adminTab === 'rosters' && (
          <div>
            <div className="admin-section">
              <h3>Today's Active Station</h3>
              <div id="admin-phase-list">
                {PHASES.map((ph, i) => {
                  const isCurrent = i === appState.currentPhaseIndex;
                  return (
                    <div key={ph.key} className={`phase-row ${isCurrent ? 'is-current' : ''}`}>
                      <span>
                        {ph.icon} {ph.label} &middot; <small>{ph.sub} ({ph.itemCount} items &bull; {ph.weekLabel})</small>
                      </span>
                      <button
                        className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handleSetActivePhase(i)}
                      >
                        {isCurrent ? 'Active' : 'Set active'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h3>Team Rosters (4 Groups &times; 5 Runners)</h3>
                <span className="small-note">5 runners each</span>
              </div>
              <div className="small-note" style={{ marginBottom: '12px' }}>
                Customize names for all 5 runners in each group. The 5 relay roles rotate automatically in order: Reader &rarr; Solver &rarr; Checker &rarr; Explainer &rarr; Runner.
              </div>
              <div>
                {appState.groups.map((g, gi) => (
                  <div
                    key={gi}
                    className="roster-group"
                    style={{ borderLeft: `6px solid ${GROUP_COLORS[gi % GROUP_COLORS.length]}` }}
                  >
                    <div className="rg-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Group {gi + 1} Name</span>
                    </div>
                    <input
                      className="text-input"
                      style={{ marginBottom: '10px' }}
                      value={g.name}
                      onChange={(e) => handleRenameGroup(gi, e.target.value)}
                    />
                    <div className="rg-title" style={{ fontSize: '12px', opacity: 0.8 }}>
                      5 Runners (Relay order: 1 to 5)
                    </div>
                    <div className="roster-inputs">
                      {g.members.map((m, mi) => (
                        <div key={mi} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, opacity: 0.6 }}>
                            Runner {mi + 1}
                          </label>
                          <input
                            className="text-input"
                            value={m}
                            onChange={(e) => handleRenameMember(gi, mi, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h3>🎨 Background Color Themes</h3>
                <span className="small-note">7 kid-friendly color themes</span>
              </div>
              <div className="small-note" style={{ marginBottom: '10px' }}>
                Select the background theme for the app:
              </div>
              <div className="theme-options-grid">
                {themes.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    className={`theme-card-btn ${currentTheme === th.id ? 'active' : ''}`}
                    onClick={() => {
                      sounds.playTap();
                      setCurrentTheme(th.id);
                    }}
                  >
                    <span className="theme-dot" style={{ background: th.preview }} />
                    <span>{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-section">
              <h3>Reset Completions &amp; Change PIN</h3>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: '14px' }}
                onClick={handleResetTodayCompletions}
              >
                Reset Today's Completions for {PHASES[appState.currentPhaseIndex].label}
              </button>
              <div>
                <input
                  className="text-input"
                  placeholder="New 4-6 digit PIN"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                />
                <button className="btn btn-ghost" style={{ marginTop: '8px' }} onClick={handleChangePin}>
                  Save PIN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: EXPORT EXCEL & CSV */}
        {/* ======================================================== */}
        {adminTab === 'reports' && (
          <div>
            <div className="admin-section">
              <h3>Academic Reports &amp; Data Export</h3>
              <div className="small-note" style={{ marginBottom: '14px' }}>
                Export Grade 6 Binanuahan ES Gamified Grammar Relay performance data. Includes color-coded accuracy scores, individual sheets/tabs for each weekly session, question correctness audits, and Pretest vs Posttest mean gain analysis.
              </div>
              <div className="export-card-grid">
                <div className="export-card" style={{ borderColor: 'var(--track)' }}>
                  <div>
                    <h4 style={{ color: 'var(--track-dark)' }}>
                      <span>📗</span> Excel Workbook (.xlsx)
                    </h4>
                    <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>
                      Multi-tab formatted spreadsheet with:
                    </p>
                    <ul style={{ fontSize: '11px', paddingLeft: '16px', lineHeight: 1.6, opacity: 0.85, marginBottom: '14px' }}>
                      <li><b>Overview Tab:</b> Class standings &amp; student master matrix</li>
                      <li><b>Weekly Tabs:</b> A different tab for each session (Pretest, Missions 1–4, Posttest)</li>
                      <li><b>Right / Wrong Matrix:</b> Question-by-question checkmarks (✓ / ✗)</li>
                      <li><b>Conditional Formatting:</b> Color-coded accuracy scores (Green ≥80%, Amber 60–79%, Red &lt;60%)</li>
                      <li><b>Mean Gain:</b> Baseline vs Summative gain analysis</li>
                      <li><b>Survey Sheet:</b> Student Likert responses</li>
                    </ul>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                  >
                    {isExportingExcel ? 'Generating Workbook...' : 'Download Excel (.xlsx)'}
                  </button>
                </div>

                <div className="export-card" style={{ borderColor: 'var(--sky)' }}>
                  <div>
                    <h4 style={{ color: 'var(--sky)' }}>
                      <span>📄</span> Master Results CSV
                    </h4>
                    <p style={{ fontSize: '12px', opacity: 0.75, marginBottom: '10px' }}>
                      Comprehensive CSV structured for statistical tools &amp; Google Sheets:
                    </p>
                    <ul style={{ fontSize: '11px', paddingLeft: '16px', lineHeight: 1.6, opacity: 0.85, marginBottom: '14px' }}>
                      <li><b>Weekly Student Matrix:</b> Weekly percentages per student runner</li>
                      <li><b>DepEd Scale:</b> Performance rating classifications</li>
                      <li><b>Roles:</b> Reader, Solver, Checker, Explainer, Runner</li>
                      <li><b>Binary Markers:</b> 1 (Right) and 0 (Wrong) for statistical analysis</li>
                    </ul>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sky" style={{ flex: 1 }} onClick={handleExportCSV}>
                      Download CSV
                    </button>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onOpenCsvSync}>
                      Sync CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ marginTop: '16px' }}
          onClick={() => {
            sounds.playTap();
            onClose();
          }}
        >
          Close Teacher Area
        </button>
      </div>

      {/* In-app confirmation modal */}
      {confirmModal && (
        <div className="modal-backdrop show" style={{ zIndex: 100 }}>
          <div
            className="modal-box"
            style={{
              maxWidth: '440px',
              textAlign: 'center',
              padding: '24px 20px',
              border: '2px solid var(--danger)',
              boxShadow: '0 8px 24px rgba(230, 72, 58, 0.25)',
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '8px' }}>🗑️</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--danger)' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '13px', opacity: 0.85, marginBottom: '20px', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
              >
                {confirmModal.confirmBtnText || 'Yes, Clear'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                onClick={() => setConfirmModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
