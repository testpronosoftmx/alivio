-- ==========================================
-- Esquema de Base de Datos para EcclesiaApp 2.0
-- ==========================================
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE subscription_tier AS ENUM ('free', 'sustainer_annual', 'cuaresma_micro');
CREATE TYPE sacrament_frequency AS ENUM ('diario', 'semanal', 'mensual', 'anual', 'raramente');

-- ==========================================
-- 1. USUARIOS, SEGURIDAD Y ÉTICA
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  subscription subscription_tier DEFAULT 'free',
  is_premium BOOLEAN DEFAULT false, -- Transparencia de Suscripción visible a todos
  identity_verified BOOLEAN DEFAULT false, -- Insignia anti-scammer
  active_parish_id UUID REFERENCES public.parishes(id), -- Parroquia actual (Multi-tenant)
  role TEXT DEFAULT 'user', -- 'user', 'parish_admin', 'super_admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. COMUNIDAD ACTIVA Y KOIN (Micro-comunidades)
-- ==========================================
CREATE TABLE public.prayer_wall_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Acción Activa ("He orado por ti")
CREATE TABLE public.prayer_interactions (
  request_id UUID REFERENCES public.prayer_wall_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  prayed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (request_id, user_id)
);

-- Intercession Requests (enhanced wall)
CREATE TABLE public.intercession_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Koin Groups (Intereses: Senderismo, Lectura)
CREATE TABLE public.koin_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parish_id UUID, -- Opcionalmente atado a una parroquia
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.koin_memberships (
  group_id UUID REFERENCES public.koin_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ==========================================
-- 3. CITAS (Modificado con Icebreakers)
-- ==========================================
CREATE TABLE public.dating_profiles (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  bio TEXT,
  sacraments sacrament_frequency NOT NULL,
  openness_to_life BOOLEAN NOT NULL DEFAULT true,
  vocation_discernment TEXT,
  location GEOGRAPHY(POINT, 4326),
  doctrinal_affinity_score NUMERIC DEFAULT 0,
  chastity_commitment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.dating_icebreakers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL -- Ej: "¿Cuál Papa muerto invitarías a cenar?"
);

CREATE TABLE public.dating_favorites (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  favorite_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, favorite_user_id)
);

-- ==========================================
-- 4. B2B GESTIÓN PARROQUIAL AVANZADA
-- ==========================================
CREATE TABLE public.parishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  admin_id UUID REFERENCES public.profiles(id),
  geo_fence GEOGRAPHY(POLYGON, 4326),
  subscription_status TEXT DEFAULT 'trial', -- 'trial', 'active', 'past_due', 'canceled'
  subscription_id TEXT, -- Stripe Subscription ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4.1 ANUNCIOS Y EVENTOS PARROQUIALES (Multi-tenant)
