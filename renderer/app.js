'use strict';

const G = window.FreebirdGame;

const STORAGE_KEY = 'freebird-gameshow-state-v1';
const CONFETTI_COLORS = ['#a855f7', '#8b5cf6', '#3b82f6', '#38bdf8', '#34d399', '#2dd4bf', '#f0abfc'];

const $ = (id) => document.getElementById(id);

const els = {
  roundIndicator: $('round-indicator'),
  screens: {
    setup: $('screen-setup'),
    play: $('screen-play'),
    resolve: $('screen-resolve'),
    tiebreak: $('screen-tiebreak'),
    podium: $('screen-podium')
  },
  resumeBanner: $('resume-banner'),
  resumeInfo: $('resume-info'),
  teamForm: $('team-form'),
  inTeamName: $('in-team-name'),
  inPlayer1: $('in-player-1'),
  inPlayer2: $('in-player-2'),
  teamError: $('team-error'),
  teamList: $('team-list'),
  roundsValue: $('rounds-value'),
  btnStart: $('btn-start'),
  startHint: $('start-hint'),
  turnTitle: $('turn-title'),
  turnSub: $('turn-sub'),
  queue: $('queue'),
  jokerDots: $('joker-dots'),
  jokerCount: $('joker-count'),
  inJokerNote: $('in-joker-note'),
  btnUseJoker: $('btn-use-joker'),
  currentScore: $('current-score'),
  inPoints: $('in-points'),
  btnAddPoints: $('btn-add-points'),
  btnUndo: $('btn-undo'),
  protocol: $('protocol'),
  btnNextTeam: $('btn-next-team'),
  resolveTitle: $('resolve-title'),
  resolveSub: $('resolve-sub'),
  leaderboard: $('leaderboard'),
  btnResolveNext: $('btn-resolve-next'),
  tiebreakTitle: $('tiebreak-title'),
  tiebreakSub: $('tiebreak-sub'),
  duelGrid: $('duel-grid'),
  podium: $('podium'),
  finalList: $('final-list'),
  btnNewGame: $('btn-new-game'),
  overlay: $('turn-overlay'),
  overlayTitle: $('overlay-title'),
  overlaySub: $('overlay-sub'),
  btnOverlayGo: $('btn-overlay-go'),
  confetti: $('confetti')
};

let state = null;

/* ================= State ================= */

function freshState() {
  return {
    phase: 'setup',
    teams: [],
    totalRounds: 3,
    round: 0,
    baseOrder: [],
    order: [],
    playIndex: 0,
    tiebreak: null,
    resolvedGroups: []
  };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    /* Speichern ist optional – die Show läuft ohne weiter */
  }
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.teams)) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

function teamById(id) {
  return state.teams.find((t) => t.id === id) || null;
}

/* ================= Helpers ================= */

function esc(value) {
  const div = document.createElement('div');
  div.textContent = String(value == null ? '' : value);
  return div.innerHTML;
}

function fmt(n) {
  return Number(n).toLocaleString('de-DE');
}

