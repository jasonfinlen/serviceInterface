function getCacheBuster() {
  return 'nocache=' + getRandomInt(99999, 99999999999);
}

function getFunctionListFromAutoPopulate(autoPopulate){
    if ((autoPopulate != null) &&(autoPopulate.macroAutoPopulate != null) &&(autoPopulate.macroAutoPopulate.content != null) &&(autoPopulate.macroAutoPopulate.content.functionList != null)) {
        return returnArray(autoPopulate.macroAutoPopulate.content.functionList[ 'function']);
    }else{
        return [];
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function GetSortOrder(prop) {  
    return function(a, b) {  
        if (a[prop] > b[prop]) {  
            return 1;  
        } else if (a[prop] < b[prop]) {  
            return -1;  
        }  
        return 0;  
    }  
}  


function forceSortArray(obj, sortKey, firstOnly, func) {
    if ($.isArray(obj)){
        //console.log('its an array already');
        //now I want to re-order this if required
        if ((sortKey!='') && (sortKey!=undefined)&& (sortKey!=null)){
            //console.log('Sorting on : ' + sortKey); 
            obj.sort(GetSortOrder(sortKey));
            }
            
        $.each(obj, func);
        if(firstOnly){
            //console.log('first only has been set so return just this callback');
            return;
        }
    }
    else
      func(0, obj);
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
function getFileNamefromLocation(location, keepExtensionFlag) {
    var filename = location.split('/').pop();
    if (keepExtensionFlag != true) {
        var noExtFilename = filename.split('.')[0];
        return noExtFilename;
    } else {
        return filename;
    }
}

function getNameforExternal(dir){
    var fileArray = dir.split('/');
    for(var i = 0;i<fileArray.length;i++){
        var directoryString = fileArray[i];
        if(directoryString.indexOf('WSGateway')!=-1){
            var name = directoryString.replace('WSGateway_','').replace('_WSGateway','');
            return name;    
        }
    }
    return null;
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
    }else if ((last.indexOf('message') > -1) ||(last.indexOf('msg') > -1)||(last.indexOf('messaging.') > -1)||(last.indexOf('core.') > -1)||(last.indexOf('errors.') > -1)||(last.indexOf('errors_') > -1)||(last.indexOf('system.') > -1)) {
    
        result = true;
    }else{
        var lCaseLocation = location.toLowerCase();
        if((lCaseLocation.indexOf('oasis/')>-1)||(lCaseLocation.indexOf('httpheader/')>-1)||(lCaseLocation.indexOf('webservicessecurity/')>-1)){
            result = true;
        }else{
            result = false;    
        }
    }
    return result;
}
function cleanXSDName(xsdName){
    var newXSDName = xsdName.replace('Request', '').replace('Response', '').replace('.xsd', '');
    return newXSDName;
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
                if ($.isNumeric(numberTest)) {
                    return item;
                }
            }
        }
    }
    return result;
}


