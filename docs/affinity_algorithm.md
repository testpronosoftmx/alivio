# Algoritmo de Afinidad Doctrinal (Dating & Community)

## Objetivo
Resolver la "mentalidad de escasez" y los errores de filtrado típicos de las plataformas de citas actuales, priorizando la comunión de fondo (acuerdos doctrinales y estilo de vida sacramental) por encima de rasgos meramente físicos.

## Especificación del Algoritmo (Pseudocódigo)

El algoritmo calcula un `doctrinal_affinity_score` de 0 a 100.

### 1. Frecuencia Sacramental (Max 30 pts)
Premia la coherencia en la vivencia de los sacramentos (Misa y Confesión).
```javascript
let score = 0;
switch(user.sacraments) {
    case 'diario': score += 30; break;
    case 'semanal': score += 20; break;
    case 'mensual': score += 10; break;
    default: score += 0;
}
```

### 2. Compromiso de Castidad (Max 30 pts)
Un pilar fundamental para las relaciones basadas en la Teología del Cuerpo.
```javascript
if (user.chastity_commitment === true) {
    score += 30;
}
```

### 3. Acuerdo con el Magisterio (Max 40 pts)
Se presenta un cuestionario inicial rápido (Icebreakers doctrinales) basado en el Catecismo.
```javascript
const maxPreguntas = 5; // Ej: Apertura a la vida, Magisterio Papal, etc.
let preguntasAcertadas = user.doctrinal_answers.filter(ans => ans === 'Conforme al Magisterio').length;

// Hasta 40 puntos (8 puntos por pregunta acertada)
score += (preguntasAcertadas * 8);
```

### Filtro de "Deal-breakers"
Independientemente del puntaje general, los usuarios pueden configurar filtros estrictos:
- "Solo mostrar perfiles que estén de acuerdo con la enseñanza de la Iglesia sobre [Tema X]".
- Perfiles con Insignia de Verificación (contra scammers) reciben un boost en visibilidad.
