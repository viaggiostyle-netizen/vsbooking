# Backend de Turnos (Express + PostgreSQL)

Implementacion modular para agenda, dashboard y CRM basico.

## Estructura

- `sql/001_core_schema.sql`: tablas, constraints, indices y trigger `updated_at`
- `src/controllers/appointments.controller.js`
- `src/services/appointments.service.js`
- `src/services/dashboard.service.js`
- `src/services/client.service.js`
- `src/utils/metrics.service.js`

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- `DATABASE_URL` configurada

## Instalacion

```bash
cd backend
npm install
cp .env.example .env
```

## Migracion SQL

Ejecutar:

```sql
\i backend/sql/001_core_schema.sql
```

## Correr API

```bash
cd backend
npm run dev
```

Servidor por defecto: `http://localhost:4000`

## Endpoints

- `POST /api/appointments`
- `GET /api/appointments?date=YYYY-MM-DD&status=PENDIENTE`
- `GET /api/appointments/:id`
- `PATCH /api/appointments/:id/status`
- `GET /api/dashboard/metrics`

## Ejemplos

### Crear turno

```json
{
  "service_id": "a9d52b4d-8f08-4d68-8dc7-30d5038f1ccb",
  "date": "2026-03-03",
  "time": "18:30",
  "client": {
    "name": "Camilo",
    "phone": "+5491112345678"
  }
}
```

### Cambiar estado

```json
{
  "status": "COMPLETADO"
}
```

## Reglas implementadas

- Estado inicial de alta: `PENDIENTE`
- Transiciones validas solo desde `PENDIENTE`
- `COMPLETADO`:
  - crea `revenue_logs`
  - incrementa `total_completed`
  - activa `is_recurrent` en 5+
- Bloqueo de doble procesamiento con transacciones y `unique(appointment_id)` en `revenue_logs`
- Proximo turno:
  - toma el pendiente mas cercano
  - si existe pendiente vencido hoy, bloquea avance hasta resolucion manual
- Dashboard en tiempo real:
  - turnos de hoy
  - total estimado de hoy
  - completados / no show / no vino aviso / cancelados
  - clientes totales y recurrentes
  - facturacion total
  - hora de mayor demanda
  - comparacion mensual contra mes anterior
  - serie de ingresos por dia
