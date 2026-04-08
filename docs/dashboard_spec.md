# Dashboard B2B Parroquial (ChMS Hub)

## Objetivo
Atender la "Brecha de Compromiso Digital" de las parroquias, unificando la base de datos de miembros, comunicación (SMS/Email) y donaciones en una sola plataforma, eliminando el "copy-paste".

## Componentes del Dashboard (Wireframe Lógico)

### 1. Panel Resumen (Top Fold)
- **Miembros Activos:** `4,500` (+12% vs mes pasado).
- **Recaudación Mensual:** `$12,000` / Meta: `$15,000`.
- **Voluntarios Registrados:** `120` distribuidos en 14 Ministerios.

### 2. Transparencia de Impacto (Donaciones)
Módulo público que se refleja en la app de los feligreses.
- **Gráfico de Barras D3.js:** Evolución del ofertorio.
- **Impact Statements:**
  - *“Gracias a tu donación, hemos logrado reparar el techo del salón parroquial (100%).”*
  - *“Alimentamos a 50 familias esta semana.”*
- *Justificación:* Mostrar el impacto real eleva drásticamente la conversión del ofertorio online.

### 3. Comunicación y Geofencing
- **Buzón de Emisión (Broadcast):** Envío unificado de correos electrónicos y SMS (Push vía Supabase Edge Functions + Twilio/Resend).
- **Geofence Configurator:** 
  - Zona: `Polygon de 1km alrededor de la parroquia.`
  - Trigger: *Usuario entra en la zona un sábado por la tarde.*
  - Acción: Enviar Push notification con horarios de Confesión.

### 4. Gestión de Voluntarios (Koinonia)
- Listado agrupado por ministerios (Coro, Lectores, Pastoral Social).
- Enlace directo a Grupos Koinonia para facilitar la comunicación de células y grupos pequeños.
