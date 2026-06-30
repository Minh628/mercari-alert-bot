import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import telegramBotService from './telegramBot.service.js';
import prisma from '../../config/prisma.js';
import itemManagerService from './itemManager.service.js';

dotenv.config({ quiet: true });
chromium.use(stealth());

// --- CẤU HÌNH HẰNG SỐ (CONSTANTS) ---
const CRAWLER_TIMEOUT = 45000;
const DELAY_MIN = 1000;
const DELAY_MAX = 2000;
const CRAWL_INTERVAL = 10000;
const CHUNK_SIZE = 10;
const DOM_CLEAR_INTERVAL = 100;
const BROWSER_RESTART_INTERVAL = 2400; // 

let isRunning = true;
let isCrawling = false;

// --- STATE QUẢN LÝ ---
let activeFollows = [];

let activePage = null;
// ✅ Thay thế biến đơn bằng Map để lưu cấu hình API cho từng Follow
const apiConfigsCache = new Map(); 
let scanCount = 0;

let persistentBrowser = null;
let persistentContext = null;
let exchangeRate = null;

// ==========================================
// UTILITY CHUNG (HELPER FUNCTIONS)
// ==========================================

/**
 * Đóng và dọn dẹp biến activePage (Tránh lặp code)
 */
async function resetActivePage() {
    if (activePage) {
        try { await activePage.close(); } catch (e) { }
        activePage = null;
        // Xóa toàn bộ cache cấu hình khi tắt tab
        apiConfigsCache.clear();
    }
}

/**
 * Đóng và dọn dẹp toàn bộ Browser (Tránh lặp code)
 */
async function resetBrowser() {
    await resetActivePage();
    if (persistentBrowser) {
        try { await persistentBrowser.close(); } catch (e) { }
        persistentBrowser = null;
        persistentContext = null;
    }
}

/**
 * Tạo khoảng chờ ngẫu nhiên
 */
const randomDelay = (min = 3000, max = 7000) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

/**
 * Định dạng text cho 1 món hàng (Tách biệt logic Format)
 */
function formatItemMessage(item, index, offset) {
    const priceVND = exchangeRate ? Math.round(item.price * exchangeRate) : null;
    const priceText = priceVND ? `${item.price.toLocaleString('ja-JP')}¥ (~${priceVND.toLocaleString('vi-VN')}đ)` : `${item.price.toLocaleString('ja-JP')}¥`;
    const brandInfo = item.brandName ? ` - *${item.brandName}*` : '';
    const sizeInfo = item.size ? ` (Size: ${item.size})` : '';

    let text = `${offset + index + 1}. ${item.name}${brandInfo}${sizeInfo}\n`;
    text += `💰 Giá: ${priceText}\n`;
    text += `🔗 [Xem ngay](https://jp.mercari.com/item/${item.id})\n\n`;
    return text;
}

/**
 * Chặn tải tài nguyên không cần thiết (Hình ảnh, CSS, Media)
 */
async function optimizePageResources(page) {
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });
}

/**
 * Kiểm tra giờ nghỉ đêm (23h - 7h VN) và xử lý xả RAM
 */
async function checkAndHandleNightSleep() {
    const now = new Date();
    const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const vnHour = vnTime.getHours();

    if (vnHour >= 23 || vnHour < 7) {
        console.log(`🌙 [Worker] Đang trong giờ nghỉ (${vnHour}h VN). Đã đóng Browser để xả RAM. Chờ đến 7h sáng...`);
        await resetBrowser();
        setTimeout(startCrawlerLoop, 60000);
        return true;
    }
    return false;
}

// ==========================================
// CORE CRAWLER LOGIC
// ==========================================

