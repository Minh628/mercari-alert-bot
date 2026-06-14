import prisma from '../src/config/prisma.js';

async function runBenchmark() {
    console.log("🚀 BẮT ĐẦU CHẠY BENCHMARK RAM VS DATABASE (NEON)...\\n");
    const ITEMS_COUNT = 100;
    
    // 1. CHUẨN BỊ MÔI TRƯỜNG DỮ LIỆU TẠM THỜI (DUMMY DATA)
    console.log("⏳ Đang khởi tạo Category ảo trên Neon Database để test...");
    let tempUser, tempCategory;
    try {
        tempUser = await prisma.user.create({
            data: {
                username: `test_user_${Date.now()}`,
                password: 'abc',
                expiredAt: new Date()
            }
        });
        tempCategory = await prisma.category.create({
            data: {
                userId: tempUser.id,
                categoryId: 'benchmark_cat_123'
            }
        });
    } catch (e) {
        console.error("❌ Lỗi tạo dữ liệu ảo:", e);
        process.exit(1);
    }
    
    // Tạo sẵn mảng ID món hàng ngẫu nhiên để Test
    const dummyItems = Array.from({ length: ITEMS_COUNT }, (_, i) => `item_m${Date.now()}_${i}`);
    console.log(`✅ Đã chuẩn bị ${ITEMS_COUNT} Items ảo để đua tốc độ.\\n`);
    
    // ============================================
    // ROUND 1: DATABASE MODE (NEON SERVERLESS)
    // ============================================
    console.log(`⏱️ [ROUND 1] Chạy chế độ DATABASE (Thêm & Xoá ${ITEMS_COUNT} Items)...`);
    const dbStartTime = Date.now();
    
    // Thêm (Insert) 100 items vào DB theo tuần tự từng request một (Mô phỏng Crawler cũ)
    for (const itemId of dummyItems) {
        await prisma.item.create({
            data: {
                id: itemId,
                categoryId: tempCategory.id
            }
        });
    }
    
    // Xoá 50 món cũ nhất từ DB (Mô phỏng Sliding Window cũ)
    const oldestItems = await prisma.item.findMany({
        where: { categoryId: tempCategory.id },
        take: 50,
        select: { id: true }
    });
    const oldestItemIds = oldestItems.map(i => i.id);
    await prisma.item.deleteMany({
        where: {
            id: { in: oldestItemIds },
            categoryId: tempCategory.id
        }
    });
    
    const dbEndTime = Date.now();
    const dbExecutionTime = dbEndTime - dbStartTime;
    console.log(`🔴 [KẾT QUẢ DATABASE]: Xong trong ${dbExecutionTime} ms.\\n`);
    
    // ============================================
    // ROUND 2: RAM MODE (IN-MEMORY SET)
    // ============================================
    console.log(`⏱️ [ROUND 2] Chạy chế độ THUẦN RAM (Thêm & Xoá ${ITEMS_COUNT} Items)...`);
    const ramCache = new Set();
    const ramStartTime = Date.now();
    
    // Thêm (Insert) 100 items vào RAM
    for (const itemId of dummyItems) {
        ramCache.add(itemId);
    }
    
    // Xóa 50 món cũ nhất khỏi RAM (Sử dụng Iterator)
    const iterator = ramCache.values();
    for (let i = 0; i < 50; i++) {
        const oldestItem = iterator.next().value;
        if (oldestItem) {
            ramCache.delete(oldestItem);
        }
    }
    
    const ramEndTime = Date.now();
    const ramExecutionTime = ramEndTime - ramStartTime;
    console.log(`🟢 [KẾT QUẢ RAM]: Xong trong ${ramExecutionTime} ms.\\n`);
    
    // ============================================
    // DỌN DẸP CHIẾN TRƯỜNG & KẾT LUẬN
    // ============================================
    console.log("🧹 Đang dọn dẹp Database ảo...");
    await prisma.user.delete({ where: { id: tempUser.id }}); // Cascade xoá hết
    await prisma.$disconnect();
    
    console.log("=============================================");
    console.log("🏆 BẢNG VÀNG THÀNH TÍCH TỐC ĐỘ 🏆");
    console.log(`1. Chạy trên Database (Neon):   ${dbExecutionTime} ms`);
    console.log(`2. Chạy trên RAM (Phiên bản Mới): ${ramExecutionTime} ms`);
    
    const timesFaster = dbExecutionTime > 0 && ramExecutionTime > 0 
        ? (dbExecutionTime / ramExecutionTime).toFixed(0) 
        : "Vô Cực";
    
    console.log(`\\n🔥 KẾT LUẬN: Code RAM chạy NHANH HƠN CODE CŨ GẤP ~${timesFaster} LẦN!`);
    console.log(`=> Neon DB đã được cứu rỗi khỏi ${(dbExecutionTime/1000).toFixed(2)}s ngốn Compute Unit!`);
}

runBenchmark().catch(console.error);