function animateCount(el, from, to, duration) {
  const dur = duration == null ? 900 : duration;
  if (from === to) {
    el.textContent = fmt(to);
    return;
  }
  const start = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function bumpScore(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function showScreen(name) {
  for (const key of Object.keys(els.screens)) {
    els.screens[key].classList.toggle('hidden', key !== name);
  }
  updateRoundIndicator();
}

function updateRoundIndicator() {
  if (!state || state.phase === 'setup') {
    els.roundIndicator.textContent = '';
  } else if (state.phase === 'tiebreak') {
    els.roundIndicator.textContent = 'Tiebreaker';
  } else if (state.phase === 'podium') {
    els.roundIndicator.textContent = 'Siegerehrung';
  } else {
    els.roundIndicator.textContent = `Runde ${state.round} / ${state.totalRounds}`;
  }
}

function showTurnOverlay(title, sub, buttonText) {
  els.overlayTitle.textContent = title;
  els.overlaySub.textContent = sub || '';
  els.btnOverlayGo.textContent = buttonText || 'Los geht’s!';
  els.overlay.classList.remove('hidden');
}

/* ================= Setup ================= */

function renderSetup() {
  els.teamList.innerHTML = '';
  state.teams.forEach((team) => {
    const chip = document.createElement('div');
    chip.className = 'team-chip';
    chip.innerHTML =
      `<div><div class="t-name">🦅 ${esc(team.name)}</div>` +
      `<div class="t-players">${esc(team.players[0])} &amp; ${esc(team.players[1])}</div></div>` +
      `<button class="t-remove" title="Team entfernen">✕</button>`;
    chip.querySelector('.t-remove').addEventListener('click', () => {
      state.teams = state.teams.filter((t) => t.id !== team.id);
      save();
      renderSetup();
    });
    els.teamList.appendChild(chip);
  });
  els.roundsValue.textContent = String(state.totalRounds);
  els.btnStart.disabled = state.teams.length < 2;
  els.startHint.textContent =
    state.teams.length < 2
      ? 'Mindestens 2 Teams benötigt.'
      : `${state.teams.length} Teams bereit – ${state.totalRounds} Runden.`;
}

function addTeamFromForm() {
  const name = els.inTeamName.value.trim();
  const p1 = els.inPlayer1.value.trim();
  const p2 = els.inPlayer2.value.trim();
  const error = G.validateTeam(name, p1, p2);
  if (error) {
    els.teamError.textContent = error;
    els.teamError.classList.remove('hidden');
    return;
  }
  els.teamError.classList.add('hidden');
  const nextId = state.teams.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  state.teams.push(G.createTeam(nextId, name, p1, p2));
  els.inTeamName.value = '';
  els.inPlayer1.value = '';
  els.inPlayer2.value = '';
  els.inTeamName.focus();
  save();
  renderSetup();
}

function startGame() {
  if (state.teams.length < 2) return;
  state.totalRounds = Math.max(1, Math.min(20, state.totalRounds));
  state.baseOrder = state.teams.map((t) => t.id);
  state.round = 1;
  state.order = G.rotateOrder(state.baseOrder, 0);
  state.playIndex = 0;
  state.tiebreak = null;
  state.resolvedGroups = [];
  state.phase = 'play';
  save();
  enterTurn();
}

/* ================= Play ================= */

function currentTeamId() {
  return state.order[state.playIndex] ?? null;
}

function enterTurn() {
  showScreen('play');
  renderPlay();
  const team = teamById(currentTeamId());
  showTurnOverlay(
    `${team.name} ist am Zug!`,
    `${team.players[0]} & ${team.players[1]} – viel Erfolg! 🦅`,
    'Auf geht’s!'
  );
}

function renderPlay() {
  const team = teamById(currentTeamId());
  if (!team) return;

  els.turnTitle.textContent = `${team.name} ist am Zug`;
  els.turnSub.textContent = `${team.players[0]} & ${team.players[1]} · Runde ${state.round}`;

  renderQueue();
  renderJokers(team);
  renderScore(team);
  renderProtocol(team);
  renderFooterButton();
}

function renderQueue() {
  els.queue.innerHTML = '';
  const activeId = currentTeamId();
  state.order.forEach((id, idx) => {
    const team = teamById(id);
    const chip = document.createElement('div');
    chip.className = 'queue-chip';
    if (id === activeId) chip.classList.add('active');
    else if (idx < state.playIndex) chip.classList.add('done');
    chip.textContent = team.name;
    els.queue.appendChild(chip);
  });
}

function renderJokers(team) {
  els.jokerDots.innerHTML = '';
  for (let i = 0; i < G.JOKERS_PER_TEAM; i++) {
    const dot = document.createElement('div');
    dot.className = 'joker-dot' + (i < team.jokers ? '' : ' spent');
    dot.textContent = '🃏';
    els.jokerDots.appendChild(dot);
  }
  els.jokerCount.textContent =
    team.jokers > 0
      ? `${team.jokers} von ${G.JOKERS_PER_TEAM} Jokern übrig.`
      : 'Keine Joker mehr übrig.';
  els.btnUseJoker.disabled = team.jokers <= 0;
}

function renderScore(team) {
  const shown = Number(els.currentScore.dataset.shown || 0);
  els.currentScore.dataset.shown = String(team.score);
  if (shown !== team.score) {
    animateCount(els.currentScore, shown, team.score, 700);
    if (team.score > shown) bumpScore(els.currentScore);
  } else {
    els.currentScore.textContent = fmt(team.score);
  }
}

function renderProtocol(team) {
  els.protocol.innerHTML = '';
  const entries = team.log;
  if (!entries.length) {
    els.protocol.innerHTML = '<div class="log-empty">Noch keine Einträge in dieser Phase.</div>';
    return;
  }
  entries
    .slice()
    .reverse()
    .forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'log-entry';
      let main;
      let amount;
      if (entry.type === 'joker') {
        main = `🃏 Joker eingesetzt (Runde ${entry.round})`;
        amount = '<span class="l-amount joker">Joker</span>';
      } else {
        main = `🦅 Punkte (Runde ${entry.round})`;
        const cls = entry.amount >= 0 ? 'pos' : 'neg';
        amount = `<span class="l-amount ${cls}">${entry.amount >= 0 ? '+' : ''}${fmt(entry.amount)}</span>`;
      }
      row.innerHTML =
        `<div class="l-main">${main}${entry.note ? `<div class="l-note">${esc(entry.note)}</div>` : ''}</div>` +
        amount;
      els.protocol.appendChild(row);
    });
}

