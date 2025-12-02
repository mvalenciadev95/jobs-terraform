# Runbook - Guía Operacional

Este documento es tu guía para operar el sistema día a día. Incluye cómo levantar el proyecto, cómo hacer troubleshooting cuando algo falla, y cómo mantenerlo en producción.

## Prerrequisitos

Antes de empezar, asegúrate de tener instalado:

- **Node.js 18 o superior**: Para ejecutar los servicios
- **Docker y Docker Compose**: Para la infraestructura local (PostgreSQL, MongoDB, MinIO, etc.)
- **Terraform 1.5 o superior**: Solo si vas a desplegar en AWS (para desarrollo local no es necesario)
- **AWS CLI**: Solo si vas a desplegar en AWS (necesitas estar configurado con credenciales)

Verifica que todo esté instalado:

```bash
node --version    # Debe ser 18 o superior
docker --version
docker-compose --version
terraform --version  # Opcional
aws --version  # Opcional
```

## Desarrollo Local

### Levantar la Infraestructura

Primero necesitas levantar los servicios de infraestructura (bases de datos, S3 local, etc.):

```bash
docker-compose up -d
```

Esto inicia:
- **PostgreSQL** en puerto 5433 (mapeado desde 5432 interno)
- **MongoDB** en puerto 27017
- **MinIO** (S3 local) en puertos 9000 (API) y 9001 (Console)
- **Redis** en puerto 6379 (aunque no lo usamos actualmente, está disponible)
- **LocalStack** en puerto 4566 (para simular SQS localmente)

Verifica que todo esté corriendo:

```bash
docker-compose ps
```

Deberías ver todos los servicios con estado "Up" y "healthy".

### Instalar Dependencias

Instala las dependencias del proyecto raíz y de todos los microservicios:

```bash
npm run install:all
```

Esto puede tardar unos minutos la primera vez. Instala dependencias en:
- `apps/ingestion/`
- `apps/processing/`
- `apps/reporting-api/`
- `apps/web-frontend/`

### Configurar Variables de Entorno

Cada servicio necesita un archivo `.env` con sus configuraciones. Copia los archivos de ejemplo:

**En Windows (PowerShell)**:
```powershell
Copy-Item apps/ingestion/.env.example apps/ingestion/.env
Copy-Item apps/processing/.env.example apps/processing/.env
Copy-Item apps/reporting-api/.env.example apps/reporting-api/.env
Copy-Item apps/web-frontend/.env.example apps/web-frontend/.env.local
```

**En Linux/Mac**:
```bash
cp apps/ingestion/.env.example apps/ingestion/.env
cp apps/processing/.env.example apps/processing/.env
cp apps/reporting-api/.env.example apps/reporting-api/.env
cp apps/web-frontend/.env.example apps/web-frontend/.env.local
```

Los archivos de ejemplo ya tienen valores por defecto para desarrollo local, así que puedes usarlos directamente. Si necesitas cambiar algo (por ejemplo, las credenciales de las bases de datos), edita los archivos `.env`.

### Crear Bucket de MinIO

MinIO es S3 local. Necesitas crear un bucket llamado `twl-raw-data` antes de que el Ingestion Service pueda guardar datos.

**Opción 1: Desde el navegador (más fácil)**:
1. Abre http://localhost:9001 en tu navegador
2. Login con `minioadmin` / `minioadmin`
3. Haz clic en "Create Bucket"
4. Nombre: `twl-raw-data`
5. Haz clic en "Create Bucket"

**Opción 2: Con AWS CLI**:
```bash
aws --endpoint-url=http://localhost:9000 s3 mb s3://twl-raw-data
```

### Crear Cola SQS en LocalStack

LocalStack simula SQS localmente. Necesitas crear la cola antes de que los servicios puedan usarla.

**Con AWS CLI**:
```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name twl-processing-queue \
  --region us-east-1
```

**O con curl**:
```bash
curl -X POST http://localhost:4566/000000000000/twl-processing-queue
```

Verifica que la cola existe:
```bash
aws --endpoint-url=http://localhost:4566 sqs list-queues --region us-east-1
```

Deberías ver la cola `twl-processing-queue` en la lista.

### Ejecutar Migraciones de Base de Datos

Esto crea las tablas necesarias en PostgreSQL (principalmente la tabla `users`):

```bash
npm run migration:run
```

