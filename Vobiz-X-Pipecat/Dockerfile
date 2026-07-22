FROM dailyco/pipecat-base:latest-py3.11

# Copy the requirements file
COPY requirements.txt requirements.txt

# Install dependencies using pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY bot.py bot.py
