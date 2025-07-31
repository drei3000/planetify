const selectedPlanetDiameter = 350;  
let planetIndex = 0;  
 
let artists = [];

function renderUniverse(data) {
    console.log('Rendering universe with data:', data);
    
    artists = data.current_user_artists || [];
    
    if (artists.length === 0) {
        console.log('No artists data found');
        hideLoadingVisualizer();
        return;
    }
    
    // Create planets for each artist
    artists.forEach((artist, index) => {
        createPlanet(artist, index, artists.length, document.body);
    });

    zoomToPlanet(planetIndex); // Zoom to the first planet by default
    
    // Hide loading visualizer after everything is rendered
    setTimeout(() => {
        hideLoadingVisualizer();
    }, 800); // Give a moment to see the completed universe
}

// Function to show loading visualizer
function showLoadingVisualizer() {
    // Remove existing loader if any
    const existingLoader = document.getElementById('universe-loader');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    // Create loading container
    const loader = document.createElement('div');
    loader.id = 'universe-loader';
    loader.className = 'universe-loader';
    
    // Create spinning planet
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    // Create loading text
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Creating Universe...';
    
    loader.appendChild(spinner);
    loader.appendChild(loadingText);
    document.body.appendChild(loader);
}

// Function to hide loading visualizer
function hideLoadingVisualizer() {
    const loader = document.getElementById('universe-loader');
    if (loader) {
        loader.style.transition = 'opacity 0.5s ease-out';
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.remove();
        }, 500);
    }
}

function zoomToPlanet(index) {
    // Validate index
    if (index < 0 || index >= artists.length) {
        console.log('Invalid planet index:', index);
        return;
    }
    
    // Update current planet index
    planetIndex = index;
    
    // Apply smooth transition and dynamic sizing to all planets
    const allPlanets = document.querySelectorAll('.planet');
    allPlanets.forEach((planet, i) => {
        planet.style.transition = 'all 1s ease-in-out';
        
        // Calculate new size based on selection
        let newDiameter;
        if (i === index) {
            newDiameter = selectedPlanetDiameter;
        } else {
            // Other planets scale relative to the selected planet
            let multiplier = artists[i].scrobble_count / artists[index].scrobble_count;
            newDiameter = selectedPlanetDiameter * multiplier;
        }
        
        // Apply new size
        planet.style.width = `${newDiameter}px`;
        planet.style.height = `${newDiameter}px`;
        // Ensure background image scales with planet
        planet.style.backgroundSize = 'cover';
        
        // Update the label position
        const label = planet.querySelector('div');
        if (label) {
            label.style.top = `${newDiameter + 10}px`;
        }
        
        // Set z-index for selected planet
        if (i === index) {
            planet.style.zIndex = '10';
        } else {
            planet.style.zIndex = '1';
        }
    });
    
    // Recalculate positions after size changes
    setTimeout(() => {
        repositionPlanets();
    }, 100);
    
    // Update or create the artist info label at the top
    updateArtistLabel(artists[index]);
    
    console.log(`Zoomed to planet ${index}: ${artists[index].name}`);
}

// Function to update or create the artist info label
function updateArtistLabel(artist) {
    // Remove existing label if any
    const existingLabel = document.getElementById('artist-info-label');
    if (existingLabel) {
        existingLabel.remove();
    }
    
    // Create new label
    const label = document.createElement('div');
    label.id = 'artist-info-label';
    label.className = 'artist-info-label';
    label.textContent = `${artist.name} : ${artist.scrobble_count.toLocaleString()} total Last.fm scrobbles`;
    
    document.body.appendChild(label);
}