Si todo va bien, verás un mensaje de éxito. Si hay errores, verifica que PostgreSQL esté corriendo y que las credenciales en `.env` sean correctas.

### Iniciar Todos los Servicios

Ahora puedes iniciar todos los microservicios en modo desarrollo:

```bash
npm run dev
```

Esto inicia los 4 servicios en paralelo:
- **Ingestion Service**: http://localhost:3001
- **Processing Service**: http://localhost:3002
- **Reporting API**: http://localhost:3003
- **Frontend**: http://localhost:3000

Deberías ver logs de cada servicio en la terminal. Si ves errores, revisa la sección de Troubleshooting más abajo.

### Probar que Todo Funciona

Una vez que los servicios estén corriendo, prueba el flujo completo:

1. **Trigger ingestion**:
   ```bash
   curl -X POST http://localhost:3001/ingestion/trigger
   ```

2. **Verifica que se procesaron los datos**:
   - Espera unos segundos para que el Processing Service consuma los mensajes
   - Revisa los logs del Processing Service para ver "Successfully processed message"
   - O consulta MongoDB directamente:
     ```bash
     mongosh mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin
     db.curatedrecords.find().limit(5)
     ```

3. **Accede al frontend**:
   - Abre http://localhost:3000 en tu navegador
   - Primero registra un usuario:
     ```bash
     curl -X POST http://localhost:3003/api/auth/register \
       -H "Content-Type: application/json" \
       -d '{"email":"demo@example.com","password":"demo123"}'
     ```
   - Luego haz login en el frontend con esas credenciales
   - Deberías ver los registros procesados

## Troubleshooting

### Los Servicios No Inician

**Síntoma**: Cuando ejecutas `npm run dev`, los servicios no inician o fallan inmediatamente.

**Posibles causas**:
1. Los puertos 3000, 3001, 3002, 3003 ya están en uso
2. Las bases de datos no están corriendo
3. Variables de entorno incorrectas

**Solución**:

1. Verifica que los puertos estén libres:
   ```bash
   # Windows
   netstat -an | findstr "3000 3001 3002 3003"
   
   # Linux/Mac
   netstat -an | grep -E '3000|3001|3002|3003'
   ```
   Si algún puerto está en uso, cierra la aplicación que lo está usando o cambia el puerto en el código.

2. Verifica que Docker esté corriendo:
   ```bash
   docker-compose ps
   ```
   Todos los servicios deben estar "Up" y "healthy". Si no, reinicia:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. Verifica las variables de entorno:
   - Asegúrate de que los archivos `.env` existan
   - Verifica que las credenciales de las bases de datos sean correctas (por defecto: postgres/postgres para PostgreSQL, admin/admin para MongoDB)

### Las Bases de Datos No Conectan

**Síntoma**: Los servicios muestran errores de conexión a PostgreSQL o MongoDB.

**Solución**:

1. Verifica que los contenedores estén corriendo:
   ```bash
   docker-compose ps postgres mongodb
   ```

2. Prueba la conexión manualmente:
   ```bash
   # PostgreSQL
   psql -h localhost -p 5433 -U postgres -d twl_pipeline
   # Password: postgres
   
   # MongoDB
   mongosh mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin
   ```

3. Si no conecta, revisa los logs de Docker:
   ```bash
   docker-compose logs postgres
   docker-compose logs mongodb
   ```

4. Reinicia los contenedores si es necesario:
   ```bash
   docker-compose restart postgres mongodb
   ```

### MinIO/S3 No Funciona

**Síntoma**: El Ingestion Service falla al guardar datos en S3.

**Solución**:

1. Verifica que MinIO esté corriendo:
   ```bash
   curl http://localhost:9000/minio/health/live
   ```
   Debería retornar algo como `{"status":"success"}`.

2. Verifica que el bucket exista:
   - Abre http://localhost:9001
   - Login con minioadmin/minioadmin
   - Verifica que el bucket `twl-raw-data` exista
   - Si no existe, créalo

3. Verifica las credenciales en `.env`:
   - Deben ser `minioadmin` / `minioadmin` para desarrollo local

### La Cola SQS No Funciona

**Síntoma**: El Ingestion Service no puede publicar mensajes o el Processing Service no los consume.

**Solución**:

1. Verifica que LocalStack esté corriendo:
   ```bash
   curl http://localhost:4566/_localstack/health
   ```

