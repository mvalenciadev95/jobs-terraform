# TWL Data Pipeline - Prueba Técnica

Este proyecto implementa un pipeline completo de datos que simula un sistema de producción real. Básicamente, obtiene datos de diferentes fuentes externas, los procesa, los almacena en dos niveles (raw y curated), y los expone mediante APIs y un frontend web.

## Que hace este proyecto?

El sistema tiene 4 microservicios que trabajan juntos:

1. **Ingestion Service**: Se conecta a APIs externas (JSONPlaceholder, ReqRes, y una fuente mock) para obtener datos. Los guarda en S3 en formato raw y publica mensajes a una cola SQS para que otro servicio los procese.

2. **Processing Service**: Consume los mensajes de la cola SQS, lee los datos raw de S3, los transforma y normaliza, detecta duplicados usando fingerprints, y guarda los datos procesados en MongoDB.

3. **Reporting API**: Expone los datos procesados mediante REST y GraphQL. Tiene autenticación con JWT para proteger algunos endpoints. Los usuarios se guardan en PostgreSQL.

4. **Web Frontend**: Una interfaz en Next.js donde puedes ver los registros procesados y un dashboard con analytics básicos (gráficos de registros por fuente, por fecha, etc.).

## Por Qué Está Construido Así?

Elegí microservicios porque cada uno tiene una responsabilidad clara y puede escalar independientemente. Si hay mucho volumen de ingestion, solo escalo ese servicio, no todo el sistema.

Usé NestJS porque me da una estructura modular con TypeScript, inyección de dependencias y es fácil de mantener. Para el frontend usé Next.js porque es rápido de desarrollar y tiene todo lo necesario para un dashboard.

Para la cola usé SQS en lugar de Kafka porque es más simple, es un servicio gestionado de AWS, y para este volumen es suficiente. Kafka sería mejor si necesitara streaming en tiempo real o volúmenes muy altos.

Tengo dos bases de datos: MongoDB para los datos curados porque son documentos con estructura flexible (diferentes fuentes traen diferentes campos), y PostgreSQL para los usuarios porque son datos relacionales y necesito transacciones ACID.

La autenticación la hice con JWT manual en lugar de usar Cognito porque quería tener control total y demostrar que entiendo cómo funciona JWT. En producción podría usar Cognito si necesitara MFA o social login.

La infraestructura está en Terraform porque quiero que todo sea reproducible. Puedo crear el mismo entorno en dev y prod, y si algo falla puedo recrearlo fácilmente. Los módulos de Terraform son reutilizables, así que no duplico código.

## Cómo Levantar el Proyecto

### Prerrequisitos

Necesitas tener instalado:
- Node.js 18 o superior
- Docker y Docker Compose
- Terraform 1.5 o superior (solo si quieres desplegar en AWS, para desarrollo local no es necesario)

### Paso 1: Levantar la Infraestructura Local

Ejecuta esto para levantar PostgreSQL, MongoDB, MinIO (que simula S3) y LocalStack (que simula SQS):

```bash
docker-compose up -d
```

Verifica que todo esté corriendo:

```bash
docker-compose ps
```

Deberías ver los contenedores activos.

### Paso 2: Instalar Dependencias

Instala las dependencias del proyecto raíz y de todos los microservicios:

```bash
npm run install:all
```

Esto instalará todo lo necesario en cada servicio.

### Paso 3: Configurar Variables de Entorno

Copia los archivos de ejemplo a los archivos reales:

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

Los archivos de ejemplo ya tienen valores por defecto para desarrollo local, así que puedes usarlos directamente.

### Paso 4: Crear Bucket de MinIO

MinIO es S3 local. Necesitas crear un bucket llamado `twl-raw-data`:

1. Abre http://localhost:9001 en tu navegador
2. Login con `minioadmin` / `minioadmin`
3. Crea un bucket llamado `twl-raw-data`

O usando AWS CLI:
```bash
aws --endpoint-url=http://localhost:9000 s3 mb s3://twl-raw-data
```

