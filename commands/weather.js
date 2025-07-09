const discord = require("discord.js")
const request = require("request")

const bot = require("../systems/bot")
const logger = require("../systems/logger")
const { config } = require("../systems/settings")

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
        } else {
            return bot.messageHandler.send(message, "You need to enter a city")
        }

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
                        .addFields(
                            { name: "Current Weather", value: result.weather[0].description.capitalize() },
                            { name: "Temperature", value: `${result.main.temp}°C`, inline: true },
                            { name: "Feels like", value: `${result.main.feels_like}°C`, inline: true },
                            { name: "Humidity", value: `${result.main.humidity}%`, inline: true },
                            { name: "Wind", value: `${result.wind.speed}m/s`, inline: true },
                            { name: "Clouds", value: `${result.clouds.all}%`, inline: true },
                            { name: "Pressure", value: `${result.main.pressure}hPa`, inline: true },
                            { name: "Sunrise", value: sunrise, inline: true },
                            { name: "Sunset", value: sunset, inline: true }
                        )

                    bot.messageHandler.send(message, { embeds: [weatherEmbed] })
                } else {
                    bot.messageHandler.send(message, result.message.capitalize())
                    logger.warn(`Weather error on ${city}`)
                }
            })
    }
}