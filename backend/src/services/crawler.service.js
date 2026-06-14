import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import telegramBotService from './telegramBot.service.js';
// Sử dụng Prisma trực tiếp thay cho file JSON cũ
import prisma from '../config/prisma.js';
// Tích hợp Item Manager để tối ưu bộ nhớ và DB (Sliding Window)
import itemManagerService from './itemManager.service.js';

dotenv.config({ quiet: true });
chromium.use(stealth());

let isRunning = true;

// --- BIẾN RAM NỘI BỘ (Event-Driven Cache) ---
// Chứa danh sách các cấu hình tìm kiếm hiện tại (kèm telegramId của user sở hữu)
let activeCategories = [];

// --- PERSISTENT BROWSER: Giữ 1 browser instance xuyên suốt thay vì mở/đóng liên tục ---
let persistentBrowser = null;

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
                    expiredAt: { gt: new Date() }
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
    if (persistentBrowser && persistentBrowser.isConnected()) {
        return persistentBrowser;
    }
    // Launch browser mới với cấu hình tối ưu RAM cho Render
    console.log("🌐 [Worker] Đang khởi tạo Browser mới...");
    persistentBrowser = await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            // Giới hạn RAM cho Chromium (~128MB thay vì mặc định ~300MB+)
            '--js-flags=--max-old-space-size=128',
            '--single-process'
        ]
    });
    return persistentBrowser;
}

