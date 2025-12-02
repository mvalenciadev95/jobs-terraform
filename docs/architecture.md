# Arquitectura del Sistema

Este documento explica la arquitectura del pipeline de datos, cómo están organizados los componentes y cómo se comunican entre sí.

## Visión General

El sistema está diseñado como una arquitectura de microservicios que procesa datos desde múltiples fuentes externas hasta mostrarlos en una interfaz web. El flujo básico es:

1. **Ingestión**: Obtener datos de APIs externas
2. **Almacenamiento Raw**: Guardar datos tal cual en S3
3. **Procesamiento**: Transformar, normalizar y deduplicar
4. **Almacenamiento Curated**: Guardar datos procesados en MongoDB
5. **Exposición**: Exponer mediante APIs REST y GraphQL
6. **Visualización**: Mostrar en un frontend web

Todo esto está desplegado en AWS usando servicios serverless (Lambda) y gestionado con Terraform.

## Componentes del Sistema

### 1. Ingestion Service

**Tecnología**: NestJS, TypeScript  
**Puerto Local**: 3001  
**Despliegue**: Lambda Function  
**Responsabilidades**:

Este servicio es el punto de entrada. Se conecta a APIs externas (JSONPlaceholder, ReqRes, y una fuente mock) y obtiene datos. Para cada item que recibe:

1. Lo guarda tal cual en S3 con una estructura organizada por fuente y fecha
2. Publica un mensaje en SQS con la referencia al archivo en S3

**Características Clave**:
- Ejecución programada cada hora (cron job)
- Trigger manual mediante endpoint REST
- Health checks para monitoreo
- Manejo de errores con retries

**Dependencias**:
- S3 para almacenar datos raw
- SQS para publicar mensajes
- APIs externas para obtener datos

### 2. Processing Service

**Tecnología**: NestJS, TypeScript, MongoDB  
**Puerto Local**: 3002  
**Despliegue**: Lambda Function  
**Responsabilidades**:

Este servicio consume mensajes de la cola SQS. Para cada mensaje:

1. Lee los datos raw desde S3 usando la ruta que viene en el mensaje
2. Transforma y normaliza los datos (cada fuente tiene estructura diferente)
3. Genera un fingerprint para detectar duplicados
4. Verifica si ya existe un registro con ese fingerprint
5. Si es único, lo guarda en MongoDB. Si es duplicado, solo registra el estado

**Características Clave**:
- Procesamiento idempotente (puede reprocesar sin duplicar)
- Deduplicación inteligente usando fingerprints
- Manejo de errores con Dead Letter Queue (DLQ)
- Endpoint para reprocesamiento manual

**Dependencias**:
- SQS para consumir mensajes
- S3 para leer datos raw
- MongoDB para guardar datos curados

### 3. Reporting API

**Tecnología**: NestJS, TypeScript, GraphQL, PostgreSQL  
**Puerto Local**: 3003  
**Despliegue**: Lambda Function + API Gateway  
**Responsabilidades**:

Este servicio expone los datos procesados mediante dos interfaces:

1. **REST API**: Endpoints HTTP tradicionales para obtener registros y analytics
2. **GraphQL API**: Un endpoint GraphQL para queries flexibles

También maneja la autenticación de usuarios (login/register) usando JWT.

**Características Clave**:
- REST endpoints con paginación y filtros
- GraphQL con Apollo Server
- Autenticación JWT
- Endpoints protegidos y públicos
- Analytics agregados

**Dependencias**:
- MongoDB para leer datos curados
- PostgreSQL para usuarios y autenticación
- API Gateway para exponer los endpoints

### 4. Web Frontend

**Tecnología**: Next.js 14, React, TailwindCSS, TypeScript  
**Puerto Local**: 3000  
**Despliegue**: Vercel, S3 + CloudFront, o cualquier hosting estático  
**Responsabilidades**:

Interfaz de usuario donde los usuarios pueden:

1. Hacer login/registro
2. Ver lista de registros procesados con paginación
3. Ver dashboard con analytics (gráficos de registros por fuente, por fecha, etc.)
4. Ver detalle de un registro específico

**Características Clave**:
- Diseño responsive (funciona en móvil y desktop)
- Autenticación con JWT
- Visualización de datos con gráficos (Recharts)
- UI moderna con TailwindCSS

**Dependencias**:
- Reporting API para obtener datos
- LocalStorage para guardar el token JWT

## Infraestructura en AWS

### Servicios AWS Utilizados

**Almacenamiento**:
- **S3**: Bucket para datos raw con versionado y encriptación
- **RDS PostgreSQL**: Base de datos para usuarios (managed)
- **DocumentDB (MongoDB)**: Base de datos para datos curados (managed, opcional - puede usar MongoDB Atlas)

**Computación**:
- **Lambda**: Functions serverless para cada microservicio
- **API Gateway**: Para exponer el Reporting API

**Mensajería**:
- **SQS**: Cola para comunicación asíncrona entre servicios
- **SNS**: Topics para alertas (solo en producción)

**Red**:
- **VPC**: Red privada para aislar los servicios
- **Subnets**: Públicas y privadas
- **Security Groups**: Firewall para controlar tráfico
- **NAT Gateway**: Para que Lambdas en subnets privadas puedan acceder a internet

**Seguridad**:
- **IAM Roles**: Un rol por servicio con permisos mínimos necesarios
- **Secrets Manager**: Para guardar credenciales de forma segura
- **KMS**: Para encriptación de datos

**Observabilidad**:
- **CloudWatch Logs**: Logs estructurados de cada servicio
- **CloudWatch Metrics**: Métricas automáticas (invocations, errors, duration)
- **CloudWatch Alarms**: Alertas cuando hay problemas

### Módulos Terraform

