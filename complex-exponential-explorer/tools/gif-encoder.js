/* ============================================================================
   GIF89a encoder — enough of the format to write a clean animation, and
   nothing more.

   It is here rather than pulled from a CDN for the same reason KaTeX is
   vendored: the page has to work when the file is opened straight from disk.
   It is also worth the few hundred lines, because this particular animation
   is exactly what GIF is good at and what a generic encoder handles badly:

     - the drawing uses a handful of flat colours, so the palette can hold the
       real ones instead of an approximation of them;
     - the axes, the grid and the reference curve are identical in every
       frame, so every frame after the first is stored as its difference with
       the one before — a transparent index over an undisposed frame — clipped
       to the rectangle that actually changed.

   Three parts: the palette, the LZW coder the format requires, and the
   assembler that writes the blocks.
   ========================================================================== */

(function (global) {
'use strict';

/* ---------- A growable byte sink ---------- */

function Bytes() { this.b = new Uint8Array(1 << 16); this.n = 0; }
Bytes.prototype.need = function (k) {
    if (this.n + k <= this.b.length) return;
    let size = this.b.length;
    while (size < this.n + k) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.b.subarray(0, this.n));
    this.b = next;
};
Bytes.prototype.u8  = function (v) { this.need(1); this.b[this.n++] = v & 0xff; };
Bytes.prototype.u16 = function (v) { this.u8(v); this.u8(v >> 8); };          // little endian
Bytes.prototype.str = function (s) { for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i)); };
Bytes.prototype.raw = function (a) { this.need(a.length); this.b.set(a, this.n); this.n += a.length; };
Bytes.prototype.done = function () { return this.b.subarray(0, this.n); };

/* ============================================================================
   1. PALETTE

   The colours actually on the canvas are counted, the ones the drawing code
   asked for are put in by hand so they come out exact, and the rest of the
   256 slots are filled by median cut — repeatedly splitting the most populated
   box of colour space in half at its median along its longest axis.

   One slot is kept back: index 255 is never a colour, it is the transparent
   index the frame differences are written with.
   ========================================================================== */

const TRANSPARENT = 255;
const MAX_COLOURS = 255;          // 0 … 254

function Histogram() { this.map = new Map(); }

/** Count the colours of one frame, every `stride`-th pixel. */
Histogram.prototype.add = function (rgba, stride) {
    const m = this.map, step = 4 * (stride || 1);
    for (let i = 0; i < rgba.length; i += step) {
        const key = (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
        m.set(key, (m.get(key) || 0) + 1);
    }
};

/**
 * `seeds` are colours that must survive exactly — the background, the axes,
 * the trail, the vectors. They are worth protecting: they are most of the
 * picture, and a background that drifts by one level shows up as banding.
 */
Histogram.prototype.palette = function (seeds) {
    const entries = [];
    this.map.forEach((count, key) => {
        entries.push({ r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff, n: count });
    });

    const out = [];
    const taken = new Set();
    (seeds || []).forEach(c => {
        const key = (c[0] << 16) | (c[1] << 8) | c[2];
        if (out.length < MAX_COLOURS && !taken.has(key)) { taken.add(key); out.push(c); }
    });

    if (entries.length + out.length > MAX_COLOURS) {
        medianCut(entries, MAX_COLOURS - out.length).forEach(c => {
            const key = (c[0] << 16) | (c[1] << 8) | c[2];
            if (!taken.has(key)) { taken.add(key); out.push(c); }
        });
    } else {
        entries.forEach(e => {
            const key = (e.r << 16) | (e.g << 8) | e.b;
            if (!taken.has(key) && out.length < MAX_COLOURS) { taken.add(key); out.push([e.r, e.g, e.b]); }
        });
    }

    const table = new Uint8Array(256 * 3);
    for (let i = 0; i < out.length; i++) {
        table[i * 3] = out[i][0]; table[i * 3 + 1] = out[i][1]; table[i * 3 + 2] = out[i][2];
    }
    return { table: table, size: out.length };
}

function medianCut(entries, target) {
    if (!entries.length) return [];
    let boxes = [makeBox(entries)];
    while (boxes.length < target) {
        /* Split whichever box covers the most colour space, weighted by how
           many pixels live in it: a wide box nobody uses is not worth a slot. */
        let pick = -1, best = 0;
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            if (box.items.length < 2) continue;
            const score = box.spread * Math.cbrt(box.n);
            if (score > best) { best = score; pick = i; }
        }
        if (pick < 0) break;
        const box = boxes[pick];
        const ch = box.axis;
        box.items.sort((a, b) => a[ch] - b[ch]);
        /* Cut at the median pixel, not the median colour: that is what keeps
           a rare colour from claiming as much of the table as a common one.

           The background alone is more than half the picture, so the median
           pixel regularly lands on the very last colour and the cut has to be
           pulled back by one to leave anything on the other side. Without that
           the box comes out empty on one side, and a whole subtree of colours
           is thrown away with it. */
        let half = box.n / 2, acc = 0, cut = 0;
        for (; cut < box.items.length - 1; cut++) {
            acc += box.items[cut].n;
            if (acc >= half) break;
        }
        cut = Math.min(cut, box.items.length - 2);
        const left = box.items.slice(0, cut + 1), right = box.items.slice(cut + 1);
        boxes.splice(pick, 1, makeBox(left), makeBox(right));
    }
    return boxes.map(box => {
        let r = 0, g = 0, b = 0, n = 0;
        box.items.forEach(e => { r += e.r * e.n; g += e.g * e.n; b += e.b * e.n; n += e.n; });
        return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
    });
}

