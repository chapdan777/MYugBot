#!/bin/bash

# Script to fix Git repository structure
set -e

echo "🔧 Fixing Git Repository Structure"
echo "==================================="
echo ""

# Navigate to project directory
cd /Users/mironocean/Documents/Progs/MYugBotV3

# Check if .git exists
if [ -d .git ]; then
    echo "⚠️  .git directory already exists in MYugBotV3"
    echo "Checking Git root..."
    git_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
    
    if [ "$git_root" = "/Users/mironocean/Documents/Progs/MYugBotV3" ]; then
        echo "✅ Git repository is correctly located in MYugBotV3"
    else
        echo "❌ Git repository is located at: $git_root"
        echo "❌ This is wrong! It should be in MYugBotV3"
        echo ""
        read -p "Remove existing .git and reinitialize? (y/n): " confirm
        if [[ ! "$confirm" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo "Aborted"
            exit 1
        fi
        rm -rf .git
    fi
fi

# Initialize git if needed
if [ ! -d .git ]; then
    echo "📝 Initializing Git repository in MYugBotV3..."
    git init
    echo "✅ Git initialized"
fi

# Configure remote
echo ""
echo "📡 Configuring remote repository..."
if git remote | grep -q "^origin$"; then
    echo "Remote 'origin' already exists"
    git remote -v
else
    git remote add origin https://github.com/chapdan777/MYugBot.git
    echo "✅ Remote added"
fi

# Create comprehensive .gitignore
echo ""
echo "📝 Updating .gitignore..."
cat > .gitignore << 'EOF'
# dependencies
node_modules/

# compiled output
/dist
/build
*.tsbuildinfo

# Database files (never commit!)
ITM.FDB
*.FDB
*.fdb

# environment variables (sensitive!)
.env
.env.local
.env.*.local

# logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea
.vscode
*.swp
*.swo
*~
.DS_Store

# test coverage
coverage
*.lcov
.nyc_output

# Large JSON flows (optional)
flows*.json

# Images  
*.png
*.jpg
*.jpeg

# Temporary files
*.tar.gz
*.bundle

# Test and debug files (these are development only)
test-*.js
debug-*.js
*.diff
EOF

echo "✅ .gitignore updated"

# Add all files
echo ""
echo "📦 Adding files to Git..."
git add .

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
git status --short | head -30
total_files=$(git status --short | wc -l)
if [ $total_files -gt 30 ]; then
    echo "... and $((total_files - 30)) more files"
fi

echo ""
echo "📊 Important files check:"
echo ""

important_files=(
    "package.json"
    "package-lock.json"
    "docker-compose.yml"
    "Dockerfile"
    "GIT-DEPLOY.md"
    "DOCKER-DEPLOY.md"
    "QUICK-START.md"
    "README.md"
    ".env.example"
    ".env.production"
    "src/main.ts"
    "src/app.module.ts"
    "scripts/migrate.js"
)

missing_files=()
for file in "${important_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - MISSING!"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo ""
    echo "❌ Error: Missing important files!"
    echo "Please ensure all files exist before committing"
    exit 1
fi

echo ""
read -p "Proceed with commit? (y/n): " proceed
if [[ ! "$proceed" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Aborted"
    exit 1
fi

# Create commit
echo ""
echo "💾 Creating commit..."
git commit -m "fix: Correct repository structure and add all necessary files

- Fixed Git repository location (now in MYugBotV3/ instead of Documents/)
- Added all critical files: package-lock.json, Docker configs, deployment docs
- Updated .gitignore to include necessary files
- Ready for production deployment

Critical files included:
- package.json & package-lock.json (dependencies)
- docker-compose.yml & Dockerfile (containerization)
- GIT-DEPLOY.md, DOCKER-DEPLOY.md, QUICK-START.md (documentation)
- .env.example & .env.production (configuration templates)
- All source code and scripts
"

echo "✅ Commit created"

# Push to GitHub
echo ""
echo "🚀 Pushing to GitHub..."
echo ""
echo "⚠️  This will FORCE PUSH and replace the main branch on GitHub!"
echo "⚠️  The current repository structure with Progs/MYugBotV3/ will be removed"
echo "⚠️  New structure will have all files in root of repository"
echo ""
read -p "Continue with force push? (y/n): " force_confirm
if [[ ! "$force_confirm" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Aborted"
    echo ""
    echo "You can push manually later with:"
    echo "  git push origin main --force"
    exit 0
fi

# Ensure we're on main branch
git branch -M main

# Force push
if git push origin main --force; then
    echo ""
    echo "===================================="
    echo "✅ Successfully fixed and pushed!"
    echo "===================================="
    echo ""
    echo "📋 Test deployment on target PC:"
    echo ""
    echo "1️⃣  Clone the repository:"
    echo "   git clone https://github.com/chapdan777/MYugBot.git"
    echo "   cd MYugBot"
    echo ""
    echo "2️⃣  Check that files are in root (not in Progs/MYugBotV3/):"
    echo "   ls -la"
    echo "   # Should see: package.json, docker-compose.yml, Dockerfile, src/, etc."
    echo ""
    echo "3️⃣  Configure environment:"
    echo "   cp .env.production .env"
    echo "   nano .env"
    echo ""
    echo "4️⃣  Deploy with Docker:"
    echo "   docker-compose up -d --build"
    echo ""
else
    echo ""
    echo "❌ Push failed!"
    echo ""
    echo "Possible reasons:"
    echo "  - Authentication failed (check credentials)"
    echo "  - Network issues"
    echo "  - Remote repository doesn't exist"
    echo ""
    echo "Try pushing manually:"
    echo "  git push origin main --force"
fi
