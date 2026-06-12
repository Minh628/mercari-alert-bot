import categoryRoutes from '../routes/category.routes.js';
import userRoutes from '../routes/user.routes.js';
import itemRoutes from '../routes/item.routes.js';

/**
 * Setup tất cả các routes của ứng dụng
 * @param {Object} app - Express app instance
 */
export const setupRoutes = (app) => {
    // --- Routes Mounting ---
    app.use('/api/categories', categoryRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/items', itemRoutes);


    // Route mặc định kiểm tra server
    app.get('/', (req, res) => {
        res.send('Mercari Alert Bot API is running...');
    });


    app.all(/.*/, (req, res) => {
        res.status(404).json({
            status: 'fail',
            message: `Không tìm thấy đường dẫn ${req.originalUrl} trên server này!`
        });
    });
};