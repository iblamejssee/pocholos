
export class EscPosEncoder {
    private buffer: number[] = [];

    constructor() {
        this.initialize();
    }

    initialize() {
        this.buffer.push(0x1B, 0x40); // ESC @
        return this;
    }

    codepage(codepage: string = 'cp437') {
        // Simple default for now, often not strictly needed if we stick to ASCII + basic accents
        // but for Epson, often ESC t 0 (PC437) is default
        this.buffer.push(0x1B, 0x74, 0x00);
        return this;
    }

    align(align: 'left' | 'center' | 'right') {
        let n = 0;
        if (align === 'center') n = 1;
        if (align === 'right') n = 2;
        this.buffer.push(0x1B, 0x61, n);
        return this;
    }

    text(content: string) {
        // Simple sanitization for standard ASCII/Latin
        // We could use iconv-lite if we installed it, but for now we'll do basic mapping if needed
        // or just let Buffer handle utf-8 to byte conversion which mostly works for modern printers
        // providing they are set to appropriate code page. 
        // For basic POS, often stripping accents is safer if codepage isn't perfect.
        // But let's try sending bytes directly.

        // Remove accents manually for safety if we don't use iconv
        const normalized = content.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        for (let i = 0; i < normalized.length; i++) {
            this.buffer.push(normalized.charCodeAt(i));
        }
        return this;
    }

    newline() {
        this.buffer.push(0x0A);
        return this;
    }

    size(width: number, height: number) {
        // GS ! n
        // n = (height-1)*16 + (width-1)
        // 0 = normal
        // 16 = double height, 1 = double width
        // 17 = double both
        const n = ((height - 1) * 16) + (width - 1);
        this.buffer.push(0x1D, 0x21, n);
        return this;
    }

    bold(on: boolean) {
        this.buffer.push(0x1B, 0x45, on ? 1 : 0);
        return this;
    }

    cut() {
        this.buffer.push(0x1D, 0x56, 0x41, 0x00); // GS V A 0 (Full cut)
        // Add a few lines before cut
        return this;
    }

    feed(n: number = 1) {
        for (let i = 0; i < n; i++) {
            this.newline();
        }
        return this;
    }

    line(char: string = '-') {
        this.text(char.repeat(48)); // 48 chars is typical for 80mm
        this.newline();
        return this;
    }

    encode(): Buffer {
        return Buffer.from(this.buffer);
    }
}
