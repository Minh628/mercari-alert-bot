import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import telegramBotService from './telegramBot.service.js';
import prisma from '../config/prisma.js';
// Tích hợp Item Manager để tối ưu bộ nhớ và DB (Sliding Window)
import itemManagerService from './itemManager.service.js';

dotenv.config({ quiet: true });
chromium.use(stealth());

// --- CẤU HÌNH HẰNG SỐ (CONSTANTS) ---
const CRAWLER_TIMEOUT = 45000; // Timeout cho Render Free
const DELAY_MIN = 3000;
const DELAY_MAX = 6000;
const CRAWL_INTERVAL = 10000;
const CHUNK_SIZE = 10;
const DOM_CLEAR_INTERVAL = 100;       // ✅ Xóa DOM rác sau N vòng quét để giải phóng RAM
const BROWSER_RESTART_INTERVAL = 200; // ✅ Restart browser hoàn toàn sau N vòng để xả Memory Leak (~50 phút)

let isRunning = true;
let isCrawling = false;

// --- BIẾN RAM NỘI BỘ (Event-Driven Cache) ---
// Chứa danh sách các cấu hình tìm kiếm hiện tại (kèm telegramId của user sở hữu)
let activeCategories = [];

// --- SINGLE TAB ARCHITECTURE: Chỉ giữ 1 tab duy nhất, không cần Pool ---
let activePage = null;          // Tab Chromium duy nhất đang mở
let cachedApiConfig = null;     // Cache cấu hình API { url, method, headers, postData } để replay bằng fetch()
let scanCount = 0;              // Đếm số vòng quét (dùng cho auto-restart & DOM clear)

// --- PERSISTENT BROWSER: Giữ 1 browser instance xuyên suốt thay vì mở/đóng liên tục ---
let persistentBrowser = null;
let persistentContext = null;
let exchangeRate = null; // Cache global tỷ giá VNĐ

/**
 * Tín hiệu (Signal) để Crawler tải lại danh sách Category từ DB vào RAM.
 * Hàm này được gọi từ category.service.js mỗi khi người dùng Thêm/Sửa/Xóa.
 * ✅ FIX BUG #1: Load kèm user.telegramId để gửi đúng người
 * ✅ FIX BUG #2: Chỉ load category của user chưa hết hạn
 * ✅ OPT #1: Preload ItemManager cache chống spam khi Render restart
 */
export async function triggerReloadCategories() {
    try {
        console.log("🔄 [Worker] Nhận tín hiệu, đang tải lại Categories từ Database...");
        activeCategories = await prisma.category.findMany({
            where: {
                isActive: true,
                // ✅ FIX BUG #2: Loại trừ category của user đã hết hạn
                user: {
                    is: {
                        expiredAt: { gt: new Date() },
                        isBotActive: true // ✅ CHỈ LẤY USER ĐANG BẬT BOT
                    }
                }
            },
            orderBy: { id: 'desc' },
            select: {
                id: true,
                categoryId: true,
                itemConditionId: true,
                status: true,
                brandId: true,
                priceMin: true,
                priceMax: true,
                // ✅ FIX BUG #1: Load telegramId của user sở hữu category
                user: {
                    select: { telegramId: true }
                }
            }
        });
        console.log(`✅ [Worker] Đã tải ${activeCategories.length} Categories vào RAM.`);

        // ✅ OPT #1: Preload cache cho từng category để chống spam khi server restart
        for (const cat of activeCategories) {
            await itemManagerService.preloadCache(cat.id);
        }
        console.log(`✅ [Worker] Đã preload cache cho ${activeCategories.length} categories.`);

        // ✅ Khi category thay đổi → reset tab để vòng quét sau goto() lại với URL mới
        if (activePage) {
            try { await activePage.close(); } catch (e) { }
            activePage = null;
            cachedApiConfig = null;
            console.log(`🧹 [Worker] Đã reset Tab do Category thay đổi.`);
        }
    } catch (error) {
        console.error("❌ [Worker] Lỗi tải Categories:", error);
    }
}

// Gọi ngay 1 lần lúc khởi động server để nạp data từ DB
triggerReloadCategories();

// Hàm tạo khoảng dừng ngẫu nhiên an toàn (chống block IP)
const randomDelay = (min = 3000, max = 7000) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

/**
 * Dựng URL tìm kiếm Mercari từ object Category
 * Dấu phẩy trong itemConditionId và brandId sẽ được tự động encode thành %2C
 */
