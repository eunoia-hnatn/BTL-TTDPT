USE MedBook_DB;
GO

IF NOT EXISTS (SELECT *
FROM sysobjects
WHERE name='Doctors' and xtype='U')
BEGIN
    CREATE TABLE Doctors
    (
        DoctorID INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Specialty NVARCHAR(100) NOT NULL,
        Experience NVARCHAR(50),
        Rating DECIMAL(2,1) DEFAULT 5.0,
        Reviews INT DEFAULT 0,
        CurrentShift NVARCHAR(20),
        CurrentCases INT DEFAULT 0,
        AvatarUrl VARCHAR(255),
        Status NVARCHAR(50) DEFAULT N'Đang rảnh'
    );
END
GO

TRUNCATE TABLE Doctors;
GO

INSERT INTO Doctors
    (FullName, Specialty, Experience, Rating, Reviews, CurrentShift, CurrentCases, AvatarUrl, Status)
VALUES
    (N'BS. Nguyễn Minh Tuấn', N'Tim mạch', N'15 năm KN', 4.9, 128, N'Sáng', 15, 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=600&auto=format&fit=crop', N'Đang rảnh'),
    (N'BS. Trần Linh Phương', N'Thần kinh', N'12 năm KN', 4.8, 96, N'Sáng', 12, 'https://images.unsplash.com/photo-1594824436998-d7b512eb21e0?q=80&w=600&auto=format&fit=crop', N'Đang rảnh'),
    (N'BS. Lê Đức Anh', N'Chấn thương chỉnh hình', N'20 năm KN', 4.7, 201, N'Sáng', 20, 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=600&auto=format&fit=crop', N'Hết suất'),
    (N'BS. Phạm Hương Mai', N'Nhi khoa', N'18 năm KN', 5.0, 314, N'Chiều', 18, 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=600&auto=format&fit=crop', N'Đang rảnh'),
    (N'BS. Hoàng Trọng Kim', N'Nội tiết', N'25 năm KN', 4.9, 450, N'Sáng', 5, 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=600&auto=format&fit=crop', N'Đang rảnh');
GO