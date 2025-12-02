# Guía de Demostración del Proyecto

Este documento describe los pasos para probar el sistema TWL Data Pipeline y qué se espera ver en cada paso durante la demostración.

## Preparación Antes de la Demostración

Antes de iniciar, el sistema debe estar completamente operativo:

- Docker y Docker Compose ejecutándose con todos los contenedores activos
- Todos los microservicios iniciados y funcionando (`npm run dev`)
- Bucket de MinIO creado (`twl-raw-data`)
- Cola SQS creada en LocalStack (`twl-processing-queue`)
- Endpoints accesibles en los puertos 3000, 3001, 3002, 3003
- Migraciones de base de datos ejecutadas

## Pasos para Probar el Sistema

### Paso 1: Verificar que los Servicios Estén Corriendo

**Comando a ejecutar**:
```bash
# Verificar contenedores Docker
docker-compose ps

# Verificar health de cada servicio
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

**Qué se espera ver**:
- Todos los contenedores Docker con estado "Up" y "healthy"
- Respuestas JSON de los endpoints de health indicando que los servicios están operativos:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-01-15T10:30:00Z"
  }
  ```

### Paso 2: Ejecutar la Ingestión de Datos

**Comando a ejecutar**:
```bash
curl -X POST http://localhost:3001/ingestion/trigger
```

**Qué se espera ver**:

1. **Respuesta del endpoint**:
   ```json
   {
     "message": "Ingestion triggered successfully"
   }
   ```

2. **En los logs del Ingestion Service** (terminal donde corre `npm run dev`):
   ```
   [LOG] [IngestionService] Starting ingestion
   [LOG] [IngestionService] Ingesting data from source: jsonplaceholder
   [LOG] [IngestionService] Ingesting data from source: reqres
   [LOG] [IngestionService] Ingesting data from source: mock
   [DEBUG] [StorageService] Stored raw data: raw/source=jsonplaceholder/ingest_date=2025-01-15/item-1.json
   [DEBUG] [QueueService] Published message to queue: jsonplaceholder-1-abc123
   [LOG] [IngestionService] Completed ingestion for source: jsonplaceholder, items: 100
   ```

