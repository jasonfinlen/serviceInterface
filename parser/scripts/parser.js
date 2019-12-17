// parser.js
// ========
const fs = require('fs');
var path = require('path');
var showdown  = require('showdown');
const BSON = require('bson');
converter = new showdown.Converter();
converter.setOption('headerLevelStart', 3);
converter.setOption('simpleLineBreaks', true);
const { deleteManyFromXPath, addManyFromXPath } = require('./db');
const winston = require('winston');

var globalRecursiveList = [];

module.exports = {
  allReleases: function () {
    return processallReleases();
  },
  getSummary: function (inObject, shallowFlag) {
    if(typeof inObject!=='object'){
        return inObject;
    }else{
        return getSummary(inObject, shallowFlag, true);
    }
  } ,
  
  processXPathSearchExt: function (inObject) {
    return processXPathSearch(inObject);
  }
};

function getSummary(inObject, shallowFlag, firstCallFlag){
    var outObject = {};
    //is this an array or an object?
    if((isArray(inObject))&&(firstCallFlag)){
        if(inObject.length==1){
            outObject = getSummary(inObject[0], false, true);
        }else{
            outObject = [];
            for(var k = 0;k<inObject.length;k++){
                var summaryObject = getSummary(inObject[k], false, false);    
                outObject.push(summaryObject);
            }            
        }
    }else{
        for (var key in inObject) {
            var keyValue = inObject[key];
            //deal with objects and arrays...
            var isArrayFlag = isArray(keyValue);
            var isObjectFlag = typeof keyValue=='object';
            var hasOwnPropertyFlag = inObject.hasOwnProperty(key);
            if((isArrayFlag)&&(shallowFlag!=true)){
                var firstArray = keyValue;
                //create an empty array to push into
                outObject[key] = [];
                for(var i = 0;i<firstArray.length;i++){
                    var arrayObject = firstArray[i];
                    //recall getSummary to summarise every thing under this provided this isnt an array or arrays?
                    var summaryObject = getSummary(arrayObject, true);    
                    outObject[key].push(summaryObject);
                }
            }else if ((isObjectFlag)&&(shallowFlag!=true)){
                var summaryObject = getSummary(keyValue, true);    
                outObject[key] = summaryObject;    
            }else if ((isObjectFlag!=true)&&(isArrayFlag!=true)&&(hasOwnPropertyFlag)){
                //this means the keyValue isnt an array and isnt an object, just a simple type
                outObject[key] = keyValue;    
            }
        }
    
    }
    return outObject;
}

function createSummaryObject(serviceObject){
    var sumServiceObject = {};
    for (var key in serviceObject) {
        if (serviceObject.hasOwnProperty(key)) {
            if((key=='MessagePattern')||(key=='changeList')||(key=='changeDescriptions')||(key=='shortChangeDescriptions')){
                sumServiceObject[key] = serviceObject[key];
            }else if(key=='schemaList'){
                sumServiceObject.schemaList = [];
                //for each file add the same level
                for(var k = 0;k<serviceObject[key].length;k++){
                    var sumFileObject = {};
                    var fileObj = serviceObject[key][k];
                    for (var key2 in fileObj) {
                        if (fileObj.hasOwnProperty(key2)) {
                            if (typeof fileObj[key2] != 'object'){
                                sumFileObject[key2] = fileObj[key2];
                            }    
                        }
                    }
                    sumServiceObject.schemaList.push(sumFileObject);
                }
            }
            else if (typeof serviceObject[key] != 'object'){
                sumServiceObject[key] = serviceObject[key];
            }
        }
    }
    return sumServiceObject;
        
}

function processallReleases(){
    console.time('allReleases');
    var serviceChangesArray = null;
    console.log('########### started processallReleases ###########');
    try{
        rawReleasesContents = fs.readFileSync(process.env.RELEASE_FILE, 'utf-8');
        var releaseObjectList = JSON.parse(rawReleasesContents);
    }catch(err){
        console.error(err);
        return err;
    }
    console.log('No errors in loading release file');
    
    //pick a release and start loading files
    var releaseList = releaseObjectList.releases;
    console.log('Processing ' + releaseList.length + ' releases.');
    var allProcessedReleaseList = [];
    //So here I should pair up the releases and get them loaded in pairs except the last release which I just wont load at all...
    for(var r = releaseList.length-1;r>0;--r){
        var currentRelease = releaseList[r];
        var previousRelease = releaseList[r-1];
        console.log('Round:' + r + ' - Comparing ' + currentRelease.releaseName + ' to ' + previousRelease.releaseName);
        var roundReleaseObject = processRelease(currentRelease);
        allProcessedReleaseList.push(roundReleaseObject);
    }
    console.timeEnd('allReleases');
    var resultObject = {};
    resultObject.serviceRepository = allProcessedReleaseList;
    return resultObject;
}

function readJSONFileSync(filePath){
    var rawContents;
    try{
        if (fs.existsSync(filePath)) {
            rawContents = fs.readFileSync(filePath, 'utf-8');
            var parsedContents = JSON.parse(rawContents);
            return parsedContents;
        }else{
            return null;
        }
    }catch(err){
        console.log('File exists but could not be loaded due to error loading:' + filePath);
        console.log(err);
        return null;
    }
}

function getCurrentAndPreviousFiles(repoDataDir, currentPath, previousPath, fileName){
    //so both current and previous files can be null...The file name is always the same name just in different paths!
    var currentObject = null;
    var previousObject = null;
    if((repoDataDir)&&(fileName)){
        if(currentPath){
            var currentFilePath = path.join(repoDataDir, currentPath, fileName);
            currentObject = readJSONFileSync(currentFilePath);
            currentObject.filename = currentFilePath;
        }
        if(previousPath){
            var previousFilePath = path.join(repoDataDir, previousPath, fileName);
            previousObject = readJSONFileSync(previousFilePath);
            previousObject.filename = previousFilePath;
        }
    }
    return {current : currentObject, previous : previousObject};
}

function processRelease(release){
    //so now I want to get all the SOA files and read them in?
    console.time('SyncLoadFiles');
    var preSize = BSON.calculateObjectSize(release);
    console.log(preSize);
    var processedModels = [];
    var unProcessedModels = [];
    //modelFile, readMeFile, buildFile
    var serviceModels = release.serviceModels;
    //now for each model I should be able to process 1 by 1 the eact same way...
    for(var l = 0;l<serviceModels.length;++l){
        var modelObj = serviceModels[l];
        //attempts should be made to see if each file exists?
        //modelFile, readMeFile, buildFile
        var bothModels = getCurrentAndPreviousFiles(process.env.REPO_SITE_DIR, modelObj.branch, modelObj.previous_branch, modelObj.modelFile);
        var bothReadMe = getCurrentAndPreviousFiles(process.env.REPO_SITE_DIR, modelObj.branch, modelObj.previous_branch, modelObj.readMeFile);
        var bothBuilds = getCurrentAndPreviousFiles(process.env.REPO_SITE_DIR, modelObj.branch, modelObj.previous_branch, modelObj.buildFile);
        var bothAutoPopulates = getCurrentAndPreviousFiles(process.env.REPO_SITE_DIR, modelObj.branch, modelObj.previous_branch, modelObj.autoPopulate);
        if(bothModels.current===null){
            //exit early as models dont exist for the current release...
            unProcessedModels.push(modelObj);
            break;
        }else{
            //I can start processing
            var timerAppend = '_' + modelObj.name + '_' + release.releaseName;
            console.log('Start of processing for timers'+timerAppend);
            console.time('Processing' + timerAppend);
            
            console.time('processGenericSchemaList' + '_' + 'current_Models' + timerAppend);
            var current_Models = processGenericSchemaList(bothModels.current, bothReadMe.current, bothAutoPopulates.current, bothBuilds.current, modelObj);
            console.timeEnd('processGenericSchemaList' + '_' + 'current_Models' + timerAppend);
            
            console.time('processGenericSchemaList' + '_' + 'previous_Models' + timerAppend);
            var previous_Models = processGenericSchemaList(bothModels.previous, bothReadMe.previous, bothAutoPopulates.previous, bothBuilds.previous, modelObj);
            console.timeEnd('processGenericSchemaList' + '_' + 'previous_Models' + timerAppend);
            
            console.time('processSchemaData' + timerAppend);
            var all_Models = processSchemaData(current_Models, previous_Models, null, null);
            console.timeEnd('processSchemaData' + timerAppend);

            console.time('compareReleases' + timerAppend);
            var all_Models_Final = compareReleases(all_Models);
            console.timeEnd('compareReleases' + timerAppend);

            console.time('buildModelsObject' + timerAppend);
            var finalModels = buildModelsObject(bothBuilds.current, bothBuilds.current,all_Models_Final);
            finalModels.name = modelObj.name;
            finalModels.description = modelObj.description;
            console.timeEnd('buildModelsObject' + timerAppend);

            console.time('processXPathSearch' + timerAppend);
            processXPathSearch(all_Models_Final, release.releaseName, finalModels);
            console.timeEnd('processXPathSearch' + timerAppend);

            processedModels.push(finalModels);
            all_Models = null;
            all_Models_Final = null;
            console.timeEnd('Processing' + timerAppend);
        
            
        }
    }
    var returnObj = cleanReleaseObject(release, processedModels);
    

    console.timeEnd('ProcessSchemas');
    return returnObj;    
    

    
    var releaseObj = current_Release;
    releaseObj.previousRelease = previous_Release;
    var serviceModels = [];
    console.log('current_ReleaseName:' + current_Release.releaseName);
    //console.log('currentSOAaBranchName:' + current_Release.soaBranchName);
    //console.log('PreviousSOAaBranchName:' + previous_Release.soaBranchName);
    //e models
    console.time('eModels');
    
    var current_Enterprise_Models = processGenericSchemaList(current_Enterprise_XSD, current_Enterprise_ReadMe, current_MacroAutoPopulate, current_Enterprise_BuildInfo, current_Release);
    var previous_Enterprise_Models = processGenericSchemaList(previous_Enterprise_XSD, previous_Enterprise_ReadMe, previous_MacroAutoPopulate, previous_Enterprise_BuildInfo, previous_Release);
    var all_Enterprise_Models = processSchemaData(current_Enterprise_Models, previous_Enterprise_Models, null, null);
    var all_Enterprise_Models_Final = compareReleases(all_Enterprise_Models);
    var eModels = buildModelsObject(current_Enterprise_BuildInfo, previous_Enterprise_BuildInfo,all_Enterprise_Models_Final);
    eModels.name = 'Enterprise';
    processXPathSearch(all_Enterprise_Models_Final, current_Release.releaseName, eModels);
    serviceModels.push(eModels);
    all_Enterprise_Models = null;
    all_Enterprise_Models_Final = null;
    console.timeEnd('eModels');
    //console.log(all_Enterprise_Models_Final);
    
    //p models
    console.time('pModels');
    var current_Provider_Models = processGenericSchemaList(current_Provider_XSD, current_Provider_ReadMe, current_MacroAutoPopulate, current_Provider_BuildInfo, current_Release);
    var previous_Provider_Models = processGenericSchemaList(previous_Provider_XSD, previous_Provider_ReadMe, previous_MacroAutoPopulate, previous_Provider_BuildInfo, previous_Release);
    var all_Provider_Models = processSchemaData(current_Provider_Models, previous_Provider_Models, current_Enterprise_Models, previous_Enterprise_Models);
    var all_Provider_Models_Final = compareReleases(all_Provider_Models);
    var pModels = buildModelsObject(current_Provider_BuildInfo, previous_Provider_BuildInfo,all_Provider_Models_Final);
    pModels.name = 'Provider';
    processXPathSearch(all_Provider_Models_Final, current_Release.releaseName, pModels);
    current_Provider_Models = null;
    previous_Provider_Models = null;
    all_Provider_Models = null;
    all_Provider_Models_Final = null;
    serviceModels.push(pModels);
    
    
    console.timeEnd('pModels');
    //i models
    console.time('iModels');
    var current_Integration_Models = processGenericSchemaList(current_Integration_XSD, current_Integration_ReadMe, current_MacroAutoPopulate, current_Integration_BuildInfo, current_Release);
    var previous_Integration_Models = processGenericSchemaList(previous_Integration_XSD, previous_Integration_ReadMe, previous_MacroAutoPopulate, previous_Integration_BuildInfo, previous_Release);
    var all_Integration_Models = processSchemaData(current_Integration_Models, previous_Integration_Models, current_Enterprise_Models, previous_Enterprise_Models);
    var all_Integration_Models_Final = compareReleases(all_Integration_Models);
    var iModels = buildModelsObject(current_Integration_BuildInfo, previous_Integration_BuildInfo,all_Integration_Models_Final);
    iModels.name = 'Integration';
    processXPathSearch(all_Integration_Models_Final, current_Release.releaseName, pModels);
    current_Integration_Models = null;
    previous_Integration_Models = null;
    all_Integration_Models = null;
    all_Integration_Models_Final = null;

    serviceModels.push(iModels);
    console.timeEnd('iModels');
    current_Enterprise_Models = null;
    previous_Enterprise_Models = null;

    //intel models
    console.time('intelModels');
    var current_Intel_Models = processGenericSchemaList(current_Intel_XSD, current_Intel_ReadMe, current_MacroAutoPopulate, current_Intel_BuildInfo, current_Release);
    var previous_Intel_Models = processGenericSchemaList(previous_Intel_XSD, previous_Intel_ReadMe, previous_MacroAutoPopulate, previous_Intel_BuildInfo, previous_Release);
    var all_Intel_Models = processSchemaData(current_Intel_Models, previous_Intel_Models, current_Enterprise_Models, previous_Enterprise_Models);
    var all_Intel_Models_Final = compareReleases(all_Intel_Models);
    var intelModels = buildModelsObject(current_Intel_BuildInfo, previous_Intel_BuildInfo,all_Intel_Models_Final);
    intelModels.name = 'Intel';
    processXPathSearch(all_Intel_Models_Final, current_Release.releaseName, intelModels);
    current_Intel_Models = null;
    previous_Intel_Models = null;
    all_Intel_Models = null;
    all_Intel_Models_Final = null;
    serviceModels.push(intelModels);
    console.timeEnd('intelModels');

    loadedReleases = null;
    //make a new object and include other stuff?
    
}