### Paso 5: Crear Cola SQS en LocalStack

LocalStack simula SQS localmente. Crea la cola:

```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name twl-processing-queue \
  --region us-east-1
```

Verifica que la cola existe:
```bash
aws --endpoint-url=http://localhost:4566 sqs list-queues --region us-east-1
```

### Paso 6: Ejecutar Migraciones de Base de Datos

Esto crea las tablas necesarias en PostgreSQL:

```bash
npm run migration:run
```

### Paso 7: Iniciar Todos los Servicios

Esto inicia los 4 microservicios en modo desarrollo:

```bash
npm run dev
```

Deberías ver que cada servicio inicia en su puerto:
- Ingestion en http://localhost:3001
- Processing en http://localhost:3002
- Reporting API en http://localhost:3003
- Frontend en http://localhost:3000

### Paso 8: Probar el Flujo Completo

Abre otra terminal y ejecuta esto para trigger la ingestion:

```bash
curl -X POST http://localhost:3001/ingestion/trigger
```

Deberías ver en los logs que:
- Se obtienen datos de las APIs externas
- Se guardan en S3/MinIO
- Se publican mensajes a la cola

El servicio de processing debería consumir automáticamente esos mensajes y procesarlos. Revisa los logs para ver el progreso.

Luego abre el frontend en http://localhost:3000. Primero necesitas registrar un usuario:

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

Ahora puedes hacer login en el frontend con esas credenciales y ver los registros procesados y los analytics.

## Documentación de APIs con Swagger

Cada servicio tiene documentación Swagger donde puedes ver todos los endpoints y probarlos directamente:

- Ingestion Service: http://localhost:3001/api
- Processing Service: http://localhost:3002/api
- Reporting API: http://localhost:3003/api

En el Reporting API, algunos endpoints requieren autenticación. Para probarlos:
1. Primero haz login en el endpoint `/api/auth/login` desde Swagger
2. Copia el `access_token` de la respuesta
3. Haz clic en el botón "Authorize" en la parte superior de Swagger
4. Pega el token (solo el token, sin "Bearer")
5. Ahora puedes probar los endpoints protegidos como `/api/reporting/analytics`

## Desplegar Infraestructura en AWS

Si quieres desplegar la infraestructura completa en AWS usando Terraform:

Para desarrollo:
```bash
cd infra/envs/dev
terraform init
terraform workspace select dev
terraform plan
terraform apply
```

Para producción:
```bash
cd infra/envs/prod
terraform init
terraform workspace select prod
terraform plan
terraform apply
```

Nota: Necesitas tener AWS CLI configurado y permisos para crear recursos. También necesitas crear el bucket de S3 para el estado de Terraform y la tabla de DynamoDB para los locks antes de ejecutar terraform init.

## Estructura del Proyecto

```
jobs-terraform/
├── apps/
│   ├── ingestion/          # Microservicio de ingestion
│   ├── processing/         # Microservicio de processing
│   ├── reporting-api/      # Microservicio de reporting
│   └── web-frontend/       # Frontend en Next.js
├── infra/
│   ├── modules/            # Módulos Terraform reutilizables
│   │   ├── networking/     # VPC, subnets, security groups
│   │   ├── storage/        # S3, SQS, RDS, MongoDB
│   │   ├── compute/        # Lambda functions, API Gateway
│   │   └── observability/ # CloudWatch logs y alarms
│   └── envs/
│       ├── dev/            # Configuración para desarrollo
│       └── prod/           # Configuración para producción
├── docs/                   # Documentación detallada
└── .github/workflows/      # CI/CD con GitHub Actions
```

## CI/CD

El proyecto tiene un pipeline de GitHub Actions que:
- Ejecuta lint y tests en cada pull request
- Valida la configuración de Terraform
- Hace terraform plan en PRs para mostrar los cambios
- Hace terraform apply en la rama main (con aprobación manual)


## Troubleshooting

Si los servicios no inician, verifica que los puertos 3000, 3001, 3002 y 3003 estén libres. También verifica que los contenedores de Docker estén corriendo con `docker-compose ps`.

