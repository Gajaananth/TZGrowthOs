# Deployment Guide — Tradiq Zium GrowthOS

Built for **Google Cloud AI Builder Cup 2026** (Retail & Commerce: Intelligent Customer and Business Experiences).

---

## 1. Deploying to Google Cloud Run (Recommended)

Google Cloud Run provides serverless, autoscaling container execution ideal for GrowthOS.

### Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated
- Google Cloud Project with Cloud Run and Secret Manager APIs enabled
- Cloud SQL for PostgreSQL instance (or Neon / Supabase connection URL)
- Google Gemini API Key

### Step-by-Step Deployment

```bash
# 1. Set Google Cloud Project
gcloud config set project YOUR_PROJECT_ID

# 2. Build and Push Container Image to Google Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/tradiq-zium-growthos:latest .

# 3. Deploy to Cloud Run
# Option A: With Google Secret Manager (Recommended for production security)
# Create secrets first:
#   gcloud secrets create gemini-api-key --data-file=- <<< "YOUR_GEMINI_API_KEY"
#   gcloud secrets create jwt-secret --data-file=- <<< "YOUR_SECURE_JWT_SECRET"

gcloud run deploy tradiq-zium-growthos \
  --image gcr.io/YOUR_PROJECT_ID/tradiq-zium-growthos:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "NODE_ENV=production,SERVE_CLIENT=true,GEMINI_MODEL=gemini-3.5-flash" \
  --set-env-vars "DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,JWT_SECRET=jwt-secret:latest"

# Option B: With direct environment variables (Quick start)
# gcloud run deploy tradiq-zium-growthos \
#   --image gcr.io/YOUR_PROJECT_ID/tradiq-zium-growthos:latest \
#   --platform managed \
#   --region asia-south1 \
#   --allow-unauthenticated \
#   --port 8080 \
#   --set-env-vars "NODE_ENV=production,SERVE_CLIENT=true,GEMINI_MODEL=gemini-3.5-flash" \
#   --set-env-vars "DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require" \
#   --set-env-vars "GEMINI_API_KEY=YOUR_GEMINI_API_KEY" \
#   --set-env-vars "JWT_SECRET=YOUR_SECURE_JWT_SECRET"
```

---

## 2. Deploying with Docker Compose (Local or VPS)

A sample `docker-compose.yml` configuration:

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: growthos
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: growthos_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    restart: always
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: production
      PORT: 8080
      DATABASE_URL: postgresql://growthos:secretpassword@db:5432/growthos_db
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      JWT_SECRET: ${JWT_SECRET:-supersecretjwtkey}
      GEMINI_MODEL: gemini-3.5-flash
    depends_on:
      - db

volumes:
  pgdata:
```

Run with:
```bash
docker compose up -d --build
```

---

## 3. Serverless Deployment on Vercel

The repository includes `vercel.json` and `api/v2_gateway.ts`:

1. Import repository on [Vercel](https://vercel.com).
2. Set Environment Variables:
   - `DATABASE_URL`: PostgreSQL connection string (Neon / Supabase recommended)
   - `GEMINI_API_KEY`: Google Gemini API key
   - `JWT_SECRET`: Random 32+ character string
3. Deploy!
