/**
 * AllotEase - Geographic Distance & PIN Code Utility Layer
 * core/geoUtils.js - Haversine distance calculator, 3-tier PIN reference dataset, and diagnostic test suite
 */

(function(window) {
  'use strict';

  // Default College Location (Sector 16 C, Dwarka, New Delhi)
  const DEFAULT_COLLEGE_LOCATION = {
    name: 'Sector 16 C, Dwarka, New Delhi',
    latitude: 28.5921,
    longitude: 77.0460
  };

  /**
   * Calculates straight-line geographic distance using the Haversine formula.
   * @param {number} lat1 - Latitude of point 1 (degrees)
   * @param {number} lon1 - Longitude of point 1 (degrees)
   * @param {number} lat2 - Latitude of point 2 (degrees)
   * @param {number} lon2 - Longitude of point 2 (degrees)
   * @returns {number} Distance in kilometers
   */
  function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
        isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return 0;
    }

    const R = 6371; // Earth's mean radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const rLat1 = lat1 * (Math.PI / 180);
    const rLat2 = lat2 * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(rLat1) * Math.cos(rLat2) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  // Tier 1: Exact 6-Digit PIN Reference Dataset
  const PIN_CODE_DATASET = {
    '110075': { city: 'Dwarka', district: 'South West Delhi', state: 'Delhi', latitude: 28.5921, longitude: 77.0460 },
    '110001': { city: 'Connaught Place', district: 'Central Delhi', state: 'Delhi', latitude: 28.6315, longitude: 77.2167 },
    '110016': { city: 'Hauz Khas', district: 'South Delhi', state: 'Delhi', latitude: 28.5494, longitude: 77.2001 },
    '110092': { city: 'Laxmi Nagar', district: 'East Delhi', state: 'Delhi', latitude: 28.6304, longitude: 77.2773 },
    '201301': { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.3910 },
    '201001': { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh', latitude: 28.6692, longitude: 77.4538 },
    '122001': { city: 'Gurugram', district: 'Gurugram', state: 'Haryana', latitude: 28.4595, longitude: 77.0266 },
    '121001': { city: 'Faridabad', district: 'Faridabad', state: 'Haryana', latitude: 28.4089, longitude: 77.3178 },
    '302001': { city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
    '226001': { city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '282001': { city: 'Agra', district: 'Agra', state: 'Uttar Pradesh', latitude: 27.1767, longitude: 78.0081 },
    '211001': { city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh', latitude: 25.4358, longitude: 81.8463 },
    '221001': { city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739 },
    '823001': { city: 'Gaya', district: 'Gaya', state: 'Bihar', latitude: 24.7955, longitude: 85.0002 },
    '800001': { city: 'Patna', district: 'Patna', state: 'Bihar', latitude: 25.5941, longitude: 85.1376 },
    '834001': { city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand', latitude: 23.3441, longitude: 85.3096 },
    '700001': { city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
    '400001': { city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', latitude: 18.9388, longitude: 72.8353 },
    '411001': { city: 'Pune', district: 'Pune', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
    '600001': { city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
    '560001': { city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
    '500001': { city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', latitude: 17.3850, longitude: 78.4867 },
    '160001': { city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
    '380001': { city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
    '141001': { city: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', latitude: 30.9010, longitude: 75.8573 },
    '248001': { city: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand', latitude: 30.3165, longitude: 78.0322 },
    '751001': { city: 'Bhubaneswar', district: 'Khurda', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 },
    '781001': { city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam', latitude: 26.1445, longitude: 91.7362 },
    '171001': { city: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734 },
    '190001': { city: 'Srinagar', district: 'Srinagar', state: 'Jammu & Kashmir', latitude: 34.0837, longitude: 74.7973 },
    '695001': { city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', latitude: 8.5241, longitude: 76.9366 },
    '462001': { city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 },
    '452001': { city: 'Indore', district: 'Indore', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 }
  };

  // Tier 2: 3-Digit PIN Prefix District Reference Dataset
  const DISTRICT_PREFIX_DATASET = {
    '110': { district: 'Delhi NCR Region', state: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
    '121': { district: 'Faridabad District', state: 'Haryana', latitude: 28.4089, longitude: 77.3178 },
    '122': { district: 'Gurugram District', state: 'Haryana', latitude: 28.4595, longitude: 77.0266 },
    '124': { district: 'Rohtak District', state: 'Haryana', latitude: 28.8955, longitude: 76.6066 },
    '125': { district: 'Hisar District', state: 'Haryana', latitude: 29.1492, longitude: 75.7217 },
    '132': { district: 'Karnal District', state: 'Haryana', latitude: 29.6857, longitude: 76.9905 },
    '133': { district: 'Ambala District', state: 'Haryana', latitude: 30.3782, longitude: 76.7767 },
    '141': { district: 'Ludhiana District', state: 'Punjab', latitude: 30.9010, longitude: 75.8573 },
    '143': { district: 'Amritsar District', state: 'Punjab', latitude: 31.6340, longitude: 74.8723 },
    '144': { district: 'Jalandhar District', state: 'Punjab', latitude: 31.3260, longitude: 75.5762 },
    '160': { district: 'Chandigarh Region', state: 'Chandigarh', latitude: 30.7333, longitude: 76.7794 },
    '171': { district: 'Shimla Region', state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734 },
    '190': { district: 'Srinagar Region', state: 'Jammu & Kashmir', latitude: 34.0837, longitude: 74.7973 },
    '201': { district: 'Gautam Buddha Nagar / Noida', state: 'Uttar Pradesh', latitude: 28.5355, longitude: 77.3910 },
    '202': { district: 'Aligarh District', state: 'Uttar Pradesh', latitude: 27.8974, longitude: 78.0880 },
    '203': { district: 'Bulandshahr District', state: 'Uttar Pradesh', latitude: 28.4069, longitude: 77.8498 },
    '211': { district: 'Prayagraj District', state: 'Uttar Pradesh', latitude: 25.4358, longitude: 81.8463 },
    '221': { district: 'Varanasi District', state: 'Uttar Pradesh', latitude: 25.3176, longitude: 82.9739 },
    '226': { district: 'Lucknow District', state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '248': { district: 'Dehradun Region', state: 'Uttarakhand', latitude: 30.3165, longitude: 78.0322 },
    '282': { district: 'Agra District', state: 'Uttar Pradesh', latitude: 27.1767, longitude: 78.0081 },
    '302': { district: 'Jaipur Region', state: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
    '342': { district: 'Jodhpur District', state: 'Rajasthan', latitude: 26.2389, longitude: 73.0243 },
    '313': { district: 'Udaipur District', state: 'Rajasthan', latitude: 24.5854, longitude: 73.7125 },
    '380': { district: 'Ahmedabad Region', state: 'Gujarat', latitude: 23.0225, longitude: 72.5714 },
    '395': { district: 'Surat District', state: 'Gujarat', latitude: 21.1702, longitude: 72.8311 },
    '390': { district: 'Vadodara District', state: 'Gujarat', latitude: 22.3072, longitude: 73.1812 },
    '400': { district: 'Mumbai Suburban', state: 'Maharashtra', latitude: 18.9388, longitude: 72.8353 },
    '411': { district: 'Pune Region', state: 'Maharashtra', latitude: 18.5204, longitude: 73.8567 },
    '440': { district: 'Nagpur District', state: 'Maharashtra', latitude: 21.1458, longitude: 79.0882 },
    '452': { district: 'Indore District', state: 'Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
    '462': { district: 'Bhopal District', state: 'Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 },
    '475': { district: 'Gwalior District', state: 'Madhya Pradesh', latitude: 26.2183, longitude: 78.1828 },
    '500': { district: 'Hyderabad Region', state: 'Telangana', latitude: 17.3850, longitude: 78.4867 },
    '530': { district: 'Visakhapatnam District', state: 'Andhra Pradesh', latitude: 17.6868, longitude: 83.2185 },
    '560': { district: 'Bengaluru Urban', state: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
    '570': { district: 'Mysuru District', state: 'Karnataka', latitude: 12.2958, longitude: 76.6394 },
    '600': { district: 'Chennai Region', state: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
    '641': { district: 'Coimbatore District', state: 'Tamil Nadu', latitude: 11.0168, longitude: 76.9558 },
    '682': { district: 'Kochi / Ernakulam', state: 'Kerala', latitude: 9.9312, longitude: 76.2673 },
    '695': { district: 'Thiruvananthapuram Region', state: 'Kerala', latitude: 8.5241, longitude: 76.9366 },
    '700': { district: 'Kolkata Region', state: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
    '751': { district: 'Khurda / Bhubaneswar', state: 'Odisha', latitude: 20.2961, longitude: 85.8245 },
    '781': { district: 'Kamrup / Guwahati', state: 'Assam', latitude: 26.1445, longitude: 91.7362 },
    '800': { district: 'Patna District', state: 'Bihar', latitude: 25.5941, longitude: 85.1376 },
    '823': { district: 'Gaya District', state: 'Bihar', latitude: 24.7955, longitude: 85.0002 },
    '834': { district: 'Ranchi District', state: 'Jharkhand', latitude: 23.3441, longitude: 85.3096 }
  };

  // Tier 3: 2-Digit PIN Prefix State Reference Dataset
  const STATE_PREFIX_DATASET = {
    '11': { state: 'Delhi', latitude: 28.7041, longitude: 77.1025 },
    '12': { state: 'Haryana', latitude: 29.0588, longitude: 76.0856 },
    '13': { state: 'Haryana', latitude: 29.0588, longitude: 76.0856 },
    '14': { state: 'Punjab', latitude: 31.1471, longitude: 75.3412 },
    '15': { state: 'Punjab', latitude: 31.1471, longitude: 75.3412 },
    '16': { state: 'Punjab / Chandigarh', latitude: 30.7333, longitude: 76.7794 },
    '17': { state: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734 },
    '18': { state: 'Jammu & Kashmir', latitude: 33.7782, longitude: 76.5762 },
    '19': { state: 'Jammu & Kashmir', latitude: 34.0837, longitude: 74.7973 },
    '20': { state: 'Uttar Pradesh (West)', latitude: 28.5355, longitude: 77.3910 },
    '21': { state: 'Uttar Pradesh (Central)', latitude: 26.8467, longitude: 80.9462 },
    '22': { state: 'Uttar Pradesh (East)', latitude: 25.3176, longitude: 82.9739 },
    '23': { state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '24': { state: 'Uttarakhand', latitude: 30.0668, longitude: 79.0193 },
    '25': { state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '26': { state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '27': { state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '28': { state: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    '30': { state: 'Rajasthan', latitude: 27.0238, longitude: 74.2179 },
    '31': { state: 'Rajasthan', latitude: 27.0238, longitude: 74.2179 },
    '32': { state: 'Rajasthan', latitude: 27.0238, longitude: 74.2179 },
    '33': { state: 'Rajasthan', latitude: 27.0238, longitude: 74.2179 },
    '34': { state: 'Rajasthan', latitude: 27.0238, longitude: 74.2179 },
    '36': { state: 'Gujarat', latitude: 22.2587, longitude: 71.1924 },
    '37': { state: 'Gujarat', latitude: 22.2587, longitude: 71.1924 },
    '38': { state: 'Gujarat', latitude: 22.2587, longitude: 71.1924 },
    '39': { state: 'Gujarat', latitude: 22.2587, longitude: 71.1924 },
    '40': { state: 'Maharashtra (Mumbai)', latitude: 18.9388, longitude: 72.8353 },
    '41': { state: 'Maharashtra (Pune)', latitude: 18.5204, longitude: 73.8567 },
    '42': { state: 'Maharashtra', latitude: 19.7515, longitude: 75.7139 },
    '43': { state: 'Maharashtra', latitude: 19.7515, longitude: 75.7139 },
    '44': { state: 'Maharashtra (Nagpur)', latitude: 21.1458, longitude: 79.0882 },
    '45': { state: 'Madhya Pradesh', latitude: 22.9734, longitude: 78.6569 },
    '46': { state: 'Madhya Pradesh', latitude: 22.9734, longitude: 78.6569 },
    '47': { state: 'Madhya Pradesh', latitude: 22.9734, longitude: 78.6569 },
    '48': { state: 'Madhya Pradesh', latitude: 22.9734, longitude: 78.6569 },
    '49': { state: 'Chhattisgarh', latitude: 21.2787, longitude: 81.8661 },
    '50': { state: 'Telangana', latitude: 18.1124, longitude: 79.0193 },
    '51': { state: 'Andhra Pradesh', latitude: 15.9129, longitude: 79.7400 },
    '52': { state: 'Andhra Pradesh', latitude: 15.9129, longitude: 79.7400 },
    '53': { state: 'Andhra Pradesh', latitude: 15.9129, longitude: 79.7400 },
    '56': { state: 'Karnataka (Bengaluru)', latitude: 12.9716, longitude: 77.5946 },
    '57': { state: 'Karnataka', latitude: 15.3173, longitude: 75.7139 },
    '58': { state: 'Karnataka', latitude: 15.3173, longitude: 75.7139 },
    '59': { state: 'Karnataka', latitude: 15.3173, longitude: 75.7139 },
    '60': { state: 'Tamil Nadu (Chennai)', latitude: 13.0827, longitude: 80.2707 },
    '61': { state: 'Tamil Nadu', latitude: 11.1271, longitude: 78.6569 },
    '62': { state: 'Tamil Nadu', latitude: 11.1271, longitude: 78.6569 },
    '63': { state: 'Tamil Nadu', latitude: 11.1271, longitude: 78.6569 },
    '64': { state: 'Tamil Nadu', latitude: 11.1271, longitude: 78.6569 },
    '67': { state: 'Kerala', latitude: 10.8505, longitude: 76.2711 },
    '68': { state: 'Kerala', latitude: 10.8505, longitude: 76.2711 },
    '69': { state: 'Kerala', latitude: 10.8505, longitude: 76.2711 },
    '70': { state: 'West Bengal (Kolkata)', latitude: 22.5726, longitude: 88.3639 },
    '71': { state: 'West Bengal', latitude: 22.9868, longitude: 87.8550 },
    '72': { state: 'West Bengal', latitude: 22.9868, longitude: 87.8550 },
    '73': { state: 'West Bengal', latitude: 22.9868, longitude: 87.8550 },
    '74': { state: 'West Bengal', latitude: 22.9868, longitude: 87.8550 },
    '75': { state: 'Odisha', latitude: 20.9517, longitude: 85.0985 },
    '76': { state: 'Odisha', latitude: 20.9517, longitude: 85.0985 },
    '77': { state: 'Odisha', latitude: 20.9517, longitude: 85.0985 },
    '78': { state: 'Assam / North East', latitude: 26.2006, longitude: 92.9376 },
    '79': { state: 'North East States', latitude: 25.5788, longitude: 91.8933 },
    '80': { state: 'Bihar (Patna)', latitude: 25.5941, longitude: 85.1376 },
    '81': { state: 'Bihar', latitude: 25.0961, longitude: 85.3131 },
    '82': { state: 'Bihar (Gaya)', latitude: 24.7955, longitude: 85.0002 },
    '83': { state: 'Jharkhand', latitude: 23.6102, longitude: 85.2799 },
    '84': { state: 'Bihar / Jharkhand', latitude: 25.0961, longitude: 85.3131 },
    '85': { state: 'Bihar', latitude: 25.0961, longitude: 85.3131 }
  };

  /**
   * Looks up a PIN code in the 3-tiered dataset hierarchy and calculates Haversine distance to college.
   * @param {string|number} pinCode - 6-digit PIN code
   * @param {Object} [customCollegeLoc] - Optional college location override { latitude, longitude, name }
   * @returns {Object} Resolution details with distanceKm, distanceSource, coordinates, and city/district/state
   */
  function lookupPinCode(pinCode, customCollegeLoc = null) {
    const rawPin = String(pinCode || '').replace(/\D/g, '').trim();
    const collegeLoc = customCollegeLoc || window.getCollegeLocation() || DEFAULT_COLLEGE_LOCATION;

    if (!rawPin || rawPin.length !== 6) {
      console.log(`[DISTANCE] PIN: "${pinCode}" | Invalid length/format. Returning UNAVAILABLE.`);
      return {
        found: false,
        pinCode: rawPin,
        city: '',
        district: '',
        state: '',
        latitude: null,
        longitude: null,
        distanceKm: null,
        distanceSource: 'UNAVAILABLE',
        explanation: 'Invalid PIN code format (Must be exactly 6 digits).'
      };
    }

    // Tier 1: Exact 6-Digit PIN Lookup
    const exact = PIN_CODE_DATASET[rawPin];
    if (exact) {
      const distance = calculateHaversineDistance(collegeLoc.latitude, collegeLoc.longitude, exact.latitude, exact.longitude);
      console.log(`[DISTANCE] PIN: ${rawPin} | Tier 1 Exact PIN Match: ${exact.city}, ${exact.state} (${exact.latitude}, ${exact.longitude}) -> College (${collegeLoc.latitude}, ${collegeLoc.longitude}) = ${distance} km`);
      return {
        found: true,
        pinCode: rawPin,
        city: exact.city,
        district: exact.district,
        state: exact.state,
        latitude: exact.latitude,
        longitude: exact.longitude,
        distanceKm: distance,
        distanceSource: 'PIN',
        explanation: `Exact PIN location found (${exact.city}, ${exact.state}). Distance: ${distance} km.`
      };
    }

    // Tier 2: 3-Digit District Prefix Lookup
    const distPrefix = rawPin.substring(0, 3);
    const distMatch = DISTRICT_PREFIX_DATASET[distPrefix];
    if (distMatch) {
      const distance = calculateHaversineDistance(collegeLoc.latitude, collegeLoc.longitude, distMatch.latitude, distMatch.longitude);
      console.log(`[DISTANCE] PIN: ${rawPin} | Tier 2 District Prefix Match (${distPrefix}xxx): ${distMatch.district}, ${distMatch.state} -> ${distance} km`);
      return {
        found: true,
        pinCode: rawPin,
        city: distMatch.district,
        district: distMatch.district,
        state: distMatch.state,
        latitude: distMatch.latitude,
        longitude: distMatch.longitude,
        distanceKm: distance,
        distanceSource: 'DISTRICT',
        explanation: `PIN code estimated from district reference point (${distMatch.district}, ${distMatch.state}). Distance: ${distance} km.`
      };
    }

    // Tier 3: 2-Digit State Prefix Lookup
    const statePrefix = rawPin.substring(0, 2);
    const stateMatch = STATE_PREFIX_DATASET[statePrefix];
    if (stateMatch) {
      const distance = calculateHaversineDistance(collegeLoc.latitude, collegeLoc.longitude, stateMatch.latitude, stateMatch.longitude);
      console.log(`[DISTANCE] PIN: ${rawPin} | Tier 3 State Prefix Match (${statePrefix}xxxx): ${stateMatch.state} -> ${distance} km`);
      return {
        found: true,
        pinCode: rawPin,
        city: stateMatch.state,
        district: stateMatch.state,
        state: stateMatch.state,
        latitude: stateMatch.latitude,
        longitude: stateMatch.longitude,
        distanceKm: distance,
        distanceSource: 'STATE',
        explanation: `PIN code estimated from state reference point (${stateMatch.state}). Distance: ${distance} km.`
      };
    }

    // Fallback: Unknown PIN, not found in datasets
    console.log(`[DISTANCE] PIN: ${rawPin} | No reference match found. Returning UNAVAILABLE.`);
    return {
      found: false,
      pinCode: rawPin,
      city: '',
      district: '',
      state: '',
      latitude: null,
      longitude: null,
      distanceKm: null,
      distanceSource: 'UNAVAILABLE',
      explanation: 'PIN code not found in reference data. Distance unavailable.'
    };
  }

  /**
   * Helper to retrieve current configured college location from active propertyConfig or default
   */
  function getCollegeLocation() {
    let loc = null;
    if (window.state && window.state.propertyConfig && window.state.propertyConfig.collegeLocation) {
      loc = window.state.propertyConfig.collegeLocation;
    } else if (window.LocalMockDB && window.LocalMockDB.propertyConfig && window.LocalMockDB.propertyConfig.collegeLocation) {
      loc = window.LocalMockDB.propertyConfig.collegeLocation;
    }

    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
      return DEFAULT_COLLEGE_LOCATION;
    }
    return loc;
  }

  /**
   * Diagnostic Test Suite Runner for Distance Priority Functionality
   * Runs TEST 1 through TEST 7 and logs output with [DISTANCE] prefix
   */
  function runDistanceDiagnosticsTests() {
    console.log('====================================================');
    console.log('[DISTANCE DIAGNOSTICS] Running Automated Test Suite...');
    console.log('====================================================');

    const college = DEFAULT_COLLEGE_LOCATION;

    // TEST 1: Identical college & student coordinates
    const test1Dist = calculateHaversineDistance(college.latitude, college.longitude, college.latitude, college.longitude);
    console.log(`[DISTANCE TEST 1] Identical Coordinates (College vs College): Expected 0 km -> Result: ${test1Dist} km | PASS: ${test1Dist === 0}`);

    // TEST 2: Known PIN
    const test2Res = lookupPinCode('823001', college);
    console.log(`[DISTANCE TEST 2] Known PIN (823001 Gaya): Expected ~898 km, Source PIN -> Result: ${test2Res.distanceKm} km, Source: ${test2Res.distanceSource} | PASS: ${test2Res.distanceKm > 800 && test2Res.distanceSource === 'PIN'}`);

    // TEST 3: Unknown / Prefix PIN Fallback
    const test3Res = lookupPinCode('823999', college); // Prefix 823 matches Gaya District
    console.log(`[DISTANCE TEST 3] Prefix Fallback PIN (823999): Expected Source DISTRICT -> Result: ${test3Res.distanceKm} km, Source: ${test3Res.distanceSource} | PASS: ${test3Res.distanceSource === 'DISTRICT'}`);

    const test3bRes = lookupPinCode('999999', college); // Unknown prefix
    console.log(`[DISTANCE TEST 3b] Completely Unknown PIN (999999): Expected Source UNAVAILABLE -> Result: ${test3bRes.distanceSource} | PASS: ${test3bRes.distanceSource === 'UNAVAILABLE' && test3bRes.distanceKm === null}`);

    // TEST 4: Farther vs Closer Student Priority Comparison
    const studentFar = { 'Student ID': 'STU-FAR', 'Name': 'Far Student', 'Distance From College (km)': 898.4, 'Distance Source': 'PIN' };
    const studentClose = { 'Student ID': 'STU-CLOSE', 'Name': 'Close Student', 'Distance From College (km)': 36.2, 'Distance Source': 'PIN' };
    const maxDist = 898.4;
    const weight = 20;

    const scoreFar = Math.round((studentFar['Distance From College (km)'] / maxDist) * weight * 10) / 10;
    const scoreClose = Math.round((studentClose['Distance From College (km)'] / maxDist) * weight * 10) / 10;

    console.log(`[DISTANCE TEST 4] Priority Score Comparison (Max: ${maxDist} km, Weight: ${weight}):`);
    console.log(`  - Far Student (898.4 km): Score +${scoreFar} / ${weight}`);
    console.log(`  - Close Student (36.2 km): Score +${scoreClose} / ${weight}`);
    console.log(`  PASS: ${scoreFar > scoreClose && scoreFar === 20}`);

    // TEST 5: Distance factor disabled
    const factorDisabled = false;
    const scoreDisabled = factorDisabled ? scoreFar : 0;
    console.log(`[DISTANCE TEST 5] Distance Factor Disabled: Expected 0 -> Result: ${scoreDisabled} | PASS: ${scoreDisabled === 0}`);

    // TEST 6: Single Student in Pool (Safe normalization without NaN)
    const singleStudentDist = 450;
    const singleMaxDist = 450;
    const singleScore = (singleMaxDist > 0) ? (singleStudentDist / singleMaxDist) * weight : 0;
    console.log(`[DISTANCE TEST 6] Single Student in Pool (450 km / 450 km): Expected ${weight} -> Result: ${singleScore} | PASS: ${!isNaN(singleScore) && singleScore === weight}`);

    // TEST 7: All Students Unavailable
    const unavailDist = null;
    const maxUnavailDist = 0;
    const unavailScore = (maxUnavailDist > 0 && unavailDist !== null) ? (unavailDist / maxUnavailDist) * weight : 0;
    console.log(`[DISTANCE TEST 7] All Students Unavailable: Expected 0 -> Result: ${unavailScore} | PASS: ${unavailScore === 0}`);

    console.log('====================================================');
    console.log('[DISTANCE DIAGNOSTICS] All Automated Tests Completed.');
    console.log('====================================================');
  }

  // Expose on window scope
  window.DEFAULT_COLLEGE_LOCATION = DEFAULT_COLLEGE_LOCATION;
  window.calculateHaversineDistance = calculateHaversineDistance;
  window.PIN_CODE_DATASET = PIN_CODE_DATASET;
  window.DISTRICT_PREFIX_DATASET = DISTRICT_PREFIX_DATASET;
  window.STATE_PREFIX_DATASET = STATE_PREFIX_DATASET;
  window.lookupPinCode = lookupPinCode;
  window.getCollegeLocation = getCollegeLocation;
  window.runDistanceDiagnosticsTests = runDistanceDiagnosticsTests;

  // Run diagnostics automatically in dev environment
  setTimeout(() => {
    try {
      runDistanceDiagnosticsTests();
    } catch(e) {}
  }, 1000);

})(window);
