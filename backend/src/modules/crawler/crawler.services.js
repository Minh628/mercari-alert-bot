import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import TelegramBot from 'node-telegram-bot-api';
import { inMemoryCategories } from '../../services/data.service.js';

dotenv.config();
chromium.use(stealth());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const sentItemsCache = new Set();
let isRunning = true;

// Hàm tạo khoảng dừng ngẫu nhiên an toàn (chống block IP)
const randomDelay = (min = 3000, max = 7000) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

/**
 * Dựng URL tìm kiếm Mercari từ object cấu hình
 * Dấu phẩy trong item_condition_id và brand_id sẽ được encode thành %2C
 */
function buildSearchUrl(category) {
    const params = new URLSearchParams();
    params.set('category_id', category.category_id);
    params.set('sort', 'created_time');
    params.set('order', 'desc');

    // Các filter tùy chọn
    if (category.item_condition_id) {
        // Thay dấu phẩy bằng %2C (URLSearchParams tự encode)
        params.set('item_condition_id', category.item_condition_id);
    }
    if (category.status) {
        params.set('status', category.status);
    }
    if (category.brand_id) {
        params.set('brand_id', category.brand_id);
    }
    if (category.price_min != null) {
        params.set('price_min', category.price_min);
    }
    if (category.price_max != null) {
        params.set('price_max', category.price_max);
    }

    return `https://jp.mercari.com/search?${params.toString()}`;
}

export async function startCrawlerLoop() {
    if (!isRunning) return;

    if (inMemoryCategories.length === 0) {
        console.log("⏳ [Worker] Chưa có cấu hình tìm kiếm nào. Đang chờ...");
        setTimeout(startCrawlerLoop, 10000);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét mới với ${inMemoryCategories.length} cấu hình...`);
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

        // Bắt API response ngầm để lấy data
        page.on('response', async (response) => {
            // Bắt tỷ giá VNĐ từ API country
            if (response.url().includes('country?country_code=VN')) {
                try {
                    const data = await response.json();
                    exchangeRate = data?.data?.exchange_rate || data?.exchange_rate || data?.rate || exchangeRate;
                } catch (e) { }
            }

            // Bắt kết quả tìm kiếm sản phẩm
            if (response.url().includes('entities:search')) {
                try {
                    const data = await response.json();
                    if (data && data.items) {
                        for (const item of data.items) {
                            if (!sentItemsCache.has(item.id) && item.status === 'ITEM_STATUS_ON_SALE') {
                                sentItemsCache.add(item.id);
                                const priceJPY = item.price;

                                console.log(`✈️ [Mới] ${item.name}`);
                                if (exchangeRate) {
                                    const priceVND = priceJPY * exchangeRate;
                                    console.log(`   Giá: ${priceJPY.toLocaleString('ja-JP')} JPY (~ ${priceVND.toLocaleString('vi-VN')} VNĐ)`);
                                } else {
                                    console.log(`   Giá: ${priceJPY.toLocaleString('ja-JP')} JPY`);
                                }
                                console.log(`   Link: https://jp.mercari.com/item/${item.id}`);

                                // Bỏ comment dòng dưới để bot chạy thực sự:
                                // bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🔥 MỚI: ${item.name} - ${priceJPY} JPY\nhttps://jp.mercari.com/item/${item.id}`);
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        // 2. Lặp qua các cấu hình Category trên 1 Tab duy nhất
        for (const category of inMemoryCategories) {
            const searchUrl = buildSearchUrl(category);
            console.log(`🔄 Đang quét: [${category.name}] → ${searchUrl}`);

            try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
                // Đợi Mercari API trả về kết quả
                await page.waitForTimeout(10000);
            } catch (err) {
                console.log(`⚠️ Lỗi mạng khi quét ${category.name}, bỏ qua...`);
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

