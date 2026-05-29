#!/usr/bin/env node

const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
const dataIssuesDir = path.join(repoRoot, 'data', 'issues');
const publishDate = process.argv[2];

if (!publishDate) {
  console.error('Usage: node scripts/build-daily-newsletter-json.js <YYYY-MM-DD>');
  process.exit(1);
}

const followBuildersScripts =
  process.env.FOLLOW_BUILDERS_SCRIPTS || path.join(process.env.HOME || '', '.claude', 'skills', 'follow-builders', 'scripts');
const openclawAgentName = process.env.OPENCLAW_AGENT_NAME || 'main';
const openclawTimeoutSeconds = process.env.OPENCLAW_TIMEOUT_SECONDS || '3600';
const openclawThinking = process.env.OPENCLAW_THINKING || 'low';

const jsonPath = path.join(dataIssuesDir, `ai-builders-digest-${publishDate}.json`);

const prompt = `你正在目录 ${repoRoot} 中工作。

目标：根据最新的 Follow Builders feed，为 ${publishDate} 生成今天的网页刊物 JSON 数据文件：
${jsonPath}

请严格遵循下面的要求：

1. 先运行：
   node "${followBuildersScripts}/prepare-digest.js"
   必须从网络拉取最新 JSON，禁止使用任何本地旧稿、旧 json、旧 markdown 作为正文来源。

2. 只使用最新 feed 中的内容，不要编造，不要补外部信息。

3. 参考当前仓库里这两份文件的结构和语气：
   - ${path.join(dataIssuesDir, 'ai-builders-digest-2026-05-20.json')}
   - ${path.join(dataIssuesDir, 'ai-builders-digest-2026-05-21.json')}

4. 同时参考这些用户 prompt，保持现在已经调好的“编辑判断力 + 朋友式讲述”的风格：
   - ~/.follow-builders/prompts/digest-intro-html.md
   - ~/.follow-builders/prompts/summarize-tweets.md
   - ~/.follow-builders/prompts/summarize-podcast.md
   - ~/.follow-builders/prompts/translate.md

5. 输出必须是完整 JSON，字段结构和现有 issue json 一致，至少包括：
   - title
   - subtitle
   - publishDate = "${publishDate}"
   - editionName = "双语精选版"
   - intro.kicker
   - intro.text
   - archive.title
   - archive.desc
   - viewLabels.rewrite = "速读"
   - viewLabels.original = "原文"
   - footerNote
   - sections

6. sections 内请按网页杂志格式组织内容。常规情况下精选 7-10 条卡片、4-5 个主题；如果当天 feed 内容较少，也必须基于真实内容生成轻量日报，可以只有 1 个主题、1 张卡片。
   每个 card 尽量保持：
   - authorKey
   - sourceUrl
   - en.rewrite
   - en.original
   - cn.rewrite
   - cn.original
   如果是播客，可补 authorName / authorTag。

7. archive.title 和 archive.desc 要适合首页目录使用：
   - title 简短，像“接口底座日报”“组织重构日报”这种
   - desc 1 句话，概括当天主线

8. 不要编造，不要补外部信息。只有当 tweets 和 podcasts 都完全没有可用内容时，才不要创建 JSON，并在结束时明确输出：NO_CONTENT。
   如果只有 1 条播客、少量 tweets、或任意真实内容，也要正常生成 JSON；可以在 intro 和 archive.desc 中说明这是轻量版/单主题版。

9. 完成后只做一件事：把 JSON 覆盖写入
   ${jsonPath}
   然后停止。`;

const result = spawnSync(
  'openclaw',
  [
    'agent',
    '--agent',
    openclawAgentName,
    '--message',
    prompt,
    '--timeout',
    String(openclawTimeoutSeconds),
    '--thinking',
    openclawThinking,
  ],
  {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
