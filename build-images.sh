#!/bin/bash
# ============================================================
# build-images.sh — Build all Docker sandbox images
# Run this ONCE before starting the app
# ============================================================
set -e

echo "🔨 Building C++ runner..."
docker build -t compiler-cpp ./runners/cpp

echo "🔨 Building Python runner..."
docker build -t compiler-python ./runners/python

echo "🔨 Building Java runner..."
docker build -t compiler-java ./runners/java

echo "🔨 Building JavaScript runner..."
docker build -t compiler-javascript ./runners/javascript

echo ""
echo "✅ All images built successfully!"
echo ""
echo "Next: docker compose up --build"
