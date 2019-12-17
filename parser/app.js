var app = require('express')();
var http = require('http').createServer(app);
const https = require('https');
var path = require('path');
var cors = require('cors');
const fs = require('fs');
var io = require('socket.io')(http);
var parser = require('./scripts/parser.js');
var capm = require('./scripts/capm.js');
const got = require('got');
var numeral = require('numeral');
var moment = require('moment');
var now = require("performance-now");
var schedule = require('node-schedule');
const { init } = require('./scripts/db');
//set a cron job to execute the CAPM data set every 6 hours forever more...
//0 */6 * * *
var cronCAPM = schedule.scheduleJob('0 */6 * * *', function(){
  console.info('CAPM Cron Job scheduler kicked off');
  reloadCAPMData('cronCAPM');
  console.info('Finished CAPM Cron Job scheduler');
});

function reloadCAPMData(reason){
  console.log('Reloading the CAPM data for the latest release due to : ' + reason);
  if((process.env.CAPM_URL==null)||(process.env.CAPM_URL.indexOf('http')==-1)){
    console.log('CAPM_URL is not set correctly so no CAPM data will be reload: ' + process.env.CAPM_URL);
  }else{
    console.time('reloadCAPMData');
    try {
      var allReleasesFileContents = fs.readFileSync(allReleasesFile);  
      var allReleaseObjects = JSON.parse(allReleasesFileContents);
      var capmData = capm.processLastRelease(allReleaseObjects, reason);
        
    } catch (error) {
      console.error('Unbale to load releases and kick off cron job');
      console.dir(error);
    }
    console.timeEnd('reloadCAPMData');
  }
}


//I need to set a few environment variables and load them from an external file
//the path is always where Im running?
//var rootPath =  path.join(process.cwd(),'..');
console.log('Setting rootPath');
var rootPath =  path.join(process.cwd(),'.env');
var envVar = require('dotenv').config({path:rootPath, debug: process.env.DEBUG});
if(envVar.error!=null){
  console.dir(envVar.error);
  a=ErrorInFetchingEnvVar;
}
console.log('rootPath set OK to ' + rootPath);
console.log(process.env.DATA_DIR);

if(process.env.DATA_DIR==null){
  console.dir(process.env);
  console.log("DATA_DIR directory not found in .env file : process.env.DATA_DIR=" + process.env.DATA_DIR);
  a=ErrorInFetchingEnvVar;
}
var lastUpdatedDataFileName = path.join(process.env.DATA_DIR,'lastUpdated.json');
var allReleasesFile = path.join(process.env.DATA_DIR,'allReleasesFile.json');
var parserLogFilePath = path.join(process.env.LOGS_DIR,'parser.log');
console.log('Parser log is located at ' + parserLogFilePath);

//I wonder how big a single object can be?

app.use(cors());
app.get('/ping', function(req, res) {
  console.log('Someone pinged me');
  var desc = 'Ping come and result sent via ' + process.env.PARSER_HOSTURL+':'+process.env.PARSER_PORT;
  res.json({result:true, description:desc});
});
app.get('/touchfile', function(req, res) {
    console.log('Pretending the touch file was touched');
    processAllData('API_Invoked');
});
app.get('/reLoadCAPMData', function(req, res) {
  console.log('Reloading the CAPM data for the latest release as requested from GET');
  reloadCAPMData('API_Invoked');
  console.log('Finished the reload of CAPM data from GET');
});

http.listen(process.env.PARSER_PORT, function(){
  //do a post?
  console.log('listening on : ' + process.env.PARSER_PORT);
  console.log('Parser URL : ' + process.env.PARSER_HOSTURL);
  console.log('CallBack URL : ' + process.env.PARSER_HOSTURL+':'+process.env.PARSER_PORT);
  console.log('About to run the parser at startup');
  console.log('Startup database then process');
  console.log('Databse details MONGO_DB_URL=' + process.env.MONGO_DB_URL);
  console.log('Databse details XPATH_MONGO_DB_NAME=' + process.env.XPATH_MONGO_DB_NAME);
  console.log('Databse details XPATH_MONGO_DB_COLLECTION=' + process.env.XPATH_MONGO_DB_COLLECTION);
  console.log('Databse details XPATH_SEARCH_LIMIT=' + process.env.XPATH_SEARCH_LIMIT);
  init().then(() => {
    processAllData('Startup');
  })
});