La infraestructura está organizada en módulos reutilizables:

**1. Networking Module** (`infra/modules/networking/`):
- VPC con CIDR configurable
- Subnets públicas y privadas en múltiples AZs
- Internet Gateway y NAT Gateways
- Route Tables
- Security Groups para cada tipo de servicio

**2. Storage Module** (`infra/modules/storage/`):
- S3 bucket con versionado y encriptación
- SQS queue con Dead Letter Queue
- RDS PostgreSQL instance
- DocumentDB cluster (opcional)
- Secrets Manager secrets

**3. Compute Module** (`infra/modules/compute/`):
- Lambda functions para cada servicio
- API Gateway REST API
- IAM roles y policies para cada Lambda
- EventBridge rules para triggers (cron jobs)

**4. Observability Module** (`infra/modules/observability/`):
- CloudWatch Log Groups para cada servicio
- CloudWatch Alarms para errores y DLQ
- SNS Topics para notificaciones (solo prod)

Cada módulo es independiente y puede usarse en múltiples entornos (dev, staging, prod).

## Flujo de Datos

### Flujo Principal

1. **Ingestión**:
   - Ingestion Service se ejecuta (cron o manual)
   - Obtiene datos de APIs externas
   - Guarda cada item en S3: `raw/source=xxx/ingest_date=YYYY-MM-DD/item.json`
   - Publica mensaje en SQS con referencia al S3 key

2. **Procesamiento**:
   - Processing Service consume mensaje de SQS
   - Lee archivo raw desde S3
   - Transforma y normaliza datos
   - Genera fingerprint
   - Verifica duplicados
   - Si es único, guarda en MongoDB como CuratedRecord

3. **Exposición**:
   - Reporting API consulta MongoDB para obtener CuratedRecords
   - Retorna JSON (REST) o GraphQL según el request
   - Si requiere autenticación, valida JWT token

4. **Visualización**:
   - Frontend hace request al Reporting API
   - Muestra datos en lista o gráficos
   - Usuario interactúa con la UI

### Flujo de Autenticación

1. Usuario hace login en frontend (email + password)
2. Frontend envía request a Reporting API `/api/auth/login`
3. Reporting API verifica credenciales en PostgreSQL
4. Si son correctas, genera JWT token y lo retorna
5. Frontend guarda token en localStorage
6. En requests siguientes, frontend incluye token en header `Authorization: Bearer <token>`
7. Reporting API valida token antes de procesar request

## Seguridad

### IAM Roles

Cada Lambda tiene su propio rol IAM con permisos mínimos:

- **Ingestion Lambda**: Solo puede escribir en S3 y publicar en SQS
- **Processing Lambda**: Solo puede leer de S3, consumir de SQS, y escribir en MongoDB
- **Reporting Lambda**: Solo puede leer de MongoDB y PostgreSQL

Esto sigue el principio de "least privilege": cada servicio solo tiene acceso a lo que necesita.

### Encriptación

- **S3**: Encriptación server-side (AES256)
- **RDS**: Encriptación en reposo
- **Tránsito**: TLS para todas las conexiones
- **Secrets Manager**: Encriptación automática de credenciales

### Red

- Lambdas corren en subnets privadas dentro de VPC
- Solo tienen salida controlada (no pueden recibir tráfico directo)
- Security Groups restringen el tráfico entre servicios
- API Gateway es el único punto de entrada público

## Escalabilidad

### Auto-scaling

- **Lambda**: Escala automáticamente según la cantidad de mensajes en la cola o requests al API
- **SQS**: Maneja cualquier volumen de mensajes
- **API Gateway**: Escala automáticamente según el tráfico
- **RDS/DocumentDB**: Puede escalar verticalmente (instance class) o horizontalmente (read replicas)

### Resiliencia

- **Retries**: SQS reintenta automáticamente si el procesamiento falla
- **Dead Letter Queue**: Mensajes que fallan múltiples veces van a DLQ para revisión
- **Health Checks**: Cada servicio expone endpoints de health para monitoreo
- **Idempotencia**: El procesamiento es idempotente, puede reprocesar sin duplicar

## Observabilidad

### Logs

Cada servicio escribe logs estructurados en JSON a CloudWatch Logs:
- Timestamp, nivel, servicio, mensaje, contexto
- Permite búsquedas y filtros avanzados

### Métricas

CloudWatch recopila métricas automáticamente:
- Lambda invocations, errors, duration
- SQS queue depth, DLQ message count
- API Gateway requests, latency, errors

### Alarmas

Configuradas para alertar cuando:
- Hay más de 5 errores en 5 minutos
- Hay mensajes en DLQ
- La cola tiene más de 1000 mensajes pendientes

## Trade-offs y Decisiones

### Serverless vs Containers

**Elegí**: Serverless (Lambda)

**Razón**: Menos gestión operacional, auto-scaling automático, pago por uso. Para este volumen es suficiente.

**Cuándo usar Containers**: Si necesito tiempos de ejecución largos (>15 min) o control total sobre el entorno.

### SQS vs Kafka

**Elegí**: SQS

**Razón**: Más simple, managed service, suficiente para batch processing.

**Cuándo usar Kafka**: Si necesito streaming en tiempo real o muy alto throughput.

### MongoDB vs Solo PostgreSQL

**Elegí**: MongoDB para curated, PostgreSQL para users

**Razón**: MongoDB es mejor para datos semi-estructurados de diferentes fuentes. PostgreSQL es mejor para datos relacionales de usuarios.

**Cuándo unificar**: Si el costo de mantener dos bases es un problema.

### JWT Manual vs Cognito

**Elegí**: JWT manual

**Razón**: Más control, demuestra entendimiento de JWT, más simple para este POC.

**En producción real**: Usaría Cognito para MFA, social login, etc.