function processXPathSearch(allModelsList, releaseName, modelObj){
    var searchList = [];
    for(var i = 0;i<allModelsList.length;i++){
        var model = allModelsList[i];
        
        for(var k = 0;k<model.xPathList.length;k++){
            var xPath = model.xPathList[k];
            //var name = xPath.name;
            //get the last item from the key as the name?
            var name = xPath.key.split('/').pop();


            var shortname = xPath.shortname;

            if(name!='schema'){
                var smallXpath = {};
                
                //if the name doesnt have a namespace then use the model namespace?
                if(name.indexOf(':')==-1){
                    name = model.namespaceAlias + ':' + name;    
                }
                
                smallXpath.name = name;
                smallXpath.shortName = name.split(':').pop();
                smallXpath.modelName = modelObj.name;
                smallXpath.releaseName = releaseName;

                var found = false;
                for(var m = 0;m<searchList.length;m++){
                    var existingItem = searchList[m];
                    if(existingItem.name==name){
                        if(name=='educore:Occupation'){
                            var a = '';
                        }
                        //I could check if its used already as well...
                        var usageFound = false;
                        for(var n = 0;n<existingItem.usageList.length;n++){
                            var usage = existingItem.usageList[n];
                            if(usage.key==model.key){
                                //already seen it!
                                usage.count = usage.count + 1;
                                usage.shortnameList.push(shortname);
                                usageFound = true;
                            }
                        }
                        if(usageFound==false){
                            //this is a brand new instance of this field being used in this model but we have seen this field before?
                            var usageObject = {};
                            usageObject.ServiceNumber = model.ServiceNumber;
                            usageObject.ServiceName = model.ServiceName;
                            usageObject.ServiceVersion = model.ServiceVersion;
                            usageObject.key = model.key;
                            usageObject.count = 1;
                            usageObject.shortnameList = [shortname];
                            existingItem.usageList.push(usageObject);
                        }
                        //usageObject.shortnameList.push(shortname);
                        found = true;
                        break;
                    }
                }
                if(found==false){
                    //add this new item...
                    //usageObject.shortnameList.push(shortname);
                    var usageObject = {};
                    usageObject.ServiceNumber = model.ServiceNumber;
                    usageObject.ServiceName = model.ServiceName;
                    usageObject.ServiceVersion = model.ServiceVersion;
                    usageObject.key = model.key;
                    usageObject.count = 1;
                    usageObject.shortnameList = [shortname];
                    smallXpath.usageList = [usageObject];

                    searchList.push(smallXpath);
                }                
                
            }
        }
    }
    //write the object to disk...or add to my new database as well but only as an item by item basis...
    //delete many...
    
    deleteManyFromXPath({modelName: modelObj.name, releaseName: releaseName});
    //now add many into the db
    addManyFromXPath(searchList);
    var size = BSON.calculateObjectSize(searchList);
    var fileNamePath = path.join(process.env.DATA_DIR,releaseName + '.' + modelObj.name + '.xPathsearchList.json');
    var maxsize = 100*1000*1000;
    if(size<maxsize){
        try {
            var contents = JSON.stringify(searchList);    
            //mark it as an error as its stripped
        } catch (error) {
            var contents = JSON.stringify(error);
        }
    }else{
        //limit searchlist to only the first 100000 rows of data?
        var contents = JSON.stringify({error:'Search File exceeds max size', maxsize:maxsize,size:size,fileNamePath:fileNamePath,sizeDiff :size-maxsize});
    }
    var result = fs.writeFileSync(fileNamePath, contents);
    searchList=null;
    contents=null;
    var callBackURL = process.env.ROUTER_HOSTURL +':'+ process.env.ROUTER_PORT + '/getFile?filePath=' + fileNamePath;
    modelObj.searchCallBackURL = callBackURL;
}

function cleanReleaseObject(releaseObj, serviceModels){
   //console.log('cleanReleaseObject');
    var releaseSummaryObject = {};
    releaseSummaryObject.name = releaseObj.releaseName;
    releaseSummaryObject.releaseName = releaseObj.releaseName;
    //releaseSummaryObject.description = 'Comparing ' + releaseObj.releaseName + ' to ' + releaseObj.previousRelease.releaseName;
    releaseSummaryObject.description = 'Comparing ' + releaseObj.releaseName + ' to ' + 'Previous Release';
    releaseSummaryObject.release = releaseObj;
    releaseSummaryObject.fileName = path.join(process.env.DATA_DIR,releaseObj.releaseName + '.Summary.json');
    releaseSummaryObject.serviceModels = [];
    //I dont actually need the servicemodels but I do need the names and callbacks for each?
    for(var h = 0;h<serviceModels.length;h++){
        var serviceModel = serviceModels[h];
        //So the release Summary only needs to know the servicemodels names?
        var summaryServiceModel = {};
        summaryServiceModel.name = serviceModel.name;
        summaryServiceModel.buildInfo = serviceModel.buildInfo;
        summaryServiceModel.modelCount = serviceModel.models.length;
        var ssmfileName = releaseObj.releaseName + '.' + serviceModel.name + '.ServiceModels.json';
        var ssmfileNamePath = path.join(process.env.DATA_DIR,ssmfileName);
        summaryServiceModel.filename = ssmfileNamePath;
        var callBackURL = process.env.ROUTER_HOSTURL +':'+ process.env.ROUTER_PORT + '/getFile?filePath=' + summaryServiceModel.filename;
        summaryServiceModel.callBackURL = callBackURL;
        summaryServiceModel.searchCallBackURL = serviceModel.searchCallBackURL;
        releaseSummaryObject.serviceModels.push(summaryServiceModel);

        var finalModels = serviceModel.models;
        //var preSMSize = BSON.calculateObjectSize(serviceModel);
        var preSMSize = 10;
        for(var i = 0;i<finalModels.length;i++){
            var model = finalModels[i];
            //var preSize = BSON.calculateObjectSize(model);
            var preSize = 5;
            for(var j = 0;j<model.schemaList.length;j++){
                //remove the schema!
                var schema = model.schemaList[j];
                delete schema.schema;
            }
            
            //now before I delete stuff I want to write this to disk
            //create a very unique file name
            var fileName = releaseObj.releaseName + '.' + serviceModel.name + '.' + model.key + '.json';
            var fileNamePath = path.join(process.env.DATA_DIR,fileName);
            var callBackURL = process.env.ROUTER_HOSTURL +':'+ process.env.ROUTER_PORT + '/getFile?filePath=' + fileNamePath;
            
            model.errorFlag = writeServiceModelToDisk(fileNamePath, model);
            model.callBackURL = callBackURL;
            delete model.xPathList;
            delete model.release;
            delete model.changeList;
            delete model.changeDescriptions;
            delete model.shortChangeDescriptions;
            var schemaList = model.schemaList;
            for(var k = 0;k<schemaList.length;k++){
                var schema = schemaList[k];
                //delete some keys?
                delete schema.schema;
                delete schema.namespaces;
                delete schema.xPathList;
                delete schema.changeDescriptions;
                delete schema.changeList;

            }
            var postSize = BSON.calculateObjectSize(model);
            var reduceModelPec = (postSize/preSize*100).toFixed(3);
        }
        var postSMSize = BSON.calculateObjectSize(serviceModel);
        var reduceSMPec = (postSMSize/preSMSize*100).toFixed(3);
        writeServiceModelToDisk(ssmfileNamePath, serviceModel);
    }
    //for the return object also write this to disk as I odnt need everything in one big file!

    writeServiceModelToDisk(releaseSummaryObject.fileName, releaseSummaryObject);
    return releaseSummaryObject;
    
}

function writeServiceModelToDisk(fileNamePath, model){
    var errorFlag = false;
    //check the size?
    var size = BSON.calculateObjectSize(model);
    
    //192,854,386
    
    var maxsize = 100*1000*1000;
    if(size<maxsize){
        try {
            var contents = JSON.stringify(model);    
        } catch (error) {
            var contents = JSON.stringify(error);
            errorFlag = true;
        }
    }else{
       //console.log(fileNamePath + ':' + size);
        //I think I can recover by removing the xpath list from both objects?
        delete model.xPathList;
        for(var i = 0;i<model.schemaList.length;i++){
            delete model.schemaList[i].xPathList;
        }
        var size = BSON.calculateObjectSize(model);
        if(size<maxsize){
            try {
                var contents = JSON.stringify(model);    
                errorFlag = true;
                //mark it as an error as its stripped
            } catch (error) {
                var contents = JSON.stringify(error);
                errorFlag = true;
            }
        }else{
            var contents = JSON.stringify({error:'File is too big to save to disk even after removing xpath', size:size, maxsize:maxsize});
            errorFlag = true;
        }
    }
    
    var result = fs.writeFileSync(fileNamePath, contents);
    contents=null;
    if(result!=null){
        errorFlag = true
    }
    model==null;
    return errorFlag;
    
    /*
    fs.writeFile(fileNamePath, contents, (err) => {  
            // throws an error, you could also catch it here
            if (err) throw err;
            // success case, the file was saved
        });    
    */
    
}

function buildModelsObject(buildInfo, previousBuildInfo, finalModels){
    var modelsObject = {};
    modelsObject.buildInfo = buildInfo;
    modelsObject.buildInfo.previousBuildInfo = previousBuildInfo;
    //so remove stuff at too lower level
    modelsObject.models = finalModels;
    return modelsObject;
}

function processGenericSchemaList(XSDContents, readMeContents, autoPopulateObj, selectedRelease){
    if (releaseObjectValid(XSDContents)){
        var processServiceList = schemaListProcessor(XSDContents);
        //TODO
        var url = __dirname;
        var serviceList = addKeysAndNames(processServiceList, url, selectedRelease);
        var serviceListwithReadme = mergeREADME(serviceList, readMeContents);
        var serviceListwithReadme = mergeAutoPopulate(serviceListwithReadme, autoPopulateObj);
        return serviceListwithReadme;

    }
    return [];
}

function releaseObjectValid(releaseObjects){
var filesObject = getChildOrderObject(releaseObjects, 'files');
var fileListObject = getChildOrderObject(filesObject, 'fileList');
if ((releaseObjects==null)||(filesObject==null)||(fileListObject==null)){
        return false;
    }
    return true;
}

function schemaListProcessor(rawSchemaList) {
    //I have to look for some htings in a different way for providerData
    var processedSchemaList =[];
    var filesObject = getChildOrderObject(rawSchemaList, 'files');
    var arrayOfRawSchemas = getMatchedObjects(filesObject, 'fileList');
    var arrayOfRawSchemasCount = arrayOfRawSchemas.length;
    //is there a way to get the wsgw patterns?
    //loop through the first array of schemas
    for (var i = 0; i < arrayOfRawSchemasCount; i++) {
        var rawSchema1 = arrayOfRawSchemas[i];
        var rawSchema1Dir = getfilePathFromFullPath(rawSchema1.filename);
        
        
        var matched = false;
        //I have to re-write this as it doesnt handle more than one schema under the same directory?
        if (rawSchema1.added != true) {
            var newRawSchema = {};
            newRawSchema.schemaList =[];
            newRawSchema.schemaList.push(schemaProcessor(rawSchema1));
            for (var k = 0; k < arrayOfRawSchemasCount; k++) {
                var rawSchema2 = arrayOfRawSchemas[k];
                var rawSchema2Dir = getfilePathFromFullPath(rawSchema2.filename);
                //console.log(rawSchema2);
                //so if the dir matches but the file doesnt then add it as a subfile under this root?
                if ((rawSchema1Dir == rawSchema2Dir) &&(rawSchema1.filename != rawSchema2.filename)) {
                    matched = true;
                    newRawSchema.schemaList.push(schemaProcessor(rawSchema2));
                    arrayOfRawSchemas[k].added = true;
                }
            }
            
            
            newRawSchema.directory = rawSchema1Dir;
            //roll the stuff up to here
            //console.log(newRawSchema);
            if(rawSchema1Dir.indexOf('WSGateway')>0){
                newRawSchema.External = true;
            }
            //if its external I have to get the name differently
            if(newRawSchema.External){
                newRawSchema.ServiceName = getNameforExternal(rawSchema1Dir);
                if(newRawSchema.ServiceName==null){
                    a=serviceNameisNull;
                }
            }else{
                newRawSchema.ServiceName = cleanXSDName(newRawSchema.schemaList[0].schemaName);
            }
            
            //directoryisntenoughforthekey...
            newRawSchema.key = getKeyFromString(rawSchema1Dir + newRawSchema.ServiceName);
            newRawSchema.FormattedServiceName = formatCamelCaseForHumans(newRawSchema.ServiceName);
            //if the FormattedServiceName is only one word then add to it !
            if(newRawSchema.FormattedServiceName.indexOf(' ')==-1){
                //no spaces exist in the name....
                newRawSchema.ServiceName = cleanXSDName(newRawSchema.directory + newRawSchema.ServiceName);
                newRawSchema.FormattedServiceName = formatCamelCaseForHumans(newRawSchema.ServiceName);
            }

            newRawSchema.ServiceVersion = getVersionFromRawXSD(newRawSchema.schemaList[0].schema);
            newRawSchema.ServiceNumber = getNumberFromLocation(newRawSchema.schemaList[0].filename);
            if(newRawSchema.ServiceNumber==null){
                //need to do something about this as wel. 
                newRawSchema.ServiceNumber = cleanXSDName(newRawSchema.ServiceName + newRawSchema.ServiceVersion);
            }
            //now I need to work out what type it is and do some funky generation on the stuff to make things fit...

            
            if(newRawSchema.External){
                newRawSchema.FormattedDisplayName = newRawSchema.ServiceName + ' (' + newRawSchema.ServiceVersion + ')';
                newRawSchema.ServiceCategory = 'WSGateway';
            }else if (newRawSchema.ServiceNumber != null) {
                newRawSchema.FormattedDisplayName = newRawSchema.ServiceNumber + ' ' + newRawSchema.ServiceName + ' (' + newRawSchema.ServiceVersion + ')';
            } else {
                //this means its from the provider or external usually?
                newRawSchema.FormattedDisplayName = newRawSchema.ServiceName + ' (' + newRawSchema.ServiceVersion + ')';
                newRawSchema.ServiceCategory = getCategoryFromDirectory(newRawSchema.directory);
            }
            
            newRawSchema.namespaceAlias = newRawSchema.schemaList[0].namespaceAlias;
            newRawSchema.targetNamespace = newRawSchema.schemaList[0].targetNamespace;
            
            if (newRawSchema.targetNamespace == null) {
                newRawSchema.targetNamespace = newRawSchema.schemaList[0].schema.targetNamespace;
            }
            
            if (newRawSchema.targetNamespace != null) {
                newRawSchema.shortNamespace = newRawSchema.targetNamespace.replace('http://www.immi.gov.au/Namespace/', '');
                newRawSchema.CAPM = createCAPMObject(newRawSchema);
                if (newRawSchema.ServiceCategory == null) {
                    newRawSchema.ServiceCategory = getCategoryFromtargetNamespace(newRawSchema.targetNamespace);
                }
            }
            //test the name to see what it is and set some bounds for later?
            
            
            newRawSchema.MessagePattern = createMessagePatternObject(newRawSchema);
            //console.log(newRawSchema.MessagePattern);
            //a=whatformehere;
            processedSchemaList.push(newRawSchema);
        }
    }
    return processedSchemaList;
}
function returnArray(object){
    var newArray = [];
    if(object==undefined){
         return newArray;
    }else if(Array.isArray(object)){
        return object;
    }else{
        newArray.push(object);
        return newArray;
    }
}
function getfilePathFromFullPath(fullPath){
    var pathArray = fullPath.split('/');
    pathArray.pop();
    return pathArray.join('/');
}
function schemaProcessor(rawSchema) {
    //console.log(rawSchema);
    var processedSchemaObject = {};
    //this contains only two objects filename and schema
    processedSchemaObject.filename = rawSchema.filename;
    processedSchemaObject.key = getKeyFromString(rawSchema.filename);
    processedSchemaObject.namespaces = rawSchema.namespaces;
    processedSchemaObject.targetNamespace = rawSchema.targetNamespace;
    processedSchemaObject.version = getVersionFromLocation(processedSchemaObject.targetNamespace);
    processedSchemaObject.schemaName = getFileNamefromLocation(rawSchema.filename, false);
    processedSchemaObject.FormattedServiceName = formatCamelCaseForHumans(processedSchemaObject.schemaName);
    processedSchemaObject.FormattedDisplayName = processedSchemaObject.FormattedServiceName + ' (' + processedSchemaObject.version + ')';
    processedSchemaObject.conformance = true;
    processedSchemaObject.conformanceRules =[];
    processedSchemaObject.rootElement = null;
    processedSchemaObject.core = true;
    
    processedSchemaObject.dependancyOnly = rawSchema.dependancyOnly;
    processedSchemaObject.namespaceAlias = resolveLocalNamespace(rawSchema);;
    processedSchemaObject.core = getIsCoreFromLocation(rawSchema.filename);
    processedSchemaObject.schema = getChildOrderObject(rawSchema,'schema');
    
    return processedSchemaObject;
}
function getKeyFromString(string){
    return string.replace(/[^a-zA-Z0-9]+/g,"");
}

