import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer style={{ background: '#0f172a', color: '#64748b', padding: '60px 20px 40px', marginTop: 100 }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 40, marginBottom: 40 }}>
          {/* About */}
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              📚 Phần mềm Thư Viện
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#94a3b8' }}>
              Hệ thống quản lý thư viện hiện đại, hỗ trợ mượn trả sách trực tuyến, đọc E-Book, và thống kê kho sách tự động.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 16, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>📖 Tra Cứu</div>
            {[
              { label: 'Danh mục sách', href: '/books' },
              { label: 'E-Book Online', href: '/books?has_pdf=true' },
              { label: 'Sách mới', href: '/books' },
            ].map(({ label, href }) => (
              <Link key={label} to={href} style={{
                display: 'block', color: '#64748b', fontSize: 13, marginBottom: 10,
                textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer'
              }}
                onMouseEnter={e => { e.target.style.color = '#60a5fa'; e.target.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.transform = 'translateX(0)'; }}>
                → {label}
              </Link>
            ))}
          </div>

          {/* Account */}
          {user && (
            <div>
              <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 16, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>👤 Tài Khoản</div>
              {[
                { label: 'Sách đang mượn', href: '/my-borrows' },
                { label: 'Đặt trước', href: '/my-reservations' },
                { label: 'Liên hệ thủ thư', href: '/messages' },
              ].map(({ label, href }) => (
                <Link key={label} to={href} style={{
                  display: 'block', color: '#64748b', fontSize: 13, marginBottom: 10,
                  textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer'
                }}
                  onMouseEnter={e => { e.target.style.color = '#60a5fa'; e.target.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.transform = 'translateX(0)'; }}>
                  → {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            © 2025 Phần mềm mượn trả sách. Tất cả quyền được bảo lưu. 🎓
          </p>
        </div>
      </div>
    </footer>
  );
}
