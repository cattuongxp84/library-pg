# -*- coding: utf-8 -*-
"""
Lab Manager Client - Modern UI Edition
Quản lý phòng máy ĐPT - Giao diện hiện đại với CustomTkinter
"""
import sys
import io
import os

# Đảm bảo output UTF-8 trên Windows
if sys.platform == 'win32' and sys.stdout is not None:
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except Exception:
        pass

import customtkinter as ctk
import tkinter as tk
from tkinter import messagebox
import requests
import socket
import psutil
import threading
import time
import ctypes
from flask import Flask, request, jsonify, send_file
import json
import keyboard
import sqlite3
import uuid
from PIL import Image, ImageGrab, ImageDraw, ImageTk, ImageSequence, ImageFilter
import logging
import datetime
import qrcode
import qrcode.image.pil
import firebase_admin
from firebase_admin import credentials, db as firebase_db
import webbrowser
from werkzeug.serving import make_server

# ============================================================
# THEME & COLORS
# ============================================================
COLORS = {
    "bg_dark": "#0f0f23",
    "bg_card": "#1a1a2e",
    "bg_input": "#16213e",
    "bg_sidebar": "#1a1a2e",
    "accent": "#00d4ff",
    "accent_hover": "#00b4d8",
    "accent_dark": "#0077b6",
    "success": "#00e676",
    "danger": "#ff5252",
    "warning": "#ffc107",
    "text_primary": "#e0e0e0",
    "text_secondary": "#8892b0",
    "text_muted": "#5a6785",
    "border": "#233554",
    "gradient_start": "#667eea",
    "gradient_end": "#764ba2",
    "button_login": "#00d4ff",
    "button_logout": "#ff5252",
    "button_shutdown": "#ff7043",
    "button_restart": "#42a5f5",
    "button_refresh": "#66bb6a",
    "button_qr": "#ab47bc",
    "button_register": "#26a69a",
}

# CustomTkinter setup
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


# Configure logging
if getattr(sys, 'frozen', False):
    base_log_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
else:
    base_log_dir = os.path.dirname(os.path.abspath(__file__))

log_file = os.path.join(base_log_dir, 'client_app.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    filename=log_file,
    filemode='a',
    encoding='utf-8'
)
logger = logging.getLogger(__name__)


def is_running_as_admin():
    if os.name != 'nt':
        return True
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def elevate_to_admin():
    if os.name != 'nt':
        return False
    try:
        params = ' '.join(f'"{arg}"' for arg in sys.argv[1:])
        if getattr(sys, 'frozen', False):
            executable = sys.executable
        else:
            executable = sys.executable
            params = f'"{os.path.abspath(__file__)}" {params}'
        result = ctypes.windll.shell32.ShellExecuteW(None, 'runas', executable, params, None, 1)
        return result > 32
    except Exception as e:
        logger.error(f"Elevate error: {e}")
        return False


class ModernButton(ctk.CTkButton):
    """Custom button with hover animation effects"""
    def __init__(self, master, **kwargs):
        hover_color = kwargs.pop('hover_color', None)
        super().__init__(master, **kwargs)
        if hover_color:
            self.configure(hover_color=hover_color)