function renderFooterButton() {
  const last = state.playIndex >= state.order.length - 1;
  els.btnNextTeam.textContent = last ? 'Zur Auflösung ▸' : 'Nächstes Team ▸';
}

function addPoints(amount) {
  const team = teamById(currentTeamId());
  if (!team || !Number.isFinite(amount)) return;
  const entry = G.makeLogEntry(state.round, 'points', amount, '', 'game');
  team.score += amount;
  team.log.push(entry);
  save();
  renderPlay();
}

function useJoker() {
  const team = teamById(currentTeamId());
  if (!team || team.jokers <= 0) return;
  const note = els.inJokerNote.value.trim();
  const entry = G.makeLogEntry(state.round, 'joker', null, note, 'game');
  team.jokers -= 1;
  team.log.push(entry);
  els.inJokerNote.value = '';
  save();
  renderPlay();
}

function undoLast() {
  const team = teamById(currentTeamId());
  if (!team || !team.log.length) return;
  const entry = team.log.pop();
  if (entry.type === 'joker') {
    team.jokers += 1;
  } else {
    team.score -= entry.amount;
  }
  save();
  renderPlay();
}

function nextTeam() {
  if (state.playIndex < state.order.length - 1) {
    state.playIndex += 1;
    save();
    enterTurn();
  } else {
    resolveRound();
  }
}

/* ================= Resolve ================= */

function resolveRound() {
  state.phase = 'resolve';
  save();
  showScreen('resolve');
  renderResolve();
}

