const WeatherApp = class{
    constructor(apiKey, resultsBlockSelector){

    }

    getCurrentWeather(query){

    }
    getForecast(query){

    }
    getWeather(query){

    }
    drawWeather(){

    }
    createWeatherBlock(dateString, temperature, feel, icon, description){

    }
}
document.weatherApp = new WeatherApp("YOUR KEY","#weather-results-container");
document.querySelector("#checkButton").addEventListener("click",function(){
    const query = document.querySelector("#locationInput").value;
    document.weatherApp.getWeather(query);
})