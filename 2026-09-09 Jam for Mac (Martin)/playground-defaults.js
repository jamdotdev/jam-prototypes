(() => {
  'use strict';

  const endpoint = '/__prototype/defaults';
  const storageKey = 'jam-playground-defaults-revision-v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const stable = (value) => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
  const equal = (left, right) => stable(left) === stable(right);
  const screens = new Map();
  const pending = new Map();
  let canonical = clone(window.JamDefaultValues);
  let refreshPromise;

  function validateDocument(value) {
    if (!value || value.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        !value.groups || Object.keys(canonical.groups).some((group) => !Object.hasOwn(value.groups, group))) {
      throw new Error('The saved defaults could not be read.');
    }
    return value;
  }

  function registration(screen) {
    const adapter = screens.get(screen);
    if (!adapter) throw new Error(`Unknown playground screen: ${screen}`);
    return adapter;
  }

  function groupMap(adapter) {
    return Object.fromEntries(adapter.groups.map((group) => [group, clone(canonical.groups[group])]));
  }

  function capture(adapter) {
    const values = adapter.read();
    const result = {};
    for (const group of adapter.groups) {
      if (!values || !Object.hasOwn(values, group)) throw new Error(`Missing defaults group: ${group}`);
      result[group] = clone(values[group]);
    }
    return result;
  }

  function isDirty(screen) {
    if (!screens.has(screen)) return false;
    const adapter = registration(screen);
    const current = capture(adapter);
    return adapter.groups.some((group) => !equal(current[group], canonical.groups[group]));
  }

  function changed(screen) {
    window.dispatchEvent(new CustomEvent('defaultsstatechange', { detail: {
      screen: screen || null,
      dirty: screen ? isDirty(screen) : undefined,
      saving: screen ? pending.has(screen) : pending.size > 0,
      revision: canonical.revision,
    } }));
  }

  function accept(next, preserveScreen) {
    validateDocument(next);
    if (next.revision < canonical.revision) return;
    // Keep edits made while a request was in flight. Clean screens follow shared defaults.
    const following = [...screens].filter(([screen]) => screen !== preserveScreen && !isDirty(screen));
    const previous = canonical;
    canonical = clone(next);
    window.JamDefaultValues = clone(canonical);
    for (const [, adapter] of following) {
      if (adapter.groups.some((group) => !equal(previous.groups[group], canonical.groups[group]))) {
        adapter.apply(groupMap(adapter));
      }
    }
    changed();
  }

  async function responseDocument(response) {
    let payload;
    try { payload = await response.json(); } catch (_) { /* A static server may return HTML. */ }
    if (!response.ok || !payload) {
      throw new Error(payload?.error || 'Defaults could not be saved. Run this prototype with its local server to save shared defaults.');
    }
    return validateDocument(payload);
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const response = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin' });
        const next = await responseDocument(response);
        accept(next);
        return true;
      } catch (_) {
        // The checked-in data remains usable when shared writes are unavailable.
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  function announceSave() {
    try { localStorage.setItem(storageKey, JSON.stringify({ revision: canonical.revision, time: Date.now() })); }
    catch (_) { /* Shared source persistence does not depend on browser storage. */ }
  }

  function save(screen) {
    if (pending.has(screen)) return pending.get(screen);
    const adapter = registration(screen);
    const current = capture(adapter);
    const groups = Object.fromEntries(adapter.groups.filter((group) => !equal(current[group], canonical.groups[group]))
      .map((group) => [group, current[group]]));
    if (!Object.keys(groups).length) return Promise.resolve(groupMap(adapter));
    // Only changed groups are patched so an unrelated save in another tab is retained.
    const operation = (async () => {
      try {
        let response;
        try {
          response = await fetch(endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
            body: JSON.stringify({ version: 1, groups }),
          });
        } catch (_) {
          throw new Error('Defaults could not be saved. Check that the prototype local server is running.');
        }
        const next = await responseDocument(response);
        accept(next, screen);
        announceSave();
        return groupMap(adapter);
      } finally {
        pending.delete(screen);
        changed();
      }
    })();
    pending.set(screen, operation);
    changed();
    return operation;
  }

  window.JamDefaults = {
    get(group) {
      if (!Object.hasOwn(canonical.groups, group)) throw new Error(`Unknown defaults group: ${group}`);
      return clone(canonical.groups[group]);
    },
    register(screen, adapter) {
      if (!screen || !adapter || !Array.isArray(adapter.groups) || !adapter.groups.length ||
          typeof adapter.read !== 'function' || typeof adapter.apply !== 'function' ||
          (adapter.onReset !== undefined && typeof adapter.onReset !== 'function') ||
          adapter.groups.some((group) => !Object.hasOwn(canonical.groups, group))) {
        throw new Error('A defaults screen needs known groups, read, and apply callbacks.');
      }
      screens.set(screen, { ...adapter, groups: [...new Set(adapter.groups)] });
      adapter.apply(groupMap(adapter));
      changed(screen);
      return () => { screens.delete(screen); changed(); };
    },
    isDirty,
    isSaving: (screen) => screen ? pending.has(screen) : pending.size > 0,
    save,
    reset(screen) {
      const adapter = registration(screen);
      adapter.apply(groupMap(adapter));
      adapter.onReset?.();
      changed(screen);
    },
    changed,
    refresh,
  };

  window.addEventListener('storage', (event) => { if (event.key === storageKey) refresh(); });
  window.addEventListener('focus', refresh);
  window.JamDefaults.ready = refresh();
})();