function undefinedToEmpty(object){
    if(object==undefined){return '';}
    else if(object==null){return '';}
    else{return object;}
}
function undefinedToUnknown(object){
    if(object==undefined){return 'Unknown';}
    else if(object==null){return 'Unknown';}
    else{return object;}
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

function undefinedToFalse(object){
    if(object==undefined){return false;}
    else if(object==null){return false;}
    else if(object!=true){return false;}
    else{return true;}
}

function $undefinedToEmpty(object){
    //console.log(object);
    if(object==undefined){return '';}
    else if(object==null){return '';}
    else if(object.$==null){return '';}
    else if(object.$==undefined){return '';}
    else{return object.$;}
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

function isOdd(num){
    return num % 2;
}

var delay = ( function() {
    var timer = 0;
    return function(callback, ms) {
        clearTimeout (timer);
        timer = setTimeout(callback, ms);
    };
})();
function getFormattedTime(date) {
    var secs = date.getSeconds();
    //console.log('secs=' + secs);
    if(secs=='0'){
        secs = '00'; 
    }
    var str = date.getHours() + ":" + date.getMinutes() + ":" + secs;
    return str;
}

function getKeyFromString(string){
    return string.replace(/[^a-zA-Z0-9]+/g,"");
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
        return 'Unknown';
    }
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


function getCategoryFromDirectory(inDir) {
    var result = null;
    //remove the stuff
    if(inDir!=null){
        result = inDir.split('/')[0];
    }
    return result;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
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

function getKeyFromServiceObject(serviceObj) {
    //maybe keys should be stipped of all special chars?
    if((serviceObj!=null)&&(serviceObj.ServiceName!=null)&&(serviceObj.ServiceId!=null)&&(serviceObj.SchemaVersionNumber!=null)){
        var key = serviceObj.ServiceId + serviceObj.ServiceName +  serviceObj.SchemaVersionNumber;
        return key.replace(/[^a-zA-Z0-9]+/g,"");    
    }else{
        return 'Unknown';
    }
}
function getKeyFromMacroObject(macroObj, previousVersionFlag) {
    //maybe keys should be stipped of all special chars?
    if((macroObj!=null)&&(macroObj.name!=null)&&(macroObj.number!=null)&&(macroObj.version!=null)){
        if(previousVersionFlag!=true){
            var version = macroObj.version;    
        }else{
            var version = decreaseVersion(macroObj.version);
        }
        var key = macroObj.number + cleanMacroName(macroObj.name) + version;
        
        return key.replace(/[^a-zA-Z0-9]+/g,"");    
    }else{
        return 'Unknown';
    }
}
function decreaseVersion(version){
    //version is V1.0 or V11.0 so take everything before the . and get rid of the v
    var result = 'V' + (version.split('.')[0].replace('V','')-1) + '.0';
    return result;
}

function formatCamelCaseForHumans(s){
   var returnValue = s.replace(/_/g, ' ', ' ').split(/([A-Z][a-z]+)/).filter(function(e){return e});
   return returnValue.join(' ');
}

function formatCamelCaseForHumansxxx(camelString){
    //return camelString.replace(/([A-Z])/g, ' $1').replace('_',' ').trim();
    return camelString.replace(/_/g, ' ', ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        
}
function formatUnderScoresForHumans(uscoreString){
    return toTitleCase(uscoreString.replace(/_/g, ' ', ' ').trim().toLowerCase());    
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function getTableObjectByName(name){
    var matched = false;
    var currentObject = null;
    //console.log('allEnterpiseCRTTables');
    //console.log(allEnterpiseCRTTables);
    if ((allEnterpiseCRTTables!=null)&&(allEnterpiseCRTTables.tables!=null)&&(allEnterpiseCRTTables.tables.length>0)&&(name!=null)) {
        var allLen = allEnterpiseCRTTables.tables.length;
        for (var i = 0; i < allLen; i++) {
            var tableObj = allEnterpiseCRTTables.tables[i];
            if (tableObj.name == name) {
                matched = true;
                currentObject = tableObj;
                return currentObject;
            }
        }
        return currentObject;
    }else{
        return currentObject;
    }
}
function getServiceObjectByKey(key, optionalServiceList){
    var matched = false;
    var currentObject = null;
    //console.log('allEnterpiseServices');
    //console.log(allEnterpiseServices);
    if(optionalServiceList!=null){
        var serviceList = optionalServiceList;
    }else{
        var serviceList = allEnterpiseServices;
    }
    if ((serviceList!=null)&&(key!=null)) {
        var allLen = serviceList.length;
        for (var i = 0; i < allLen; i++) {
            var serviceObj = serviceList[i];
            if (serviceObj.key == key) {
                matched = true;
                currentObject = serviceObj;
                return serviceObj;
            }
        }
        return currentObject;
    }else{
        return currentObject;
    }
}
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
function fancyTimeFormat(time)
{   
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}
function roundNumber(number, places) {
  return Math.round(number + "e+" + places)  + "e-" + places;
}

function convertMicroSeconds2Seconds(microSeconds){
    var milliseconds = Math.round(microSeconds/1000);
    return milliseconds/1000;
}


function convertMilliseconds2Seconds(seconds){
    return roundNumber((seconds/1000),3);    
}

function formatMilliseconds(num){
	return numberWithCommas(num.toFixed(3));
}

function numberWithCommas(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, "$1,$2");
    return x;
}
function twoDigitNumber(n){
    return n > 9 ? "" + n: "0" + n;
}

function getfilePathFromFullPath(fullPath){
    var pathArray = fullPath.split('/');
    pathArray.pop();
    return pathArray.join('/');
}

function xmlToString(xmlData) { 
        var xmlString;
        //IE
        if (window.ActiveXObject){
            xmlString = xmlData.xml;
        }
        // code for Mozilla, Firefox, Opera, etc.
        else{
            xmlString = (new XMLSerializer()).serializeToString(xmlData);
        }
        return xmlString;
}

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }
    return a;
};