function renderResolve() {
  const standings = G.computeStandings(state.teams);
  els.resolveTitle.textContent = `Auflösung – Runde ${state.round}`;

  const rowsById = new Map();
  Array.from(els.leaderboard.children).forEach((row) => {
    rowsById.set(row.dataset.teamId, row);
  });
  const firstTop = new Map();
  rowsById.forEach((row, id) => firstTop.set(id, row.getBoundingClientRect().top));

  els.leaderboard.innerHTML = '';
  const maxScore = Math.max(1, ...standings.map((t) => t.score));

  standings.forEach((team, index) => {
    let row = rowsById.get(String(team.id));
    const isNew = !row;
    if (isNew) {
      row = document.createElement('div');
      row.className = 'lb-row';
      row.dataset.teamId = String(team.id);
      row.innerHTML =
        '<div class="lb-rank"></div>' +
        '<div class="lb-main"><div class="lb-name"></div><div class="lb-players"></div>' +
        '<div class="lb-bar-wrap"><div class="lb-bar"></div></div></div>' +
        '<div class="lb-score">0</div>' +
        '<div class="lb-jokers"></div>';
    }
    row.classList.toggle('first', index === 0);
    row.querySelector('.lb-rank').textContent = index === 0 ? '🥇' : `${index + 1}.`;
    row.querySelector('.lb-name').textContent = team.name;
    row.querySelector('.lb-players').textContent = `${team.players[0]} & ${team.players[1]}`;
    row.querySelector('.lb-bar').style.width =
      `${Math.max(0, Math.min(100, (team.score / maxScore) * 100))}%`;
    row.querySelector('.lb-jokers').textContent = `🃏 ${team.jokers} / ${G.JOKERS_PER_TEAM} Joker`;

    const scoreEl = row.querySelector('.lb-score');
    const shown = Number(scoreEl.dataset.shown || 0);
    scoreEl.dataset.shown = String(team.score);
    if (isNew) {
      animateCount(scoreEl, 0, team.score, 1100);
    } else if (shown !== team.score) {
      animateCount(scoreEl, shown, team.score, 1100);
    }

    els.leaderboard.appendChild(row);
  });

  requestAnimationFrame(() => {
    Array.from(els.leaderboard.children).forEach((row) => {
      const id = row.dataset.teamId;
      if (!firstTop.has(id)) return;
      const dy = firstTop.get(id) - row.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) return;
      row.style.transition = 'none';
      row.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        row.style.transition = 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)';
        row.style.transform = '';
      });
    });
  });

  renderResolveFooter(standings);
}

function renderResolveFooter(standings) {
  if (state.round < state.totalRounds) {
    els.resolveSub.textContent =
      'Gesamtpunkte aller Teams · Danach geht es in die nächste Runde (neue Reihenfolge).';
    els.btnResolveNext.textContent = 'Nächste Runde starten ▸';
    els.btnResolveNext.dataset.action = 'next-round';
    return;
  }
  const tieGroups = G.findTieGroups(standings, state.resolvedGroups);
  if (tieGroups.length) {
    const names = tieGroups[0].map((id) => teamById(id).name).join(' & ');
    els.resolveSub.textContent =
      `Gleichstand! ${names} treten im Tiebreaker gegeneinander an – es geht nur um die Platzierung.`;
    els.btnResolveNext.textContent = 'Tiebreaker starten ▸';
    els.btnResolveNext.dataset.action = 'tiebreak';
    return;
  }
  els.resolveSub.textContent = 'Alle Runden sind gespielt – die Entscheidung ist gefallen!';
  els.btnResolveNext.textContent = 'Zur Siegerehrung 🏆';
  els.btnResolveNext.dataset.action = 'podium';
}

function nextFromResolve() {
  const action = els.btnResolveNext.dataset.action;
  if (action === 'next-round') {
    state.round += 1;
    state.order = G.rotateOrder(state.baseOrder, state.round - 1);
    state.playIndex = 0;
    state.phase = 'play';
    save();
    enterTurn();
  } else if (action === 'tiebreak') {
    const standings = G.computeStandings(state.teams);
    const groups = G.findTieGroups(standings, state.resolvedGroups);
    if (groups.length) startTiebreak(groups[0]);
    else showPodium();
  } else {
    showPodium();
  }
}

/* ================= Tiebreaker (Head-to-Head) ================= */

function startTiebreak(teamIds) {
  state.tiebreak = {
    teamIds: teamIds.slice(),
    champion: null,
    eliminated: [],
    challengerIndex: 1
  };
  state.phase = 'tiebreak';
  save();
  showScreen('tiebreak');
  renderTiebreak();
}

function currentDuelTeams() {
  const tb = state.tiebreak;
  return [tb.champion ?? tb.teamIds[0], tb.teamIds[tb.challengerIndex]];
}

