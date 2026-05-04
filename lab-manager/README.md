# Lab Manager ĐPT - Modern Edition

> Hệ thống quản lý phòng máy tính - Đại học Công nghiệp TP.HCM

## Tổng quan

Ứng dụng quản lý phòng máy với giao diện hiện đại, hỗ trợ:

- **Server (Admin Dashboard)**: Quản lý máy tính, tài khoản sinh viên, xem màn hình từ xa, báo cáo, quảng cáo
- **Client (Desktop App)**: Đăng nhập/đăng xuất sinh viên, QR Code login, idle timeout, điều khiển từ xa

## Kiến trúc

```
lab-manager/
├── server_app.py           # Flask server + Admin dashboard
├── client_app.py           # CustomTkinter client (Modern UI)
├── templates/              # HTML templates cho admin
├── static/
│   └── css/
│       ├── admin-modern.css  # Dark theme CSS mới
│       ├── admin.css         # CSS gốc
│       └── styles.css
├── assets/                 # Icons, backgrounds
├── build_server.bat        # Build server EXE
├── build_client.bat        # Build client EXE
├── DPT-Client.spec         # PyInstaller spec (client)
├── LabManager-Server.spec  # PyInstaller spec (server)
├── requirements.txt        # Python dependencies
├── config.json             # Server config
└── server_config.json      # Client → Server connection
```

## Cài đặt & Chạy (Development)

### 1. Yêu cầu
- Python 3.10+
- PostgreSQL 13+

### 2. Tạo Database

```sql
CREATE DATABASE lab_manager;
CREATE USER DPTIUH WITH PASSWORD 'libiuh2025';
GRANT ALL PRIVILEGES ON DATABASE lab_manager TO DPTIUH;
```

### 3. Cài dependencies

```bash
cd lab-manager
pip install -r requirements.txt
```

### 4. Cấu hình

Sửa `config.json`:
```json
{
    "database_uri": "postgresql+psycopg2://DPTIUH:libiuh2025@localhost:5432/lab_manager",
    "server_host": "0.0.0.0",
    "server_port": 5000,
    "client_server_url": "http://<SERVER_IP>:5000"
}
```

Sửa `server_config.json` (cho client):
```json
{
    "server_ip": "<SERVER_IP>",
    "server_port": 5000
}
```

### 5. Chạy

```bash
# Server
python server_app.py

# Client (trên máy khác hoặc cùng máy)
python client_app.py
```

- Admin Dashboard: `http://localhost:5000/admin`
- Tài khoản mặc định: `admin` / `admin123`

## Build EXE

### Build Client (chạy trên Windows)
```bash
build_client.bat
# hoặc:
pyinstaller DPT-Client.spec
```

### Build Server
```bash
build_server.bat
# hoặc:
pyinstaller LabManager-Server.spec
```

Output: thư mục `dist/`

## Deploy lên mạng LAN

### Máy Server
1. Cài PostgreSQL, tạo database
2. Chạy `LabManager-Server.exe`
3. Mở firewall port 5000

### Máy Client
1. Copy `DPT-Client.exe` + `server_config.json`
2. Sửa `server_config.json` → IP máy server
3. Chạy `DPT-Client.exe` với quyền Admin
4. Mở firewall port 5001

## Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| Quản lý phòng máy | Grid 66 máy, trạng thái realtime |
| Quản lý tài khoản | CRUD sinh viên, import Excel |
| Đăng nhập QR Code | Scan QR bằng app điện thoại qua Firebase |
| Xem màn hình từ xa | Screenshot realtime từ client |
| Điều khiển từ xa | Tắt máy, khởi động, khóa, đăng xuất |
| Gửi thông báo | Push notification tới client |
| Quảng cáo | Hiển thị banner trên sidebar client |
| Background tùy chỉnh | Đổi hình nền client từ server |
| Báo cáo | Thống kê sử dụng theo tháng |
| Idle timeout | Tự đăng xuất sau 10 phút không hoạt động |
| Offline support | Queue events khi mất kết nối |

## Giao diện mới

### Client App
- **CustomTkinter** thay thế Tkinter cơ bản
- Dark theme với accent cyan (#00d4ff)
- Rounded corners, glassmorphism cards
- Modern buttons với hover effects
- Sidebar có thể thu gọn

### Admin Dashboard
- Dark theme chuyên nghiệp
- Glow effects cho status indicators
- Smooth animations & transitions
- Responsive cho tablet/mobile
- SweetAlert2 dark theme
