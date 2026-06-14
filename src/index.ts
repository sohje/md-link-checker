import * as core from '@actions/core';
import { readFile } from 'node:fs/promises';
import { findMarkdownFiles } from './utils/fs-walker';
import { extractLinks, ParsedLink } from './core/parser';
import { validateLinks, ValidationResult } from './core/validator';

async function run() {
    try {
        const path = core.getInput('path') || '.';
        const excludeInput = core.getInput('exclude-urls') || '';
        const concurrency = parseInt(core.getInput('parallel') || '5', 10);

        const excludePatterns = excludeInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => new RegExp(s));

        core.info(`Looking for Markdown files in directory: ${path}`);
        const files = await findMarkdownFiles(path);

        if (files.length === 0) {
            core.info('No Markdown files found. Exiting.');
            return;
        }

        core.info(`Found ${files.length} Markdown files. Starting parsing...`);

        const allLinks: ParsedLink[] = [];
        for (const file of files) {
            const content = await readFile(file, 'utf-8');
            const links = extractLinks(file, content);
            allLinks.push(...links);
        }
        if (allLinks.length === 0) {
            core.info('No links in Markdown files found. All good.');
            return;
        }

        core.info(`Starting validation of ${allLinks.length} links (concurrency: ${concurrency})...`);
        const results = await validateLinks(allLinks, concurrency, excludePatterns);

        const broken = results.filter(r => !r.ok);

        if (broken.length > 0) {
            core.setFailed(`Found ${broken.length} broken links!`);
            for (const b of broken) {
                const reason = b.status ? `HTTP ${b.status}` : (b.error || 'Unknown Error');
                core.error(`Broken link: ${b.url} (${reason})`, {
                    file: b.file,
                    startLine: b.line
                });
            }
        } else {
            core.info(`All ${allLinks.length} links are valid! Great job.`);
        }
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Error: ${error.message}`);
        } else {
            core.setFailed('Unknown error occurred');
        }
    }
}

run();