package com.rrrrro.webviewstudio;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 뒤로가기 버튼을 누를 때 웹뷰가 뒤로 갈 수 있으면 웹뷰 뒤로가기(goBack) 수행
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = bridge.getWebView();
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });

        // 1. 파일 다운로드 리스너 및 브릿지 연결 (Capacitor 웹뷰 비동기 로딩 대응 지연 바인딩)
        final android.os.Handler handler = new android.os.Handler();
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                final WebView webView = bridge.getWebView();
                if (webView != null) {
                    setupWebViewDownload(webView);
                    
                    // 👈 [한번 더 불러오기] IndexedDB가 수립될 충분한 시간(800ms) 뒤에 네이티브가 달력 함수를 강제로 1회 더 호출
                    handler.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            webView.evaluateJavascript("javascript:(function() { if (typeof getCalendar === 'function') { getCalendar('#calendar'); } })();", null);
                        }
                    }, 800);
                } else {
                    // 아직 초기화 전이면 200ms 뒤에 다시 시도
                    handler.postDelayed(this, 200);
                }
            }
        }, 100);
    }

    // 웹뷰 다운로드 관련 기능 설정 및 스토리지 성능 최적화
    private void setupWebViewDownload(final WebView webView) {
        // 1. 네이티브 데이터베이스 및 DOM 스토리지 최적화 (IndexedDB 초기화 가속화)
        android.webkit.WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true); // HTML5 로컬 데이터베이스 활성화
        settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
        
        // 2. JavaScript 인터페이스 등록 (Blob 데이터 수신용)
        webView.addJavascriptInterface(new BlobDownloadBridge(this, webView), "BlobDownloadBridge");

        // 3. 다운로드 리스너 설정
        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                if (url.startsWith("blob:")) {
                    // 안드로이드 내장 유틸로 최적의 파일명 추출 (예: backup.json)
                    final String fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimetype);
                    
                    // WebView 내에 JS를 주입하여 Blob을 Base64로 인코딩한 뒤 네이티브 브릿지로 전송
                    String javascript = "javascript:(function() {" +
                            "   fetch('" + url + "')" +
                            "       .then(function(r) { return r.blob(); })" +
                            "       .then(function(blob) {" +
                            "           var reader = new FileReader();" +
                            "           reader.onloadend = function() {" +
                            "               var base64 = reader.result;" +
                            "               BlobDownloadBridge.onBlobDataReceived(base64, '" + fileName + "', '" + mimetype + "');" +
                            "           };" +
                            "           reader.readAsDataURL(blob);" +
                            "       })" +
                            "       .catch(function(e) { console.error('Blob fetch error:', e); });" +
                            "})();";
                    webView.evaluateJavascript(javascript, null);
                } else if (url.startsWith("data:")) {
                    // Data URI 형식 대응 (간이 다운로드)
                    try {
                        String base64Data = url.substring(url.indexOf(",") + 1);
                        String mimeType = url.substring(url.indexOf(":") + 1, url.indexOf(";"));
                        String filename = "download_" + System.currentTimeMillis();
                        if (mimeType.contains("json")) filename += ".json";
                        
                        BlobDownloadBridge bridgeInstance = new BlobDownloadBridge(MainActivity.this, webView);
                        bridgeInstance.onBlobDataReceived(base64Data, filename, mimeType);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                } else {
                    // 일반 외부 HTTP/HTTPS URL 다운로드 시 외부 브라우저(DownloadManager) 연동
                    android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                    intent.setData(android.net.Uri.parse(url));
                    startActivity(intent);
                }
            }
        });
    }

    // 2. Blob 및 Base64 파일 저장을 돕는 네이티브 브릿지 클래스 정의
    public static class BlobDownloadBridge {
        private android.content.Context context;
        private WebView webView;

        public BlobDownloadBridge(android.content.Context context, WebView webView) {
            this.context = context;
            this.webView = webView;
        }

        @android.webkit.JavascriptInterface
        public void onBlobDataReceived(String base64Data, String fileName, String mimeType) {
            try {
                // Base64 접두사("data:application/json;base64,") 등이 있으면 제거
                if (base64Data.contains(",")) {
                    base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                }
                byte[] fileBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                saveFile(fileName, mimeType, fileBytes);
            } catch (Exception e) {
                e.printStackTrace();
                showToast("다운로드 변환 오류: " + e.getMessage());
            }
        }

        private void saveFile(String fileName, String mimeType, byte[] data) {
            try {
                // Android 10 (Q, API 29) 이상: MediaStore를 활용한 무권한 파일 저장
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    android.content.ContentValues values = new android.content.ContentValues();
                    values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_DOWNLOADS);

                    android.content.ContentResolver resolver = context.getContentResolver();
                    android.net.Uri uri = resolver.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri != null) {
                        try (java.io.OutputStream os = resolver.openOutputStream(uri)) {
                            os.write(data);
                            os.flush();
                            showToast("📂 다운로드 완료: Download 폴더에 저장되었습니다.");
                        }
                    }
                } else {
                    // Android 9 이하: 외부 공용 저장소 직접 경로 접근
                    java.io.File path = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                    if (!path.exists()) {
                        path.mkdirs();
                    }
                    java.io.File file = new java.io.File(path, fileName);
                    try (java.io.FileOutputStream fos = new java.io.FileOutputStream(file)) {
                        fos.write(data);
                        fos.flush();
                        showToast("📂 다운로드 완료: " + file.getAbsolutePath());
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
                showToast("💾 저장 실패: " + e.getMessage());
            }
        }

        private void showToast(final String message) {
            if (context instanceof android.app.Activity) {
                ((android.app.Activity) context).runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_LONG).show();
                    }
                });
            }
        }
    }
}
