const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { poolPromise } = require('../config/db');
require('dotenv').config();

const authController = {
    // 1. API Đăng ký tài khoản
    register: async (req, res) => {
        try {
            const { fullName, phone, password } = req.body;
            const pool = await poolPromise;

            // Kiểm tra xem số điện thoại đã tồn tại chưa
            const checkUser = await pool.request()
                .input('Phone', phone)
                .query('SELECT * FROM Users WHERE Phone = @Phone');

            if (checkUser.recordset.length > 0) {
                return res.status(400).json({ message: "Số điện thoại này đã được đăng ký!" });
            }

            // Mã hóa (băm) mật khẩu trước khi lưu
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Lưu người dùng mới vào DB
            await pool.request()
                .input('FullName', fullName)
                .input('Phone', phone)
                .input('PasswordHash', hashedPassword)
                .query(`
                    INSERT INTO Users (FullName, Phone, PasswordHash) 
                    VALUES (@FullName, @Phone, @PasswordHash)
                `);

            res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            res.status(500).json({ message: "Lỗi hệ thống máy chủ." });
        }
    },

    // 2. API Đăng nhập
    login: async (req, res) => {
        try {
            const { phone, password } = req.body;
            const pool = await poolPromise;

            // Tìm user theo số điện thoại
            const result = await pool.request()
                .input('Phone', phone)
                .query('SELECT * FROM Users WHERE Phone = @Phone');

            const user = result.recordset[0];
            if (!user) {
                return res.status(404).json({ message: "Không tìm thấy tài khoản với số điện thoại này!" });
            }

            // So sánh mật khẩu người dùng nhập với mật khẩu đã mã hóa trong DB
            const isMatch = await bcrypt.compare(password, user.PasswordHash);
            if (!isMatch) {
                return res.status(400).json({ message: "Mật khẩu không chính xác!" });
            }

            // Tạo Token đăng nhập (JWT)
            const token = jwt.sign(
                { userId: user.UserID, fullName: user.FullName, phone: user.Phone },
                process.env.JWT_SECRET,
                { expiresIn: '1d' } // Token có hạn 1 ngày
            );

            // Trả về thông tin (không bao gồm password) và token
            res.status(200).json({
                message: "Đăng nhập thành công!",
                token: token,
                user: {
                    id: user.UserID,
                    fullName: user.FullName,
                    phone: user.Phone
                }
            });
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            res.status(500).json({ message: "Lỗi hệ thống máy chủ." });
        }
    }
};

module.exports = authController;