function makeBox(items) {
    let rlo = 255, rhi = 0, glo = 255, ghi = 0, blo = 255, bhi = 0, n = 0;
    for (let i = 0; i < items.length; i++) {
        const e = items[i];
        if (e.r < rlo) rlo = e.r; if (e.r > rhi) rhi = e.r;
        if (e.g < glo) glo = e.g; if (e.g > ghi) ghi = e.g;
        if (e.b < blo) blo = e.b; if (e.b > bhi) bhi = e.b;
        n += e.n;
    }
    /* Green is weighted up and blue down: the eye reads a green error as a
       bigger mistake than a blue one of the same size. */
    const dr = (rhi - rlo) * 0.9, dg = (ghi - glo) * 1.2, db = (bhi - blo) * 0.7;
    const axis = dg >= dr && dg >= db ? 'g' : (dr >= db ? 'r' : 'b');
    return { items: items, n: n, axis: axis, spread: Math.max(dr, dg, db) };
}

/** Nearest palette entry, with a cache: a frame holds few distinct colours. */
function Mapper(table, size) {
    this.table = table; this.size = size; this.cache = new Map();
}
Mapper.prototype.index = function (r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const t = this.table;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < this.size; i++) {
        const dr = r - t[i * 3], dg = g - t[i * 3 + 1], db = b - t[i * 3 + 2];
        const d = 0.9 * dr * dr + 1.2 * dg * dg + 0.7 * db * db;
        if (d < bestD) { bestD = d; best = i; if (!d) break; }
    }
    this.cache.set(key, best);
    return best;
};

/* ============================================================================
   2. LZW, as the GIF specification defines it

   Codes are written low bit first and cut into sub-blocks of at most 255
   bytes. The width grows by one bit as soon as the next code to hand out no
   longer fits, and the table is cleared when it is full — a decoder mirrors
   both, so the moment they happen is not a free choice.
   ========================================================================== */

