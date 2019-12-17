var app = require('express')();
var http = require('http').createServer(app);
var path = require('path');
var cors = require('cors');
const fs = require('fs');
var io = require('socket.io')(http);
var moment = require('moment');
var now = require("performance-now");
const { init, fuzzySearch } = require('./scripts/db');

console.log('Setting rootPath');
var rootPath =  path.join(process.cwd(),'.env');
var envVar = require('dotenv').config({path:rootPath, debug: process.env.DEBUG});
if(envVar.error!=null){
  console.dir(envVar.error);
  a=ErrorInFetchingEnvVar;
}
console.log('rootPath set OK to ' + rootPath);
console.log(process.env.DATA_DIR);
var routerLogFilePath = path.join(process.env.LOGS_DIR,'router.log');
var parserLogFilePath = path.join(process.env.LOGS_DIR,'parser.log');
console.log('Router log is located at ' + routerLogFilePath);
console.log('Router log is located at ' + parserLogFilePath);

if(process.env.DATA_DIR==null){
  console.dir(process.env);
  console.log("DATA_DIR directory not found in .env file : process.env.DATA_DIR=" + process.env.DATA_DIR);
  a=ErrorInFetchingEnvVar;
}
var lastUpdatedDataFileName = path.join(process.env.DATA_DIR,'lastUpdated.json');

var touchFileName = process.env.TOUCH_FILE;
var summaryData = {result:false, description:'Summary Data not yet loaded'};
/*This file just routes stuff around and reads the files from disk. 
Its reliant on Parser having already created everything required.

There is a few routes in here that manage where the whole process is up to but the focus is on 
making sure parser is a background process and router can always serve up everything
*/
app.use(cors());
http.listen(process.env.ROUTER_PORT, function(){
    console.log('listening on : ' + process.env.ROUTER_PORT);
    console.log('Parser URL : ' + process.env.ROUTER_HOSTURL);
    console.log('CallBack URL : ' + process.env.ROUTER_HOSTURL+':'+process.env.ROUTER_PORT);
    console.log('About to load the summary object from disk and wait for someone to want it');
    console.time('loadSummaryData');
    init().then(() => {
        loadSummaryData('Startup', true);
    });
    console.timeEnd('loadSummaryData');
    console.log('Completed the summary load?');
  });

  app.get('/fuzzySearch/:searchTerm', (req, res) => {
    const { searchTerm } = req.params;
    var limitStr = req.query.limit; 
    var limit = 50;
    try {
        var testlimit = parseInt(limitStr);
        if(testlimit.isInteger!=true){
            limit = testlimit;
        }
    } catch (error) {
        
    }
    console.log('Passing in a limit of ' + limit);
    fuzzySearch(searchTerm.trim().toLowerCase(), limit)
      .then((items) => {
        items = items.map((item) => ({
          id: item._id,
          name: item.name,
          modelName: item.modelName,
          releaseName: item.releaseName,
          usageList: item.usageList
        }))
        res.json(items)
      })
      .catch((err) => {
        console.log(err)
        res.status(500).end()
      })
  })  

  app.get("/requestRefresh", function(req, res) {
       loadSummaryData("PostInitiated", true);
       var nowTime = moment().format("YYYY-MM-DD hh:mm:ss.SSS");
       res.json({refresh:true, reloadRequestTime:nowTime});
       console.log('Done with the post reload');
});  
function loadSummaryData(reason, forceDiskReload){
    //I have to find the relative path to 
    console.log('Loading Summary Data into memory due to ' + reason);
    var allReleasesFile = path.join(process.env.DATA_DIR,'allReleasesFile.json');
    if(forceDiskReload){
        try {
            var content = fs.readFileSync(allReleasesFile, 'utf-8');
            parsedContent = JSON.parse(content);
            summaryData = parsedContent;    
        } catch (error) {
            return error;
        }
    }
    fs.readFile(allReleasesFile, 'utf-8', function(err, content) {
        var parsedContent = JSON.parse(content);
        summaryData = parsedContent;
    });
}
app.get('/getSummary', function(req, res) {
    console.time('getSummary');
    //sometime the data has not yet finished being porcessed?
    if(summaryData!=null){
        res.json(summaryData);
    }else{
        res.json({result:false, description:'No Summary Data found'});
    }
    console.timeEnd('getSummary');
});  
app.get('/getSummaryHTML', function(req, res) {
    console.time('getSummaryHTML');
    //sometime the data has not yet finished being procssed?
    if((summaryData!=null)&&(summaryData.serviceRepository!=null)&&(summaryData.serviceRepository.length>0)){
        //res.send(summaryData);
        console.log('Successful');
        let updated = now();
        //var htmlMsg = '<!DOCTYPE html><html><head><title>Success</title></head><body><h1>Yes</h1><p>'+updated+'</p></body></html>';
        var htmlMsg = '<center><h1>Yes</h1><p>'+updated+'</p></center>';
        for(let i = 0;i<summaryData.serviceRepository.length;i++){
            let releaseObject = summaryData.serviceRepository[i];
            htmlMsg+='<center>';
            htmlMsg+=releaseObject.name + '<br>';
            htmlMsg+='</center>';
        }
        res.send(htmlMsg);
    }else{
        console.log('Error');
        res.send('<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Yes</h1></body></html>');
    }
    console.timeEnd('getSummaryHTML');
})
app.get('/getSummaryFromDisk', function(req, res) {
    console.time('getSummaryFromDisk');
    loadSummaryData('getSummaryFromDisk', true);
    if(summaryData!=null){
        res.json(summaryData);
    }else{
        res.json({result:false, description:'No Summary Data found from disk load'});
    }
    console.timeEnd('getSummaryFromDisk');
});  

