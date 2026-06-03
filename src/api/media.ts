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

// Cache blob URLs for media files
const blobUrlCache = new Map<string, string>();
const pendingReads = new Map<string, Promise<string>>();

const mimeFromExt = (ext: string): string => {
    const map: Record<string, string> = {
        mp4: 'video/mp4', webm: 'video/webm', avi: 'video/x-msvideo',
        mov: 'video/quicktime', mkv: 'video/x-matroska',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
        flac: 'audio/flac', m4a: 'audio/mp4', wma: 'audio/x-ms-wma',
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
};

/**
 * Reads a file from disk via Rust and creates a blob:// URL.
 * Works reliably with HTML5 <video>/<audio> elements.
 * In Tauri v2, Vec<u8> is transferred as binary IPC (not JSON),
 * so this is efficient for most files.
 */
const getMediaBlobUrl = async (filePath: string): Promise<string> => {
    if (!filePath) return '';
    const cached = blobUrlCache.get(filePath);
    if (cached) return cached;

    const pending = pendingReads.get(filePath);
    if (pending) return pending;

    const promise = (async () => {
        try {
            const ext = filePath.split('.').pop() || '';
            const mime = mimeFromExt(ext);
            const bytes = await invoke<number[]>('read_file_bytes', { path: filePath });
            const uint8 = new Uint8Array(bytes);
            const blob = new Blob([uint8], { type: mime });
            const url = URL.createObjectURL(blob);
            blobUrlCache.set(filePath, url);
            return url;
        } catch (err) {
            console.error(`[MediaAPI] Failed to read file: ${filePath}`, err);
            return '';
        } finally {
            pendingReads.delete(filePath);
        }
    })();

    pendingReads.set(filePath, promise);
    return promise;
};

/**
 * Converts a local file path to a Tauri asset:// URL.
 * Streams the file directly from disk — no memory overhead.
 * Falls back to streaming via IPC if asset protocol fails.
 */
const getAssetUrlSync = (filePath: string): string => {
    if (!filePath) return '';
    return convertFileSrc(filePath, 'asset');
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

    /** Async — reads file from disk, creates a blob URL. Use for images. */
    getLocalImageUrl: getLocalFileBlobUrl,

    /** Sync — returns a Tauri asset:// URL (may not work for media on all platforms). */
    getAssetUrl: getAssetUrlSync,

    /** Async — reads file from disk via IPC, creates blob URL. */
    getMediaUrl: getMediaBlobUrl,

    getFileName,
    getFileExtension,

    /** Pre-warm the blob URL cache for a given path. */
    preloadLocalImage: getLocalFileBlobUrl,

    logTerminal,
};
