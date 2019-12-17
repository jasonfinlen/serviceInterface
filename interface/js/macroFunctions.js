function flattenMacroList(categoryListObj){
    //this function removes the category structure form the Objects and creates a new jason data structure without the category but adds a new field for keys
    var resultMacroListObj = {macroList:[]};
    //console.log(resultMacroListObj);
    
    var resultMacroListObjCount = 0;
    if (categoryListObj !== undefined){
        categoryCount = categoryListObj.length;
        //console.log(categoryListObj);
        for (i = 0; i < categoryCount; i++) {
    		  var categoryObj = categoryListObj[i];
    		  //console.log(categoryObj);
    		  var category = categoryObj.name;
    		  var macroListObj = categoryObj.macro;
    		  if (macroListObj !== undefined){
        		  var macroListArray = returnArray(macroListObj);
        		  macroListCount = macroListArray.length;
        		  if(macroListCount>0){
        		      for (k = 0; k < macroListCount; k++) {
        		          var macroObj = macroListArray[k];
        		          //now append this macro object to the result object
        		          macroObj.category = category;
        		          macroObj.key = getKeyFromMacroObject(macroObj);
        		          resultMacroListObj.macroList.push(macroObj);
        		          resultMacroListObjCount = resultMacroListObjCount + 1;
        		       }
        		   }
        	   }
        	}
    }
    return  resultMacroListObj;
}
function cleanMacroName(macroName){
    var newMacroName = macroName.replace('Macro.xml', '').replace('Macro.html', '').replace('Macro.htm', '').replace('Macro.json', '');
    //var newMacroName2 = newMacroName.replace('MacroChangeLog.xml', '').replace('MacroChangeLog.html', '').replace('MacroChangeLog.htm', '').replace('MacroChangeLog.json', '');
    return newMacroName;
}


function compassProvidersURL(svNumber, svLocation, svRequestName, svVersion, svCategory, svType, env, period){
    var pm_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects';
    pm_url += '?action=doList';
    pm_url += '&type=JSONP';
    environmentParms = '&env='+env;
    pm_url += environmentParms;
    domain = '&domain='+getDomain(env);
    pm_url += domain;
    myID = '&id='+ svCategory + "/" + svType + '/' + svVersion + '-%3E' + svRequestName + '&classname=extendedprofilepoint&name=extendedprofilepoint&nametype=classes';
    pm_url += myID; 
    duration = '&start=-'+ period;
    pm_url += duration;
    return pm_url;
}


function compassProvidersURLFromServiceObj(serviceObj, period, environment){
    var pm_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects';
    pm_url += '?action=doList';
    pm_url += '&type=JSONP';
    if(environment==null){
        environment = 'e9'
    }
    environmentParms = '&env='+environment;
    pm_url += environmentParms;
    domain = '&domain='+getDomain(environment);
    pm_url += domain;
    var shortNamespace = serviceObj.targetNamespace.replace('http://www.immi.gov.au/Namespace/','');
    var requestSchemaName = serviceObj.schemaList[0].schemaName;
    myID = '&id='+ shortNamespace + '-%3E' + requestSchemaName + '&classname=extendedprofilepoint&name=extendedprofilepoint&nametype=classes';
    pm_url += myID; 
    if(period==null){
        period='30d';
    }
    duration = '&start=-'+ period;
    pm_url += duration;
    pm_url += '&key=' + serviceObj.key;
    return pm_url;
}
function compassConsumersURLFromServiceObj(serviceObj, period, environment){
    var pm_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects';
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
    var shortNamespace = serviceObj.targetNamespace.replace('http://www.immi.gov.au/Namespace/','');
    var requestSchemaName = serviceObj.schemaList[0].schemaName;
    myID = '&id='+ shortNamespace + '-%3E' + requestSchemaName + '-%3Edp:ServiceCompleted';
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

function compassConsumersURL(svNumber, svLocation, svRequestName, svVersion, svCategory, svType, env, period, key){
    var pm_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects';
    pm_url += '?action=doAttributes';
    pm_url += '&type=JSONP';
    pm_url += '&reportname=consumer.sql';
    environmentParms = '&env='+env;
    pm_url += environmentParms;
    domain = '&domain='+getDomain(env);
    pm_url += domain;
    myID = '&id='+ svCategory + "/" + svType + '/' + svVersion + '-%3E' + svRequestName + '-%3Edp:ServiceCompleted';
    pm_url += myID; 
    duration = '&start=-'+ period;
    pm_url += duration;
    //now Add the parms
    pm_url += '&serviceNumber=' + svNumber;
    pm_url += '&serviceLocation=' + svLocation;
    pm_url += '&serviceName=' + svRequestName;
    pm_url += '&serviceVersion=' + svVersion;
    pm_url += '&serviceCategory=' + svCategory;
    pm_url += '&serviceType=' + svType;
    pm_url += '&key=' + key;
    return pm_url;
}

function compassSampleURL(svRequestName, env, period, count) {
	var pm_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects';
    pm_url += '?action=doAttributes';
    pm_url += '&type=JSONP';
    pm_url += '&id=' + getCompassSampleID(env);
    pm_url += '&env=' + env;
    pm_url += '&domain=' + getDomain(env);
	pm_url += '&start=-'+ period;
	pm_url += '&end=now';
	pm_url += '&filter_name_nr=' + svRequestName + 'Re*';
	pm_url += '&count=' + count
	pm_url += '&fields=samplestart,user_nr,name_nr,linkb_nr,consumer_nr,result_nr'
	
	return pm_url;
}

function getCompassSampleID(env) {
	switch(env){
        case 'e8':
        return '1223060';
        case 'e7':
        return '101719428';
        case 'e6':
        return '1479572';
        case 'e5':
        return '1394392';
        case 'e4':
        return '1522638';
        case 'e3':
        return '2011565';
    }
}

function getCompassTracePointID(env) {
	switch(env){
        case 'e9':
        return '225510';
        case 'e7':
        return '100014460';
        case 'e6':
        return '302778';
        case 'e5':
        return '3701277';
        case 'e4':
        return '265067';
        case 'e3':
        return '201992';
    }
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
