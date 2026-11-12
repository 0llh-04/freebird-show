'use strict';

const test = require('node:test');
const assert = require('node:assert');
const G = require('../renderer/game.js');

test('createTeam setzt 6 Joker, 2 Spieler und 0 Punkte', () => {
  const t = G.createTeam(1, 'Adler', 'Anna', 'Ben');
  assert.equal(t.jokers, 6);
  assert.deepEqual(t.players, ['Anna', 'Ben']);
  assert.equal(t.score, 0);
  assert.deepEqual(t.log, []);
});

test('validateTeam erkennt fehlende Angaben', () => {
  assert.ok(G.validateTeam('', 'A', 'B'));
  assert.ok(G.validateTeam('Team', '', 'B'));
  assert.ok(G.validateTeam('Team', 'A', '  '));
  assert.equal(G.validateTeam('Team', 'A', 'B'), null);
});

test('rotateOrder verschiebt die Reihenfolge', () => {
  const order = ['a', 'b', 'c'];
  assert.deepEqual(G.rotateOrder(order, 1), ['b', 'c', 'a']);
  assert.deepEqual(G.rotateOrder(order, 2), ['c', 'a', 'b']);
  assert.deepEqual(G.rotateOrder(order, 3), ['a', 'b', 'c']);
  assert.deepEqual(G.rotateOrder(order, 0), ['a', 'b', 'c']);
  assert.deepEqual(order, ['a', 'b', 'c']);
});

test('computeStandings sortiert nach Punkten absteigend', () => {
  const standings = G.computeStandings([
    { id: 1, name: 'A', score: 50 },
    { id: 2, name: 'B', score: 120 },
    { id: 3, name: 'C', score: 120 }
  ]);
  assert.deepEqual(standings.map((t) => t.id), [2, 3, 1]);
});

test('findTieGroups findet Gruppen mit gleichen Punkten', () => {
  const standings = [
    { id: 1, name: 'A', score: 100 },
    { id: 2, name: 'B', score: 100 },
    { id: 3, name: 'C', score: 40 },
    { id: 4, name: 'D', score: 40 }
  ];
  assert.deepEqual(G.findTieGroups(standings, []), [[1, 2], [3, 4]]);
  assert.deepEqual(G.findTieGroups(standings, [[1, 2]]), [[3, 4]]);
  assert.deepEqual(G.findTieGroups(standings, [[1, 2], [3, 4]]), []);
});

test('rankTiebreakGroup liefert null bei unentschieden', () => {
  assert.deepEqual(G.rankTiebreakGroup([1, 2], { 1: 30, 2: 10 }), [1, 2]);
  assert.equal(G.rankTiebreakGroup([1, 2], { 1: 20, 2: 20 }), null);
  assert.deepEqual(G.rankTiebreakGroup([2, 1], { 1: 30, 2: 40 }), [2, 1]);
});

test('computeFinalRanking wendet Tiebreaker-Ergebnis an, ohne Punkte zu ändern', () => {
  const teams = [
    { id: 1, name: 'A', score: 100 },
    { id: 2, name: 'B', score: 100 },
    { id: 3, name: 'C', score: 100 },
    { id: 4, name: 'D', score: 200 }
  ];
  const ranking = G.computeFinalRanking(teams, [[2, 3, 1]]);
  assert.deepEqual(ranking, [4, 2, 3, 1]);
});

test('makeLogEntry erzeugt Protokolleintrag', () => {
  const e = G.makeLogEntry(2, 'joker', null, 'Hinweis für Frage 3', 'game');
  assert.equal(e.round, 2);
  assert.equal(e.type, 'joker');
  assert.equal(e.note, 'Hinweis für Frage 3');
  assert.equal(e.scope, 'game');
});
