# 4chan TTS Android APK Build Guide

## Overview
This guide explains how to build and deploy the 4chan TTS Android APK using the automated GitHub Actions workflow.

## Automated Build Process

The APK is automatically built using GitHub Actions whenever code is pushed to the main branch.

### Build Workflow
1. **Trigger**: Push to main/master branch or manual workflow dispatch
2. **Environment**: Ubuntu latest with Node.js 18, Java 17, and Android SDK
3. **Process**:
   - Creates Cordova project
   - Copies web app files
   - Configures Android permissions
   - Builds release APK
   - Uploads as GitHub release

### Manual Trigger
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Build Android APK" workflow
4. Click "Run workflow"
5. Download the APK from the release or artifacts

## Local Development Build

If you need to build locally (requires Android SDK setup):

```bash
# Navigate to the Cordova project
cd 4chantts-mobile

# Build for Android
JAVA_HOME=/path/to/java cordova build android

# The APK will be in:
# platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## APK Installation

### On Android Device
1. Download the APK from GitHub releases
2. Enable "Install from unknown sources" in Android settings:
   - Settings > Security > Unknown sources (Android 7 and below)
   - Settings > Apps > Special access > Install unknown apps (Android 8+)
3. Open the APK file to install

### Testing Checklist
- [ ] App launches successfully
- [ ] Board selection works
- [ ] Thread loading functions
- [ ] Text-to-speech playback works
- [ ] Audio continues in background
- [ ] Network requests succeed (4chan API)
- [ ] Mobile UI is responsive
- [ ] Back button behavior is correct
- [ ] App doesn't crash on rotation
- [ ] Audio controls work properly

## Features in APK

### Core Functionality
- ✅ 4chan board and thread browsing
- ✅ Text-to-speech with multiple voices
- ✅ Background audio playback
- ✅ Auto-progression through threads
- ✅ CORS proxy support for API access

### Mobile Optimizations
- ✅ Touch-friendly interface
- ✅ WebView performance optimizations
- ✅ Android back button handling
- ✅ Proper audio context management
- ✅ Mobile-specific UI adjustments

### Permissions
- `INTERNET` - For 4chan API access
- `ACCESS_NETWORK_STATE` - Network status checking
- `RECORD_AUDIO` - Speech synthesis
- `MODIFY_AUDIO_SETTINGS` - Audio control

## Troubleshooting

### Common Issues

**APK won't install**
- Ensure "Unknown sources" is enabled
- Check if you have enough storage space
- Try downloading the APK again

**App crashes on startup**
- Check Android version compatibility (minimum API 24/Android 7.0)
- Clear app data and restart

**No audio playback**
- Check device volume settings
- Ensure TTS engine is installed
- Try different voice selections

**Network errors**
- Check internet connection
- Try different CORS proxy options
- Verify 4chan API accessibility

### Debug Information
The app logs debug information to the console. To view logs:
```bash
# Connect device via USB and enable USB debugging
adb logcat | grep -i "4chan\|tts\|cordova"
```

## Development Notes

### File Structure
```
4chantts-mobile/
├── config.xml          # Cordova configuration
├── www/                # Web app files
│   ├── index.html
│   ├── script.js       # Main application logic
│   ├── styles.css      # Mobile-optimized styles
│   └── ...
└── platforms/android/  # Generated Android project
```

### Key Configuration
- **Package ID**: `com.chantts.app`
- **App Name**: "4chan TTS"
- **Target SDK**: Android API 35
- **Minimum SDK**: Android API 24

## Contributing

To contribute to the APK build process:
1. Test changes in the web version first
2. Update the GitHub Actions workflow if needed
3. Test the APK build process
4. Update this guide if necessary

## Support

For issues with the APK:
1. Check the troubleshooting section above
2. Review GitHub Actions build logs
3. Test the web version for comparison
4. Create an issue with device details and error logs