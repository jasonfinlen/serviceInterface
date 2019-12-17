// capm.js
// ========
const fs = require('fs');
var path = require('path');
var app = require('express')();
var http = require('http').createServer(app);
const request = require('request-promise');
var moment = require('moment');
var now = require("performance-now");


module.exports = {
    processLastRelease: function (allReleases, reason) {
        var allReleasesArray = allReleases.serviceRepository;
        //just get the first as its an ordered list
        var latestRelease = allReleasesArray[0];    
        return processRelease(latestRelease, reason);
    } 
  };

  function processRelease(latestRelease, reason){
      //now go and get the servicemodels and porcess each of them?
      //create a preObject to keep track of where we are at?
    var start = now();
    preWriteObj = {};
    var preNow = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
    preWriteObj.startedProcess = preNow;
    preWriteObj.lastUpdatedTimeStamp = preNow;
    preWriteObj.start = start.toFixed(3);
    preWriteObj.reason = reason;
    preWriteObj.release = latestRelease.releaseName;
    preWriteObj.valid = true;
    //read in last updated and write some CAPM data back out
    updateCAPMLastUpdatedFile(preWriteObj);

      var allCalls = [];
      var allServices = [];
      try {
        console.time('buildAllCAPMURLSList');
        for (var i = 0;i<latestRelease.serviceModels.length;i++){
            var serviceModel = latestRelease.serviceModels[i];
            var smContents = fs.readFileSync(serviceModel.filename, 'utf-8');                
            var smObject = JSON.parse(smContents);
            var smServiceList = smObject.models;
            //for (var k = 0;k<20;k++){
            for (var k = 0;k<smServiceList.length;k++){
                var serviceObject = smServiceList[k];
                var timerUnique = serviceObject.FormattedDisplayName;
                var rowsC = 0;
                var rowsP = 0;
                var consumerURL = compassConsumersURLFromServiceObj(serviceObject);
                var providerURL = compassProvidersURLFromServiceObj(serviceObject);
                var timeoutValue = 30*1000;
                var consumerURLOptions = {
                    url: consumerURL,
                    json: true,
                    timeout:timeoutValue    
                };
                var providerURLOptions = {
                    url: providerURL,
                    json: true,
                    timeout:timeoutValue    
                };
                //this keeps an alignment of servoce objects to the url calls....
                allCalls.push(consumerURLOptions);
                allCalls.push(providerURLOptions);
                serviceObject.providerData = null;
                serviceObject.consumerData = null;
                serviceObject.consumers = [];
                serviceObject.providers = [];
                allServices.push(serviceObject);
                allServices.push(null);//this keeps the index in sync between the two calls to CAPM, prov and cons
                //this is now all after the calls on a different thread...
            }
        }
        console.timeEnd('buildAllCAPMURLSList');
        //now do the promise callback
        
        const promises = allCalls.map(url => request(url));
        console.time('getAllCAPMData');
        Promise.all(promises)
            .then((data) => {
                console.timeEnd('getAllCAPMData');
                // data = [promise1,promise2];
                var CAPMresult = mergeCAPMDataServiceData(data, allServices);
                //now for the post now stuff?
                var end = now()
                
                var postNow = moment().format("dddd, MMMM Do YYYY, h:mm:ss a");
                CAPMresult.startedProcess = preNow;
                CAPMresult.finishedProcess = postNow;
                preWriteObj.start = start.toFixed(3);
                CAPMresult.end = end.toFixed(3);
                CAPMresult.processTimeMS = (end-start).toFixed(3);
                CAPMresult.processTimeSec = ((end-start)/1000).toFixed(3);
                var prettyDuration = millisToMinutesAndSeconds(CAPMresult.processTimeMS);
                CAPMresult.duration = prettyDuration;
                CAPMresult.lastUpdatedTimeStamp = postNow;
                updateCAPMLastUpdatedFile(CAPMresult);
                
            })
            .catch(error => {
                console.timeEnd('getAllCAPMData');
                console.log(error);
            });
          
      } catch (error) {
          console.log('Error occurred reloading CAPM data');
          console.dir(error);
      } 
      
  }