3. **En MinIO Console** (http://localhost:9001):
   - Archivos creados en el bucket `twl-raw-data`
   - Estructura de carpetas: `raw/source=jsonplaceholder/ingest_date=2025-01-15/`
   - Archivos JSON con los datos raw de cada fuente

4. **En los logs del Processing Service** (después de unos segundos):
   ```
   [LOG] [QueueConsumerService] Consuming messages from queue
   [LOG] [ProcessingService] Processing message: jsonplaceholder-1-abc123
   ```

### Paso 3: Verificar el Procesamiento de Datos

**Comandos a ejecutar**:
```bash
# Opción 1: Revisar logs del Processing Service
# (Observar la terminal donde corre el servicio)

# Opción 2: Consultar MongoDB directamente
mongosh mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin
db.curatedrecords.find().limit(5).pretty()
```

**Qué se espera ver**:

1. **En los logs del Processing Service**:
   ```
   [LOG] [ProcessingService] Processing message: jsonplaceholder-1-abc123
   [LOG] [ProcessingService] Successfully processed message: jsonplaceholder-1-abc123
   [LOG] [ProcessingService] Processing message: reqres-1-xyz789
   [LOG] [ProcessingService] Successfully processed message: reqres-1-xyz789
   ```

2. **En MongoDB** (si se consulta directamente):
   - Registros en la colección `curatedrecords` con estructura:
     ```json
     {
       "_id": ObjectId("..."),
       "sourceId": "jsonplaceholder",
       "originalId": "jsonplaceholder-1-abc123",
       "capturedAt": ISODate("2025-01-15T10:30:00Z"),
       "normalizedFields": {
         "title": "Post Title",
         "content": "Post content...",
         "author": "1"
       },
       "fingerprint": "abc123xyz",
       "dedupStatus": "unique",
       "processedAt": ISODate("2025-01-15T10:31:00Z")
     }
     ```

3. **Si hay duplicados** (al ejecutar ingestion dos veces):
   ```
   [WARN] [ProcessingService] Duplicate detected for fingerprint: abc123xyz
   [WARN] [ProcessingService] Message jsonplaceholder-1-abc123 already processed, skipping
   ```

### Paso 4: Consultar Datos mediante REST API

**Comando a ejecutar**:
```bash
curl http://localhost:3003/api/reporting/records?limit=5
```

**Qué se espera ver**:

Respuesta JSON con registros procesados:
```json
{
  "records": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "sourceId": "jsonplaceholder",
      "originalId": "jsonplaceholder-1-abc123",
      "capturedAt": "2025-01-15T10:30:00Z",
      "normalizedFields": {
        "title": "Post Title",
        "content": "Post content...",
        "author": "1"
      },
      "dedupStatus": "unique"
    }
  ],
  "total": 150,
  "limit": 5,
  "offset": 0
}
```

### Paso 5: Consultar Datos mediante GraphQL

**Comando a ejecutar**:
```bash
curl -X POST http://localhost:3003/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ records(limit: 5) { _id sourceId normalizedFields { title content } } }"}'
```

**Qué se espera ver**:

Respuesta GraphQL:
```json
{
  "data": {
    "records": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "sourceId": "jsonplaceholder",
        "normalizedFields": {
          "title": "Post Title",
          "content": "Post content..."
        }
      }
    ]
  }
}
```

### Paso 6: Acceder a la Documentación Swagger

**Acción**: Abrir en el navegador http://localhost:3003/api

**Qué se espera ver**:
- Interfaz Swagger UI con todos los endpoints documentados
- Endpoints agrupados por categorías (reporting, auth)
- Botón "Authorize" para autenticación JWT
- Posibilidad de probar endpoints directamente desde la interfaz

### Paso 7: Probar Autenticación y Endpoint Protegido

**Comandos a ejecutar**:
```bash
# 1. Registrar un usuario
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# 2. Hacer login
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# 3. Usar el token para acceder a analytics (endpoint protegido)
curl -H "Authorization: Bearer <token_obtenido_del_login>" \
  http://localhost:3003/api/reporting/analytics
```

**Qué se espera ver**:

1. **Registro de usuario**:
   ```json
   {
     "message": "User registered successfully",
     "userId": 1
   }
   ```

2. **Login**:
   ```json
   {
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": 1,
       "email": "demo@example.com"
     }
   }
   ```

3. **Analytics (con token válido)**:
   ```json
   {
     "total": 150,
     "bySource": [
       {
         "_id": "jsonplaceholder",
         "count": 100,
         "unique": 95,
         "duplicates": 5
       },
       {
         "_id": "reqres",
         "count": 50,
         "unique": 50,
         "duplicates": 0
       }
     ],
     "byDate": [
       {
         "_id": "2025-01-15",
         "count": 150
       }
     ]
   }
   ```

4. **Sin token o token inválido**:
   ```json
   {
     "statusCode": 401,
     "message": "Unauthorized"
   }
   ```

### Paso 8: Acceder al Frontend

**Acción**: Abrir en el navegador http://localhost:3000

**Qué se espera ver**:

1. **Página de Login**:
   - Formulario con campos de email y password
   - Diseño moderno y responsive

2. **Después del Login - Lista de Registros**:
   - Tabla o lista mostrando los registros procesados
   - Paginación funcional (botones siguiente/anterior)
   - Información visible: sourceId, título, fecha de captura
   - Opción de ver detalle de cada registro

3. **Dashboard de Analytics**:
   - Gráfico de barras o pie chart mostrando total de registros
   - Gráfico mostrando registros por fuente (jsonplaceholder, reqres, mock)
   - Gráfico de línea mostrando registros por fecha (últimos 30 días)
   - Números totales y estadísticas

4. **Vista de Detalle de Registro**:
   - Al hacer clic en un registro, muestra:
     - ID del registro
     - Fuente de origen
     - Campos normalizados (título, contenido, autor)
     - Fecha de captura y procesamiento
     - Estado de deduplicación

### Paso 9: Verificar Deduplicación

**Comandos a ejecutar**:
```bash
# Ejecutar ingestion nuevamente (debe detectar duplicados)
curl -X POST http://localhost:3001/ingestion/trigger

# Esperar unos segundos y revisar logs del Processing Service
```

**Qué se espera ver**:

En los logs del Processing Service:
```
[LOG] [ProcessingService] Processing message: jsonplaceholder-1-abc123
[WARN] [ProcessingService] Duplicate detected for fingerprint: abc123xyz
[WARN] [ProcessingService] Message jsonplaceholder-1-abc123 already processed, skipping
```

En MongoDB, los registros duplicados deben tener `dedupStatus: "duplicate"` y no deben crearse nuevos registros con el mismo fingerprint.

### Paso 10: Verificar Health Checks

**Comandos a ejecutar**:
```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

**Qué se espera ver**:

Respuestas JSON de cada servicio indicando su estado:
```json
{
  "status": "ok",
  "service": "ingestion",
  "timestamp": "2025-01-15T10:30:00Z",
  "uptime": 3600
}
```

### Paso 11: Verificar Reprocesamiento

**Comando a ejecutar**:
```bash
# Obtener un S3 key de un archivo raw (desde MinIO o logs)
# Luego reprocesar
curl -X POST http://localhost:3002/processing/reprocess/raw/source=jsonplaceholder/ingest_date=2025-01-15/item-1.json
```

**Qué se espera ver**:

En los logs del Processing Service:
```
[LOG] [ProcessingService] Reprocessing from raw data: raw/source=jsonplaceholder/ingest_date=2025-01-15/item-1.json
[LOG] [ProcessingService] Processing message: jsonplaceholder-1-abc123
[WARN] [ProcessingService] Message jsonplaceholder-1-abc123 already processed, skipping
```

El sistema debe ser idempotente: reprocesar el mismo archivo no debe crear duplicados.

## Resumen de Resultados Esperados

Al completar todos los pasos, se debe haber verificado:

1. ✅ Todos los servicios están corriendo y responden a health checks
2. ✅ La ingestion obtiene datos de las fuentes y los guarda en S3
3. ✅ Los mensajes se publican correctamente en la cola SQS
4. ✅ El processing consume mensajes y procesa los datos
5. ✅ Los datos procesados se guardan en MongoDB con estructura normalizada
6. ✅ El Reporting API expone los datos mediante REST y GraphQL
7. ✅ La autenticación JWT funciona correctamente
8. ✅ Los endpoints protegidos requieren token válido
9. ✅ El frontend muestra los datos y analytics correctamente
10. ✅ La deduplicación funciona y detecta duplicados
11. ✅ El reprocesamiento es idempotente

## Troubleshooting Durante la Demo

Si algo no funciona como se espera:

1. **Servicios no responden**: Verificar que `npm run dev` esté corriendo y que los puertos no estén ocupados
2. **No hay datos en MongoDB**: Verificar que el Processing Service haya consumido los mensajes de la cola
3. **Error de autenticación**: Verificar que el token JWT sea válido y no haya expirado
4. **Frontend no muestra datos**: Verificar que el Reporting API esté funcionando y que haya datos en MongoDB
5. **MinIO no muestra archivos**: Verificar que el bucket `twl-raw-data` exista y que la ingestion se haya ejecutado

