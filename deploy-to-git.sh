#!/bin/bash

# 🚀 Script for deploying MYugBotV3 to Git repository
# Supports GitHub, GitLab, or custom Git server

set -e

echo "🚀 MYugBotV3 Git Deployment Setup"
echo "===================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Check if already a git repository
if [ -d .git ]; then
    echo "📂 Git repository already exists"
    echo ""
    echo "Current remotes:"
    git remote -v
    echo ""
else
    echo "📝 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
    echo ""
fi

# Ask for deployment method
echo "Choose deployment method:"
echo "  1) GitHub (public/private repository)"
echo "  2) GitLab"
echo "  3) Custom Git server (self-hosted)"
echo "  4) Git Bundle (offline transfer)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📦 GitHub Deployment"
        echo "===================="
        echo ""
        echo "First, create a new repository on GitHub:"
        echo "  1. Go to https://github.com/new"
        echo "  2. Repository name: MYugBotV3"
        echo "  3. Make it Private (recommended)"
        echo "  4. Do NOT initialize with README"
        echo ""
        read -p "Enter your GitHub repository URL (e.g., https://github.com/username/MYugBotV3.git): " repo_url
        
        if [ -z "$repo_url" ]; then
            echo "❌ Repository URL is required"
            exit 1
        fi
        
        # Add remote if not exists
        if git remote | grep -q "^origin$"; then
            echo "⚠️  Remote 'origin' already exists. Updating URL..."
            git remote set-url origin "$repo_url"
        else
            git remote add origin "$repo_url"
        fi
        
        remote_name="origin"
        ;;
        
    2)
        echo ""
        echo "📦 GitLab Deployment"
        echo "==================="
        echo ""
        echo "First, create a new project on GitLab:"
        echo "  1. Go to https://gitlab.com/projects/new"
        echo "  2. Project name: MYugBotV3"
        echo "  3. Visibility: Private (recommended)"
        echo ""
        read -p "Enter your GitLab repository URL (e.g., https://gitlab.com/username/MYugBotV3.git): " repo_url
        
        if [ -z "$repo_url" ]; then
            echo "❌ Repository URL is required"
            exit 1
        fi
        
        if git remote | grep -q "^origin$"; then
            git remote set-url origin "$repo_url"
        else
            git remote add origin "$repo_url"
        fi
        
        remote_name="origin"
        ;;
        
    3)
        echo ""
        echo "🏠 Custom Git Server"
        echo "==================="
        echo ""
        read -p "Enter Git server URL (e.g., ssh://user@192.168.1.100/var/git/myugbot-v3.git): " repo_url
        
        if [ -z "$repo_url" ]; then
            echo "❌ Repository URL is required"
            exit 1
        fi
        
        if git remote | grep -q "^production$"; then
            git remote set-url production "$repo_url"
        else
            git remote add production "$repo_url"
        fi
        
        remote_name="production"
        ;;
        
    4)
        echo ""
        echo "📦 Git Bundle Creation"
        echo "====================="
        echo ""
        
        # Make sure there are commits
        if ! git rev-parse HEAD &> /dev/null; then
            echo "📝 Creating initial commit..."
            git add .
            git commit -m "Initial commit: NestJS Telegram Bot with Docker support"
        fi
        
        bundle_file="myugbot-v3-$(date +%Y%m%d-%H%M%S).bundle"
        echo "Creating bundle: $bundle_file"
        git bundle create "$bundle_file" --all
        
        echo ""
        echo "✅ Git bundle created: $bundle_file"
        echo ""
        echo "📋 Instructions for target PC:"
        echo "  1. Copy $bundle_file to target PC"
        echo "  2. Run: git clone $bundle_file MYugBotV3"
        echo "  3. Run: cd MYugBotV3"
        echo "  4. Run: cp .env.production .env"
        echo "  5. Edit .env with your configuration"
        echo "  6. Run: docker-compose up -d --build"
        echo ""
        exit 0
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Remote '$remote_name' configured: $repo_url"
echo ""

# Check if there are any commits
if ! git rev-parse HEAD &> /dev/null; then
    echo "📝 No commits found. Creating initial commit..."
    
    # Check and update .gitignore
    if [ ! -f .gitignore ]; then
        echo "⚠️  Warning: .gitignore not found"
    fi
    
    # Add all files
    echo "Adding files to git..."
    git add .
    
    # Show what will be committed
    echo ""
    echo "📋 Files to be committed:"
    git diff --cached --name-status | head -20
    total_files=$(git diff --cached --name-status | wc -l)
    if [ $total_files -gt 20 ]; then
        echo "... and $((total_files - 20)) more files"
    fi
    echo ""
    
    read -p "Proceed with commit? (y/n): " proceed
    if [[ ! "$proceed" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "❌ Aborted"
        exit 1
    fi
    
    # Create commit
    git commit -m "Initial commit: NestJS Telegram Bot with Docker support

- NestJS framework with Telegraf
- Firebird database integration  
- Docker and Docker Compose configuration
- Database migration scripts
- Role-based access control (RBAC)
- Inline keyboard navigation
- Comprehensive documentation"
    
    echo "✅ Initial commit created"
fi

echo ""
echo "🚀 Pushing to remote repository..."

# Determine branch name
if git rev-parse --verify main &> /dev/null; then
    branch="main"
elif git rev-parse --verify master &> /dev/null; then
    branch="master"
else
    branch=$(git rev-parse --abbrev-ref HEAD)
    if [ "$branch" = "HEAD" ]; then
        echo "📝 Creating 'main' branch..."
        git checkout -b main
        branch="main"
    fi
fi

echo "Branch: $branch"

# Push to remote
if git push -u "$remote_name" "$branch"; then
    echo ""
    echo "===================================="
    echo "✅ Successfully pushed to $remote_name!"
    echo "===================================="
    echo ""
    echo "📋 Deployment instructions for target PC:"
    echo ""
    echo "1️⃣  Clone the repository:"
    echo "   git clone $repo_url"
    echo "   cd MYugBotV3"
    echo ""
    echo "2️⃣  Configure environment:"
    echo "   cp .env.production .env"
    echo "   nano .env  # Edit with your settings"
    echo ""
    echo "3️⃣  Deploy with Docker:"
    echo "   docker-compose up -d --build"
    echo ""
    echo "4️⃣  Check logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "===================================="
    echo "📖 For more details, see GIT-DEPLOY.md"
    echo "===================================="
else
    echo ""
    echo "⚠️  Push failed. This might be because:"
    echo "  - Remote repository doesn't exist yet (create it first)"
    echo "  - Authentication failed (check credentials)"
    echo "  - Network issues"
    echo ""
    echo "You can try pushing manually:"
    echo "  git push -u $remote_name $branch"
fi
