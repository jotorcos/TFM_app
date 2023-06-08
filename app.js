document.addEventListener("DOMContentLoaded", function() {
  // Constants for near point
  const EARTH_RADIUS = 6371; // Radius of the Earth in kilometers

  // Constants for specific humidity
  const MOLECULAR_WEIGHT_WATER = 18.01528; // g/mol
  const GAS_CONSTANT_GRAMS = 8314; // J/(g·K)

  const MEANS = { 
    "altitud": 446.083088,
    "pendiente": 28.564042,
    "orientacion": 170.111652,
    "t_max": 299.449704,
    "u": 0.833451,
    "v": 0.029887,
    "specific_humidity": 0.006179,
    "relative_humidity": 35.056203
  };

  const STDS = {
    "altitud": 317.022152,
    "pendiente": 26.731821,
    "orientacion": 102.814267,
    "t_max": 8.523888,
    "u": 1.99291,
    "v": 1.443016,
    "specific_humidity": 0.002585,
    "relative_humidity": 17.824743
  }              

  // Section to display the result
  let resultDiv = document.getElementById("result");

  let points_data = null;

  // Fetch the GeoJSON file
  fetch('data/points_data.geojson')
    .then(response => response.json())
    .then(data => {
      points_data = JSON.parse(JSON.stringify(data));
      document.getElementById('loading').style.display = 'none';
      document.getElementById('coordinates-section').style.display = 'inline-block';
      document.getElementById('predictBtn').disabled = false;
      document.getElementById('coordinates').disabled = false;
    });

  // Initialize the map
  const mapContainer = document.getElementById('map');
  const map = L.map(mapContainer).setView([39.07837506689215, -0.35200661861346516], 8);

  // Add a tile layer (e.g., OpenStreetMap)
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    maxZoom: 12
  });

  osmLayer.addTo(map);

  let markerIcon = L.icon({
    iconUrl: 'assets/forest.png',
    iconSize: [25, 41],
  });

  let marker = null;

  // Add a click event listener to the map
  map.on('click', function (e) {

    markerIcon = L.icon({
      iconUrl: 'assets/forest.png',
      iconSize: [25, 41],
    });

    if (marker) {
      map.removeLayer(marker); // Remove the previous marker from the map
    }

    // Get the clicked coordinates
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);

    // Update the input field with the coordinates
    document.getElementById('coordinates').value = lat + ', ' + lng;
  });

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(degreesToRadians(lat1)) *
        Math.cos(degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = EARTH_RADIUS * c;
  
    return distance;
  }
  
  function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  async function findNearestPoint(userLatitude, userLongitude) {
    let nearestPoint = null;
    let minDistance = Infinity;
      
    // Perform any further processing with the GeoJSON data
    points_data.features.forEach(feature => {
      if (feature.geometry.type === 'Point') {
        const [pointLongitude, pointLatitude] = feature.geometry.coordinates;
  
        // Calculate the distance between the user's input and the current point
        const distance = calculateDistance(userLatitude, userLongitude, pointLatitude, pointLongitude);
  
        // Check if the current point is closer than the previous closest point
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = feature;
        }
      }
    });

    if (minDistance > 5) {
      return null;
    }

    const altitud = nearestPoint.properties.altitud;
    const pendiente = nearestPoint.properties.pendiente;
    const orientacion = nearestPoint.properties.orientacion;
    const n_CLAIFN = nearestPoint.properties.n_CLAIFN;
    return { altitud, pendiente, orientacion, n_CLAIFN };
  }
  

  // Function to calculate specific humidity (in grams of water vapor per kilogram of air)
  function calculateSpecificHumidity(temperature, relativeHumidity) {
    // Convert temperature to Kelvin
    const temperatureKelvin = temperature + 273.15;

    // Calculate the saturation vapor pressure (e_sat) using the Clausius-Clapeyron equation
    const eSat = 610.78 * Math.exp((17.2694 * (temperature - 273.16)) / (temperature - 35.86));

    // Calculate the vapor pressure (e) using the relative humidity
    const e = (relativeHumidity / 100) * eSat;

    // Calculate the specific humidity
    const specificHumidity = (MOLECULAR_WEIGHT_WATER * e) / (GAS_CONSTANT_GRAMS * (temperatureKelvin - 273.15));

    return specificHumidity;
  }

  function getMeteorologicalData(latitude, longitude) {
    const apiKey = 'c3034e02ba05fd3aec1bc080872ba8c6';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;

    return fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        // Process the weather data
        const meteorologicalData = {
          temperature: data.main.temp_max,
          uComponentOfWind: data.wind.speed*Math.cos(data.wind.deg),
          vComponentOfWind: data.wind.speed*Math.sin(data.wind.deg),
          specificHumidity: calculateSpecificHumidity(data.main.temp, data.main.humidity),
          relativeHumidity: data.main.humidity
        };

        return meteorologicalData;
      })
      .catch(error => {
        console.log("Error fetching weather data:", error);
      });
  }


  // Load the TensorFlow.js model
  async function loadModel() {
    // const modelJson = {"format": "layers-model", "generatedBy": "keras v2.12.0", "convertedBy": "TensorFlow.js Converter v4.6.0", "modelTopology": {"keras_version": "2.12.0", "backend": "tensorflow", "model_config": {"class_name": "Sequential", "config": {"name": "sequential", "layers": [{"class_name": "InputLayer", "config": {"batch_input_shape": [null, 8], "dtype": "float32", "sparse": false, "ragged": false, "name": "dense_input"}}, {"class_name": "Dense", "config": {"name": "dense", "trainable": true, "dtype": "float32", "batch_input_shape": [null, 8], "units": 64, "activation": "relu", "use_bias": true, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": null}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": null, "bias_regularizer": null, "activity_regularizer": null, "kernel_constraint": {"class_name": "MaxNorm", "config": {"max_value": 1, "axis": 0}}, "bias_constraint": null}}, {"class_name": "Dropout", "config": {"name": "dropout", "trainable": true, "dtype": "float32", "rate": 0.3, "noise_shape": null, "seed": null}}, {"class_name": "Dense", "config": {"name": "dense_1", "trainable": true, "dtype": "float32", "units": 128, "activation": "relu", "use_bias": true, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": null}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": null, "bias_regularizer": null, "activity_regularizer": null, "kernel_constraint": {"class_name": "MaxNorm", "config": {"max_value": 1, "axis": 0}}, "bias_constraint": null}}, {"class_name": "Dropout", "config": {"name": "dropout_1", "trainable": true, "dtype": "float32", "rate": 0.3, "noise_shape": null, "seed": null}}, {"class_name": "Dense", "config": {"name": "dense_2", "trainable": true, "dtype": "float32", "units": 256, "activation": "relu", "use_bias": true, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": null}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": null, "bias_regularizer": null, "activity_regularizer": null, "kernel_constraint": {"class_name": "MaxNorm", "config": {"max_value": 1, "axis": 0}}, "bias_constraint": null}}, {"class_name": "Dropout", "config": {"name": "dropout_2", "trainable": true, "dtype": "float32", "rate": 0.3, "noise_shape": null, "seed": null}}, {"class_name": "Dense", "config": {"name": "dense_3", "trainable": true, "dtype": "float32", "units": 128, "activation": "relu", "use_bias": true, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": null}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": null, "bias_regularizer": null, "activity_regularizer": null, "kernel_constraint": {"class_name": "MaxNorm", "config": {"max_value": 1, "axis": 0}}, "bias_constraint": null}}, {"class_name": "Dropout", "config": {"name": "dropout_3", "trainable": true, "dtype": "float32", "rate": 0.3, "noise_shape": null, "seed": null}}, {"class_name": "Dense", "config": {"name": "dense_4", "trainable": true, "dtype": "float32", "units": 64, "activation": "relu", "use_bias": true, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": null}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": null, "bias_regularizer": null, "activity_regularizer": null, "kernel_constraint": {"class_name": "MaxNorm", "config": {"max_value": 1, "axis": 0}}, "bias_constraint": null}}, {"class_name": "Dropout", "config": {"name": "dropout_4", "trainable": true, "dtype": "float32", "rate": 0.3, "noise_shape": null, "seed": null}}, {"class_name": "Dense", "config": {"name": "dense_5", "trainable": true, "dtype": "float32", "units": 2, "activation": "softmax", "use_bias": true, "kernel_initializer": {"class_name": "GlorotUniform", "config": {"seed": null}}, "bias_initializer": {"class_name": "Zeros", "config": {}}, "kernel_regularizer": null, "bias_regularizer": null, "activity_regularizer": null, "kernel_constraint": null, "bias_constraint": null}}]}}, "training_config": {"loss": "sparse_categorical_crossentropy", "metrics": [[{"class_name": "MeanMetricWrapper", "config": {"name": "accuracy", "dtype": "float32", "fn": "sparse_categorical_accuracy"}}]], "weighted_metrics": null, "loss_weights": null, "optimizer_config": {"class_name": "Custom>Adamax", "config": {"name": "Adamax", "weight_decay": null, "clipnorm": null, "global_clipnorm": null, "clipvalue": null, "use_ema": false, "ema_momentum": 0.99, "ema_overwrite_frequency": null, "jit_compile": false, "is_legacy_optimizer": false, "learning_rate": 0.0010000000474974513, "beta_1": 0.9, "beta_2": 0.999, "epsilon": 1e-07}}}}, "weightsManifest": [{"paths": ["group1-shard1of1.bin"], "weights": [{"name": "dense/kernel", "shape": [8, 64], "dtype": "float32"}, {"name": "dense/bias", "shape": [64], "dtype": "float32"}, {"name": "dense_1/kernel", "shape": [64, 128], "dtype": "float32"}, {"name": "dense_1/bias", "shape": [128], "dtype": "float32"}, {"name": "dense_2/kernel", "shape": [128, 256], "dtype": "float32"}, {"name": "dense_2/bias", "shape": [256], "dtype": "float32"}, {"name": "dense_3/kernel", "shape": [256, 128], "dtype": "float32"}, {"name": "dense_3/bias", "shape": [128], "dtype": "float32"}, {"name": "dense_4/kernel", "shape": [128, 64], "dtype": "float32"}, {"name": "dense_4/bias", "shape": [64], "dtype": "float32"}, {"name": "dense_5/kernel", "shape": [64, 2], "dtype": "float32"}, {"name": "dense_5/bias", "shape": [2], "dtype": "float32"}]}]};
    const model = await tf.loadLayersModel("model_26_optimized/model.json");
    return model;
  }

  const getPrediction = async (prediction) => {
    const predictedValue = await prediction.data();
    const result = predictedValue[1] > predictedValue[0] ? 1 : 0;
    return result;
  }

  const normalizeNumericData = (data) => {
    const normalizedData = [
      (data[0] - MEANS.altitud) / STDS.altitud,
      (data[1] - MEANS.pendiente) / STDS.pendiente,
      (data[2] - MEANS.orientacion) / STDS.orientacion,
      (data[3] - MEANS.t_max) / STDS.t_max,
      (data[4] - MEANS.u) / STDS.u,
      (data[5] - MEANS.v) / STDS.v,
      (data[6] - MEANS.specific_humidity) / STDS.specific_humidity,
      (data[7] - MEANS.relative_humidity) / STDS.relative_humidity
    ]
    return normalizedData;
  }

  // Function to handle the prediction
  async function predict() {
    const coordinatesInput = document.getElementById("coordinates").value;

    resultDiv.classList.remove('risk', 'no-risk');

    if (!coordinatesInput) {
      resultDiv.textContent = "Por favor, introduzca las coordenadas.";
      return;
    }

    const [latitude, longitude] = coordinatesInput.split(",").map(coord => parseFloat(coord.trim()));
    
    const nearestPoint = await findNearestPoint(latitude, longitude);

    if (!nearestPoint) {
      resultDiv.textContent = 'Las coordenadas introducidas están demasiado lejos.';
      return;
    }

    // Define an array of all possible n_CLAIFN values
    const n_CLAIFNValues = [111, 112, 114, 121, 122, 124, 132, 140, 141, 142, 150, 161, 171, 172, 200, 300, 400, 500];

    // Create an empty object to hold the one-hot encoded values
    const oneHotEncoded = {};

    // Iterate over the n_CLAIFN values and create corresponding one-hot encoded columns
    n_CLAIFNValues.forEach((value) => {
      const column = `n_CLAIFN_${value}`;
      oneHotEncoded[column] = nearestPoint.n_CLAIFN === value ? 1 : 0;
    });

    // Get the meteorological data for the coordinates
    const meteorologicalData = await getMeteorologicalData(latitude, longitude);

    const normalizedNumericData = normalizeNumericData([nearestPoint.altitud , nearestPoint.pendiente, nearestPoint.orientacion, ...Object.values(meteorologicalData)]);

    // Append the one-hot encoded columns to the inputData array
    const inputData = [...Object.values(normalizedNumericData), ...Object.values(oneHotEncoded)];

    resultDiv.textContent = 'Cargando...';

    // Load the model
    const model = await loadModel();

    // Perform the prediction using the loaded model
    const prediction = model.predict(tf.tensor2d(inputData, [1, inputData.length]));

    // Get the predicted value
    const fireRisk = await getPrediction(prediction);

    const fireRiskDictionary = {0: 'No hay riesgo de incendio.', 1: 'Hay riesgo de incendio.'}

    resultDiv.textContent = `${fireRiskDictionary[fireRisk]}`;

    if (fireRisk == 1) {
      resultDiv.classList.add('risk');

      markerIcon = L.icon({
        iconUrl: 'assets/trees_fire.png',
        iconSize: [25, 41],
      });

    } else {
      resultDiv.classList.add('no-risk');

      markerIcon = L.icon({
        iconUrl: 'assets/trees_no_fire.png',
        iconSize: [25, 41],
      });
    }

    if (marker) {
      map.removeLayer(marker);
    }

    marker = L.marker([latitude, longitude], { icon: markerIcon }).addTo(map);
  }

  // Event listener for the predict button
  const predictBtn = document.getElementById("predictBtn");
  predictBtn.addEventListener("click", predict);
});