function updateCAPMLastUpdatedFile(CAPMResult){
    //load the last updated file from disk
    
    var lastUpdatedObject = getLastUpdatedJSON();
    if(lastUpdatedObject.valid==true){
        //append the CAPM data stuff
        
        lastUpdatedObject.CAPM = CAPMResult;
        //write this file back to disk!
        try {
            fs.writeFileSync(lastUpdatedObject.fileName, JSON.stringify(lastUpdatedObject));
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
    var lastUpdatedDataFileName = path.join(process.env.DATA_DIR,'lastUpdated.json');
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

function mergeCAPMDataServiceData(CAPMDataResponseList, ServiceList){
    var totalCAPMCallCount = CAPMDataResponseList.length;
    var totalServiceCount = ServiceList.length/2;
    var totalServicesFoundCount = 0;
    var totalHitCount = 0;
    var serviceList = [];
    var consumerList = [];
    var providerList = [];
    var systemList = [];
    try {
       //So now I need to loop through all the Reaponnses as pairs and merge them with the Services if there is any data otherwise drop it?
        for(var i = 0;i<CAPMDataResponseList.length;i+=2){
            var consumerResponse = CAPMDataResponseList[i];    
            var providerResponse = CAPMDataResponseList[i+1];
            //if the consumer or provider has data then start processing it..
            if((consumerResponse.rows!=null)&&(providerResponse.rows!=null)&&(consumerResponse.rows.length+providerResponse.rows.length>0)){
                totalServicesFoundCount++;
                var serviceObject = ServiceList[i];
                //now I need to amend the serviceObject with the capm data from the response?
                serviceObject.consumerData = consumerResponse;
                serviceObject.providerData = providerResponse;
                //now its time to clean the objects
                var serviceObject = cleanRawCAPMConsumerAndProviderData(serviceObject, 'e9');
                var serviceObject = buildConsumerProviderJSONDataObject(serviceObject);    
                if(serviceObject.totalHits!=null){
                    totalHitCount+=serviceObject.totalHits;
                }
                if(serviceObject.consumerList!=null){
                    for(var l = 0;l<serviceObject.consumerList.length;l++){
                        var consumer = serviceObject.consumerList[l];
                        if(consumerList.indexOf(consumer.consumer) == -1){
                            consumerList.push(consumer.consumer);
                        } 
                        if(systemList.indexOf(consumer.consumer) == -1){
                            systemList.push(consumer.consumer);
                        }
                    }
                }
                if(serviceObject.providerList!=null){
                    for(var m = 0;m<serviceObject.providerList.length;m++){
                        var provider = serviceObject.providerList[m];
                        if(providerList.indexOf(provider.provider) == -1){
                            providerList.push(provider.provider);
                        }
                        if(systemList.indexOf(provider.provider) == -1){
                            systemList.push(provider.provider);
                        }
                    }
                }

                serviceList.push(serviceObject);
            }
        }
        console.log('From '+totalCAPMCallCount+' calls to CAPM and a starting list of '+totalServiceCount+' services, '+totalServicesFoundCount+' services have data');
        var allSystemList = {};
        allSystemList.totalHitCount = totalHitCount;
        allSystemList.consumerList = consumerList;
        allSystemList.providerList = providerList;
        allSystemList.systemList = systemList;
        allSystemList.serviceList = serviceList;
        console.log('Writing results from ' + totalCAPMCallCount + ' CAPM calls for provider and consumer data');
        var allSystemsListContents = JSON.stringify(allSystemList);
        var allSystemsListFileName = path.join(process.env.DATA_DIR, 'allSystemList.json');
        fs.writeFileSync(allSystemsListFileName, allSystemsListContents, 'utf-8');

        //Im reloading here so I dont have to fetch it all again from CAPM
        var allSystemsListFileName = path.join(process.env.DATA_DIR, 'allSystemList.json');
        var serviceListContents = fs.readFileSync(allSystemsListFileName, 'utf-8');
        var allSystemList = JSON.parse(serviceListContents);
        //So now I can format it in different ways?
        var systemListData = createSystemList(allSystemList);
        var systemMatrixData = formatSystemListToMatrix(systemListData);
        var systemDependencyWheelData = formatSystemMatrixToDependencyWheelData(systemMatrixData, systemListData, 'ALL');
        //now simply save some of this stuff out along with a summary object thats got the call back URLS for all this?
        var content = JSON.stringify(systemDependencyWheelData);
        var filename = path.join(process.env.DATA_DIR, 'systemDependencyWheelData.json');
        fs.writeFileSync(filename, content, 'utf-8');
        var content = JSON.stringify(systemMatrixData);
        var filename = path.join(process.env.DATA_DIR, 'systemMatrixData.json');
        fs.writeFileSync(filename, content, 'utf-8');
        var content = JSON.stringify(systemListData);
        var filename = path.join(process.env.DATA_DIR, 'systemListData.json');
        fs.writeFileSync(filename, content, 'utf-8');
        //fix the fact tha this is no longer syncronise!!!
        console.log('Finished CAPM reload'); 
        var resultObject = {};
        resultObject.valid = true;
        resultObject.totalCAPMCallCount = totalCAPMCallCount;
        resultObject.totalServiceCount = totalServiceCount;
        resultObject.totalServicesFoundCount = totalServicesFoundCount;
        return resultObject;

        console.log('From '+totalCAPMCallCount+' calls to CAPM and a starting list of '+totalServiceCount+' services, '+totalServicesFoundCount+' services have data');
    } catch (error) {
        //TODO fix error handling!
        console.error('An error occured in processing the CAPM data...not fetching it...');
        error.valid = false;
        console.log(error);
        return error;
    }
}

  function formatSystemMatrixToDependencyWheelData(systemMatrixData,systemListData,systemType){
    //console.log(systemMatrixData);
    //console.log(systemListData);
    var systemDependencyWheelData = {};
        var matrixDataArray = []; 
        var packageNamesObject = {};
        var matrixServiceLists = [];
        //console.log(systemMatrixData);
        
        
        for(var i = 0;i<systemMatrixData.length;i++){
            var system = systemMatrixData[i];
            matrixDataArray.push(system.matrix);
            packageNamesObject[i] = system.name;
        }
        systemDependencyWheelData.matrix=matrixDataArray;
        systemDependencyWheelData.packageNames=packageNamesObject;
        systemDependencyWheelData.systemListData=systemListData;
        systemDependencyWheelData.systemType=systemType;
        systemDependencyWheelData.systemMatrixData=systemMatrixData;
        
        //console.log('systemDependencyWheelData');
        //console.log(systemDependencyWheelData);
        return systemDependencyWheelData;
    }
  function compassConsumersURLFromServiceObj(serviceObj, period, environment){
    var pm_url = process.env.CAPM_URL;
    pm_url += '?action=doAttributes';
    pm_url += '&type=JSONP';
    pm_url += '&reportname=consumer.sql';
    if(environment==null){
        environment = 'e9'
    }
    var environmentParms = '&env='+ environment;
    pm_url += environmentParms;
    domain = '&domain='+getDomain(environment);
    pm_url += domain;
    //now I need the targetNamespace last section...
    
    var requestSchemaName = serviceObj.schemaList[0].schemaName;
    myID = '&id='+ serviceObj.shortNamespace + '-%3E' + requestSchemaName + '-%3Edp:ServiceCompleted';
    pm_url += myID; 
    if(period==null){
        period='30d';
    }
    duration = '&start=-'+ period;
    pm_url += duration;
    //now Add the parms
    pm_url += '&key=' + serviceObj.key;
    return pm_url;
}

function compassProvidersURLFromServiceObj(serviceObj, period, environment){
    var pm_url = process.env.CAPM_URL;
    pm_url += '?action=doList';
    pm_url += '&type=JSONP';
    if(environment==null){
        environment = 'e9'
    }
    environmentParms = '&env='+environment;
    pm_url += environmentParms;
    domain = '&domain='+getDomain(environment);
    pm_url += domain;
    
    
    var requestSchemaName = serviceObj.schemaList[0].schemaName;
    myID = '&id='+ serviceObj.shortNamespace + '-%3E' + requestSchemaName + '&classname=extendedprofilepoint&name=extendedprofilepoint&nametype=classes';
    pm_url += myID; 
    if(period==null){
        period='30d';
    }
    duration = '&start=-'+ period;
    pm_url += duration;
    pm_url += '&key=' + serviceObj.key;
    return pm_url;
}
function getDomain(env){
    switch(env.toLowerCase()){
        case 'e9':
        return 'Production';
        case 'e8':
        return 'NonProdE8';
        case 'e7':
        return 'NonProdE7';
        case 'e6':
        return 'NonProdE6';
        case 'e5':
        return 'NonProdE5';
        case 'e4':
        return 'NonProdE4';
        case 'e3':
        return 'NonProdE3';
        case 'e2':
        return 'NonProdE2';
        case 'e1':
        return 'NonProdE1';
    }
}

function cleanRawCAPMConsumerAndProviderData(ServiceObject, env){
    var capmConsumerData = ServiceObject.consumerData;
    var capmProviderData = ServiceObject.providerData;
    if(capmProviderData!=null){
        for (var m = 0;m<capmProviderData.rows.length;++m) {
            if(includeProviderRow(capmProviderData.rows[m], ServiceObject)){
                capmProviderData.rows[m].env = env;
                capmProviderData.rows[m].provider = capmProviderData.rows[m].name.replace('dp:Provider:', ''); 
                ServiceObject.providers.push(capmProviderData.rows[m]);
            }
        }
    }
    if(capmConsumerData!=null){
        for (var k = 0;k<capmConsumerData.rows.length;++k) {
            if(includeConsumerRow(capmConsumerData.rows[k], ServiceObject)){
                capmConsumerData.rows[k].env = env;
                ServiceObject.consumers.push(capmConsumerData.rows[k]);    
            }
        }
    }
    return ServiceObject;
    
}
function includeProviderRow(rowItem, serviceObject){
    //console.log(rowItem.name);
     //1 hit in 90 days doesnt mean enough!
     if(rowItem.name.indexOf(':Provider')==-1){
         return false;
     }
     if(rowItem.name.indexOf(':ESB')!=-1){
         return false;
     }
     if(rowItem.name.indexOf(':DESB')!=-1){
         return false;
     }
     
     return true;
 }
 function includeConsumerRow(rowItem, serviceObject){
     //1 hit in 90 days doesnt mean enough!
     
     if(rowItem.hits<2){
         return false;
     }
     if(rowItem.consumer.indexOf(serviceObject.ServiceNumber)!=-1){
         return false;
     }
     //does this consumer already exist?
     for (var i = 0; i < serviceObject.consumers.length;++i){
         var consumerObj = serviceObject.consumers[i];
         if(consumerObj.consumer==rowItem.consumer){
             return false;
         }
     }
     //finally if there is an array of providers already make sure thisisnt one of them?
     if((serviceObject.providers!=null)&&(rowItem.consumer!="NONE")){
         for (var i = 0; i < serviceObject.providers.length;++i){
             if(rowItem.consumer==serviceObject.providers[i].provider){
                 return false;
             }
         }
     }
     return true;
 }

 function buildConsumerProviderJSONDataObject(serviceObject){
    var consumerProviderObject = {};
    consumerProviderObject.service = serviceObject;
    //before I do anything I should update stuff first?
    if((serviceObject.consumers!=null)&&(serviceObject.consumers.length>0)&&(serviceObject.providers!=null)&&(serviceObject.providers.length>0)){
        var consumerList = returnArray(serviceObject.consumers);
        var providerList = returnArray(serviceObject.providers);
        var mergedConsumerList = [];
        var newConsumerList = [];
        
        var newProviderList = [];
        var totalHits = 0;
        //before adding this I need to do a quick loop and merge stuff that is Q1 vs Q2?
        for(var i = 0;i<consumerList.length;i++){
            var currentConsumerObj = consumerList[i];
            currentConsumerObj.consumer = resolveConsumerProviderNames(currentConsumerObj.consumer);
            var mergedCurrentConsumerObj = null;
            var currentName = resolveConsumerProviderNames(currentConsumerObj.consumer).toUpperCase();
            for(var j = 0;j<consumerList.length;j++){
                var alternateConsumerObj = consumerList[j];
                var alternateName = resolveConsumerProviderNames(alternateConsumerObj.consumer).toUpperCase();
                //are these the same except for the one Im currently checking...i=k?
                if((i!=k)&&(alternateName==currentName)){
                    //console.log(alternateName + '==' + currentName);
                    //console.log(currentConsumerObj);
                    //console.log(alternateConsumerObj);
                    mergedCurrentConsumerObj = mergeConsumers(currentConsumerObj, alternateConsumerObj);
                    //console.log('mergedCurrentConsumerObj');
                    //console.log(mergedCurrentConsumerObj);
                }
                   
            }
            if(mergedCurrentConsumerObj!=null){
                //console.log('matched:' + serviceName);
                //only push if not unique?
                var doNotAddFlag = false;
                for(var k = 0;k<mergedConsumerList.length;k++){
                    var con = mergedConsumerList[k];
                    if(con.consumer==mergedCurrentConsumerObj.consumer){
                        doNotAddFlag = true;
                        break;
                    }
                }
                if(doNotAddFlag==false){
                    mergedConsumerList.push(mergedCurrentConsumerObj);    
                }
            }else{
                mergedConsumerList.push(currentConsumerObj);
            }

        }
        
        for(var l = 0;l<mergedConsumerList.length;l++){
            var consumerObj = mergedConsumerList[l];
            //console.log('consumerObj=');
            //console.log(consumerObj);
            if((consumerObj.consumer!=null)&&(consumerObj.consumer!='')){
                //build a new consumerObject 
                var newConsumerObj = {};
                newConsumerObj.consumer = resolveConsumerProviderNames(consumerObj.consumer);
                newConsumerObj.hits = consumerObj.hits;
                totalHits += consumerObj.hits;
                newConsumerObj.p95 = consumerObj.p95;
                newConsumerObj.elapsed_nr = consumerObj.elapsed_nr;
                newConsumerList.push(newConsumerObj);
            }
        }
        for(var m = 0;m<providerList.length;m++){
            var providerObj = providerList[m];
            providerObj.name = resolveConsumerProviderNames(providerObj.name);
            if((providerObj.name!=null)&&(providerObj.name.toLowerCase().indexOf('dp:provider:')>-1)){
                var provFullNameArray = providerObj.name.split(':', 3);
                var providerName = resolveConsumerProviderNames(provFullNameArray[2]);
                //console.log(providerName);
                var newProviderObj = providerObj;
                newProviderObj.provider = providerName;
                newProviderList.push(newProviderObj);
            }
        }
        consumerProviderObject.consumerList = newConsumerList;
        //consumerProviderObject.providerList = newProviderList;
        consumerProviderObject.providerList = providerList;
        consumerProviderObject.totalHits = totalHits;
    }
    return consumerProviderObject;
}
function resolveConsumerProviderNames(inName){
    var indexOfReplacementArray = ['LISA::LISA', 'IMCAAP::CHEALTH', 'Saml::SAML', 'IMRPSPIMMI.CVOR::CVOR', 'appdetails::ELODGEMENT', 'IMMI ESC ::SIEBEL', 'IMRPSPBRDR.RPS::RPS', 'CLIENTSEARCH::CSP', 'SV047_RETRIEVEIDENTITYDOCUMENT::UNKNOWN', 'SV150_RETRIEVEFACIALIMAGE::UNKNOWN', 'SFPATTACHMENT::SFPATTACHMENT'];
    indexOfReplacementArray.push('SV325::UNKNOWN');
    indexOfReplacementArray.push('SV021::UNKNOWN');
    indexOfReplacementArray.push('SV001::UNKNOWN');
    indexOfReplacementArray.push('SV004::UNKNOWN');
    indexOfReplacementArray.push('IMBIOP::BAMS');
    indexOfReplacementArray.push('SV232::UNKNOWN');
    indexOfReplacementArray.push('SV236::UNKNOWN');
    indexOfReplacementArray.push('C1JMI::UNKNOWN');
    indexOfReplacementArray.push('IMOAP::OLA');
    indexOfReplacementArray.push('TRAVELLER::TPC');
    indexOfReplacementArray.push('TRVL::TPC');
    indexOfReplacementArray.push('APIGW::WSGW');
    indexOfReplacementArray.push('IMCWMP::WMAN');
    indexOfReplacementArray.push('USERNAME:NT AUTHORITYIUSR::UNKNOWN');
    indexOfReplacementArray.push('ABTC::ABTC');
    indexOfReplacementArray.push('ATTACHMENT_INTERNAL::SFPATTACHMENT');
	indexOfReplacementArray.push('OA::OLA');
    indexOfReplacementArray.push('ELODGEMENT::ELP');
	indexOfReplacementArray.push('IMSOAP::DESB');
	indexOfReplacementArray.push('DHUBMERGE::DHUB');

    //"C1JMI"
    var resultName = inName.replace('01:','').replace('02:','');
    for(var i = 0;i<indexOfReplacementArray.length;i++){
        var searchAndReplace = indexOfReplacementArray[i];
        //these are keyed pairs
        var searchAndReplaceArray = searchAndReplace.split('::',2);
        var searchString = searchAndReplaceArray[0];
        var replaceString = searchAndReplaceArray[1];
        if(resultName.indexOf(searchString)!=-1){
            resultName = replaceString;
        }
    }
    return resultName.toUpperCase();    
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
function mergeConsumers(consumer1, consumer2){
    //if not nulls then do....
    if((consumer1!=null)&&(consumer2!=null)){
        var newConsumerObj = {};
        newConsumerObj.consumer = resolveConsumerProviderNames(consumer1.consumer); 
        newConsumerObj.name = consumer1.name;
        newConsumerObj.hits = undefinedToNumber(consumer1.hits) + undefinedToNumber(consumer2.hits); 
        newConsumerObj.p95 = (undefinedToNumber(consumer1.p95) + undefinedToNumber(consumer2.p95))/2;
        newConsumerObj.elapsed_nr = (undefinedToNumber(consumer1.elapsed_nr) + undefinedToNumber(consumer2.elapsed_nr))/2;
        return newConsumerObj;
    }else if (consumer1!=null){
        return consumer1;
    }else if (consumer2!=null){
        return consumer2;
    }else{
        return null;
    }
}
function undefinedToNumber(object){
    if(object==undefined){return 0;}
    else if(object==null){return 0;}
    else{
        var result = Number(object);
        if (isNaN(result)){
            return 0;
        }else{
            return result;    
        }
    }
}
function createSystemList(allSystemsList){
    console.time('createSystemList');
    //console.log(serviceList);
    //console.log(serviceList.systemList);
    var system2ServiceObj = {};
    var systemList = [];
    
    var systemProviderList = [];
    //Loop through my list of systems and find stuff that uses it?    
    for(var i = 0;i<allSystemsList.systemList.length;i++){
        var systemName = allSystemsList.systemList[i];
        //console.log(systemName);
        var systemObject = {};
        systemObject.consumerFlag = false;
        systemObject.providerFlag = false;
        systemObject.systemName = systemName;
        var consumerServiceList = [];
        var providerServiceList = [];
        var totalConsumerHits = 0;
        //now find services to put under this?
        for (var j = 0;j<allSystemsList.serviceList.length;j++){
            var serviceObj = allSystemsList.serviceList[j];
            if(serviceObj.service==null){
                console.log('wtf');
            }
            var serviceName = serviceObj.service.ServiceName;
            //now loop though each consumer looking for this name?
            //if there are consumers loop it?
            if(serviceObj.consumerList!=null){
                for (var k = 0;k<serviceObj.consumerList.length;k++){
                    var consumer = serviceObj.consumerList[k];
                    var consumerName = consumer.consumer;
                    var consumerHits = consumer.hits;
                    if(consumerName==systemName){
                        //its a match
                        systemObject.consumerFlag = true;
                        totalConsumerHits = totalConsumerHits + consumerHits;
                        //console.log('consumer Match');
                        consumerServiceList.push(serviceObj);
                    }
                }
            }
            
            systemObject.totalConsumerHits = totalConsumerHits;
            systemObject.consumerServiceList = consumerServiceList;
            if(serviceObj.providerList!=null){
                for (var l = 0;l<serviceObj.providerList.length;l++){
                    var provider = serviceObj.providerList[l];
                    var providerName = provider.provider;
                    if(providerName==systemName){
                        //its a match
                        systemObject.providerFlag = true;
                        //console.log('provider Match');
                        providerServiceList.push(serviceObj);
                    }
                }
            }
            systemObject.providerServiceList = providerServiceList;
        }
        
        systemList.push(systemObject);
    }
    
    system2ServiceObj.systemList = systemList;
    //maintaining the rogonal servicelist in this object
    
    //console.log(system2ServiceObj.systemList);
    console.timeEnd('createSystemList');
    return system2ServiceObj;
}

function formatSystemListToMatrix(systemListData){
    console.time('formatSystemListToMatrix');
    systemMatrix = [];
    for (var i = 0;i<systemListData.systemList.length;i++){
        var systemObj = systemListData.systemList[i];
        //now push the name?
        var systemMatrixObj = {};
        systemMatrixObj.name = systemObj.systemName;
        systemMatrixObj.color = getRandomColor();
        //color
        //matrix array
        var matrixArray = [];
        //so now I have this system I need to get every system that it uses?
        //console.log(systemObj);
        outboundWeight = systemObj.consumerServiceList.length;
        inboundWeight = systemObj.providerServiceList.length;
        var consumerUseList = [];
        for (var j = 0;j<systemObj.consumerServiceList.length;j++){
            var serviceObj = systemObj.consumerServiceList[j];
            //console.log(serviceObj);
            for (var k = 0;k<serviceObj.providerList.length;k++){
                var provider = serviceObj.providerList[k];
                if(provider.provider!=systemObj.systemName){
                    consumerUseList.push(provider.provider);
                }
            } 
            for (var l = 0;l<serviceObj.consumerList.length;l++){
                var consumer = serviceObj.consumerList[l];
                if(consumer.consumer!=systemObj.systemName){
                    consumerUseList.push(consumer.consumer);
                }
            } 
        }            
        var providerUseList = [];
        for (var j = 0;j<systemObj.providerServiceList.length;j++){
            var serviceObj = systemObj.providerServiceList[j];
            //console.log(serviceObj);
            for (var k = 0;k<serviceObj.providerList.length;k++){
                var provider = serviceObj.providerList[k];
                if(provider.provider!=systemObj.systemName){
                    consumerUseList.push(provider.provider);
                }
            } 
            for (var l = 0;l<serviceObj.consumerList.length;l++){
                var consumer = serviceObj.consumerList[l];
                if(consumer.consumer!=systemObj.systemName){
                    consumerUseList.push(consumer.consumer);
                }
            } 
        }    
        //now I have a list of everything it connects to?
        //console.log(consumerUseList);
        //console.log(providerUseList);
        //now I need to loop through these against my original list to build the string of connects?
        var mouseHoverText = '';
        for(var m = 0;m<systemListData.systemList.length;m++){
            var systemObjUse = systemListData.systemList[m];
            if(systemObjUse.systemName!=systemObj.systemName){
                if(consumerUseList.indexOf(systemObjUse.systemName)>-1){
                    //this means its connected to this system
                    mouseHoverText+=systemObjUse.systemName + '\n';
                    matrixArray.push(1);
                }else{
                    matrixArray.push(0);
                }
            }else{
                matrixArray.push(0);
            }
        }
        systemMatrixObj.mouseHover = mouseHoverText;
        systemMatrixObj.matrix = matrixArray;
        systemMatrix.push(systemMatrixObj);
    }
    console.timeEnd('formatSystemListToMatrix');
    return systemMatrix;
}
function getRandomColor() {
    var letters = '012345'.split('');
    var color = '#';        
    color += letters[Math.round(Math.random() * 5)];
    letters = '0123456789ABCDEF'.split('');
    for (var i = 0; i < 5; i++) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}
function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
  }
  
