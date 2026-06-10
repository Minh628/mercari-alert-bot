import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import TelegramBot from 'node-telegram-bot-api';
import { inMemoryKeywords } from '../../services/data.service.js';

dotenv.config();
chromium.use(stealth());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const sentItemsCache = new Set();
let isRunning = true;

// Hàm tạo khoảng dừng ngẫu nhiên an toàn (chống block IP)
const randomDelay = (min = 3000, max = 7000) => new Promise(res => setTimeout(res, Math.floor(Math.random() * (max - min + 1) + min)));

export async function startCrawlerLoop() {
    if (!isRunning) return;

    if (inMemoryKeywords.length === 0) {
        console.log("⏳ [Worker] Chưa có từ khóa nào. Đang chờ...");
        // Đợi 10s rồi chạy lại
        setTimeout(startCrawlerLoop, 10000);
        return;
    }

    console.log(`\n🚀 [Worker] Khởi chạy lượt quét mới với ${inMemoryKeywords.length} từ khóa...`);
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

        // Bắt API response ngầm để lấy data
        page.on('response', async (response) => {
            if (response.url().includes('entities:search')) {
                try {
                    const data = await response.json();
                    if (data && data.items) {
                        for (const item of data.items) {
                            if (!sentItemsCache.has(item.id)) {
                                sentItemsCache.add(item.id);
                                console.log(`✈️ [Telegram] Phát hiện hàng mới: ${item.name} - ${item.price} JPY`);
                                // Bỏ comment dòng dưới để bot chạy thực sự:
                                // bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🔥 MỚI: ${item.name} - ${item.price} JPY\nhttps://jp.mercari.com/item/${item.id}`);
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        // 2. Lặp qua các từ khóa trên 1 Tab duy nhất
        for (const keyword of inMemoryKeywords) {
            console.log(`🔄 Đang quét: [${keyword.toUpperCase()}]`);
            const searchUrl = `https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}&sort=created_time&order=desc`;
            
            try {
                await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
                // Đợi Mercari API trả về kết quả
                await page.waitForTimeout(5000); 
            } catch (err) {
                console.log(`⚠️ Lỗi mạng khi quét ${keyword}, bỏ qua...`);
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
