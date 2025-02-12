const request = require("request")
const discord = require("discord.js")
const { config } = require("systems/settings")
const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

module.exports = {
    "name": "weather",
    "description": "shows the current weather and weather info from the mentioned city",
    "format": "weather [city]",
    "function": function weather(message) {
        let city = "Leiden" // default city to avoid errors
        const args = message.content.split(" ")

        if (args[1]) {
            args.shift()
            city = args.join(" ")
        } else
            return bot.messageHandler.send(message, "You need to enter a city")

        request(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${config.weather_api_key}&units=metric&mode=JSON`,
            (err, res, body) => {
                if (err)
                    return logger.error(err.error)

                const result = JSON.parse(body)

                if (result.cod === 200) {
                    const options = {
                        timeZone: "UTC"
                    }
                    const sunrise = new Date((result.sys.sunrise + result.timezone) * 1000).toLocaleTimeString("en-UK", options)
                    const sunset = new Date((result.sys.sunset + result.timezone) * 1000).toLocaleTimeString("en-UK", options)

                    const weatherEmbed = new discord.MessageEmbed()
                        .setColor(config.color_hex)
                        .setTitle(`Weather in ${result.name} ${result.sys.country}`)
                        .setThumbnail(`https://openweathermap.org/img/wn/${result.weather[0].icon}@2x.png`)
                        .addField("Current Weather", result.weather[0].description.capitalize())
                        .addField("Temperature", `${result.main.temp}°C`, true)
                        .addField("Feels like", `${result.main.feels_like}°C`, true)
                        .addField("Humidity", `${result.main.humidity}%`, true)
                        .addField("Wind", `${result.wind.speed}m/s`, true)
                        .addField("Clouds", `${result.clouds.all}%`, true)
                        .addField("Pressure", `${result.main.pressure}hPa`, true)
                        .addField("Sunrise", sunrise, true)
                        .addField("Sunset", sunset, true)

                    bot.messageHandler.send(message, { embeds: [weatherEmbed] })
                } else {
                    bot.messageHandler.send(message, result.message.capitalize())
                    logger.warn(`Weather error on ${city}`)
                }
            })
    }
}