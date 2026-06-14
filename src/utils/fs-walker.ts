import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

export async function findMarkdownFiles(dir: string): Promise<string[]> {
    try {
        const files = await readdir(dir, { recursive: true, withFileTypes: true });
        return files
            .filter(dirent => dirent.isFile() && extname(dirent.name).toLowerCase() === '.md')
            // dirent.parentPath in Node >= 20.12.0, fallback to dirent.path for older Node 20
            .map(dirent => join((dirent as any).parentPath || dirent.path, dirent.name));
    } catch (err) {
        // If directory doesn't exist, return empty array
        return [];
    }
}
