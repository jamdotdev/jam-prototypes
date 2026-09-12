/* Local default-browser handoff, with a same-origin popup on static hosts.
 * start({onComplete, onStatus, mode}) must run in the initiating click handler.
 * mode: "popup" explicitly selects the static-host flow, including on localhost;
 * omit mode (or use "auto") to prefer the local default-browser helper.
 * Statuses: opening = launch requested; waiting = awaiting explicit browser return;
 * blocked = popup/OS launch refused; closed = popup closed without completion;
 * unavailable = expired session, unsupported file origin, or helper unavailable.
 * onStatus receives (status, {mode, authURL, message}); only explicit completion
 * invokes onComplete. No real authentication or OS permissions are requested.
 */
(() => {
  'use strict';
  const TYPE = 'jam-prototype-auth-complete';
  const TTL = 10 * 60 * 1000;
  const local = location.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
  let localAvailable = local;
  let current = null;
  let generation = 0;

  if (local) fetch('/prototype-auth/capabilities', {cache: 'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(data => { localAvailable = !!data?.available; })
    .catch(() => { localAvailable = false; });

  const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = session => `jam-prototype-auth:${session}`;
  const live = handoff => current === handoff && !handoff.done;

  function notify(handoff, status, message = '') {
    if (!live(handoff)) return;
    handoff.status = status;
    handoff.message = message;
    handoff.onStatus?.(status, {mode: handoff.mode, authURL: handoff.authURL, message});
  }

  async function request(path, body, handoff) {
    const controller = new AbortController();
    handoff.requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(path, {
        method: body ? 'POST' : 'GET', cache: 'no-store', signal: controller.signal,
        headers: body ? {'Content-Type': 'application/json'} : {},
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (data.status === 'expired' ? 'This browser session expired. Try again.' : 'Browser handoff is unavailable.'));
      return data;
    } finally {
      clearTimeout(timeout);
      handoff.requests.delete(controller);
    }
  }

  function stopWatching(handoff) {
    clearTimeout(handoff.timer);
    clearTimeout(handoff.expiry);
    handoff.channel?.close();
    handoff.channel = null;
    if (handoff.messageHandler) window.removeEventListener('message', handoff.messageHandler);
    if (handoff.storageHandler) window.removeEventListener('storage', handoff.storageHandler);
    handoff.requests.forEach(controller => controller.abort());
    handoff.requests.clear();
  }

  function finish(handoff) {
    if (!live(handoff) || Date.now() > handoff.expiresAt) return;
    if (handoff.mode === 'popup') {
      const acknowledgement = {type: 'jam-prototype-auth-ack', session: handoff.session, at: Date.now()};
      handoff.popup?.postMessage(acknowledgement, location.origin);
      handoff.channel?.postMessage(acknowledgement);
      setTimeout(() => { if (handoff.popup && !handoff.popup.closed) handoff.popup.close(); }, 400);
      try { localStorage.setItem(`${storageKey(handoff.session)}:ack`, JSON.stringify(acknowledgement)); } catch (_) { /* Optional fallback. */ }
    }
    handoff.done = true;
    handoff.status = 'complete';
    stopWatching(handoff);
    try { localStorage.removeItem(storageKey(handoff.session)); } catch (_) { /* Storage can be unavailable in private windows. */ }
    window.focus();
    handoff.onComplete?.();
  }

  function isCompletion(data, handoff) {
    return data && data.type === TYPE && data.session === handoff.session &&
      Number.isFinite(data.at) && data.at >= handoff.startedAt - 1000 && data.at <= Date.now() + 1000;
  }

  function watchPopup(handoff) {
    handoff.messageHandler = event => {
      if (event.origin === location.origin && event.source === handoff.popup && isCompletion(event.data, handoff)) finish(handoff);
    };
    handoff.storageHandler = event => {
      if (event.key !== storageKey(handoff.session)) return;
      try { if (isCompletion(JSON.parse(event.newValue), handoff)) finish(handoff); } catch (_) { /* Ignore unrelated writes. */ }
    };
    window.addEventListener('message', handoff.messageHandler);
    window.addEventListener('storage', handoff.storageHandler);
    if ('BroadcastChannel' in window) {
      handoff.channel = new BroadcastChannel(storageKey(handoff.session));
      handoff.channel.onmessage = event => { if (isCompletion(event.data, handoff)) finish(handoff); };
    }
    const poll = () => {
      if (!live(handoff)) return;
      // Storage also covers return messages sent while this tab was suspended.
      try { if (isCompletion(JSON.parse(localStorage.getItem(storageKey(handoff.session))), handoff)) return finish(handoff); } catch (_) { /* Optional fallback. */ }
      if (handoff.popup?.closed && handoff.status !== 'closed') notify(handoff, 'closed', 'The browser window was closed. Open it again to continue.');
      handoff.timer = setTimeout(poll, 750);
    };
    poll();
  }

  function openPopup(handoff) {
    handoff.mode = 'popup';
    if (!['http:', 'https:'].includes(location.protocol)) {
      notify(handoff, 'unavailable', 'Open this prototype using its local server or hosted link to try the browser handoff.');
      return;
    }
    const url = new URL('auth.html', location.href);
    url.searchParams.set('session', handoff.session);
    url.searchParams.set('transport', 'popup');
    handoff.authURL = url.href;
    notify(handoff, 'opening');
    const left = Math.max(0, window.screenX + (window.outerWidth - 1000) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - 740) / 2);
    handoff.popup = window.open(url.href, 'jam-prototype-sign-in', `popup=yes,width=1000,height=740,left=${Math.round(left)},top=${Math.round(top)}`);
    if (!handoff.popup) return notify(handoff, 'blocked', 'Your browser blocked the new window. Allow popups or try Open browser again.');
    handoff.popup.focus();
    notify(handoff, 'waiting');
    if (!handoff.messageHandler) watchPopup(handoff);
  }

  async function launchLocal(handoff, reuse = false) {
    const revision = handoff.pollRevision = (handoff.pollRevision || 0) + 1;
    clearTimeout(handoff.timer);
    notify(handoff, 'opening');
    try {
      const data = await request('/prototype-auth/start', reuse ? {session: handoff.session} : {}, handoff);
      if (!live(handoff)) return;
      handoff.session = data.session;
      handoff.authURL = data.authURL;
      notify(handoff, data.launched ? 'waiting' : 'blocked', data.launched ? '' : 'The default browser could not open. Try opening it again.');
      clearTimeout(handoff.timer);
      pollLocal(handoff, revision);
    } catch (error) {
      if (!live(handoff)) return;
      localAvailable = false;
      notify(handoff, 'unavailable', 'The local browser helper is unavailable. Open browser again to use a popup.');
    }
  }

  async function pollLocal(handoff, revision) {
    if (!live(handoff) || revision !== handoff.pollRevision) return;
    try {
      const data = await request(`/prototype-auth/status?session=${encodeURIComponent(handoff.session)}`, null, handoff);
      if (!live(handoff) || revision !== handoff.pollRevision) return;
      if (data.status === 'complete') return finish(handoff);
      handoff.failures = 0;
    } catch (error) {
      if (!live(handoff) || revision !== handoff.pollRevision) return;
      if (++handoff.failures >= 3) notify(handoff, 'unavailable', 'Connection to the local prototype was interrupted. Open browser again to retry.');
    }
    handoff.timer = setTimeout(() => pollLocal(handoff, revision), 750);
  }

  function cancel() {
    const handoff = current;
    current = null;
    generation++;
    if (!handoff) return;
    stopWatching(handoff);
    if (!handoff.done && handoff.mode === 'local' && handoff.session) {
      fetch('/prototype-auth/cancel', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({session: handoff.session}), keepalive: true}).catch(() => {});
    }
    if (!handoff.done && handoff.popup && !handoff.popup.closed) handoff.popup.close();
  }

  function start({onComplete, onStatus, mode = 'auto'} = {}) {
    cancel();
    const startedAt = Date.now();
    const handoff = current = {
      id: generation, mode: mode !== 'popup' && localAvailable ? 'local' : 'popup',
      requestedMode: mode === 'popup' ? 'popup' : 'auto', session: token(),
      startedAt, expiresAt: startedAt + TTL, onComplete, onStatus,
      status: 'opening', authURL: '', message: '', done: false, requests: new Set(), failures: 0
    };
    handoff.expiry = setTimeout(() => {
      if (!live(handoff)) return;
      notify(handoff, 'unavailable', 'This browser session expired. Open browser again to start a new one.');
      stopWatching(handoff);
    }, TTL);
    if (handoff.mode === 'local') launchLocal(handoff);
    else openPopup(handoff);
    return getState();
  }

  function reopen() {
    const handoff = current;
    if (!handoff || handoff.done) return;
    if (Date.now() >= handoff.expiresAt || (handoff.mode === 'local' && !localAvailable)) {
      return start({onComplete: handoff.onComplete, onStatus: handoff.onStatus, mode: handoff.requestedMode});
    }
    if (handoff.mode === 'local') launchLocal(handoff, true);
    else openPopup(handoff);
  }

  function getState() {
    if (!current) return {status: 'idle', mode: localAvailable ? 'local' : 'popup'};
    return {status: current.status, mode: current.mode, authURL: current.authURL, message: current.message, expiresAt: current.expiresAt};
  }

  window.JamBrowserHandoff = {start, reopen, cancel, getState};
})();
