import axios from "axios";
import * as discord from "discord.js";
import type { ICommand } from "../interfaces";
import { capitalize } from "../systems/stringHelpers";
import { toError } from "../systems/utils";

export default {
    name: "weather",
    description: "shows the current weather and weather info from the mentioned city",
    format: "weather [city]",
    options: [{ type: "string", name: "city", description: "The city name", required: true }],
    async function(message, context) {
        const args = message.content.split(" ");
        if (!args[1]) return context.messageHandler.send(message, "You need to enter a city");
        args.shift();
        const city = args.join(" ");
        try {
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${context.config.weather_api_key}&units=metric&mode=JSON`,
            );
            const result = response.data;
            if (result.cod === 200) {
                const options = { timeZone: "UTC" };
                const sunrise = new Date((result.sys.sunrise + result.timezone) * 1000).toLocaleTimeString(
                    "en-UK",
                    options,
                );
                const sunset = new Date((result.sys.sunset + result.timezone) * 1000).toLocaleTimeString(
                    "en-UK",
                    options,
                );
                const weatherEmbed = new discord.EmbedBuilder()
                    .setColor(context.config.color_hex)
                    .setTitle(`Weather in ${result.name} ${result.sys.country}`)
                    .setThumbnail(`https://openweathermap.org/img/wn/${result.weather[0].icon}@2x.png`)
                    .addFields(
                        { name: "Current Weather", value: capitalize(result.weather[0].description) },
                        { name: "Temperature", value: `${result.main.temp}°C`, inline: true },
                        { name: "Feels like", value: `${result.main.feels_like}°C`, inline: true },
                        { name: "Humidity", value: `${result.main.humidity}%`, inline: true },
                        { name: "Wind", value: `${result.wind.speed}m/s`, inline: true },
                        { name: "Clouds", value: `${result.clouds.all}%`, inline: true },
                        { name: "Pressure", value: `${result.main.pressure}hPa`, inline: true },
                        { name: "Sunrise", value: sunrise, inline: true },
                        { name: "Sunset", value: sunset, inline: true },
                    );
                context.messageHandler.send(message, { embeds: [weatherEmbed] });
            } else {
                context.messageHandler.send(message, capitalize(result.message));
                context.logger.warn(`Weather error on ${city}`);
            }
        } catch (err) {
            context.logger.error(toError(err));
            context.messageHandler.send(message, "Failed to fetch weather data");
        }
    },
} satisfies ICommand;
