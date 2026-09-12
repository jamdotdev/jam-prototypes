(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const session = params.get('session') || '';
  const transport = params.get('transport');
  const dialog = document.getElementById('launch-dialog');
  const confirm = document.getElementById('confirm-launch');
  const manual = document.getElementById('launch-manually');
  const status = document.getElementById('launch-status');
  const title = document.getElementById('launch-title');
  const copy = document.getElementById('launch-copy');
  const key = `jam-prototype-auth:${session}`;
  const valid = /^[a-f0-9]{48}$/.test(session) && ['local', 'popup'].includes(transport) && ['http:', 'https:'].includes(location.protocol);
  let completed = false;
  let busy = false;

  document.getElementById('page-origin').textContent = location.origin;
  document.getElementById('allow-origin').textContent = location.origin;

  function openDialog() {
    if (!valid || completed || busy) return;
    status.textContent = '';
    if (!dialog.open) dialog.showModal();
    confirm.focus();
  }

  function cancelDialog() {
    if (busy) return;
    dialog.close();
    status.textContent = 'Ready when you are. Launch the app manually to continue.';
    manual.focus();
  }

  function returnToPopup() {
    return new Promise((resolve, reject) => {
      const message = {type: 'jam-prototype-auth-complete', session, at: Date.now()};
      let channel;
      const isAcknowledgement = data => data?.type === 'jam-prototype-auth-ack' && data.session === session && data.at >= message.at;
      const cleanup = () => {
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        window.removeEventListener('storage', stored);
        channel?.close();
        try { localStorage.removeItem(`${key}:ack`); } catch (_) { /* Optional fallback. */ }
      };
      const done = () => { cleanup(); resolve(); };
      const receive = event => {
        if (event.origin === location.origin && event.source === window.opener && isAcknowledgement(event.data)) done();
      };
      const stored = event => {
        if (event.key !== `${key}:ack`) return;
        try { if (isAcknowledgement(JSON.parse(event.newValue))) done(); } catch (_) { /* Ignore unrelated writes. */ }
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('The prototype did not respond. Return to its window and open the browser again.'));
      }, 6000);
      window.addEventListener('message', receive);
      window.addEventListener('storage', stored);
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(key);
        channel.onmessage = event => { if (isAcknowledgement(event.data)) done(); };
        channel.postMessage(message);
      }
      if (window.opener && !window.opener.closed) window.opener.postMessage(message, location.origin);
      try { localStorage.setItem(key, JSON.stringify(message)); } catch (_) { /* Private browsing may disable storage. */ }
    });
  }

  async function complete() {
    if (!valid || completed || busy) return;
    busy = true;
    confirm.disabled = true;
    document.getElementById('cancel-launch').disabled = true;
    try {
      if (transport === 'local') {
        const response = await fetch('/prototype-auth/complete', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({session}), signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error(response.status === 404 ? 'This session expired. Return to the prototype and open the browser again.' : 'Could not connect to the prototype. Please try again.');
      } else {
        await returnToPopup();
      }
      completed = true;
      dialog.close();
      title.textContent = 'You’re ready to go';
      copy.textContent = 'Return to the Jam prototype to finish setting up permissions.';
      status.textContent = 'This was a preview of the browser-to-app handoff.';
      // A regular default-browser window has no opener and stays on this success
      // screen. Only the popup this prototype created can be focused/closed here.
      if (window.opener && !window.opener.closed) {
        window.opener.focus();
        setTimeout(() => window.close(), 350);
      }
    } catch (error) {
      dialog.close();
      status.textContent = error.message || 'Could not return to the prototype. Please try again.';
      manual.focus();
    } finally {
      busy = false;
      confirm.disabled = false;
      document.getElementById('cancel-launch').disabled = false;
    }
  }

  manual.addEventListener('click', openDialog);
  confirm.addEventListener('click', complete);
  document.getElementById('cancel-launch').addEventListener('click', cancelDialog);
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancelDialog(); });
  if (valid) openDialog();
  else {
    title.textContent = 'Open Jam from the prototype';
    copy.textContent = 'Start with Continue in browser in the welcome screen.';
    status.textContent = 'There is no active browser handoff in this window.';
  }
})();
