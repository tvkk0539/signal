// Service Worker to intercept requests and stream data from WebRTC

const streams = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REGISTER_STREAM') {
    const { streamId, mimeType, size } = event.data;

    // We create a ReadableStream that will be fed by the main thread
    let controllerRef;
    const stream = new ReadableStream({
      start(controller) {
        controllerRef = controller;
      },
      cancel() {
        console.log(`[SW] Stream ${streamId} cancelled by browser`);
        streams.delete(streamId);
      }
    });

    streams.set(streamId, {
      stream,
      controller: controllerRef,
      mimeType,
      size,
      port: event.ports[0] // MessagePort from main thread
    });

    // Listen for chunks from the main thread
    event.ports[0].onmessage = (e) => {
      if (e.data.type === 'CHUNK') {
        const streamData = streams.get(streamId);
        if (streamData && streamData.controller) {
          streamData.controller.enqueue(new Uint8Array(e.data.buffer));
        }
      } else if (e.data.type === 'END') {
        const streamData = streams.get(streamId);
        if (streamData && streamData.controller) {
          try { streamData.controller.close(); } catch(err){}
        }
        streams.delete(streamId);
      } else if (e.data.type === 'ERROR') {
        const streamData = streams.get(streamId);
        if (streamData && streamData.controller) {
          try { streamData.controller.error(new Error(e.data.error)); } catch(err){}
        }
        streams.delete(streamId);
      }
    };
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/sw-stream/')) {
    const streamId = url.pathname.replace('/sw-stream/', '');
    const streamData = streams.get(streamId);

    if (streamData) {
      const headers = new Headers({
        'Content-Type': streamData.mimeType || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      // If we know the exact size, we can return a 200 OK with Content-Length.
      // A full implementation would support 206 Partial Content (Range requests),
      // but for WebRTC streaming a full file from start to finish, 200 OK + ReadableStream
      // allows the browser to play it as it downloads.
      if (streamData.size) {
        headers.set('Content-Length', streamData.size.toString());
      }

      // Browsers often require Accept-Ranges for video seeking, but since we are
      // streaming linearly over WebRTC, we don't support arbitrary seeking via ranges yet.
      // headers.set('Accept-Ranges', 'none');

      event.respondWith(new Response(streamData.stream, {
        status: 200,
        headers: headers
      }));
    } else {
      event.respondWith(new Response('Stream not found or expired', { status: 404 }));
    }
  }
});
