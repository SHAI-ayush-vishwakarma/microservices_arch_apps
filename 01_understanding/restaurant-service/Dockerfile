# 1. Start from an official image that already has Node installed
FROM node:22-alpine

# 2. All following commands run inside /app in the container
WORKDIR /app

# 3. Copy only package files first, then install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# 4. Copy the source code
COPY src ./src

# 5. Run as a non-root user (safer)
USER node

# 6. Command to start the service
CMD ["npm", "start"]
