# CareerHub - Job Portal Application

CareerHub is a full-stack job portal application that connects students with job opportunities. It features separate dashboards for administrators and students, job application management, and student registration.

## Prerequisites

- Ubuntu Server (20.04 LTS or later recommended)
- Node.js (v14 or later)
- MongoDB (v4.4 or later)
- Nginx (for production deployment)
- Git

## Installation

### 1. Server Setup

```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y nodejs npm mongodb nginx git

# Install PM2 globally for process management
sudo npm install -y pm2 -g
```

### 2. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd careerhub

# Install dependencies for both client and server
npm install
cd client
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Server configuration
PORT=5001
MONGODB_URI=mongodb://localhost:27017/careerhub
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production

# Client configuration (in client/.env)
REACT_APP_API_URL=http://your-server-ip:5001
```

### 4. Build the Client Application

```bash
cd client
npm run build
cd ..
```

### 5. Configure Nginx

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/careerhub
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/careerhub/client/build;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/careerhub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Start the Application

```bash
# Start the server using PM2
pm2 start server.js --name "careerhub-server"

# Start the client build
pm2 serve client/build 3000 --name "careerhub-client"

# Save PM2 process list
pm2 save

# Configure PM2 to start on system boot
pm2 startup
```

## Security Considerations

1. Set up SSL using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

2. Configure firewall:
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

3. Set up MongoDB authentication:
```bash
# Connect to MongoDB
mongo

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your_secure_password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})

# Update MongoDB configuration
sudo nano /etc/mongod.conf
# Add security section:
security:
  authorization: enabled
```

## Monitoring and Maintenance

1. Check application status:
```bash
pm2 status
```

2. View logs:
```bash
pm2 logs careerhub-server
pm2 logs careerhub-client
```

3. Restart application:
```bash
pm2 restart all
```

## Backup and Recovery

1. Set up MongoDB backup:
```bash
# Create backup directory
sudo mkdir -p /backup/mongodb

# Create backup script
sudo nano /usr/local/bin/mongodb-backup.sh
```

Add the following to the backup script:
```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mongodump --out $BACKUP_DIR/$TIMESTAMP
```

Make the script executable:
```bash
sudo chmod +x /usr/local/bin/mongodb-backup.sh
```

2. Set up cron job for daily backups:
```bash
sudo crontab -e
# Add the following line:
0 0 * * * /usr/local/bin/mongodb-backup.sh
```

## Troubleshooting

1. Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

2. Check application logs:
```bash
pm2 logs
```

3. Check MongoDB status:
```bash
sudo systemctl status mongodb
```

## Support

For any issues or questions, please contact the development team or create an issue in the repository.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 