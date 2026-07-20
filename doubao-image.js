/**
 * 豆包生图 — 通过 Edge CDP 驱动豆包网页版生图
 *
 * 用法:
 *   node doubao-image.js "提示词"
 *
 * 原理:
 *   1. 连接 Edge CDP (端口 9222)
 *   2. 打开豆包网页版
 *   3. 切换到图像生成模式
 *   4. 输入提示词并发送
 *   5. 监听网络请求捕获原图 CDN 地址
 *   6. 下载原图到 doubao-outputs/
 *
 * 前置条件:
 *   1. Edge 已在 CDP 模式启动:
 *      msedge --remote-debugging-port=9222 --user-data-dir=~/.edge-debug-profile
 *   2. 已在豆包网页登录过
 */

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const outputDir = path.resolve('./doubao-outputs');

// 速率控制
let lastReq = 0;
let reqCnt = 0;
let reqWin = Date.now();

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    const prompt = process.argv[2];
    if (!prompt) {
        console.log('用法: node doubao-image.js "提示词"');
        console.log('示例: node doubao-image.js "水彩风格的猫咪"');
        process.exit(1);
    }

    // === 速率限制 ===
    const now = Date.now();
    if (now - reqWin > 3600000) { reqCnt = 0; reqWin = now; }
    if (reqCnt >= 20) {
        console.error('❌ 已达每小时20次请求限制，请稍后再试');
        process.exit(1);
    }
    if (lastReq && now - lastReq < 15000) {
        const wait = 15000 - (now - lastReq);
        console.log(`⏳ 速率控制: 等待 ${Math.ceil(wait / 1000)} 秒...`);
        await sleep(wait);
    }
    reqCnt++;
    lastReq = Date.now();

    // === 连接 Edge CDP ===
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const ctx = browser.contexts()[0];

    let page = ctx.pages().find(p => p.url().includes('doubao.com'));
    if (!page) page = await ctx.newPage();
    await page.goto('https://www.doubao.com/chat/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // === 切换到图像生成模式 ===
    await page.evaluate(() => {
        const btns = document.querySelectorAll('button');
        for (const btn of btns) {
            if (btn.textContent.includes('图像生成')) {
                btn.click();
                return;
            }
        }
    });
    await sleep(2000);

    // === 输入提示词 ===
    // 优先使用 ProseMirror (图像模式的编辑器)
    const pm = await page.$('div.ProseMirror');
    if (pm) {
        await pm.click();
        await sleep(300);
        await page.keyboard.type(prompt, { delay: 15 });
    } else {
        // 兜底: textarea
        await page.evaluate((p) => {
            const ta = document.querySelector('textarea');
            if (ta) ta.value = p;
        }, prompt);
    }
    await sleep(300);

    // === 注册网络监听（按回车后才开始捕获图片URL） ===
    const imgUrls = [];
    const handler = r => {
        const url = r.url();
        const ct = r.headers()['content-type'] || '';
        if (url.includes('rc_gen_image') && ct.startsWith('image/')) {
            const m = url.match(/rc_gen_image\/([^~?]+)/);
            if (m) {
                const existing = imgUrls.find(i => i.id === m[1]);
                if (!existing) {
                    imgUrls.push({
                        id: m[1],
                        url,
                        isDownsize: url.includes('downsize')
                    });
                } else if (!url.includes('downsize') && existing.isDownsize) {
                    // 替换为高清版本
                    existing.url = url;
                    existing.isDownsize = false;
                }
            }
        }
    };
    page.on('response', handler);

    // === 发送 ===
    await page.keyboard.press('Enter');
    console.log(`🎨 "${prompt}"`);

    // === 等待生成 ===
    for (let i = 0; i < 10; i++) {
        await sleep(5000);
        if (i % 2 === 1) console.log(`   ...${(i + 1) * 5}s`);
    }

    page.removeListener('response', handler);

    // === 去重，取最新 4 张 ===
    const unique = new Map();
    for (const img of imgUrls.slice(-8)) {
        if (!unique.has(img.id)) unique.set(img.id, img.url);
        if (unique.size >= 4) break;
    }

    if (unique.size === 0) {
        console.log('⚠️ 未检测到生成的图片');
        await browser.close();
        return;
    }

    console.log(`   📸 ${unique.size} 张`);

    // === 下载 ===
    fs.mkdirSync(outputDir, { recursive: true });
    let idx = 0;

    for (const [id, url] of unique) {
        idx++;
        const filepath = path.join(outputDir, `doubao_${Date.now()}_${idx}.jpeg`);

        const result = await page.evaluate(async (u) => {
            const r = await fetch(u, {
                headers: { Referer: 'https://www.doubao.com/' }
            });
            if (!r.ok) return { error: `HTTP ${r.status}` };
            const blob = await r.blob();
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ data: reader.result, size: blob.size });
                reader.readAsDataURL(blob);
            });
        }, url);

        if (result.error) {
            console.log(`   ❌ ${result.error}`);
            continue;
        }

        const buf = Buffer.from(
            result.data.replace(/^data:image\/\w+;base64,/, ''),
            'base64'
        );
        fs.writeFileSync(filepath, buf);
        const sizeMB = (result.size / 1024 / 1024).toFixed(1);
        console.log(`   ✅ ${idx}/${unique.size} (${sizeMB}MB)`);
    }

    // === 输出 ===
    console.log(`\n📁 ${path.resolve(outputDir)}`);
    for (const f of fs.readdirSync(outputDir).filter(f => f.startsWith('doubao')).sort()) {
        const s = fs.statSync(path.join(outputDir, f));
        console.log(`   ${f} (${(s.size / 1024).toFixed(0)}KB)`);
    }

    await browser.close();
}

main().catch(e => console.error('❌', e.message));
