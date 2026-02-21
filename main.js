'use strict';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const chalk = require('chalk');
const os = require('os');
const path = require('path');
const net = require('net');
const axios = require('axios');
const { formatDuration, initStats, aggregateStats, loadIds } = require('./lib/utils');

puppeteer.use(StealthPlugin());

const CONFIG = {
    useProxy: true,
    ouoFile: path.join(__dirname, 'data/ouo.txt'),
    headless: 'new',
    timeout: 50000,
    consecutiveFailureThreshold: 3,
    concurrency: 5,
    delayMin: 500,
    delayMax: 1500,
};

const urlStats = {};
const failedProxies = new Set();
let requestCounter = 0;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min, max) => delay(Math.floor(Math.random() * (max - min + 1)) + min);

function colorizeText(text, count) {
    const colors = ['cyan', 'blue', 'magenta', 'yellow', 'green', 'red'];
    const chars = text.split('');
    const limit = (count % (chars.length + 1)) || chars.length;
    return chars.map((c, i) =>
        i < limit ? chalk[colors[i % colors.length]].bold(c) : chalk.gray(c)
    ).join('');
}

function formatProxy(proxyUrl) {
    if (!proxyUrl) return 'Direct';
    return proxyUrl.replace(/^(https?|socks[45]):\/\//, '');
}

function formatProxyUrl(proxy) {
    if (!proxy) return null;
    return /^(https?|socks)/.test(proxy) ? proxy : `http://${proxy}`;
}

function logRequest(urlId, message, proxy, color = null) {
    requestCounter++;
    const colorFn = chalk[color]?.bold || chalk.white.bold;
    console.log(`${colorizeText('ᶠᶸᶜᵏᵧₒᵤ', requestCounter)} ${colorFn('ouo.io/')}${colorFn(urlId)} ${chalk.white.bold('→')} ${colorFn(message)} | ${colorFn(formatProxy(proxy))}`);
}

function displayBanner() {
    const asciiArt = [
        "⠀⠀⠀⢠⣾⣷⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀       ouo.js",
        "⠀⠀⣰⣿⣿⣿⣿⣷⡀⠀⠀⠀   ⠀       ⠀⠀⠀⠀⠀⠀⠀⠀",
        "⠀⢰⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣤⣄⣀⣀⣤⣤⣶⣾⣿⣿⣿⡷",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀⠀",
        "⣿⣿⣿⡇⠀⡾⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣧⡀⠁⣀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠉⢹⠉⠙⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣀⠀⣀⣼⣿⣿⣿⣿⡟⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠛⠀⠤⢀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⣿⣿⠿⣿⣿⣿⣿⣿⣿⣿⠿⠋⢃⠈⠢⡁⠒⠄⡀⠈⠁⠀⠀⠀⠀⠀⠀⠀",
        "⣿⣿⠟⠁⠀⠀⠈⠉⠉⠁⠀⠀⠀⠀⠈⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
        "⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀"
    ];

    const platformNames = {
        darwin: `macOS ${os.release()}`,
        win32: `Windows ${os.release()}`,
        linux: `Linux ${os.release()}`,
        freebsd: `FreeBSD ${os.release()}`,
        openbsd: `OpenBSD ${os.release()}`,
        sunos: `SunOS ${os.release()}`,
        aix: `AIX ${os.release()}`,
    };

    const info = [
        { label: 'Name', value: 'OUO.IO BOT TRAFFIC' },
        { label: 'Version', value: '3.0.0' },
        { label: 'Author', value: 'Dakila Universe' },
        { label: 'Engine', value: 'Puppeteer + Stealth' },
        { label: 'PID', value: process.pid },
        { label: 'Host', value: os.hostname() },
        { label: 'Mode', value: 'Browser Automation' },
        { label: 'Notes', value: '𝐵𝑜𝑟𝑛 𝑡𝑜 𝑑𝑖𝑒.' },
        { label: 'Platform', value: platformNames[process.platform] || process.platform.toUpperCase() },
        { label: 'Arch', value: process.arch },
        { label: 'CPU', value: `${os.cpus().length} cores` },
        { label: 'Node', value: process.version },
        { label: 'RAM', value: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(0)}MB` },
        { label: 'Proxy', value: CONFIG.useProxy ? 'Enabled' : 'Disabled' },
    ];

    console.log('');
    const startInfoLine = Math.floor((asciiArt.length - info.length) / 2);
    asciiArt.forEach((line, i) => {
        let output = chalk.magenta.bold(line);
        if (i >= startInfoLine && i < startInfoLine + info.length) {
            const item = info[i - startInfoLine];
            output += ' '.repeat(6) + `${chalk.white.bold(item.label.padEnd(8))}: ${chalk.green.bold(item.value)}`;
        }
        console.log(output);
    });
    console.log('');
}

function testProxy(proxyUrl, timeoutMs = 5000) {
    return new Promise((resolve) => {
        try {
            const url = new URL(formatProxyUrl(proxyUrl));
            const socket = net.createConnection({
                host: url.hostname,
                port: parseInt(url.port) || 1080,
                timeout: timeoutMs,
            });
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('error', () => resolve(false));
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
        } catch {
            resolve(false);
        }
    });
}

async function fetchSocksProxies() {
    try {
        const metaRes = await axios.get(
            'https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/meta/data.json',
            { timeout: 8000 }
        );
        const data = metaRes.data;

        console.log(chalk.white.bold('Proxy Source'));
        console.log(chalk.white.bold('========================================'));
        console.log(chalk.white.bold('Total         : ') + chalk.cyan.bold(data.totals.all));
        console.log(chalk.white.bold('SOCKS4        : ') + chalk.cyan.bold(data.totals.protocols.socks4) + chalk.white.bold('  | SOCKS5: ') + chalk.cyan.bold(data.totals.protocols.socks5));
        console.log(chalk.white.bold('========================================'));
        console.log('');

        const topCountries = Object.entries(data.totals.countries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([cc]) => cc);

        const results = await Promise.allSettled(
            topCountries.map(cc =>
                axios.get(
                    `https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/countries/${cc}/data.json`,
                    { timeout: 8000 }
                ).then(r => r.data)
            )
        );

        const allSocks = results
            .filter(r => r.status === 'fulfilled' && Array.isArray(r.value))
            .flatMap(r => r.value
                .filter(p => p.protocol === 'socks4' || p.protocol === 'socks5')
                .map(p => p.proxy)
            );

        return [...new Set(allSocks)].sort(() => Math.random() - 0.5);
    } catch (error) {
        console.log(chalk.red(`Fetch proxy error: ${error.message}`));
        return [];
    }
}

async function launchBrowser(proxyUrl = null) {
    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1280,800',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--lang=en-US,en',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--mute-audio',
    ];

    if (proxyUrl) args.push(`--proxy-server=${formatProxyUrl(proxyUrl)}`);

    return puppeteer.launch({
        headless: CONFIG.headless,
        args,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        timeout: CONFIG.timeout,
    });
}

const AD_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'adservice.google',
    'runative-syndicate.com', 'popads.net', 'popcash.net',
    'exoclick.com', 'trafficjunky.net', 'adsterra.com',
    'propellerads.com', 'hilltopads.net', 'juicyads.com',
    'adskeeper.co.uk', 'mgid.com', 'revcontent.com',
    'cuplikenominee.com', 'displayvertising.com', 'adsco.re',
];

async function processUrl(url, urlId, proxyUrl, page) {
    try {
        const userAgent = new UserAgent({ deviceCategory: 'mobile' }).toString();
        await page.setUserAgent(userAgent);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Upgrade-Insecure-Requests': '1',
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: CONFIG.timeout });
        await delay(2000);

        const title = await page.title().catch(() => '');
        if (title.includes('Just a moment') || title.includes('Cloudflare')) {
            await delay(8000);
            const titleAfter = await page.title().catch(() => '');
            if (titleAfter.includes('Just a moment') || titleAfter.includes('Cloudflare')) {
                return 'cloudflare';
            }
        }

        await page.waitForSelector('#form-captcha #btn-main', { timeout: CONFIG.timeout });
        await page.waitForFunction(
            () => {
                const btn = document.querySelector('#form-captcha #btn-main');
                return btn && btn.className.trim() === 'btn btn-main' && !btn.disabled;
            },
            { timeout: 10000, polling: 100 }
        ).catch(() => { });

        await delay(300);
        await page.evaluate(() => document.querySelector('#form-captcha #btn-main')?.click());
        await page.waitForSelector('#form-go #btn-main', { timeout: CONFIG.timeout });

        await page.waitForFunction(
            () => {
                const btn = document.querySelector('#form-go #btn-main');
                return btn && btn.className.trim() === 'btn btn-main';
            },
            { timeout: CONFIG.timeout, polling: 100 }
        ).catch(() => { });

        await delay(300);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: CONFIG.timeout }).catch(() => { }),
            page.evaluate(() => document.querySelector('#form-go #btn-main')?.click()),
        ]);
        await delay(500);

        const finalUrl = page.url();
        urlStats[urlId].success++;
        logRequest(urlId, 'SUCCESS', proxyUrl, 'green', finalUrl);
        return 'success';

    } catch {
        urlStats[urlId].failed++;
        return 'failed';
    }
}

async function processBatch(items, proxyUrl, urlQueue) {
    let browser = null;
    let consecutiveFailures = 0;
    const currentProxy = proxyUrl || null;

    try {
        browser = await launchBrowser(currentProxy);

        while (true) {
            if (consecutiveFailures >= CONFIG.consecutiveFailureThreshold) {
                failedProxies.add(currentProxy || 'Direct');
                break;
            }

            const item = urlQueue.shift();
            if (!item) break;

            const page = await browser.newPage();
            page.on('error', () => { });
            page.on('pageerror', () => { });
            page.on('popup', async (popup) => { await popup.close().catch(() => { }); });

            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                        { name: 'Native Client', filename: 'internal-nacl-plugin' },
                    ]
                });
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
                delete navigator.__proto__.webdriver;
                window.chrome = { runtime: {}, loadTimes: () => { }, csi: () => { }, app: {} };
                window.open = () => null;
            });

            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const isBlocked = ['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())
                    || AD_DOMAINS.some(d => req.url().includes(d));
                isBlocked ? req.abort() : req.continue();
            });

            const result = await processUrl(item.url, item.id, currentProxy, page);
            await page.close().catch(() => { });

            if (result === 'cloudflare') {
                failedProxies.add(currentProxy || 'Direct');
                urlQueue.unshift(item);
                break;
            }

            if (result === 'failed') {
                consecutiveFailures++;
                urlStats[item.id].proxyErrors++;
            } else {
                consecutiveFailures = 0;
            }

            await randomDelay(CONFIG.delayMin, CONFIG.delayMax);
        }

        return true;
    } catch {
        failedProxies.add(currentProxy || 'Direct');
        return false;
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function main() {
    const startTime = Date.now();
    try {
        displayBanner();

        const rawUrls = (await loadIds(CONFIG.ouoFile))
            .filter(l => l.startsWith('http'))
            .map((url) => {
                const id = url.split('/').filter(Boolean).pop() || url;
                return { url, id };
            });

        if (rawUrls.length === 0) {
            console.error(chalk.red.bold('✗ Tidak ada URL ditemukan di ouo.txt'));
            process.exit(1);
        }

        const urls = shuffleArray(rawUrls);
        urls.forEach(({ id }) => { urlStats[id] = initStats(); });

        let allProxies = [];
        if (CONFIG.useProxy) {
            allProxies = await fetchSocksProxies();
            const modeLabel = allProxies.length > 0 ? 'SOCKS' : 'Direct (No Proxy)';
            console.log(chalk.white.bold('Proxy Mode  : ') + chalk.cyan.bold(modeLabel));
            if (allProxies.length > 0) {
                console.log(chalk.white.bold('Available   : ') + chalk.cyan.bold(`${allProxies.length} proxies`));
            }
        } else {
            console.log(chalk.white.bold('Proxy Mode  : ') + chalk.cyan.bold('Direct'));
        }

        console.log(chalk.white.bold('Source File : ') + chalk.cyan.bold(path.basename(CONFIG.ouoFile)));
        console.log(chalk.white.bold('Total URLs  : ') + chalk.cyan.bold(urls.length));
        if (CONFIG.useProxy) {
            console.log(chalk.white.bold('Blacklisted : ') + chalk.red.bold(failedProxies.size) + chalk.white.bold(' proxies'));
        }
        console.log(chalk.white.bold('Concurrency : ') + chalk.cyan.bold(CONFIG.concurrency));

        if (allProxies.length > 0) {
            const proxyPool = shuffleArray(allProxies);
            let proxyPoolIndex = 0;

            const getNextProxy = () => {
                while (proxyPoolIndex < proxyPool.length) {
                    const p = proxyPool[proxyPoolIndex++];
                    if (!failedProxies.has(p)) return p;
                }
                return null;
            };

            console.log(chalk.white.bold('Workers     : ') + chalk.cyan.bold(CONFIG.concurrency));
            console.log('');

            const workers = Array.from({ length: CONFIG.concurrency }, () =>
                (async () => {
                    while (true) {
                        const proxy = getNextProxy();
                        if (!proxy) break;

                        const alive = await testProxy(proxy, 5000);
                        if (!alive) {
                            failedProxies.add(proxy);
                            continue;
                        }

                        const urlQueue = shuffleArray(urls).map(u => ({ ...u }));
                        await processBatch([], proxy, urlQueue);
                        await delay(300);
                    }
                })()
            );

            await Promise.all(workers);
        } else {
            const urlQueue = [...urls];
            await processBatch([], null, urlQueue);
        }

        const totals = aggregateStats(urlStats);
        console.log('');
        console.log(chalk.white.bold('═'.repeat(70)));
        console.log(chalk.white.bold('                          FINAL REPORT'));
        console.log(chalk.white.bold('═'.repeat(70)));
        console.log(chalk.white.bold('Proxy Mode    : ') + chalk.white.bold(CONFIG.useProxy ? 'SOCKS (Multi-Country)' : 'Direct'));
        console.log(chalk.green.bold('Success       : ') + chalk.green.bold(totals.success));
        console.log(chalk.red.bold('Failed        : ') + chalk.red.bold(totals.failed));
        console.log(chalk.red.bold('Proxy Errors  : ') + chalk.red.bold(totals.proxyErrors));
        console.log(chalk.red.bold('Blacklisted   : ') + chalk.red.bold(failedProxies.size) + chalk.white.bold(' proxies'));
        console.log(chalk.white.bold('─'.repeat(70)));
        console.log(chalk.white.bold('Duration      : ') + chalk.white.bold(formatDuration(Date.now() - startTime)));
        console.log(chalk.white.bold('═'.repeat(70)));
        process.exit(0);
    } catch (error) {
        console.error(chalk.red.bold(`✗ Fatal Error: ${error.message}`));
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(chalk.red.bold(`✗ Fatal Error: ${error.message}`));
    process.exit(1);
});