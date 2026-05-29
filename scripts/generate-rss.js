#!/usr/bin/env node
// generates rss.xml from existing JSON issue files
// Run after update-index-archive.js

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_ISSUES_DIR = path.join(REPO_ROOT, 'data', 'issues');
const RSS_PATH = path.join(REPO_ROOT, 'rss.xml');

const SITE_URL = 'https://callioper.github.io/follow-builders-newsletter';
const SITE_TITLE = 'AI Builders Digest';
const SITE_DESC = 'AI Builders 双语在线杂志 — 追踪 X 和播客中的 AI 建造者，精选摘要，双语对照';
const AUTHOR = 'Hermes Agent';

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pubDate(dateStr) {
  // YYYY-MM-DD -> RFC 2822
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 8, 0, 0));
  return date.toUTCString();
}

function main() {
  const files = fs.readdirSync(DATA_ISSUES_DIR)
    .filter(f => /^ai-builders-digest-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .reverse();

  const items = files.map(fname => {
    const date = fname.replace('ai-builders-digest-', '').replace('.json', '');
    const d = JSON.parse(fs.readFileSync(path.join(DATA_ISSUES_DIR, fname), 'utf-8'));
    const htmlFile = `issues/ai-builders-digest-${date}-rerun.html`;
    const link = `${SITE_URL}/${htmlFile}`;
    const title = d.archive?.title ? `${date} · ${d.archive.title}` : `AI Builders Digest · ${date}`;
    const desc = escapeXml(d.intro?.text || d.archive?.desc || '');
    const sectionCount = d.sections?.length || 0;
    const cardCount = (d.sections || []).reduce((s, sec) => s + (sec.cards?.length || 0), 0);
    const categories = (d.sections || []).map(s => escapeXml(s.title)).join(', ');

    return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate(date)}</pubDate>
      <author>${AUTHOR}</author>
      <description><![CDATA[${d.intro?.text || ''}]]></description>
      <category>${categories}</category>
      <dc:creator>${AUTHOR}</dc:creator>
    </item>`;
  });

  const lastBuildDate = files.length > 0
    ? pubDate(files[0].replace('ai-builders-digest-', '').replace('.json', ''))
    : new Date().toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>zh-cn</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <managingEditor>${AUTHOR}</managingEditor>
    <generator>Hermes Agent</generator>
    <image>
      <url>${SITE_URL}/assets/avatars/avatar-placeholder.png</url>
      <title>${SITE_TITLE}</title>
      <link>${SITE_URL}</link>
    </image>
${items.join('\n')}
  </channel>
</rss>`;

  fs.writeFileSync(RSS_PATH, rss, 'utf8');
  console.log(`Generated ${RSS_PATH} with ${files.length} issues`);
}

main();