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

  log(`Configuration update completed successfully!`);
}

updateConfig();
