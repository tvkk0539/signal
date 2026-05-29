// Service Worker for WebRTC Media Streaming
// This acts as a bridge between the WebRTC DataChannel (receiving binary chunks)
// and the native browser `<video>` tag (which expects a standard HTTP response).
// This completely bypasses MediaSource Extensions (MSE) allowing unfragmented MP4s to play perfectly.

const streamMap = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REGISTER_STREAM') {
    const { streamId, fileType, fileSize } = event.data;
    const port = event.ports[0];

    if (!port) {
      console.error('[SW] No MessagePort provided for REGISTER_STREAM');
      return;
    }

    let controllerRef;
    let isCancelled = false;

    // Create a ReadableStream that pulls from the MessageChannel
    const stream = new ReadableStream({
      start(controller) {
        controllerRef = controller;

        port.onmessage = (e) => {
          if (isCancelled) return;

          if (e.data === 'EOF') {
            console.log(`[SW] Stream ${streamId} received EOF`);
            controller.close();
            port.close();
            streamMap.delete(streamId);
          } else if (e.data === 'ABORT') {
            console.log(`[SW] Stream ${streamId} aborted by client`);
            controller.error('Client aborted');
            port.close();
            streamMap.delete(streamId);
          } else if (e.data instanceof ArrayBuffer || e.data instanceof Uint8Array) {
            // Push chunk into the stream
            controller.enqueue(new Uint8Array(e.data));
          } else {
             console.warn('[SW] Unknown data received on port', e.data);
          }
        };
      },
      cancel(reason) {
        console.log(`[SW] Stream ${streamId} cancelled by browser`, reason);
        isCancelled = true;
        port.postMessage({ type: 'CANCELLED', reason });
        port.close();
        streamMap.delete(streamId);
      }
    });

    streamMap.set(streamId, { stream, fileType, fileSize });
    console.log(`[SW] Stream ${streamId} registered successfully`);
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/sw-stream/')) {
    const streamId = url.pathname.replace('/sw-stream/', '');
    const streamData = streamMap.get(streamId);

    if (streamData) {
      console.log(`[SW] Intercepted request for stream: ${streamId}`);

      const headers = new Headers({
        'Content-Type': streamData.fileType || 'video/mp4',
        'Cache-Control': 'no-store',
        'Accept-Ranges': 'none' // Range requests require backend offset support (Phase 2)
      });

      if (streamData.fileSize) {
         headers.set('Content-Length', streamData.fileSize.toString());
      }

      event.respondWith(
        new Response(streamData.stream, {
          status: 200,
          headers: headers
        })
      );

      // We remove it from the map because a ReadableStream can only be consumed once
      // If the browser makes another request, we need a new stream registration
      streamMap.delete(streamId);
    } else {
      console.warn(`[SW] Stream ${streamId} not found in map!`);
      event.respondWith(new Response('Stream not found', { status: 404 }));
    }
  }
});
