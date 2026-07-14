const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const wwwConfigPath = path.join(__dirname, 'www', 'config.json');
const capConfigPath = path.join(__dirname, 'capacitor.config.json');

const gradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');
const stringsXmlPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

function log(msg) {
  console.log(`[Config Injector] ${msg}`);
}

function updateConfig() {
  if (!fs.existsSync(configPath)) {
    console.error(`[Error] config.json not found at ${configPath}`);
    process.exit(1);
  }

  // 1. Read config.json
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);
  log(`Loaded configurations: appName="${config.appName}", packageName="${config.packageName}", remoteUrl="${config.remoteUrl || ''}"`);

  // 2. Write config.json to www/config.json for web app access
  fs.writeFileSync(wwwConfigPath, JSON.stringify(config, null, 2), 'utf8');
  log(`Copied config to www/config.json`);

  // 3. Update capacitor.config.json
  if (fs.existsSync(capConfigPath)) {
    const capContent = fs.readFileSync(capConfigPath, 'utf8');
    const capConfig = JSON.parse(capContent);

    capConfig.appId = config.packageName;
    capConfig.appName = config.appName;

    if (config.remoteUrl && config.remoteUrl.trim() !== "") {
      capConfig.server = {
        url: config.remoteUrl.trim(),
        cleartext: true
      };
      log(`Remote URL set in capacitor.config.json: ${config.remoteUrl}`);
    } else {
      delete capConfig.server;
      log(`Using local assets (www/) in capacitor.config.json`);
    }

    fs.writeFileSync(capConfigPath, JSON.stringify(capConfig, null, 2), 'utf8');
    log(`Updated capacitor.config.json`);
  } else {
    log(`Warning: capacitor.config.json not found at ${capConfigPath}`);
  }

  // 4. Update Android native configs if directory exists
  if (fs.existsSync(gradlePath)) {
    let gradleContent = fs.readFileSync(gradlePath, 'utf8');
    // Regex to match: applicationId "com.example.app"
    const gradleRegex = /(applicationId\s+)"([^"]+)"/;
    if (gradleRegex.test(gradleContent)) {
      gradleContent = gradleContent.replace(gradleRegex, `$1"${config.packageName}"`);
      fs.writeFileSync(gradlePath, gradleContent, 'utf8');
      log(`Updated android/app/build.gradle with applicationId "${config.packageName}"`);
    } else {
      log(`Warning: Could not find applicationId pattern in build.gradle`);
    }
  } else {
    log(`Android app/build.gradle not found. Run 'npx cap add android' first.`);
  }

  if (fs.existsSync(stringsXmlPath)) {
    let stringsContent = fs.readFileSync(stringsXmlPath, 'utf8');
    // Regex for app_name, title_activity_main, package_name, and custom_url_scheme
    const appNameRegex = /(<string\s+name="app_name">)([^<]+)(<\/string>)/;
    const titleRegex = /(<string\s+name="title_activity_main">)([^<]+)(<\/string>)/;
    const packageStrRegex = /(<string\s+name="package_name">)([^<]+)(<\/string>)/;
    const schemeRegex = /(<string\s+name="custom_url_scheme">)([^<]+)(<\/string>)/;

    if (appNameRegex.test(stringsContent)) {
      stringsContent = stringsContent.replace(appNameRegex, `$1${config.appName}$3`);
    }
    if (titleRegex.test(stringsContent)) {
      stringsContent = stringsContent.replace(titleRegex, `$1${config.appName}$3`);
    }
    if (packageStrRegex.test(stringsContent)) {
      stringsContent = stringsContent.replace(packageStrRegex, `$1${config.packageName}$3`);
    }
    if (schemeRegex.test(stringsContent)) {
      stringsContent = stringsContent.replace(schemeRegex, `$1${config.packageName}$3`);
    }

    fs.writeFileSync(stringsXmlPath, stringsContent, 'utf8');
    log(`Updated android/app/src/main/res/values/strings.xml (app_name, title, package_name, custom_url_scheme)`);
  } else {
    log(`Android strings.xml not found. Run 'npx cap add android' first.`);
  }

  // 5. App Icon Resolution (Reset to default first, then apply custom if exists)
  const defaultIconsDir = path.join(__dirname, 'default-resources');
  const customIconsDir = path.join(__dirname, 'custom-resources');
  const resBaseDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

  if (fs.existsSync(resBaseDir)) {
    const iconMappings = [
      { src: 'android-icon-48x48.png', dest: 'mipmap-mdpi' },
      { src: 'android-icon-72x72.png', dest: 'mipmap-hdpi' },
      { src: 'android-icon-96x96.png', dest: 'mipmap-xhdpi' },
      { src: 'android-icon-144x144.png', dest: 'mipmap-xxhdpi' },
      { src: 'android-icon-192x192.png', dest: 'mipmap-xxxhdpi' }
    ];

    // Step 5.1: Always reset to default icons first
    if (fs.existsSync(defaultIconsDir)) {
      iconMappings.forEach(m => {
        const defaultFolder = path.join(defaultIconsDir, m.dest);
        const destFolder = path.join(resBaseDir, m.dest);
        
        const launcherPath = path.join(defaultFolder, 'ic_launcher.png');
        const roundPath = path.join(defaultFolder, 'ic_launcher_round.png');
        
        if (fs.existsSync(launcherPath) && fs.existsSync(destFolder)) {
          fs.writeFileSync(path.join(destFolder, 'ic_launcher.png'), fs.readFileSync(launcherPath));
        }
        if (fs.existsSync(roundPath) && fs.existsSync(destFolder)) {
          fs.writeFileSync(path.join(destFolder, 'ic_launcher_round.png'), fs.readFileSync(roundPath));
        }
      });
      log("Reset app icons to default original assets.");
    }

    // Step 5.2: Apply custom icons if custom-resources directory has icons
    if (fs.existsSync(customIconsDir)) {
      let copyCount = 0;
      iconMappings.forEach(m => {
        const srcPath = path.join(customIconsDir, m.src);
        const destFolder = path.join(resBaseDir, m.dest);
        
        if (fs.existsSync(srcPath)) {
          if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
          }
          const fileData = fs.readFileSync(srcPath);
          fs.writeFileSync(path.join(destFolder, 'ic_launcher.png'), fileData);
          fs.writeFileSync(path.join(destFolder, 'ic_launcher_round.png'), fileData);
          copyCount++;
        }
      });

      if (copyCount > 0) {
        log(`Applied ${copyCount} custom app icons from custom-resources/ to android/app/src/main/res/`);
      } else {
        log(`Using default app icons (no matching android-icon-*.png found in custom-resources/)`);
      }
    } else {
      log(`Using default app icons (custom-resources/ folder not found)`);
    }
  }

  log(`Configuration update completed successfully!`);
}

updateConfig();
