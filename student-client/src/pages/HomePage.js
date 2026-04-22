import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiSearch, FiBookOpen, FiArrowRight, FiTag } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PALETTES = [
  ['#667eea','#764ba2'], ['#f093fb','#f5576c'], ['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'], ['#fa709a','#fee140'], ['#a18cd1','#fbc2eb'],
  ['#fccb90','#d57eeb'], ['#a1c4fd','#c2e9fb'], ['#fd7043','#ff8a65'],
  ['#26c6da','#00acc1'], ['#ff6b6b','#feca57'], ['#48dbfb','#ff9ff3'],
];

function Cover({ book, idx }) {
  const [c1, c2] = PALETTES[idx % PALETTES.length];
  return (
    <div className="book-cover" style={{ background: `linear-gradient(160deg,${c1},${c2})` }}>
      <div className="book-cover-spine" />
      <FiBookOpen size={28} color="rgba(255,255,255,0.88)" />
      {book.pdf_url && book.is_public_pdf && (
        <div style={{ position:'absolute', top:7, right:7, background:'#16a34a', color:'#fff', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99 }}>PDF</div>
      )}
      {book.available_copies === 0 && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(220,38,38,0.88)', color:'#fff', fontSize:10, fontWeight:700, textAlign:'center', padding:'3px 0' }}>Hết sách</div>
      )}
    </div>
  );
}

function BookCard({ book, idx, onClick }) {
  const avail = book.available_copies || 0;
  return (
    <div className="book-card" onClick={onClick}>
      <Cover book={book} idx={idx} />
      <div className="book-info">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <div className="book-meta">
          <span className="book-cat">{book.category?.name}</span>
          <span className={`book-avail ${avail === 0 ? 'out' : avail <= 2 ? 'low' : 'ok'}`}>
            {avail === 0 ? 'Hết' : avail}
          </span>
        </div>
      </div>
    </div>
  );
}