2. Verifica que la cola exista:
   ```bash
   aws --endpoint-url=http://localhost:4566 sqs list-queues --region us-east-1
   ```

3. Si la cola no existe, créala:
   ```bash
   aws --endpoint-url=http://localhost:4566 sqs create-queue \
     --queue-name twl-processing-queue \
     --region us-east-1
   ```

4. Verifica la URL de la cola en `.env`:
   - Debe ser algo como: `http://localhost:4566/000000000000/twl-processing-queue`

### El Processing Service No Procesa Mensajes

**Síntoma**: Los mensajes se acumulan en la cola pero no se procesan.

**Solución**:

1. Verifica que el Processing Service esté corriendo:
   ```bash
   curl http://localhost:3002/health
   ```

2. Revisa los logs del Processing Service para ver si hay errores

3. Verifica que pueda conectarse a MongoDB y S3

4. Si el consumidor no está iniciando, reinicia el servicio:
   - Detén `npm run dev` (Ctrl+C)
   - Vuelve a ejecutar `npm run dev`

### El Frontend No Muestra Datos

**Síntoma**: El frontend carga pero no muestra registros o muestra errores.

**Solución**:

1. Abre las DevTools del navegador (F12) → pestaña Network
   - Verifica que las requests al Reporting API (puerto 3003) estén funcionando
   - Si hay errores 401, el token JWT expiró o es inválido (haz login de nuevo)
   - Si hay errores 500, revisa los logs del Reporting API

2. Verifica que haya datos en MongoDB:
   ```bash
   mongosh mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin
   db.curatedrecords.countDocuments()
   ```
   Si retorna 0, no hay datos. Ejecuta la ingestion primero.

3. Verifica que el Reporting API esté funcionando:
   ```bash
   curl http://localhost:3003/api/reporting/records
   ```

## Despliegue en Producción (AWS)

### Prerrequisitos

Antes de desplegar, necesitas:

1. **AWS Account** con permisos para crear recursos
2. **AWS CLI configurado** con credenciales:
   ```bash
   aws configure
   ```
3. **Bucket de S3 para Terraform state** (crea uno manualmente):
   ```bash
   aws s3 mb s3://tu-nombre-terraform-state
   ```
4. **Tabla de DynamoDB para locks** (crea una manualmente):
   ```bash
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST
   ```

### Configurar Backend de Terraform

Edita `infra/envs/dev/backend.tf` (o créalo si no existe) con tu configuración:

```hcl
terraform {
  backend "s3" {
    bucket = "tu-nombre-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

### Desplegar Infraestructura

Para desarrollo:

```bash
cd infra/envs/dev
terraform init
terraform workspace select dev
terraform plan  # Revisa los cambios
terraform apply  # Aplica los cambios
```

Para producción:

```bash
cd infra/envs/prod
terraform init
terraform workspace select prod
terraform plan
terraform apply  # Requiere confirmación manual
```

Esto crea todos los recursos AWS: VPC, S3, SQS, RDS, Lambdas, etc.

### Desplegar Código

Una vez que la infraestructura esté creada, necesitas desplegar el código de los servicios:

**Opción 1: Lambda Functions (ZIP packages)**:

```bash
# Build cada servicio
npm run build:ingestion
npm run build:processing
npm run build:reporting

# Crear ZIP packages
cd apps/ingestion/dist && zip -r ../../../ingestion.zip . && cd ../../..
cd apps/processing/dist && zip -r ../../../processing.zip . && cd ../../..
cd apps/reporting-api/dist && zip -r ../../../reporting.zip . && cd ../../..

# Subir a Lambda (usa los nombres que Terraform creó)
aws lambda update-function-code \
  --function-name dev-ingestion \
  --zip-file fileb://ingestion.zip

aws lambda update-function-code \
  --function-name dev-processing \
  --zip-file fileb://processing.zip

aws lambda update-function-code \
  --function-name dev-reporting \
  --zip-file fileb://reporting.zip
