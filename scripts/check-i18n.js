#!/usr/bin/env node
/**
 * Verifies translation keys:
 *  - every t('key') / i18n.t('key') used in source exists in English
 *  - English and Hindi files contain exactly the same keys
 *
 * Usage: node scripts/check-i18n.js [file-or-dir ...]
 * With no arguments, scans the whole app.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const localesDir = path.join(root, 'locales');
const fragmentsDir = path.join(localesDir, 'fragments');
const SOURCE_DIRS = ['app', 'components', 'contexts', 'hooks', 'utils', 'services', 'constants', 'i18n'];

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = deepMerge(target[key] || {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function loadLocale(lang) {
  const merged = JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf8'));
  if (fs.existsSync(fragmentsDir)) {
    for (const file of fs.readdirSync(fragmentsDir).sort()) {
      if (file.endsWith(`.${lang}.json`)) {
        deepMerge(merged, JSON.parse(fs.readFileSync(path.join(fragmentsDir, file), 'utf8')));
      }
    }
  }
  return merged;
}

function flatten(obj, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, full, out);
    else out.add(full);
  }
  return out;
}

function listSourceFiles(target) {
  const abs = path.resolve(root, target);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [abs];
  const files = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const child = path.join(abs, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(child));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(child);
  }
  return files;
}

const enKeys = flatten(loadLocale('en'));
const hiKeys = flatten(loadLocale('hi'));
const targets = process.argv.slice(2);
const files = (targets.length ? targets : SOURCE_DIRS).flatMap(listSourceFiles);

const KEY_PATTERN = /\bt\(\s*['"`]([A-Za-z0-9_.-]+)['"`]/g;
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];
let problems = 0;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(KEY_PATTERN)) {
    const key = match[1];
    const exists = enKeys.has(key) || PLURAL_SUFFIXES.some((s) => enKeys.has(key + s));
    if (!exists) {
      problems += 1;
      console.log(`missing key  ${path.relative(root, file)}: ${key}`);
    }
  }
}

for (const key of enKeys) {
  if (!hiKeys.has(key)) {
    problems += 1;
    console.log(`missing in hi: ${key}`);
  }
}
for (const key of hiKeys) {
  if (!enKeys.has(key)) {
    problems += 1;
    console.log(`missing in en: ${key}`);
  }
}

console.log(problems === 0 ? `i18n OK (${enKeys.size} keys, ${files.length} files)` : `${problems} i18n problem(s)`);
process.exit(problems === 0 ? 0 : 1);
