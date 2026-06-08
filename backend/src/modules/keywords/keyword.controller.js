import { addNewKeyword, activeKeywords } from '../crawler/crawler.services.js';

export const addKeywordController = (req, res) => {
    try {
        const { keyword } = req.body;

        if (!keyword) {
            return res.status(400).json({ error: "Vui lòng nhập từ khóa!" });
        }

        // Gọi hàm của Worker để nạp từ khóa vào mảng đang chạy
        addNewKeyword(keyword);

        // Trả kết quả về cho Frontend
        return res.status(200).json({
            message: "Thêm từ khóa thành công!",
            currentList: activeKeywords
        });

    } catch (error) {
        return res.status(500).json({ error: "Lỗi server" });
    }
};
