import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHomeState, saveHomeState } from '../js/home.js';

function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
}

test('the home list starts on All at the top', () => {
  assert.deepEqual(readHomeState(memoryStorage()), { filter: 'all', scrollY: 0 });
  assert.deepEqual(readHomeState(null), { filter: 'all', scrollY: 0 });
});

test('the filter and scroll position come back after visiting a technique', () => {
  const storage = memoryStorage();
  saveHomeState({ filter: 'energise', scrollY: 640 }, storage);
  assert.deepEqual(readHomeState(storage), { filter: 'energise', scrollY: 640 });
});

test('broken saved state falls back to the defaults', () => {
  const storage = memoryStorage();
  storage.setItem('breathing:home', '{not json');
  assert.deepEqual(readHomeState(storage), { filter: 'all', scrollY: 0 });
  storage.setItem('breathing:home', JSON.stringify({ filter: 3, scrollY: 'x' }));
  assert.deepEqual(readHomeState(storage), { filter: 'all', scrollY: 0 });
});
