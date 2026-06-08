#!/usr/bin/env node
/**
 * Backfill authorName / authorHandle / authorTag on every issue JSON card
 * that has an authorKey registered in author-identities.json.
 *
 * Rule: only fill EMPTY fields. Never overwrite a non-null, non-empty value
 * already on the card (some cards may carry a custom name/handle that differs
 * from ident — e.g. a "by ..." credit. We respect that.)
 *
 * What gets filled:
 *   - c.authorName  ← ident.entries[key].name
 *   - c.authorHandle ← ident.entries[key].handle  (only for x:* keys; blog/podcast skip)
 *   - c.authorTag   ← ident.entries[key].label
 *
 * For x:* keys whose ident.handle starts with '@', the backfill keeps the '@'
 * prefix as-is (matches what the renderer expects in the data-author-handle
 * attribute).
 *
 * Usage:
 *   node scripts/backfill-card-author-fields.js           # apply to all issues
 *   node scripts/backfill-card-author-fields.js --dry-run # report only
 *   node scripts/backfill-card-author-fields.js --issue=2026-06-08  # one issue
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(os.homedir(), '.follow-builders', 'assets');
const IDENT_PATH = path.join(ASSETS_DIR, 'author-identities.json');
const ISSUES_DIR = path.join(REPO_ROOT, 'data', 'issues');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const issueArg = args.find(a => a.startsWith('--issue='));
const filterIssue = issueArg ? issueArg.split('=')[1] : null;

function loadIdent() {
  const data = JSON.parse(fs.readFileSync(IDENT_PATH, 'utf8'));
  return data.entries || {};
}

function isEmpty(v) {
  return v === null || v === undefined || v === '';
}

function backfillIssue(filePath, ident) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const j = JSON.parse(raw);
  let touched = 0;
  const details = [];

  for (const s of j.sections || []) {
    for (const c of s.cards || []) {
      const key = c.authorKey;
      if (!key) continue;
      const id = ident[key];
      if (!id) continue; // unregistered key — not our job to backfill

      const before = { name: c.authorName, handle: c.authorHandle, tag: c.authorTag };
      const after = { ...before };

      if (isEmpty(c.authorName) && id.name) after.name = id.name;
      if (key.startsWith('x:') && isEmpty(c.authorHandle) && id.handle) after.handle = id.handle;
      if (isEmpty(c.authorTag) && id.label) after.tag = id.label;

      const changed =
        after.name !== before.name ||
        after.handle !== before.handle ||
        after.tag !== before.tag;
      if (changed) {
        c.authorName = after.name;
        c.authorHandle = after.handle;
        c.authorTag = after.tag;
        touched++;
        details.push({ key, before, after });
      }
    }
  }

  if (touched && !DRY_RUN) {
    fs.writeFileSync(filePath, JSON.stringify(j, null, 2) + '\n', 'utf8');
  }

  return { touched, details };
}

function main() {
  const ident = loadIdent();
  const files = fs.readdirSync(ISSUES_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !filterIssue || f.includes(filterIssue))
    .sort();

  let totalTouched = 0;
  const report = [];

  for (const f of files) {
    const fp = path.join(ISSUES_DIR, f);
    const { touched, details } = backfillIssue(fp, ident);
    if (touched) {
      totalTouched += touched;
      report.push({ issue: f.replace(/^ai-builders-digest-/, '').replace(/\.json$/, ''), touched, details });
    }
  }

  console.log(`=== Backfill ${DRY_RUN ? '(DRY-RUN) ' : ''} ===`);
  console.log(`Issues scanned:        ${files.length}`);
  console.log(`Issues modified:       ${report.length}`);
  console.log(`Cards touched:         ${totalTouched}`);
  console.log();
  for (const r of report) {
    console.log(`  ${r.issue}: ${r.touched} card(s)`);
    for (const d of r.details) {
      const f = [];
      if (d.after.name !== d.before.name) f.push(`name: ${JSON.stringify(d.before.name)} → ${JSON.stringify(d.after.name)}`);
      if (d.after.handle !== d.before.handle) f.push(`handle: ${JSON.stringify(d.before.handle)} → ${JSON.stringify(d.after.handle)}`);
      if (d.after.tag !== d.before.tag) f.push(`tag: ${JSON.stringify(d.before.tag)} → ${JSON.stringify(d.after.tag)}`);
      console.log(`    ${d.key.padEnd(28)} ${f.join('; ')}`);
    }
  }
  if (DRY_RUN) {
    console.log('\n(Dry-run — no files written)');
  }
}

main();
