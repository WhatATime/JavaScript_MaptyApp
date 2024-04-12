'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

////////////////////////////////
////////////////////////////////
// Parent workout class
class Workout {
  ////////////////////////////////
  ////////////////////////////////
  // Public field
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  ////////////////////////////////
  ////////////////////////////////
  // Constructor
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  ////////////////////////////////
  ////////////////////////////////
  // Private methods

  // Function to format a workout description
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Build literal string
    // First add workout type with capital letter
    // Then add correct month from months array (date.getMonth() returns a number between 0 and 11, months array is 0-based)
    // Then add the day
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  ////////////////////////////////
  ////////////////////////////////
  // Public methods (interfaces)

  // Function to calculate how often a workout was clicked
  click() {
    this.clicks++;
  }
}

////////////////////////////////
////////////////////////////////
// Running class
class Running extends Workout {
  ////////////////////////////////
  ////////////////////////////////
  // Public field
  type = 'running';

  ////////////////////////////////
  ////////////////////////////////
  // Constructor
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._calcPace();
    this._setDescription();
  }

  ////////////////////////////////
  ////////////////////////////////
  // Private methods

  // Function to calculate the pace in min/km
  _calcPace() {
    this.pace = this.duration / this.distance;
    return this;
  }
}

////////////////////////////////
////////////////////////////////
// Cycling class
class Cycling extends Workout {
  ////////////////////////////////
  ////////////////////////////////
  // Public field
  type = 'cycling';

  ////////////////////////////////
  ////////////////////////////////
  // Constructor
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this._calcSpeed();
    this._setDescription();
  }

  ////////////////////////////////
  ////////////////////////////////
  // Private methods

  // Function to calculate the pace in hm/h
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this;
  }
}

////////////////////////////////
////////////////////////////////
// App class
class App {
  ////////////////////////////////
  ////////////////////////////////
  // Private fields
  #map;
  #mapZoomLevel = 16;
  #mapEvent;
  #workouts = [];

  ////////////////////////////////
  ////////////////////////////////
  // Constructor
  // Execute when new class is created
  constructor() {
    // get the current position and load map
    this._getPosition();

    // Get dat from local storage
    this._getLocalStorage();

    // Add event listeners to elements
    // Add form submit event listener
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Add change type event listener
    inputType.addEventListener('change', this._toggleElevationField);
    // Add event listener to jump to clicked marker on map
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  ////////////////////////////////
  ////////////////////////////////
  // Private methods

  // Function to get current position with Geolocation API (Browser API)
  _getPosition() {
    // First check if browser has access to location
    // Success: load map
    // Fail: show alter message
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        // Assign two callback functions
        // Success
        this._loadMap.bind(this),
        // Fail
        function () {
          alert('Could not get your position');
        }
      );
  }

  // Function to load map
  // position argument passed by callback function from getCurrentPosition()
  _loadMap(position) {
    // Get current position coordinates
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    // Create map with Leaflet library
    // Init map with geographical coordinates and zoom level
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    // Add tile layer
    // Tile layer can be styled using the following link
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    // Event listener on leaflet map
    // Display the workout form after clicking on map
    this.#map.on('click', this._showForm.bind(this));

    // Render each existing workout marker from local storage
    // Needs to be done here as map needs to be loaded
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Function to show the workout form by removing hidden class
  // mapE argument passed by callback function from on()
  _showForm(mapE) {
    // Set new map event
    // Needed to get click coordinates
    this.#mapEvent = mapE;
    // Display input form
    form.classList.remove('hidden');
    // Focus directly on distance input for increased UX
    inputDistance.focus();
  }

  // Function to hide the workout form by adding hidden class
  // Clearing all the fields from any input value
  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Remove form but keep animation
    // Instantly hide form
    form.style.display = 'none';
    // Remove form through class lsit
    form.classList.add('hidden');
    // Set original display style
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // Function to toogle the input fields of a form
  // dependent on workout type
  _toggleElevationField() {
    // First select clothest parent element of elevation and cadence input fields
    // Then toggle hidden class (only one of them has to be displayed)
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Function to create new workout
  // event argument passed by event handler after form submit
  _newWorkout(e) {
    // Helper function to check if arguments are numbers and positive
    // If one argument is not a number or positive, every will return false
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Prevent default form behavior
    e.preventDefault();

    // Get data from the form
    // Transform to numbers if necessary
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Get click coordinates from map event
    const { lat, lng } = this.#mapEvent.latlng;

    // Workout variable declaration to store newly generated workout
    let workout;

    // If activity running, create running object
    if (type === 'running') {
      // Get cadance value from form
      // Transform to number
      const cadence = +inputCadence.value;

      // Check if data valid
      // Use validInputs and allPositive helper functions
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      // Create new Running instance
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If activity cycling, create cycling object
    if (type === 'cycling') {
      // Get elevation value from form
      // Transform to number
      const elevation = +inputElevation.value;

      // Check if data valid
      // Use validInputs and allPositive helper functions
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      // Create new Cycling instance
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkoutList(workout);

    // Hide form and clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // Function to render the marker on the map
  // Argument workout contains all information about submitted workout
  _renderWorkoutMarker(workout) {
    // Set marker on the clicked coordinates
    L.marker(workout.coords)
      .addTo(this.#map)
      // Create popup for marker
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 200,
          autoClose: false,
          closeOnClick: false,
          // Change popup style dependent on workout type
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // Function to render the workout on the list
  // Argument workout contains all information about submitted workout
  _renderWorkoutList(workout) {
    // Build up html string which should be added to the list
    // Start with type common points distance and duration
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
        </div>
    `;

    // If workout type is running, then add pace and cadence to html string
    if (workout.type === 'running')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;

    // If workout type is running, then add speed and elevation to html string
    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
        </div>
        </li>
        `;

    // Add html string after the form elelemnt ended
    // Added workout is now a sibling element to the form
    form.insertAdjacentHTML('afterend', html);
  }

  // Function to move to clicked workout on map
  // Event argument e passed from event handler to callback function
  _moveToPopup(e) {
    // Get the clicked workout html element
    // by selecting the closest (parent) workout element
    const workoutEl = e.target.closest('.workout');

    // Guard clause if no workout element exists
    if (!workoutEl) return;

    // Select correct workout from saved workout array
    // Find the workout by comparing the ids
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Set the viewport of the map to the clicked workout
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // Just for demonstration purposes
    // Attention: this function is not available anymore, once objects get restored from local storage
    // workout.click();
  }

  // Function to set the workouts array to local storage
  _setLocalStorage() {
    // Local storage in Browser
    // Transform workout objects to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Function to get the workouts array from local storage
  _getLocalStorage() {
    // Get data from local storage
    // Parse the string to its objects
    const data = JSON.parse(localStorage.getItem('workouts'));

    // Guard clause to stop if no data exists
    if (!data) return;

    // Restore workouts array
    this.#workouts = data;

    // Render each workout to the list
    // You can't render the markers here, as map is not loaded yet!
    this.#workouts.forEach(work => {
      this._renderWorkoutList(work);
    });
  }

  ////////////////////////////////
  ////////////////////////////////
  // Public methods

  // Public interface to reset the local storage
  // Can be called from console
  reset() {
    // Remove workouts from local storage
    localStorage.removeItem('workouts');
    // Browser function to reload the page
    location.reload();
  }
}

// Create App Instance
const app = new App();
