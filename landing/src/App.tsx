import React from 'react';
import { 
  Church, 
  Heart, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Megaphone,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

function App() {
  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">AMEN SAAS</div>
        <div className="nav-links">
          <a href="#features" className="btn-secondary" style={{ border: 'none', background: 'none' }}>Funciones</a>
          <a href="#pricing" className="btn-secondary" style={{ border: 'none', background: 'none' }}>Precios</a>
          <a href="#start" className="btn-primary">Registrar Parroquia</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="badge">Nueva Era: Digitalización Parroquial</div>
          <h1>Lleva tu Parroquia al <span>Siglo XXI</span></h1>
          <p className="subtitle">
            La plataforma más completa para gestionar tu comunidad, recibir donaciones sin comisiones y estar más cerca de tus feligreses. Todo desde un solo lugar.
          </p>
          <div className="cta-group">
            <a href="#start" className="btn-primary">
              Empezar Prueba Gratis 30 Días
              <ArrowRight size={18} style={{ marginLeft: 8, display: 'inline' }} />
            </a>
            <a href="#demo" className="btn-secondary">Ver Demo en Vivo</a>
          </div>
        </motion.div>
      </section>

      {/* Stats / Proof */}
      <section className="features" id="features">
        <motion.div 
          className="card"
          whileHover={{ scale: 1.02 }}
        >
          <div className="card-icon"><Heart /></div>
          <h3>Donaciones 100% Tuyas</h3>
          <p>Amen no cobra comisiones por transacción. Stripe procesa el pago y el fondo llega íntegro a la cuenta parroquial.</p>
        </motion.div>

        <motion.div 
          className="card"
          whileHover={{ scale: 1.02 }}
        >
          <div className="card-icon"><Megaphone /></div>
          <h3>Avisos por Cercanía</h3>
          <p>Usa Geofencing para avisar a tus feligreses sobre misas o confesiones cuando estén cerca del templo.</p>
        </motion.div>

        <motion.div 
          className="card"
          whileHover={{ scale: 1.02 }}
        >
          <div className="card-icon"><Zap /></div>
          <h3>Gestión de Ministerios</h3>
          <p>Organiza al coro, lectores y voluntarios de manera eficiente con comunicación masiva directa.</p>
        </motion.div>
      </section>

      {/* Value Proposition */}
      <section style={{ padding: '5rem 5%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4rem' }}>
        <div style={{ maxWidth: 500 }}>
          <ShieldCheck size={48} color="#8A2BE2" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontFamily: 'Outfit' }}>Transparencia Absoluta</h2>
          <p style={{ color: '#A0A0A0', fontSize: '1.1rem', lineHeight: '1.6' }}>
            Muestra a tus donantes el impacto real de su aporte. Publica reportes de avance en obras, caridad y mantenimiento directamente en la app del feligrés.
          </p>
        </div>
        <div style={{ 
          width: 400, 
          height: 300, 
          background: 'rgba(138, 43, 226, 0.2)', 
          borderRadius: 30,
          border: '1px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Church size={120} color="#8A2BE2" />
        </div>
      </section>

      {/* Pricing Section (Saas Rental) */}
      <section className="pricing" id="pricing">
        <h2 style={{ fontSize: '3rem', marginBottom: '4rem' }}>Renta Mensual con Valor Infinito</h2>
        <div className="price-card">
          <div className="badge" style={{ background: '#FBC02D', color: '#000', border: 'none' }}>PLAN PRO PARROQUIAL</div>
          <div className="price">$499 <span>MXN / mes</span></div>
          <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginTop: '2rem', marginBottom: '2rem' }}>
            <li style={{ marginBottom: 12 }}><ShieldCheck size={18} color="#4CAF50" /> Miembros Ilimitados</li>
            <li style={{ marginBottom: 12 }}><ShieldCheck size={18} color="#4CAF50" /> Donaciones Directas (Sin Fee)</li>
            <li style={{ marginBottom: 12 }}><ShieldCheck size={18} color="#4CAF50" /> Dashboard de Gestión</li>
            <li style={{ marginBottom: 12 }}><ShieldCheck size={18} color="#4CAF50" /> Avisos Push Gratuitos</li>
            <li style={{ marginBottom: 12 }}><ShieldCheck size={18} color="#4CAF50" /> Soporte 24/7</li>
          </ul>
          <a href="#start" className="btn-primary" style={{ width: '80%', display: 'block', margin: '0 auto' }}>Empezar Prueba</a>
        </div>
      </section>

      {/* Onboarding / Registration Form Section */}
      <section className="registration-section" id="start">
        <div className="registration-container">
          <motion.div 
            className="form-card"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <h2>Registra tu Parroquia</h2>
            <div className="form-steps">
              <div className="step active">1</div>
              <div className="step-line" />
              <div className="step">2</div>
              <div className="step-line" />
              <div className="step">3</div>
            </div>
            
            <div className="form-content">
              <h3>Datos de la Parroquia</h3>
              <div className="input-group">
                <label>Nombre de la Parroquia</label>
                <input type="text" placeholder="Ej: Sagrada Familia" />
              </div>
              <div className="input-group">
                <label>Ubicación (Dirección)</label>
                <input type="text" placeholder="Calle, Número, Ciudad" />
              </div>
              <div className="input-group">
                <label>Nombre del Párroco / Administrador</label>
                <input type="text" placeholder="Pbro. ..." />
              </div>
              
              <button 
                className="btn-primary" 
                style={{ width: '100%', marginTop: '1rem' }}
                onClick={async () => {
                   // Simulación de registro en Supabase
                   alert("🎉 Registro Exitoso: Tu Parroquia ha sido dada de alta en modo Prueba de 30 días. Revisa tu email para los accesos al Admin Hub.");
                   window.location.href = "#pricing"; // Simulación de flujo
                }}
              >
                Continuar a Geofencing
                <ChevronRight size={18} style={{ marginLeft: 8 }} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '8rem 5%', backgroundColor: 'rgba(0,0,0,0.5)', textAlign: 'center' }}>
        <div className="logo" style={{ marginBottom: '2rem' }}>AMEN SAAS</div>
        <p style={{ color: '#A0A0A0', marginBottom: '3rem' }}>Tecnología inspirada en la Fe, diseñada para la Iglesia.</p>
        <div className="social-links" style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
          <Globe size={24} color="#A0A0A0" />
          <Heart size={24} color="#A0A0A0" />
        </div>
      </footer>
    </div>
  );
}

export default App;
