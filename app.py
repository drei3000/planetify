import os
import requests
from flask import Flask, request, jsonify, send_from_directory, render_template_string, redirect
from dotenv import load_dotenv
from flask_cors import CORS
import spotipy

load_dotenv()

app = Flask(__name__)
CORS(app)

SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
SPOTIFY_REDIRECT_URI = os.getenv('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:8888/')

# Get the port from environment variable or default to 5000
PORT = int(os.environ.get('PORT', 5000))

@app.route('/')
def index():
    # Serve the main index.html file
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "index.html not found", 404

@app.route('/universe')
def universe():
    # Serve the universe.html file
    try:
        with open('universe.html', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "universe.html not found", 404

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/<path:filename>')
def serve_js_files(filename):
    # Serve JavaScript files from the root directory
    if filename.endswith('.js'):
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                response = app.response_class(
                    response=f.read(),
                    status=200,
                    mimetype='application/javascript'
                )
                return response
        except FileNotFoundError:
            return f"{filename} not found", 404
    # For other files, return 404
    return "Not found", 404



@app.route('/callback')
def callback():
    try:
        code = request.args.get('code') # Get the authorization code from the request
        print(f"Callback received with code: {code[:10]}..." if code else "No code received")
        
        # Check if this is a fetch request by looking for specific fetch headers
        is_fetch_request = (
            'application/json' in request.headers.get('Accept', '') or
            request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
            'fetch' in request.headers.get('Sec-Fetch-Mode', '').lower() or
            request.args.get('fetch') == 'true'  # Add explicit parameter
        )
        
        print(f"Is fetch request: {is_fetch_request}")
        
        # If this is a browser redirect from Spotify (not a fetch request), redirect to main page with code
        if not is_fetch_request:
            return redirect(f'/?code={code}')
        
        # Use dynamic redirect URI to match what JavaScript sent
        # Force HTTPS for Railway production
        url_root = request.url_root
        if 'railway.app' in request.host or 'herokuapp.com' in request.host:
            url_root = url_root.replace('http://', 'https://')
        
        dynamic_redirect_uri = url_root.rstrip('/') + '/callback'
        print(f"Dynamic redirect URI: {dynamic_redirect_uri}")
        
        if not code:
            print("Error: No code provided")
            return jsonify({'error': 'No code provided'}), 400

        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            print("Error: Missing Spotify credentials")
            return jsonify({'error': 'Server configuration error'}), 500

        token_url = 'https://accounts.spotify.com/api/token'

        # payload to exchange the authorization code for an access token
        payload = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': dynamic_redirect_uri,  # Use dynamic URI instead of env variable
            'client_id': SPOTIFY_CLIENT_ID,
            'client_secret': SPOTIFY_CLIENT_SECRET
        }

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
     
        print("Making token exchange request to Spotify...")
        response = requests.post(token_url, data=payload, headers=headers, timeout=10) # Make the POST request to get the token
        
        print(f"Token response status: {response.status_code}")
        
        if response.status_code != 200:
            error_details = response.text
            try:
                error_json = response.json()
                error_details = error_json
            except:
                pass
            print(f"Token exchange failed: {error_details}")
            return jsonify({'error': 'Failed to get token', 'details': error_details}), 400

        token_data = response.json()
        print("Token exchange successful")
        return jsonify(token_data) # Return the token response as JSON
        
    except Exception as e:
        print(f"Callback error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500


def create_spotify_client():
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise Exception("Authorization header with Bearer token is required")
        
        token = auth_header.split(' ', 1)[1]
        print(f"Creating Spotify client with token: {token[:10]}...")
        return spotipy.Spotify(auth=token)
    except Exception as e:
        print(f"Error creating Spotify client: {str(e)}")
        raise

# Get scrobble count from Last.fm API
def get_last_fm_scrobble_count(artist_name):
    last_fm_api_key = os.getenv('LAST_FM_API_KEY')
    if not last_fm_api_key:
        return 0

    url = f"http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist={artist_name}&api_key={last_fm_api_key}&format=json"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        playcount = data.get('artist', {}).get('stats', {}).get('playcount', 0)
        # Convert to integer to ensure proper numeric sorting
        return int(playcount) if playcount else 0
    return 0

# Download and save image locally
def download_image(image_url, artist_name):
    if not image_url:
        return None
    
    try:
        # Create a safe filename from artist name
        safe_filename = "".join(c for c in artist_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_filename = safe_filename.replace(' ', '_')
        filename = f"{safe_filename}.jpg"
        
        # Ensure the images directory exists
        images_dir = os.path.join('static', 'images')
        os.makedirs(images_dir, exist_ok=True)
        
        filepath = os.path.join(images_dir, filename)
        
        # Download the image
        response = requests.get(image_url, timeout=10)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            return f"static/images/{filename}"  # Return relative path for web use
        
    except Exception as e:
        print(f"Failed to download image for {artist_name}: {e}")
    
    return None

 
# Get info from spotify API
def get_current_user_artists():
    try:
        sp = create_spotify_client()
        print("Fetching user's top artists from Spotify...")
        result = sp.current_user_top_artists(limit=50, time_range='long_term')
        
        # Get artists and scrobble counts 
        artist_stats = []
        for artist in result['items']:
            try:
                # Get the largest image URL (first one is usually the largest)
                image_url = artist['images'][0]['url'] if artist['images'] else None
                local_image_path = download_image(image_url, artist['name'])

                scrobble_count = get_last_fm_scrobble_count(artist['name'])
                
                artist_stats.append({
                    'name': artist['name'],
                    'scrobble_count': scrobble_count,
                    'local_image_path': local_image_path
                })
                
                print(f"Processed artist: {artist['name']} - {scrobble_count} scrobbles")
                
            except Exception as e:
                print(f"Error processing artist {artist.get('name', 'unknown')}: {str(e)}")
                # Continue with other artists even if one fails
                continue
        
        print(f"Successfully processed {len(artist_stats)} artists")
        return sorted(artist_stats, key=lambda x: x['scrobble_count'], reverse=True)
        
    except Exception as e:
        print(f"Error in get_current_user_artists: {str(e)}")
        raise

@app.route('/get_data')
def get_data():
    try:
        artists_data = get_current_user_artists()
        return jsonify({
            'current_user_artists': artists_data
        })
    except Exception as e:
        print(f"Error in get_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/spotify_config')
def spotify_config():
    """Provide Spotify configuration to the frontend"""
    try:
        # Determine the correct base URL and ensure HTTPS for production
        base_url = request.url_root
        if 'railway.app' in request.host or 'herokuapp.com' in request.host:
            base_url = base_url.replace('http://', 'https://')
        
        redirect_uri = base_url.rstrip('/') + '/callback'
        
        if not SPOTIFY_CLIENT_ID:
            print("Error: SPOTIFY_CLIENT_ID not configured")
            return jsonify({'error': 'Server configuration error'}), 500
        
        config = {
            'client_id': SPOTIFY_CLIENT_ID,
            'redirect_uri': redirect_uri
        }
        
        print(f"Providing Spotify config: client_id={SPOTIFY_CLIENT_ID[:10]}..., redirect_uri={redirect_uri}")
        return jsonify(config)
        
    except Exception as e:
        print(f"Spotify config error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/health')
def health_check():
    """Health check endpoint to verify server configuration"""
    try:
        config_status = {
            'spotify_client_id_set': bool(SPOTIFY_CLIENT_ID),
            'spotify_client_secret_set': bool(SPOTIFY_CLIENT_SECRET),
            'lastfm_api_key_set': bool(os.getenv('LAST_FM_API_KEY')),
            'server_host': request.host,
            'server_url_root': request.url_root,
            'is_https': request.is_secure,
            'user_agent': request.headers.get('User-Agent', 'Unknown')
        }
        
        return jsonify({
            'status': 'healthy',
            'config': config_status,
            'timestamp': request.environ.get('REQUEST_TIME', 'unknown')
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)


 