import followService from './follow.service.js';

// --- GET: Lấy danh sách Follow của user hiện tại ---
export const getFollowsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const follows = await followService.getAllFollows(userId);
        return res.status(200).json({
            message: "Lấy danh sách thành công!",
            follows
        });
    } catch (error) {
        console.error('[Follow] GET error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- ADD: Thêm Follow tìm kiếm mới ---
export const addFollowController = async (req, res) => {
    try {
        const userId = req.user.id;
        const newFollow = await followService.addFollow(userId, req.body);

        return res.status(201).json({
            message: "Thêm Follow thành công!",
            follow: newFollow,
        });

    } catch (error) {
        if (error.message === "MISSING_KEYWORD_OR_CATEGORY") {
            return res.status(400).json({ error: "Vui lòng cung cấp keyword hoặc category_id!" });
        }
        console.error('[Follow] POST error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- DELETE: Xóa Follow tìm kiếm theo ID ---
export const deleteFollowController = async (req, res) => {
    try {
        const userId = req.user.id;
        await followService.deleteFollow(req.params.id, userId);

        return res.status(200).json({
            message: "Xóa Follow thành công!",
            id: req.params.id
        });
    } catch (error) {
        if (error.message === "MISSING_ID") {
            return res.status(400).json({ error: "Vui lòng cung cấp ID cần xóa!" });
        }
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({ error: "Không tìm thấy Follow với ID này!" });
        }
        console.error('[Follow] DELETE error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- UPDATE: Cập nhật Follow tìm kiếm theo ID ---
export const updateFollowController = async (req, res) => {
    try {
        const userId = req.user.id;
        await followService.updateFollow(req.params.id, userId, req.body);
        return res.status(200).json({
            message: "Cập nhật Follow thành công!",
        });
    } catch (error) {
        if (error.message === "MISSING_ID") {
            return res.status(400).json({ error: "Vui lòng cung cấp ID cần cập nhật!" });
        }
        if (error.message === "NOT_FOUND") {
            return res.status(404).json({ error: "Không tìm thấy Follow với ID này!" });
        }
        console.error('[Follow] UPDATE error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};

// --- 👑 ADMIN: Xem tất cả Follows của mọi User ---
export const getAllFollowsAdminController = async (req, res) => {
    try {
        const follows = await followService.getAllFollowsAdmin();
        return res.status(200).json({
            message: "Lấy tất cả Follows thành công!",
            follows
        });
    } catch (error) {
        console.error('[Follow] GET ALL (Admin) error:', error);
        return res.status(500).json({ error: "Lỗi server" });
    }
};
