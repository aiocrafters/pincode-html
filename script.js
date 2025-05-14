// Global variables
let pincodeData = [];
let map;
let marker;
let currentPincode = null;

// DOM elements
const stateSelect = document.getElementById('state');
const districtSelect = document.getElementById('district');
const officeSelect = document.getElementById('office');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const mapDiv = document.getElementById('map');
const mapPlaceholder = document.getElementById('map-placeholder');
const nearbyDiv = document.getElementById('nearby');
const nearbyBody = document.getElementById('nearby-body');

// Initialize the application
async function init() {
    showLoading(true);
    try {
        // Load pincode data from JSON file
        const response = await fetch('pincodes.json');
        pincodeData = await response.json();
        
        // Populate states dropdown
        populateStates();
        
        // Check for URL parameters
        checkUrlParams();
    } catch (error) {
        showError('Failed to load pincode data. Please try again later.');
        console.error('Error loading data:', error);
    } finally {
        showLoading(false);
    }
    
    // Set up event listeners
    stateSelect.addEventListener('change', handleStateChange);
    districtSelect.addEventListener('change', handleDistrictChange);
    officeSelect.addEventListener('change', handleOfficeChange);
}

// Populate states dropdown
function populateStates() {
    const states = [...new Set(pincodeData.map(item => item.state))].sort();
    
    stateSelect.innerHTML = '<option value="">Select State</option>';
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
    });
}

// Handle state selection change
function handleStateChange() {
    const state = stateSelect.value;
    
    // Reset downstream selects
    districtSelect.innerHTML = '<option value="">Select District</option>';
    officeSelect.innerHTML = '<option value="">Select Office</option>';
    officeSelect.disabled = true;
    
    // Clear results
    clearResults();
    
    if (!state) {
        districtSelect.disabled = true;
        updateUrl();
        return;
    }
    
    districtSelect.disabled = false;
    
    // Populate districts for selected state
    const districts = [...new Set(
        pincodeData
            .filter(item => item.state === state)
            .map(item => item.district)
    )].sort();
    
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });
    
    updateUrl();
}

// Handle district selection change
function handleDistrictChange() {
    const state = stateSelect.value;
    const district = districtSelect.value;
    
    // Reset office select
    officeSelect.innerHTML = '<option value="">Select Office</option>';
    
    // Clear results
    clearResults();
    
    if (!district) {
        officeSelect.disabled = true;
        updateUrl();
        return;
    }
    
    officeSelect.disabled = false;
    
    // Populate offices for selected district
    const offices = pincodeData
        .filter(item => item.state === state && item.district === district)
        .sort((a, b) => a.office.localeCompare(b.office));
    
    offices.forEach(office => {
        const option = document.createElement('option');
        option.value = office.office;
        option.textContent = office.office;
        option.dataset.pincode = office.pincode;
        officeSelect.appendChild(option);
    });
    
    updateUrl();
}

// Handle office selection change
function handleOfficeChange() {
    const state = stateSelect.value;
    const district = districtSelect.value;
    const office = officeSelect.value;
    
    if (!office) {
        clearResults();
        updateUrl();
        return;
    }
    
    // Find the selected pincode record
    const selectedOption = officeSelect.options[officeSelect.selectedIndex];
    const pincode = selectedOption.dataset.pincode;
    
    const record = pincodeData.find(item => 
        item.state === state && 
        item.district === district && 
        item.office === office && 
        item.pincode === pincode
    );
    
    if (record) {
        displayResults(record);
        updateUrl();
        showNearbyPincodes(state, district, pincode);
    } else {
        clearResults();
    }
}