function buildSearchUrl(category) {
    const params = new URLSearchParams();
    params.set('category_id', category.categoryId);
    params.set('sort', 'created_time');
    params.set('order', 'desc');

    // Các filter tùy chọn
    if (category.itemConditionId) {
        params.set('item_condition_id', category.itemConditionId);
    }
    if (category.status) {
        params.set('status', category.status);
    }
    if (category.brandId) {
        params.set('brand_id', category.brandId);
    }
    if (category.priceMin != null) {
        params.set('price_min', category.priceMin);
    }
    if (category.priceMax != null) {
        params.set('price_max', category.priceMax);
    }

    return `https://jp.mercari.com/search?${params.toString()}`;
}

/**
 * Lấy hoặc tạo Browser instance (Persistent - không mở/đóng mỗi vòng)
 * ✅ OPT #2: Giữ 1 browser xuyên suốt, giảm CPU + RAM overhead
 */
async function getOrCreateBrowser() {
    // Nếu browser đã tồn tại và còn kết nối → dùng lại
    if (persistentBrowser && persistentBrowser.isConnected() && persistentContext) {
        return { browser: persistentBrowser, context: persistentContext };
    }
    // Launch browser mới với cấu hình tối ưu RAM cho Render
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
            '--js-flags=--max-old-space-size=128' // Khóa cứng RAM cho V8 Engine
        ]
    });
    persistentContext = await persistentBrowser.newContext();
    return { browser: persistentBrowser, context: persistentContext };
}

/**
 * Tách biệt logic gửi Telegram Gom Mẻ (Batching)
 * Xử lý cắt nhỏ tin nhắn nếu mảng items quá lớn (Tránh lỗi 400 Bad Request Telegram)
 */
async function sendBatchTelegram(items, category, telegramId) {
    const chunkSize = CHUNK_SIZE; // Giới hạn số món / 1 tin nhắn để tránh lỗi 400 Message too long của Telegram
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        let messageText = `🔥 [MỚI] Tìm thấy ${chunk.length} món cho "${category.categoryId}":\n\n`;

        chunk.forEach((item, index) => {
            const priceVND = exchangeRate ? Math.round(item.price * exchangeRate) : null;
            const priceText = priceVND ? `${item.price.toLocaleString('ja-JP')}¥ (~${priceVND.toLocaleString('vi-VN')}đ)` : `${item.price.toLocaleString('ja-JP')}¥`;
            const brandInfo = item.brandName ? ` - *${item.brandName}*` : '';
            const sizeInfo = item.size ? ` (Size: ${item.size})` : '';

            messageText += `${i + index + 1}. ${item.name}${brandInfo}${sizeInfo}\n`;
            messageText += `💰 Giá: ${priceText}\n`;
            messageText += `🔗 [Xem ngay](https://jp.mercari.com/item/${item.id})\n\n`;
        });

        // Gọi Singleton Telegram Bot gửi tin
        await telegramBotService.sendMessage(telegramId, messageText, {
            parse_mode: 'Markdown',
            disable_web_page_preview: false
        });

        // Nghỉ 1s giữa các tin nhắn để chống Rate limit
        if (i + chunkSize < items.length) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    console.log(`📲 Đã gửi Batching ${items.length} món cho Telegram ${telegramId}`);
}

/**
 * Trích xuất và lọc dữ liệu JSON từ API Mercari
 * Tách biệt logic parse dữ liệu để tuân thủ SRP (Single Responsibility Principle)
 */
