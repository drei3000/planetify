# Planetify - Music Universe Visualization

A web application that visualizes your Spotify listening history as planets in a universe, sized by Last.fm scrobble counts.

## Features
- Spotify authentication
- Planetary visualization of top artists
- Interactive planet comparison
- Responsive design with smooth animations

## Deployment
This app is configured for deployment on Railway 

## Environment Variables Required
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET` 
- `SPOTIFY_REDIRECT_URI`
- `LAST_FM_API_KEY`

## Local Development
1. Install dependencies: `pip install -r requirements.txt`
2. Set up environment variables in `.env` file
3. Run: `python app.py`

Visit planetify here: https://web-production-b9d6.up.railway.app
