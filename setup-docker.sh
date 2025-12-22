#!/bin/bash

# 🚀 Quick Setup Script for MYugBotV3 Docker Deployment
# This script helps you quickly set up and deploy the bot

set -e

echo "🚀 MYugBotV3 Docker Deployment Setup"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.production .env
    echo "⚠️  Please edit .env file with your configuration:"
    echo "   - TELEGRAM_BOT_TOKEN"
    echo "   - DB_HOST"
    echo "   - DB_NAME"
    echo "   - DB_PASSWORD (if different from default)"
    echo ""
    echo "Would you like to edit .env now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        ${EDITOR:-nano} .env
    else
        echo "⚠️  Remember to edit .env before running the bot!"
        exit 0
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🔨 Building Docker image..."
docker-compose build

echo ""
echo "🚀 Starting the bot..."
docker-compose up -d

echo ""
echo "⏳ Waiting for the bot to start..."
sleep 5

echo ""
echo "📊 Checking status..."
docker-compose ps

echo ""
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "===================================="
echo "✅ Deployment complete!"
echo ""
echo "Useful commands:"
echo "  📋 View logs:        docker-compose logs -f"
echo "  🔄 Restart bot:      docker-compose restart"
echo "  🛑 Stop bot:         docker-compose down"
echo "  📊 Check status:     docker-compose ps"
echo ""
echo "📖 Full documentation: see DOCKER-DEPLOY.md"
echo "===================================="