function getVersionFromLocation(location) {
    //split the string based on slash
    var result = 'V1.0';
    if(location!=null){
        var locationArray = location.split('/');
        for(var i = 0;i<locationArray.length;i++){
            var item = locationArray[i];
            var firstChar = item.substr(0, 1).toUpperCase();
            if (firstChar == 'V') {
                //is it numeric for whats left?
                var numberTest = item.substr(1, item.length -1);
                if (typeof numberTest == "number") {
                    return item;
                }
            }
        }
    }
    return result;
}
function getFileNamefromLocation(location, keepExtensionFlag) {
    var filename = location.split('/').pop();
    if (keepExtensionFlag != true) {
        var noExtFilename = filename.split('.')[0];
        return noExtFilename;
    } else {
        return filename;
    }
}

function formatCamelCaseForHumans(s){
   var returnValue = s.replace(/_/g, ' ', ' ').split(/([A-Z][a-z]+)/).filter(function(e){return e});
   return returnValue.join(' ');
}
function resolveLocalNamespace(xsdObject) {
    //console.log(xsdObject);
    var result = null;
    var targetNamespace = xsdObject.targetNamespace;
    var namespaces = xsdObject.namespaces;
    if (namespaces != null) {
        for (var i = 0; i < namespaces.length; i++) {
            var namespaceObject = namespaces[i];
            //console.log(namespaceObject);
            for (var key in namespaceObject) {
                var alias = key;
                var namespace = namespaceObject[key];
                //console.log('targetNamespace=' + targetNamespace + ' namespace=' + namespace);
                if (targetNamespace == namespace) {
                    result = alias;
                    break;
                }
            }
        }
    }
    return result;
}
function getIsCoreFromLocation(location, name) {
    
    
    //split the string based on slash
    var result = false;
    var locationArray = location.split('/');
    var last = locationArray[locationArray.length-1].toLowerCase().replace(/[0-9]/g, '');;
    
    if(location.toLowerCase().indexOf('/core/')!=-1){
        result = true;
    }else if(location.toLowerCase().indexOf('/log/')!=-1){
        result = true;
    }else if(location.toLowerCase().indexOf('/cbe/')!=-1){
        result = true;
    }else if ((last.indexOf('message') > -1) ||(last.indexOf('msg') > -1)||(last.indexOf('messaging.') > -1)||(last.indexOf('core.') > -1)||(last.indexOf('errors.') > -1)||(last.indexOf('errors_') > -1)||(last.indexOf('system.') > -1)||(last.indexOf('enterpriseacknowledgement.') > -1)) {
    
        result = true;
    }else{
        var lCaseLocation = location.toLowerCase();
        if((lCaseLocation.indexOf('oasis/')>-1)||(lCaseLocation.indexOf('httpheader/')>-1)||(lCaseLocation.indexOf('webservicessecurity/')>-1)){
            result = true;
        }else{
            result = false;    
        }
    }
    //console.log(location + ':' + last + ':' + result);
    return result;
}

function cleanXSDName(xsdName){
    var newXSDName = replaceAll(replaceAll(xsdName.replace('Request', '').replace('Response', '').replace('.xsd', ''), '/', ''), '.', '');
    return newXSDName;
}
function getVersionFromRawXSD(xsd) {
    var result = 'V1.0';
    if ((xsd != null) &&(xsd.version != null) &&(xsd.version != '')) {
        if (xsd.version.charAt(0) != 'V') {
            result = 'V' + xsd.version;
        }
        if (xsd.version.indexOf('.') == -1) {
            result = xsd.version + '.0';
        }
    }
    return result;
}
function getNumberFromLocation(location) {
    //split the string based on slash
    //console.log(location);
    var result = null;
    //if its a core then there is no number?
    if(getIsCoreFromLocation(location)==true){
        result = 'CORE';
    }else{
        var locationArray = location.split('/');
        for (var i = 0; i < locationArray.length; i++) {
            var item = locationArray[i];
            var firstChar = item.substr(0, 2).toUpperCase();
            if ((firstChar == 'SV')||(firstChar == 'EV')||(firstChar == 'IN')||(firstChar == 'OS')) {
                //console.log('is it numeric for whats left?');
                var numberTest = item.substr(2, 3);
                //console.log('numberTest:' + numberTest);
                //console.log(isNumeric(numberTest));
                if (isNumeric(numberTest)) {
                    //console.log('numeric is true!');
                    result = firstChar + numberTest;
                    break;
                }
            }
        }
    }
    //console.log('result:' + result);
    if(result==null){
        //console.log('result:' + result);
        //console.log(locationArray);
        //console.log(location);
    }
    return result;
}

function createCAPMObject(serviceObject) {
    var CAPMObj = {
    };
    //var activeEnvironments = ['e9','e7','e6','e5','e4','e3'];
    var activeEnvironments =[ 'e9'];
    CAPMObj.baseURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?';
    CAPMObj.identifier = '&id=' + serviceObject.shortNamespace + '-%3E' + serviceObject.schemaList[0].schemaName;
    CAPMObj.ServiceCompleted = CAPMObj.identifier + '-%3Edp:ServiceCompleted';
    CAPMObj.extendedProfilePointJSON = CAPMObj.baseURL + CAPMObj.identifier + '&env=e9&domain=Production&classname=extendedprofilepoint&name=extendedprofilepoint&nametype=classes&action=doList&type=JSONP';
    CAPMObj.activeEnvironmentsList = activeEnvironments;
    return CAPMObj;
}
function getCategoryFromtargetNamespace(inBoundtargetNamespace) {
    var result = null;
    //remove the stuff
    if(inBoundtargetNamespace!=null){
        var pathArray = inBoundtargetNamespace.split('/');
        if(pathArray.length>5){
            result = pathArray[4];
        }
    }
    return result;
}
function createMessagePatternObject(SO) {
    var MessagePattern = {
    };
    var PublishSubscribeArray =[ 'Notify', 'Update', 'Record', 'Send', 'Unload', 'Dispatch', 'Generate', 'Initiate', 'Allocate', 'Complete', 'Store'];
    //console.log(SO);
    //check the name part to see?
    if (SO.ServiceNumber == 'CORE') {
        MessagePattern.Name = 'CORE';
        MessagePattern.Request = null;
        MessagePattern.Response = null;
    } else {
        nameFirst = SO.FormattedServiceName.split(' ', 1)[0];
        if (PublishSubscribeArray.indexOf(nameFirst) != -1) {
            MessagePattern.Name = 'PublishSubscribe';
            MessagePattern.Request = 'Publisher';
            MessagePattern.Response = 'Subscriber';
            MessagePattern.DisplayName = 'Publishers and Subscribers';
        } else {
            MessagePattern.Name = 'RequestReply';
            MessagePattern.Request = 'Consumer';
            MessagePattern.Response = 'Provider';
            MessagePattern.DisplayName = 'Consumers and Providers';
        }
    }
    return MessagePattern;
}
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
function addKeysAndNames(listObject, url, release) {
    var arrayLength = listObject.length;
    for (var i = 0; i < arrayLength; i++) {
        var serviceObj = listObject[i];
        //console.log(serviceObj);
        var formatedjsonLink = 'key=' + serviceObj.key;
        //console.log('addKeysAndNames');
        //console.log(release);
        
        var releaseLink = 'release=' + release.releaseName;
        var urlLink = url + '?' + formatedjsonLink + '&' + releaseLink;
        serviceObj.urlLink = urlLink;
        serviceObj.release = release;
    }
    return listObject;
}

