import os
import requests
from flask import Flask, request, jsonify, send_from_directory, render_template_string
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
    with open('index.html', 'r') as f:
        return f.read()

@app.route('/universe')
def universe():
    # Serve the universe.html file
    with open('universe.html', 'r') as f:
        return f.read()

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/<path:filename>')
def serve_js_files(filename):
    # Serve JavaScript files from the root directory
    if filename.endswith('.js'):
        with open(filename, 'r') as f:
            response = app.response_class(
                response=f.read(),
                status=200,
                mimetype='application/javascript'
            )
            return response
    # For other files, return 404
    return "Not found", 404


@app.route('/debug')
def debug():
    return jsonify({
        'base_url': request.base_url,
        'url_root': request.url_root,
        'host_url': request.host_url,
        'SPOTIFY_REDIRECT_URI': SPOTIFY_REDIRECT_URI,
        'expected_callback': request.url_root.rstrip('/') + '/callback'
    })

@app.route('/callback')
def callback():
    code = request.args.get('code') # Get the authorization code from the request
    print(f"Received callback with code: {code[:20] if code else 'None'}...")  # Log first 20 chars of code
    print(f"SPOTIFY_REDIRECT_URI environment variable: {SPOTIFY_REDIRECT_URI}")
    print(f"Request URL: {request.url}")
    print(f"Request base URL: {request.base_url}")
    
    if not code:
        print("Error: No code provided")
        return jsonify({'error': 'No code provided'}), 400

    token_url = 'https://accounts.spotify.com/api/token'

    # payload to exchange the authorization code for an access token
    payload = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': SPOTIFY_REDIRECT_URI,
        'client_id': SPOTIFY_CLIENT_ID,
        'client_secret': SPOTIFY_CLIENT_SECRET
    }
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    
    print(f"Making request to Spotify with redirect_uri: {SPOTIFY_REDIRECT_URI}")
    print(f"Payload redirect_uri: {payload['redirect_uri']}")
    response = requests.post(token_url, data=payload, headers=headers) # Make the POST request to get the token
    
    print(f"Spotify response status: {response.status_code}")
    print(f"Spotify response: {response.text}")

    if response.status_code != 200:
        return jsonify({'error': 'Failed to get token', 'details': response.json()}), 400

    return jsonify(response.json()) # Return the token response as JSON


def create_spotify_client():
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise Exception("Authorization header with Bearer token is required")
    
    token = auth_header.split(' ', 1)[1]
    return spotipy.Spotify(auth=token)


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
    sp = create_spotify_client()
    result = sp.current_user_top_artists(limit=50, time_range='long_term')
    
    # Get artists and scrobble counts 
    artist_stats = []
    for artist in result['items']:
        # Get the largest image URL (first one is usually the largest)
        image_url = artist['images'][0]['url'] if artist['images'] else None
        local_image_path = download_image(image_url, artist['name'])

        artist_stats.append({
            'name': artist['name'],
            'scrobble_count': get_last_fm_scrobble_count(artist['name']),
            'local_image_path': local_image_path
        })
    

    
    return sorted(artist_stats, key=lambda x: x['scrobble_count'],)

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

    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=False)


 