export async function triggerReloadCategories() {
    try {
        console.log("🔄 [Worker] Nhận tín hiệu, đang tải lại Follows từ Database...");
        activeFollows = await prisma.follow.findMany({
            where: {
                isActive: true,
                user: {
                    is: {
                        expiredAt: { gt: new Date() },
                        isBotActive: true
                    }
                }
            },
            orderBy: { id: 'desc' },
            select: {
                id: true,
                keyword: true,
                categoryId: true,
                itemConditionId: true,
                status: true,
                brandId: true,
                priceMin: true,
                priceMax: true,
                user: { 
                    select: { 
                        telegramId: true,
                        expiredAt: true
                    } 
                }
            }
        });
        console.log(`✅ [Worker] Đã tải ${activeFollows.length} Follows vào RAM.`);

        for (const f of activeFollows) {
            await itemManagerService.preloadCache(f.id);
        }
        console.log(`✅ [Worker] Đã preload cache cho ${activeFollows.length} follows.`);

        if (activePage) {
            await resetActivePage();
            console.log(`🧹 [Worker] Đã reset Tab do Follow thay đổi.`);
        }
    } catch (error) {
        console.error("❌ [Worker] Lỗi tải Follows:", error);
    }
}

// Tự động nạp dữ liệu lúc khởi động
triggerReloadCategories();

function buildSearchUrl(follow) {
    const params = new URLSearchParams();
    if (follow.keyword) params.set('keyword', follow.keyword);
    if (follow.categoryId) params.set('category_id', follow.categoryId);
    params.set('sort', 'created_time');
    params.set('order', 'desc');

    if (follow.itemConditionId) params.set('item_condition_id', follow.itemConditionId);
    if (follow.status) params.set('status', follow.status);
    if (follow.brandId) params.set('brand_id', follow.brandId);
    if (follow.priceMin != null) params.set('price_min', follow.priceMin);
    if (follow.priceMax != null) params.set('price_max', follow.priceMax);

    return `https://jp.mercari.com/search?${params.toString()}`;
}

async function getOrCreateBrowser() {
    if (persistentBrowser && persistentBrowser.isConnected() && persistentContext) {
        return { browser: persistentBrowser, context: persistentContext };
    }
    console.log("🌐 [Worker] Đang khởi tạo Browser mới...");
    persistentBrowser = await chromium.launch({
        headless: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-dev-shm-usage',
            '--js-flags=--max-old-space-size=128'
        ]
    });
    persistentContext = await persistentBrowser.newContext();
    return { browser: persistentBrowser, context: persistentContext };
}

async function sendBatchTelegram(items, follow, telegramId) {
    const chunkSize = CHUNK_SIZE;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const displayName = follow.keyword || `Category ${follow.categoryId}`;
        let messageText = `🔥 [MỚI] Tìm thấy ${chunk.length} món cho "${displayName}":\n\n`;

        chunk.forEach((item, index) => {
            messageText += formatItemMessage(item, index, i);
        });

        await telegramBotService.sendMessage(telegramId, messageText, {
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        });

        if (i + chunkSize < items.length) {
            await randomDelay(2000, 3000);
        }
    }
    console.log(`📲 Đã gửi Batching ${items.length} món cho Telegram ${telegramId}`);
}

async function parseMercariData(data, follow, isColdStart) {
    let newItemsBatch = [];
    if (data && data.items) {
        for (const item of data.items) {
            if (item.status === 'ITEM_STATUS_ON_SALE') {
                const isNewItem = await itemManagerService.processNewItem(follow.id, item.id);
                if (isNewItem) {
                    console.log(`✈️ [Mới] ${item.name}`);
                    if (!isColdStart) {
                        newItemsBatch.push({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            brandName: item.itemBrand?.name || item.itemBrand?.subName || '',
                            size: item.itemSizes?.[0]?.name || item.itemSize?.name || ''
                        });
                    }
                }
            }
        }
    }
    return newItemsBatch;
}

