# Start from the small official Node.js 20 image.
FROM node:20-alpine

# Work inside the /app folder in the image.
WORKDIR /app

# Copy the dependency list first so Docker can cache the install step.
COPY package.json ./

# Install the kafkajs library.
# Training rooms often intercept HTTPS and break npm's certificate check.
RUN npm config set strict-ssl false \
 && npm install --omit=dev

# Copy our own files in.
COPY . ./

# Run as a normal user, not the superuser.
USER node

# This service keeps running and listening. It does not stop by itself.
CMD ["node", "consumer.js"]