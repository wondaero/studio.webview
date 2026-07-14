# webViewStudio - 범용 웹뷰 앱 빌더 & 오프라인 PWA 템플릿

webViewStudio는 웹 소스(HTML/CSS/JS)나 원격 웹 주소(Remote URL)를 기반으로 원클릭으로 Android APK를 빌드할 수 있는 공통 템플릿 빌더입니다. 서비스 워커(PWA) 기술을 네이티브 웹뷰에 결합하여 스마트폰 내부 캐시 기반의 고속 오프라인 구동 및 백그라운드 버전 업데이트 감지 기능을 지원합니다.

---

## 📋 사전 필수 요구사항 (Prerequisites)
이 프로젝트를 사용해 Android APK로 컴파일하려면 빌드를 진행할 PC에 **JDK 17 이상 (Java 17 또는 21 권장)**이 반드시 설치되어 있어야 합니다. (최신 안드로이드 빌드 엔진인 AGP 8.x의 필수 요구사양입니다.)

### 1. JDK가 설치되어 있지 않은 경우 설치 방법
운영체제(OS)에 맞춰 아래 링크에서 인스톨러 파일을 받아 더블클릭하여 기본값으로 설치하시면 완료됩니다.

* **간편 설치 파일 다운로드 (추천):**
  * [Eclipse Temurin JDK 17 (LTS) 공식 다운로드 페이지](https://adoptium.net/temurin/releases/?version=17)에 접속하여 본인의 OS(Mac / Windows 등)와 CPU 아키텍처에 맞는 인스톨러(`.dmg` 또는 `.msi` 등)를 받아 설치하세요.
* **커맨드라인으로 설치하기:**
  * **macOS (Homebrew 사용 시):**
    ```bash
    brew install openjdk@17
    ```
  * **Windows (명령 프롬프트에서 winget 사용 시):**
    ```cmd
    winget install EclipseAdoptium.Temurin.17.JDK
    ```

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. 의존성 패키지 설치
최초 프로젝트를 내려받은 후, 터미널에서 다음 명령어로 필수 Capacitor 및 Android 모듈을 설치합니다.
```bash
npm install
```

### 2. 설정 파일 수정 (`config.json`)
프로젝트 루트 폴더의 `config.json` 파일을 열고 원하는 앱 설정으로 고쳐줍니다.
```json
{
  "appName": "webViewStudio App",
  "packageName": "com.rrrrro.webviewstudio",
  "remoteUrl": "",
  "offlineFallback": true
}
```
* **`appName`**: 네이티브 앱의 타이틀 및 앱 이름입니다.
* **`packageName`**: Android 앱의 패키지 고유 ID (Bundle ID)입니다.
* **`remoteUrl`**: 
  * 원격 웹서비스 주소(예: `https://example.com`)를 입력하면 해당 사이트를 웹뷰로 띄웁니다.
  * **빈 값(`""`)**으로 남겨두면, `www/` 폴더 내의 로컬 HTML/CSS/JS 에셋을 로드하는 오프라인 앱 모드로 작동합니다.
* **`offlineFallback`**: 로컬 모드에서 서비스 워커 기반 스마트 캐싱 적용 여부를 결정합니다.

### 2.1 커스텀 앱 아이콘 지정 및 변경 매뉴얼 (선택사항)
이 프로젝트는 매번 빌드할 때마다 자동으로 커스텀 이미지의 존재 여부를 판단하여 네이티브 앱 아이콘을 교환해 줍니다. 

1. **아이콘 적용 방법:**
   * 프로젝트 루트에 기본 생성되어 있는 [custom-resources/](file:///Users/ro/Desktop/project1/mine/studio.webview/custom-resources) 폴더 안에 해상도별 이미지 파일(PNG) 5장을 규격에 맞춰 넣어둡니다.
     * `android-icon-48x48.png` (mdpi 대응)
     * `android-icon-72x72.png` (hdpi 대응)
     * `android-icon-96x96.png` (xhdpi 대응)
     * `android-icon-144x144.png` (xxhdpi 대응)
     * `android-icon-192x192.png` (xxxhdpi 대응)
2. **아이콘 변경 방법:**
   * 나중에 아이콘 디자인을 변경하고 싶다면, 단순히 **위의 `.png` 파일들만 동일한 이름으로 덮어쓰기(교체)** 하시면 빌드 시 알아서 바뀝니다.
   * 별도의 설정을 건드리거나 폴더 내의 `.gitkeep` 파일을 수정하실 필요가 전혀 없습니다.
3. **기본 순정 아이콘 복원 (Reset):**
   * 커스텀 아이콘을 제거하고 원래의 Capacitor 기본 로고(순정)로 되돌리고 싶다면, [custom-resources/](file:///Users/ro/Desktop/project1/mine/studio.webview/custom-resources) 폴더 안의 이미지 파일(`.png` 5장)들만 삭제하고 다시 빌드하시면 즉시 원본 상태로 롤백 컴파일됩니다.

### 3. 원클릭 빌드 실행
설정을 마치면 운영체제(OS)에 맞춰 자동 빌드 스크립트를 로컬 터미널에서 실행합니다.

* **macOS / Linux:**
  ```bash
  chmod +x build.sh
  ./build.sh
  ```
* **Windows (명령 프롬프트/CMD):**
  ```cmd
  build.bat
  ```

> [!NOTE]
> 빌드 스크립트를 실행하면 `update-config.js`가 네이티브 설정(`build.gradle`, `strings.xml`, `capacitor.config.json`)을 `config.json` 기반으로 자동 업데이트한 뒤 Gradle 컴파일을 수행합니다.
> 빌드가 끝나면 **`build-output/`** 폴더에 최종 APK 파일(예: `build-output/webViewStudio_App-debug.apk`)이 생성됩니다.

---

## 🛠️ 주요 기능 및 테스트 방법

### 1. 오프라인 스마트 캐싱 & 고속 로딩 전략 (`www/sw.js`)
* 로컬 모드로 APK 실행 시, 서비스 워커가 2.5초 타임아웃 캐시 우선 오프라인 구동(Network-First with Timeout & Cache Fallback) 전략을 사용해 속도를 극대화합니다.
* 데이터 연결이 없거나 불안정해도 캐시에서 화면을 즉시 로드합니다.

### 2. 무중단 버전 업데이트 및 배너 공지 (`www/index.html`)
* 백그라운드로 1KB 미만의 에셋 버전 체크를 주기적으로 수행합니다.
* 새로운 배포 버전이 감지되면 화면 상단에 **"🎉 새로운 업데이트가 준비되었습니다! [업데이트 적용]"** 배너 알림 모달을 띄워 자연스러운 업데이트 갱신을 유도합니다.

---

## 📂 프로젝트 구조 안내

```text
studio.webview/
├── www/                     # 웹뷰가 렌더링할 로컬 웹 리소스 폴더
│   ├── index.html           # 메인 대시보드 UI 및 PWA 업데이트 감지 스크립트
│   └── sw.js                # 캐싱 및 네트워크 타임아웃 제어 서비스 워커
├── config.json              # 최상위 앱 설정 파일 (앱 이름, 패키지 ID 등)
├── update-config.js         # 빌드 시점에 설정을 Android 네이티브에 동적 주입하는 스크립트
├── build.sh / build.bat     # 플랫폼별 원클릭 빌드 스크립트
├── android/                 # Capacitor가 생성한 네이티브 안드로이드 프로젝트 폴더
└── build-output/            # 최종 생성된 APK 파일 저장 폴더
```
