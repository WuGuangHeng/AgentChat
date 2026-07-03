/**
 * Shared telemetry — log rotation and file append.
 *
 * Previously duplicated verbatim in providerFactory.js and gemini/index.js.
 */

const fs = require('fs');

const MAX_TELEMETRY_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROTATIONS = 3;

/**
 * Append a line to a telemetry file, rotating if it exceeds the size limit.
 * Rotations: file → file.1 → file.2 → file.3 (discarded).
 *
 * @param {string} filePath — path to the telemetry log file
 * @param {string} line — JSON line to append (include trailing \n)
 */
function appendWithRotation(filePath, line) {
    try {
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > MAX_TELEMETRY_BYTES) {
            // Shift rotations: .2→.3, .1→.2, file→.1
            // BUGFIX: was `MAX_ROTATIONS - 1`, which starts the loop one level too
            // shallow — it only ever did .1→.2 and file→.1, so the oldest rotation
            // (.2) was silently clobbered instead of being preserved to .3.
            for (let i = MAX_ROTATIONS; i >= 1; i--) {
                const oldPath = i === 1 ? filePath : `${filePath}.${i - 1}`;
                const newPath = `${filePath}.${i}`;
                try { if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath); } catch (_) {}
            }
        }
    } catch (_) { /* rotation is best-effort */ }
    fs.appendFileSync(filePath, line);
}

module.exports = { appendWithRotation, MAX_TELEMETRY_BYTES, MAX_ROTATIONS };
