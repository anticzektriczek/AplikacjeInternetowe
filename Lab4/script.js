const WeatherApp = class{
    constructor(apiKey, resultsBlockSelector){
        this.apiKey = apiKey;
        this.resultsBlock= document.querySelector(resultsBlockSelector);
    }

    getCurrentWeather(query){

    }
    getForecast(query){

    }
    getWeather(query){
        const weatherBlock = this.createWeatherBlock('2020-11-20 11:15', '2', '2','04n','broken clouds');
        this.resultsBlock.appendChild(weatherBlock);
    }
    drawWeather(){

    }
    createWeatherBlock(dateString, temperature, feel, icon, description){
        const weatherBlock = document.createElement("div");
        weatherBlock.className = "weather-block";
        weatherBlock.innerText = "elo";

        const dateBlock = document.createElement("div");
        dateBlock.className = "weather-date";
        dateBlock.innerHTML = dateString;
        weatherBlock.appendChild(dateBlock);

        const temperatureBlock = document.createElement("div");
        temperatureBlock.className = "weather-temperature";
        temperatureBlock.innerHTML = `${temperature} &deg;C`;
        weatherBlock.appendChild(temperatureBlock);

        return weatherBlock;
    }
}
document.weatherApp = new WeatherApp("7ded80d91f2b280ec979100cc8bbba94","#weather-result");
document.querySelector("#checkButton").addEventListener("click",function(){
    const query = document.querySelector("#locationInput").value;
    document.weatherApp.getWeather(query);
})