Si las bases de datos no conectan, verifica que los contenedores estén activos y que las credenciales en los archivos .env sean correctas.

Si MinIO no funciona, verifica que el bucket `twl-raw-data` exista. Puedes crearlo desde la consola web en http://localhost:9001.

Para más detalles de troubleshooting, revisa [docs/runbook.md](docs/runbook.md).

---

# TWL Data Pipeline - Technical Challenge

This project implements a complete data pipeline that simulates a real production system. Basically, it fetches data from different external sources, processes it, stores it in two levels (raw and curated), and exposes it through APIs and a web frontend.

## What Does This Project Do?

The system has 4 microservices that work together:

1. **Ingestion Service**: Connects to external APIs (JSONPlaceholder, ReqRes, and a mock source) to fetch data. Stores it in S3 in raw format and publishes messages to an SQS queue for another service to process.

2. **Processing Service**: Consumes messages from the SQS queue, reads raw data from S3, transforms and normalizes it, detects duplicates using fingerprints, and stores processed data in MongoDB.

3. **Reporting API**: Exposes processed data through REST and GraphQL. Has JWT authentication to protect some endpoints. Users are stored in PostgreSQL.

4. **Web Frontend**: A Next.js interface where you can view processed records and a dashboard with basic analytics (charts of records by source, by date, etc.).

## Why Is It Built This Way?

I chose microservices because each one has a clear responsibility and can scale independently. If there's a lot of ingestion volume, I only scale that service, not the entire system.

I used NestJS because it gives me a modular structure with TypeScript, dependency injection, and it's easy to maintain. For the frontend I used Next.js because it's fast to develop and has everything needed for a dashboard.

For the queue I used SQS instead of Kafka because it's simpler, it's a managed AWS service, and for this volume it's sufficient. Kafka would be better if I needed real-time streaming or very high volumes.

I have two databases: MongoDB for curated data because they're documents with flexible structure (different sources bring different fields), and PostgreSQL for users because they're relational data and I need ACID transactions.

I did authentication with manual JWT instead of using Cognito because I wanted full control and to demonstrate that I understand how JWT works. In production I could use Cognito if I needed MFA or social login.

The infrastructure is in Terraform because I want everything to be reproducible. I can create the same environment in dev and prod, and if something fails I can recreate it easily. The Terraform modules are reusable, so I don't duplicate code.

## How to Run the Project

### Prerequisites

You need to have installed:
- Node.js 18 or higher
- Docker and Docker Compose
- Terraform 1.5 or higher (only if you want to deploy to AWS, not needed for local development)

### Step 1: Start Local Infrastructure

Run this to start PostgreSQL, MongoDB, MinIO (which simulates S3) and LocalStack (which simulates SQS):

```bash
docker-compose up -d
```

Verify everything is running:

```bash
docker-compose ps
```

You should see the containers active.

### Step 2: Install Dependencies

Install dependencies from the project root and all microservices:

```bash
npm run install:all
```

This will install everything needed in each service.

### Step 3: Configure Environment Variables

Copy the example files to the real files:

**On Windows (PowerShell)**:
```powershell
Copy-Item apps/ingestion/.env.example apps/ingestion/.env
Copy-Item apps/processing/.env.example apps/processing/.env
Copy-Item apps/reporting-api/.env.example apps/reporting-api/.env
Copy-Item apps/web-frontend/.env.example apps/web-frontend/.env.local
```

**On Linux/Mac**:
```bash
cp apps/ingestion/.env.example apps/ingestion/.env
cp apps/processing/.env.example apps/processing/.env
cp apps/reporting-api/.env.example apps/reporting-api/.env
cp apps/web-frontend/.env.example apps/web-frontend/.env.local
```

The example files already have default values for local development, so you can use them directly.

### Step 4: Create MinIO Bucket

MinIO is local S3. You need to create a bucket named `twl-raw-data`:

