#!/bin/bash
# Clear corrupted Gradle Kotlin DSL caches
# This fixes "Could not read workspace metadata" errors

echo "🧹 Clearing Gradle Kotlin DSL caches..."

# Stop all Gradle daemons
./gradlew --stop 2>/dev/null || true

# Clear Kotlin DSL caches
rm -rf ~/.gradle/caches/*/kotlin-dsl
rm -rf ~/.gradle/caches/*/scripts

# Clear configuration cache
rm -rf .gradle/configuration-cache

echo "✅ Gradle caches cleared!"
echo "💡 Run your build command again"
