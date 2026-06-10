import { inMemoryKeywords, saveKeywords } from '../../services/data.service.js';

// --- GET: Lấy danh sách từ khóa ---
export const getKeywordsController = (req, res) => {
    try {
        return res.status(200).json({
            message: "Lấy danh sách thành công!",
            keywords: inMemoryKeywords
        });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- ADD: Thêm từ khóa mới ---
export const addKeywordController = (req, res) => {
    try {
        const { keyword } = req.body;

        if (!keyword) {
            return res.status(400).json({ error: "Vui lòng nhập từ khóa!" });
        }

        const trimmedKeyword = keyword.trim();

        if (inMemoryKeywords.includes(trimmedKeyword)) {
            return res.status(400).json({ error: "Từ khóa đã tồn tại!" });
        }

        // Thêm vào mảng tạm
        const updatedKeywords = [...inMemoryKeywords, trimmedKeyword];
        // Lưu xuống file json (Hybrid)
        saveKeywords(updatedKeywords);

        return res.status(200).json({
            message: "Thêm từ khóa thành công!",
            keywords: inMemoryKeywords
        });

    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- DELETE: Xóa từ khóa ---
export const deleteKeywordController = (req, res) => {
    try {
        const { keyword } = req.params;

        if (!keyword) {
            return res.status(400).json({ error: "Vui lòng cung cấp từ khóa cần xóa!" });
        }

        const updatedKeywords = inMemoryKeywords.filter(k => k !== keyword);
        saveKeywords(updatedKeywords);

        return res.status(200).json({
            message: "Xóa từ khóa thành công!",
            keywords: inMemoryKeywords
        });
    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};