// Display pincode details
function displayResults(record) {
    currentPincode = record;
    
    // Format coordinates if available
    const lat = record.latitude ? parseFloat(record.latitude).toFixed(6) : 'N/A';
    const lng = record.longitude ? parseFloat(record.longitude).toFixed(6) : 'N/A';
    
    // Update page title
    document.title = `Pincode ${record.pincode} - ${record.office} | ${record.district}, ${record.state}`;
    
    // Create results HTML
    resultsDiv.innerHTML = `
        <div class="result-card">
            <h2>${record.office}</h2>
            <div class="result-row">
                <div class="result-col">
                    <div class="result-item">
                        <span class="result-label">Pincode:</span>
                        <span>${record.pincode || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">State:</span>
                        <span>${record.state || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">District:</span>
                        <span>${record.district || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Region:</span>
                        <span>${record.region || 'N/A'}</span>
                    </div>
                </div>
                <div class="result-col">
                    <div class="result-item">
                        <span class="result-label">Division:</span>
                        <span>${record.division || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Office Type:</span>
                        <span>${record.officeType || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Delivery:</span>
                        <span>${record.delivery || 'N/A'}</span>
                    </div>
                    <div class="result-item">
                        <span class="result-label">Coordinates:</span>
                        <span>${lat}, ${lng}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Show map if coordinates are available
    if (record.latitude && record.longitude) {
        showMap(record.latitude, record.longitude, record.office);
    } else {
        hideMap();
    }
}

// Show loading indicator
function showLoading(show) {
    loadingDiv.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    resultsDiv.innerHTML = `<div class="error">${message}</div>`;
}

// Clear results
function clearResults() {
    resultsDiv.innerHTML = '';
    nearbyDiv.style.display = 'none';
    hideMap();
    currentPincode = null;
    document.title = 'India Pincode Search';
}

// Initialize or update map
function showMap(lat, lng, title) {
    mapPlaceholder.style.display = 'none';
    mapDiv.style.display = 'block';
    
    if (!map) {
        map = L.map('map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    } else {
        map.setView([lat, lng], 15);
    }
    
    if (marker) {
        map.removeLayer(marker);
    }
    
    marker = L.marker([lat, lng]).addTo(map)
        .bindPopup(title)
        .openPopup();
}

// Hide map
function hideMap() {
    mapDiv.style.display = 'none';
    mapPlaceholder.style.display = 'flex';
    
    if (map) {
        map.off();
        map.remove();
        map = null;
    }
}

// Show nearby pincodes in the same district
function showNearbyPincodes(state, district, currentPincode) {
    const nearby = pincodeData
        .filter(item => 
            item.state === state && 
            item.district === district && 
            item.pincode !== currentPincode
        )
        .sort((a, b) => a.office.localeCompare(b.office));
    
    if (nearby.length === 0) {
        nearbyDiv.style.display = 'none';
        return;
    }
    
    nearbyBody.innerHTML = '';
    nearby.forEach(office => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="#" data-state="${encodeURIComponent(office.state)}" 
                   data-district="${encodeURIComponent(office.district)}" 
                   data-office="${encodeURIComponent(office.office)}"
                   data-pincode="${office.pincode}">${office.office}</a></td>
            <td>${office.pincode}</td>
            <td>${office.officeType || 'N/A'}</td>
        `;
        nearbyBody.appendChild(row);
    });
    
    // Add click handlers to nearby pincode links
    document.querySelectorAll('#nearby-body a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const state = decodeURIComponent(this.dataset.state);
            const district = decodeURIComponent(this.dataset.district);
            const office = decodeURIComponent(this.dataset.office);
            const pincode = this.dataset.pincode;
            
            // Set the dropdowns to these values
            stateSelect.value = state;
            handleStateChange();
            
            // Wait for districts to populate
            setTimeout(() => {
                districtSelect.value = district;
                handleDistrictChange();
                
                // Wait for offices to populate
                setTimeout(() => {
                    const officeOption = [...officeSelect.options].find(opt => 
                        opt.value === office && opt.dataset.pincode === pincode
                    );
                    
                    if (officeOption) {
                        officeSelect.value = office;
                        handleOfficeChange();
                    }
                }, 100);
            }, 100);
        });
    });
    
    nearbyDiv.style.display = 'block';
}

// Update URL with current state
function updateUrl() {
    const state = stateSelect.value;
    const district = districtSelect.value;
    const office = officeSelect.value;
    const pincode = officeSelect.options[officeSelect.selectedIndex]?.dataset.pincode;
    
    let url = window.location.pathname;
    let params = new URLSearchParams();
    
    if (state) params.set('state', state);
    if (district) params.set('district', district);
    if (office && pincode) {
        params.set('office', office);
        params.set('pincode', pincode);
    }
    
    const queryString = params.toString();
    if (queryString) {
        url += '?' + queryString;
    }
    
    window.history.pushState({}, '', url);
}

// Check for URL parameters on page load
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const state = params.get('state');
    const district = params.get('district');
    const office = params.get('office');
    const pincode = params.get('pincode');
    
    if (state) {
        stateSelect.value = state;
        handleStateChange();
        
        if (district) {
            // Wait for districts to populate
            setTimeout(() => {
                districtSelect.value = district;
                handleDistrictChange();
                
                if (office && pincode) {
                    // Wait for offices to populate
                    setTimeout(() => {
                        const officeOption = [...officeSelect.options].find(opt => 
                            opt.value === office && opt.dataset.pincode === pincode
                        );
                        
                        if (officeOption) {
                            officeSelect.value = office;
                            handleOfficeChange();
                        }
                    }, 100);
                }
            }, 100);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);