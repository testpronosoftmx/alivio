# Modelo de Negocio: Sustainer & Micro-suscripciones

## Visión Estratégica
Evitar el muro de pago (paywall) duro restrictivo que bloquea contenido esencial (Biblia, Rosario), que frecuentemente causa enojo en plataformas religiosas. Se opta por un modelo híbrido "Freemium + Patronazgo".

## 1. Modelo de Sustentador (Sustainers)
- **Mensaje Clave:** *"No estás pagando por contenido premium; estás financiando a que usuarios jóvenes y personas en países en desarrollo puedan usar Ecclesia OS gratis."*
- **Precio:** **$4.99 / mes** o **$49.99 / año**.
- **Beneficios (Perks):** 
  - Insignia dorada de "Sustentador" en su perfil (Comunidad y Oración).
  - Acceso a reportes de transparencia global ("Has ayudado a que X personas oren este mes").

## 2. Micro-suscripciones (Retos de Temporada)
- Unidades de compromiso de corto plazo, ideales para usuarios con "Suscripción-Fatiga".
- **Reto de Cuaresma (40 Días):** $2.99 en pago único. Habilita un tracker especial, audios exclusivos meditativos del Vía Crucis y recordatorios de ayuno.
- **Reto de Adviento (25 Días):** $2.49 en pago único. Acceso a Lectio Divina diaria con reflexiones específicas esperando la Navidad.
- **Conversión:** Estos usuarios esporádicos son luego invitados al modelo de Sustentador al terminar su reto.

## 3. Modelo B2B (Membresías de Parroquia)
- Las parroquias pagan una licencia SaaS basada en el tamaño de feligresía (Tiers desde Gratis para rurales pequeñas hasta $150/mes para mega-parroquias).
- Obtienen acceso al Dashboard de Data, envío de correos masivos y configuración de la pasarela de recolección de diezmos (Ecclesia Pay con un 1.5% de fee de procesamiento).

## 4. Arquitectura de Ingresos para el Propietario (Owner Revenue)
Aquí es donde tú (Owner del SaaS) generas rentabilidad estructural:

1. **Fee de Procesamiento (Ecclesia Pay):** Cobras un **1.5% de comisión** por cada donación/diezmo que pase por la app. Si una parroquia recauda $10,000 al mes, tú ganas **$150** solo por esa parroquia. Con 100 parroquias, son **$15,000/mes** de ingreso pasivo.
2. **Suscripción B2B (Licenciamiento):** Ingreso recurrente fijo de las parroquias por usar el software de gestión (Dashboard, CRM, Notificaciones). 
3. **Sustentadores B2C:** El 100% de los **$4.99/mes** de los usuarios individuales va para el mantenimiento y escalabilidad de la plataforma.
4. **Micro-Suscripciones (Retos):** Ingresos pico durante Cuaresma y Adviento. El volumen de miles de usuarios pagando **$2.99** por un reto de 40 días genera una inyección de capital significativa para marketing y nuevos contenidos.

**Resumen:** Ganas por **Volumen de Usuarios** (Sustentadores), por **Volumen de Parroquias** (SaaS License) y por **Transaccionalidad** (Donaciones).

## 5. Arquitectura de Pagos y Separación de Fondos
Para garantizar la confianza de la Iglesia y la transparencia legal, implementamos una arquitectura de **Split Payments** (Pagos Divididos) utilizando **Stripe Connect**:

1. **Cuentas Conectadas (Connected Accounts):** Cada parroquia vincula su propia cuenta bancaria a través de un onboarding nativo de Stripe. La parroquia es la dueña legal de su "Connected Account".
2. **Stripe Connect Express/Custom:** 
   - Cuando un feligrés dona **$100.00**: 
   - **Stripe** procesa el pago y automáticamente separa las tajadas en la misma transacción.
   - **98.5% ($98.50)** (menos comisiones bancarias) se deposita directamente en la cuenta de la **Parroquia**.
   - **1.5% ($1.50)** se deposita instantáneamente en tu **Cuenta de Plataforma (Ecclesia OS)**.
3. **Seguridad:** Tú como propietario de la plataforma **NUNCA tocas el dinero de la iglesia**. El flujo es automático y transparente, lo que elimina cualquier riesgo de malversación o desconfianza por parte del párroco.
4. **Reportes:** Tanto tú como la parroquia reciben reportes de conciliación automáticos generados por la API de Stripe vinculada a Supabase.
