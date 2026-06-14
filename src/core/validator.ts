import { access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { limitConcurrency } from '../utils/concurrency';
import { ParsedLink } from './parser';

export interface ValidationResult extends ParsedLink {
    ok: boolean;
    error?: string;
    status?: number;
}

export async function validateLinks(links: ParsedLink[], concurrency: number, excludePatterns: RegExp[]): Promise<ValidationResult[]> {
    const limiter = limitConcurrency<ValidationResult>(concurrency);
    const cache = new Map<string, Promise<number | boolean>>();

    const tasks = links.map(link => limiter(async (): Promise<ValidationResult> => {
        // Check for exclusions
        if (excludePatterns.some(p => p.test(link.url))) {
            return { ...link, ok: true };
        }

        try {
            const isHttp = link.url.startsWith('http://') || link.url.startsWith('https://');

            if (isHttp) {
                const urlWithoutHash = link.url.split('#')[0];

                if (!cache.has(urlWithoutHash)) {
                    cache.set(urlWithoutHash, checkHttp(urlWithoutHash));
                }
                const status = await cache.get(urlWithoutHash)! as number;

                return {
                    ...link,
                    ok: status >= 200 && status < 400,
                    status,
                    error: status === 0 ? 'Network/Timeout Error' : undefined
                };
            } else {
                // Local file
                const cleanUrl = link.url.split('#')[0].split('?')[0];
                if (!cleanUrl) {
                    return { ...link, ok: true }; // Skip relative anchor like href="#header" 
                }

                const absolutePath = resolve(dirname(link.file), cleanUrl);
                if (!cache.has(absolutePath)) {
                    cache.set(absolutePath, checkFile(absolutePath));
                }
                const exists = await cache.get(absolutePath)! as boolean;
                return { ...link, ok: exists, error: exists ? undefined : 'File not found' };
            }
        } catch (err) {
            return { ...link, ok: false, error: err instanceof Error ? err.message : String(err) };
        }
    }));

    return Promise.all(tasks);
}

async function checkHttp(url: string): Promise<number> {
    try {
        let res = await fetch(url, {
            method: 'HEAD',
            headers: { 'User-Agent': 'md-link-checker/1.0' },
            signal: AbortSignal.timeout(10000)
        });

        // 405 Method Not Allowed / 403 Forbidden often happen with HEAD requests
        if (res.status === 405 || res.status === 403) {
            res = await fetch(url, {
                method: 'GET',
                headers: { 'User-Agent': 'md-link-checker/1.0' },
                signal: AbortSignal.timeout(10000)
            });
        }
        return res.status;
    } catch (err) {
        return 0;
    }
}

async function checkFile(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}
