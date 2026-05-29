// Service Worker for bridging WebRTC chunks to a native HTTP ReadableStream
// This allows the browser's native <video> tag to play standard (unfragmented) MP4 files
// bypassing the strict requirements of MediaSource Extensions (MSE).

const streamControllers = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // Take control of all clients immediately
});

// Listen for messages from the React frontend
self.addEventListener('message', (event) => {
  const data = event.data;

  // The frontend must send us a MessagePort to establish a high-performance 2-way pipe
  if (data.type === 'PORT_INITIALIZATION') {
     const port = event.ports[0];

     port.onmessage = (portEvent) => {
        const portData = portEvent.data;

        if (portData.type === 'INIT_STREAM') {
          const { streamId, mimeType } = portData;
          console.log(`[ServiceWorker] Initializing stream: ${streamId}`);

          // Store metadata so the fetch handler knows how to respond
          streamControllers.set(streamId, {
            mimeType,
            controller: null,
            buffer: [], // Temporary buffer in case fetch happens before chunks arrive
            isFinished: false,
            error: null
          });

          // Acknowledge initialization back through the dedicated port
          port.postMessage({ type: 'STREAM_INITIALIZED' });
        }
        else if (portData.type === 'CHUNK') {
          const { streamId, chunk } = portData;
          const stream = streamControllers.get(streamId);

          if (stream) {
            if (stream.controller) {
              // If the fetch event is already active, enqueue directly to the ReadableStream
              stream.controller.enqueue(new Uint8Array(chunk));
            } else {
              // If fetch hasn't happened yet, buffer the chunks temporarily
              stream.buffer.push(new Uint8Array(chunk));
            }
          }
        }
        else if (portData.type === 'END_STREAM') {
          const { streamId } = portData;
          const stream = streamControllers.get(streamId);
          console.log(`[ServiceWorker] Ending stream: ${streamId}`);

          if (stream) {
            stream.isFinished = true;
            if (stream.controller) {
              stream.controller.close();
            }
          }
        }
        else if (portData.type === 'ERROR_STREAM') {
          const { streamId, error } = portData;
          const stream = streamControllers.get(streamId);
          console.error(`[ServiceWorker] Stream Error: ${streamId}`, error);

          if (stream) {
              stream.error = error;
              if (stream.controller) {
                  stream.controller.error(new Error(error));
              }
          }
        }
     };
  }
});

// Intercept fetch requests to our fake streaming endpoint
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept URLs that start with /sw-stream/
  if (url.pathname.startsWith('/sw-stream/')) {
    // Extract the streamId (e.g., /sw-stream/12345 -> 12345)
    const streamId = url.pathname.replace('/sw-stream/', '');
    const streamInfo = streamControllers.get(streamId);

    if (!streamInfo) {
      console.error(`[ServiceWorker] Stream ${streamId} not found.`);
      return event.respondWith(new Response('Stream not found', { status: 404 }));
    }

    // Create a ReadableStream that pulls data provided by the React UI
    const readableStream = new ReadableStream({
      start(controller) {
        // Flush any chunks that arrived before the fetch request was made
        while (streamInfo.buffer.length > 0) {
          controller.enqueue(streamInfo.buffer.shift());
        }

        if (streamInfo.error) {
            controller.error(new Error(streamInfo.error));
            return;
        }

        if (streamInfo.isFinished) {
          controller.close();
        } else {
          // Save the controller so the message event handler can push new chunks to it
          streamInfo.controller = controller;
        }
      },
      cancel() {
        console.log(`[ServiceWorker] Stream ${streamId} cancelled by browser.`);
        streamControllers.delete(streamId);
      }
    });

    // We must return a 200 OK Response with the stream and correct MIME type.
    // The native <video> tag will read this stream as if it's a normal HTTP download.
    const responseHeaders = new Headers({
      'Content-Type': streamInfo.mimeType || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Accept-Ranges': 'none' // Important: We are sending a continuous stream, we cannot support seeking/range requests yet.
    });

    event.respondWith(new Response(readableStream, { headers: responseHeaders }));
  }
});
