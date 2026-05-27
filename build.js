// Build script: generates the final release userscript for GitHub Releases
// Usage: node build.js
// Output: dist/boss-plus-public.user.js (prompt embedded, version auto-bumped)

var fs = require('fs');
var path = require('path');

var dir = __dirname;
var distDir = path.join(dir, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// 1. Read source files
var script = fs.readFileSync(path.join(dir, 'boss-plus-public.user.js'), 'utf8');
var prompt = fs.readFileSync(path.join(dir, 'system-prompt.txt'), 'utf8');

// 2. Escape prompt for JS single-quoted string
var escapedPrompt = prompt
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '');

// 3. Embed system prompt into the fallback section (so no external @resource needed)
var marker = "SYSTEM_PROMPT_CACHE = '";
var pos = script.indexOf(marker, script.indexOf('硬编码兜底 prompt'));
if (pos === -1) { console.log('ERROR: Cannot find fallback start'); process.exit(1); }

var strStart = pos + marker.length;
var endMarker = "';\n    return SYSTEM_PROMPT_CACHE;";
var endMarker2 = "';\r\n    return SYSTEM_PROMPT_CACHE;";
var endPos = script.indexOf(endMarker, strStart);
if (endPos === -1) endPos = script.indexOf(endMarker2, strStart);
if (endPos === -1) { console.log('ERROR: Cannot find fallback end'); process.exit(1); }

script = script.substring(0, strStart) + escapedPrompt + script.substring(endPos);

// 4. Bump version (patch)
script = script.replace(/\/\/ @version\s+(\d+)\.(\d+)\.(\d+)/, function (m, major, minor, patch) {
  return '// @version      ' + major + '.' + minor + '.' + (parseInt(patch) + 1);
});

// 5. Remove @resource (prompt is now embedded, no external dependency)
script = script.replace(/^\/\/ @resource\s+systemPrompt.*\n/m, '');

// 6. Write output to dist/
var outPath = path.join(distDir, 'boss-plus-public.user.js');
fs.writeFileSync(outPath, script, 'utf8');

// Extract new version for logging
var vMatch = script.match(/@version\s+([\d.]+)/);
var newVer = vMatch ? vMatch[1] : 'unknown';
console.log('Build complete: dist/boss-plus-public.user.js v' + newVer + ' (prompt embedded)');
