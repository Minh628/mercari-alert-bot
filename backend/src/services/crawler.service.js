import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import TelegramBot from 'node-telegram-bot-api';
// Sử dụng Prisma trực tiếp thay cho file JSON cũ
import prisma from '../config/prisma.js';
// Tích hợp Item Manager để tối ưu bộ nhớ và DB (Sliding Window)
import itemManagerService from './itemManager.service.js';

dotenv.config({
    quiet: true 
}
    
);
chromium.use(stealth());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

let isRunning = true;

// --- BIẾN RAM NỘI BỘ (Event-Driven Cache) ---
// Chứa danh sách các cấu hình tìm kiếm hiện tại, giúp vòng lặp không phải query DB liên tục.
let activeCategories = [];

/**
 * Tín hiệu (Signal) để Crawler tải lại danh sách Category từ DB vào RAM.
 * Hàm này được gọi từ category.service.js mỗi khi người dùng Thêm/Sửa/Xóa.
 */
export async function triggerReloadCategories() {
    try {
        console.log("🔄 [Worker] Nhận tín hiệu, đang tải lại Categories từ Database...");
        activeCategories = await prisma.category.findMany({
            orderBy: { id: 'desc' },
            select: {
                id: true,
                categoryId: true,
                itemConditionId: true,
                status: true,
                brandId: true,
                priceMin: true,
                priceMax: true
            }
        });
        console.log(`✅ [Worker] Đã tải ${activeCategories.length} Categories vào RAM.`);
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
    // Đã chuyển camelCase theo Prisma schema
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

export async function startCrawlerLoop() {
    if (!isRunning) return;

    if (activeCategories.length === 0) {
        console.log("⏳ [Worker] Chưa có Category tìm kiếm nào trong RAM. Đang chờ...");
        setTimeout(startCrawlerLoop, 10000);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét mới với ${activeCategories.length} Category...`);
    let browser = null;

    try {
        // 1. Launch Browser tối ưu RAM (headless mode)
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
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
        let currentCategoryId = null; // Biến tạm giúp Response Listener biết nó thuộc Category nào

        // Bắt API response ngầm để lấy data
        page.on('response', async (response) => {
            // Bắt tỷ giá VNĐ từ API country
            if (response.url().includes('country?country_code=VN')) {
                try {
                    const data = await response.json();
                    exchangeRate = data?.data?.exchange_rate || data?.exchange_rate || data?.rate || exchangeRate;
                } catch (e) { }
            }

            // Bắt kết quả tìm kiếm sản phẩm (bắt buộc phải có currentCategoryId)
            if (response.url().includes('entities:search') && currentCategoryId != null) {
                try {
                    const data = await response.json();
                    if (data && data.items) {
                        for (const item of data.items) {
                            if (item.status === 'ITEM_STATUS_ON_SALE') {
                                
                                // TÍCH HỢP ITEM MANAGER: 
                                // O(1) Check Cache -> Lưu DB (Composite Key) -> Xóa Sliding Window
                                const isNewItem = await itemManagerService.processNewItem(currentCategoryId, item.id);

                                if (isNewItem) {
                                    const priceJPY = item.price;
                                    console.log(`✈️ [Mới] ${item.name}`);
                                    if (exchangeRate) {
                                        const priceVND = priceJPY * exchangeRate;
                                        console.log(`   Giá: ${priceJPY.toLocaleString('ja-JP')} JPY (~ ${priceVND.toLocaleString('vi-VN')} VNĐ)`);
                                    } else {
                                        console.log(`   Giá: ${priceJPY.toLocaleString('ja-JP')} JPY`);
                                    }
                                    console.log(`   Link: https://jp.mercari.com/item/${item.id}`);

                                    // Uncomment để chạy bot thật:
                                    // bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🔥 MỚI: ${item.name} - ${priceJPY} JPY\nhttps://jp.mercari.com/item/${item.id}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore JSON parsing errors for partial responses
                }
            }
        });

        // 2. Lặp qua các cấu hình Category trên 1 Tab duy nhất
        for (const category of activeCategories) {
            currentCategoryId = category.id; // Gán ID để Listener dùng lưu Item Manager
            const searchUrl = buildSearchUrl(category);
            console.log(`🔄 Đang quét [ID:${category.id}]: → ${searchUrl}`);

            try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
                // Đợi Mercari API trả về kết quả
                await page.waitForTimeout(10000);
            } catch (err) {
                console.log(`⚠️ Lỗi mạng khi quét ${searchUrl}, bỏ qua...`);
            }

            // Random delay giữa các lần tìm kiếm
            await randomDelay(3000, 6000);
        }
    } catch (error) {
        console.error('❌ [Worker] Lỗi Crawler:', error);
    } finally {
        // 3. Đóng Browser ngay sau khi vòng lặp hoàn thành để giải phóng RAM
        if (browser) {
            await browser.close();
        }
    }

    // 4. Lên lịch chạy lượt tiếp theo sau 10 giây
    console.log("⏳ [Worker] Đã xong 1 vòng. Nghỉ 10s giải nhiệt...");
    setTimeout(startCrawlerLoop, 10000);
}

export function stopCrawler() {
    isRunning = false;
    console.log("🛑 [Worker] Crawler đã bị dừng.");
}
