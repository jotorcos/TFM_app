let points_data = null;

// Fetch the GeoJSON file
fetch('data/points_data.geojson')
  .then(response => response.json())
  .then(data => {
    points_data = JSON.parse(JSON.stringify(data));
    document.getElementById('predictBtn').disabled = false;
  });

document.addEventListener("DOMContentLoaded", function() {

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371; // Radius of the Earth in kilometers
    const dLat = degreesToRadians(lat2 - lat1);
    const dLon = degreesToRadians(lon2 - lon1);
  
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(degreesToRadians(lat1)) *
        Math.cos(degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
  
    return distance;
  }
  
  function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  async function findNearestPoint(userLatitude, userLongitude) {
    let nearestPoint = null;
    let minDistance = Infinity;
      
    // Handle the loaded GeoJSON data
    console.log(points_data); // Example: Log the loaded GeoJSON data
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

    const altitud = nearestPoint.properties.altitud;
    const pendiente = nearestPoint.properties.pendiente;
    const orientacion = nearestPoint.properties.orientacion;
    const n_CLAIFN = nearestPoint.properties.n_CLAIFN;
    return { altitud, pendiente, orientacion, n_CLAIFN };
  }
  

  // Function to calculate specific humidity (in grams of water vapor per kilogram of air)
  function calculateSpecificHumidity(temperature, relativeHumidity) {
    // Constants for the calculation
    const molecularWeightWater = 18.01528; // g/mol
    const gasConstant = 8.314; // J/(mol·K)
    const gasConstantGrams = gasConstant * 1000; // J/(g·K)

    // Convert temperature to Kelvin
    const temperatureKelvin = temperature + 273.15;

    // Calculate the saturation vapor pressure (e_sat) using the Clausius-Clapeyron equation
    const eSat = 610.78 * Math.exp((17.2694 * (temperature - 273.16)) / (temperature - 35.86));

    // Calculate the vapor pressure (e) using the relative humidity
    const e = (relativeHumidity / 100) * eSat;

    // Calculate the specific humidity
    const specificHumidity = (molecularWeightWater * e) / (gasConstantGrams * (temperatureKelvin - 273.15));

    return specificHumidity;
  }

  // function getMeteorologicalData(latitude, longitude, timestamp) {
  //   const apiKey = 'c3034e02ba05fd3aec1bc080872ba8c6';
  //   // const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
  //   const apiUrl = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${latitude}&lon=${longitude}&dt=${timestamp}&appid=${apiKey}`;
  //   // const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}`

  //   return fetch(apiUrl)
  //     .then(response => response.json())
  //     .then(data => {
  //       // Process the weather data
  //       const meteorologicalData = {
  //         temperature: data.current.temp,
  //         uComponentOfWind: data.current.wind_speed*Math.cos(data.current.wind_deg),
  //         vComponentOfWind: data.current.wind_speed*Math.sin(data.current.wind_deg),
  //         specificHumidity: calculateSpecificHumidity(data.current.temp, data.current.humidity),
  //         relativeHumidity: data.current.humidity
  //       };

  //       return meteorologicalData;
  //     })
  //     .catch(error => {
  //       console.log("Error fetching weather data:", error);
  //     });
  // }

  function getMeteorologicalData(latitude, longitude) {
    const apiKey = 'c3034e02ba05fd3aec1bc080872ba8c6';
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;

    return fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        // Process the weather data
        // const meteorologicalData = {
        //   temperature: data.main.temp_max,
        //   uComponentOfWind: data.wind.speed*Math.cos(data.wind.deg),
        //   vComponentOfWind: data.wind.speed*Math.sin(data.wind.deg),
        //   specificHumidity: calculateSpecificHumidity(data.main.temp, data.main.humidity),
        //   relativeHumidity: data.main.humidity
        // };

        const meteorologicalData = {
          temperature: 305,
          uComponentOfWind: 5,
          vComponentOfWind: -2,
          specificHumidity: calculateSpecificHumidity(data.main.temp, 30),
          relativeHumidity: 30
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
    // const model = await tf.loadLayersModel(modelJson);
    const model = await tf.loadLayersModel("model_26_optimized/model.json");
    return model;
  }

  const getPrediction = async (prediction) => {
    const predictedValue = await prediction.data();
    console.log('predictedValue', `${predictedValue[0]},${predictedValue[1]}`);
    const result = predictedValue[1] > predictedValue[0] ? 1 : 0;
    return result;
  }

  // Function to handle the prediction
  async function predict() {
    const coordinatesInput = document.getElementById("coordinates").value;
    // Display the result
    const resultDiv = document.getElementById("result");

    if (!coordinatesInput) {
      resultDiv.textContent = "Please enter coordinates.";
      return;
    }

    const [latitude, longitude] = coordinatesInput.split(",").map(coord => parseFloat(coord.trim()));

    // Get the elevation for the coordinates
    // const elevation = await getElevation(latitude, longitude);
    
    const nearestPoint = await findNearestPoint(latitude, longitude);

    // Define an array of all possible n_CLAIFN values
    const n_CLAIFNValues = [111, 112, 114, 121, 122, 124, 132, 140, 141, 142, 150, 161, 171, 172, 200, 300, 400, 500];

    // Create an empty object to hold the one-hot encoded values
    const oneHotEncoded = {};

    // Iterate over the n_CLAIFN values and create corresponding one-hot encoded columns
    n_CLAIFNValues.forEach((value) => {
      const column = `n_CLAIFN_${value}`;
      oneHotEncoded[column] = nearestPoint.n_CLAIFN === value ? 1 : 0;
    });

    // const date = new Date("2023-05-21"); // Example date
    // const date = new Date("2023-05-21");
    // const timestamp = date.getTime();
    // const timestamp = Math.floor(Date.now() / 1000);
    // const timestamp = Math.floor(new Date("2023-05-23") / 1000);

    // Get the meteorological data for the coordinates
    const meteorologicalData = await getMeteorologicalData(latitude, longitude);

    // Prepare the input data for the model
    // const inputData_8 = [elevation, 10, 10, ...Object.values(meteorologicalData)];
    // const inputData = [nearestPoint.altitud, ...Object.values(meteorologicalData)];

    // Append the one-hot encoded columns to the inputData array
    const inputData = [nearestPoint.altitud, nearestPoint.pendiente, nearestPoint.orientacion, ...Object.values(meteorologicalData), ...Object.values(oneHotEncoded)];

    // const inputData = [388.61575,59.145134,272.72263, ...Object.values(meteorologicalData)];
    // False:
    // const inputData = [0.89125,0.14063703,132.83873,285.17822265625,-1.1137219667434692,1.1771970987319946,0.005431365221738815,65.70384216308594];
    // const inputData = [10,0.14063703,132.83873,120,0.1,1.1771970987319946,0.005431365221738815,65.70384216308594];

    // True:
    // const inputData = [546.37,21.421358,80.22286,300.30322265625,4.351698398590088,6.368526458740234,0.005158774554729462,27.214874267578125];
    // const inputDataArr = [{ altitud: 546.37, pendiente: 21.421358, orientacion: 80.22286, t_max: 300.30322265625, u: 4.351698398590088, v: 6.368526458740234, specific_humidity: 0.005158774554729462, relative_humidity: 27.214874267578125 }]
    console.log('inputData', inputData);

    // Load the model
    const model = await loadModel();

    // Perform the prediction using the loaded model
    const prediction = model.predict(tf.tensor2d(inputData, [1, inputData.length]));

    // Get the predicted value
    // const fireRisk = prediction.dataSync()[0];
    // const fireRisk = prediction.data();

    const fireRisk = await getPrediction(prediction);

    const fireRiskDictionary = {0: 'No hay riesgo de incendio', 1: 'Hay riesgo de incendio'}

    resultDiv.innerHTML = `${fireRiskDictionary[fireRisk]}`;
  }

  // Event listener for the predict button
  const predictBtn = document.getElementById("predictBtn");
  predictBtn.addEventListener("click", predict);
});
