import { invoke } from '@tauri-apps/api/tauri';


export interface LocalMediaFile {
    name: string;
    path: string;
    extension: string;
    size_bytes: number;
}

// Cache data URLs so we don't re-read files on every render
const dataUrlCache = new Map<string, string>();

/**
 * Reads a local image file via Rust and returns a base64 Data URL
 * that the browser can securely use in <img src> or CSS backgrounds.
 */
const getLocalFileBlobUrl = async (filePath: string): Promise<string> => {
    if (!filePath) return '';
    if (dataUrlCache.has(filePath)) return dataUrlCache.get(filePath)!;

    try {
        const base64Url = await invoke<string>('read_image_base64', { filePath });
        if (base64Url) {
            dataUrlCache.set(filePath, base64Url);
            console.log(`[MediaAPI] Data URL fetched via Rust for: ${filePath}`);
            return base64Url;
        }
        return '';
    } catch (err) {
        console.error(`[MediaAPI] Error reading file via Rust: ${filePath}`, err);
        return '';
    }
};

/**
 * Synchronous wrapper — returns a cached Data URL or empty string.
 */
const getAssetUrlSync = (filePath: string): string => {
    if (!filePath) return '';
    return dataUrlCache.get(filePath) ?? '';
};

export const mediaApi = {
    openMediaFileDialog: (mediaType: 'audio' | 'video' | 'image'): Promise<string[]> =>
        invoke('open_media_file_dialog', { mediaType }),

    openFolderDialog: (): Promise<string> =>
        invoke('open_folder_dialog'),

    scanFolderForMedia: (folderPath: string, mediaType: 'audio' | 'video' | 'image'): Promise<LocalMediaFile[]> =>
        invoke('scan_folder_for_media', { folderPath, mediaType }),

    /** Async — reads file from disk, creates a blob URL. Use for first load. */
    getLocalImageUrl: getLocalFileBlobUrl,

    /** Sync — returns cached blob URL, or '' if not preloaded yet. */
    getAssetUrl: getAssetUrlSync,

    /** Pre-warm the blob URL cache for a given path. */
    preloadLocalImage: getLocalFileBlobUrl,
};