function requestRouterReLoad(){
  var requestTime = moment().format("YYYY-MM-DD hh:mm:ss.SSS");
  got(process.env.ROUTER_HOSTURL+':'+process.env.ROUTER_PORT+'/requestRefresh', { json: true }).then(response => {
      console.log('Requested Router to reload data at ' + requestTime + '. Router reloaded at ' + response.body.reloadRequestTime);
  }).catch(error => {
    console.log('Error in request reload from router at '+requestTime+'...is router available?')
    console.log(error);
  });
}

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});



fs.watchFile(process.env.TOUCH_FILE, (eventType, filename) => {
  console.log('file has been touched');    
  if (filename) {
    console.log('filename provided: ' + process.env.TOUCH_FILE);
    processAllData('Touch File Triggered');
  } else {
    console.log('filename not provided');
  }
});

function processAllData(reason){
    console.log('Process Reason:' + reason);
    //read this file in
    try {
        var start = now();
        preWriteObj = {};
        var preNow = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
        preWriteObj.startedProcess = preNow;
        preWriteObj.lastUpdatedTimeStamp = preNow;
        preWriteObj.start = start.toFixed(3);
        preWriteObj.reason = reason;
        //io.emit('chat message', 'Started process at : ' + preNow);
        writeToFileSync(JSON.stringify(preWriteObj), lastUpdatedDataFileName);
        //do the processing here
        
        
        var allReleaseObjects = parser.allReleases();
        console.log('About to write the allReleaseObjects to file');
        writeToFileSync(JSON.stringify(allReleaseObjects), allReleasesFile);
        console.log('Succesfully written the allReleaseObjects');
        //After reloading execute the CAPM data reload as well
        reloadCAPMData(reason);


        var end = now()
        postWriteObj = {};
        var postNow = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
        postWriteObj.startedProcess = preNow;
        postWriteObj.finishedProcess = postNow;
        preWriteObj.start = start.toFixed(3);
        postWriteObj.end = end.toFixed(3);
        postWriteObj.processTimeMS = (end-start).toFixed(3);
        postWriteObj.processTimeSec = ((end-start)/1000).toFixed(3);
        var prettyDuration = millisToMinutesAndSeconds(postWriteObj.processTimeMS);
        postWriteObj.duration = prettyDuration;
        postWriteObj.lastUpdatedTimeStamp = postNow;
        //io.emit('chat message', 'Successfully processed at : ' + postNow);
        updateParserLastUpdatedFile(postWriteObj);
        allReleaseObjects = null;
        console.log('Successfully Processed all Data to disk in ' + postWriteObj.duration) + ' minutes.';
        console.log('Requesting Router to Reload data post parsing');
        requestRouterReLoad();

    } catch (err) {
      console.log(err);

      var resultError = {};
      resultError.parserError = err;
      resultError.description = "Failed to read the release object from " + process.env.RELEASE_FILE;
      resultError.logDirectory = process.env.LOGS_DIR;
      resultError.env = process.env;
      //can I read the log file?
      console.log(resultError);
      try {
        var parserLogFile = fs.readFileSync(parserLogFilePath, process.env.LOGS_ENCODING);  
        var parserLogFileContents = routerLogFile.toString();      
        
  //just get the last 20 lines
  
        } catch (error) {
          var parserLogFileContents = error;
        }
      resultError.parserLog = parserLogFileContents;
      updateParserLastUpdatedFile(resultError);
      console.error('Died');
    }
}

function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

function writeToFileSync(contents, fileNamePath){
    fs.writeFileSync(fileNamePath, contents);
    //console.log('Saved new file : ' + fileNamePath);
    //io.emit('chat message', 'Saved new file : ' + fileNamePath);
}
function updateParserLastUpdatedFile(resultObject){
  //load the last updated file from disk
  
  var lastUpdatedObject = getLastUpdatedJSON();
  if(lastUpdatedObject.valid==true){
      //overwrite the data but keep CAPM if it exists?
      
      
      if(lastUpdatedObject.CAPM!=null){
        resultObject.CAPM = lastUpdatedObject.CAPM;        
      }
      //write this file back to disk!
      try {
          fs.writeFileSync(lastUpdatedObject.fileName, JSON.stringify(resultObject));
      } catch (error) {
         console.error(error) 
      }
      
  }else{
      console.error('Cant read the last updated file?')
  }
  //add the CAPM details

  //save the new object back out
}
function getLastUpdatedJSON(){
  try {
      var content = fs.readFileSync(lastUpdatedDataFileName, 'utf-8');
      var readObj = JSON.parse(content);    
      readObj.valid = true;
      readObj.fileName = lastUpdatedDataFileName;
      return readObj;
  } catch (error) {
      error.valid = false;
      return error;
  }
}

