# 4chan TTS - Mobile-Optimized Text-to-Speech Reader

A mobile-friendly web application that reads 4chan threads aloud with automatic thread progression and background playback support.

## Features

- **High-Quality Text-to-Speech**: 
  - Browser TTS (built-in, works offline)
  - Puter.js Neural TTS (free, no signup required)
- **Thread Navigation**: Browse and read multiple threads
- **Voice Selection**: Choose from available system voices and neural engines
- **Speed Control**: Adjust reading speed (0.5x to 2x)
- **Auto-play**: Automatically continues to next thread when current one ends
- **Mobile Optimized**: Works great on mobile devices with background playbook
- **Wake Lock**: Prevents screen from sleeping during playback (mobile)
- **Service Worker**: Enables background audio on mobile browsers

## Text-to-Speech Options

### Browser TTS (Default)
- **Pros**: Works offline, no setup required, instant availability
- **Cons**: Limited voice quality, robotic sound
- **Best for**: Quick testing, offline use, privacy-conscious users

### Puter.js Neural TTS (Recommended)
- **Pros**: High-quality neural voices, completely free, no signup required, natural speech patterns
- **Cons**: Requires internet connection
- **Setup**: Simply toggle the checkbox - no API keys or registration needed!
- **Voice Engines**:
  - **Standard**: Basic quality, faster processing
  - **Neural**: High-quality natural voices (recommended)
  - **Generative**: Advanced AI-generated speech
- **Cost**: Completely free with no limits or credit card required

## Mobile Features

- **Background Playback**: Continues reading even when browser is in background
- **Wake Lock**: Prevents screen from sleeping during playback
- **Touch-Optimized UI**: Large touch targets and mobile-responsive design
- **Service Worker**: Enables offline functionality and background sync
- **Auto-Thread Progression**: Automatically moves to next thread when current one ends

## Free Hosting Options

### 1. GitHub Pages (Recommended)
1. Create a GitHub repository
2. Upload all files to the repository
3. Go to Settings > Pages
4. Select "Deploy from a branch" and choose "main"
5. Your app will be available at `https://yourusername.github.io/repositoryname`

### 2. Netlify
1. Sign up at netlify.com
2. Drag and drop your project folder to Netlify
3. Get instant deployment with custom domain options

### 3. Vercel
1. Sign up at vercel.com
2. Import your GitHub repository or upload files
3. Automatic deployments on every update

### 4. Firebase Hosting
1. Sign up for Firebase
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Run `firebase init hosting` in your project folder
4. Deploy with `firebase deploy`

## Mobile Usage Tips

- **For driving**: Enable "Do Not Disturb" mode to prevent interruptions
- **Background listening**: Keep the browser tab active for best performance
- **Battery optimization**: Disable battery optimization for your browser app
- **Notifications**: Allow notifications for background operation alerts

## Browser Compatibility

- **iOS Safari**: Full support with wake lock and background audio
- **Android Chrome**: Full support with service worker capabilities
- **Firefox Mobile**: Basic support (limited background features)

## Setup

1. Upload all files to your chosen hosting platform
2. Access the URL in your mobile browser
3. Allow notifications and wake lock permissions when prompted
4. Add to home screen for app-like experience

## Files

- `index.html` - Main application interface
- `script.js` - Core functionality with mobile optimizations
- `styles.css` - Mobile-responsive styling
- `sw.js` - Service worker for background operation
- `beep.mp3` - Audio notification for thread transitions

Enjoy hands-free 4chan browsing while driving safely!