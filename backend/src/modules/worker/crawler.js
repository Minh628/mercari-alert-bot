import dotenv from 'dotenv';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import TelegramBot from 'node-telegram-bot-api';

dotenv.config();
chromium.use(stealth());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const sentItemsCache = new Set();
let isRunning = true;
// Mảng chứa các từ khóa đang được quét (Thay thế tạm cho Database)
export const activeKeywords = [];

// Hàm này sẽ được Controller gọi khi Frontend gửi từ khóa xuống
export function addNewKeyword(keyword) {
    if (!activeKeywords.includes(keyword)) {
        activeKeywords.push(keyword);
        console.log(`\n📥 [Worker] Đã nhận lệnh bổ sung từ khóa mới: ${keyword}`);
    }
}

export async function startCrawlerEngine() {
    console.log(`\n🚀 [Worker] Cỗ máy săn hàng đã khởi động ngầm...`);

    const browser = await chromium.launch({
        headless: false, // Bật lên xem cho sướng mắt
        channel: 'chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Lắng nghe API ngầm
    page.on('response', async (response) => {
        if (response.url().includes('entities:search')) {
            try {
                const data = await response.json();
                if (data && data.items) {
                    for (const item of data.items) {
                        if (!sentItemsCache.has(item.id)) {
                            sentItemsCache.add(item.id);
                            // Bắn Telegram (Chỉ log ra để test, khi nào chạy thật thì mở comment bot.sendMessage)
                            console.log(`✈️ [Telegram] Phát hiện hàng mới: ${item.name} - ${item.price} JPY`);
                            // await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `🔥 MỚI: ${item.name} - ${item.price} JPY`);
                        }
                    }
                }
            } catch (e) { }
        }
    });

    // VÒNG LẶP VÔ TẬN
    while (isRunning) {
        if (activeKeywords.length === 0) {
            console.log("⏳ [Worker] Chưa có từ khóa nào. Đang chờ lệnh từ Frontend...");
            await page.waitForTimeout(5000);
            continue; // Bỏ qua vòng lặp, quay lại chờ tiếp
        }

        for (const keyword of activeKeywords) {
            console.log(`\n🔄 [Quét] Đang check hàng cho: [${keyword.toUpperCase()}]`);
            const searchUrl = `https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}&sort=created_time&order=desc`;
            
            try {
                await page.goto(searchUrl, { waitUntil: 'networkidle' });
                await page.waitForTimeout(10000); // Đợi 10s cho API Mercari trả về
            } catch (err) {
                console.log(`⚠️ Lỗi mạng, bỏ qua...`);
            }
        }
        console.log("⏳ Nghỉ 10 giây trước khi quét vòng tiếp theo...");
        await page.waitForTimeout(10000);
    }
}
