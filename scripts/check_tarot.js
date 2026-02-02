const path = require("path")
const cardData = require("../json/card_data.json")

function guessFilename(card) {
    if (card.type === "major") {
        return `${String(card.value_int).padStart(2, "0")}-${card.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}.png`
    } else if (card.type === "minor") {
        const suit = card.suit.charAt(0).toUpperCase() + card.suit.slice(1)
        const num = String(card.value_int).padStart(2, "0")
        return `${suit}${num}.png`
    }
    return null
}

for (const card of cardData) {
    const filename = guessFilename(card)
    if (!filename) {
        console.log(`Could not determine filename for card: ${card.name}`)
        continue
    }

    const filepath = path.join(__dirname, "../assets/tarot", filename)
    
    const fs = require("fs")
    if (!fs.existsSync(filepath)) {
        console.log(`Missing file for card: ${card.name} expected at ${filename}`)
    }

}