
FROM python:3-alpine

# Install necessary dependencies
# RUN apk add --no-cache gcc musl-dev linux-headers g++ python3-dev nodejs npm
# RUN apk add --no-cache gcc musl-dev linux-headers g++ python3-dev nodejs npm libffi-dev freetype-dev libpng-dev zlib-dev
RUN apk add --no-cache gcc musl-dev linux-headers g++ python3-dev nodejs npm libffi-dev freetype-dev libpng-dev zlib-dev jpeg-dev openjpeg-dev tiff-dev tk-dev tcl-dev harfbuzz-dev fribidi-dev
RUN apk add --no-cache sudo
RUN apk add --no-cache git
RUN pip install --upgrade pip
# RUN pip install jupyter pandas numpy matplotlib seaborn scikit-learn
# RUN pip install jupyter
# RUN pip install jupyter==6.0.1
RUN pip install notebook==6.0.1
RUN pip install pandas
RUN pip install numpy
# RUN pip install matplotlib
# RUN pip install seaborn
# RUN pip install scikit-learn

# RUN apk add --update qemu-x86_64

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json /app/
RUN npm install

# Copy the rest of the application files
# add --no-cache to avoid caching
COPY . /app 
# COPY . /app
COPY jupyter_notebook_config.py /root/.jupyter/
COPY custom.js /root/.jupyter/custom/custom.js

# Expose port for Node.js application
EXPOSE 3015

# Expose port for Jupyter Notebook
EXPOSE 8080
# Command to run the Node.js server
CMD ["node", "server.js"]
