const mongoose = require('mongoose')
const Schema = mongoose.Schema

const urlSchema = new Schema({
    longurl: {type: String, unique: true},
    shorturl: {type: String, unique: true},
    created: Date
})

const urlshortener = mongoose.model('url', urlSchema)
module.exports = urlshortener 