const sql = require('mssql'); 
require('dotenv').config();

const dbConfig = {
    user: 'sa',
    password: 'Hnatn061504@', // Mật khẩu chuẩn từ file SQLQuery1.sql
    server: 'localhost', // Đổi về localhost để ép kết nối thẳng vào máy
    database: process.env.DB_NAME || 'MedBook_DB',
    options: {
        encrypt: false, // Phải để false khi chạy local
        trustServerCertificate: true 
    }
};

// *Lưu ý: Nếu 'localhost' ở trên vẫn báo lỗi Port, bạn hãy sửa lại dòng server thành:
// server: 'localhost\\HP',

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối SQL Server thành công!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi Database:', err.message);
    });

module.exports = { sql, poolPromise };