function lzw(out, minCodeSize, pixels) {
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let next = endCode + 1;
    let dict = new Map();

    /* Sub-block plumbing: bits accumulate into `bitBuf`, whole bytes fall into
       `block`, and a full block is flushed with its length in front. */
    const block = new Uint8Array(255);
    let blockLen = 0, bitBuf = 0, bitLen = 0;

    function flushBlock() {
        if (!blockLen) return;
        out.u8(blockLen);
        out.raw(block.subarray(0, blockLen));
        blockLen = 0;
    }
    function emit(code) {
        bitBuf |= code << bitLen;
        bitLen += codeSize;
        while (bitLen >= 8) {
            block[blockLen++] = bitBuf & 0xff;
            bitBuf >>>= 8;
            bitLen -= 8;
            if (blockLen === 255) flushBlock();
        }
    }

    emit(clearCode);
    let cur = pixels[0];
    for (let i = 1; i < pixels.length; i++) {
        const k = pixels[i];
        const key = (cur << 8) | k;
        const found = dict.get(key);
        if (found !== undefined) { cur = found; continue; }
        emit(cur);
        if (next < 4096) {
            dict.set(key, next);
            next++;
            if (next > (1 << codeSize) && codeSize < 12) codeSize++;
        } else {
            emit(clearCode);
            dict = new Map();
            next = endCode + 1;
            codeSize = minCodeSize + 1;
        }
        cur = k;
    }
    emit(cur);
    emit(endCode);

    if (bitLen > 0) {
        block[blockLen++] = bitBuf & 0xff;
        if (blockLen === 255) flushBlock();
    }
    flushBlock();
    out.u8(0);                      // the block terminator
}

/* ============================================================================
   3. The file

   new GifWriter({ width, height, palette })
       .frame(indices, delayCentiseconds)      … as many times as needed
       .finish()  →  Blob
   ========================================================================== */

function GifWriter(opts) {
    this.w = opts.width;
    this.h = opts.height;
    this.out = new Bytes();
    this.prev = null;

    const out = this.out;
    out.str('GIF89a');
    out.u16(this.w);
    out.u16(this.h);
    out.u8(0xf7);                   // global table, 256 entries
    out.u8(0);                      // background index
    out.u8(0);                      // pixel aspect ratio: unspecified
    out.raw(opts.palette);

    /* The only way to say "loop forever" is this application extension, which
       Netscape 2.0 introduced and every reader has implemented since. */
    out.u8(0x21); out.u8(0xff); out.u8(0x0b);
    out.str('NETSCAPE2.0');
    out.u8(0x03); out.u8(0x01); out.u16(0);
    out.u8(0);
}

/**
 * One frame, as indices into the palette, full size. What is written is the
 * rectangle in which it differs from the frame before — everything else is
 * left standing by disposal method 1.
 */
GifWriter.prototype.frame = function (indices, delay) {
    const w = this.w, h = this.h;
    let x0 = 0, y0 = 0, x1 = w - 1, y1 = h - 1;
    let diffed = false;

    if (this.prev) {
        x0 = w; y0 = h; x1 = -1; y1 = -1;
        const prev = this.prev;
        for (let y = 0; y < h; y++) {
            const row = y * w;
            for (let x = 0; x < w; x++) {
                if (indices[row + x] === prev[row + x]) continue;
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
        if (x1 < x0) {              // nothing moved: a one-pixel no-op frame
            x0 = y0 = x1 = y1 = 0;
        }
        diffed = true;
    }

    const fw = x1 - x0 + 1, fh = y1 - y0 + 1;
    const sub = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) {
        const src = (y0 + y) * w + x0, dst = y * fw;
        for (let x = 0; x < fw; x++) {
            const v = indices[src + x];
            sub[dst + x] = (diffed && v === this.prev[src + x]) ? TRANSPARENT : v;
        }
    }

    const out = this.out;
    out.u8(0x21); out.u8(0xf9); out.u8(0x04);
    out.u8((1 << 2) | 1);           // leave the frame in place; index 255 is see-through
    out.u16(Math.max(1, Math.round(delay)));
    out.u8(TRANSPARENT);
    out.u8(0);

    out.u8(0x2c);
    out.u16(x0); out.u16(y0); out.u16(fw); out.u16(fh);
    out.u8(0);                      // no local table, not interlaced

    out.u8(8);                      // minimum code size
    lzw(out, 8, sub);

    this.prev = indices;
    return this;
};

GifWriter.prototype.finish = function () {
    this.out.u8(0x3b);              // trailer
    return new Blob([this.out.done()], { type: 'image/gif' });
};

global.GIF = { Histogram: Histogram, Mapper: Mapper, Writer: GifWriter, TRANSPARENT: TRANSPARENT };

})(window);
