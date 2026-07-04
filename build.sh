#!/bin/bash

# Exit immediately if any command exits with a non-zero status
set -e

# Define color codes for pretty output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${CYAN}       webViewStudio 원클릭 APK 자동 빌더           ${NC}"
echo -e "${CYAN}====================================================${NC}"

# 1. Inject configurations dynamically
echo -e "\n${YELLOW}[Step 1] 설정 동적 주입 진행 중...${NC}"
node update-config.js

# Load appName from config.json to name the output APK
APP_NAME=$(node -e "console.log(require('./config.json').appName || 'webviewstudio')")
# Normalize app name for filename (replace spaces and special chars)
SAFE_APP_NAME=$(echo "$APP_NAME" | sed 's/[^a-zA-Z0-9_-]/_/g')

# 2. Capacitor Web Assets Copy & Native Sync
echo -e "\n${YELLOW}[Step 2] Capacitor 웹 에셋 동기화 및 네이티브 싱크 중...${NC}"
npx cap sync android

# Force Java 17 compatibility for local JDK 17 environments
echo -e "${YELLOW}로컬 JDK 17 호환성을 위해 Java 컴파일 버전을 17로 자동 조정합니다...${NC}"
if [ -f "android/app/capacitor.build.gradle" ]; then
    sed -i.bak 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle && rm -f android/app/capacitor.build.gradle.bak
fi
if [ -f "node_modules/@capacitor/android/capacitor/build.gradle" ]; then
    sed -i.bak 's/VERSION_21/VERSION_17/g' node_modules/@capacitor/android/capacitor/build.gradle && rm -f node_modules/@capacitor/android/capacitor/build.gradle.bak
fi

# 3. Compile Android Project using Gradle CLI
echo -e "\n${YELLOW}[Step 3] Gradle 컴파일 및 APK 빌드 시작...${NC}"
if [ -d "android" ]; then
    cd android
    # Grant execute permission to gradlew
    chmod +x gradlew
    # Run gradle build
    ./gradlew assembleDebug
    cd ..
else
    echo -e "${RED}[Error] android 디렉토리가 존재하지 않습니다. npx cap add android를 먼저 실행해 주세요.${NC}"
    exit 1
fi

# 4. Copy build outputs
echo -e "\n${YELLOW}[Step 4] 빌드 아티팩트 추출 중...${NC}"
APK_SOURCE="android/app/build/outputs/apk/debug/app-debug.apk"
OUTPUT_DIR="build-output"
APK_TARGET="${OUTPUT_DIR}/${SAFE_APP_NAME}-debug.apk"

if [ -f "$APK_SOURCE" ]; then
    mkdir -p "$OUTPUT_DIR"
    cp "$APK_SOURCE" "$APK_TARGET"
    echo -e "${GREEN}====================================================${NC}"
    echo -e "${GREEN}🎉 빌드가 성공적으로 완료되었습니다!${NC}"
    echo -e "${GREEN}📂 생성된 APK 파일 경로:${NC}"
    echo -e "${CYAN}👉 ${APK_TARGET}${NC}"
    echo -e "${GREEN}====================================================${NC}"
else
    echo -e "${RED}[Error] APK 컴파일 완료되었으나 파일이 누락되었습니다.${NC}"
    exit 1
fi