1. Open http://localhost:9001 in your browser
2. Login with `minioadmin` / `minioadmin`
3. Create a bucket named `twl-raw-data`

Or using AWS CLI:
```bash
aws --endpoint-url=http://localhost:9000 s3 mb s3://twl-raw-data
```

### Step 5: Create SQS Queue in LocalStack

LocalStack simulates SQS locally. Create the queue:

```bash
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name twl-processing-queue \
  --region us-east-1
```

Verify the queue exists:
```bash
aws --endpoint-url=http://localhost:4566 sqs list-queues --region us-east-1
```

### Step 6: Run Database Migrations

This creates the necessary tables in PostgreSQL:

```bash
npm run migration:run
```

### Step 7: Start All Services

This starts the 4 microservices in development mode:

```bash
npm run dev
```

You should see each service start on its port:
- Ingestion at http://localhost:3001
- Processing at http://localhost:3002
- Reporting API at http://localhost:3003
- Frontend at http://localhost:3000

### Step 8: Test the Complete Flow

Open another terminal and run this to trigger ingestion:

```bash
curl -X POST http://localhost:3001/ingestion/trigger
```

You should see in the logs that:
- Data is fetched from external APIs
- It's saved to S3/MinIO
- Messages are published to the queue

The processing service should automatically consume those messages and process them. Check the logs to see progress.

Then open the frontend at http://localhost:3000. First you need to register a user:

```bash
curl -X POST http://localhost:3003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'
```

Now you can login in the frontend with those credentials and see the processed records and analytics.

## API Documentation with Swagger

Each service has Swagger documentation where you can see all endpoints and test them directly:

- Ingestion Service: http://localhost:3001/api
- Processing Service: http://localhost:3002/api
- Reporting API: http://localhost:3003/api

In the Reporting API, some endpoints require authentication. To test them:
1. First login at the `/api/auth/login` endpoint from Swagger
2. Copy the `access_token` from the response
3. Click the "Authorize" button at the top of Swagger
4. Paste the token (just the token, without "Bearer")
5. Now you can test protected endpoints like `/api/reporting/analytics`

## Deploy Infrastructure to AWS

If you want to deploy the complete infrastructure to AWS using Terraform:

For development:
```bash
cd infra/envs/dev
terraform init
terraform workspace select dev
terraform plan
terraform apply
```

For production:
```bash
cd infra/envs/prod
terraform init
terraform workspace select prod
terraform plan
terraform apply
```

Note: You need to have AWS CLI configured and permissions to create resources. You also need to create the S3 bucket for Terraform state and the DynamoDB table for locks before running terraform init.

## Project Structure

```
jobs-terraform/
├── apps/
│   ├── ingestion/          # Ingestion microservice
│   ├── processing/         # Processing microservice
│   ├── reporting-api/      # Reporting microservice
│   └── web-frontend/       # Next.js frontend
├── infra/
│   ├── modules/            # Reusable Terraform modules
│   │   ├── networking/     # VPC, subnets, security groups
│   │   ├── storage/        # S3, SQS, RDS, MongoDB
│   │   ├── compute/        # Lambda functions, API Gateway
│   │   └── observability/ # CloudWatch logs and alarms
│   └── envs/
│       ├── dev/            # Development configuration
│       └── prod/           # Production configuration
├── docs/                   # Detailed documentation
└── .github/workflows/      # CI/CD with GitHub Actions
```

## CI/CD

The project has a GitHub Actions pipeline that:
- Runs lint and tests on each pull request
- Validates Terraform configuration
- Runs terraform plan on PRs to show changes
- Runs terraform apply on main branch (with manual approval)

## Troubleshooting

If services don't start, verify that ports 3000, 3001, 3002 and 3003 are free. Also verify that Docker containers are running with `docker-compose ps`.

If databases don't connect, verify that containers are active and that credentials in .env files are correct.

If MinIO doesn't work, verify that the `twl-raw-data` bucket exists. You can create it from the web console at http://localhost:9001.

For more troubleshooting details, check [docs/runbook.md](docs/runbook.md).