// Function to reposition planets after size changes
function repositionPlanets() {
    const gapBetweenPlanets = 50;
    const baselineY = window.innerHeight - 100;
    const startX = 100;
    
    const allPlanets = document.querySelectorAll('.planet');
    
    // Calculate new positions
    let x = startX;
    allPlanets.forEach((planet, i) => {
        const currentWidth = parseFloat(planet.style.width);
        const y = baselineY - currentWidth;
        
        planet.style.left = `${x}px`;
        planet.style.top = `${y}px`;
        
        x += currentWidth + gapBetweenPlanets;
    });
    
    // Center the selected planet in viewport
    const selectedPlanet = allPlanets[planetIndex];
    if (selectedPlanet) {
        const planetLeft = parseFloat(selectedPlanet.style.left);
        const planetWidth = parseFloat(selectedPlanet.style.width);
        const planetCenterX = planetLeft + planetWidth / 2;
        const planetTop = parseFloat(selectedPlanet.style.top);
        const planetCenterY = planetTop + planetWidth / 2;
        
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        
        const offsetX = viewportCenterX - planetCenterX;
        const offsetY = viewportCenterY - planetCenterY;
        
        // Apply centering transform to all planets
        allPlanets.forEach(planet => {
            planet.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    }
}

    
// Function to create a planet for each artist
function createPlanet(artist, index, totalArtists, container) {
    
    const planet = document.createElement('div');
    planet.className = 'planet';
    planet.title = `${artist.name} - ${artist.scrobble_count} plays`;
    
    let diameter;

    if (index == 0) {
        diameter = selectedPlanetDiameter;
    } else {
        let multiplier = artists[index].scrobble_count / artists[0].scrobble_count;
        diameter = selectedPlanetDiameter * multiplier;
    }

    // Calculate position with fixed gap between planet edges
    const gapBetweenPlanets = 50;  
    const baselineY = window.innerHeight - 100;  
    const startX = 100;  
    
    // Calculate x position by accumulating previous planet widths and gaps
    let x = startX;
    for (let i = 0; i < index; i++) {
        let prevDiameter;
        if (i == 0) {
            prevDiameter = selectedPlanetDiameter;
        } else {
            let prevMultiplier = artists[i].scrobble_count / artists[0].scrobble_count;
            prevDiameter = selectedPlanetDiameter * prevMultiplier;
        }
        x += prevDiameter + gapBetweenPlanets;
    }
    
    const y = baselineY - diameter; // Position so bottom touches baseline
    
    // Set size and position using style (these are dynamic values)
    planet.style.width = `${diameter}px`;
    planet.style.height = `${diameter}px`;
    planet.style.left = `${x}px`;
    planet.style.top = `${y}px`;
    
    // Set background image if available
    if (artist.local_image_path) {
        planet.style.backgroundImage = `url('${artist.local_image_path}')`;
        planet.style.backgroundSize = 'cover';
        planet.style.backgroundPosition = 'center';
    }
    
    // Add click handler
    planet.addEventListener('click', () => {
        comparePlanets(artist);
    });
    
  
    container.appendChild(planet);
}

// Function to show planet comparison modal
function comparePlanets(selectedArtist) {
    // Remove existing modal if any
    const existingModal = document.getElementById('comparison-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'comparison-modal';
    modal.className = 'blank-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'blank-modal-content';
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Planet Comparison';
    title.className = 'comparison-title';
    modalContent.appendChild(title);
    
    // Create comparison container
    const comparisonContainer = document.createElement('div');
    comparisonContainer.className = 'comparison-container';
    
    // Get the first artist that's different from the selected artist for initial comparison
    let comparisonArtist = artists.find(artist => artist.name !== selectedArtist.name) || artists[0];
    
    // Determine which planet should be bigger and calculate scaling
    const baseDiameter = 400;
    let leftDiameter, rightDiameter;
    let leftIsBigger, rightIsBigger;
    
    if (selectedArtist.scrobble_count >= comparisonArtist.scrobble_count) {
        // Left planet (clicked) is bigger
        leftDiameter = baseDiameter;
        rightDiameter = baseDiameter * (comparisonArtist.scrobble_count / selectedArtist.scrobble_count);
        leftIsBigger = true;
        rightIsBigger = false;
    } else {
        // Right planet (comparison) is bigger
        rightDiameter = baseDiameter;
        leftDiameter = baseDiameter * (selectedArtist.scrobble_count / comparisonArtist.scrobble_count);
        leftIsBigger = false;
        rightIsBigger = true;
    }
    
    // Create planets for comparison
    const leftPlanetContainer = createComparisonPlanet(selectedArtist, leftDiameter, leftIsBigger, 'Clicked Artist');
    const rightPlanetContainer = createComparisonPlanet(comparisonArtist, rightDiameter, rightIsBigger, 'Comparison Artist');
    
    comparisonContainer.appendChild(leftPlanetContainer);
    comparisonContainer.appendChild(rightPlanetContainer);
    modalContent.appendChild(comparisonContainer);
    
    // Add artist selection dropdown
    const selectionContainer = document.createElement('div');
    selectionContainer.className = 'selection-container';
    
    const label = document.createElement('label');
    label.textContent = 'Compare with: ';
    label.className = 'selection-label';
    
    const dropdown = document.createElement('select');
    dropdown.className = 'artist-dropdown';
    
    // Populate dropdown with all artists
    artists.forEach((artist, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = artist.name;
        option.className = 'artist-option';
        // Select the initial comparison artist
        if (artist.name === comparisonArtist.name) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
    
    // Add change handler for dropdown - updates the right planet
    dropdown.addEventListener('change', (e) => {
        const newComparisonArtist = artists[e.target.value];
        
        // Recalculate scaling for the new comparison
        let newLeftDiameter, newRightDiameter;
        let newLeftIsBigger, newRightIsBigger;
        
        if (selectedArtist.scrobble_count >= newComparisonArtist.scrobble_count) {
            // Left planet (clicked) is bigger
            newLeftDiameter = baseDiameter;
            newRightDiameter = baseDiameter * (newComparisonArtist.scrobble_count / selectedArtist.scrobble_count);
            newLeftIsBigger = true;
            newRightIsBigger = false;
        } else {
            // Right planet (comparison) is bigger
            newRightDiameter = baseDiameter;
            newLeftDiameter = baseDiameter * (selectedArtist.scrobble_count / newComparisonArtist.scrobble_count);
            newLeftIsBigger = false;
            newRightIsBigger = true;
        }
        
        // Update both planet containers to reflect new scaling
        const leftContainer = comparisonContainer.children[0];
        const rightContainer = comparisonContainer.children[1];
        
        const newLeftContainer = createComparisonPlanet(selectedArtist, newLeftDiameter, newLeftIsBigger, 'Clicked Artist');
        const newRightContainer = createComparisonPlanet(newComparisonArtist, newRightDiameter, newRightIsBigger, 'Comparison Artist');
        
        comparisonContainer.replaceChild(newLeftContainer, leftContainer);
        comparisonContainer.replaceChild(newRightContainer, rightContainer);
    });
    
    selectionContainer.appendChild(label);
    selectionContainer.appendChild(dropdown);
    modalContent.appendChild(selectionContainer);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close-btn';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => modal.remove();
    
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Helper function to create comparison planets
function createComparisonPlanet(artist, diameter, isBigger, role) {
    const container = document.createElement('div');
    container.className = `planet-comparison-container ${isBigger ? 'bigger' : 'smaller'}`;
    
    const planet = document.createElement('div');
    planet.className = 'comparison-planet';
    planet.style.width = `${diameter}px`;
    planet.style.height = `${diameter}px`;
    
    // Set background image if available
    if (artist.local_image_path) {
        planet.style.backgroundImage = `url('${artist.local_image_path}')`;
    } else {
        planet.style.background = '#667eea';
    }
    
    // Artist name
    const name = document.createElement('h3');
    name.textContent = artist.name;
    name.className = 'artist-name';
    
    // Scrobble count
    const scrobbles = document.createElement('p');
    scrobbles.textContent = `${artist.scrobble_count.toLocaleString()} plays`;
    scrobbles.className = 'artist-scrobbles';
    
    // Size indicator
    const sizeText = document.createElement('p');
    sizeText.textContent = isBigger ? '(Reference Size)' : `(${Math.round((diameter/400) * 100)}% of reference)`;
    sizeText.className = 'size-indicator';
    
    container.appendChild(planet);
    container.appendChild(name);
    container.appendChild(scrobbles);
    container.appendChild(sizeText);
    
    return container;
}

 
// Initialize the universe once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Universe.js loaded and ready');
  

    // Add keyboard navigation for planets
    document.addEventListener('keydown', (e) => {
        if (artists.length === 0) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (planetIndex > 0) {
                    zoomToPlanet(planetIndex - 1);
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (planetIndex < artists.length - 1) {
                    zoomToPlanet(planetIndex + 1);
                }
                break;
            case 'Home':
                e.preventDefault();
                zoomToPlanet(0);
                break;
            case 'End':
                e.preventDefault();
                zoomToPlanet(artists.length - 1);
                break;
        }
    });
});