class LabManagerClient:
    def __init__(self, master):
        self.master = master
        self.master.title("Lab Manager - Quản lý phòng máy ĐPT")
        self.master.geometry("420x360")
        self.master.configure(fg_color=COLORS["bg_dark"])

        self.api_server = None
        self.api_server_running = False

        self.computer_id = self.get_computer_id()
        self.session_file = f"session_{self.computer_id}.json"
        self.pending_db = f"pending_events_{self.computer_id}.db"
        self.sync_thread = None
        self.last_login_info = None
        self.session_id = None
        self.load_session_from_file()
        self.init_pending_db()

        self.server_url = self.load_server_config()
        self.client_port = 5001
        self.has_setup_ui = False
        self.ping_active = False
        self.blocked_keys = set()
        self.is_registration_mode = False
        self.is_qr_mode = False

        # Idle timeout
        self.IDLE_TIMEOUT_SECONDS = 10 * 60
        self._idle_timer_id = None
        self.last_activity_time = time.time()
        self._idle_check_thread = None
        self._idle_check_running = False

        # Background loading flag
        self._bg_loading = False

        # Setup Flask app
        self.setup_client_api()

        # Setup UI
        self.setup_login_ui()

        # Start API server
        self.start_client_api()

        # Start heartbeat
        self.start_heartbeat()
        self.start_sync_thread()

        # Register with server
        self.master.after(2000, self.register_with_server_once)

        # Firebase
        self.FIREBASE_URL = 'https://login-iuh-default-rtdb.firebaseio.com/'
        self.FIREBASE_KEY_PATH = resource_path("firebase_key.json")
        self.firebase_initialized = False
        self.firebase_listener = None
        self.qr_login_processing = False
        self.qr_login_processed = False
        self.qr_login_processed_timer = None
        self.qr_login_lock = threading.Lock()

        if not firebase_admin._apps and os.path.exists(self.FIREBASE_KEY_PATH):
            try:
                cred = credentials.Certificate(self.FIREBASE_KEY_PATH)
                firebase_admin.initialize_app(cred, {'databaseURL': self.FIREBASE_URL})
                self.firebase_initialized = True
                self.setup_firebase_listener()
            except Exception as e:
                logger.warning(f"Firebase init error: {e}")

    # ============================================================
    # FLASK API SERVER
    # ============================================================
    def setup_client_api(self):
        self.client_app = Flask(__name__)

        @self.client_app.route('/api/shutdown', methods=['POST'])
        def shutdown():
            logger.info("Received shutdown command")
            threading.Thread(target=self._do_shutdown, daemon=True).start()
            return jsonify({'success': True})

        @self.client_app.route('/api/restart', methods=['POST'])
        def restart():
            logger.info("Received restart command")
            threading.Thread(target=self._do_restart, daemon=True).start()
            return jsonify({'success': True})

        @self.client_app.route('/api/lock', methods=['POST'])
        def lock():
            logger.info("Received lock command")
            self._do_lock()
            return jsonify({'success': True})

        @self.client_app.route('/api/status', methods=['GET'])
        def status():
            return jsonify({
                'computer_id': self.computer_id,
                'hostname': socket.gethostname(),
                'ip': self.get_local_ip(),
                'logged_in': self.session_id is not None,
                'status': 'online',
                'api_port': self.client_port
            })

        @self.client_app.route('/api/remote_login', methods=['POST'])
        def remote_login():
            logger.info("Received remote login command")
            self.master.after(0, self.do_logout)
            self.master.after(100, lambda: self.setup_login_ui())
            return jsonify({'success': True})

        @self.client_app.route('/api/logout', methods=['POST'])
        def logout():
            logger.info("Received logout command from server")
            self.master.after(0, self.do_logout)
            return jsonify({'success': True})

        @self.client_app.route('/api/screenshot', methods=['GET'])
        def screenshot():
            try:
                logger.info(f"Screenshot request from {request.remote_addr}")
                img = ImageGrab.grab()
                buf = io.BytesIO()
                img.save(buf, format='JPEG', quality=70)
                buf.seek(0)
                return send_file(buf, mimetype='image/jpeg', as_attachment=False, download_name='screenshot.jpg')
            except Exception as e:
                logger.error(f"Screenshot error: {e}")
                return jsonify({'success': False, 'message': str(e)}), 500

        @self.client_app.route('/api/health', methods=['GET'])
        def health():
            return jsonify({'status': 'ok'})

        @self.client_app.route('/api/notification', methods=['POST'])
        def receive_notification():
            try:
                self.last_activity_time = time.time()
                data = request.get_json()
                title = data.get('title', 'Thông báo')
                message = data.get('message', '')
                notification_type = data.get('type', 'info')
                logger.info(f"Received notification: {title} - {message}")

                def show_topmost_message(t, m, typ):
                    try:
                        self.master.lift()
                        self.master.attributes('-topmost', True)
                        self.master.focus_force()
                        if typ == 'error':
                            messagebox.showerror(t, m)
                        elif typ == 'warning':
                            messagebox.showwarning(t, m)
                        else:
                            messagebox.showinfo(t, m)
                    finally:
                        self.master.attributes('-topmost', False)

                self.master.after(0, lambda t=title, m=message, typ=notification_type: show_topmost_message(t, m, typ))
                return jsonify({'success': True})
            except Exception as e:
                logger.error(f"Notification error: {e}")
                return jsonify({'success': False, 'message': str(e)}), 500

    def start_client_api(self):
        if os.name == 'nt':
            self._open_firewall_port()

        def run_server():
            try:
                self.api_server = make_server('0.0.0.0', self.client_port, self.client_app, threaded=True)
                self.api_server_running = True
                logger.info(f"API server started on port {self.client_port}")
                self.api_server.serve_forever()
            except Exception as e:
                logger.error(f"Failed to start API server: {e}")
                self.api_server_running = False
                self.master.after(10000, self.start_client_api)

        self.api_server_thread = threading.Thread(target=run_server, daemon=True)
        self.api_server_thread.start()
        time.sleep(2)

        if self._check_api_server():
            logger.info("API server verified")
        else:
            logger.warning("API server may not be running correctly")

    def _check_api_server(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            result = sock.connect_ex(('127.0.0.1', self.client_port))
            sock.close()
            return result == 0
        except Exception:
            return False

    def _open_firewall_port(self):
        import subprocess
        rule_name = f"LabClient_Port{self.client_port}"
        try:
            subprocess.run(['netsh', 'advfirewall', 'firewall', 'delete', 'rule', f'name={rule_name}'], capture_output=True, timeout=5)
            result = subprocess.run(['netsh', 'advfirewall', 'firewall', 'add', 'rule', f'name={rule_name}', 'protocol=TCP', 'dir=in', f'localport={self.client_port}', 'action=allow', 'enable=yes', 'profile=any'], capture_output=True, timeout=5)
            if result.returncode == 0:
                logger.info(f"Firewall port {self.client_port} opened")
        except Exception as e:
            logger.warning(f"Firewall error: {e}")

    # ============================================================
    # SYSTEM COMMANDS
    # ============================================================
    def _do_shutdown(self):
        time.sleep(2)
        if self.session_id:
            self.master.after(0, self.do_logout)
            time.sleep(1)
        os.system("shutdown /s /t 1")

    def _do_restart(self):
        time.sleep(2)
        if self.session_id:
            self.master.after(0, self.do_logout)
            time.sleep(1)
        os.system("shutdown /r /t 1")

    def _do_lock(self):
        try:
            ctypes.windll.user32.LockWorkStation()
        except Exception as e:
            logger.error(f"Lock error: {e}")

    # ============================================================
    # NETWORK & CONFIG
    # ============================================================
    def get_local_ip(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            if ip and not ip.startswith('127.'):
                return ip
        except Exception:
            pass
        try:
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            if ip and not ip.startswith('127.'):
                return ip
        except Exception:
            pass
        return '127.0.0.1'

    def get_computer_id(self):
        try:
            ip = self.get_local_ip()
            parts = ip.split('.')
            if len(parts) == 4:
                last_octet = int(parts[-1])
                if 1 <= last_octet <= 66:
                    return last_octet
                elif 101 <= last_octet <= 166:
                    return last_octet - 100
            return 1
        except Exception:
            return 1

    def load_server_config(self):
        default_config = {"server_ip": "127.0.0.1", "server_port": 5000}
        if getattr(sys, 'frozen', False):
            exe_dir = os.path.dirname(sys.executable)
        else:
            exe_dir = os.path.dirname(os.path.abspath(__file__))

        config_path = os.path.join(exe_dir, "server_config.json")
        try:
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                server_url = f"http://{config.get('server_ip', default_config['server_ip'])}:{config.get('server_port', default_config['server_port'])}"
                server_url = server_url.rstrip('/')
                if server_url.endswith('/api'):
                    server_url = server_url[:-4]
                return server_url
        except Exception as e:
            logger.warning(f"Config error: {e}")

        return f"http://{default_config['server_ip']}:{default_config['server_port']}"

    # ============================================================
    # SESSION MANAGEMENT
    # ============================================================
    def load_session_from_file(self):
        try:
            if os.path.exists(self.session_file):
                with open(self.session_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.session_id = data.get('session_id')
                    self.last_login_info = data.get('last_login_info')
        except Exception:
            self.session_id = None
            self.last_login_info = None

    def save_session_to_file(self):
        try:
            session_data = {'session_id': self.session_id}
            if self.last_login_info:
                session_data['last_login_info'] = self.last_login_info
            with open(self.session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f)
        except Exception as e:
            logger.error(f"Save session error: {e}")

    def clear_session_file(self):
        try:
            if os.path.exists(self.session_file):
                os.remove(self.session_file)
        except Exception:
            pass
        self.session_id = None
        self.last_login_info = None

    # ============================================================
    # PENDING EVENTS (offline support)
    # ============================================================
    def init_pending_db(self):
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('''
                CREATE TABLE IF NOT EXISTS pending_events (
                    event_uuid TEXT PRIMARY KEY,
                    event_type TEXT,
                    student_id TEXT,
                    computer_id INTEGER,
                    timestamp TEXT,
                    synced INTEGER DEFAULT 0
                )
            ''')
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Init pending DB error: {e}")

    def save_pending_event(self, event_type, student_id, computer_id, timestamp=None):
        if timestamp is None:
            timestamp = datetime.datetime.now().isoformat()
        event_uuid = str(uuid.uuid4())
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('INSERT INTO pending_events VALUES (?, ?, ?, ?, ?, ?)',
                      (event_uuid, event_type, student_id, computer_id, timestamp, 0))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Save pending event error: {e}")
        return event_uuid

    def get_pending_events(self):
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('SELECT event_uuid, event_type, student_id, computer_id, timestamp FROM pending_events WHERE synced = 0')
            rows = c.fetchall()
            conn.close()
            events = []
            for row in rows:
                events.append({
                    'event_uuid': row[0],
                    'event_type': row[1],
                    'student_id': row[2],
                    'computer_id': row[3],
                    'timestamp': row[4]
                })
            return events
        except Exception as e:
            logger.error(f"Get pending events error: {e}")
            return []

    def mark_synced(self, event_uuid):
        try:
            conn = sqlite3.connect(self.pending_db)
            c = conn.cursor()
            c.execute('UPDATE pending_events SET synced = 1 WHERE event_uuid = ?', (event_uuid,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Mark synced error: {e}")

    def is_server_online(self):
        try:
            response = requests.post(f"{self.server_url}/api/heartbeat",
                                     json={'computer_id': self.computer_id}, timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def sync_pending_events(self):
        if not self.is_server_online():
            return False
        events = self.get_pending_events()
        if not events:
            return True
        try:
            response = requests.post(f"{self.server_url}/api/sync_events", json={'events': events}, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    for event in events:
                        self.mark_synced(event['event_uuid'])
                    logger.info(f"Synced {data.get('synced_count', 0)} events")
                    return True
        except Exception as e:
            logger.error(f"Sync pending events error: {e}")
        return False

    def start_sync_thread(self):
        if self.sync_thread and self.sync_thread.is_alive():
            return

        def sync_loop():
            while True:
                try:
                    self.sync_pending_events()
                except Exception as e:
                    logger.error(f"Sync loop error: {e}")
                time.sleep(30)

        self.sync_thread = threading.Thread(target=sync_loop, daemon=True)
        self.sync_thread.start()

    def register_with_server_once(self):
        try:
            client_ip = self.get_local_ip()
            register_data = {
                'computer_id': self.computer_id,
                'ip': client_ip,
                'api_port': self.client_port,
                'name': socket.gethostname()
            }
            if self.session_id:
                register_data['session_id'] = self.session_id

            response = requests.post(f"{self.server_url}/api/register_client", json=register_data, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('has_active_session') and data.get('session_id'):
                    self.session_id = data.get('session_id')
                    user_name = data.get('user_name')
                    self.master.after(0, lambda: self.setup_main_ui(user_name))
                logger.info("Registered with server")
                self.sync_pending_events()
            else:
                logger.error(f"Registration failed: {response.status_code}")
        except Exception as e:
            logger.warning(f"Server registration error: {e}")

    def start_heartbeat(self):
        def heartbeat_loop():
            while True:
                try:
                    client_ip = self.get_local_ip()
                    data = {
                        'computer_id': self.computer_id,
                        'ip': client_ip,
                        'api_port': self.client_port
                    }
                    requests.post(f"{self.server_url}/api/heartbeat", json=data, timeout=5)
                except Exception:
                    pass
                time.sleep(10)

        t = threading.Thread(target=heartbeat_loop, daemon=True)
        t.start()

    # ============================================================
    # FIREBASE QR LOGIN
    # ============================================================
    def setup_firebase_listener(self):
        try:
            root_ref = firebase_db.reference(f'login_requests/{self.computer_id}')
            root_ref.delete()

            def callback(event):
                try:
                    if event.data is None:
                        return
                    if not self.can_process_qr_request():
                        return

                    success = False
                    try:
                        student_id = None
                        user_id = None

                        if isinstance(event.data, dict):
                            student_id = event.data.get('student_id')
                            user_id = event.data.get('user_id') or event.data.get('id')
                        elif isinstance(event.data, str):
                            try:
                                payload = json.loads(event.data)
                                student_id = payload.get('student_id')
                                user_id = payload.get('user_id') or payload.get('id')
                            except Exception:
                                student_id = None
                                user_id = None

                        if student_id:
                            student_id = str(student_id).strip()
                        if user_id:
                            user_id = str(user_id).strip()

                        if not student_id and not user_id:
                            logger.warning(f"No student_id or user_id in QR data: {event.data}")
                            return

                        request_payload = {'computer_id': self.computer_id}
                        if student_id:
                            request_payload['student_id'] = student_id
                        if user_id:
                            request_payload['user_id'] = user_id

                        logger.info(f"Processing QR login request: {request_payload}")
                        response = requests.post(
                            f"{self.server_url}/api/qr_login",
                            json=request_payload,
                            timeout=10
                        )

                        if response.ok and response.json().get('success'):
                            user_name = response.json().get('user_name')
                            self.session_id = response.json().get('session_id')
                            self.save_session_to_file()
                            self.master.after(0, lambda un=user_name: self.setup_main_ui(un))
                            messagebox.showinfo("Thành công", f"Chào mừng {user_name}")
                            success = True
                        else:
                            error_msg = response.json().get('message', 'Unknown error') if response.ok else 'Request failed'
                            messagebox.showerror("Lỗi", f"Đăng nhập QR thất bại: {error_msg}")
                    except Exception as e:
                        logger.error(f"QR login request error: {e}")
                    finally:
                        self.finish_qr_request(success)

                    try:
                        root_ref.delete()
                    except Exception:
                        pass

                except Exception as e:
                    logger.error(f"Firebase QR callback error: {e}")

            self.firebase_listener = root_ref.listen(callback)
            logger.info("Firebase listener started successfully")
        except Exception as e:
            logger.error(f"Failed to setup Firebase listener: {e}")
            self.firebase_listener = None

    def can_process_qr_request(self):
        with self.qr_login_lock:
            if self.qr_login_processing:
                return False
            if self.qr_login_processed:
                return False
            self.qr_login_processing = True
            return True

    def finish_qr_request(self, success):
        with self.qr_login_lock:
            self.qr_login_processing = False
            if success:
                self.qr_login_processed = True
                if self.qr_login_processed_timer:
                    self.master.after_cancel(self.qr_login_processed_timer)
                self.qr_login_processed_timer = self.master.after(5000, self.reset_qr_processed_flag)

    def reset_qr_processed_flag(self):
        with self.qr_login_lock:
            self.qr_login_processed = False
            self.qr_login_processed_timer = None

    # ============================================================
    # KEY BLOCKING
    # ============================================================
    def block_keys_safe(self):
        keys_to_block = [
            'left windows', 'right windows', 'windows',
            'alt', 'left alt', 'right alt', 'alt+tab',
            'win', 'winleft', 'winright',
            'ctrl+shift+esc', 'alt+f4', 'f4'
        ]
        for key in keys_to_block:
            try:
                keyboard.block_key(key)
                self.blocked_keys.add(key)
            except Exception:
                pass

    def unblock_keys_safe(self):
        for key in list(self.blocked_keys):
            try:
                keyboard.unblock_key(key)
                self.blocked_keys.remove(key)
            except Exception:
                pass

    # ============================================================
    # LOGIN UI - MODERN DESIGN
    # ============================================================
    def setup_login_ui(self):
        self.is_qr_mode = False
        self.clear_window()
        self.apply_default_background()
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)

        threading.Thread(target=self.block_keys_safe, daemon=True).start()

        # Main card container with glassmorphism effect
        self.login_card = ctk.CTkFrame(
            self.master,
            width=440, height=520,
            corner_radius=20,
            fg_color=("gray92", "#1a1a2e"),
            border_width=1,
            border_color=("#ddd", "#233554")
        )
        self.login_card.place(relx=0.5, rely=0.5, anchor="center")
        self.login_card.pack_propagate(False)

        # Inner padding frame
        inner = ctk.CTkFrame(self.login_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=35, pady=30)

        # App icon / logo area
        logo_frame = ctk.CTkFrame(inner, fg_color="transparent", height=60)
        logo_frame.pack(fill="x", pady=(0, 5))

        icon_label = ctk.CTkLabel(
            logo_frame,
            text="🖥️",
            font=ctk.CTkFont(size=42)
        )
        icon_label.pack()

        # Title
        title_label = ctk.CTkLabel(
            inner,
            text="HỆ THỐNG QUẢN LÝ PHÒNG MÁY",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color=COLORS["accent"]
        )
        title_label.pack(pady=(0, 3))

        subtitle = ctk.CTkLabel(
            inner,
            text="Đại học Công nghiệp TP.HCM",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=COLORS["text_secondary"]
        )
        subtitle.pack(pady=(0, 20))

        # Student ID field
        id_label = ctk.CTkLabel(
            inner, text="Mã sinh viên",
            font=ctk.CTkFont(size=13, weight="bold"),
            text_color=COLORS["text_primary"],
            anchor="w"
        )
        id_label.pack(fill="x", pady=(0, 5))

        self.student_id_entry = ctk.CTkEntry(
            inner,
            height=42,
            placeholder_text="Nhập mã sinh viên...",
            font=ctk.CTkFont(size=14),
            corner_radius=10,
            border_width=2,
            border_color=COLORS["border"],
            fg_color=COLORS["bg_input"],
            text_color=COLORS["text_primary"]
        )
        self.student_id_entry.pack(fill="x", pady=(0, 15))
        self.student_id_entry.bind("<Return>", lambda e: self.do_login())

        # Login button
        self.login_btn = ctk.CTkButton(
            inner,
            text="ĐĂNG NHẬP",
            command=self.do_login,
            height=44,
            corner_radius=10,
            font=ctk.CTkFont(size=15, weight="bold"),
            fg_color=COLORS["button_login"],
            hover_color=COLORS["accent_hover"],
            text_color="#0f0f23"
        )
        self.login_btn.pack(fill="x", pady=(0, 10))

        # QR Login button
        self.qr_login_btn = ctk.CTkButton(
            inner,
            text="📱  Đăng nhập bằng QR Code",
            command=self.show_qr_info,
            height=38,
            corner_radius=10,
            font=ctk.CTkFont(size=13),
            fg_color=COLORS["button_qr"],
            hover_color="#9c27b0",
            text_color="white"
        )
        self.qr_login_btn.pack(fill="x", pady=(0, 10))

        # Register button
        self.toggle_btn = ctk.CTkButton(
            inner,
            text="Chưa có tài khoản? Đăng ký ngay →",
            command=self.toggle_registration_mode,
            height=32,
            corner_radius=8,
            font=ctk.CTkFont(size=12),
            fg_color="transparent",
            hover_color=COLORS["bg_input"],
            text_color=COLORS["accent"],
            border_width=0
        )
        self.toggle_btn.pack(fill="x", pady=(5, 0))

        # Machine info
        machine_info = ctk.CTkLabel(
            inner,
            text=self.get_machine_info(),
            font=ctk.CTkFont(size=11),
            text_color=COLORS["text_muted"]
        )
        machine_info.pack(pady=(15, 0))

        # Load background after UI is ready
        threading.Thread(target=self.load_background, daemon=True).start()

    # ============================================================
    # REGISTRATION UI
    # ============================================================
    def toggle_registration_mode(self):
        self.is_registration_mode = not self.is_registration_mode

        if not self.is_registration_mode:
            self.setup_login_ui()
            return

        self.clear_window()
        self.apply_default_background()
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)

        # Registration card
        reg_card = ctk.CTkFrame(
            self.master,
            width=460, height=580,
            corner_radius=20,
            fg_color=("gray92", "#1a1a2e"),
            border_width=1,
            border_color=("#ddd", "#233554")
        )
        reg_card.place(relx=0.5, rely=0.5, anchor="center")
        reg_card.pack_propagate(False)

        inner = ctk.CTkFrame(reg_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=35, pady=25)

        # Title
        ctk.CTkLabel(
            inner, text="📝",
            font=ctk.CTkFont(size=36)
        ).pack(pady=(0, 5))

        ctk.CTkLabel(
            inner,
            text="ĐĂNG KÝ TÀI KHOẢN",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color=COLORS["accent"]
        ).pack(pady=(0, 15))

        fields = [
            ("Mã sinh viên *", "student_id_entry", "Nhập mã sinh viên..."),
            ("Họ và tên *", "name_entry", "Nhập họ và tên..."),
            ("Lớp", "class_entry", "Nhập tên lớp..."),
            ("Khoa/Viện", "khoa_entry", "Nhập khoa/viện..."),
            ("Mật khẩu *", "password_entry", "Nhập mật khẩu (tối thiểu 8 ký tự)..."),
        ]

        for label_text, attr_name, placeholder in fields:
            ctk.CTkLabel(
                inner, text=label_text,
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=COLORS["text_primary"],
                anchor="w"
            ).pack(fill="x", pady=(0, 3))

            show_char = "*" if "password" in attr_name else ""
            entry = ctk.CTkEntry(
                inner,
                height=38,
                placeholder_text=placeholder,
                font=ctk.CTkFont(size=13),
                corner_radius=8,
                border_width=2,
                border_color=COLORS["border"],
                fg_color=COLORS["bg_input"],
                text_color=COLORS["text_primary"],
                show=show_char if show_char else ""
            )
            entry.pack(fill="x", pady=(0, 8))
            setattr(self, attr_name, entry)

        # Register button
        ctk.CTkButton(
            inner,
            text="ĐĂNG KÝ",
            command=self.do_register,
            height=42,
            corner_radius=10,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color=COLORS["button_register"],
            hover_color="#00897b",
            text_color="white"
        ).pack(fill="x", pady=(10, 5))

        # Back button
        ctk.CTkButton(
            inner,
            text="← Quay lại đăng nhập",
            command=self.toggle_registration_mode,
            height=30,
            corner_radius=8,
            font=ctk.CTkFont(size=12),
            fg_color="transparent",
            hover_color=COLORS["bg_input"],
            text_color=COLORS["accent"],
            border_width=0
        ).pack(fill="x")

    # ============================================================
    # QR CODE UI
    # ============================================================
    def show_qr_info(self):
        self.is_qr_mode = True
        self.clear_window()
        self.apply_default_background()
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)

        data = {
            'action': 'qr_login',
            'computer_id': self.computer_id,
            'machine_id': self.computer_id,
            'server_url': self.server_url,
            'timestamp': int(time.time())
        }
        payload = json.dumps(data, ensure_ascii=False)
        qr = qrcode.QRCode(box_size=6, border=2)
        qr.add_data(payload)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color='white', back_color='#1a1a2e')

        # QR card
        qr_card = ctk.CTkFrame(
            self.master,
            width=420, height=520,
            corner_radius=20,
            fg_color=("gray92", "#1a1a2e"),
            border_width=1,
            border_color=("#ddd", "#233554")
        )
        qr_card.place(relx=0.5, rely=0.5, anchor="center")
        qr_card.pack_propagate(False)

        inner = ctk.CTkFrame(qr_card, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=30, pady=25)

        ctk.CTkLabel(
            inner,
            text="📱 QUÉT QR ĐỂ ĐĂNG NHẬP",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color=COLORS["accent"]
        ).pack(pady=(0, 15))

        # Display QR code
        qr_photo = ImageTk.PhotoImage(qr_img.get_image().resize((220, 220), Image.Resampling.LANCZOS))
        qr_label = tk.Label(inner, image=qr_photo, bg="#1a1a2e", bd=0)
        qr_label.image = qr_photo
        qr_label.pack(pady=(0, 15))

        ctk.CTkLabel(
            inner,
            text=f"Mã máy: PC-{self.computer_id:02d}",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=COLORS["text_primary"]
        ).pack(pady=(0, 5))

        ctk.CTkLabel(
            inner,
            text="Quét bằng app trên điện thoại\nđể gửi dữ liệu đăng nhập qua Firebase",
            font=ctk.CTkFont(size=12),
            text_color=COLORS["text_secondary"],
            justify="center"
        ).pack(pady=(0, 5))

        ctk.CTkLabel(
            inner,
            text="Hệ thống sẽ tự động đăng nhập\nsau khi nhận dữ liệu từ app",
            font=ctk.CTkFont(size=11),
            text_color=COLORS["text_muted"],
            justify="center"
        ).pack(pady=(0, 15))

        ctk.CTkButton(
            inner,
            text="← Quay lại đăng nhập",
            command=self.setup_login_ui,
            height=36,
            corner_radius=8,
            font=ctk.CTkFont(size=13),
            fg_color="transparent",
            hover_color=COLORS["bg_input"],
            text_color=COLORS["accent"],
            border_width=1,
            border_color=COLORS["accent"]
        ).pack(fill="x")

    # ============================================================
    # LOGIN / REGISTER / LOGOUT LOGIC
    # ============================================================
    def do_login(self):
        student_id = self.student_id_entry.get().strip()
        if not student_id:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập mã sinh viên!")
            return

        try:
            response = requests.post(
                f"{self.server_url}/api/login",
                json={'student_id': student_id, 'computer_id': self.computer_id},
                timeout=10
            )
            if response.status_code == 200 and response.json().get('success'):
                data = response.json()
                self.session_id = data.get('session_id')
                self.last_login_info = {'student_id': student_id}
                self.save_session_to_file()
                user_name = data.get('user_name', student_id)
                self.setup_main_ui(user_name)
            else:
                msg = response.json().get('message', 'Đăng nhập thất bại') if response.ok else 'Server error'
                messagebox.showerror("Lỗi", msg)
        except requests.exceptions.ConnectionError:
            # Offline login
            self.session_id = f"offline-{uuid.uuid4()}"
            self.last_login_info = {'student_id': student_id}
            self.save_session_to_file()
            self.save_pending_event('login', student_id, self.computer_id)
            self.setup_main_ui(student_id)
        except Exception as e:
            logger.error(f"Login error: {e}")
            messagebox.showerror("Lỗi", f"Không thể đăng nhập: {e}")

    def do_register(self):
        student_id = self.student_id_entry.get().strip()
        name = self.name_entry.get().strip()
        class_name = self.class_entry.get().strip()
        khoa = self.khoa_entry.get().strip()
        password = self.password_entry.get().strip()

        if not student_id or not name or not password:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập đầy đủ các trường bắt buộc (*)")
            return

        if len(password) < 8:
            messagebox.showwarning("Cảnh báo", "Mật khẩu phải có ít nhất 8 ký tự!")
            return

        try:
            response = requests.post(
                f"{self.server_url}/api/register",
                json={
                    'student_id': student_id,
                    'name': name,
                    'class_name': class_name,
                    'khoa_vien': khoa,
                    'password': password
                },
                timeout=10
            )
            if response.status_code == 200 and response.json().get('success'):
                messagebox.showinfo("Thành công", "Đăng ký thành công! Bạn có thể đăng nhập ngay.")
                self.is_registration_mode = False
                self.setup_login_ui()
            else:
                msg = response.json().get('message', 'Đăng ký thất bại')
                messagebox.showerror("Lỗi", msg)
        except Exception as e:
            logger.error(f"Register error: {e}")
            messagebox.showerror("Lỗi", f"Không thể đăng ký: {e}")

    def do_logout(self):
        self.stop_idle_check_thread()

        if not self.session_id:
            self.has_setup_ui = False
            self.clear_window()
            self.master.overrideredirect(False)
            self.master.attributes('-fullscreen', True)
            self.master.attributes('-topmost', True)
            self.setup_login_ui()
            return

        student_id = None
        if self.last_login_info:
            student_id = self.last_login_info.get('student_id')

        if isinstance(self.session_id, str) and self.session_id.startswith('offline-'):
            if student_id:
                self.save_pending_event('logout', student_id, self.computer_id)
        else:
            try:
                response = requests.post(f"{self.server_url}/api/logout", json={'session_id': self.session_id}, timeout=5)
                if response.status_code != 200 or not response.json().get('success'):
                    if student_id:
                        self.save_pending_event('logout', student_id, self.computer_id)
            except Exception:
                if student_id:
                    self.save_pending_event('logout', student_id, self.computer_id)

        self.session_id = None
        self.has_setup_ui = False
        self.clear_session_file()
        self.clear_window()
        self.master.overrideredirect(False)
        self.master.attributes('-fullscreen', True)
        self.master.attributes('-topmost', True)
        self.setup_login_ui()

    # ============================================================
    # MAIN UI (SIDEBAR) - MODERN DESIGN
    # ============================================================
    def setup_main_ui(self, user_name):
        if self.has_setup_ui:
            return

        self.has_setup_ui = True
        self.clear_window()
        self.master.attributes('-fullscreen', False)
        self.master.overrideredirect(True)
        self.master.attributes('-topmost', False)
        self.master.resizable(False, False)
        self.unblock_keys_safe()

        screen_width = self.master.winfo_screenwidth()
        screen_height = self.master.winfo_screenheight()

        width = 300
        taskbar_height = 40
        self.full_height = screen_height - taskbar_height
        self.collapsed_height = 50
        self.sidebar_width = width
        self.sidebar_expanded = True
        self.x_pos = screen_width - width - 8
        self.y_pos = 0

        self.master.geometry(f"{width}x{self.full_height}+{self.x_pos}+{self.y_pos}")
        self.master.configure(fg_color=COLORS["bg_sidebar"])

        # Main container
        main_frame = ctk.CTkFrame(self.master, fg_color=COLORS["bg_sidebar"], corner_radius=0)
        main_frame.pack(fill='both', expand=True)

        # Header
        header = ctk.CTkFrame(main_frame, height=50, corner_radius=0, fg_color="#16213e")
        header.pack(fill='x')
        header.pack_propagate(False)

        user_label = ctk.CTkLabel(
            header,
            text=f"  {user_name}",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=COLORS["text_primary"],
            anchor="w"
        )
        user_label.pack(side='left', padx=(12, 4), fill='x', expand=True)

        self.toggle_button = ctk.CTkButton(
            header,
            text="◀",
            command=self.toggle_sidebar,
            width=36, height=36,
            corner_radius=8,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="transparent",
            hover_color=COLORS["bg_input"],
            text_color=COLORS["text_secondary"]
        )
        self.toggle_button.pack(side='right', padx=8)

        # Content area
        self.content_frame = ctk.CTkScrollableFrame(
            main_frame,
            fg_color=COLORS["bg_sidebar"],
            corner_radius=0
        )
        self.content_frame.pack(fill='both', expand=True, padx=8, pady=(8, 0))

        # Status card
        status_card = ctk.CTkFrame(
            self.content_frame,
            corner_radius=12,
            fg_color=COLORS["bg_card"],
            border_width=1,
            border_color=COLORS["border"]
        )
        status_card.pack(fill='x', pady=(0, 8))

        ctk.CTkLabel(
            status_card,
            text=self.get_machine_info(),
            font=ctk.CTkFont(size=11),
            text_color=COLORS["text_secondary"]
        ).pack(padx=12, pady=8)

        # Action buttons card
        actions_card = ctk.CTkFrame(
            self.content_frame,
            corner_radius=12,
            fg_color=COLORS["bg_card"],
            border_width=1,
            border_color=COLORS["border"]
        )
        actions_card.pack(fill='x', pady=(0, 8))

        ctk.CTkLabel(
            actions_card,
            text="Thao tác nhanh",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=COLORS["text_primary"],
            anchor="w"
        ).pack(fill='x', padx=12, pady=(10, 6))

        btn_grid = ctk.CTkFrame(actions_card, fg_color="transparent")
        btn_grid.pack(fill='x', padx=10, pady=(0, 10))

        buttons = [
            ("🔓 Đăng xuất", self.do_logout, COLORS["button_logout"], "#d32f2f"),
            ("⏻ Tắt máy", self.shutdown_computer, COLORS["button_shutdown"], "#e64a19"),
            ("🔄 Khởi động", self._do_restart, COLORS["button_restart"], "#1976d2"),
            ("🔃 Làm mới", self.reload_background, COLORS["button_refresh"], "#388e3c"),
        ]

        for i, (text, cmd, color, hover) in enumerate(buttons):
            row = i // 2
            col = i % 2
            ctk.CTkButton(
                btn_grid,
                text=text,
                command=cmd,
                height=36,
                corner_radius=8,
                font=ctk.CTkFont(size=11, weight="bold"),
                fg_color=color,
                hover_color=hover,
                text_color="white"
            ).grid(row=row, column=col, padx=3, pady=3, sticky="ew")

        btn_grid.columnconfigure(0, weight=1)
        btn_grid.columnconfigure(1, weight=1)

        # Ads section
        self.ads_frame = ctk.CTkFrame(
            self.content_frame,
            corner_radius=12,
            fg_color=COLORS["bg_card"],
            border_width=1,
            border_color=COLORS["border"]
        )
        self.ads_frame.pack(fill='x', pady=(0, 8))

        ctk.CTkLabel(
            self.ads_frame,
            text="📢 Thông báo & Quảng cáo",
            font=ctk.CTkFont(size=12, weight="bold"),
            text_color=COLORS["text_primary"],
            anchor="w"
        ).pack(fill='x', padx=12, pady=(10, 6))

        self.ad_photo_images = []
        self.ad_image_labels = []
        threading.Thread(target=self.load_ads, daemon=True).start()

        self.sidebar_expanded = True
        self.master.update_idletasks()

        # Bind activity events
        for event in ("<Motion>", "<KeyPress>", "<ButtonPress>"):
            self.master.bind(event, self.reset_idle_timer, add="+")

        self.reset_idle_timer()
        self.start_idle_check_thread()

    # ============================================================
    # ADS LOADING
    # ============================================================
    def load_ads(self):
        try:
            base_url = self.server_url
            if base_url.endswith('/api'):
                base_url = base_url[:-4]

            response = requests.get(f"{base_url}/api/get_advertisement", timeout=10)
            if response.status_code != 200:
                return

            ads = response.json()
            if not ads:
                return

            ads = ads[:5]
            ad_items = []
            for ad in ads:
                image_url = ad.get('image_url')
                link = ad.get('link')
                if not image_url:
                    continue
                if image_url.startswith('http://') or image_url.startswith('https://'):
                    img_url = image_url
                else:
                    img_url = f"{base_url}/{image_url.lstrip('/')}"

                img_response = requests.get(img_url, timeout=10)
                if img_response.status_code != 200:
                    continue

                image = Image.open(io.BytesIO(img_response.content))
                if image.width > 0:
                    target_width = min(image.width, self.sidebar_width - 40)
                    ratio = target_width / image.width
                    target_height = max(1, int(image.height * ratio))
                    image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

                    # Add rounded corners
                    rounded = self._round_image(image, 10)
                    photo = ImageTk.PhotoImage(rounded)
                    ad_items.append((photo, link))

            if not ad_items:
                return

            def _show_ads():
                for lbl in self.ad_image_labels:
                    lbl.destroy()
                self.ad_image_labels = []
                self.ad_photo_images = []

                for photo, link in ad_items:
                    label = tk.Label(self.ads_frame, image=photo, bg=COLORS["bg_card"], bd=0)
                    if link:
                        label.config(cursor='hand2')
                        label.bind('<Button-1>', lambda e, url=link: webbrowser.open(url))
                    label.pack(fill='x', padx=10, pady=(0, 6))
                    self.ad_image_labels.append(label)
                    self.ad_photo_images.append(photo)

            self.master.after(0, _show_ads)
        except Exception as e:
            logger.warning(f"Load ad error: {e}")

    def _round_image(self, img, radius):
        """Add rounded corners to an image"""
        rounded = img.convert("RGBA")
        mask = Image.new("L", rounded.size, 0)
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([0, 0, rounded.width, rounded.height], radius=radius, fill=255)
        rounded.putalpha(mask)
        bg = Image.new("RGBA", rounded.size, COLORS["bg_card"])
        bg.paste(rounded, (0, 0), rounded)
        return bg.convert("RGB")

    # ============================================================
    # IDLE TIMEOUT
    # ============================================================
    def reset_idle_timer(self, event=None):
        self.last_activity_time = time.time()

    def start_idle_check_thread(self):
        if self._idle_check_thread and self._idle_check_thread.is_alive():
            return

        self._idle_check_running = True

        def check_idle():
            while self._idle_check_running:
                try:
                    if self.session_id:
                        elapsed = time.time() - self.last_activity_time
                        if elapsed > self.IDLE_TIMEOUT_SECONDS:
                            logger.info(f"Auto-logout do idle timeout ({self.IDLE_TIMEOUT_SECONDS // 60} phút)")
                            self.master.after(0, self.do_logout)
                            break
                except Exception:
                    pass
                time.sleep(5)

        self._idle_check_thread = threading.Thread(target=check_idle, daemon=True)
        self._idle_check_thread.start()

    def stop_idle_check_thread(self):
        self._idle_check_running = False

    # ============================================================
    # BACKGROUND & SIDEBAR
    # ============================================================
    def reload_background(self):
        logger.info("User requested background reload")
        if self._bg_loading:
            return
        self.reset_idle_timer()
        if hasattr(self, 'bg_label') and self.bg_label.winfo_exists():
            try:
                self.bg_label.image = None
                self.bg_label.destroy()
            except Exception:
                pass
        threading.Thread(target=self.load_background, daemon=True).start()

    def toggle_sidebar(self):
        if self.sidebar_expanded:
            self.content_frame.pack_forget()
            self.master.geometry(f"{self.sidebar_width}x{self.collapsed_height}+{self.x_pos}+{self.y_pos}")
            self.toggle_button.configure(text='▶')
            self.sidebar_expanded = False
        else:
            self.master.geometry(f"{self.sidebar_width}x{self.full_height}+{self.x_pos}+{self.y_pos}")
            self.content_frame.pack(fill='both', expand=True, padx=8, pady=(8, 0))
            self.toggle_button.configure(text='◀')
            self.sidebar_expanded = True
        self.reset_idle_timer()

    def shutdown_computer(self):
        confirm = messagebox.askyesno("Xác nhận", "Bạn có chắc muốn tắt máy?")
        if confirm:
            self._do_shutdown()

    def apply_default_background(self):
        if self._bg_loading:
            return
        try:
            default_path = resource_path('background.jpg')
            if os.path.exists(default_path):
                image = Image.open(default_path)
                screen_width = self.master.winfo_screenwidth()
                screen_height = self.master.winfo_screenheight()
                image = image.resize((screen_width, screen_height), Image.Resampling.LANCZOS)
                self.bg_photo = ImageTk.PhotoImage(image)

                if hasattr(self, 'bg_label') and self.bg_label.winfo_exists():
                    try:
                        self.bg_label.image = None
                        self.bg_label.destroy()
                    except Exception:
                        pass

                self.bg_label = tk.Label(self.master, image=self.bg_photo)
                self.bg_label.place(x=0, y=0, relwidth=1, relheight=1)
                self.bg_label.lower()
                self.master.update_idletasks()
        except Exception as e:
            logger.warning(f"Default background load error: {e}")

    def load_background(self):
        if self._bg_loading:
            return
        self._bg_loading = True
        try:
            base_url = self.server_url
            if base_url.endswith('/api'):
                base_url = base_url[:-4]

            response = requests.get(f"{base_url}/api/get_active_background", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('url'):
                    url = data.get('url')
                    img_response = requests.get(url, timeout=10)
                    if img_response.status_code == 200:
                        image = Image.open(io.BytesIO(img_response.content))
                        screen_width = self.master.winfo_screenwidth()
                        screen_height = self.master.winfo_screenheight()
                        image = image.resize((screen_width, screen_height), Image.Resampling.LANCZOS)
                        self.bg_photo = ImageTk.PhotoImage(image)

                        def _apply_bg():
                            try:
                                if hasattr(self, 'bg_label') and self.bg_label.winfo_exists():
                                    try:
                                        self.bg_label.image = None
                                        self.bg_label.destroy()
                                    except Exception:
                                        pass
                                self.bg_label = tk.Label(self.master, image=self.bg_photo)
                                self.bg_label.place(x=0, y=0, relwidth=1, relheight=1)
                                self.bg_label.lower()
                                self.master.update_idletasks()
                                logger.info("Background reloaded successfully")
                            except Exception as e:
                                logger.warning(f"Apply background error: {e}")
                            finally:
                                self._bg_loading = False

                        self.master.after(0, _apply_bg)
                        return
                else:
                    logger.warning(f"No active background from server: {data}")
        except Exception as e:
            logger.warning(f"Background error: {e}")
        self._bg_loading = False

    # ============================================================
    # UTILITIES
    # ============================================================
    def get_machine_info(self):
        return f"Máy: PC-{self.computer_id:02d}  |  IP: {self.get_local_ip()}"

    def clear_window(self):
        for widget in self.master.winfo_children():
            widget.destroy()

    def on_closing(self):
        self.unblock_keys_safe()
        if self.api_server:
            self.api_server.shutdown()
        self.master.destroy()


# ============================================================
# MAIN ENTRY POINT
# ============================================================
if __name__ == "__main__":
    logger.info("Starting Lab Manager Client (Modern UI)...")

    if os.name == 'nt' and not is_running_as_admin():
        logger.info("Elevating to admin privileges...")
        if elevate_to_admin():
            sys.exit(0)
        else:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Lỗi", "Không thể nâng quyền. Vui lòng chạy với quyền Administrator.")
            root.destroy()
            sys.exit(1)

    root = ctk.CTk()
    try:
        root.iconbitmap(resource_path("myicon.ico"))
    except Exception:
        pass

    app = LabManagerClient(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
