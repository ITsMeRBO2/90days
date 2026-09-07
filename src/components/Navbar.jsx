import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Calendar, Dumbbell } from 'lucide-react';
import { getCurrentDayIndex, generateDates } from '../utils/data';

const DATES = generateDates();

export default function Navbar() {
  const loc = useLocation();

  const nav = [
    { to: '/',          label: 'Dashboard', icon: LayoutDashboard },
    { to: '/calendar',  label: 'Calendrier', icon: Calendar },
    { to: `/day/${DATES[getCurrentDayIndex()]}`, label: "Aujourd'hui", icon: Dumbbell },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 'var(--nav-height)',
        zIndex: 100,
        borderBottom: '1px solid rgba(108,71,255,0.1)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 4px 24px rgba(108,71,255,0.07)',
      }}
    >
      <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg,#6c47ff,#00b4d8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', boxShadow: '0 4px 14px rgba(108,71,255,0.3)',
          }}>💪</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: '#1a1a2e', lineHeight: 1 }}>
              Challenge
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent-violet)' }}>
              90 Jours
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 6 }}>
          {nav.map(({ to, label, icon: Icon }) => {
            const isActive = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to.split('/day/')[0] + '/day/') && to.includes('/day/'));
            return (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.04, background: 'var(--accent-violet-light)' }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--accent-violet-light)' : 'transparent',
                    border: `1.5px solid ${isActive ? 'rgba(108,71,255,0.22)' : 'transparent'}`,
                    color: isActive ? 'var(--accent-violet)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={16} />
                  <span className="nav-label">{label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (max-width: 480px) { .nav-label { display: none; } }
      `}</style>
    </motion.header>
  );
}