app.get('/ping', function(req, res) {
  //this simply returns and object with vlaid == true so we can see that the server side processing is up and running...
  res.json({ valid: true });
});
app.get('/getDependencyWheelData', function(req, res) {
    //this simply returns the dependency wheel data, its bog so not maintained in memory
    var filePath = path.join(process.env.DATA_DIR,'systemDependencyWheelData.json'); 
    
    //now simply get this file from disk? It should get updated to filePath but  
    fs.readFile(filePath, 'utf-8', function(err, content) {
        if (err) {
            res.json({error : err});
        } else {
            var readObj = JSON.parse(content);
            res.json(readObj);
        }
    });
});
app.get('/getSystemListData', function(req, res) {
    //this simply returns the dependency wheel data, its bog so not maintained in memory
    var filePath = path.join(process.env.DATA_DIR,'systemListData.json'); 
    
    //now simply get this file from disk? It should get updated to filePath but  
    fs.readFile(filePath, 'utf-8', function(err, content) {
        if (err) {
            res.json({error : err});
        } else {
            var readObj = JSON.parse(content);
            res.json(readObj);
        }
    });
});
app.get('/getFile', function(req, res) {
    //this simply returns and object with vlaid == true so we can see that the server side processing is up and running...
    //need the parms?
    //var filePath = req.query.callBackURL; 
    var filePath = req.query.filePath; 
    //now simply get this file from disk? It should get updated to filePath but  
    fs.readFile(filePath, 'utf-8', function(err, content) {
        if (err) {
            res.json({error : err});
        } else {
            var readObj = JSON.parse(content);
            res.json(readObj);
        }
    });
});
app.get('/getServiceModels', function(req, res) {
    //this simply returns and object with vlaid == true so we can see that the server side processing is up and running...
    //need the parms?
    var releaseName = req.query.releaseName;  
    var serviceModelName = req.query.serviceModelName;  
    //now go feth these from disk I think but wait till I have written....
    var a = summaryData;
    for (var i = 0;i<summaryData.serviceRepository.length;i++){
        var release = summaryData.serviceRepository[0];
        if(release.name==releaseName){
            //now get the models
            for (var k = 0;k<release.serviceModels.length;k++){
                if(release.serviceModels[k].name==serviceModelName){
                    var serviceModel = release.serviceModels[k];
                    res.json(serviceModel);
                    return false;
                }
            }    
        }
    }
    fs.readFile(releasesDataFileName, 'utf-8', function(err, content) {
          if (err) {
              res.json({error : err});
              
          } else {
              var readObj = JSON.parse(content);
              res.json(readObj);
          }
      });            
    
  });

