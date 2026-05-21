#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_INDEX_PATH = path.join(__dirname, '..', 'index.html');
const ISSUE_BASE_DATE = '2026-05-01T00:00:00+08:00';

function formatIssueNumber(publishDateString) {
  const baseDate = new Date(ISSUE_BASE_DATE);
  const publishDate = new Date(`${publishDateString}T00:00:00+08:00`);

  if (Number.isNaN(baseDate.getTime()) || Number.isNaN(publishDate.getTime())) {
    return null;
  }

  const diffDays = Math.round((publishDate - baseDate) / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseExistingArchive(indexHtml) {
  const entries = new Map();
  const itemRegex = /<a class="archive-link" href="([^"]+)">[\s\S]*?<div class="archive-date">([^<]+)<\/div>[\s\S]*?<h3 class="archive-entry-title">([^<]+)<\/h3>[\s\S]*?<p class="archive-entry-desc">([^<]+)<\/p>[\s\S]*?<span class="archive-issue">([^<]+)<\/span>/g;

  let match;
  while ((match = itemRegex.exec(indexHtml))) {
    const [, href, date, title, desc, issue] = match;
    entries.set(href, {
      href,
      date,
      title,
      desc,
      issue,
    });
  }

  return entries;
}

function deriveArchiveTitle(data, publishDate) {
  if (data.archive?.title) return data.archive.title;
  const firstSectionTitle = data.sections?.[0]?.title || '';
  const zhTitle = firstSectionTitle.split(' / ')[0]?.trim();
  return zhTitle ? `${zhTitle}日报` : `${publishDate} 日报`;
}

function deriveArchiveDesc(data) {
  if (data.archive?.desc) return data.archive.desc;
  return String(data.intro?.text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function loadJsonEntries(repoRoot) {
  const fileNames = fs.readdirSync(repoRoot);
  const entries = [];

  for (const fileName of fileNames) {
    const match = fileName.match(/^ai-builders-digest-(\d{4}-\d{2}-\d{2})\.json$/);
    if (!match) continue;

    const publishDate = match[1];
    const filePath = path.join(repoRoot, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const href = `./ai-builders-digest-${publishDate}-rerun.html`;

    entries.push({
      href,
      date: publishDate,
      title: deriveArchiveTitle(data, publishDate),
      desc: deriveArchiveDesc(data),
      issue: `Issue ${formatIssueNumber(publishDate) ?? ''}`.trim(),
    });
  }

  return entries;
}

function renderArchiveItem(entry) {
  return `          <li class="archive-item">
            <a class="archive-link" href="${escapeHtml(entry.href)}">
              <div class="archive-date">${escapeHtml(entry.date)}</div>
              <div>
                <h3 class="archive-entry-title">${escapeHtml(entry.title)}</h3>
                <p class="archive-entry-desc">${escapeHtml(entry.desc)}</p>
              </div>
              <div class="archive-meta">
                <span class="archive-issue">${escapeHtml(entry.issue)}</span>
                <span class="archive-arrow">打开本期 →</span>
              </div>
            </a>
          </li>`;
}

function replaceArchiveList(indexHtml, renderedItems) {
  return indexHtml.replace(
    /(<ul class="archive-list">\n)[\s\S]*?(\n\s*<\/ul>)/,
    `$1${renderedItems.join('\n')}$2`
  );
}

function main() {
  const indexPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_INDEX_PATH;
  const repoRoot = path.dirname(indexPath);
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const existingArchive = parseExistingArchive(indexHtml);
  const jsonEntries = loadJsonEntries(repoRoot);

  for (const entry of jsonEntries) {
    existingArchive.set(entry.href, entry);
  }

  const finalEntries = Array.from(existingArchive.values()).sort((a, b) => b.date.localeCompare(a.date));
  const renderedItems = finalEntries.map(renderArchiveItem);
  const nextHtml = replaceArchiveList(indexHtml, renderedItems);

  fs.writeFileSync(indexPath, nextHtml, 'utf8');
  console.log(`Updated archive list in ${indexPath}`);
}

main();
