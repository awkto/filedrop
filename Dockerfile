# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY server.js ./
COPY public ./public

# Accept version as build argument
ARG VERSION=dev

# Write version to version.txt
RUN echo "${VERSION}" > /app/version.txt

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

# Start the application
CMD ["node", "server.js"]
