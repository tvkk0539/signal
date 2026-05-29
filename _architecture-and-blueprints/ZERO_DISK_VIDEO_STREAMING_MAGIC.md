# Zero-Disk Video Streaming Magic (WebRTC & FFmpeg)

This document details the highly-engineered architectural approach for streaming massive, unsupported video formats (like 50GB `.mkv` files) directly to a web browser using ephemeral, low-resource cloud workers (like free GitHub Actions runners).

The core challenge is achieving universal playback without downloading the file to disk and without crashing the server.

---

## The Core Challenge

Browsers natively refuse to play formats like `.mkv`, `.avi`, or codecs like HEVC (H.265) and AC3 audio. Normally, applications download the massive file to a hard drive, spend hours converting it, and then serve it.

In our architecture, we operate on ephemeral workers with very limited disk space (e.g., GitHub Actions with 7GB RAM, 2-core CPU, and minimal disk). We must achieve "Zero-Disk" streaming.

---

## Magic 1: The "FFmpeg RAM-Pipe" (Free Cloud Transcoding)

We bypass the disk entirely by chaining Unix Pipes (`stdin`/`stdout`) through FFmpeg.

### The "Water Pipe" Analogy

Think of a 50GB video file not as a solid brick of data, but as a giant lake of water. We don't need to move the whole lake at once. We just connect a hose.

1.  **`rclone cat` (The Intake Hose):**
    When we run `rclone cat google_drive:massive_movie.mkv`, it does *not* download the file to the disk. It opens an HTTP connection to the cloud provider and starts pulling the file byte-by-byte directly into the Node.js RAM.
2.  **FFmpeg `stdin` (The Blender):**
    We tell FFmpeg to read from Standard Input (`ffmpeg -i -`). We literally connect the `rclone` intake hose directly into FFmpeg. FFmpeg only needs a few Megabytes of video frames in its RAM at any given second. It decodes them, encodes them to a web-friendly format, and spits them out immediately.
3.  **FFmpeg `stdout` (The Outtake Hose):**
    We tell FFmpeg to output to Standard Output (`-f webm pipe:1`). The transcoded bytes pour out of FFmpeg directly back into Node.js.
4.  **WebRTC (The Delivery Hose):**
    Node.js catches those transcoded bytes and immediately shoves them into the WebRTC Data Channel, which blasts them straight to the browser.

**The Result:** The data flows continuously: `Cloud Provider ➡️ Rclone RAM ➡️ FFmpeg RAM ➡️ WebRTC RAM ➡️ Browser`. You can stream a 100GB file, and the worker's hard drive usage remains at 0 bytes, while RAM sits around 200MB.

---

## The Container vs. The Codec

To make a video browser-friendly, FFmpeg decides whether to "Transmux" or "Transcode". A video file is two things:
1.  **The Container (The Box):** The extension (`.mkv`, `.mp4`). It's just cardboard.
2.  **The Codec (The Inside):** The video math (`H.264`, `HEVC`, `VP9`).

### Magic A: "Transmuxing" (Zero CPU)
If the cloud provider has an `.mkv` file, but the video inside is `H.264` (which the browser loves), the browser refuses to play it only because it hates the `.mkv` box.
*   **What we do:** We tell FFmpeg to use `-c copy`. FFmpeg violently rips off the `.mkv` cardboard box and slides the exact same video stream into a `Fragmented MP4` or `WebM` box.
*   **The Benefit:** Zero converting. Instantaneous. Uses ~1% CPU.

### Magic B: "Transcoding" (Heavy CPU)
If the file has an `HEVC` video codec or `AC3` audio, the browser physically cannot draw the pixels.
*   **What we do:** FFmpeg fully decodes every pixel into memory and re-encodes it into `H.264` or `VP9`.
*   **The Benefit:** Universal playback. The catch is heavy CPU usage.

---

## The "50GB" Illusion: 1080p vs 4K Transcoding

When streaming, the CPU doesn't care how big the total file is; it only looks at one second of video at a time. The file size is just how long you stay in the gym. The **Resolution and Bitrate** are how heavy the weights are.

*   **The 3GB Video (1080p HD):** FFmpeg decodes ~2 million pixels per second. A free 2-core GitHub Action CPU handles this easily (~40-60% load). It transcodes faster than you can watch it.
*   **The 50GB Video (4K UHD):** FFmpeg decodes >8 million pixels per second. **Transcoding 4K video in real-time will completely crush a free 2-core CPU.** It hits 100% instantly, causing constant buffering.

### How to solve the 50GB 4K limitation?

1.  **Pray for Transmuxing (Magic A):** If the 4K file is `H.264` inside an `.mkv`, `-c copy` uses no CPU, and it streams flawlessly.
2.  **Hardware Acceleration:** Deploy the backend worker to an AWS instance with an Nvidia GPU (`nvenc`). It handles 4K effortlessly.
3.  **Magic 2: WebAssembly (WASM) Frontend Player:** If the file requires heavy decoding and the server CPU is too weak, we stream the raw, unsupported 50GB file straight to the browser via WebRTC. We bundle a WASM VLC/FFmpeg player in the React UI, forcing the user's powerful local hardware (e.g., M1 Mac) to do the heavy lifting!