function renderTiebreak() {
  const tb = state.tiebreak;
  const totalDuels = tb.teamIds.length - 1;
  const duelNo = tb.eliminated.length + 1;
  els.tiebreakTitle.textContent =
    totalDuels > 1 ? `Tiebreaker – Duell ${duelNo} von ${totalDuels}` : 'Tiebreaker';
  els.tiebreakSub.textContent =
    'Head-to-head: Es gibt keine Punkte und keine Joker – nur die Entscheidung, wer gewinnt.';

  els.duelGrid.innerHTML = '';
  currentDuelTeams().forEach((id) => {
    const team = teamById(id);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'duel-card';
    card.innerHTML =
      `<div class="duel-name">${esc(team.name)}</div>` +
      `<div class="duel-players">${esc(team.players[0])} &amp; ${esc(team.players[1])}</div>`;
    card.addEventListener('click', () => decideTiebreak(id));
    els.duelGrid.appendChild(card);
  });
}

function decideTiebreak(winnerId) {
  const tb = state.tiebreak;
  const [aId, bId] = currentDuelTeams();
  const loserId = winnerId === aId ? bId : aId;
  tb.champion = winnerId;
  tb.eliminated.push(loserId);
  tb.challengerIndex += 1;
  save();
  if (tb.challengerIndex < tb.teamIds.length) {
    renderTiebreak();
  } else {
    finishTiebreak();
  }
}

function finishTiebreak() {
  const tb = state.tiebreak;
  const ranking = G.duelRanking(tb.champion, tb.eliminated);
  state.resolvedGroups.push(ranking);
  state.tiebreak = null;
  save();

  const standings = G.computeStandings(state.teams);
  const remaining = G.findTieGroups(standings, state.resolvedGroups);
  if (remaining.length) startTiebreak(remaining[0]);
  else showPodium();
}

/* ================= Podium ================= */

function showPodium() {
  state.phase = 'podium';
  save();
  showScreen('podium');
  renderPodium();
  startConfetti();
}

function renderPodium() {
  const ranking = G.computeFinalRanking(state.teams, state.resolvedGroups);
  const teams = ranking.map((id) => teamById(id));
  const podiumTeams = [
    { key: 'p2', team: teams[1], label: '2.' },
    { key: 'p1', team: teams[0], label: '1.' },
    { key: 'p3', team: teams[2], label: '3.' }
  ].filter((slot) => slot.team);

  els.podium.innerHTML = '';
  podiumTeams.forEach((slot) => {
    const col = document.createElement('div');
    col.className = `podium-col ${slot.key}`;
    col.innerHTML =
      `<div class="podium-name">${esc(slot.team.name)}</div>` +
      `<div class="podium-score">${fmt(slot.team.score)} Punkte · ${esc(slot.team.players[0])} & ${esc(slot.team.players[1])}</div>` +
      `<div class="podium-block">${slot.label}</div>`;
    els.podium.appendChild(col);
  });

  els.finalList.innerHTML = '';
  teams.forEach((team, index) => {
    const row = document.createElement('div');
    row.className = 'final-row';
    row.style.animationDelay = `${3.4 + index * 0.35}s`;
    row.innerHTML =
      `<span><strong>${index + 1}.</strong> ${esc(team.name)}</span>` +
      `<span>${fmt(team.score)} 🦅 · 🃏 ${team.jokers}/${G.JOKERS_PER_TEAM}</span>`;
    els.finalList.appendChild(row);
  });
}

/* ================= Confetti ================= */

const confettiState = { parts: [], running: false, raf: 0, lastSpawn: 0 };

function resizeConfettiCanvas() {
  els.confetti.width = window.innerWidth;
  els.confetti.height = window.innerHeight;
}

function spawnConfetti(count) {
  for (let i = 0; i < count; i++) {
    confettiState.parts.push({
      x: Math.random() * els.confetti.width,
      y: -20 - Math.random() * els.confetti.height * 0.3,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 1.6 + Math.random() * 2.6,
      size: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    });
  }
}