app.get('/getReleases', function(req, res) {
  //this simply returns and object with vlaid == true so we can see that the server side processing is up and running...
    fs.readFile(releasesDataFileName, 'utf-8', function(err, content) {
        if (err) {
            res.json({error : err});
            
        } else {
            var readObj = JSON.parse(content);
            res.json(readObj);
        }
    });            
  
});
app.get('/getStatus', function(req, res) {
    console.time('getStatus');
    var result = {};
    result.routerAvailable = true;
    result.environment = process.env;
    //get Status gathers a bunch of stuff and tries to make heads of it all
    var lastUpdated = getLastUpdatedJSON();
    if(lastUpdated.error!=null){
        result.lastUpdated = lastUpdated.error;
    }else{
        result.lastUpdated = lastUpdated;
    }
    
    //try and the logs?
    try {
        var routerLogFile = fs.readFileSync(routerLogFilePath, process.env.LOGS_ENCODING);  
        //just get the last 20 lines
        var routerLogFileContents = routerLogFile.toString();
      } catch (error) {
        var routerLogFileContents = error;
      }
      try {
        var parserLogFile = fs.readFileSync(parserLogFilePath, process.env.LOGS_ENCODING);  
        //just get the last 20 lines
        var parserLogFileContents = parserLogFile.toString();
      } catch (error) {
        var parserLogFileContents = error;
      }
      result.routerLogFile = routerLogFileContents;
      result.parserLogFile = parserLogFileContents;
      res.json(result);
      console.timeEnd('getStatus');
});
  
app.get('/getLastUpdated', function(req, res) {
    //if a parm exists to render html then do that instead?
    var htmlFlag = req.query.htmlFlag; 
    console.time('getLastUpdated');
    var lastUpdated = getLastUpdatedJSON();
    if(htmlFlag){
        var htmlMsg = '';
        htmlMsg +='<table width="100%" cellspacing="8" cellpadding="5px" border="2" align="center">';
        htmlMsg +='<thead>';
        htmlMsg +='<tr>';
        htmlMsg +='<th>';
        htmlMsg +='Description';
        htmlMsg +='</th>';
        htmlMsg +='<th>';
        htmlMsg +='Times and Dates';
        htmlMsg +='</th>';
        htmlMsg +='</tr>';
        htmlMsg +='</thead>';
        htmlMsg +='<tbody>';
        if(lastUpdated!=null){
            
            htmlMsg += '<tr><td>Started</td><td>'+ lastUpdated.startedProcess + '</td></tr>';
            htmlMsg += '<tr><td>Finshed</td><td>'+ lastUpdated.finishedProcess + '</td></tr>';
            htmlMsg += '<tr><td>Duration</td><td>'+ lastUpdated.duration.split(':')[0] + ' mins '+ lastUpdated.duration.split(':')[1] +' secs</td></tr>';
        }else{
            htmlMsg = '<h1>Last updated wasnt found</h1>';
        }
        htmlMsg +='</tbody>';
        htmlMsg +='</table>'
        res.send(htmlMsg);
    }else{
        res.json(lastUpdated);
    }
    
    console.timeEnd('getLastUpdated');            
});
function getLastUpdatedJSON(){
    try {
        var content = fs.readFileSync(lastUpdatedDataFileName, 'utf-8');
        var readObj = JSON.parse(content);    
        return readObj;
    } catch (error) {
        return {error};
    }
}

app.get('/touchfile', function(req, res) {
    console.log('Pretending the touch file was touched');
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    processAllData('API_Invoked');
});
   
io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
});


fs.watchFile(touchFileName, (eventType, filename) => {
  console.log('file has been touched');    
  //var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  //if (filename) {
    //console.log('filename provided: ' + touchFileName);
    //processAllData('Touch File Triggered');
  //} else {
    //console.log('filename not provided');
  //}
});

