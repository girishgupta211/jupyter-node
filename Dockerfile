
FROM python:3-alpine

# Install necessary dependencies
RUN apk add --no-cache gcc musl-dev linux-headers g++ python3-dev nodejs npm

RUN pip install --upgrade pip
RUN pip install jupyter pandas numpy matplotlib seaborn scikit-learn

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json /app/
RUN npm install

# Copy the rest of the application files
COPY . /app

# Expose port for Node.js application
EXPOSE 3015

# Command to run the Node.js server
CMD ["node", "server.js"]
