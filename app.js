const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const validURL = require('valid-url')
const axios = require('axios')
const Promise = require('bluebird')
const shortid = require('shortid')

const config = require('./config')


const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(path.join(__dirname, 'public')))

const indexFile = path.join(__dirname, 'views/index.html')

mongoose.Promise = Promise
const connected = mongoose.connect(`mongodb://${config.dbhost}/${config.dbname}`, {
    useMongoClient: true
})

const urlModel = require('./models/url')


const validateURL = (req, res, next) => {
    const longURL = req.body.longurl
    if (!validURL.isUri(longURL)) {
        return res.status(400).json({
            message: "url is invalid"
        })
    }
    next()
}

// This is optional but it's better if we'll check a real url on internet 
const checkURLConnection = async (req, res, next) => {
    const longURL = req.body.longurl
    const response = await axios.get(longURL)
    if (!response && response.statusCode != 200) {
        return res.status(400).json({
            message: "Can't find url in internet"
        })
    }
    next()
}

const checkExistingURL = async (req, res, next) => {
    const longURL = req.body.longurl
    try {
        const result = await urlModel.findOne({longurl: longURL})
        if (result) {
            return res.status(200).json({
                message: "This url already in storage",
                shorturl: `${config.host}${result.shorturl}`
            })
        }
    } catch(err)  {
        return res.status(500).json({
            message: `Check existing url error ${err}` 
        })
    }
    next()
}

const checkCustomShortURL = async (req, res, next) => {
    const customshortURL = req.body.customshorturl
    if (!customshortURL) {
        next()
    } 
    try {
        const result = await urlModel.findOne({shorturl: customshortURL})
        if (result) {
            return res.status(400).json({
                message: "This short url already taken",
            })
        }
        next()
    } catch(err)  {
        return res.status(500).json({
            message: `Check existing url error ${err}` 
        })
    }
}


const urlValidation = [
    validateURL,
    checkURLConnection,
    checkExistingURL,
    checkCustomShortURL
]


app.get('/', (req, res) => {
    res.sendFile(indexFile)
})

app.post('/api/v1/shortener', urlValidation, async (req, res) => {
    const longurl = req.body.longurl
    const customshortURL = req.body.customshorturl

    let shortURL = shortid.generate()
    if (customshortURL) {
        shortURL = customshortURL
    }


    const newURL = urlModel({ longurl, shorturl: shortURL, created: new Date() })
    try {
        await newURL.save()
        return res.status(200).json({
            message: "Create shorter url complete",
            shorturl: `${config.host}${shortURL}`
        })
    } catch(err) {
        res.status(500).json({
            message: `Save error: ${err}`
        })
    } 
})

app.get('/:shorturl', async (req, res) => {
    const shortURL = req.params.shorturl
    try {
        const result = await urlModel.findOne({ shorturl: shortURL })
        res.writeHead(301, {
            'Location': result.longurl
        })
        res.end()
    } catch (err) {
        return res.status(500).json({
            message: `Get short url error: ${err}`
        })
    }

}) 


app.listen(3000, () => {
    console.log("Example url shortener listenning on port 3000")
})