```

**Opción 2: CI/CD con GitHub Actions**:

El proyecto ya tiene un workflow de GitHub Actions que hace esto automáticamente cuando haces push a main. Solo necesitas configurar los secrets en GitHub:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### Configurar Variables de Entorno en Lambda

Después de desplegar, configura las variables de entorno en cada Lambda:

```bash
aws lambda update-function-configuration \
  --function-name dev-ingestion \
  --environment Variables='{
    "S3_BUCKET_NAME":"dev-twl-raw-data",
    "SQS_QUEUE_URL":"https://sqs.us-east-1.amazonaws.com/...",
    "AWS_REGION":"us-east-1"
  }'
```

Repite para processing y reporting con sus respectivas variables.

## Monitoreo en Producción

### Ver Logs en CloudWatch

```bash
# Ver logs del ingestion service
aws logs tail /aws/lambda/dev-ingestion --follow

# Ver logs de processing
aws logs tail /aws/lambda/dev-processing --follow

# Buscar errores
aws logs filter-log-events \
  --log-group-name /aws/lambda/dev-processing \
  --filter-pattern "ERROR"
```

### Ver Métricas

Ve a AWS Console → CloudWatch → Metrics → Lambda

Puedes ver:
- Invocations (cuántas veces se ejecutó)
- Errors (cuántos errores hubo)
- Duration (cuánto tardó cada ejecución)
- Throttles (si se limitó por concurrencia)

### Verificar Alarmas

Ve a AWS Console → CloudWatch → Alarms

Deberías ver alarmas para:
- Errores en cada servicio
- Mensajes en DLQ
- Profundidad de la cola SQS

Si alguna alarma se activa, recibirás una notificación (si configuraste SNS).

## Mantenimiento

### Actualizar Dependencias

Cada mes, revisa y actualiza las dependencias:

```bash
# En cada servicio
cd apps/ingestion
npm update
npm audit fix

# Repite para processing, reporting-api, web-frontend
```

### Backup de Bases de Datos

**RDS PostgreSQL**:
- Los backups automáticos están habilitados (7 días en dev, 30 días en prod)
- Puedes crear snapshots manuales desde AWS Console

**MongoDB/DocumentDB**:
- Si usas DocumentDB, también tiene backups automáticos
- Si usas MongoDB Atlas, configura backups desde el dashboard

### Limpiar Datos Antiguos

Para ahorrar costos, puedes configurar lifecycle policies en S3 para archivar o eliminar datos antiguos:

```bash
# Ejemplo: mover datos de más de 90 días a Glacier
aws s3api put-bucket-lifecycle-configuration \
  --bucket dev-twl-raw-data \
  --lifecycle-configuration file://lifecycle.json
```

### Rotar Credenciales

Rota las credenciales de las bases de datos cada 3-6 meses:

1. Genera nuevas credenciales
2. Actualiza en Secrets Manager
3. Actualiza las Lambdas para usar las nuevas credenciales
4. Verifica que todo funcione
5. Elimina las credenciales antiguas

## Procedimientos de Emergencia

### Un Servicio Está Caído

1. Ve a CloudWatch Logs y busca errores recientes
2. Revisa las métricas para ver si hay un patrón
3. Si es un error de código, haz rollback a la versión anterior
4. Si es un problema de infraestructura, revisa los recursos en AWS Console
5. Si es un problema de datos, verifica las bases de datos

### Pérdida de Datos

1. Detén la ingestion inmediatamente (desactiva el cron o la Lambda)
2. Evalúa el daño: qué datos se perdieron y desde cuándo
3. Restaura desde backup si es posible
4. Si no hay backup, puedes reprocesar desde S3 raw data
5. Una vez restaurado, reactiva la ingestion

### Incidente de Seguridad

1. Aísla los servicios afectados (desactiva las Lambdas)
2. Revisa los logs de acceso para ver qué pasó
3. Rota todas las credenciales inmediatamente
4. Notifica al equipo
5. Documenta el incidente
6. Una vez resuelto, reactiva los servicios

## Comandos Útiles

```bash
# Ver logs de Docker en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f ingestion

# Reiniciar un servicio específico
docker-compose restart postgres

# Ver estado de todos los servicios
docker-compose ps

# Limpiar todo y empezar de nuevo
docker-compose down -v
docker-compose up -d

# Ver health de los servicios
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Ver datos en MongoDB
mongosh mongodb://admin:admin@localhost:27017/twl_pipeline?authSource=admin
db.curatedrecords.find().limit(10).pretty()

# Ver datos en PostgreSQL
psql -h localhost -p 5433 -U postgres -d twl_pipeline
SELECT * FROM users;
```
