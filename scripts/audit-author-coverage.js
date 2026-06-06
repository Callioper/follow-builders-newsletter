#!/usr/bin/env node
/**
 * Author-coverage audit for AI Builders Digest.
 *
 * Cross-checks four sources of truth and exits non-zero if any gap exists:
 *   1. ~/.follow-builders/assets/author-identities.json
 *      — name / handle / label per authorKey
 *   2. ~/.follow-builders/assets/avatar-manifest.json
 *      — fileUrl / localPath per authorKey
 *   3. assets/avatars/ on disk
 *      — every avatar file referenced by the manifest
 *   4. data/issues/ai-builders-digest-*.json
 *      — authorKeys actually rendered in published issues
 *
 * Usage:
 *   node scripts/audit-author-coverage.js
 *   node scripts/audit-author-coverage.js --json          # machine-readable output
 *   node scripts/audit-author-coverage.js --author=KEY   # show one author only
 *
 * Exit codes:
 *   0 = clean (no issues, no orphans, no missing fields)
 *   1 = gaps found — print report to stderr and stdout
 *
 * The 4-way check is mandatory before any re-render of an issue. The cron job
 * dba88eb93ab4 invokes this script via `preflight`; if it exits 1, the daily
 * job should be paused and the gaps patched.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(os.homedir(), '.follow-builders', 'assets');
const IDENT_PATH = path.join(ASSETS_DIR, 'author-identities.json');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'avatar-manifest.json');
const AVATARS_DIR = path.join(REPO_ROOT, 'assets', 'avatars');
const ISSUES_DIR = path.join(REPO_ROOT, 'data', 'issues');

const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const authorArg = args.find(a => a.startsWith('--author='));
const filterAuthor = authorArg ? authorArg.split('=')[1] : null;

function loadEntries(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.entries || {};
  } catch (e) {
    console.error(`FATAL: ${filePath} is malformed JSON: ${e.message}`);
    process.exit(2);
  }
}

function listIssueAuthorKeys() {
  if (!fs.existsSync(ISSUES_DIR)) return new Set();
  const keys = new Set();
  for (const f of fs.readdirSync(ISSUES_DIR).filter(f => f.endsWith('.json'))) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(ISSUES_DIR, f), 'utf8'));
      for (const s of j.sections || []) {
        for (const c of s.cards || []) {
          if (c.authorKey) keys.add(c.authorKey);
        }
      }
    } catch (_) { /* skip malformed */ }
  }
  return keys;
}

function avatarReferencedInManifest(fname, manifest) {
  for (const m of Object.values(manifest)) {
    const lp = (m.localPath || '').split('/').pop();
    const fu = (m.fileUrl || '').split('/').pop();
    if (lp === fname || fu === fname) return true;
  }
  return false;
}

function relativePath(absPath) {
  return path.relative(REPO_ROOT, absPath) || absPath;
}

function main() {
  const ident = loadEntries(IDENT_PATH);
  const manifest = loadEntries(MANIFEST_PATH);
  const avatarsOnDisk = fs.existsSync(AVATARS_DIR)
    ? new Set(fs.readdirSync(AVATARS_DIR))
    : new Set();
  const usedInIssues = listIssueAuthorKeys();

  // Filter to one author if requested
  const shouldInclude = (key) => !filterAuthor || key === filterAuthor;

  const findings = [];
  const allKeys = new Set([
    ...Object.keys(ident),
    ...Object.keys(manifest),
    ...usedInIssues,
  ]);

  for (const key of [...allKeys].filter(shouldInclude).sort()) {
    const idEntry = ident[key] || {};
    const mEntry = manifest[key] || {};
    const inIdent = !!ident[key];
    const inManifest = !!manifest[key];
    const inIssues = usedInIssues.has(key);

    const flags = [];

    if (inIssues && !inIdent) flags.push('MISSING_IDENT');
    if (inIssues && !inManifest) flags.push('MISSING_MANIFEST');
    if (inIdent && !idEntry.name) flags.push('NO_NAME');
    if (inIdent && key.startsWith('x:') && !idEntry.handle) flags.push('NO_HANDLE');
    if (inIdent && !idEntry.label) flags.push('NO_LABEL');
    if (inManifest) {
      const local = mEntry.localPath || '';
      if (!local) {
        flags.push('MANIFEST_NO_LOCALPATH');
      } else if (!path.isAbsolute(local)) {
        flags.push('LOCALPATH_NOT_ABSOLUTE');
      } else if (!fs.existsSync(local)) {
        flags.push(`FILE_MISSING:${path.basename(local)}`);
      }
      const fname = path.basename(local || mEntry.fileUrl || '');
      if (fname && avatarsOnDisk.has(fname) && !fs.existsSync(local)) {
        // already reported as FILE_MISSING above
      }
    }
    if (!inIdent && !inManifest && inIssues) {
      flags.push('ORPHAN_USAGE');
    }

    if (flags.length) {
      findings.push({
        authorKey: key,
        name: idEntry.name || '',
        handle: idEntry.handle || '',
        label: idEntry.label || '',
        localPath: mEntry.localPath || '',
        inIdent, inManifest, inIssues,
        flags,
      });
    }
  }

  // Orphan avatar files (file on disk, not referenced by any manifest entry)
  const orphanFiles = [...avatarsOnDisk]
    .filter(f => !avatarReferencedInManifest(f, manifest))
    .filter(f => !filterAuthor || f.includes(filterAuthor.replace(/[:/@]/g, '')))
    .sort();

  // Summary
  const counts = {
    identEntries: Object.keys(ident).length,
    manifestEntries: Object.keys(manifest).length,
    avatarsOnDisk: avatarsOnDisk.size,
    issueAuthorKeys: usedInIssues.size,
    issuesFound: findings.length,
    orphanFiles: orphanFiles.length,
  };

  if (JSON_MODE) {
    console.log(JSON.stringify({ counts, findings, orphanFiles }, null, 2));
  } else {
    console.log('=== Author Coverage Audit ===');
    console.log(`Ident entries:      ${counts.identEntries}`);
    console.log(`Manifest entries:   ${counts.manifestEntries}`);
    console.log(`Avatars on disk:    ${counts.avatarsOnDisk}`);
    console.log(`Issue authorKeys:   ${counts.issueAuthorKeys}`);
    console.log(`Issues found:       ${counts.issuesFound}`);
    console.log(`Orphan avatar files: ${counts.orphanFiles}`);
    console.log();

    if (findings.length) {
      console.log('=== Issues (per authorKey) ===');
      for (const f of findings) {
        console.log(`  ${f.authorKey}`);
        console.log(`    name:      ${f.name || '(missing)'}`);
        console.log(`    handle:    ${f.handle || '(missing)'}`);
        console.log(`    label:     ${f.label || '(missing)'}`);
        console.log(`    localPath: ${f.localPath || '(missing)'}`);
        console.log(`    flags:     ${f.flags.join(', ')}`);
      }
      console.log();
    }

    if (orphanFiles.length) {
      console.log('=== Orphan avatar files (no manifest entry) ===');
      for (const f of orphanFiles) {
        console.log(`  ${relativePath(path.join(AVATARS_DIR, f))}`);
      }
      console.log();
    }

    if (!findings.length && !orphanFiles.length) {
      console.log('OK — all authorKeys have ident + manifest + file, and all avatars are registered.');
    }
  }

  process.exit(findings.length || orphanFiles.length ? 1 : 0);
}

main();