function getDescriptionFromObject(SO){
    if(SO.ServiceNumber=='CORE'){
        return '<p>This file is a core file and reused by multipe sevices</p>';
    }else{
        return '<h4>Service Usage</h4><p>This service is used to <strong>' + SO.FormattedServiceName + '</strong>'+ "'s" +'</p>';
    }
}
function mergeREADME(ServiceObjects, READEMEObjects) {
    if ((ServiceObjects != null) &&(ServiceObjects.length > 0)) {
        if ((READEMEObjects != null) &&(READEMEObjects.files != null) &&(READEMEObjects.files.fileList != null)) {
            var READEMEList = returnArray(READEMEObjects.files.fileList);
        }else{
            var READEMEList = null;
        }
        for (var i = 0; i < ServiceObjects.length; i++) {
            ServiceObjects[i].description = getDescriptionFromObject(ServiceObjects[i]);
            if(READEMEList!=null){
                for (var k = 0; k < READEMEList.length; k++) {
                    var READEMEfilename = READEMEList[k].filename;
                    if (READEMEfilename != null) {
                        if (isMatchingReadmeMD(ServiceObjects[i].directory, READEMEfilename)) {
                            var readmeContents = READEMEList[k].contents;
                            //console.log(readmeContents);
                            if(readmeContents.indexOf('\n')!=-1){
                                var contentArray = readmeContents.split('\n');
                                //now get the first to non empty lines
                                var lines = '';
                                var linesCounter = 0;
                                for(var m = 0;m<contentArray.length;m++){
                                    var singleLine = contentArray[m].trim();
                                    if((singleLine!=null)&&(singleLine!='')){
                                        lines+=converter.makeHtml(singleLine);
                                        linesCounter++;
                                    }
                                    if(linesCounter>1){
                                        break;
                                    }
                                }
                            }
                            //append the contents to the other XSD object
                            ServiceObjects[i].description = lines;
                            ServiceObjects[i].readme = converter.makeHtml(readmeContents);;
                            break;
                        }
                    }
                }
                
            }else{

            }
            
        }
        
    }
    return ServiceObjects;
}
function isMatchingReadmeMD(inDirectoryName, READEMEfilename){
//readme files can exists at this level or one level above the current level and still be valid...check this level first
    var readmeDir = READEMEfilename.match(/(.*)[\/\\]/)[1]||'';
    if(readmeDir==inDirectoryName){
        return true;    
    }else{
        //Now I need to drop the last item from the path and retest...
        //is the readme on file level above?
        return false;    
    }
    


}
function getKeyFromLocation(location) {
    //split the string based on slash and assume its e which means the structure is
    //Alert/Services/SV081-MatchSafeguardsProfile/V1.0/XML/SV081_Rqst.xml
    //work back from the file name up the path
    var locationArray = location.split('/');
    if (locationArray.length > 4) {
        middleGround = locationArray.length-4;
        return locationArray[middleGround] + '-' + locationArray[middleGround+1];
    } else {
        return null;
    }
}
function mergeAutoPopulate(serviceListwithReadme, currentAutoPopulate) {
    //console.log(serviceListwithReadme);
    //console.log(currentAutoPopulate);
    if ((serviceListwithReadme != null) &&(serviceListwithReadme.length > 0)) {
        var functionList = getFunctionListFromAutoPopulate(currentAutoPopulate);
            for (var j = 0; j < serviceListwithReadme.length; j++) {
                //ref can only apply to elements with names
                var service = serviceListwithReadme[j];
                service.refDataList = [];
                var serviceNamespaceAlias = service.namespaceAlias;
                if (service.schemaList != null) {
                    for (var k = 0; k < service.schemaList.length; k++) {
                        var schema = service.schemaList[k].schema;
                        schema.refDataList = [];
                        var elements = returnArray(schema.element);
                        for (var i = 0; i < functionList.length; i++) {
                            var refObject = functionList[i];
                            if (refObject.type == 'REF') {
                                var element = refObject.element;
                                //now get the namespave alias from this?
                                var fieldNamespaceAlias = getNamespaceAliasFromFieldName(element);
                                if (fieldNamespaceAlias != null) {
                                    if (fieldNamespaceAlias == serviceNamespaceAlias) {
                                        for (var l = 0; l < elements.length; l++) {
                                            var schemaElement = elements[l];
                                            if (element == serviceNamespaceAlias + ':' + schemaElement.name) {
                                                service.hasRefDataFlag = true;
                                                schema.hasRefDataFlag = true;
                                                service.schemaList[k].hasRefDataFlag = true;
                                                schemaElement.refData = refObject;
                                                service.refDataList.push(refObject);
                                                schema.refDataList.push(refObject);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
    }
    return serviceListwithReadme;
}
function getNamespaceAliasFromFieldName(fieldName) {
    if ((fieldName != null) &&(fieldName != '')) {
        var posSemi = fieldName.indexOf(':');
        if (posSemi != -1) {
            return fieldName.substring(0, posSemi);
        } else {
            return null;
        }
    } else {
        return null;
    }
}
function getFunctionListFromAutoPopulate(autoPopulate){
    if ((autoPopulate != null) &&(autoPopulate.macroAutoPopulate != null) &&(autoPopulate.macroAutoPopulate.content != null) &&(autoPopulate.macroAutoPopulate.content.functionList != null)) {
        return returnArray(autoPopulate.macroAutoPopulate.content.functionList[ 'function']);
    }else{
        return [];
    }
}

function processSchemaData(currentSchemas, previousSchemas, currentSupportSchemas, previousSupportSchemas) {
    var processedCurrentSchemaList = currentSchemas;
    var processedPreviousSchemaList = previousSchemas;
    var currentSchemasObject = formatAllSchemas(processedCurrentSchemaList, currentSupportSchemas);
    var previousSchemasObject = formatAllSchemas(processedPreviousSchemaList, previousSupportSchemas);
    var processedSchemasObject = {};
    processedSchemasObject.current = currentSchemasObject;
    processedSchemasObject.previous = previousSchemasObject;
    return processedSchemasObject;
}
function formatAllSchemas(allSchemas, supportSchemas) {
    var xsdSchemaList = getPopulatedXSDSchemaList(allSchemas);
    var xsdSupportList = null;
    if(supportSchemas!=null){
        xsdSupportList = getPopulatedXSDSchemaList(supportSchemas);
    }
    var serviceCount = 0;
    var macroObjectList =[];
    var xsdlistlength = xsdSchemaList.length;
    //console.log(xsdSchemaList);
    var allSchemaslength = allSchemas.length;
    //a=stopnowforme;
    for (var i = 0; i < allSchemaslength; i++) {
        var service = allSchemas[i];
        var xsdList = service.schemaList;
        var xPathListCount = 0;
        var xPathList =[];
        for (var k = 0; k < xsdList.length; k++) {
            //there is usually only two of these for all non cores?
            var xsd = xsdList[k];
            serviceCount++;
            var parentObjectArray =[];
            //console.log(xsd);
            //console.log(xsd.rootElement);
            
            processXSD(xsd, xsdSchemaList, xsdSupportList);
            xsd.xsdParsed = true;
            xPathList = xPathList.concat(xsd.xPathList);
            service.xPathList = xPathList;
            service.xsdParsed = true;
        }
    }
    return allSchemas;
}

function getPopulatedXSDSchemaList(allServices) {
    var xsdSchemaList =[];
    var allSchemaslength = allServices.length;
    for (var i = 0; i < allSchemaslength; i++) {
        var service = allServices[i];
        var xsdList = service.schemaList;
        for (var k = 0; k < xsdList.length; k++) {
            var xsd = xsdList[k];
            xsdSchemaList.push(xsd);
        }
    }
    return xsdSchemaList;
}
function processXSD(xsd, allXSD, supportXSD) {
    //console.log('###########################');
    //console.log('START OF NEW XSD : ' + xsd.filename);
    //console.log('###########################');
    //this is new code?
    var fileSubsetList = [];
    var namespaceListing = [];
    traverseImports(xsd, fileSubsetList, namespaceListing, allXSD, null, xsd.targetNamespace, supportXSD, false);
    //now that I have a namespace listing I can process everything?
    var xPathList = [];
    var rootElement = resolveRoot(xsd);
    var startingElement = xsd.schema;
    var startingType = 'schema';
    var startingName = '//schema'; 
    if(rootElement!=null){
        startingElement = rootElement;
        startingType = 'rootElement';
        //for the root element the name will come from the element name...
        startingName = '/';
    }else{
        //I need to build my own root element...
        
        var startingElement = {};
        var rootElement = {};
        var currentSchema = xsd.schema;
        for (var key in currentSchema) {
            if (currentSchema.hasOwnProperty(key)) {
                var xsdKey = key;
                var xsdObject = currentSchema[key];
                rootElement[key] = currentSchema[key];
            }
        }
        startingElement.name = "schema";
        
        
        //sequence = sequence.concat(returnArray(currentSchema.complexType),returnArray(currentSchema.element),returnArray(currentSchema.simpleType), returnArray(currentSchema.group),returnArray(currentSchema.attributeGroup),returnArray(currentSchema.attribute));
        var sequence = getMatchedObjects(currentSchema, 'element');
        startingElement.sequence = sequence;
    }
    if(sequence!=null){
        schemeRootCurrentCount = sequence.length;
    }else{
        schemeRootCurrentCount = 1;
    }
    if(xsd.filename.indexOf('SV298')!=-1){
        //console.log(xsd.filename);
    }
    traverseSchema(startingElement, startingName, fileSubsetList, namespaceListing,startingName, startingName, xPathList, xsd.filename);
    xsd.xPathList = xPathList;
    
    //console.log(xPathList);
    
    
}
function traverseSchema(currentObject, currentObjectType, fileSubsetList, namespaceListing, currentXPath, fullPath, xPathList, currentFileName){
    //step out the moment this is recursive..
    //stepout if its too big as well
    if(xPathList.length>50000){
        return false;
    }
    if(currentObject.isRecursive){
        return false;
    }


    var currentObjectTypeWithOrder = getResolvedOrderObject(currentObjectType);
    var currentObjectRealType = currentObjectTypeWithOrder.name;
    var currentObjectRealOrder = currentObjectTypeWithOrder.order;
    if(currentFileName.indexOf('SV298')!=-1){
        //console.log('SV298');
    }
    if(currentObject==null){
        return false;
    }
    //skip all namespaces objects as they dont mean anything to me....
    if((currentObjectType=='namespaces')&&(currentObject.ref!=null)){
        return false;
    }
    if(currentObject.end){
        return false;
    }
    if(currentObjectRealType=='refData'){
        return false;
    }
    if(currentObjectRealType=='annotation'){
        return false;
    }
    if(currentObjectRealType=='documentation'){
        return false;
    }
    //so I want to start on every key etc...and only care about objects
    //This level I dont care about what is a root element etc..., I just want to build a new resolvedObject
    //firstly is this an object?
    if ((typeof currentObject === 'object') && (currentObject !== null)){
        if(isArray(currentObject)){
            //arrays just need to be looped through!
            //console.log('Array found');
            for(var i = 0;i<currentObject.length;i++){
                var nextObjectsType = currentObjectType;
                var nextObject = currentObject[i];
                traverseSchema(nextObject, nextObjectsType, fileSubsetList, namespaceListing, currentXPath, fullPath, xPathList, currentFileName);
            }
        }else{
            //its an object but not an array?
            //check if its something to be resolved
            //if((currentObject.base!=null)&&((currentObject.ref!=null)||(currentObject.type!=null))){
            if(currentObject.base!=null){
                //skip the xpath and just resolve it forward
                var objectname = currentObject.base;
                var rawResolvedObject = resolveObject(objectname, objectname, currentObjectTypeWithOrder, namespaceListing, currentFileName, fileSubsetList, currentObject, currentXPath, fullPath, 'base');
                var newFileNameFromBase = rawResolvedObject.filename;
                fullPath+='/' + objectname;
                //sometimes a base can be an extension but other times it reolves to the end of the line and therefore has no .filename?
                traverseSchema(rawResolvedObject, 'resolved', fileSubsetList, namespaceListing, currentXPath, fullPath, xPathList, newFileNameFromBase);
            }
            if((currentObject.ref!=null)||(currentObject.type!=null)){
            
                //console.log('something to be traversed was found');
                var objectname = null;
                var xPathName = null;
                
                if(currentObject.ref!=null){
                    objectname = currentObject.ref;
                    xPathName = currentObject.ref;
                }else if(currentObject.type!=null){
                    objectname = currentObject.type;
                    xPathName = currentObject.name;
                }
                var rawResolvedObject = resolveObject(objectname, xPathName, currentObjectTypeWithOrder, namespaceListing, currentFileName, fileSubsetList, currentObject, currentXPath, fullPath, 'reftype');
                //how do I now if I need to add this to the xpath or not?
                var newFileName = rawResolvedObject.filename;
                //only add this if its not an end item and not just a type
                var newPath = currentXPath;
                if(currentObjectType!='resolved'){
                    newPath = currentXPath + '/' + xPathName;
                    //currentObject.myTestType = currentObjectType;
                }else{
                    //this means it has been resolved so I need to append it to the previous item...
                    //even if its reolved it might have stuff under it that need to comeup to this object?
                    //var previousItem = xPathList[xPathList.length-1];
                    //var newXObject = xPathObjectCreator(newPath, objectname, currentObjectType, currentObject, rawResolvedObject, xPathList);
                    //rather than push it to the next object I should just append to the previous?
                    
                    //previousItem.child = newXObject;
                }
                
                if(rawResolvedObject.isRecursive==true){
                    return false;
                }
                var newXObject = xPathObjectCreator(newPath, currentObjectTypeWithOrder, objectname, currentObjectType, currentObject, rawResolvedObject, xPathList);
                
                if(newXObject.isRecursive==true){
                    return false;
                }
                fullPath+='/' + xPathName;
                traverseSchema(rawResolvedObject, 'resolved', fileSubsetList, namespaceListing, newPath, fullPath, xPathList, newFileName);
            }else if((currentObjectRealType=='schema')){
                //this is a special clause for elements with names only....
                //by default it can have no ref or type....    
                //console.dir(currentObject);
                var objectname = currentObject.name;
                fullPath+='/' + objectname;
                newPath = currentXPath;
                var rawResolvedObject = {type:"schema"};
                
                var newXObject = xPathObjectCreator(newPath, currentObjectTypeWithOrder, objectname, currentObjectType, currentObject, rawResolvedObject, xPathList);
            //}else if(currentObjectType.indexOf('choice')!=-1){
            //    var test = getResolvedOrderObject(currentObjectType);
            //console.log('Health choice');
            }else if((currentObjectRealType=='element')&&(IsElementDelcareOnly(currentObject))){
                //this is a special clause for elements with names only....
                //by default it can have no ref or type....    
                //console.dir(currentObject);
                var objectname = currentObject.name;
                fullPath+='/' + objectname;
                newPath = currentXPath + '/' + objectname;
                var rawResolvedObject = {type:"elementWithNameOnly"};
                rawResolvedObject.restriction = {base:"anyType"};
                var newXObject = xPathObjectCreator(newPath, currentObjectTypeWithOrder, objectname, currentObjectType, currentObject, rawResolvedObject, xPathList);
            //}else if(currentObjectType.indexOf('choice')!=-1){
            //    var test = getResolvedOrderObject(currentObjectType);
            //    console.log('Health choice');
            }else if(currentObjectRealType=='choice'){
                //this object is a choice
                //I need a way of counting everything under a choice and create a new choice type in the xpth for all of them
                //(annotation?,(element|group|choice|sequence|any)*)
                //So now I need to get all arrays, elements, groups, anys, choices and sequences and count them
                var arrayOfChoices = ['complexType', 'element','simpleType','group','attributeGroup','attribute', 'choice', 'sequence'];
                var choices = getMatchedObjects(currentObject, arrayOfChoices)
                
                //this choices array can only be the objects as a direct child then pushed into an array?
                
                
                for(var m=0;m<choices.length;m++){
                    //choicename must be unique?
                    //currentObjectRealOrder
                    //get the last item from the cuurent xpatharray as the unique choicy
                    var parentitem = currentXPath.split('/').pop();
                    var choiceName = parentitem + ' choice ' + (m+1) + ' of ' + choices.length;
                    newPath = currentXPath + '/' + choiceName;
                    
                    //now for each choice I better create a new xPathParent and then allow the normal traverse to occur?
                    var newXObject = xPathObjectCreator(newPath, currentObjectTypeWithOrder, choiceName, currentObjectType, currentObject, choices, xPathList);
                    traverseSchema(choices[m], 'sequence', fileSubsetList, namespaceListing, newPath, newPath, xPathList, currentFileName);
                }
                //console.log('finishedwithchoice');
            }
            //for each except if the current is a choice as thats on a different thread
            if(currentObjectRealType!='choice'){
                for (var key in currentObject) {
                    if (currentObject.hasOwnProperty(key)) {
                        var nextObjectsType = key;
                        var nextObject = currentObject[key];
                        if ((typeof nextObject === 'object') && (nextObject !== null)){
                            traverseSchema(nextObject, nextObjectsType, fileSubsetList, namespaceListing, currentXPath, fullPath, xPathList, currentFileName);
                        }
                    }
                }  
            }              
        }    
    }
}

function IsElementDelcareOnly(objectIn){
    //go thrpugh the things that can make an element something more than just an Anytype?
    var simpleObject = getChildOrderObject(objectIn, 'simpleType');
    var complexObject = getChildOrderObject(objectIn, 'complexType');
    var sequenceObject = getChildOrderObject(objectIn, 'sequence');
    if((typeof simpleObject === 'object')&&(simpleObject!=null)){
        return false;
    }else if((typeof complexObject === 'object')&&(complexObject!=null)){
        return false;
    }else if((typeof sequenceObject === 'object')&&(sequenceObject!=null)){
        return false;
    }else{
        return true;
    }
}

function resolveAliasNameSpace(nameOfObject, namespaceListing, currentFileName, currentObject){
    var resolveAliasNameSpaceList = [];
    var fullyQualifedNamespace = null;
    var useLocalFlag = false;
    var newlocalNSList = [];
    if(nameOfObject.indexOf(':')==-1){
        useLocalFlag = true;
    }

    
    if((nameOfObject.indexOf(':')!=-1)||(useLocalFlag)){
        var aliasArray = nameOfObject.split(':', 2);
        var alias = aliasArray[0];
        var nameOnly = aliasArray[1];
        if(useLocalFlag){
            alias = '';
            nameOnly = aliasArray[0];
            
        }
        if((currentObject.namespaces!=null)&&(currentObject.namespaces.length>0)){
            for(var i = 0;i<currentObject.namespaces.length;i++){
                var localNamespace = currentObject.namespaces[i];
                //console.log(localNamespace);
                var newNameSpaceObject = {};
                for (var key in localNamespace) {
                    if (localNamespace.hasOwnProperty(key)) {
                        //console.log(key);
                        //console.log(singleNameSpaceDeclaration[key]);
                        newNameSpaceObject.alias = key;
                        newNameSpaceObject.namespace = localNamespace[key];
                        //filename has to be matched to the global file names before being local...
                        newNameSpaceObject.filename = currentFileName;
                        for (var k = 0;k<namespaceListing.length;k++){
                            
                            var existingListing = namespaceListing[k];
                            if(existingListing.namespace==newNameSpaceObject.namespace){
                                newNameSpaceObject.filename=existingListing.filename;
                                
                                //console.log(namespaceListing);
                                //console.log(currentFileName);
                                //console.log(newNameSpaceObject);
                                //a=detetedadifferentfilename;
                            }
                        }
                        
                        //if one of these mathc the target?
                        newNameSpaceObject.target = false;
                        
                    }
                }
                resolveAliasNameSpaceList.push(newNameSpaceObject);
            }
            //console.log(namespaceListing);
            
            //make these a namespaceobject as well?
            //a=stophereandlookatnamespaces;
        }
        
        
        //console.log('alias');
        //console.log(alias);
        //get the fully qualified name by using this currentlfile as a match first!
        //look up the alias from this files possible inclusions only
        //console.log(namespaceListing);
        for (var i = 0;i<namespaceListing.length;i++){
            var nameSpaceObject = namespaceListing[i];
            //console.log(nameSpaceObject);
            var fileMatchedFlag = false;
            var aliasMatchedFlag = false;
            var matchedNamespace = null;
            //console.log(nameSpaceObject);
            if((nameSpaceObject.filename==currentFileName)||(nameSpaceObject.contextFileName==currentFileName)){
                fileMatchedFlag = true;
                //now test the alias matches or that this is the target for locals
                
                if((useLocalFlag)&&(nameSpaceObject.target)){
                    aliasMatchedFlag = true;
                    resolveAliasNameSpaceList.push(nameSpaceObject);
                }else if(nameSpaceObject.alias==alias){
                    aliasMatchedFlag = true;
                    resolveAliasNameSpaceList.push(nameSpaceObject);
                }
            }
        }
        
        
        if(resolveAliasNameSpaceList.length==0){
            //if I get to here and its local I must create a new object to return?
            //now I need to check against the locals
            for(var j = 0;j<newlocalNSList.length;j++){
                var newlocalNS  = newlocalNSList[j];
                if(alias==newlocalNS.alias){
                    resolveAliasNameSpaceList.push(newlocalNS);
                };
            }    
        }else{
            return resolveAliasNameSpaceList;
        }
        

        if(resolveAliasNameSpaceList.length==0){
            //console.log(namespaceListing);
            returnNameSpaceObject = {};
            returnNameSpaceObject.filename = currentFileName;
            returnNameSpaceObject.alias = 'local';
            returnNameSpaceObject.namespace = 'http://localhost';
            returnNameSpaceObject.target = true;
            resolveAliasNameSpaceList.push(returnNameSpaceObject);
            return resolveAliasNameSpaceList;
        }
    }else{
        //its a local so use the target as the fully qualified name
        //for local objects?
        //so no targets or alias matches I better send back the current file only
        
        console.error('Dead object with no matching namepsaces');
        a=diehereasnolocalornamespacemathced;
    }
    return null;
    
}


function setIfNotNull(key, inObject, updateObject){
    var rObject = getChildOrderObject(inObject, key);
    if(rObject!=null){
        updateObject[key] = rObject;
    }
}
function setValueIfNotNull(key, inObject, updateObject){
    var rObject = getChildOrderObject(inObject, key);
    if(rObject!=null){
        var vObject = getChildOrderObject(rObject, 'value');
        if(rObject!=null){
            updateObject[key] = vObject;
        }
    }
}

function shortenXPathName(xPathKey){
    xPathKey = xPathKey.replace('//','');
    var shortname = xPathKey;
    var xPathNameArray = xPathKey.split('/');
    if(xPathNameArray.length>1){
        shortname = xPathNameArray[xPathNameArray.length-2] + '/' + xPathNameArray[xPathNameArray.length-1];
        shortname = shortname.replace('schema/', '');
    }
    return shortname;
}

function xPathObjectCreator(xPathKey, orderObject, objectName, objectType, xsdObject, xsdResolvedObject, xPathList){
    
    if(xPathKey.indexOf('UploadItemsResponseXXX')!=-1){
        try {
            console.log(xPathList.length + ':' + xPathKey);

        
            if(xPathList.length>5000){
                console.log('This is an exceedingly big schema');
            }    
        } catch (error) {
            console.log('this is not great');
        }
        
    }
    
    //comeback
    xPathObject = {};
    xPathObject.key = xPathKey;
    xPathObject.shortname = shortenXPathName(xPathKey);
    xPathObject.name = objectName;
    //count the number of slashes?

    xPathObject.depth = occurrences(xPathKey, '/', false)-1;
    
    xPathObject.order = parseInt(xPathObject.depth + orderObject.order);
    
    
    //xPathObject.xsdObject = xsdObject;
    //xPathObject.xsdResolvedObject = xsdResolvedObject;
    
    if(xsdResolvedObject==null){
        a=dieasxsdResolvedObjectnull;
    }
    
    //The main object might have limits?
    setIfNotNull('minOccurs', xsdObject, xPathObject);
    setIfNotNull('maxOccurs', xsdObject, xPathObject);
    setIfNotNull('block', xsdObject, xPathObject);
    setIfNotNull('default', xsdObject, xPathObject);
    setIfNotNull('fixed', xsdObject, xPathObject);
    setIfNotNull('nillable', xsdObject, xPathObject);
    setIfNotNull('refData', xsdResolvedObject, xPathObject);
    //sometimes these can point direct to a type
    setIfNotNull('xsType', xsdResolvedObject, xPathObject);
    //I also need to resolve the objects restirctions etc....using my generic functions. 
    var restrictionObject = getChildOrderObject(xsdResolvedObject, 'restriction');
    if(restrictionObject!=null){
        //try and work out what the restirction details are simply?
        setIfNotNull('base',restrictionObject,xPathObject);
        setValueIfNotNull('minLength',restrictionObject,xPathObject);
        setValueIfNotNull('maxLength',restrictionObject,xPathObject);
        setValueIfNotNull('length',restrictionObject,xPathObject);
        setValueIfNotNull('pattern',restrictionObject,xPathObject);
        setValueIfNotNull('maxExclusive',restrictionObject,xPathObject);
        setValueIfNotNull('maxInclusive',restrictionObject,xPathObject);
        setValueIfNotNull('minExclusive',restrictionObject,xPathObject);
        setValueIfNotNull('minInclusive',restrictionObject,xPathObject);
        setValueIfNotNull('totalDigits',restrictionObject,xPathObject);
        setValueIfNotNull('whiteSpace',restrictionObject,xPathObject);
        setValueIfNotNull('fractionDigits',restrictionObject,xPathObject);
        var enumerationObject = getChildOrderObject(restrictionObject, 'enumeration');
        if(enumerationObject!=null){
            var enumerations = returnArray(enumerationObject);
            var resultenumerationsArray =[];
            for (var i = 0; i < enumerations.length; i++) {
                var enumeration = enumerations[i].value;
                if(enumeration!=null){
                    resultenumerationsArray.push(enumeration);
                }
            }
            xPathObject.enumeration = resultenumerationsArray;
            xPathObject.enumerationString = JSON.stringify(resultenumerationsArray);
        }
    }
    //set the type based on what I eventually resolved everything to?
    // / indicates that this is the schema root
    if(xPathKey.indexOf('RegisterProposedModifiedPersonAlertRequest')!=-1){
        var a = '';
    }
    if(objectType=='//schema'){
        xPathObject.type = 'schema';
    }else if (xPathObject.type!=null){
        //type was already set
        var a=xPathObject.type;
    }else if (xPathObject.xsType!=null){
        xPathObject.type = 'base';
    }else{
        xPathObject.type = orderObject.name;
    }
    //add what ever else is required now
    
    xPathObject.xCompare = JSON.stringify(xPathObject);
    xPathObject.cardinality = getCardinality(xPathObject);
    //so here I can either append to the list or merge the object to the previous if resolved
    if(objectType=='resolved'){
        var xsType = xPathObject.base;
        var previousItem = xPathList[xPathList.length-1];
        //override all the properties other than name, type and key if they have them?
        var prevItem = xPathList[xPathList.length-1]
        prevItem = Object.assign(xPathObject, previousItem);
        prevItem.type='base';
        prevItem.xsType=xsType;
        delete prevItem.base;
        //override the item in the list
        xPathList[xPathList.length-1] = prevItem;

    }else if (objectType=='RECURSIVE'){
        //maybe ignore it? or create something special?    
        xPathObject.isRecursive = true;
    }else{
        xPathList.push(xPathObject);
    }
    return xPathObject;
}
function getCardinality(eObj) {
    var cardinality = {
    };
    //there are four combinations of the raw data...
    //1 to 1
    if (eObj.maxOccurs == null) {
        eObj.maxOccurs = 1;
    }
    if (eObj.minOccurs == null) {
        eObj.minOccurs = 1;
    }
    
    if ((eObj.maxOccurs == '1') &&(eObj.minOccurs == '1')) {
        cardinality.value = '1..1';
        cardinality.display = 'Mandatory';
    } else if ((eObj.maxOccurs == 'unbounded') &&(eObj.minOccurs == '1')) {
        cardinality.value = '1..*';
        cardinality.display = 'Many Mandatory';
    } else if ((eObj.maxOccurs == 'unbounded') &&(eObj.minOccurs == '0')) {
        cardinality.value = '0..*';
        cardinality.display = 'Many Optional';
    } else if ((eObj.maxOccurs == '1') &&(eObj.minOccurs == '0')) {
        cardinality.value = '1..1';
        cardinality.display = 'Optional';
    } else {
        cardinality.value = eObj.minOccurs + '..' + eObj.maxOccurs;
        cardinality.display = cardinality.value;
    }
    return cardinality;
}

function resolveObject(nameOfObject, xPathName, typeWithOrder, namespaceListing, currentFileName, fileSubsetList, debugObject, currentXPath, fullPath, typer){
    //I want to make sure I can get out of a recursive loop
    if(isRecursive(xPathName, fullPath)){
        //add this to the list
        var unqiuekey = xPathName + "::" + currentFileName;
        globalRecursiveList.push(unqiuekey);
        //var result = isRecursive(xPathName, fullPath);
        var newRecursiveXPath = currentXPath + '/' + 'RECURSIVE'
        var newRecursiveObject = xPathObjectCreator(newRecursiveXPath, typeWithOrder, 'RECURSIVE', 'RECURSIVE', debugObject, debugObject);
        newRecursiveObject.isRecursive = true;
        newRecursiveObject.xPathUpdate = true;
        newRecursiveObject.end = true;
        newRecursiveObject.type = 'recursive';
        //always keep the filename
        newRecursiveObject.filename = currentFileName;
        return newRecursiveObject;
    }
    
    //I have to test the type first...
    
    
    if(nameOfObject.indexOf('niem-')!=-1){
        nameOfObject = nameOfObject.replace('niem-', '');
    }
    var coreTypeArray = ['token','string','integer','boolean','date','dateTime','time','decimal','double','duration','float','gDay','gMonth','gMonthDay','gYear','gYearMonth','int','long','short','byte','base64Binary','negativeInteger','nonNegativeInteger','nonPositiveInteger','normalizedString','positiveInteger','anyType','language','unsignedByte','unsignedInt','unsignedLong','unsignedShort','anyURI','Name','NCName','QName','NMTOKEN','NMTOKENS','ID','IDREF','IDREFS','hexBinary', 'anySimpleType','REF'];
    for(var i = 0;i<coreTypeArray.length;i++){
        if(nameOfObject==coreTypeArray[i]){
            //its a base type!
            xsType = {};
            xsType.type = 'base';
            xsType.end = true;
            xsType.xsType = nameOfObject;
            xsType.keep = true;
            xsType.xPathUpdate = false;
            xsType.filename = currentFileName;
            //go and get a different object at this point....
            return xsType;
        }
    }    
    var specialTypeArray = ['annotation', 'documentation', 'xml:lang', 'xml:base', 'xml:space', 'xml:id'];
    for(var i = 0;i<specialTypeArray.length;i++){
        if(nameOfObject==specialTypeArray[i]){
        //its a annotation type!
        xsType = {};
        xsType.type = 'base';
        xsType.end = true;
        xsType.xsType = nameOfObject;
        xsType.xPathUpdate = false;
        xsType.filename = currentFileName;
        return xsType;
        }
    }
    var toGetObjectList = resolveAliasNameSpace(nameOfObject, namespaceListing, currentFileName, debugObject);
    //console.log(toGetObjectList);
    var possibleFileMatches = [];
    if((toGetObjectList!=null)&&(toGetObjectList.length>0)){
        for (var h=0;h<toGetObjectList.length;h++){
            var toGetObject = toGetObjectList[h];
            var targetNamespace = null;
            for (var i=0;i<fileSubsetList.length;i++){
                var fileObject = fileSubsetList[i];
                //console.log('fileObject.targetNamespace:' + fileObject.targetNamespace);
                if(((fileObject.targetNamespace==null)&&(toGetObject.filename==fileObject.filename))||(fileObject.targetNamespace==toGetObject.namespace)){
                    
                    //that means this object MUST live in this file or an inlcude so always keep the first match...
                    //console.log(fileObject);
                    var possibleMatchSchema = fileObject.schema; 
                    
                    
                    //I have an issue where a simple type and element are the same name???
                    var arrayOfMatches = ['complexType', 'element','simpleType','group','attributeGroup','attribute'];
                    var possibleMatches = getMatchedObjects(possibleMatchSchema, arrayOfMatches);
                    //possibleMatches = possibleMatches.concat(returnArray(possibleMatchSchema.complexType),returnArray(possibleMatchSchema.element),returnArray(possibleMatchSchema.simpleType), returnArray(possibleMatchSchema.group),returnArray(possibleMatchSchema.attributeGroup),returnArray(possibleMatchSchema.attribute));
                    //console.log(possibleMatches);
                    var matchObject = {}
                    matchObject.file = fileObject;
                    matchObject.possibleMatches = possibleMatches;
                    possibleFileMatches.push(matchObject);
                }
            }
        }
    }        
        
    if((toGetObjectList!=null)&&(toGetObjectList.length>0)){
        for (var h=0;h<toGetObjectList.length;h++){    
            if(toGetObject.alias==''){
                var fullyQualifedFindName = toGetObject.namespace + ':' + nameOfObject;
            }else{
                var fullyQualifedFindName = nameOfObject.replace(toGetObject.alias, toGetObject.namespace);    
            }
            
            //console.log(fullyQualifedFindName);
            //console.log(nameOfObject);
            //console.log('toGetObject.alias:' + toGetObject.alias);
            //console.log('toGetObject.namespace:' + toGetObject.namespace);
            for (var m=0;m<possibleFileMatches.length;m++){
                var possibleMatches = possibleFileMatches[m].possibleMatches;
                var filename = possibleFileMatches[m].file.filename;
                var targetNamespace = possibleFileMatches[m].file.schema.targetNamespace;
                for (var i=0;i<possibleMatches.length;i++){
                    var possibleMatch = possibleMatches[i];
                    if(possibleMatch.name.indexOf(':')==-1){
                        if(targetNamespace==null){
                            var fullyQualifedMatchName = possibleMatch.name;
                        }else{
                            var fullyQualifedMatchName = targetNamespace + ':' + possibleMatch.name;    
                        }
                        if(fullyQualifedMatchName==fullyQualifedFindName){
                            //I have to check that this didnt match itself under the same name?
                            if((debugObject.type==possibleMatch.type)&&(debugObject.name==possibleMatch.name)){
                                //this is the same object so move on
                                //a=sametypeisnothappening;
                            }else{
                                //console.log(fullyQualifedMatchName); 
                                //console.log(fullyQualifedFindName);
                                //possibleMatch.name = fullyQualifedMatchName;
                                possibleMatch.filename = filename;
                                //possibleMatch.fullyQualifedName = fullyQualifedMatchName;
                                //So now I have to get the actual match?
                                
                                //console.log(possibleMatch);
                                //a=dieshereatpossibleMatch;
                                //is the type a base type?
                                if(possibleMatch.type!=null){
                                    for(var i = 0;i<coreTypeArray.length;i++){
                                        if(possibleMatch.type==coreTypeArray[i]){
                                            //its a base type!
                                            possibleMatch.xsType = coreTypeArray[i];
                                            //now override the type with base;
                                            possibleMatch.type = 'base';
                                            possibleMatch.end = true;
                                            possibleMatch.keep = true;
                                            possibleMatch.xPathUpdate = true;
                                            break;
                                        }
                                    }
                                }
                                
                                return possibleMatch;
                                
                            } 
                        }
                    } 
                }
            }                
        }
    }    
    console.error('fileSubsetList');
    console.error(fileSubsetList);
   console.error('possibleMatches');
   console.error(possibleMatches);
   console.error('debugObject');
   console.error(debugObject);
   console.error('toGetObject');
   console.error(toGetObject);
   console.error('namespaceListing');
   console.error(namespaceListing);
   console.error('currentXPath');
   console.error(currentXPath);
   console.error('nameOfObject=="' + nameOfObject + '"'); 
   console.error('fullyQualifedFindName:' + fullyQualifedFindName);
   console.error('typer');
   console.error(typer);
   console.error('possibleFileMatches');
   console.error(possibleFileMatches);
    a=Imnotsurehowthiscametopasseither;
    
    return null;
}

function getMatchedObjects(possibleMatchSchema, arrayOfMatches){
    //console.log(possibleMatchSchema);
    //arrayOfMatches could be a single string
    if (isArray(arrayOfMatches)==false){
        arrayOfMatches = returnArray(arrayOfMatches);
    }
    
    var arrayOfResults=[];
    //for each array of matches find something 
    for(var i = 0;i<arrayOfMatches.length;i++){
        var matchKey = arrayOfMatches[i];
        var resultObject = getChildOrderObject(possibleMatchSchema, matchKey);
        if(resultObject!=null){
            arrayOfResults = arrayOfResults.concat(returnArray(resultObject));    
        }
    }
    return arrayOfResults;
}

function getResolvedOrderObject(ObjectName){
    //default order will be 001
    var order = '001';
    var testName = ObjectName;
    if((ObjectName.charAt(0)=='$')&&(ObjectName.charAt(4)=='_')){
        //this is ordered
        order = ObjectName.substring(1,4);
        testName = ObjectName.substring(5,ObjectName.length);
    }else if((ObjectName.charAt(0)=='/')&&(ObjectName.charAt(1)=='/')){
        testName = testName.replace('//', '');
        order = '001';
    }
    var returnObject = {};
    returnObject.name = testName;
    returnObject.order = order;
    return returnObject;
}

function getChildOrderObject(parentObject,childkey){
    //for each object under the parent test the childkey against it?
    for (var key in parentObject) {
        if (parentObject.hasOwnProperty(key)) {
            var objectKey = key;
            var nextObject = parentObject[key];
            if (nextObject !== null){
                //now I have to reslve the name?        
                var resolvedOrderObject = getResolvedOrderObject(objectKey);
                if(resolvedOrderObject.name==childkey){
                    //this is an object match so return it as is...
                    return nextObject;
                }

            }
        }
    }        
    return null;
    
    
}

function resolveRoot(rawfile){
    //get all elements?
    var rawSchema = rawfile.schema;
    var schemaName = rawfile.schemaName.toLowerCase();
    var elementArray = getMatchedObjects(rawSchema, 'element');
    for (var i = 0; i < elementArray.length; i++) {
        var element = elementArray[i];
        var elementName = element.name.toLowerCase();
        //console.log(rawSchema);
        //console.log(elementName);
        //console.log(processedSchemaObject.schemaName);
        if (schemaName == elementName) {
            return element;
        }
    }
    return null;        
}

function traverseImports(rawFile, fileSubsetList, namespaceListing, searchFileList, contextFileName, contextTargetNamespace, eList, includeFlag){
    //first a check that I havent already got this file...
    for(var i = 0;i<fileSubsetList.length;++i){
        var alreadyLoadedFile = fileSubsetList[i];
        //console.log(alreadyLoadedFile);
        //console.log(rawFile);
        //a=testhere;
        if((rawFile.filename==alreadyLoadedFile.filename)&&(includeFlag!=true)){
            return false;    
        }
    }
    //did this come from an include?
    if(includeFlag){
        //I have to inherit the previous rawfiles targetNS is it has one?
        rawFile.schema.targetNamespace = contextTargetNamespace;
    }
    fileSubsetList.push(rawFile);
    //now I can have a look at what this file contains and act accordingly?
    

    
    var rawSchemaFile = rawFile.schema;
    var fileNameSpaces = getMatchedObjects(rawSchemaFile, 'namespaces');
    
    var fileImports = getMatchedObjects(rawSchemaFile, 'import');
    var fileIncludes = getMatchedObjects(rawSchemaFile, 'include');
    var targetNamespace = rawFile.targetNamespace;
    //console.log('first parse of file : ' + rawFile.filename);
    //console.log('targetNamespace:' + targetNamespace);
    //so I should start by getting this files targetnamespace and the namespaces into a reasonable object
    var thisFilesNameSpaceObject = {};
    thisFilesNameSpaceObject.targetNamespace = targetNamespace;
    //console.log(rawFile);
    //console.log(thisFilesNameSpaceObject);
    for(var i = 0;i<fileNameSpaces.length;++i){
        
        var singleNameSpaceDeclaration = fileNameSpaces[i];
        var newsingleNameSpaceDeclaration = {};
        newsingleNameSpaceDeclaration.includeFlag = includeFlag;
        //is it an include as they have a different context
        newsingleNameSpaceDeclaration.contextFileName = contextFileName;
        //if((contextFileName!=null)&&(contextFileName.length>0)){
            //newsingleNameSpaceDeclaration.filename = contextFileName;
        //}else{
            newsingleNameSpaceDeclaration.filename = rawFile.filename;    
        //}
        
        
        newsingleNameSpaceDeclaration.target = false;
        //there should only be one key and one property
        for (var key in singleNameSpaceDeclaration) {
            if (singleNameSpaceDeclaration.hasOwnProperty(key)) {
                //console.log(key);
                //console.log(singleNameSpaceDeclaration[key]);
                newsingleNameSpaceDeclaration.alias = key;
                newsingleNameSpaceDeclaration.namespace = singleNameSpaceDeclaration[key];
                //if one of these mathc the target?
                if((newsingleNameSpaceDeclaration.value==targetNamespace)&&(targetNamespace!=null)){
                    newsingleNameSpaceDeclaration.target = true;    
                }
            }
        }
        namespaceListing.push(newsingleNameSpaceDeclaration);
        if(includeFlag){
            var existingLength = namespaceListing.length;
            for(var k = 0;k<existingLength;++k){
                var alreadyImportedNamespace = namespaceListing[k];
                if(alreadyImportedNamespace.filename==newsingleNameSpaceDeclaration.contextFileName){
                    var includeNamespace = {};
                    includeNamespace.includeFlag = false;
                    includeNamespace.fromInclude = true;
                    includeNamespace.alias = alreadyImportedNamespace.alias;
                    includeNamespace.filename = newsingleNameSpaceDeclaration.filename;
                    includeNamespace.namespace = alreadyImportedNamespace.namespace;
                    includeNamespace.contextFileName = newsingleNameSpaceDeclaration.contextFileName;
                    //is the other ome a target?
                    includeNamespace.target = alreadyImportedNamespace.target;
                    namespaceListing.push(includeNamespace);    
                }
            }               
        }
        
    }
    //console.log(namespaceListing);
    //now go and get the next import?
    //console.log(fileImports);
    //console.log(fileIncludes);
    var contextNS = rawFile.schema.targetNamespace;
    for(var i = 0;i<fileImports.length;++i){
        var importFileLocation = fileImports[i];
        //console.log(importFileLocation);
        //get the raw file and then import it!
        var importRawFile = getFileByLocation(importFileLocation.schemaLocation, rawFile.filename, searchFileList, eList);
        var context = null;
        
        if(includeFlag){
            context = newsingleNameSpaceDeclaration.filename;
            
        }
        traverseImports(importRawFile, fileSubsetList, namespaceListing, searchFileList, context, contextNS, eList, false);
        
    }
    
    for(var i = 0;i<fileIncludes.length;++i){
        var includeFileLocation = fileIncludes[i];
        var includeRawFile = getFileByLocation(includeFileLocation.schemaLocation, rawFile.filename, searchFileList);
        //includes imherit the current files context
        //keep the original context file on includes through contextFileName
        traverseImports(includeRawFile, fileSubsetList, namespaceListing, searchFileList, newsingleNameSpaceDeclaration.filename, contextNS, eList, true);
        
    }
}

function getFileByLocation(importFileLocation, currentFileName, searchFileList, eList){
    //console.log('importFileLocation:'+ importFileLocation);
    //console.log('currentFileName:'+ currentFileName);
    var resolvedLocation = absolute(currentFileName, importFileLocation);
    for(var i = 0;i<searchFileList.length;++i){
        var searchFile = searchFileList[i];
        if(searchFile.filename==resolvedLocation){
            return searchFile;
        }
    }
    var newresolvedLocation = resolvedLocation.replace('enterpriseModels/src/main/resources/', '');
    //do the same search on eList just in case!!!!
    
    for(var i = 0;i<eList.length;++i){
        var searchFile = eList[i];
        if(searchFile.filename==newresolvedLocation){
            return searchFile;
        }
    }
    a=shouldnevernotresolveafile;
    return null;
}

function isDuplicateImportFlag(allXSDFile, dupXSDs) {
    if (dupXSDs.indexOf(allXSDFile.key) != -1) {
        return true;
    } else {
        return false;
    }
}
function concatNameSpaces(importObject, namespaces, dupNameSpaces, fromFile, fromKey) {
    //now for each key get the key and the value and make an Array of them?
    //only add it if its not already added?
    for (var i = 0; i < namespaces.length;++ i) {
        //could check for uniqueness but I need to verify that first as it may be incorrect?
        //is this already added?
        var otherNamespace = namespaces[i];
        //console.log('otherNamespace:');
        //console.log(otherNamespace);
        if (dupNameSpaces.indexOf(otherNamespace) == -1) {
            //that means im adding this in
            for (var key in otherNamespace) {
                namespaceKey = {};
                namespaceKey.alias = key;
                namespaceKey.target = otherNamespace[key];
                namespaceKey.fromFile = fromFile;
                namespaceKey.fromKey = fromKey;
                importObject.namespaces.push(namespaceKey);
            }
        }
    }
}
function absolute(base, relative) {
    var stack = base.split("/"),
    parts = relative.split("/");
    stack.pop();
    // remove current file name (or empty string)
    // (omit if "base" is the current folder without trailing slash)
    for (var i = 0; i < parts.length; i++) {
        if (parts[i] == ".")
        continue;
        if (parts[i] == "..")
        stack.pop(); else
        stack.push(parts[i]);
    }
    return stack.join("/");
}
function traverse(x, allXSD, xPath, xPathList, maintainXPATH, order, nameSpaceKeys, filekey) {
    //console.log(xPath);
    /*if((x!=null)&&(x.child!=null)){
        return x;
    }
    else*/ if (isArray(x)) {
        traverseArray(x, allXSD, xPath, xPathList, true, order++, nameSpaceKeys, filekey);
    } else if ((typeof x === 'object') && (x !== null)) {
        if (traverseObject(x, allXSD, xPath, xPathList, false, order++, nameSpaceKeys, filekey) == false) {
            return false;
        };
    } else {
        //the current thing isnt an object nor is it an array
        //console.log(x);
    }
    return x;
}
function isArray(o) {
    return Object.prototype.toString.call(o) === '[object Array]';
}
function traverseArray(arr, allXSD, xPath, xPathList, maintainXPATH, order, nameSpaceKeys, filekey) {
    //console.log("<array>");
    //current object is an array so I dont need to do much other than process each element
    //update this to a for loop?
    for (var i = 0; i < arr.length; i++) {
        traverse(arr[i], allXSD, xPath, xPathList, true, order++, nameSpaceKeys, filekey);
    }
}
function traverseObject(obj, allXSD, xPath, xPathList, maintainXPATH, order, nameSpaceKeys, filekey) {
    //stopCounter++;if(stopCounter>maxCounter){a=counterended;}
    //is one of these keys a type?
    //I only need to check that type and ref arent null...
    //console.log('obj');
    //console.log(obj);
    
    if (obj.base != null) {
        //console.log('object with base');
        //console.log(obj);
        if (isRecursive(obj.base, xPath, 'base')) {
            obj.recursive = true;
            delete obj.child;
            //can I mark the parent as recursive?
            return false;
        }
        var namedObject = getNamedType(obj.base, obj, obj, allXSD, nameSpaceKeys, filekey);
        //console.log('return from obj.base');
        //console.log(namedObject);
        obj.child = namedObject;
        var newxpath = xPath;
        
        //console.log('About to call traverse object with a new key from a base return : ' + namedObject.filekey);
        traverse(namedObject, allXSD, newxpath, xPathList, false, order++, nameSpaceKeys, namedObject.filekey);
    }
    if (obj.type != null) {
        if (isRecursive(obj.type, xPath, 'type')) {
            obj.recursive = true;
            delete obj.child;
            //can I mark the parent as recursive?
            return false;
        }
        //console.log('##########');
        //console.log('obj.type='+ obj.type);
        //console.log('##########');
        var namedObject = getNamedType(obj.type, obj, obj, allXSD, nameSpaceKeys, filekey);
        //console.log('return from obj.type');
        //console.log(namedObject);
        obj.child = namedObject;
        if (maintainXPATH) {
            var newxpath = xPath;
        } else {
            var newxpath = xPath + '/' + obj.name;
            
            //console.log('everytime I do this "xPathList.push" I need to check the properties?');
        }
        //a=typeisntnotnull;
        
        //console.log('About to call traverse object with a new key from a type return : ' + obj.child.filekey);
        traverse(namedObject, allXSD, newxpath, xPathList, false, order++, nameSpaceKeys, obj.child.filekey);
    } else if (obj.ref != null) {
        if (isRecursive(obj.ref, xPath, 'ref')) {
            obj.recursive = true;
            delete obj.child;
            return false;
            a = isrecursivefountrue;
        }
        //console.log(obj);
        var namedObject = getNamedType(obj.ref, obj, obj, allXSD, nameSpaceKeys, filekey);
        //console.log('return from obj.ref');
        //console.log(namedObject);
        obj.child = namedObject;
        
        var newxpath = xPath + '/' + obj.ref;
        
        
        
        //console.log('About to call traverse object with a new key from a ref return : ' + obj.child.filekey);
        traverse(namedObject, allXSD, newxpath, xPathList, true, order++, nameSpaceKeys, obj.child.filekey);
    } else {
        for (var key in obj) {
            if ((key != 'type') &&(key != 'base') &&(key != 'ref')) {
                if (obj.hasOwnProperty(key)) {
                    //console.log(key);
                    //console.log(obj[key]);
                    //I only care about objects and arrays but will call generic
                    traverse(obj[key], allXSD, xPath, xPathList, false, order++, nameSpaceKeys, filekey);
                }
            }
        }
    }
}
function getNamedType(type, parentObject, xsdObject, allobjects, targetNamespaceList, currentFilekey) {
    //console.log('type');
    //console.log(type);
    
    var returnFileKey = currentFilekey;
    //is this a localtype? core type, msg type or xs native type?
    var matchedObject = null;
    var posSemi = type.indexOf(':');
    if (posSemi != -1) {
        
        var namespace = type.substring(0, posSemi);
        //now depending on this namespace it could be local?
        var targetNamespace = xsdObject.targetNamespace;
        var namespaceAlias = xsdObject.namespaceAlias;
        var nameSpaceOfObject = resolvenamespaceAliasToTarget(namespace, targetNamespaceList, currentFilekey);
        if (nameSpaceOfObject == null) {
            a=nullfoundontargetnamespace;
        }
        
        
        if (matchedObject == null) {
            var objectList =[];
            for (var i = 0; i < allobjects.length; i++) {
                var schemaObject = allobjects[i];
                if (schemaObject.targetNamespace == nameSpaceOfObject) {
                    //a=matchedit;
                    //logit('schemaObject.targetNamespace:'+schemaObject.targetNamespace);
                    //logit('nameSpaceOfObject:'+nameSpaceOfObject);
                    
                    //logit('schemaObject');
                    //logit(schemaObject);
                    //logit('xsdObject');
                    //logit(xsdObject);
                    /*console.log(schemaObject.namespaceAlias);
                    //console.log(xsdObject.namespaceAlias);
                    //console.log(schemaObject);
                    //console.log(xsdObject);
                    a=doesthismarryup;*/
                    
                    //console.log('the alias matched but not the targets?');
                    //logit('adding in the objects from ' + namespace);
                    objectList = objectList.concat(returnArray(schemaObject.element), returnArray(schemaObject.complexType), returnArray(schemaObject.simpleType), returnArray(schemaObject.attributeGroup), returnArray(schemaObject.group), returnArray(schemaObject.attribute));
                    //console.log('set a new key to :' + schemaObject.key); 
                    returnFileKey = schemaObject.key;
                    //I need to get the targetnamespace that also inlcudes the version
                }
            }
            //if((type=='icore:OverrideKey')&&(objectList.length<1)){console.log(schemaObject);console.log(objectList.length);a=dhjkdhdkhdkjhdjkhd;};
            //console.log('objectList');
            //console.log(objectList);
            for (var i = 0; i < objectList.length; i++) {
                var name = namespace + ':' + objectList[i].name;
                //console.log(name);
                if (name == type) {
                    matchedObject = objectList[i];
                    break;
                }
            }
            
            if (matchedObject != null) {
                //console.log('Found the matched object as a non local under namespace:' + namespace);
                //console.log('##########returnFileKey:' + returnFileKey);
                matchedObject.filekey = returnFileKey;
                return matchedObject;
            } else {
                
                
                console.error('Major Error in finding core or msg type?');
                /*
                dumpToDisk(type, 'type.log');
                dumpToDisk(parentObject, 'parentObject');
                dumpToDisk(xsdObject, 'xsdObject');
                dumpToDisk(objectList, 'objectList');
                dumpToDisk(allobjects, 'allobjects');
                dumpToDisk(targetNamespaceList, 'targetNamespaceList');
                */
                a = stilldidntfindamatchedobjectinwhatevernamespacethisis;
            }
        }
    } else {
        //console.log('########################');
        //console.log('no namepsace means Im down to the root type' + namespace + ' ' + type);
        //console.log(parentObject);
        //console.log(parentObject);
        //console.log('########################');
        var baseType = {};
        baseType.xsType = 'xs:' + type;
        baseType.filekey = returnFileKey;
        return baseType;
    }
    //I shouldnt get to here?
    
    console.error('no namepsace is an issue');
    console.error('index:' + type.indexOf(':'));
    console.error(complexTypeArray);
    console.error(elementArray);
    console.error(simpleArray);
    console.error(xsdObject);
    console.error('type:' + type);
    
    console.error(type);
    console.error(parentObject);
    a = ishouldneverarrivehere;
    return null;
}

function dumpToDisk(object, filename){
    var contents = JSON.stringify(object);
    if(filename.indexOf('.')==-1){
        filename+='.json';
    }
    //console.log('Saved : ' + filename);
    fs.writeFileSync('log/' + filename, contents);
}

function resolvenamespaceAliasToTarget(namespaceAlias, targetNamespaceList, currentFilekey) {
    //loop through all targets..namespaceAlias
    //console.log(namespaceAlias);
    //console.log(targetNamespaceList);
    for (var i = 0; i < targetNamespaceList.length;++ i) {
        var nsObj = targetNamespaceList[i];
        //I can only match on this if the key is from the same file?
        
        if (namespaceAlias == nsObj.alias){
            /*console.log('Alias matches so checking the keys');
            //console.log('Printing nsobj followed by Filekey followed by alias');
            //console.log(nsObj);
            //console.log(currentFilekey);
            //console.log(namespaceAlias);
            */
            if(currentFilekey == nsObj.fromKey){
                return nsObj.target;
            }
        }
    }
    /*
    //console.log('Printing targetNamespaceList followed by Filekey followed by alias');
    //console.log(targetNamespaceList);
    //console.log(currentFilekey);
    //console.log(namespaceAlias);
    //I actually think its ok as it means a namespace has no import and therefore is not really relevant?
    
    //a=icoundNOTreoslvednamespaces;
    */
    return null;
}
function isRecursive(itemName, inXPath) {
    inXPath = inXPath + '/';
    itemName = '/' + itemName + '/';
    var onePOS = inXPath.indexOf(itemName, 0);
    //there is a chance?
    if (onePOS == -1) {
        //I have never seen this one before?
        return false;
    } else {
        var counter = occurrences(inXPath, itemName, false);
        if (counter > 3) {
            return true;
        } else {
            return false;
        }
    }
}
function createXPathList(processedXSDObject, currentKey, parentKey, xPath, choiceCount, parentArray) {
    
    if (isArray(processedXSDObject)) {
        for (var i = 0; i < processedXSDObject.length; i++) {
            createXPathList(processedXSDObject[i], 'array', currentKey, xPath, choiceCount, parentArray);
        }
    } else if ((typeof processedXSDObject === 'object') && (processedXSDObject !== null)) {
        //here I want to skip items that arent of interest?
        
        //this gets dropped for some reason and Im not sure why?
        var currentArray = parentArray;
        if (keepTreeData(currentKey, parentKey) == true) {
                            
            
            if ((processedXSDObject.ref != null) ||(processedXSDObject.name != null) ||(currentKey == 'choice')) {
                if (processedXSDObject.ref != null) {
                    xPath = xPath + '/' + processedXSDObject.ref;
                    processedXSDObject.xPathKey = xPath;
                } else if (processedXSDObject.name != null) {
                    xPath = xPath + '/' + processedXSDObject.name;
                    processedXSDObject.xPathKey = xPath;
                } else if (currentKey == 'choice') {
                    //console.log(processedXSDObject);
                    choiceCount++;
                    //I have to add choices for as many children elements or something like that?
                    var choicesArray = choiceArrayCreator(processedXSDObject);
                    //for each choiceArray I can process it but add a new xapth to each
                    for (var q = 0; q < choicesArray.length; q++) {
                        var newxPath = xPath + '/' + 'choice-' + q;
                        processedXSDObject.xPathKey = xPath;
                        createXPathList(choicesArray[q], q, currentKey, newxPath, choiceCount, parentArray);
                        //mark this as not to be processed
                        processedXSDObject = {};
                    }
                    //a=addingChoice;
                }
                
                //processedXSDObject.xPath = xPath;
                if (currentKey != 'choice') {
                    
                    var xPather = getXPathProperties(processedXSDObject, xPath, parentArray);
                    if (xPather != null) {
                        parentArray.push(xPather);
                    }
                    xPather = null;
                }
            }
        }
        //always process the child object first before looping on the keys
        if (processedXSDObject.child != null) {
            createXPathList(processedXSDObject.child, 'child', currentKey, xPath, choiceCount, parentArray);
        }
        for (var key in processedXSDObject) {
            if (key != 'child') {
                createXPathList(processedXSDObject[key], key, currentKey, xPath, choiceCount, parentArray);
            }
        }
    } else {
        //console.log('not an object');
        // //console.log(SOAObj);
    }
    return parentArray;
}
function keepTreeData(currentType, parentType) {
    //return true;
    if (parentType + '-' + currentType == 'choice-sequence') {
        return true;
    } else if ((currentType == 'child') ||(currentType == 'complexContent') ||(currentType == 'sequence') ||(currentType == 'complexType') ||(currentType == 'extension') ||(currentType == 'restriction') ||(currentType == 'annotation') ||(currentType == 'documentation') ||(currentType == 'refData') ||(parentType == 'restriction')) {
        return false;
    } else {
        return true;
    }
}
function getReferenceDataFromObject(elementObject){
    if(elementObject.refData!=null){
        return elementObject.refData;
    }else if((elementObject.child!=null)&&(elementObject.child.refData!=null)){
        return elementObject.child.refData;
    }else if((elementObject.child!=null)&&(elementObject.child.child!=null)&&(elementObject.child.child.refData!=null)){
        return elementObject.child.child.refData;
    }else{
        return null;
    }    
}
function addRestrictions(restrictionObj, returnObject) {
    
    return returnObject;
}
function choiceArrayCreator(soaObject) {
    var matchedArray = false;
    var choices =[];
    for (var key in soaObject) {
        if (soaObject.hasOwnProperty(key)) {
            var childObject = soaObject[key];
            //find the array
            if ((typeof childObject === 'object') && (childObject !== null)) {
                //wrap all objects in a choice Array
                if (isArray(childObject)) {
                    //each object in an array needs to get a seperate id
                    //push each item from the array into a choices array
                    for (var i = 0; i < childObject.length; i++) {
                        choices.push(childObject[i]);
                    }
                } else {
                    choices.push(childObject);
                }
                //console.log('found an object with key:' + key);
                //console.log(childObject);
                matchedArray = true;
                //each object needs a unique choice number!
                break;
            }
        }
    }
    if (matchedArray != true) {
        console.error('A choice has been found with no objects under it?');
        console.error(soaObject);
        a = choiceserror;
    } else {
        return choices;
    }
    return choices;
}
function occurrences(string, subString, allowOverlapping) {
    string += "";
    subString += "";
    if (subString.length <= 0) return (string.length + 1);
    
    var n = 0,
    pos = 0,
    step = allowOverlapping ? 1: subString.length;
    
    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {++ n;
            pos += step;
        } else break;
    }
    return n;
}
function compareReleases(currentAndPreviousObject){
    var current = currentAndPreviousObject.current;
    var previous = currentAndPreviousObject.previous;
    //maybe just do each service root?
    for (var i = 0; i < current.length; i++) {
        var currentSO = current[i];
        //if(currentSO.ServiceNumber!='CORE'){
            currentSO.majorChangeCount = 0;
            currentSO.minorChangeCount = 0;
            currentSO.refDataChangeCount = 0;
            currentSO.emumerationChangeCount = 0;
            currentSO.changeDescriptions = [];
            currentSO.shortChangeDescriptions = [];
            for (var k = 0; k < previous.length; k++) {
                var previousSO = previous[k];
                if(currentSO.key==previousSO.key){
                    
                    compareServiceObjects(currentSO,previousSO); 
                    
                    //a=breaknow;
                    break;
                }      
            }    
        //}
        
    }
    
    
    for (var i = 0; i < current.length; i++) {
        var currentSO = current[i];
        //if(currentSO.ServiceNumber!='CORE'){
            if(currentSO.compareMatched!=true){
                currentSO.different = true;
                //so this is new bu I better check if there is a previous version
                //console.log(currentSO);
                if(currentSO.ServiceVersion!='V1.0'){
                    var matchedPreviousVersion = false;
                    //its rare that this would ever chnage like this as a version not at 1?
                    currentSO.VersionChange = true;
                    var previousVersion = decreaseVersion(currentSO.ServiceVersion);
                    //as this is a just a check I can do a key replace and see it works without too much thinking
                    var previousVersionClean = replaceAll(replaceAll(previousVersion, '.', ''), '/', '');
                    var currentVersionClean = replaceAll(replaceAll(currentSO.ServiceVersion, '.', ''), '/', '');
                    var previousKey = replaceAll(currentSO.key,currentVersionClean, previousVersionClean);
                    //console.log(previousKey + ':' + currentSO.key);
                    if(previousKey!=currentSO.key){
                    //go look for another version
                        for (var k = 0; k < previous.length; k++) {
                            var previousSO = previous[k];
                            //if(previousSO.ServiceNumber!='CORE'){
                                if(previousSO.key==previousKey){
                                    compareServiceObjects(currentSO,previousSO);
                                    matchedPreviousVersion=true;
                                    break;
                                }
                            //}
                        }
                    }
                    if(matchedPreviousVersion!=true){
                        currentSO.IsNew = true;
                        currentSO.majorChangeCount = currentSO.xPathList.length;
                    }
                }else{
                    currentSO.IsNew = true;
                    currentSO.majorChangeCount = currentSO.xPathList.length;
                }
                
                //set the counts?
                

            }
            for (var m = 0; m < currentSO.schemaList.length; m++) {
                var currentSchemaObj = currentSO.schemaList[m];
                if(currentSchemaObj.compareMatched!=true){
                    currentSchemaObj.IsNew = true;
                    currentSchemaObj.different = true;
                    
                }
            }
        //}
    }
    for (var k = 0; k < previous.length; k++) {
        var previousSO = previous[k];
        //if(previousSO.ServiceNumber!='CORE'){
            if(previousSO.compareMatched!=true){
                previousSO.IsRemoved = true;
                previousSO.different = true;
            }
            for (var n = 0; n < previousSO.schemaList.length; n++) {
                var previousSchemaObj = previousSO.schemaList[n];
                if(previousSchemaObj.compareMatched!=true){
                    previousSchemaObj.IsRemoved = true;
                    previousSchemaObj.different = true;
                }
            }
        //}
    }

    for (var i = 0; i < current.length; i++) {
        
        var soObject = current[i];            
        if(soObject.different){
            //try something
            soObject.changeSortOder = calculateSortOder(soObject);
        }
    }        
    return current;
    
}

function calculateSortOder(currentSO){
    //what its its new?
    if(currentSO.IsRemoved){
        return -1 * Math.pow(1000, 7);
    }else if(currentSO.IsNew){
        return -1 * Math.pow(1000, 8);
    }else if(currentSO.VersionChange){
        return -1 * Math.pow(1000, 6);
    }
    
    var sortMajor = currentSO.majorChangeCount*1000000;
    var sortMinor = currentSO.minorChangeCount*1000;
    var sortEnum = currentSO.emumerationChangeCount*10;
    var sortRef = currentSO.refDataChangeCount*1;
    var sortOrder = -1 * (sortMajor + sortMinor + sortEnum + sortRef);
    return sortOrder;
    
}

function compareServiceObjects(currentSO,previousSO){
    currentSO.compareMatched = true;
    previousSO.compareMatched = true;
    var resultDiff = diffxPathList(currentSO.xPathList, previousSO.xPathList, currentSO);
    currentSO.changeList = resultDiff;
    currentSO.different = false;
    
    if(resultDiff.length>0){
        currentSO.different = true;
        //now for each schema are they different?
        //for each schema match them and compare them?
        for (var i=0;i<currentSO.schemaList.length;i++){
            var matchedXSDFlag = false;
            var currentXSD = currentSO.schemaList[i];
            currentXSD.majorChangeCount = 0;
            currentXSD.minorChangeCount = 0;
            currentXSD.refDataChangeCount = 0;
            currentXSD.emumerationChangeCount = 0;
            currentXSD.changeDescriptions = [];
            currentXSD.shortChangeDescriptions = '';
            currentXSD.changeList = [];
            for (var k=0;k<previousSO.schemaList.length;k++){
                var previousXSD = previousSO.schemaList[k];
                if(currentXSD.schemaName==previousXSD.schemaName){
                    matchedXSDFlag = true;
                    var resultXSDDiff = diffxPathList(currentXSD.xPathList, previousXSD.xPathList, currentXSD);
                    currentXSD.changeList = resultXSDDiff;
                    currentXSD.different = false;
                    if(resultXSDDiff.length>0){
                        //a=fundemental;
                        currentXSD.different = true;
                    }
                }                    
            }
            if(matchedXSDFlag!=true){
                currentXSD.different = true;
                currentXSD.IsNew = true;
                currentXSD.majorChangeCount = currentXSD.xPathList.length;
            }
        }
        
    }
    //might ahve to do a diff at the xsd level if they are different?
}
function diffxPathList(x1, x2, SO){
    r1 = [];
    //loop through x1 and find the values in x2...
    for (var i = 0; i< x1.length; i++){
        var x1item = x1[i];
        //set every item in x1 to new until I match its key
        x1item.changeType='new';
        for (var k = 0; k< x2.length; k++){
            //you cant touch x2 items as they will always loop from the start
            var x2item = x2[k];
            if((x1item.key==x2item.key)&&(x1item.name==x2item.name)&&(x2item.matchedKey!=true)){
                //set both items as matches to the same until I compare them
                x1item.changeType='same';
                x2item.changeType='same';
                x1item.matchedKey=true;
                x2item.matchedKey=true;
                //compare the xCompare values
                if(x1item.xCompare!==x2item.xCompare){
                    //console.log('key matched but these not the same : ' + x1item.xCompare + '!=' + x2item.xCompare);
                    diffObject = {};
                    diffObject.newObject = x1item;
                    diffObject.oldObject = x2item;
                    diffObject.changeType='changed'; 
                    diffObject.key = x1item.key;
                    x1item.changeType='changed';
                    x2item.changeType='changed';
                    diffObject.report = diffElementObjects(x1item,x2item, SO); 
                    //get a difference report from a custom function that understands the diffs
                    
                    r1.push(diffObject);
                    break;
                }else{
                    //I think Im ok to break here as the xPathlist item matched 
                    break;
                }
            }
        }
    }
    //this loop gets all the new items and pushes them into the change array
    for (var i = 0; i< x1.length; i++){
        var x1item = x1[i];
        if(x1item.changeType=='new'){
            diffObject = {};
            diffObject.newObject = x1item;
            diffObject.changeType=x1item.changeType;
            diffObject.key = x1item.key;
            diffObject.report = diffElementObjects(x1item,null, SO);
            r1.push(diffObject);
        }    
    }
    //this loop picks up all deleted items as they didnt get matched against the new items and are set to null
    for (var k = 0; k< x2.length; k++){
        var x2item = x2[k];
        if(x2item.changeType==null){
            diffObject = {};
            diffObject.oldObject = x2item;
            diffObject.key = x2item.key;
            diffObject.report = diffElementObjects(null, x2item, SO);
            diffObject.changeType='deleted';
            r1.push(diffObject);
        }
    }
    return r1;
}
function diffElementObjects(d1, d2, SO){
    var report = {};
    var changes = [];
    var minorChangeCount = 0;
    var majorChangeCount = 0;
    var refDataChangeCount = 0;
    var emumerationChangeCount = 0;
    var descriptions = [];
    var shortDescriptions = [];
    var changeSummary = '';
    //so now look at specific keys and do the diff
    
    
    if(d2==null){
        changes.push('new item');
        descriptions.push(d1.shortname + ' is new.');
        shortDescriptions.push('new');
        majorChangeCount++;
    }else if(d1==null){
        changes.push('deleted item');
        majorChangeCount++;
    }else{
        if(d1.block!=d2.block){
    	   changes.push('block');
    	   minorChangeCount++;
        }
        if(d1['default']!=d2['default']){
        	changes.push('default');
        	minorChangeCount++;
        }
        if(d1.enumeration!=d2.enumeration){
        	changes.push('enumeration');
            if(d1.enumeration==null){
                //console.log(SO.key);
            }
            if(d2.enumeration==null){
                //console.log(SO.key);
            }
            var diffs = diffArrayOfStrings(d1.enumeration,d2.enumeration);
        	descriptions.push(d1.shortname + ' has the following adds to the enumeration : ' + diffs.join(',')); 
        	shortDescriptions.push('Added : ' + diffs.join(','));
        	emumerationChangeCount++;
        	report.enumerationDiffs = diffs; 
        }
        if(d1.fixed!=d2.fixed){
        	changes.push('fixed');
        	minorChangeCount++;
        }
        if(d1.fractionDigits!=d2.fractionDigits){
        	changes.push('fractionDigits');
        	minorChangeCount++;
        }
        if(d1.length!=d2.length){
        	changes.push('length');
        	minorChangeCount++;
        }
        if(d1.maxExclusive!=d2.maxExclusive){
        	changes.push('maxExclusive');
        	minorChangeCount++;
        }
        if(d1.maxInclusive!=d2.maxInclusive){
        	changes.push('maxInclusive');
        	minorChangeCount++;
        }
        if(d1.maxLength!=d2.maxLength){
        	changes.push('maxLength');
        	minorChangeCount++;
        }
        if(d1.maxOccurs!=d2.maxOccurs){
        	changes.push('maxOccurs');
        	minorChangeCount++;
        }
        if(d1.minExclusive!=d2.minExclusive){
        	changes.push('minExclusive');
        	minorChangeCount++;
        }
        if(d1.minInclusive!=d2.minInclusive){
        	changes.push('minInclusive');
        	minorChangeCount++;
        }
        if(d1.minLength!=d2.minLength){
        	changes.push('minLength');
        	minorChangeCount++;
        }
        if(d1.minOccurs!=d2.minOccurs){
        	changes.push('minOccurs');
            minorChangeCount++;
        }
        if(d1.nillable!=d2.nillable){
        	changes.push('nillable');
        	minorChangeCount++;
        }
        if(d1.pattern!=d2.pattern){
        	changes.push('pattern');
        	minorChangeCount++;
        }
        if(d1.totalDigits!=d2.totalDigits){
        	changes.push('totalDigits');
        	minorChangeCount++;
        }
        if(d1.whiteSpace!=d2.whiteSpace){
        	changes.push('whiteSpace');
        	minorChangeCount++;
        }
        if(d1.xsType!=d2.xsType){
        	changes.push('xsType');
        	majorChangeCount++;
        }
    }        
    report.changes = changes;
    report.changes.descriptions = descriptions; 
    report.changes.shortDescriptions = shortDescriptions;
    report.minorChangeCount = minorChangeCount;
    report.majorChangeCount = majorChangeCount;
    report.refDataChangeCount = refDataChangeCount;
    report.emumerationChangeCount = emumerationChangeCount;
    SO.minorChangeCount = SO.minorChangeCount+minorChangeCount;
    SO.majorChangeCount = SO.majorChangeCount+majorChangeCount;
    SO.refDataChangeCount = SO.refDataChangeCount+refDataChangeCount;
    SO.emumerationChangeCount = SO.emumerationChangeCount+emumerationChangeCount;
    var len = descriptions.length;
    //looped
    if(SO.changeSummaryLimitFlag!=true){
        for(var i = 0;i<len;i++){
            var limitter = occurrences(SO.changeSummary, '\n', false);
            if(limitter>11){
                SO.changeSummaryLimitFlag = true;
                break;
            }
            SO.changeDescriptions.push(descriptions[i]);
            if(SO.changeSummary!=null){
                SO.changeSummary=SO.changeSummary + '\n' + descriptions[i];
            }else{
                SO.changeSummary=descriptions[i];
            }
            if(limitter==11){
                //this is the last of a very long list?
                SO.changeSummary=SO.changeSummary + '\n' + 'Limited Descriptions to 10....more exist.';
            }
        }
    }
    
    
    //console.log(report);
    //a=endheretotestdiff;
    
    return report;
}
function diffArrayOfStrings(A, B) {
    return A.filter(function (a) {
        return B.indexOf(a) == -1;
    });
}
function decreaseVersion(version){
    //version is V1.0 or V11.0 so take everything before the . and get rid of the v
    var result = 'V' + (version.split('.')[0].replace('V','')-1) + '.0';
    return result;
}
function replaceAll(str, find, replace) {
    //return str.replace(new RegExp(find, 'g'), replace);
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}
function resolveSpecialClauseRootElement(rawSchema) {
    if (rawSchema.filename == 'enterpriseModels/EventNotification/CBE/CommonBaseEvent_1_0_1.xsd') {
        //console.log(rawSchema.schema.element[2]);
        return rawSchema.schema.element[2];
    } else {
        //console.log('resolveSpecialClauseRootElement');
        return null;
    }
}

function fixNullNameSpace(rawSchema, nsAlias){
        //console.log(rawSchema);
        //console.log(rawSchema.schema.element);
        //create fictional
        //var fictionalRoot = rawSchema.schema.element;
        var allElements = returnArray(rawSchema.schema.element);
        if(allElements==null){
            allElements = [];
        }else if(allElements.length==1){
            //if there is only one element then make it the root?
            return allElements[0];
        }
        
        var allComplex = returnArray(rawSchema.schema.complexType);
        if((allComplex==null)||(allComplex.length==0)){
            rawSchema.schema.complexType=[];
            allComplex = returnArray(rawSchema.schema.complexType);
        }
        //create a new set of complex types first
        var newComplexTypes = [];
        for(var i = 0;i<allComplex.length;i++){
            newComplexTypes.push(allComplex[i]);
        }
        if(nsAlias==null){
            /*console.log('#########################rawSchema');
            //console.log(rawSchema);
            //console.log('#########################rawSchema.schema');
            //console.log(rawSchema.schema);
            //console.log('#########################rawSchema.schema.element');
            //console.log(rawSchema.schema.element);
            //console.log(rawSchema.schema.element[0]);
            //console.log(rawSchema.schema.element[0].complexType);
            //console.log(rawSchema.schema.element[0].complexType.sequence);
            //console.log(rawSchema.schema.element[0].complexType.sequence.element);
            //console.log(rawSchema.schema.element[0].complexType.sequence.element[0]);
            a=nsaliasisnull;*/
            var fictionalRoot = { name: 'GenericEntry', type: 'genericEntryType'};
        }else{
            var fictionalRoot = { name: 'GenericEntry', type: nsAlias + ':genericEntryType'};    
        }
        
        allElements.push(fictionalRoot);
        var fictionalType = { name: 'genericEntryType', sequence: newComplexTypes};
        allComplex.push(fictionalType);
        return fictionalRoot;
    
}

function getCategoryFromDirectory(inDir) {
    var result = null;
    //remove the stuff
    if(inDir!=null){
        result = inDir.split('/')[0];
    }
    return result;
}

