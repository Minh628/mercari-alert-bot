import followRoutes from '../modules/follow/follow.routes.js';
import userRoutes from '../modules/user/user.routes.js';

/**
 * Setup tất cả các routes của ứng dụng
 * @param {Object} app - Express app instance
 */
export const setupRoutes = (app) => {
    // --- Routes Mounting ---
    app.use('/api/follows', followRoutes);
    app.use('/api/users', userRoutes);


    // Route mặc định kiểm tra server
    app.get('/', (req, res) => {
        res.send('Mercari Alert Bot API is running...');
    });
    
    // ✅ FEAT #1: Health Check - Dùng UptimeRobot ping để chống Render Sleep
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'ok',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    });


    app.all(/.*/, (req, res) => {
        res.status(404).json({
            status: 'fail',
            message: `Không tìm thấy đường dẫn ${req.originalUrl} trên server này!`
        });
    });
};