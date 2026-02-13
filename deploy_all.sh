#!/bin/bash

# Deploy AnomaPay Explorer (Backend + Frontend)

echo "🚀 Starting Full Deployment..."

# 1. Deploy Backend (Cloudflare Worker)
echo "-----------------------------------"
echo "📦 Deploying Backend (Worker)..."
echo "-----------------------------------"
npm run deploy

if [ $? -ne 0 ]; then
  echo "❌ Backend deployment failed!"
  exit 1
fi

# 2. Build Frontend
echo "-----------------------------------"
echo "🏗️  Building Frontend..."
echo "-----------------------------------"
cd frontend
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

# 3. Deploy Frontend (Cloudflare Pages)
echo "-----------------------------------"
echo "🌍 Deploying Frontend (Pages)..."
echo "-----------------------------------"
# Use non-interactive flags
npx wrangler pages deploy dist --project-name=anomapay-explorer --branch=main --commit-dirty=true

if [ $? -ne 0 ]; then
  echo "❌ Frontend deployment failed!"
  exit 1
fi

echo "-----------------------------------"
echo "✅ Deployment Complete!"
echo "Backend: https://anomapay-explorer.bidurandblog.workers.dev"
echo "Frontend: https://anomapay-explorer.pages.dev"
echo "-----------------------------------"
