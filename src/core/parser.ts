export interface ParsedLink {
    file: string;
    line: number;
    url: string;
}

export function extractLinks(file: string, content: string): ParsedLink[] {
    const lines = content.split('\n');
    const links: ParsedLink[] = [];
    let inCodeBlock = false;

    // Regex for capturing Markdown links [text](url)
    const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Track multiline code blocks
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        if (inCodeBlock) {
            continue;
        }

        // Strip inline code blocks to avoid parsing inside them
        const cleanLine = line.replace(/`[^`]*`/g, '');

        let match;
        while ((match = linkRegex.exec(cleanLine)) !== null) {
            const url = match[1].trim();
            // Skip empty links, same-page anchors, mailto/tel
            if (url && !url.startsWith('mailto:') && !url.startsWith('tel:') && !url.startsWith('#')) {
                links.push({
                    file,
                    line: i + 1,
                    url
                });
            }
        }
    }

    return links;
}
