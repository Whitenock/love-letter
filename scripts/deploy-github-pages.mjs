#!/usr/bin/env node
/**
 * Деплой frontend на GitHub Pages (PWA).
 *
 * Что делает:
 *  1. Создаёт репозиторий на GitHub, если его ещё нет (используя GH_TOKEN из .env).
 *  2. Делает первый коммит и пушит исходный код в ветку main (если репозиторий пуст).
 *  3. Собирает frontend и публикует frontend/dist в ветку gh-pages.
 *  4. Включает GitHub Pages и печатает адрес сайта.
 *
 * Переменные окружения (читаются из .env в корне проекта):
 *  GH_USERNAME  — логин на github.com (обязательно)
 *  GH_TOKEN     — personal access token с правами на Contents/Repos (обязательно)
 *  GH_REPO_NAME — имя репозитория (необязательно, по умолчанию love-letter)
 *
 * Токен нигде не логируется: вывод git маскируется.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  cpSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(envPath) {
  const vars = {};
  if (!existsSync(envPath)) return vars;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    if (!(match[1] in process.env)) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

const fileEnv = loadEnvFile(path.join(rootDir, '.env'));
const GH_USERNAME = (process.env.GH_USERNAME || fileEnv.GH_USERNAME || '').trim();
const GH_TOKEN = (process.env.GH_TOKEN || fileEnv.GH_TOKEN || '').trim();
const repoName = (process.env.GH_REPO_NAME || fileEnv.GH_REPO_NAME || 'love-letter').trim();

if (!GH_USERNAME || !GH_TOKEN) {
  console.error(
    'Ошибка: GH_USERNAME и GH_TOKEN не заданы.\n' +
      'Добавьте их в файл .env в корне проекта (см. .env.example).\n' +
      'Токен создаётся на github.com -> Settings -> Developer settings -> Personal access tokens\n' +
      '(права: Contents: Read and write, Administration: Read and write для создания репозитория).',
  );
  process.exit(1);
}

const repoFull = `${GH_USERNAME}/${repoName}`;
const siteUrl = `https://${GH_USERNAME}.github.io/${repoName}/`;

const API_HEADERS = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'love-letter-deploy',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function apiCall(method, endpoint, body) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: API_HEADERS,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response;
}

function maskToken(text) {
  return text.replaceAll(GH_TOKEN, '***');
}

function git(args, cwd) {
  try {
    const out = execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out.trim()) console.log(maskToken(out.trim()));
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr) : '';
    console.error(maskToken(stderr.trim()));
    throw error;
  }
}

function gitHasIdentity() {
  try {
    execFileSync('git', ['config', 'user.email'], { encoding: 'utf8', stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function commitAll(cwd, message) {
  git(['add', '-A'], cwd);
  const hasChanges = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }).trim() !== '';
  if (!hasChanges) {
    console.log('Нет изменений для коммита.');
    return;
  }
  git(['commit', '-m', message], cwd);
}

async function main() {
  // --- 1. Проверяем/создаём репозиторий на GitHub ---
  const check = await apiCall('GET', `/repos/${repoFull}`);
  if (check.status === 404) {
    console.log(`Репозиторий ${repoFull} не найден — создаю...`);
    const created = await apiCall('POST', '/user/repos', {
      name: repoName,
      description: 'Telegram Mini App / PWA: интерактивное романтическое письмо',
      private: false,
      auto_init: false,
    });
    if (!created.ok) {
      console.error(`Не удалось создать репозиторий (HTTP ${created.status}):`, maskToken(await created.text()));
      process.exit(1);
    }
    console.log('Репозиторий создан.');
  } else if (!check.ok) {
    console.error(`Не удалось проверить репозиторий (HTTP ${check.status}). Проверьте GH_TOKEN.`);
    process.exit(1);
  } else {
    console.log(`Репозиторий ${repoFull} найден.`);
  }

  // --- 2. Локальный git: init + первый коммит + push main ---
  if (!existsSync(path.join(rootDir, '.git'))) {
    git(['init', '-b', 'main'], rootDir);
  }
  if (!gitHasIdentity()) {
    git(['config', 'user.name', GH_USERNAME], rootDir);
    git(['config', 'user.email', `${GH_USERNAME}@users.noreply.github.com`], rootDir);
  }
  commitAll(rootDir, 'Initial commit: романтическое письмо (PWA + Telegram Mini App)');

  const originUrl = `https://x-access-token:${GH_TOKEN}@github.com/${repoFull}.git`;
  try {
    git(['remote', 'get-url', 'origin'], rootDir);
  } catch {
    git(['remote', 'add', 'origin', originUrl], rootDir);
  }
  git(['push', '-u', 'origin', 'main'], rootDir);
  console.log('Код отправлен в ветку main.');

  // --- 3. Сборка frontend ---
  console.log('Собираю frontend...');
  execFileSync('npm', ['--prefix', 'frontend', 'run', 'build'], { cwd: rootDir, stdio: 'inherit' });

  // --- 4. Публикация dist в ветку gh-pages ---
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'love-letter-ghpages-'));
  const deployDir = path.join(tempDir, 'deploy');
  mkdirSync(deployDir);
  cpSync(path.join(rootDir, 'frontend', 'dist'), deployDir, { recursive: true });

  try {
    git(['init', '-b', 'gh-pages'], deployDir);
    git(['config', 'user.name', GH_USERNAME], deployDir);
    git(['config', 'user.email', `${GH_USERNAME}@users.noreply.github.com`], deployDir);
    commitAll(deployDir, 'Deploy: сборка frontend для GitHub Pages');
    git(['remote', 'add', 'origin', originUrl], deployDir);
    git(['push', '--force', 'origin', 'gh-pages'], deployDir);
    console.log('Сборка опубликована в ветку gh-pages.');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  // --- 5. Включение GitHub Pages ---
  const pages = await apiCall('POST', `/repos/${repoFull}/pages`, {
    source: { branch: 'gh-pages', path: '/' },
  });
  if (pages.status === 409) {
    console.log('GitHub Pages уже включён.');
  } else if (!pages.ok) {
    console.error(`Не удалось включить Pages (HTTP ${pages.status}):`, maskToken(await pages.text()));
    process.exit(1);
  } else {
    console.log('GitHub Pages включён.');
  }

  console.log('\nГотово! Адрес сайта (раскроется через 1-2 минуты):');
  console.log(`  ${siteUrl}`);
  console.log('\nДальше: откройте адрес на iPhone -> Поделиться -> На экран «Домой».');
}

main().catch((error) => {
  console.error('Ошибка деплоя:', maskToken(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