export async function startCrawlerLoop() {
    if (!isRunning) return;

    if (activeCategories.length === 0) {
        console.log("⏳ [Worker] Chưa có Category tìm kiếm nào trong RAM. Đang chờ...");
        setTimeout(startCrawlerLoop, 10000);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét mới với ${activeCategories.length} Category...`);

    try {
        // ✅ OPT: Dùng persistent browser thay vì mở/đóng mỗi vòng
        const browser = await getOrCreateBrowser();
        const context = await browser.newContext();
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

        let exchangeRate = null;
        let currentCategory = null; // ✅ Giữ reference toàn bộ category (kèm user.telegramId)
        let newItemsBatch = []; // Mảng hứng data để gom mẻ (Batching)
        let isColdStart = false; // Cờ nhận diện Khởi động nguội

        // Bắt API response ngầm để lấy data
        page.on('response', async (response) => {
            // Bắt tỷ giá VNĐ từ API country
            if (response.url().includes('country?country_code=VN')) {
                try {
                    const data = await response.json();
                    exchangeRate = data?.data?.exchange_rate || data?.exchange_rate || data?.rate || exchangeRate;
                } catch (e) { }
            }

            // Bắt kết quả tìm kiếm sản phẩm (bắt buộc phải có currentCategory)
            if (response.url().includes('entities:search') && currentCategory != null) {
                try {
                    const data = await response.json();
                    if (data && data.items) {
                        for (const item of data.items) {
                            if (item.status === 'ITEM_STATUS_ON_SALE') {

                                // TÍCH HỢP ITEM MANAGER:
                                // O(1) Check Cache -> Lưu DB (Composite Key) -> Xóa Sliding Window
                                const isNewItem = await itemManagerService.processNewItem(currentCategory.id, item.id);

                                if (isNewItem) {
                                    const priceJPY = item.price;
                                    console.log(`✈️ [Mới] ${item.name}`);

                                    // 🌟 KHỞI ĐỘNG NGUỘI VÀ GOM MẺ
                                    // Nếu đang trong lượt Khởi động nguội (isColdStart = true)
                                    // thì KHÔNG làm gì thêm, itemManagerService.processNewItem đã âm thầm nạp nó vào RAM/DB rồi.
                                    if (!isColdStart) {
                                        // Ghi nhận món hàng mới vào mảng để chờ Batching gửi tin 1 lần
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
                } catch (e) {
                    // Bỏ qua lỗi JSON parsing cho các partial responses
                }
            }
        });

        // Lặp qua các cấu hình Category trên 1 Tab duy nhất
        for (const category of activeCategories) {
            currentCategory = category; // ✅ Gán toàn bộ object (kèm user.telegramId)
            newItemsBatch = []; // Reset mảng gom mẻ cho Category mới
            
            // Kiểm tra dung lượng RAM hiện tại để xác định Khởi Động Nguội
            const cacheSize = itemManagerService.cache.get(category.id)?.size || 0;
            isColdStart = (cacheSize === 0);
            
            if (isColdStart) {
                console.log(`❄️ [Cold Start] Khởi động nguội Category [ID:${category.id}]. Đang lấy mốc...`);
            }

            const searchUrl = buildSearchUrl(category);
            console.log(`🔄 Đang quét [ID:${category.id}]: → ${searchUrl}`);

            try {
                // ✅ OPT #2: Dùng waitForResponse thay vì waitForTimeout(10000) để tiết kiệm CPU
                await Promise.race([
                    (async () => {
                        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
                        // Chờ API trả về kết quả tìm kiếm (tối đa 15s)
                        await page.waitForResponse(
                            resp => resp.url().includes('entities:search'),
                            { timeout: 15000 }
                        );
                        // Chờ thêm 2s để listener xử lý xong response
                        await new Promise(r => setTimeout(r, 2000));
                    })(),
                    // Timeout tổng 20s phòng trường hợp API không trả về
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
                ]);
            } catch (err) {
                console.log(`⚠️ Lỗi/Timeout khi quét [ID:${category.id}], bỏ qua...`);
            }

            // --- BATCHING: Gửi Telegram Gom Mẻ ---
            if (!isColdStart && newItemsBatch.length > 0) {
                const telegramId = currentCategory.user?.telegramId;
                if (telegramId) {
                    // Tạo thông điệp gom mẻ
                    let messageText = `🔥 [MỚI] Tìm thấy ${newItemsBatch.length} món cho "${category.categoryId}":\n\n`;
                    
                    newItemsBatch.forEach((item, index) => {
                        const priceVND = exchangeRate ? Math.round(item.price * exchangeRate) : null;
                        const priceText = priceVND ? `${item.price.toLocaleString('ja-JP')}¥ (~${priceVND.toLocaleString('vi-VN')}đ)` : `${item.price.toLocaleString('ja-JP')}¥`;
                        const brandInfo = item.brandName ? ` - *${item.brandName}*` : '';
                        const sizeInfo = item.size ? ` (Size: ${item.size})` : '';

                        messageText += `${index + 1}. ${item.name}${brandInfo}${sizeInfo}\n`;
                        messageText += `💰 Giá: ${priceText}\n`;
                        messageText += `🔗 [Xem ngay](https://jp.mercari.com/item/${item.id})\n\n`;
                    });

                    // Gọi Singleton Telegram Bot gửi 1 tin duy nhất
                    telegramBotService.sendMessage(telegramId, messageText, {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: false // Tự động hiển thị thumbnail của link đầu tiên
                    });
                    
                    console.log(`📲 Đã gửi Batching ${newItemsBatch.length} món cho Telegram ${telegramId}`);
                }
            } else if (isColdStart) {
                console.log(`✅ [Cold Start] Đã nạp xong mốc khởi điểm cho Category [ID:${category.id}]. Im lặng.`);
            }

            // Random delay giữa các lần tìm kiếm (chống block IP)
            await randomDelay(3000, 6000);
        }

        // Đóng context (tab) sau mỗi vòng, nhưng GIỮ browser
        await context.close();
    } catch (error) {
        console.error('❌ [Worker] Lỗi Crawler:', error);
        // Nếu browser bị crash, reset persistent browser
        if (persistentBrowser) {
            try { await persistentBrowser.close(); } catch (e) { }
            persistentBrowser = null;
        }
    }

    // Lên lịch chạy lượt tiếp theo sau 10 giây
    console.log("⏳ [Worker] Đã xong 1 vòng. Nghỉ 10s giải nhiệt...");
    setTimeout(startCrawlerLoop, 10000);
}

/**
 * ✅ OPT #3: Graceful Shutdown - Dừng crawler và đóng browser sạch sẽ
 */
export async function stopCrawler() {
    isRunning = false;
    console.log("🛑 [Worker] Crawler đã bị dừng.");
    // Đóng persistent browser nếu còn
    if (persistentBrowser) {
        try { await persistentBrowser.close(); } catch (e) { }
        persistentBrowser = null;
    }
}
