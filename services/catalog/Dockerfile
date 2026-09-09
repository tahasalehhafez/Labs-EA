# Start from the official Node.js 20 image, the small "alpine" edition.
# Alpine is a tiny Linux, so the image downloads and starts faster.
FROM node:20-alpine

# Work inside a folder called /app inside the image.
WORKDIR /app

# Copy only the dependency list first, before the rest of the code.
# Docker caches this step, so changing server.js later does not re-download libraries.
COPY package.json ./

# Install the libraries listed in package.json.
# --omit=dev skips tools only needed while developing, keeping the image small.
# Training rooms often intercept HTTPS and break npm's certificate check.
# strict-ssl false lets the install finish here. Do not copy this into production builds.
RUN npm config set strict-ssl false \
 && npm install --omit=dev

# Now copy the rest of our files into the image.
COPY . ./

# Tell readers which port this service listens on. This line is documentation.
EXPOSE 8080

# Do not run as the root superuser. If someone breaks in, they get fewer powers.
# The node image already contains a normal user called "node".
USER node

# The command that runs when the container starts.
CMD ["node", "server.js"]