async function parseMercariData(data, category, isColdStart) {
    let newItemsBatch = [];
    if (data && data.items) {
        for (const item of data.items) {
            if (item.status === 'ITEM_STATUS_ON_SALE') {
                const isNewItem = await itemManagerService.processNewItem(category.id, item.id);
                if (isNewItem) {
                    const priceJPY = item.price;
                    console.log(`✈️ [Mới] ${item.name}`);

                    if (!isColdStart) {
                        newItemsBatch.push({
                            id: item.id,
                            name: item.name,
                            price: priceJPY,
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

/**
 * ✅ Thiết lập Tab mới + Goto lần đầu: Chặn tài nguyên thừa, bắt tỷ giá, bắt API config
 * Khi goto() lần đầu, intercept request 'entities:search' để lưu cấu hình API cho replay bằng fetch()
 * Chỉ gọi hàm này khi activePage === null (lần đầu hoặc sau khi restart/fallback)
 */
async function setupAndGotoPage(context, searchUrl) {
    const page = await context.newPage();

    // Chặn tải hình ảnh, CSS, font, media để tiết kiệm RAM & Bandwidth
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    // Bắt API response ngầm để lấy tỷ giá VNĐ (Chỉ cần cài 1 lần cho page này)
    page.on('response', async (response) => {
        if (response.url().includes('country?country_code=VN')) {
            try {
                const data = await response.json();
                exchangeRate = data?.data?.exchange_rate || data?.exchange_rate || data?.rate || exchangeRate;
            } catch (e) { }
        }
    });

    // ✅ Intercept API request entities:search TRƯỚC khi goto() để không bỏ lỡ event
    // Lưu lại cấu hình (URL, method, headers, body) để các vòng sau replay bằng fetch()
    const apiConfigPromise = new Promise((resolve) => {
        page.on('request', (request) => {
            if (request.url().includes('entities:search') && request.method() !== 'OPTIONS') {
                const headers = request.headers();
                // Xóa headers mà browser sẽ tự quản lý khi fetch() nội bộ
                delete headers['content-length'];
                delete headers['cookie'];  // Browser tự gắn cookie khi fetch() cùng origin
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

    // Đăng ký chờ API response song song
    const responsePromise = page.waitForResponse(
        resp => resp.url().includes('entities:search') && resp.request().method() !== 'OPTIONS',
        { timeout: CRAWLER_TIMEOUT }
    );

    console.log(`   -> [Action] Goto initial page: ${searchUrl}`);

    // Goto + chờ API response + bắt API config đồng thời
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: CRAWLER_TIMEOUT });
    const [searchResponse, apiConfig] = await Promise.all([responsePromise, apiConfigPromise]);

    // Lưu API config vào cache global để replay ở các vòng sau
    cachedApiConfig = apiConfig;
    console.log(`   -> [Cache] Đã lưu API config: ${cachedApiConfig.method} ${cachedApiConfig.url.substring(0, 80)}...`);

    const data = await searchResponse.json();
    return { page, data };
}

/**
 * ✅ CORE: Quét 1 Category bằng cơ chế "API-Only"
 * Lần đầu (activePage === null): goto() để thiết lập session → bắt API config
 * Các lần sau: page.evaluate(fetch()) gọi thẳng API → chỉ tốn ~10-20KB bandwidth/lần
 */
async function scanSingleCategory(context, category) {
    const cacheSize = itemManagerService.cache.get(category.id)?.size || 0;
    const isColdStart = (cacheSize === 0);

    if (isColdStart) {
        console.log(`❄️ [Cold Start] Khởi động nguội Category [ID:${category.id}]. Đang lấy mốc...`);
    }

    const searchUrl = buildSearchUrl(category);
    console.log(`🔄 Đang quét [ID:${category.id}]: → ${searchUrl}`);

    try {
        let data;

        if (!activePage || !cachedApiConfig) {
            // ===== LẦN ĐẦU: goto() để thiết lập session & bắt API config =====
            const result = await setupAndGotoPage(context, searchUrl);
            activePage = result.page;
            data = result.data;
        } else {
            // ===== CÁC LẦN SAU: page.evaluate(fetch) — Chỉ gọi API, KHÔNG tải lại trang =====
            console.log(`   -> [Action] Gọi API nội bộ bằng fetch() (tiết kiệm bandwidth)...`);

            // Truyền cấu hình API vào page.evaluate() để gọi fetch() BÊN TRONG Chromium
            // fetch() chạy trong tab → tự mang cookies, TLS fingerprint → không bị anti-bot chặn
            const fetchResult = await activePage.evaluate(async (config) => {
                try {
                    const resp = await fetch(config.url, {
                        method: config.method,
                        headers: config.headers,
                        body: config.postData,
                        credentials: 'include' // Gửi kèm cookie cho cross-origin request
                    });
                    if (!resp.ok) {
                        return { error: true, status: resp.status };
                    }
                    return { error: false, data: await resp.json() };
                } catch (e) {
                    return { error: true, status: 0, message: e.message };
                }
            }, cachedApiConfig);

            // Kiểm tra kết quả fetch
            if (fetchResult.error) {
                // ===== FALLBACK: Session hết hạn hoặc bị block → goto() lại để refresh =====
                console.log(`   -> ⚠️ API trả lỗi (status: ${fetchResult.status}). Fallback: goto() lại để refresh session...`);
                try { await activePage.close(); } catch (e) { }
                activePage = null;
                cachedApiConfig = null;

                // Tạo lại page mới bằng goto()
                const result = await setupAndGotoPage(context, searchUrl);
                activePage = result.page;
                data = result.data;
            } else {
                data = fetchResult.data;
            }
        }

        // ✅ Xử lý data nhận được (chung cho cả 2 nhánh: goto lần đầu & fetch các lần sau)
        const newItemsBatch = await parseMercariData(data, category, isColdStart);

        if (!isColdStart && newItemsBatch.length > 0) {
            const telegramId = category.user?.telegramId;
            console.log(`📩 [Worker] Đang chuẩn bị gửi Telegram cho user: ${telegramId}`);
            if (telegramId) {
                await sendBatchTelegram(newItemsBatch, category, telegramId);
            }
        } else if (isColdStart) {
            console.log(`✅ [Cold Start] Đã nạp xong mốc khởi điểm cho Category [ID:${category.id}]. Im lặng.`);
        }

        // ✅ Xóa DOM rác định kỳ để giảm RAM Chromium (giữ nguyên JS context cho fetch)
        if (scanCount > 0 && scanCount % DOM_CLEAR_INTERVAL === 0 && activePage) {
            try {
                await activePage.evaluate(() => { document.body.innerHTML = ''; });
                console.log(`🧹 [RAM] Đã xóa DOM rác sau ${scanCount} vòng quét.`);
            } catch (e) { }
        }

    } catch (err) {
        // Lỗi timeout của Playwright hoặc lỗi mạng
        console.log(`⚠️ Lỗi/Timeout khi quét [ID:${category.id}]. Đang lấy log debug...`);
        if (activePage) {
            try {
                const currentUrl = activePage.url();
                const currentTitle = await activePage.title();
                console.log(`   -> [Debug] URL hiện tại: ${currentUrl}`);
                console.log(`   -> [Debug] Title màn hình: ${currentTitle}`);
            } catch (e) {
                console.log(`   -> [Debug] Không lấy được thông tin trang.`);
            }
        }
        console.log(`   -> [Debug] Nội dung lỗi: ${err.message}`);

        // Dọn dẹp tab lỗi → vòng sau sẽ goto() tạo lại
        if (activePage) {
            try { await activePage.close(); } catch (e) { }
            activePage = null;
            cachedApiConfig = null;
            console.log(`   -> [Recover] Đã xóa Tab lỗi. Sẽ goto() lại ở vòng sau.`);
        }
    }
}

/**
 * Vòng lặp chính của hệ thống Crawler
 * ✅ Thêm cơ chế Auto-Restart browser sau N vòng để xả Memory Leak triệt để
 */
export async function startCrawlerLoop() {
    if (!isRunning) return;

    if (activeCategories.length === 0) {
        console.log("⏳ [Worker] Chưa có Category tìm kiếm nào trong RAM. Đang chờ...");
        setTimeout(startCrawlerLoop, CRAWL_INTERVAL);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét #${scanCount + 1}...`);
    isCrawling = true;

    try {
        // ✅ Auto-Restart Browser sau N vòng quét để xả RAM triệt để (chống Memory Leak Chromium)
        if (scanCount >= BROWSER_RESTART_INTERVAL) {
            console.log(`♻️ [Auto-Restart] Đã quét ${scanCount} vòng. Đang restart browser để xả RAM...`);
            if (activePage) {
                try { await activePage.close(); } catch (e) { }
                activePage = null;
                cachedApiConfig = null;
            }
            if (persistentBrowser) {
                try { await persistentBrowser.close(); } catch (e) { }
                persistentBrowser = null;
                persistentContext = null;
            }
            scanCount = 0;
            console.log(`♻️ [Auto-Restart] Browser đã được restart thành công.`);
        }

        const { context } = await getOrCreateBrowser();

        // ✅ Chỉ quét category đầu tiên (1 user, 1 category)
        const category = activeCategories[0];
        if (category) {
            await scanSingleCategory(context, category);
            scanCount++;
        }

    } catch (error) {
        console.error('❌ [Worker] Lỗi Crawler:', error);
        // Nếu browser bị crash, reset toàn bộ
        if (persistentBrowser) {
            try { await persistentBrowser.close(); } catch (e) { }
            persistentBrowser = null;
            persistentContext = null;
        }
        activePage = null;
        cachedApiConfig = null;
    }

    isCrawling = false;
    if (!isRunning) return;

    // Lên lịch chạy lượt tiếp theo
    console.log(`⏳ [Worker] Đã xong. Nghỉ ${CRAWL_INTERVAL / 1000}s...`);
    setTimeout(startCrawlerLoop, CRAWL_INTERVAL);
}

/**
 * ✅ Graceful Shutdown - Dừng crawler và đóng browser sạch sẽ
 */
export async function stopCrawler() {
    isRunning = false;
    console.log("🛑 [Worker] Crawler đã bị dừng.");
    // Đóng tab đang mở
    if (activePage) {
        try { await activePage.close(); } catch (e) { }
        activePage = null;
        cachedApiConfig = null;
    }
    // Đóng persistent browser
    if (persistentBrowser) {
        try { await persistentBrowser.close(); } catch (e) { }
        persistentBrowser = null;
        persistentContext = null;
    }
}
