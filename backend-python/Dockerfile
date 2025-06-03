FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg libpq-dev gcc curl && \
    rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

RUN mkdir -p /app/uploaded_videos && chmod -R 777 /app/uploaded_videos

EXPOSE 8000