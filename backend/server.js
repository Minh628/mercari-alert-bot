import dotenv from 'dotenv';
import app from './src/app.js';

// Load biến môi trường
dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});