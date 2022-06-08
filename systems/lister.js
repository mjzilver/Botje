class Lister {
    constructor() {
    }

    process(message) {
        const mention = message.mentions.users.first()
        if(mention)
            mention(message)
        else {
            
        }
    }

    mention() {
        
    }
    
    perPerson() {
        
    }

    perTopic() {
        
    }

    percentage() {
        
    }
}
