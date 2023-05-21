document.addEventListener("DOMContentLoaded", function() {
  // Define the API endpoint for elevation data
  // const elevationAPI = "https://api.open-elevation.com/api/v1/lookup";
  const elevationAPI = "https://api.open-meteo.com/v1/elevation";
  // Define the API endpoint for meteorological data
  const cdsAPI = "https://cds.climate.copernicus.eu/api/v2";

  // Function to get the elevation for given coordinates
  async function getElevation(latitude, longitude) {
    // const url = `${elevationAPI}?locations=${latitude},${longitude}`;
    const url = `${elevationAPI}?latitude=${latitude}&longitude=${longitude}`;
    const response = await fetch(url);
    const data = await response.json();
    // const elevation = data.results[0].elevation;
    const elevation = data.elevation[0];
    return elevation;
  }

  // // Function to get meteorological data for given coordinates
  // async function getMeteorologicalData(latitude, longitude) {
  //   const url = `${cdsAPI}/resources/reanalysis-era5-pressure-levels`;
  //   const params = {
  //     format: "json",
  //     variable: [
  //       "temperature",
  //       "u_component_of_wind",
  //       "v_component_of_wind",
  //       "specific_humidity",
  //       "relative_humidity"
  //     ],
  //     pressure_level: "1000",
  //     year: "2023",
  //     month: "01",
  //     day: "01",
  //     time: "00:00",
  //     area: `${latitude - 0.25}/${longitude - 0.25}/${latitude + 0.25}/${longitude + 0.25}`,
  //   };
  //   const response = await fetch(`${url}?${new URLSearchParams(params)}`);
  //   const data = await response.json();

  //   const meteorologicalData = {
  //     temperature: data.temperature[0].data[0],
  //     uComponentOfWind: data.u_component_of_wind[0].data[0],
  //     vComponentOfWind: data.v_component_of_wind[0].data[0],
  //     specificHumidity: data.specific_humidity[0].data[0],
  //     relativeHumidity: data.relative_humidity[0].data[0]
  //   };

  //   return meteorologicalData;
  // }

//   // Function to get meteorological data for given coordinates
// async function getMeteorologicalData(latitude, longitude) {
//   const cdsAPI = "https://cds.climate.copernicus.eu/api/v2";
//   const cdsUrl = `${cdsAPI}/resources/reanalysis-era5-pressure-levels`;

//   const cdsParams = {
//     format: "json",
//     variable: [
//       "temperature",
//       "u_component_of_wind",
//       "v_component_of_wind",
//       "specific_humidity",
//       "relative_humidity"
//     ],
//     pressure_level: "1000",
//     year: "2023",
//     month: "01",
//     day: "01",
//     time: "00:00",
//     area: `${latitude - 0.25}/${longitude - 0.25}/${latitude + 0.25}/${longitude + 0.25}`
//   };

//   const response = await fetch(`${cdsUrl}?${new URLSearchParams(cdsParams)}`);
//   const data = await response.json();

//   const meteorologicalData = {
//     temperature: data.variables[0].data[0],
//     uComponentOfWind: data.variables[1].data[0],
//     vComponentOfWind: data.variables[2].data[0],
//     specificHumidity: data.variables[3].data[0],
//     relativeHumidity: data.variables[4].data[0]
//   };

//   return meteorologicalData;
// }

function getMeteorologicalData(latitude, longitude) {
  const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=MY_API_KEY`;

  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Process the weather data
      const temperature = data.main.temp;
      const weatherDescription = data.weather[0].description;

      // Return the weather information
      return {
        temperature,
        weatherDescription
      };
    })
    .catch(error => {
      console.log("Error fetching weather data:", error);
    });
}



  // Load the TensorFlow.js model
  async function loadModel() {
    const model = await tf.loadLayersModel("model/model.json");
    return model;
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
    const elevation = await getElevation(latitude, longitude);

    // Get the meteorological data for the coordinates
    const meteorologicalData = await getMeteorologicalData(latitude, longitude);

    // Prepare the input data for the model
    const inputData = [latitude, longitude, elevation, ...Object.values(meteorologicalData)];

    // Load the model
    const model = await loadModel();

    // Perform the prediction using the loaded model
    const prediction = model.predict(tf.tensor2d(inputData, [1, inputData.length]));

    // Get the predicted value
    const fireRisk = prediction.dataSync()[0];

    resultDiv.innerHTML = `Fire Risk: ${fireRisk.toFixed(2)}`;
  }

  // Event listener for the predict button
  const predictBtn = document.getElementById("predictBtn");
  predictBtn.addEventListener("click", predict);
});
