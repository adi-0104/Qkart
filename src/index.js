const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/config");

let server;

// TODO: CRIO_TASK_MODULE_UNDERSTANDING_BASICS - Create Mongo connection and get the express app to listen on config.port

//make db connection
mongoose.connect(config.mongoose.url,config.mongoose.options).then(() => {
    console.log("connected to mongoDB at " + config.mongoose.url)
}).catch(() => console.log("failed to connect"));



//make http connection
app.listen(config.port, () => console.log("Server connected successfully to port " + config.port))