function confettiLoop(now) {
  if (!confettiState.running) return;
  const ctx = els.confetti.getContext('2d');
  ctx.clearRect(0, 0, els.confetti.width, els.confetti.height);

  if (now - confettiState.lastSpawn > 400) {
    spawnConfetti(6);
    confettiState.lastSpawn = now;
  }

  confettiState.parts = confettiState.parts.filter((p) => p.y < els.confetti.height + 30);
  for (const p of confettiState.parts) {
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  }
  confettiState.raf = requestAnimationFrame(confettiLoop);
}

function startConfetti() {
  resizeConfettiCanvas();
  els.confetti.classList.add('active');
  spawnConfetti(140);
  if (!confettiState.running) {
    confettiState.running = true;
    confettiState.raf = requestAnimationFrame(confettiLoop);
  }
}

function stopConfetti() {
  confettiState.running = false;
  cancelAnimationFrame(confettiState.raf);
  confettiState.parts = [];
  els.confetti.classList.remove('active');
  const ctx = els.confetti.getContext('2d');
  ctx.clearRect(0, 0, els.confetti.width, els.confetti.height);
}

/* ================= Neue Show ================= */

function newGame() {
  stopConfetti();
  const totalRounds = state ? state.totalRounds : 3;
  state = freshState();
  state.totalRounds = totalRounds;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    /* ignore */
  }
  showScreen('setup');
  renderSetup();
}

/* ================= Events ================= */

function bindEvents() {
  els.teamForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addTeamFromForm();
  });
  $('btn-rounds-down').addEventListener('click', () => {
    state.totalRounds = Math.max(1, state.totalRounds - 1);
    renderSetup();
  });
  $('btn-rounds-up').addEventListener('click', () => {
    state.totalRounds = Math.min(20, state.totalRounds + 1);
    renderSetup();
  });
  els.btnStart.addEventListener('click', startGame);
  $('btn-resume').addEventListener('click', () => {
    const saved = loadSaved();
    if (!saved) return;
    state = saved;
    if (state.phase === 'setup') {
      showScreen('setup');
      renderSetup();
    } else if (state.phase === 'play') {
      enterTurn();
    } else if (state.phase === 'resolve') {
      showScreen('resolve');
      renderResolve();
    } else if (state.phase === 'tiebreak') {
      showScreen('tiebreak');
      renderTiebreak();
    } else if (state.phase === 'podium') {
      showPodium();
    }
  });
  $('btn-discard').addEventListener('click', newGame);

  document.querySelectorAll('.btn.point').forEach((btn) => {
    btn.addEventListener('click', () => addPoints(Number(btn.dataset.points)));
  });
  els.btnAddPoints.addEventListener('click', () => {
    const value = Number(els.inPoints.value);
    if (els.inPoints.value === '' || !Number.isFinite(value)) return;
    els.inPoints.value = '';
    addPoints(Math.round(value));
  });
  els.inPoints.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') els.btnAddPoints.click();
  });
  els.btnUseJoker.addEventListener('click', useJoker);
  els.inJokerNote.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') useJoker();
  });
  els.btnUndo.addEventListener('click', undoLast);
  els.btnOverlayGo.addEventListener('click', () => {
    els.overlay.classList.add('hidden');
  });
  els.overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      els.overlay.classList.add('hidden');
    }
  });
  els.btnNextTeam.addEventListener('click', nextTeam);
  els.btnResolveNext.addEventListener('click', nextFromResolve);
  els.btnNewGame.addEventListener('click', newGame);
  window.addEventListener('resize', resizeConfettiCanvas);
}

/* ================= Init ================= */

function phaseLabel(phase, round) {
  if (phase === 'play') return `Runde ${round}`;
  if (phase === 'resolve') return `Auflösung Runde ${round}`;
  if (phase === 'tiebreak') return 'Tiebreaker';
  if (phase === 'podium') return 'Siegerehrung';
  return 'Setup';
}

function init() {
  state = freshState();
  const saved = loadSaved();
  if (saved && saved.phase && saved.phase !== 'setup') {
    els.resumeInfo.textContent = ` Phase: ${phaseLabel(saved.phase, saved.round)}.`;
    els.resumeBanner.classList.remove('hidden');
  }
  bindEvents();
  showScreen('setup');
  renderSetup();
}

init();
