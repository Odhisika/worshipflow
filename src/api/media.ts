import { invoke, convertFileSrc } from '@tauri-apps/api/core';

let terminalLoggingEnabled = true;

const logTerminal = async (level: 'info' | 'warn' | 'error', message: string) => {
    if (!terminalLoggingEnabled) return;
    try {
        await invoke('log_to_terminal', { level, message });
    } catch {
        // silent fallback
    }
};


export interface LocalMediaFile {
    name: string;
    path: string;
    extension: string;
    size_bytes: number;
}

// Cache data URLs for images read via Rust (used only for logo/branding images)
const dataUrlCache = new Map<string, string>();
// Cache blob URLs for media files read via IPC
const blobUrlCache = new Map<string, string>();

/**
 * Reads a local image file via Rust and returns a base64 Data URL.
 * Use this for images that need to be shown in restricted contexts.
 */
const getLocalFileBlobUrl = async (filePath: string): Promise<string> => {
    if (!filePath) return '';
    if (dataUrlCache.has(filePath)) return dataUrlCache.get(filePath)!;

    try {
        const base64Url = await invoke<string>('read_image_base64', { filePath });
        if (base64Url) {
            dataUrlCache.set(filePath, base64Url);
            return base64Url;
        }
        return '';
    } catch (err) {
        console.error(`[MediaAPI] Error reading file via Rust: ${filePath}`, err);
        return '';
    }
};

/**
 * Converts a local file path to a Tauri asset:// URL.
 * Streams the file directly from disk — no memory overhead.
 */
const getAssetUrlSync = (filePath: string): string => {
    if (!filePath) {
        console.warn('[MediaAPI] getAssetUrlSync called with empty path');
        return '';
    }
    const url = convertFileSrc(filePath, 'asset');
    console.log(`[MediaAPI] getAssetUrlSync: ${filePath} -> ${url}`);
    logTerminal('info', `[MediaAPI] Asset URL: ${url}`);
    return url;
};

/**
 * SAFE media URL resolver.
 *
 * Uses Tauri's native `asset://` streaming protocol so the browser reads the file
 * directly from disk — NO data ever crosses the IPC bridge, which prevents the
 * OOM crash that occurred when read_file_bytes tried to load an entire video into RAM.
 *
 * The old `read_file_bytes → Blob` path is kept ONLY as a fallback for tiny audio
 * files (<20 MB) where codec conversion may be needed, and is explicitly guarded
 * against video files.
 */
const VIDEO_SIZE_LIMIT_BYTES = 20 * 1024 * 1024; // 20 MB safe IPC limit

const getMediaBlobUrl = async (filePath: string): Promise<string> => {
    if (!filePath) {
        console.warn('[MediaAPI] getMediaBlobUrl called with empty path');
        return '';
    }

    // ── Fast path: asset:// streaming (zero memory, works for ANY size file) ──
    // This is what we should always use for video. The browser streams it directly.
    const assetUrl = convertFileSrc(filePath, 'asset');
    console.log(`[MediaAPI] Using asset:// URL for: ${filePath} → ${assetUrl}`);
    logTerminal('info', `[MediaAPI] asset:// URL: ${assetUrl}`).catch(() => {});
    return assetUrl;
};

// Legacy blob helper — kept for images / small audio files only (NOT video).
// This path MUST NOT be called for video files — it will crash on large files.
const getMediaBlobUrlLegacy = async (filePath: string): Promise<string> => {
    if (!filePath) return '';
    const blobUrlKey = `blob:${filePath}`;
    if (blobUrlCache.has(blobUrlKey)) return blobUrlCache.get(blobUrlKey)!;

    try {
        const bytes = await invoke<number[]>('read_file_bytes', { path: filePath });
        if (!bytes || bytes.length === 0) {
            return convertFileSrc(filePath, 'asset');
        }
        // Safety guard — never load more than 20 MB via IPC
        if (bytes.length > VIDEO_SIZE_LIMIT_BYTES) {
            console.warn(`[MediaAPI] File too large for IPC (${(bytes.length / 1024 / 1024).toFixed(1)} MB), using asset:// instead`);
            return convertFileSrc(filePath, 'asset');
        }
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const mimeMap: Record<string, string> = {
            ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav',
            flac: 'audio/flac', m4a: 'audio/mp4',
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', bmp: 'image/bmp', webp: 'image/webp',
        };
        const mime = mimeMap[ext] || 'application/octet-stream';
        const blob = new Blob([new Uint8Array(bytes)], { type: mime });
        const url = URL.createObjectURL(blob);
        blobUrlCache.set(blobUrlKey, url);
        return url;
    } catch (err) {
        console.error(`[MediaAPI] Legacy blob FAILED for: ${filePath}`, err);
        return convertFileSrc(filePath, 'asset');
    }
};


const getFileName = (filePath: string): string =>
    filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'Unknown';

const getFileExtension = (filePath: string): string =>
    filePath.split('.').pop()?.toLowerCase() || '';

export const mediaApi = {
    openMediaFileDialog: (mediaType: 'audio' | 'video' | 'image'): Promise<string[]> =>
        invoke('open_media_file_dialog', { mediaType }),

    openFolderDialog: (): Promise<string> =>
        invoke('open_folder_dialog'),

    scanFolderForMedia: (folderPath: string, mediaType: 'audio' | 'video' | 'image'): Promise<LocalMediaFile[]> =>
        invoke('scan_folder_for_media', { folderPath, mediaType }),

    prepareForPlayback: (filePath: string, mediaType: 'audio' | 'video'): Promise<string> =>
        invoke('prepare_media_for_playback', { filePath, mediaType }),

    /** Async — reads an image file from disk and returns a base64 Data URL. */
    getLocalImageUrl: getLocalFileBlobUrl,

    /** Sync — returns a Tauri asset:// URL that streams directly from disk. */
    getAssetUrl: getAssetUrlSync,

    /**
     * Safe media URL resolver.
     * Returns an asset:// URL that the Tauri webview streams directly from disk.
     * Never loads the whole file into memory — safe for videos of any size.
     */
    getMediaUrl: getMediaBlobUrl,

    /**
     * Legacy IPC blob URL — for small audio-only files (<20 MB) where codec conversion
     * may be needed. Do NOT use for video files (causes OOM crash).
     */
    getMediaUrlLegacy: getMediaBlobUrlLegacy,

    getFileName,
    getFileExtension,

    /** Pre-warm the blob URL cache for a given path. */
    preloadLocalImage: getLocalFileBlobUrl,

    logTerminal,
};