async function setupAndGotoPage(context, searchUrl) {
    const page = await context.newPage();

    await optimizePageResources(page);

    page.on('response', async (response) => {
        if (response.url().includes('country?country_code=VN')) {
            try {
                const data = await response.json();
                exchangeRate = data?.data?.exchange_rate || data?.exchange_rate || data?.rate || exchangeRate;
            } catch (e) { }
        }
    });

    const apiConfigPromise = new Promise((resolve) => {
        page.on('request', (request) => {
            if (request.url().includes('entities:search') ) {
                const headers = request.headers();
                delete headers['content-length'];
                delete headers['cookie'];
                delete headers['host'];

                resolve({
                    url: request.url(),
                    method: request.method(),
                    headers: headers,
                    postData: request.postData() || null
                });
            }
        });
    });

    const responsePromise = page.waitForResponse(
        resp => resp.url().includes('entities:search') ,
        { timeout: CRAWLER_TIMEOUT }
    );

    console.log(`   -> [Action] Goto initial page: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: CRAWLER_TIMEOUT });
    const [searchResponse, apiConfig] = await Promise.all([responsePromise, apiConfigPromise]);

    console.log(`   -> [Cache] Đã bắt được API config: ${apiConfig.method} ${apiConfig.url.substring(0, 80)}...`);

    const data = await searchResponse.json();
    return { page, data, apiConfig }; // ✅ Trả về apiConfig
}

/**
 * Thực thi fetch API nội bộ qua page.evaluate (Tách từ scanSingleCategory)
 */
async function executeInternalFetch(page, config) {
    return await page.evaluate(async (cfg) => {
        try {
            const resp = await fetch(cfg.url, {
                method: cfg.method,
                headers: cfg.headers,
                body: cfg.postData,
                credentials: 'include'
            });
            if (!resp.ok) {
                return { error: true, status: resp.status };
            }
            return { error: false, data: await resp.json() };
        } catch (e) {
            return { error: true, status: 0, message: e.message };
        }
    }, config);
}

/**
 * Dọn dẹp DOM rác (Tách từ scanSingleCategory)
 */
async function clearDomGarbage(page) {
    try {
        await page.evaluate(() => { document.body.innerHTML = ''; });
        console.log(`🧹 [RAM] Đã xóa DOM rác sau ${scanCount} vòng quét.`);
    } catch (e) { }
}

/**
 * Tách logic lấy data từ page hoặc gọi fetch API nội bộ
 */
async function fetchFollowData(context, follow, searchUrl) {
    let data;
    let config = apiConfigsCache.get(follow.id);

    if (!activePage || !config) {
        // Lần đầu hoặc chưa có cache cho follow này
        const result = await setupAndGotoPage(context, searchUrl);
        activePage = result.page;
        data = result.data;
        apiConfigsCache.set(follow.id, result.apiConfig);
    } else {
        console.log(`   -> [Action] Gọi API nội bộ bằng fetch() (tiết kiệm bandwidth)...`);
        const fetchResult = await executeInternalFetch(activePage, config);

        if (fetchResult.error) {
            console.log(`   -> ⚠️ API trả lỗi (status: ${fetchResult.status}). Fallback: goto() lại để refresh session...`);
            // Lỗi session -> reset tab, xóa cache toàn bộ để goto lại
            await resetActivePage();
            
            const result = await setupAndGotoPage(context, searchUrl);
            activePage = result.page;
            data = result.data;
            apiConfigsCache.set(follow.id, result.apiConfig);
        } else {
            data = fetchResult.data;
        }
    }
    return data;
}

/**
 * Helper xuất thông tin debug khi có lỗi trang
 */
async function logPageDebugInfo(page, err, followId) {
    console.log(`⚠️ Lỗi/Timeout khi quét [ID:${followId}]. Đang lấy log debug...`);
    if (page) {
        try {
            const currentUrl = page.url();
            const currentTitle = await page.title();
            console.log(`   -> [Debug] URL hiện tại: ${currentUrl}`);
            console.log(`   -> [Debug] Title màn hình: ${currentTitle}`);
        } catch (e) {
            console.log(`   -> [Debug] Không lấy được thông tin trang.`);
        }
    }
    console.log(`   -> [Debug] Nội dung lỗi: ${err.message}`);
    console.log(`   -> [Recover] Đã xóa Tab lỗi. Sẽ goto() lại ở vòng sau.`);
}

async function scanSingleFollow(context, follow) {
    const cacheSize = itemManagerService.cache.get(follow.id)?.size || 0;
    const isColdStart = (cacheSize === 0);

    if (isColdStart) {
        console.log(`❄️ [Cold Start] Khởi động nguội Follow [ID:${follow.id}]. Đang lấy mốc...`);
    }

    const searchUrl = buildSearchUrl(follow);
    console.log(`🔄 Đang quét [ID:${follow.id}]: → ${searchUrl}`);

    try {
        const data = await fetchFollowData(context, follow, searchUrl);
        const newItemsBatch = await parseMercariData(data, follow, isColdStart);

        if (!isColdStart && newItemsBatch.length > 0) {
            const telegramId = follow.user?.telegramId;
            console.log(`📩 [Worker] Đang chuẩn bị gửi Telegram cho user: ${telegramId}`);
            if (telegramId) {
                await sendBatchTelegram(newItemsBatch, follow, telegramId);
            }
        } else if (isColdStart) {
            console.log(`✅ [Cold Start] Đã nạp xong mốc khởi điểm cho Follow [ID:${follow.id}]. Im lặng.`);
        }

        if (scanCount > 0 && scanCount % DOM_CLEAR_INTERVAL === 0 && activePage) {
            await clearDomGarbage(activePage);
        }

    } catch (err) {
        await logPageDebugInfo(activePage, err, follow.id);
        await resetActivePage();
    }
}

/**
 * Chuẩn bị môi trường trước khi quét: kiểm tra rỗng và xả RAM định kỳ
 */
async function prepareCrawlerEnvironment() {
    if (activeFollows.length === 0) {
        console.log("⏳ [Worker] Chưa có Follow tìm kiếm nào trong RAM. Đang chờ...");
        return false;
    }

    if (scanCount >= BROWSER_RESTART_INTERVAL) {
        console.log(`♻️ [Auto-Restart] Đã quét ${scanCount} vòng. Đang restart browser để xả RAM...`);
        await resetBrowser();
        scanCount = 0;
        console.log(`♻️ [Auto-Restart] Browser đã được restart thành công.`);
    }
    return true;
}

export async function startCrawlerLoop() {
    if (!isRunning) return;
    if (await checkAndHandleNightSleep()) return;

    const isReady = await prepareCrawlerEnvironment();
    if (!isReady) {
        setTimeout(startCrawlerLoop, CRAWL_INTERVAL);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét #${scanCount + 1}...`);
    isCrawling = true;

    try {
        const { context } = await getOrCreateBrowser();

        // ✅ Chạy qua tất cả các Follows
        for (const follow of activeFollows) {
            if (!isRunning) break; // Dừng giữa chừng nếu có lệnh stop

            // ✅ Kiểm tra nếu tài khoản User đã qua thời gian expiredAt thì bỏ qua
            if (follow.user?.expiredAt && new Date() > new Date(follow.user.expiredAt)) {
                continue;
            }

            await scanSingleFollow(context, follow);
            scanCount++;
            
            // Thêm delay nhỏ giữa các Follow để tránh rate limit
            await randomDelay(1000, 2000); 
        }

    } catch (error) {
        console.error('❌ [Worker] Lỗi Crawler:', error);
        await resetBrowser();
    }

    isCrawling = false;
    if (!isRunning) return;

    console.log(`⏳ [Worker] Đã xong. Nghỉ ${CRAWL_INTERVAL / 1000}s...`);
    setTimeout(startCrawlerLoop, CRAWL_INTERVAL);
}

export async function stopCrawler() {
    isRunning = false;
    console.log("🛑 [Worker] Crawler đã bị dừng.");
    await resetBrowser();
}
