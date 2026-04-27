/**
 * Evidence Recording Service (Stealth Mode)
 *
 * Silently records audio in the background when SOS is triggered.
 * Uses a MMKV-backed upload queue for crash-proof file tracking.
 *
 * Strategy:
 *  - Records in 30-second chunks (so partial evidence is never lost).
 *  - Each chunk path is saved to MMKV synchronously before upload.
 *  - Files are uploaded to the backend; on failure they stay in queue for retry.
 *
 * NOTE: Video recording requires a CameraView component mounted in the UI.
 *       See `components/stealth/StealthCamera.tsx` for the video component.
 */

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { createMMKV } from 'react-native-mmkv';

// ─── MMKV Storage (Synchronous) ───────────────────────────────────────────────

const evidenceStorage = createMMKV({ id: 'evidence-queue' });
const QUEUE_KEY = 'pending_uploads';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvidenceStatus = 'idle' | 'recording' | 'stopped' | 'error';

export interface EvidenceState {
    status: EvidenceStatus;
    currentChunkIndex: number;
    pendingUploads: string[];
}

// ─── State ────────────────────────────────────────────────────────────────────

let recording: Audio.Recording | null = null;
let chunkTimer: ReturnType<typeof setTimeout> | null = null;
let chunkIndex = 0;
let isRecording = false;
const CHUNK_DURATION_MS = 30_000; // 30 seconds per chunk

// ─── Queue Management (MMKV Synchronous) ─────────────────────────────────────

/**
 * Adds a file path to the pending upload queue.
 * MMKV writes synchronously — safe even if app crashes immediately after.
 */
function enqueueForUpload(filePath: string): void {
    const existing = evidenceStorage.getString(QUEUE_KEY);
    const queue: string[] = existing ? JSON.parse(existing) : [];
    queue.push(filePath);
    evidenceStorage.set(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Evidence] Queued for upload: ${filePath}`);
}

/**
 * Returns all pending upload paths from MMKV.
 */
export function getPendingUploads(): string[] {
    const raw = evidenceStorage.getString(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
}

/**
 * Removes a successfully uploaded file from the queue.
 */
export function removeFromQueue(filePath: string): void {
    const queue = getPendingUploads().filter((p) => p !== filePath);
    evidenceStorage.set(QUEUE_KEY, JSON.stringify(queue));
}

// ─── Recording Logic ──────────────────────────────────────────────────────────

async function startChunk(): Promise<void> {
    if (!isRecording) return;

    // Clear any existing timer to prevent overlapping chunks
    if (chunkTimer) {
        clearTimeout(chunkTimer);
        chunkTimer = null;
    }

    try {
        // 1. Teardown previous recording safely
        if (recording) {
            try {
                const status = await recording.getStatusAsync();
                if (status.canRecord) {
                    await recording.stopAndUnloadAsync();
                    const savedUri = recording.getURI();
                    if (savedUri) {
                        enqueueForUpload(savedUri);
                        uploadChunk(savedUri).catch(() => {
                            console.warn('[Evidence] Background upload failed, keeping in queue.');
                        });
                    }
                }
            } catch (err) {
                console.warn('[Evidence] Failed to stop previous chunk (might have been destroyed by OS):', err);
            } finally {
                recording = null; // Always clear reference
            }
        }

        // 2. Ensure we are still supposed to be recording
        if (!isRecording) return;

        // 3. Start new chunk
        chunkIndex++;
        const newRecording = new Audio.Recording();
        await newRecording.prepareToRecordAsync({
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            android: {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
                extension: '.m4a',
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
            },
        });
        await newRecording.startAsync();
        recording = newRecording;

        console.log(`[Evidence] 🎙️ Recording chunk #${chunkIndex}`);

        // 4. Schedule next chunk ONLY if still active
        if (isRecording) {
            chunkTimer = setTimeout(startChunk, CHUNK_DURATION_MS);
        }
    } catch (error) {
        console.error('[Evidence] Chunk recording error:', error);
        // If critical failure, wait a bit and try to restart the chain
        if (isRecording) {
            chunkTimer = setTimeout(startChunk, 5000); 
        }
    }
}

// ─── Upload Logic ─────────────────────────────────────────────────────────────

/**
 * Uploads a single chunk to the backend.
 * On success, removes from queue. On failure, keeps in queue for retry.
 */
async function uploadChunk(filePath: string): Promise<void> {
    const UPLOAD_URL = 'http://192.168.37.98:3001/api/evidence/upload';

    try {
        console.log(`[Evidence] 📤 Uploading to: ${UPLOAD_URL}`);
        const response = await FileSystem.uploadAsync(UPLOAD_URL, filePath, {
            httpMethod: 'POST',
            uploadType: 1, // FileSystemUploadType.MULTIPART = 1
            fieldName: 'evidence',
            headers: {
                'Accept': 'application/json',
            },
        });

        console.log(`[Evidence] 📧 Backend Response: ${response.status} - ${response.body}`);

        if (response.status === 200) {
            removeFromQueue(filePath);
            console.log(`[Evidence] ✅ Uploaded successfully: ${filePath}`);
        } else {
            throw new Error(`Upload failed with status ${response.status}`);
        }
    } catch (err) {
        console.error('[Evidence] ❌ Upload process error:', err);
        throw err;
    }
}

/**
 * Retries all pending uploads from the MMKV queue.
 * Call this on app startup to recover from crashes.
 */
export async function retryPendingUploads(): Promise<void> {
    const pending = getPendingUploads();
    if (pending.length === 0) return;

    console.log(`[Evidence] Retrying ${pending.length} pending uploads...`);
    for (const filePath of pending) {
        try {
            await uploadChunk(filePath);
        } catch {
            console.warn(`[Evidence] Retry failed for: ${filePath}`);
        }
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts stealth audio recording in 30-second chunks.
 * Each chunk is saved to MMKV queue and uploaded immediately.
 */
export async function startEvidenceRecording(): Promise<void> {
    if (isRecording) {
        console.warn('[Evidence] Already recording.');
        return;
    }

    try {
        // Request audio permissions and configure for background recording
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            staysActiveInBackground: true, // KEY: keeps recording when screen is locked
            playsInSilentModeIOS: true,
        });

        isRecording = true;
        chunkIndex = 0;
        await startChunk();

        console.log('[Evidence] Stealth recording started.');
    } catch (error) {
        console.error('[Evidence] Failed to start recording:', error);
        isRecording = false;
    }
}

/**
 * Stops the recording and saves the final chunk.
 */
export async function stopEvidenceRecording(): Promise<void> {
    if (!isRecording) return;

    isRecording = false;

    if (chunkTimer) {
        clearTimeout(chunkTimer);
        chunkTimer = null;
    }

    if (recording) {
        try {
            await recording.stopAndUnloadAsync();
            const savedUri = recording.getURI();
            if (savedUri) {
                enqueueForUpload(savedUri);
                uploadChunk(savedUri).catch(() => { });
            }
        } catch (error) {
            console.error('[Evidence] Error stopping recording:', error);
        }
        recording = null;
    }

    console.log('[Evidence] Recording stopped.');
}

/**
 * Returns current evidence recording state.
 */
export function getEvidenceState(): EvidenceState {
    return {
        status: isRecording ? 'recording' : 'idle',
        currentChunkIndex: chunkIndex,
        pendingUploads: getPendingUploads(),
    };
}