function BookRow({ books, title, icon, startIdx = 0, onBook, viewAllHref }) {
  if (!books?.length) return null;
  return (
    <div style={{ marginBottom: 44 }}>
      <div className="section-header">
        <h3 className="section-title">{icon} {title}</h3>
        <Link to={viewAllHref || '/books'} className="section-link">
          Xem tất cả <FiArrowRight size={13} />
        </Link>
      </div>
      <div className="books-grid">
        {books.slice(0, 12).map((b, i) => (
          <BookCard key={b.id} book={b} idx={startIdx + i} onClick={() => onBook(b)} />
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [newBooks, setNewBooks] = useState([]);
  const [eBooks, setEBooks] = useState([]);
  const [stats, setStats] = useState({ books: 0, users: 0, borrows: 0, copies: 0, ebooks: 0 });
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/books', { params: { limit: 12, sort: 'borrow_count', order: 'DESC' } }),
      api.get('/books', { params: { limit: 12, sort: 'created_at', order: 'DESC' } }),
      api.get('/books', { params: { limit: 8, has_pdf: 'true' } }),
      api.get('/categories'),
      api.get('/stats/summary').catch(() => ({ data: { data: {} } })),
    ]).then(([pop, newB, eb, cats, st]) => {
      setPopularBooks(pop.data.data || []);
      setNewBooks(newB.data.data || []);
      setEBooks(eb.data.data || []);
      setCategories(cats.data.data || []);
      const s = st.data.data || {};
      setStats({ 
        books: s.totalBooks || 0, 
        users: s.totalUsers || 0, 
        borrows: s.activeBorrows || 0,
        copies: s.totalCopies || 0,
        ebooks: s.totalEBooks || 0
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    if (search.trim()) navigate(`/books?search=${encodeURIComponent(search)}`);
  };

  const handleCat = (id) => {
    setActiveCat(String(id));
    navigate(`/books?category=${id}`);
  };

  return (
    <>
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 500, marginBottom: 22, color: 'rgba(255,255,255,0.9)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} />
            Hệ thống đang hoạt động
          </div>

          <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.15, marginBottom: 14, letterSpacing: -1, color: '#fff' }}>
            Thư viện trong<br />
            <span style={{ background: 'linear-gradient(90deg,#93c5fd,#c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              tầm tay bạn
            </span>
          </h1>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 1.65 }}>
            Tra cứu, mượn sách và đọc E-Book trực tuyến — nhanh, tiện, miễn phí
          </p>

          {/* Search bar */}
          <div className="hero-search">
            <FiSearch size={17} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0 }} />
            <input
              placeholder="Tìm tên sách, tác giả, ISBN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>Tìm kiếm</button>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 36, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {[
              { n: stats.books.toLocaleString(), label: 'Đầu sách' },
              { n: stats.copies.toLocaleString(), label: 'Bản sao' },
              { n: stats.ebooks.toLocaleString(), label: 'File PDF' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category pills ───────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '13px 0', position: 'sticky', top: 'var(--nav-h)', zIndex: 50 }}>
        <div className="container">
          <div className="cat-pills">
            <button className={`cat-pill ${activeCat === '' ? 'active' : ''}`} onClick={() => { setActiveCat(''); navigate('/books'); }}>
              🔍 Tất cả
            </button>
            {categories.map(c => (
              <button key={c.id} className={`cat-pill ${activeCat === String(c.id) ? 'active' : ''}`} onClick={() => handleCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="container section">
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>Đang tải sách...</p>
          </div>
        ) : (
          <>
            <BookRow title="Được mượn nhiều nhất" icon="🔥" books={popularBooks} startIdx={0} onBook={b => navigate(`/books/${b.id}`)} />
            <BookRow title="Sách mới nhất" icon="✨" books={newBooks} startIdx={12} onBook={b => navigate(`/books/${b.id}`)} />
            {eBooks.length > 0 && (
              <BookRow title="Đọc online — E-Book" icon="📱" books={eBooks} startIdx={24} onBook={b => navigate(`/books/${b.id}`)} viewAllHref="/books?has_pdf=true" />
            )}
          </>
        )}

        {/* ── Feature cards ─────────────────────────────── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 8 }}>
            {[
              { icon: '📖', title: 'Tra cứu sách', desc: 'Tìm theo tên, tác giả, thể loại hoặc ISBN', href: '/books', color: 'var(--blue)', bg: 'var(--blue-light)' },
              { icon: '📱', title: 'E-Book online', desc: 'Đọc sách PDF ngay trong trình duyệt', href: '/books?has_pdf=true', color: '#16a34a', bg: '#f0fdf4' },
              { icon: '🔄', title: 'Gia hạn online', desc: 'Gia hạn sách mà không cần đến thư viện', href: user ? '/my-borrows' : '/login', color: '#d97706', bg: '#fff7ed' },
              { icon: '💬', title: 'Liên hệ thủ thư', desc: 'Gửi câu hỏi và nhận hỗ trợ nhanh chóng', href: user ? '/messages' : '/login', color: '#7c3aed', bg: '#f5f3ff' },
            ].map(f => (
              <Link key={f.title} to={f.href} className="feature-card" style={{ textDecoration: 'none' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
              </Link>
            ))}
          </div>
        )}

        {/* ── CTA nếu chưa login ────────────────────────── */}
        {!user && !loading && (
          <div style={{
            marginTop: 40,
            padding: '32px 28px',
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            borderRadius: 'var(--radius-lg)',
            color: '#fff',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎓</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Bắt đầu mượn sách ngay hôm nay</h3>
            <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 20, fontSize: 15 }}>
              Đăng ký miễn phí và tra cứu kho sách hơn {stats.books.toLocaleString()} đầu sách
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" style={{ padding: '11px 28px', background: '#fff', color: 'var(--blue)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14 }}>
                Đăng ký miễn phí
              </Link>
              <Link to="/login" style={{ padding: '11px 28px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 14 }}>
                Đăng nhập
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 36, marginBottom: 36 }}>
            <div>
              <div className="footer-brand">📚 Phần mềm mượn trả sách</div>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: '#64748b' }}>
                Hệ thống quản lý thư viện hiện đại — mượn trả, đọc E-Book và tra cứu kho sách tự động.
              </p>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 14, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Tra cứu</div>
              {[['Danh mục sách','/books'],['E-Book Online','/books?has_pdf=true'],['Sách mới','/books']].map(([l,h]) => (
                <Link key={l} to={h} className="footer-link">→ {l}</Link>
              ))}
            </div>
            {user && (
              <div>
                <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 14, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Tài khoản</div>
                {[['Sách đang mượn','/my-borrows'],['Liên hệ thủ thư','/messages'],['Hồ sơ','/profile']].map(([l,h]) => (
                  <Link key={l} to={h} className="footer-link">→ {l}</Link>
                ))}
              </div>
            )}
          </div>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 22, textAlign: 'center', fontSize: 13, color: '#475569' }}>
            © 2025 Phần mềm mượn trả sách. Tất cả quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </>
  );
}
