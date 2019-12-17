const { MongoClient } = require('mongodb')

let db
let collection
const init = () =>
    MongoClient.connect("mongodb://fdclstvci401.s2.linux.stratus.vlab:27017", { useNewUrlParser: true, useUnifiedTopology: true }).then((client) => {
        console.log("Database instance " + "mongodb://fdclstvci401.s2.linux.stratus.vlab:27017" + "connected Successfully");
        db = client.db("xpathsearch");
        console.log("Database name " + "xpathsearch" + " connected Successfully");
        collection = db.collection("xpaths");
        console.log("Database collection " + "xpaths" + " connected Successfully");
    }
)

const fuzzySearch = (searchTerm, limit) => {
  return collection.find({name: {$regex: new RegExp(searchTerm, "ig")}}).limit(limit).toArray();
}

module.exports = { init, fuzzySearch }