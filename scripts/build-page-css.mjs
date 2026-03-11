import fs from 'node:fs/promises';
import { existsSync, watch as fsWatch } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PurgeCSS } from 'purgecss';
import CleanCSS from 'clean-css';

const rootDir = process.cwd();
const cssSources = [
  path.join(rootDir, 'assets/css/tailwind.css'),
  path.join(rootDir, 'assets/css/custom.css'),
];

const pages = [
  {
    key: 'index',
    html: path.join(rootDir, 'index.html'),
    extraContent: [
      path.join(rootDir, 'assets/js/layout.js'),
      path.join(rootDir, 'assets/js/main.js'),
    ],
    output: path.join(rootDir, 'assets/css/index-min.css'),
  },
  {
    key: 'booking',
    html: path.join(rootDir, 'booking.html'),
    extraContent: [
      path.join(rootDir, 'assets/js/layout.js'),
      path.join(rootDir, 'assets/js/booking.js'),
      path.join(rootDir, 'assets/js/main.js'),
    ],
    output: path.join(rootDir, 'assets/css/booking-min.css'),
  },
  {
    key: 'login',
    html: path.join(rootDir, 'login.html'),
    extraContent: [
      path.join(rootDir, 'assets/js/layout.js'),
      path.join(rootDir, 'assets/js/login.js'),
      path.join(rootDir, 'assets/js/main.js'),
    ],
    output: path.join(rootDir, 'assets/css/login-min.css'),
  },
  {
    key: 'profile',
    html: path.join(rootDir, 'profile.html'),
    extraContent: [
      path.join(rootDir, 'assets/js/layout.js'),
      path.join(rootDir, 'assets/js/profile.js'),
      path.join(rootDir, 'assets/js/main.js'),
    ],
    output: path.join(rootDir, 'assets/css/profile-min.css'),
  },
];

const safelist = {
  standard: [
    'dark',
    'light',
    'menu-open',
    'header-scrolled',
    'perf-enhanced',
    'hidden',
    'opacity-0',
    'pointer-events-none',
    'translate-x-full',
    'is-visible',
  ],
  deep: [
    /^reveal-/,
    /^hero-/,
    /^mobile-menu-/,
    /^header-auth-/,
    /^booking-/,
    /^profile-/,
    /^login-/,
    /^appointment-/,
    /^how-step-/,
  ],
};

const defaultExtractor = (content) => {
  // Keep Tailwind arbitrary values, e.g.:
  // md:text-[4.5rem], bg-white/[0.02], shadow-[0_20px_40px_rgba(19,236,236,0.15)]
  const matches = content.match(/[A-Za-z0-9-_:/.[\]%#(),]+/g);
  return matches || [];
};

const ensureSourceFiles = () => {
  const required = [...cssSources, ...pages.flatMap((page) => [page.html, ...page.extraContent])];
  const missing = required.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(`Missing required files:\n${missing.join('\n')}`);
  }
};

const minifyCss = (cssText) => {
  const result = new CleanCSS({ level: 2 }).minify(cssText);
  if (result.errors.length > 0) {
    throw new Error(`CleanCSS errors:\n${result.errors.join('\n')}`);
  }
  return result.styles;
};

const buildPageCss = async (page) => {
  const purgeResult = await new PurgeCSS().purge({
    content: [page.html, ...page.extraContent],
    css: cssSources,
    safelist,
    defaultExtractor,
    rejected: false,
  });

  const mergedCss = purgeResult.map((entry) => entry.css).join('\n');
  const minifiedCss = minifyCss(mergedCss);
  await fs.writeFile(page.output, minifiedCss, 'utf8');
  return minifiedCss.length;
};

const buildAll = async () => {
  ensureSourceFiles();
  const startedAt = Date.now();
  for (const page of pages) {
    const size = await buildPageCss(page);
    const relativeOutput = path.relative(rootDir, page.output);
    console.log(`[css] ${page.key.padEnd(7)} -> ${relativeOutput} (${(size / 1024).toFixed(1)} KiB)`);
  }
  console.log(`[css] done in ${Date.now() - startedAt}ms`);
};

const watchMode = process.argv.includes('--watch');

if (!watchMode) {
  await buildAll();
  process.exit(0);
}

await buildAll();

const watchTargets = [
  ...cssSources,
  ...pages.map((page) => page.html),
  ...new Set(pages.flatMap((page) => page.extraContent)),
];

let timer = null;
const scheduleBuild = () => {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(async () => {
    try {
      await buildAll();
    } catch (error) {
      console.error(`[css] build failed: ${error.message}`);
    }
  }, 120);
};

for (const target of watchTargets) {
  fsWatch(target, { persistent: true }, scheduleBuild);
}

console.log('[css] watch mode enabled');