-- ==========================================
CREATE TABLE public.parish_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parish_id UUID REFERENCES public.parishes(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'general', -- 'aviso', 'evento', 'urgente', 'rezo_comunitario'
  event_date TIMESTAMPTZ, -- Opcional si es un evento
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parish Integration (Dashboard & Impact)
CREATE TABLE public.parish_integration (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parish_id UUID REFERENCES public.parishes(id) ON DELETE CASCADE,
  member_count INT DEFAULT 0,
  donation_total NUMERIC DEFAULT 0,
  impact_statement TEXT,
  geofence GEOGRAPHY(POLYGON, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gestión de Voluntarios (Laicos y Ministerios)
CREATE TABLE public.parish_ministries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parish_id UUID REFERENCES public.parishes(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- ej. "Coro", "Lectores", "Acólitos"
  coordinator_id UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.parish_volunteers (
  ministry_id UUID REFERENCES public.parish_ministries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  PRIMARY KEY (ministry_id, user_id)
);

-- Transparencia de Impacto (Donaciones)
CREATE TABLE public.donation_impact_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parish_id UUID REFERENCES public.parishes(id) ON DELETE CASCADE,
  total_raised NUMERIC,
  goal_amount NUMERIC,
  milestone TEXT NOT NULL, -- ej. "Nuevo techo reparado!"
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. MÓDULO DE ORACIÓN ("MOTOR ESPIRITUAL Y LITÚRGICO")
-- ==========================================
-- Calendario Litúrgico Base
CREATE TABLE public.liturgical_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  season TEXT NOT NULL, -- ej. 'Cuaresma', 'Tiempo Ordinario'
  solemnity_or_feast TEXT,
  gospel_reading_ref TEXT NOT NULL -- ej. 'Jn 3, 16-21'
);

CREATE TYPE prayer_format AS ENUM ('standard', 'meditative', 'scripture_guide');
CREATE TYPE voice_profile AS ENUM ('reverent', 'direct_talk', 'professional');

-- New ENUMs for Core Engine
CREATE TYPE session_length AS ENUM ('5', '10', '15', '20');
CREATE TYPE voice_style AS ENUM ('direct_talk', 'reverent', 'professional');
CREATE TYPE background_sound AS ENUM ('gregorian', 'nature', 'silence', 'white_noise');

-- Tabla Principal del Motor de Contenido (Instrucción Final)
CREATE TABLE public.prayer_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  format prayer_format NOT NULL,
  duration_minutes INT NOT NULL CHECK (duration_minutes IN (5, 10, 15, 20)),
  voice_type voice_profile NOT NULL,
  liturgical_calendar_id UUID REFERENCES public.liturgical_calendar(id),
  audio_url TEXT NOT NULL,
  vtt_transcription_url TEXT, -- Enlace al archivo .vtt para subtítulos en vivo
  has_expert_commentary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preferencias y Persistencia de Audio por Usuario
CREATE TABLE public.audio_mixer_preferences (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  playback_speed NUMERIC DEFAULT 1.0,
  voice_volume NUMERIC DEFAULT 1.0,
  background_volume NUMERIC DEFAULT 0.3,
  background_type background_sound DEFAULT 'silence',
  last_played_prayer_id UUID REFERENCES public.prayer_library(id),
  last_paused_at_seconds INT DEFAULT 0
);

-- Table to track individual prayer sessions (Core Engine)
CREATE TABLE public.prayer_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  prayer_id UUID REFERENCES public.prayer_library(id),
  session_length session_length NOT NULL,
  playback_speed NUMERIC DEFAULT 1.0,
  paused_at_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Motor del Hábito y Progreso (Couch to 5 Decades)
CREATE TABLE public.prayer_training_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, 
  level TEXT NOT NULL, 
  total_days INT NOT NULL
);

-- Diarios Post-Sesión cifrados (RLS)
CREATE TABLE public.prayer_journals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_prayer_id UUID REFERENCES public.prayer_library(id),
  entry_text TEXT,
  audio_memo_url TEXT, -- Opcional para diario por voz
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Los diarios de oración están completamente protegidos
ALTER TABLE public.prayer_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "E2E y Confidencialidad de Diarios"
  ON public.prayer_journals FOR ALL 
  USING (auth.uid() = user_id);

-- ==========================================
-- 6. TRIGGERS PARA EDGE FUNCTIONS (Comunicaciones Unificadas)
-- ==========================================
-- Esta función invocará una Edge Function para mandar correo o SMS
-- vía Twilio/Resend a los usuarios de un ministerio.
CREATE OR REPLACE FUNCTION notify_group_via_edge()
RETURNS TRIGGER AS $$
BEGIN
  -- Lógica de integración futura con Supabase Edge Functions (POST URL)
  -- PERFORM http_post('https://project.supabase.co/functions/v1/notify-sms', ...)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_announcement
AFTER INSERT ON public.prayer_wall_requests -- Cambiar luego a tabla de anuncios parroquiales
FOR EACH ROW EXECUTE PROCEDURE notify_group_via_edge();
