# API Reference — Gmail AI Agent

Base URL: `http://localhost:8000`

<!-- AUTO-GENERATED -->
## Endpoints

---

### GET /api/emails

Obtiene y clasifica en tiempo real los correos no leídos de Gmail usando Gemini.

**Response:**
```json
{
  "emails": [
    {
      "id": "string",
      "subject": "string",
      "sender": "string",
      "category": "reunion | urgente | promocion | informativo | otro",
      "summary": "string",
      "event_data": {
        "title": "string",
        "date": "YYYY-MM-DD",
        "time": "HH:MM",
        "location": "string"
      }
    }
  ],
  "total": 0,
  "fetched_at": "ISO datetime"
}
```

**Códigos:**
- `200` — OK
- `502` — Error al conectar con Gmail o Gemini

---

### GET /api/emails/stats

Estadísticas de los correos no leídos actuales agrupados por categoría.

**Response:**
```json
{
  "total": 0,
  "by_category": { "reunion": 2, "urgente": 1 },
  "fetched_at": "ISO datetime"
}
```

---

### GET /api/emails/processed

Correos ya procesados y guardados en SQLite.

**Query params:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `view` | string | `today` | `today` o `history` |
| `since` | string | — | Fecha mínima `YYYY-MM-DD` (solo `history`) |
| `category` | string | — | Filtrar por categoría (solo `history`) |

**Response:**
```json
{
  "emails": [
    {
      "id": 1,
      "email_id": "string",
      "subject": "string",
      "sender": "string",
      "category": "string",
      "summary": "string",
      "processed_at": "ISO datetime",
      "day": "YYYY-MM-DD"
    }
  ],
  "total": 0,
  "view": "today",
  "fetched_at": "ISO datetime"
}
```

---

### POST /api/process

Fuerza un ciclo de procesamiento inmediato: obtiene correos → clasifica → guarda en SQLite → crea eventos de reunión → marca como leídos.

**Response:**
```json
{
  "message": "Ciclo de procesamiento ejecutado correctamente",
  "executed_at": "ISO datetime"
}
```

**Códigos:**
- `200` — OK
- `500` — Error durante el ciclo

---

### GET /api/stats/categories

Distribución histórica de correos por categoría (SQLite).

**Query params:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `since` | string | — | Fecha mínima `YYYY-MM-DD` |

**Response:**
```json
{
  "total": 0,
  "by_category": { "reunion": 5, "promocion": 12 },
  "fetched_at": "ISO datetime"
}
```

---

### GET /api/stats/daily

Volumen de correos procesados agrupado por día.

**Query params:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `days` | int | `30` | Número de días hacia atrás |

**Response:**
```json
{
  "daily": [
    { "day": "YYYY-MM-DD", "total": 5, "by_category": { "reunion": 2 } }
  ],
  "fetched_at": "ISO datetime"
}
```

---

### GET /api/stats/senders

Top remitentes por número de correos enviados.

**Query params:**
| Param | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `limit` | int | `10` | Número de remitentes a devolver |
| `since` | string | — | Fecha mínima `YYYY-MM-DD` |

**Response:**
```json
{
  "senders": [
    { "sender": "usuario@ejemplo.com", "count": 8 }
  ],
  "fetched_at": "ISO datetime"
}
```

---

### GET /api/calendar/events

Próximos eventos de Google Calendar (próximos 30 días, máximo 50).

**Response:**
```json
{
  "events": [
    {
      "id": "string",
      "title": "string",
      "start": "ISO datetime",
      "end": "ISO datetime",
      "location": "string",
      "description": "string",
      "link": "https://calendar.google.com/...",
      "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
    }
  ],
  "total": 0,
  "fetched_at": "ISO datetime"
}
```

---

### POST /api/calendar/events

Crea un evento manualmente en Google Calendar.

**Request body:**
```json
{
  "title": "Reunión con cliente",
  "date": "2026-04-01",
  "time": "10:00",
  "location": "Sala A",
  "description": "Revisión del proyecto"
}
```

> `time`, `location` y `description` son opcionales. Sin `time` se crea un evento de día completo.

**Response:**
```json
{
  "message": "Evento creado correctamente",
  "event": { "id": "...", "title": "...", "start": "...", "end": "..." },
  "created_at": "ISO datetime"
}
```

**Códigos:**
- `201` — Evento creado
- `422` — Faltan campos obligatorios (title o date)
- `502` — Error al conectar con Google Calendar

---

### DELETE /api/calendar/events/{event_id}

Elimina un evento de Google Calendar por su ID.

**Path param:** `event_id` — ID del evento en Google Calendar

**Códigos:**
- `204` — Evento eliminado correctamente
- `404` — Evento no encontrado o ya eliminado
- `502` — Error al conectar con Google Calendar

<!-- /AUTO-GENERATED -->
