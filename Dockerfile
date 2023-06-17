# Use an official Node.js runtime as the base image
FROM node:18-alpine
 
# Set the working directory in the container
WORKDIR /app
 
# Copy package.json and package-lock.json to the container
COPY package*.json ./

# install tsc
RUN npm install -g typescript
 
# Install app dependencies
RUN npm install
 
# Copy the application code to the container
COPY . .

# build the app
RUN npm run build
 
# Expose the port that the Express app listens on
EXPOSE 3002
 
# Start the Express app
CMD [ "npm", "run", "start" ]