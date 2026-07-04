@echo off
setlocal enabledelayedexpansion

echo ====================================================
echo        webViewStudio 원클릭 APK 자동 빌더 (Windows)
echo ====================================================

:: 1. Inject configurations dynamically
echo.
echo [Step 1] 설정 동적 주입 진행 중...
node update-config.js
if %errorlevel% neq 0 (
    echo [Error] 설정 주입에 실패했습니다.
    exit /b %errorlevel%
)

:: Load appName from config.json to name the output APK
for /f "delims=" %%i in ('node -e "console.log(require('./config.json').appName || 'webviewstudio')"') do set APP_NAME=%%i
:: Simple space-to-underscore replacement for filename safety in batch
set SAFE_APP_NAME=%APP_NAME: =_%

:: 2. Capacitor Web Assets Copy & Native Sync
echo.
echo [Step 2] Capacitor 웹 에셋 동기화 및 네이티브 싱크 중...
call npx cap sync android
if %errorlevel% neq 0 (
    echo [Error] Capacitor 동기화에 실패했습니다.
    exit /b %errorlevel%
)

:: 3. Compile Android Project using Gradle CLI
echo.
echo [Step 3] Gradle 컴파일 및 APK 빌드 시작...
if exist android (
    cd android
    call gradlew.bat assembleDebug
    if !errorlevel! neq 0 (
        echo [Error] Gradle 컴파일에 실패했습니다.
        cd ..
        exit /b !errorlevel!
    )
    cd ..
) else (
    echo [Error] android 디렉토리가 존재하지 않습니다. npx cap add android를 먼저 실행해 주세요.
    exit /b 1
)

:: 4. Copy build outputs
echo.
echo [Step 4] 빌드 아티팩트 추출 중...
set APK_SOURCE=android\app\build\outputs\apk\debug\app-debug.apk
set OUTPUT_DIR=build-output
set APK_TARGET=%OUTPUT_DIR%\%SAFE_APP_NAME%-debug.apk

if exist %APK_SOURCE% (
    if not exist %OUTPUT_DIR% mkdir %OUTPUT_DIR%
    copy /y %APK_SOURCE% %APK_TARGET% >nul
    echo ====================================================
    echo 🎉 빌드가 성공적으로 완료되었습니다!
    echo 📂 생성된 APK 파일 경로:
    echo 👉 %APK_TARGET%
    echo ====================================================
) else (
    echo [Error] APK 컴파일 완료되었으나 파일이 누락되었습니다.
    exit /b 1
)

endlocal
