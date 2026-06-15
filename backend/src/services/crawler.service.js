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
const CRAWLER_TIMEOUT = 30000; // Tăng lên 30s cho Render Free
const DELAY_MIN = 3000;
const DELAY_MAX = 6000;
const CRAWL_INTERVAL = 10000;
const CHUNK_SIZE = 10;
const MAX_TABS = 3; // ✅ OPT: Số lượng tab tối đa mở cùng lúc (Tối ưu RAM 512MB)

let isRunning = true;
let isCrawling = false;

// --- BIẾN RAM NỘI BỘ (Event-Driven Cache) ---
// Chứa danh sách các cấu hình tìm kiếm hiện tại (kèm telegramId của user sở hữu)
let activeCategories = [];
// LRU Cache chứa các tab đang mở
let pagePool = new Map();

// --- PERSISTENT BROWSER: Giữ 1 browser instance xuyên suốt thay vì mở/đóng liên tục ---
let persistentBrowser = null;
let persistentContext = null; // Giữ context để duy trì Tab sống sót qua các vòng lặp
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

        // ✅ OPT #4: Fix rò rỉ RAM (Memory Leak) - Xóa các Tab không còn thuộc activeCategories
        const activeIds = activeCategories.map(c => c.id);
        for (const [catId, page] of pagePool.entries()) {
            if (!activeIds.includes(catId)) {
                try { await page.close(); } catch (e) {}
                pagePool.delete(catId);
                console.log(`🧹 [Worker] Đã dọn dẹp Tab cũ (ID: ${catId}) khỏi RAM vì Category đã ngưng/xóa.`);
            }
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
            '--js-flags=--max-old-space-size=128' // Khóa cứng RAM cho V8 Engine của JS cực tốt
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
 * Tách biệt logic cào dữ liệu cho 1 Category duy nhất
 */
async function scanSingleCategory(context, category) {
    const cacheSize = itemManagerService.cache.get(category.id)?.size || 0;
    const isColdStart = (cacheSize === 0);

    if (isColdStart) {
        console.log(`❄️ [Cold Start] Khởi động nguội Category [ID:${category.id}]. Đang lấy mốc...`);
    }

    const searchUrl = buildSearchUrl(category);
    console.log(`🔄 Đang quét [ID:${category.id}]: → ${searchUrl}`);

    let page = null;
    try {
        const pageInfo = await getPageForCategory(context, category.id);
        page = pageInfo.page;

        // Bắt API response song song với reload hoặc goto để tránh miss event
        const responsePromise = page.waitForResponse(
            resp => resp.url().includes('entities:search') && resp.request().method() !== 'OPTIONS',
            { timeout: CRAWLER_TIMEOUT }
        );

        if (pageInfo.isReload) {
            console.log(`   -> [Action] Reloading page...`);
            await Promise.all([
                responsePromise,
                page.reload({ waitUntil: 'domcontentloaded', timeout: CRAWLER_TIMEOUT })
            ]);
        } else {
            console.log(`   -> [Action] Goto initial page...`);
            await Promise.all([
                responsePromise,
                page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: CRAWLER_TIMEOUT })
            ]);
        }
        
        const searchResponse = await responsePromise;
        const data = await searchResponse.json();
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
    } catch (err) {
        // Lỗi timeout của Playwright hoặc lỗi mạng
        console.log(`⚠️ Lỗi/Timeout khi quét [ID:${category.id}]. Đang lấy log debug...`);
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
        
        // Cơ chế Auto-Restart cho 1 Tab (Xóa tab lỗi để tạo lại ở vòng sau)
        if (pagePool.has(category.id)) {
            try { await pagePool.get(category.id).close(); } catch(e) {}
            pagePool.delete(category.id);
            console.log(`   -> [Recover] Đã xóa Tab bị lỗi khỏi Pool RAM. Sẽ khởi tạo lại ở vòng sau.`);
        }
    }
}

/**
 * Thiết lập tab (page) mới: chặn tải tài nguyên thừa và lắng nghe API tỷ giá
 * Tách logic khởi tạo Page ra để tránh God Function
 */
async function setupCrawlerPage(context) {
    const page = await context.newPage();

    // Chặn tải hình ảnh, CSS để giảm RAM
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

    return page;
}

/**
 * Lấy Tab từ Pool (LRU Cache). Nếu thiếu thì tạo, nếu đầy thì thay thế tab cũ nhất.
 */
async function getPageForCategory(context, categoryId) {
    if (pagePool.has(categoryId)) {
        // Đã có Tab -> Tái sử dụng (Cập nhật vị trí LRU bằng cách xóa và set lại)
        const page = pagePool.get(categoryId);
        pagePool.delete(categoryId);
        pagePool.set(categoryId, page);
        return { page, isReload: true };
    }

    // Chưa có Tab -> Tạo mới hoặc thay thế
    if (pagePool.size >= MAX_TABS) {
        // Lấy Tab cũ nhất (phần tử đầu tiên của Map)
        const oldestCategoryId = pagePool.keys().next().value;
        const oldPage = pagePool.get(oldestCategoryId);
        pagePool.delete(oldestCategoryId);
        try { await oldPage.close(); } catch (e) {}
        console.log(`♻️ [Pool] Đã tái chế Tab của Category [ID:${oldestCategoryId}] (Đạt giới hạn ${MAX_TABS} tabs).`);
    }

    const newPage = await setupCrawlerPage(context);
    pagePool.set(categoryId, newPage);
    return { page: newPage, isReload: false };
}

/**
 * Vòng lặp chính của hệ thống Crawler
 */
export async function startCrawlerLoop() {
    if (!isRunning) return;

    if (activeCategories.length === 0) {
        console.log("⏳ [Worker] Chưa có Category tìm kiếm nào trong RAM. Đang chờ...");
        setTimeout(startCrawlerLoop, CRAWL_INTERVAL);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét mới với ${activeCategories.length} Category...`);
    isCrawling = true;

    try {
        const { context } = await getOrCreateBrowser();

        // Lặp qua các cấu hình Category
        for (const category of activeCategories) {
            await scanSingleCategory(context, category);
            
            // Random delay giữa các lần tìm kiếm (chống block IP)
            await randomDelay(DELAY_MIN, DELAY_MAX);
        }

        // KHÔNG đóng context ở đây nữa để giữ các Tab trong pagePool sống
    } catch (error) {
        console.error('❌ [Worker] Lỗi Crawler:', error);
        // Nếu browser bị crash, reset persistent browser và dọn pool
        if (persistentBrowser) {
            try { await persistentBrowser.close(); } catch (e) { }
            persistentBrowser = null;
            persistentContext = null;
            pagePool.clear(); // Xóa sạch tab pool
        }
    }

    isCrawling = false;
    if (!isRunning) return;

    // Lên lịch chạy lượt tiếp theo
    console.log(`⏳ [Worker] Đã xong 1 vòng. Nghỉ ${CRAWL_INTERVAL / 1000}s giải nhiệt...`);
    setTimeout(startCrawlerLoop, CRAWL_INTERVAL);
}

/**
 * ✅ OPT #3: Graceful Shutdown - Dừng crawler và đóng browser sạch sẽ
 */
export async function stopCrawler() {
    isRunning = false;
    console.log("🛑 [Worker] Crawler đã bị dừng.");
    // Đóng persistent browser nếu còn, chặn deadlock 3s
    if (persistentBrowser) {
        try { await persistentBrowser.close(); } catch (e) { }
        persistentBrowser = null;
        persistentContext = null;
        pagePool.clear();
    }
}
