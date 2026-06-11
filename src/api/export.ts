import { invoke } from '@tauri-apps/api/core';

export async function saveFileWithDialog(filename: string, blob: Blob): Promise<void> {
    const isTauri = '__TAURI__' in window;
    if (!isTauri) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    const buffer = await blob.arrayBuffer();
    const data = new Uint8Array(buffer);
    await invoke('save_file', { filename, data });
}
