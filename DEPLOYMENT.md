# 4chan TTS Reader - GitHub Deployment Guide

## Quick Setup for GitHub Pages Hosting

### Step 1: Create GitHub Repository
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it `4chantts` (or any name you prefer)
5. Make it **Public** (required for free GitHub Pages)
6. **DO NOT** initialize with README, .gitignore, or license
7. Click "Create repository"

### Step 2: Push Your Code
Run these commands in your terminal (from the 4chantts folder):

```bash
# Add your GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/4chantts.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Click "Save"

### Step 4: Access Your App
After 2-5 minutes, your app will be available at:
`https://YOUR_USERNAME.github.io/4chantts`

## Features Ready for Mobile

✅ **Mobile Optimized UI**
- Touch-friendly controls
- Responsive design
- Large tap targets

✅ **Background Audio Support**
- Service worker for background playback
- Wake lock to prevent screen sleep
- Mobile browser compatibility

✅ **Enhanced TTS System**
- Puter.js cloud TTS with fallback
- Rate limiting and error handling
- Auto-disable protection

✅ **4chan Integration**
- Real-time thread loading
- Post navigation
- Auto-play functionality

## Troubleshooting

### If GitHub Pages doesn't work:
1. Check repository is public
2. Ensure `index.html` is in root folder
3. Wait 5-10 minutes for deployment
4. Check GitHub Pages settings

### For mobile issues:
- Enable autoplay in browser settings
- Allow notifications for background audio
- Use Chrome/Safari for best compatibility

## Alternative Hosting Options

If GitHub Pages doesn't work, you can also deploy to:
- **Netlify**: Drag and drop your folder to netlify.com/drop
- **Vercel**: Import from GitHub at vercel.com
- **Surge.sh**: Run `npx surge` in your project folder

All files are ready for deployment - no build process required!