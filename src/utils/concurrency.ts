export function limitConcurrency<T>(concurrency: number) {
    let active = 0;
    const queue: (() => void)[] = [];

    const next = () => {
        active--;
        if (queue.length > 0) {
            const resolve = queue.shift()!;
            active++;
            resolve();
        }
    };

    return async (fn: () => Promise<T>): Promise<T> => {
        if (active >= concurrency) {
            await new Promise<void>(resolve => queue.push(resolve));
        } else {
            active++;
        }
        try {
            return await fn();
        } finally {
            next();
        }
    };
}
