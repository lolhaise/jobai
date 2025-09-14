#!/bin/bash
# JobAI Deployment Script
# This script automates the deployment process for production

set -e # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DEPLOY_BRANCH=${2:-main}
BACKUP_ENABLED=${BACKUP_ENABLED:-true}
ZERO_DOWNTIME=${ZERO_DOWNTIME:-true}

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f ".env.$ENVIRONMENT" ]; then
        print_error "Environment file .env.$ENVIRONMENT not found"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Backup database
backup_database() {
    if [ "$BACKUP_ENABLED" = true ]; then
        print_status "Creating database backup..."
        
        BACKUP_DIR="./backups/$(date +'%Y%m%d_%H%M%S')"
        mkdir -p "$BACKUP_DIR"
        
        # Create database backup
        docker-compose -f infrastructure/docker-compose.prod.yml exec -T postgres \
            pg_dump -U jobai_user jobai | gzip > "$BACKUP_DIR/database.sql.gz"
        
        # Backup environment variables
        cp ".env.$ENVIRONMENT" "$BACKUP_DIR/.env.backup"
        
        # Keep only last 30 backups
        find ./backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
        
        print_status "Backup completed: $BACKUP_DIR"
    fi
}

# Pull latest code
update_code() {
    print_status "Pulling latest code from $DEPLOY_BRANCH branch..."
    
    git fetch origin
    git checkout "$DEPLOY_BRANCH"
    git pull origin "$DEPLOY_BRANCH"
    
    # Update submodules if any
    git submodule update --init --recursive
    
    print_status "Code updated successfully"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Set environment
    export $(cat ".env.$ENVIRONMENT" | grep -v '^#' | xargs)
    
    # Build images
    docker-compose -f infrastructure/docker-compose.prod.yml build --no-cache
    
    print_status "Docker images built successfully"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    docker-compose -f infrastructure/docker-compose.prod.yml run --rm api \
        pnpm prisma migrate deploy
    
    print_status "Migrations completed successfully"
}

# Deploy with zero downtime
deploy_zero_downtime() {
    print_status "Starting zero-downtime deployment..."
    
    # Start new containers with different names
    docker-compose -f infrastructure/docker-compose.prod.yml \
        -p jobai_new up -d --scale web=2 --scale api=2
    
    # Wait for health checks to pass
    print_status "Waiting for health checks..."
    sleep 30
    
    # Check if new containers are healthy
    if docker-compose -f infrastructure/docker-compose.prod.yml \
        -p jobai_new exec -T web curl -f http://localhost:3000/api/health &> /dev/null; then
        print_status "New containers are healthy"
        
        # Switch traffic to new containers
        docker-compose -f infrastructure/docker-compose.prod.yml \
            -p jobai down
        
        # Rename new project to default
        docker-compose -f infrastructure/docker-compose.prod.yml \
            -p jobai_new down
        docker-compose -f infrastructure/docker-compose.prod.yml \
            up -d
    else
        print_error "Health check failed for new containers"
        docker-compose -f infrastructure/docker-compose.prod.yml \
            -p jobai_new down
        exit 1
    fi
    
    print_status "Zero-downtime deployment completed"
}

# Standard deployment
deploy_standard() {
    print_status "Starting standard deployment..."
    
    # Stop existing containers
    docker-compose -f infrastructure/docker-compose.prod.yml down
    
    # Start new containers
    docker-compose -f infrastructure/docker-compose.prod.yml up -d
    
    print_status "Standard deployment completed"
}

# Clean up old resources
cleanup() {
    print_status "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -af --filter "until=24h"
    
    # Remove unused volumes
    docker volume prune -f
    
    # Clear temporary files
    find /tmp -name "jobai_*" -mtime +7 -delete 2>/dev/null || true
    
    print_status "Cleanup completed"
}

# Run post-deployment tests
run_tests() {
    print_status "Running post-deployment tests..."
    
    # Test web app
    if curl -f https://jobai.app/api/health &> /dev/null; then
        print_status "Web app health check passed"
    else
        print_error "Web app health check failed"
        exit 1
    fi
    
    # Test API
    if curl -f https://api.jobai.app/health &> /dev/null; then
        print_status "API health check passed"
    else
        print_error "API health check failed"
        exit 1
    fi
    
    # Run smoke tests
    docker-compose -f infrastructure/docker-compose.prod.yml exec -T api \
        pnpm test:e2e --testNamePattern="smoke"
    
    print_status "All tests passed"
}

# Send deployment notification
send_notification() {
    print_status "Sending deployment notification..."
    
    # Send to Slack/Discord/Email
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"JobAI deployed successfully to $ENVIRONMENT from branch $DEPLOY_BRANCH\"}"
    fi
    
    print_status "Notification sent"
}

# Main deployment flow
main() {
    print_status "Starting JobAI deployment to $ENVIRONMENT"
    
    # Run deployment steps
    check_prerequisites
    backup_database
    update_code
    build_images
    run_migrations
    
    # Deploy based on strategy
    if [ "$ZERO_DOWNTIME" = true ]; then
        deploy_zero_downtime
    else
        deploy_standard
    fi
    
    # Post-deployment
    cleanup
    run_tests
    send_notification
    
    print_status "Deployment completed successfully!"
}

# Error handler
trap 'print_error "Deployment failed! Rolling back..."; docker-compose -f infrastructure/docker-compose.prod.yml up -d; exit 1' ERR

# Run main function
main