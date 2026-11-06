const express = require('express');
const cors = require('cors');
const { sql, poolPromise } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// --------------------------------------------------------
// 1. API ĐĂNG KÝ (REGISTER)
// --------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
    try {
        const { fullName, phone, password } = req.body;
        const pool = await poolPromise;
        
        // Kiểm tra xem SĐT đã tồn tại chưa
        const checkUser = await pool.request()
            .input('Phone', sql.VarChar, phone)
            .query('SELECT * FROM Users WHERE Phone = @Phone');
            
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: "Số điện thoại đã được đăng ký!" });
        }

        // Lưu user mới vào CSDL (Đồ án có thể lưu pass thuần hoặc bcrypt tùy yêu cầu)
        await pool.request()
            .input('FullName', sql.NVarChar, fullName)
            .input('Phone', sql.VarChar, phone)
            .input('PasswordHash', sql.VarChar, password) 
            .query('INSERT INTO Users (FullName, Phone, PasswordHash) VALUES (@FullName, @Phone, @PasswordHash)');

        res.status(201).json({ message: "Đăng ký thành công!" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});

// --------------------------------------------------------
// 2. API ĐĂNG NHẬP (LOGIN)
// --------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('Phone', sql.VarChar, phone)
            .input('PasswordHash', sql.VarChar, password)
            .query('SELECT UserID, FullName, Phone FROM Users WHERE Phone = @Phone AND PasswordHash = @PasswordHash');
            
        if (result.recordset.length === 0) {
            return res.status(401).json({ message: "Sai số điện thoại hoặc mật khẩu!" });
        }

        res.status(200).json({ message: "Đăng nhập thành công", user: result.recordset[0] });
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});

// --------------------------------------------------------
// 3. API LẤY DANH SÁCH BÁC SĨ TÌM KIẾM
// --------------------------------------------------------
app.get('/api/doctors', async (req, res) => {
    try {
        const pool = await poolPromise;
        // Giả sử lấy từ bảng Doctors kết hợp bảng Specialties
        const result = await pool.request()
            .query(`
                SELECT d.DoctorID, d.FullName as Name, s.Name as Specialty, 
                       d.Experience, d.Rating, d.Gender,
                       CASE WHEN d.IsActive = 1 THEN N'Đang rảnh' ELSE N'Đang bận' END as Status
                FROM Doctors d
                LEFT JOIN Specialties s ON d.SpecialtyID = s.SpecialtyID
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi Server", error: err.message });
    }
});
// --------------------------------------------------------
// 4. API LẤY VÀ CẬP NHẬT HỒ SƠ NGƯỜI DÙNG (PROFILE)
// --------------------------------------------------------
// Lấy thông tin User theo ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('UserID', sql.Int, req.params.id)
            .query('SELECT FullName, Phone, Email, DOB, Gender, Job, Address FROM Users WHERE UserID = @UserID');
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy hồ sơ" });
    }
});

// Cập nhật thông tin User
app.put('/api/users/:id', async (req, res) => {
    try {
        const { FullName, Email, DOB, Gender, Job, Address } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('UserID', sql.Int, req.params.id)
            .input('FullName', sql.NVarChar, FullName)
            .input('Email', sql.VarChar, Email)
            .input('DOB', sql.Date, DOB || null)
            .input('Gender', sql.NVarChar, Gender)
            .input('Job', sql.NVarChar, Job)
            .input('Address', sql.NVarChar, Address)
            .query(`
                UPDATE Users 
                SET FullName=@FullName, Email=@Email, DOB=@DOB, Gender=@Gender, Job=@Job, Address=@Address 
                WHERE UserID=@UserID
            `);
        res.json({ message: "Cập nhật hồ sơ thành công!" });
    } catch (err) {
        res.status(500).json({ message: "Lỗi cập nhật hồ sơ" });
    }
});

// --------------------------------------------------------
// 5. API ĐẶT LỊCH KHÁM (BOOKING)
// --------------------------------------------------------
app.post('/api/appointments', async (req, res) => {
    try {
        const { patientId, doctorId, symptoms, date } = req.body;
        const pool = await poolPromise;
        
        // Tạo mã phiếu khám ngẫu nhiên (VD: MC-8291)
        const appointmentCode = 'MC-' + Math.floor(1000 + Math.random() * 9000);

        await pool.request()
            .input('Code', sql.VarChar, appointmentCode)
            .input('PatientID', sql.Int, patientId)
            .input('DoctorID', sql.Int, doctorId)
            .input('Symptoms', sql.NVarChar, symptoms)
            .query(`
                INSERT INTO Appointments (AppointmentCode, PatientID, DoctorID, Symptoms, DepositStatus, Status) 
                VALUES (@Code, @PatientID, @DoctorID, @Symptoms, 'paid', 'upcoming')
            `);
            
        res.json({ message: "Đặt lịch thành công!", code: appointmentCode });
    } catch (err) {
        res.status(500).json({ message: "Lỗi tạo lịch khám", error: err.message });
    }
});

// --------------------------------------------------------
// 6. API LỊCH SỬ KHÁM BỆNH (HISTORY)
// --------------------------------------------------------
app.get('/api/appointments/user/:userId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('PatientID', sql.Int, req.params.userId)
            .query(`
                SELECT a.AppointmentCode as id, d.FullName as doctor, a.CreatedAt as date, 
                       a.Status as status, a.Symptoms
                FROM Appointments a
                JOIN Doctors d ON a.DoctorID = d.DoctorID
                WHERE a.PatientID = @PatientID
                ORDER BY a.CreatedAt DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: "Lỗi lấy lịch sử" });
    }
});
// Thêm đoạn này vào file server.js (trước dòng app.listen)
app.get('/api/doctors', async (req, res) => {
    try {
        const pool = await poolPromise; // Sử dụng poolPromise từ db.js
        
        // Lấy toàn bộ bác sĩ từ SQL
        const result = await pool.request().query('SELECT * FROM Doctors');
        
        res.json(result.recordset); // Gửi mảng dữ liệu về cho Frontend
    } catch (err) {
        console.error("Lỗi lấy danh sách bác sĩ:", err);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
});

// API LẤY DANH SÁCH BÁC SĨ TỪ DATABASE
app.get('/api/doctors', async (req, res) => {
    try {
        const pool = await poolPromise; 
        const result = await pool.request().query('SELECT * FROM Doctors');
        res.json(result.recordset);
    } catch (err) {
        console.error("Lỗi lấy danh sách bác sĩ:", err);
        res.status(500).json({ message: "Lỗi máy chủ", error: err.message });
    }
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});