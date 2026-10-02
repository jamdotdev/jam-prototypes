(() => {
  'use strict';

  function create(video, { onChange } = {}) {
    const media = navigator.mediaDevices;
    const listeners = new Set(typeof onChange === 'function' ? [onChange] : []);
    const owned = new Set();
    let state = { status: 'idle', error: '', devices: [], deviceId: '', label: '' };
    let stream = null, epoch = 0, enumeration = 0, pending = null, pendingDevice = '', pendingEpoch = 0;
    let granted = false, denied = false, destroyed = false, permission = null;
    const getState = () => ({ ...state, devices: state.devices.map(device => ({ ...device })) });
    function emit(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) {
        try { listener(getState()); } catch (error) { console.error('Camera state listener failed', error); }
      }
      return getState();
    }
    function release(value) {
      if (!value) return;
      for (const track of value.getTracks()) track.stop();
      owned.delete(value);
    }
    function discardReplacement(next, previous) {
      release(next);
      const canRestore = owned.has(previous) && previous.getVideoTracks().some(track => track.readyState === 'live');
      if (stream === next || (!stream && canRestore)) {
        stream = canRestore ? previous : null;
        if (video.srcObject === next || (!video.srcObject && stream)) video.srcObject = stream;
      }
    }
    function clearVideo() {
      video.pause();
      video.srcObject = null;
    }
    function live() {
      return stream && stream.getVideoTracks().some(track => track.readyState === 'live');
    }
    function errorState(error) {
      switch (error?.name) {
        case 'NotAllowedError': case 'PermissionDeniedError': case 'SecurityError':
          denied = true;
          return { status: 'denied', error: 'Camera access is blocked. Allow the camera in your browser’s site settings, then try again.' };
        case 'NotFoundError': case 'DevicesNotFoundError':
          return { status: 'unavailable', error: 'No camera was found. Connect a camera and try again.' };
        case 'OverconstrainedError': case 'ConstraintNotSatisfiedError':
          return { status: 'unavailable', error: 'That camera is no longer available. Choose another camera.' };
        case 'NotReadableError': case 'TrackStartError':
          return { status: 'error', error: 'The camera could not start. Close any other app using it and try again.' };
        case 'AbortError': case 'InvalidStateError':
          return { status: 'error', error: 'The camera could not start. Return to this window and try again.' };
        default:
          return { status: 'error', error: 'The camera could not start. Please try again.' };
      }
    }
    async function refreshDevices() {
      if (!granted || !media?.enumerateDevices || destroyed) return;
      const request = ++enumeration;
      try {
        const values = await media.enumerateDevices();
        if (destroyed || request !== enumeration) return;
        const devices = values.filter(device => device.kind === 'videoinput').map((device, index) => ({
          deviceId: device.deviceId, label: device.label || `Camera ${index + 1}`,
        }));
        emit({ devices });
      } catch (_) { /* Device discovery must not interrupt an otherwise live preview. */ }
    }
    const onPermissionChange = () => {
      if (permission?.state === 'granted') denied = false;
    };
    async function permissionAllowsRetry() {
      if (!denied) return true;
      // Permission queries do not prompt. An unsupported query retains the denial latch.
      try {
        const next = await navigator.permissions?.query({ name: 'camera' });
        if (destroyed) return false;
        if (next && next !== permission) {
          permission?.removeEventListener?.('change', onPermissionChange);
          permission = next;
          permission.addEventListener?.('change', onPermissionChange);
        }
        onPermissionChange();
      } catch (_) { /* The browser may require a reload after changing permission. */ }
      return !denied;
    }
    function watch(value) {
      for (const track of value.getVideoTracks()) track.addEventListener('ended', () => {
        if (value !== stream || destroyed) return;
        stream = null;
        release(value);
        if (video.srcObject === value) clearVideo();
        emit({ status: 'unavailable', error: 'The camera disconnected or access was stopped. Choose a camera to continue.' });
        refreshDevices();
      }, { once: true });
    }
    function request(deviceId = '') {
      deviceId = typeof deviceId === 'string' ? deviceId : '';
      if (destroyed) return Promise.resolve(getState());
      if (pending && pendingEpoch === epoch && pendingDevice === deviceId) return pending;
      if (!pending && live() && (!deviceId || deviceId === state.deviceId)) return Promise.resolve(getState());
      const token = ++epoch, previous = pending;
      pendingDevice = deviceId; pendingEpoch = token;
      const operation = (async () => {
        // Serialize prompts. A newer selection supersedes the result of an older request.
        if (previous) await previous;
        if (destroyed || token !== epoch) return getState();
        if (!media?.getUserMedia || globalThis.isSecureContext === false) {
          return emit({ status: 'unavailable', error: 'Camera access is unavailable here. Open the prototype on localhost or HTTPS.' });
        }
        if (!await permissionAllowsRetry()) {
          if (destroyed || token !== epoch) return getState();
          return emit({ status: live() ? 'live' : 'denied', error: 'Camera access is blocked. Allow it in your browser’s site settings and reload this page if needed.' });
        }
        if (destroyed || token !== epoch) return getState();
        emit({ status: 'requesting', error: '' });
        let next = null;
        const previousStream = stream;
        try {
          next = await media.getUserMedia({ audio: false, video: deviceId ? { deviceId: { exact: deviceId } } : true });
          owned.add(next);
          if (destroyed || token !== epoch) { release(next); return getState(); }
          const track = next.getVideoTracks()[0];
          if (!track || track.readyState !== 'live') {
            const error = new Error('Camera did not provide a live track'); error.name = 'NotReadableError'; throw error;
          }
          granted = true; denied = false;
          stream = next;
          video.muted = true; video.autoplay = true; video.playsInline = true;
          video.srcObject = next;
          watch(next);
          await video.play();
          if (destroyed || token !== epoch) {
            discardReplacement(next, previousStream);
            return getState();
          }
          if (track.readyState !== 'live') {
            const error = new Error('Camera ended before playback started'); error.name = 'NotReadableError'; throw error;
          }
          release(previousStream);
          const selected = track.getSettings?.().deviceId || deviceId;
          emit({ status: 'live', error: '', deviceId: selected, label: track.label || 'Camera' });
          await refreshDevices();
          return getState();
        } catch (error) {
          discardReplacement(next, previousStream);
          if (destroyed || token !== epoch) return getState();
          stream = previousStream?.getVideoTracks().some(track => track.readyState === 'live') ? previousStream : null;
          if (stream) { video.srcObject = stream; video.play()?.catch(() => {}); }
          else clearVideo();
          const failure = errorState(error);
          return emit({ ...failure, status: live() ? 'live' : failure.status });
        }
      })();
      pending = operation;
      operation.finally(() => { if (pending === operation) { pending = null; pendingDevice = ''; } });
      return operation;
    }
    function stop() {
      ++epoch; ++enumeration;
      stream = null;
      for (const value of [...owned]) release(value);
      clearVideo();
      return emit({ status: 'idle', error: '' });
    }
    function destroy() {
      stop(); destroyed = true;
      media?.removeEventListener?.('devicechange', refreshDevices);
      globalThis.removeEventListener('pagehide', stop);
      permission?.removeEventListener?.('change', onPermissionChange);
      listeners.clear();
    }
    media?.addEventListener?.('devicechange', refreshDevices);
    globalThis.addEventListener('pagehide', stop);
    return { request, stop, getState, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, destroy };
  }

  globalThis.JamRecordingCamera = { create };
})();
