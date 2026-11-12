'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FreebirdGame = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const JOKERS_PER_TEAM = 6;
  const PLAYERS_PER_TEAM = 2;

  function createTeam(id, name, player1, player2) {
    return {
      id,
      name,
      players: [player1, player2],
      jokers: JOKERS_PER_TEAM,
      score: 0,
      log: []
    };
  }

  function validateTeam(name, player1, player2) {
    if (!name || !String(name).trim()) return 'Teamname fehlt.';
    if (!player1 || !String(player1).trim()) return 'Spieler 1 fehlt.';
    if (!player2 || !String(player2).trim()) return 'Spieler 2 fehlt.';
    return null;
  }

  function rotateOrder(order, times) {
    const n = times == null ? 1 : times;
    if (!order.length) return [];
    const k = ((n % order.length) + order.length) % order.length;
    return order.slice(k).concat(order.slice(0, k));
  }

  function computeStandings(teams) {
    return teams.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'de'));
  }

  function findTieGroups(standings, resolvedGroups) {
    const resolvedSets = (resolvedGroups || []).map((g) => new Set(g));
    const groups = [];
    let i = 0;
    while (i < standings.length) {
      let j = i;
      while (j + 1 < standings.length && standings[j + 1].score === standings[i].score) j++;
      if (j > i) {
        const ids = standings.slice(i, j + 1).map((t) => t.id);
        const set = new Set(ids);
        const alreadyResolved = resolvedSets.some(
          (r) => r.size === set.size && ids.every((id) => r.has(id))
        );
        if (!alreadyResolved) groups.push(ids);
      }
      i = j + 1;
    }
    return groups;
  }

  function rankTiebreakGroup(teamIds, scores) {
    const sorted = teamIds.slice().sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    for (let i = 1; i < sorted.length; i++) {
      if ((scores[sorted[i]] || 0) === (scores[sorted[i - 1]] || 0)) return null;
    }
    return sorted;
  }

  function computeFinalRanking(teams, resolvedGroups) {
    const ranking = computeStandings(teams).map((t) => t.id);
    const resolved = (resolvedGroups || []).slice().reverse();
    for (const group of resolved) {
      const positions = group.map((id) => ranking.indexOf(id));
      if (positions.some((p) => p === -1)) continue;
      positions.sort((a, b) => a - b);
      positions.forEach((pos, idx) => {
        ranking[pos] = group[idx];
      });
    }
    return ranking;
  }

  function makeLogEntry(round, type, amount, note, scope) {
    return { round, type, amount: amount == null ? null : amount, note: note || '', scope };
  }

  return {
    JOKERS_PER_TEAM,
    PLAYERS_PER_TEAM,
    createTeam,
    validateTeam,
    rotateOrder,
    computeStandings,
    findTieGroups,
    rankTiebreakGroup,
    computeFinalRanking,
    makeLogEntry
  };
});
