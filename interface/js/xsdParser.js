function fetchEnterpriseSchemas() {
    console.time('fetchEnterpriseSchemas');
    var enterpriseSchemasURL = 'enterpriseModelsFilesetContents.json';
    var olderEnterpriseSchemasURL = 'enterpriseModelsFilesetContents - Copy.json';
    var allRequests =[];
    allRequests.push($.getJSON(enterpriseSchemasURL));
    allRequests.push($.getJSON(olderEnterpriseSchemasURL));
    
    var defer = $.when.apply($, allRequests);
    defer.done(function () {
        //update this to just call no matter if success or fail?
        var currentSchemas = arguments[0][0];
        var previousSchemas = arguments[1][0];
        console.timeEnd('fetchEnterpriseSchemas');
        console.log('calling a process with both current and previous schemas');
        var currentPreviousSchemas = processSchemaData(currentSchemas, previousSchemas);
        //now I should be OK to start processing this?
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log(textStatus + ':' + errorThrown);
        console.timeEnd('fetchEnterpriseSchemas');
    });
}
function getPopulatedXSDSchemaList(allServices) {
    console.time('getPopulatedXSDSchemaList');
    var xsdSchemaList =[];
    var allSchemaslength = allServices.length;
    for (var i = 0; i < allSchemaslength; i++) {
        var service = allServices[i];
        var xsdList = service.schemaList;
        for (var k = 0; k < xsdList.length; k++) {
            var xsd = xsdList[k];
            xsd.schema.key = xsd.key;
            xsd.schema.filename = xsd.filename;
            xsd.schema.rootElement = xsd.rootElement;
            xsd.schema.core = xsd.core;
            xsd.schema.targetNamespace = xsd.targetNamespace;
            xsd.schema.namespaces = xsd.namespaces;
            xsd.schema.namespaceAlias = xsd.namespaceAlias;
            xsdSchemaList.push(xsd.schema);
        }
    }
    console.timeEnd('getPopulatedXSDSchemaList');
    return xsdSchemaList;
}


function singleMacroProcessor(serviceObject, allServices) {
    //now for each in the list do it and replace the result?
    var schemaList = returnArray(serviceObject.schemaList);
    for (var i = 0; i < schemaList.length; i++) {
        var schema = schemaList[i];
        var xsdSchemaList = getPopulatedXSDSchemaList(allServices);
        processXSD(schema, xsdSchemaList);
    }
    //create a additional of the xpath list counts
    return serviceObject;
}

function processSchemaData(currentSchemas, previousSchemas) {
    console.time('processSchemaData');
    //console.log(currentSchemas);
    console.time('processedCurrentSchemaList');
    var processedCurrentSchemaList = currentSchemas;
    var processedPreviousSchemaList = previousSchemas;
    console.timeEnd('processedCurrentSchemaList');
    console.time('formatSync');
    console.time('formatCurrentSync');
    var currentSchemasObject = formatAllSchemas(processedCurrentSchemaList);
    console.timeEnd('formatCurrentSync');
    console.time('formatPreviousSync');
    var previousSchemasObject = formatAllSchemas(processedPreviousSchemaList);
    console.timeEnd('formatPreviousSync');
    console.timeEnd('formatSync');
    
    var processedSchemasObject = {
    };
    processedSchemasObject.current = currentSchemasObject;
    processedSchemasObject.previous = previousSchemasObject;
    
    //var processedPreviousSchemaList = schemaListProcessor(previousSchemas);
    //console.log(processedCurrentSchemaList);
    //console.log('processedCurrentSchemaList.length:' + processedCurrentSchemaList.length);
    //console.log(processedPreviousSchemaList);
    console.timeEnd('processSchemaData');
    return processedSchemasObject;
}

function schemaListProcessor(rawSchemaList) {
    console.time('schemaListProcessor');
    //I have to look for some htings in a different way for providerData
    var processedSchemaList =[];
    var arrayOfRawSchemas = returnArray(rawSchemaList.files.fileList);
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
            newRawSchema.ServiceVersion = getVersionFromRawXSD(newRawSchema.schemaList[0].schema);
            newRawSchema.ServiceNumber = getNumberFromLocation(newRawSchema.schemaList[0].filename);
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
    console.timeEnd('schemaListProcessor');
    return processedSchemaList;
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
function schemaProcessor(rawSchema) {
    //console.log(rawSchema);
    var processedSchemaObject = {
    };
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
    processedSchemaObject.namespaceAlias = resolveLocalNamespace(rawSchema);;
    var schemaObject = {};
    var xsdRawObject = rawSchema.schema;
    //now process this raw thing
    //find anything that isnt a core or msg?
    if (getIsCoreFromLocation(rawSchema.filename) != true) {
        processedSchemaObject.core = false;
        //now find the head
        //console.log(xsdRawObject);
        var elementArray = returnArray(xsdRawObject.element);
        var foundRoot = false;
        for (var i = 0; i < elementArray.length; i++) {
            var element = elementArray[i];
            var elementName = element.name;
            //console.log(rawSchema);
            //console.log(elementName);
            //console.log(processedSchemaObject.schemaName);
            if (processedSchemaObject.schemaName.toLowerCase() == elementName.toLowerCase()) {
                foundRoot = true;
                processedSchemaObject.rootElement = element;
                //just check there isn't a root issue
                if (processedSchemaObject.schemaName != elementName) {
                    processedSchemaObject.conformance = false;
                    processedSchemaObject.conformanceRules =[ 'Invalid Root element - Case sensative test'];
                }
            }
        }
        if (foundRoot == false) {
            //console.log('no root element found?');
            //console.log(rawSchema);
            //special clause for CBE?
            var rootElement = resolveSpecialClauseRootElement(rawSchema);
            processedSchemaObject.rootElement = rootElement;
        }
    }
    //now I should process it?
    processedSchemaObject.schema = rawSchema.schema;
    return processedSchemaObject;
}

function formatAllSchemas(allSchemas) {
    console.time('formatAllSchemas');
    var xsdSchemaList = getPopulatedXSDSchemaList(allSchemas);
    var serviceCount = 0;
    var macroObjectList =[];
    var xsdlistlength = xsdSchemaList.length;
    //console.log(xsdSchemaList);
    console.time('loopingallSchemastocreatemacros');
    var allSchemaslength = allSchemas.length;
    //console.log(allSchemas);
    //a=stopnowforme;
    for (var i = 0; i < allSchemaslength; i++) {
        var service = allSchemas[i];
        var xsdList = service.schemaList;
        var xPathListCount = 0;
        var xPathList =[];
        for (var k = 0; k < xsdList.length; k++) {
            //there is usually only two of these for all non cores?
            var xsd = xsdList[k];
            if (xsd.core != true) {
                serviceCount++;
                var parentObjectArray =[];
                //console.log(xsd.rootElement);
                gXSDName = xsd.rootElement.name;
                //console.log(gXSDName);
                var rootXPath = xsd.namespaceAlias + ':' + xsd.rootElement.name
                processXSD(xsd, xsdSchemaList);
                xsd.xsdParsed = true;
                xPathList = xPathList.concat(xsd.rootElement.xPathList);
            }
            service.xPathList = xPathList;
            service.xsdParsed = true;
        }
    }
    
    console.timeEnd('loopingallSchemastocreatemacros');
    
    
    /*
    console.log('serviceCount : ' + serviceCount);
    console.log('fieldCount : ' + fieldCount);
    console.log('allSchemas');
    console.log(allSchemas);
    console.timeEnd('formatAllSchemas');
     */
    return allSchemas;
}


function itemsRecursive(name, xPath) {
    //console.log('name:' + name);
    //console.log('xPath:' + xPath);
    //has this item appeared before in this path?
    var onePOS = xPath.indexOf(name, 0);
    //console.log('onePOS:' + onePOS)
    
    //there is a chance?
    if (onePOS == -1) {
        //I have never seen this one before?
        return false;
    }
    var twoPOS = xPath.indexOf(name, onePOS + name.length);
    //console.log('twoPOS:' + twoPOS)
    if (twoPOS != -1) {
        var threePOS = xPath.indexOf(name, twoPOS + name.length);
        //console.log('threePOS:' + threePOS)
        if (threePOS != -1) {
            var fourPOS = xPath.indexOf(name, threePOS + name.length);
            if (fourPOS != -1) {
                var fivePOS = xPath.indexOf(name, fourPOS + name.length);
                if (fivePOS != -1) {
                    var sixPOS = xPath.indexOf(name, fivePOS + name.length);
                    if (sixPOS != -1) {
                        var counter = occurrences(xPath, name);
                        if (counter > 10) {
                            return true;
                        } else {
                            return false;
                        }
                    }
                }
            }
        }
    }
    
    
    return false;
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

function appendXpath(currentXPath, name, namespaceAlias) {
    var posSemi = name.indexOf(':');
    if (posSemi != -1) {
        return currentXPath + '/' + name;
    } else {
        return currentXPath + '/' + namespaceAlias + ':' + name;
    }
}
var fieldCount = 0;


function appendGroupingTypeData(groupingType, xsObject, entityObject) {
    
    //console.log('xsObject');
    //console.log(xsObject);
    //console.log('entityObject');
    //console.log(entityObject);
    var groupingObject = {
    };
    groupingObject.SOAEntityType = groupingType;
    groupingObject.Cardinality = '1..1';
    groupingObject.SOALink = 'ImnotsureIcare';
    entityObject.SOAEntity.push(groupingObject);
    var emptyArray =[];
    groupingObject.SOAEntity = emptyArray;
    return groupingObject;
}

function appendSimpleTypeData(xsObject, entityObject) {
    /*
    console.log('xsObject');
    console.log(xsObject);
    console.log('entityObject');
    console.log(entityObject);
     */
    entityObject.SOAEntityType = 'SimpleType';
    if (xsObject.restriction != null) {
        //console.log(xsObject.restriction);
        //I found base as a string, minLength as object with value, maxLength as object with value
        if (xsObject.restriction.base != null) {
            entityObject.Type = 'xs:' + xsObject.restriction.base;
        }
        if (xsObject.restriction.maxLength != null) {
            entityObject.maxLength = xsObject.restriction.maxLength.value;
        }
        if (xsObject.restriction.minLength != null) {
            entityObject.minLength = xsObject.restriction.minLength.value;
        }
        //a=entitymustbeupdatedwithrestrictiondata;
    }
    if (xsObject.refData != null) {
        console.log(xsObject);
        a = xsrefdata;
    }
    entityObject.refData
    //a=entitymustbeupdatedwithsimpletypedata;
    return entityObject;
}

function getNamespaceAlias(object) {
    if (object != null) {
        if (object.ref != null) {
            var posSemi = object.ref.indexOf(':');
            if (posSemi != -1) {
                return object.ref.substring(0, posSemi);
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else {
        return null;
    }
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


function convertToMacro(entityObject, entityType, entityObjectType, SOAEntityType, namespaceAlias, xPath) {
    
    var macroObject = {
    };
    macroObject.SOAEntityType = SOAEntityType;
    macroObject.Structure = namespaceAlias + ':' + entityObject.name;
    macroObject.Type = entityObjectType;
    var max = '1';
    var min = '1';
    if (entityObject.minOccurs != null) {
        min = entityObject.minOccurs;
    }
    if (entityObject.maxOccurs != null) {
        max = entityObject.maxOccurs;
    }
    macroObject.Cardinality = min + '..' + max;
    //the full xPath
    macroObject.SOALink = xPath;
    //reserved for children?
    macroObject.SOAEntity =[];
    if (entityObject.refData != null) {
        macroObject.RefLink = 'F:REF(' + xPath + ',' + entityObject.refData.table + ',' + entityObject.refData.fromcolumn + ')'
        macroObject.refData = entityObject.refData;
    }
    return macroObject;
}
function getRefType(type, xsdObject, allobjects) {
    var posSemi = type.indexOf(':');
    if (posSemi != -1) {
        var namespace = type.substring(0, posSemi);
        //now depending on this namespace it could be local?
        var targetNamespace = xsdObject.targetNamespace;
        var namespaceAlias = xsdObject.namespaceAlias;
        var objectList =[];
        for (var i = 0; i < allobjects.length; i++) {
            var schemaObject = allobjects[i];
            if (schemaObject.namespaceAlias == namespace) {
                objectList = objectList.concat(returnArray(schemaObject.element), returnArray(schemaObject.complexType), returnArray(schemaObject.simpleType), returnArray(schemaObject.group));
            }
        }
        var matchedObject = null;
        for (var i = 0; i < objectList.length; i++) {
            var name = namespace + ':' + objectList[i].name;
            if (name == type) {
                matchedObject = objectList[i];
                break;
            }
        }
        if (matchedObject != null) {
            return matchedObject;
        } else {
            console.log('No matched entry');
            
            console.log(xsdObject);
            console.log(allobjects);
            console.log(objectList);
            for (var i = 0; i < objectList.length; i++) {
                console.log(type + '=' + namespace + ':' + objectList[i].name);
            }
            a = nomatchedreftype;
            return null;
        }
    } else {
        a = allrefsshouldhavesnamespaces;
    }
}
var gXSDName = '';
function logit(msg, condition) {
    if (gXSDName == 'GenerateStockCorrespondenceRequest') {
        //console.log('logit condition met:' + gXSDName);
        console.log(msg);
    }
}

function resolvenamespaceAliasToTarget(namespaceAlias, targetNamespaceList) {
    //loop through all targets..namespaceAlias
    //console.log(namespaceAlias);
    //console.log(targetNamespaceList);
    for (var i = 0; i < targetNamespaceList.length;++ i) {
        var nsObj = targetNamespaceList[i];
        if (namespaceAlias == nsObj.alias) {
            return nsObj.target;
        }
    }
}

function getNamedType(type, parentObject, xsdObject, allobjects, targetNamespaceList) {
    //logit(type);
    //console.log(type);
    //is this a localtype? core type, msg type or xs native type?
    var matchedObject = null;
    var posSemi = type.indexOf(':');
    if (posSemi != -1) {
        var namespace = type.substring(0, posSemi);
        //now depending on this namespace it could be local?
        var targetNamespace = xsdObject.targetNamespace;
        var namespaceAlias = xsdObject.namespaceAlias;
        var nameSpaceOfObject = resolvenamespaceAliasToTarget(namespace, targetNamespaceList);
        if (nameSpaceOfObject == null) {
            //a=nullfoundontargetnamespace;
        }
        
        
        if (matchedObject == null) {
            var objectList =[];
            
            for (var i = 0; i < allobjects.length; i++) {
                var schemaObject = allobjects[i];
                if (schemaObject.targetNamespace == nameSpaceOfObject) {
                    //console.log('mathed it : ' + schemaObject.targetNamespace+ '==' + nameSpaceOfObject);
                    //a=matchedit;
                    //logit('schemaObject.targetNamespace:'+schemaObject.targetNamespace);
                    //logit('nameSpaceOfObject:'+nameSpaceOfObject);
                    
                    //logit('schemaObject');
                    //logit(schemaObject);
                    //logit('xsdObject');
                    //logit(xsdObject);
                    /*console.log(schemaObject.namespaceAlias);
                    console.log(xsdObject.namespaceAlias);
                    console.log(schemaObject);
                    console.log(xsdObject);
                    a=doesthismarryup;*/
                    
                    //console.log('the alias matched but not the targets?');
                    //logit('adding in the objects from ' + namespace);
                    objectList = objectList.concat(returnArray(schemaObject.element), returnArray(schemaObject.complexType), returnArray(schemaObject.simpleType), returnArray(schemaObject.attributeGroup), returnArray(schemaObject.group));
                    
                    //I need to get the targetnamespace that also inlcudes the version
                }
            }
            //console.log('objectList');
            //console.log(objectList);
            for (var i = 0; i < objectList.length; i++) {
                var name = namespace + ':' + objectList[i].name;
                if (name == type) {
                    matchedObject = objectList[i];
                    break;
                }
            }
            
            if (matchedObject != null) {
                //console.log('Found the matched object as a non local under namespace:' + namespace);
                return matchedObject;
            } else {
                
                console.log('########################');
                console.log('Major Error in finding core or msg type?');
                console.log(type);
                console.log(parentObject);
                console.log(xsdObject);
                console.log(allobjects);
                a = stilldidntfindamatchedobjectinwhatevernamespacethisis;
            }
        }
    } else {
        //console.log('########################');
        //console.log('no namepsace means Im down to the root type' + namespace + ' ' + type);
        //console.log(parentObject);
        //console.log(parentObject);
        //console.log('########################');
        var baseType = {
        };
        baseType.xsType = 'xs:' + type;
        return baseType;
    }
    //I shouldnt get to here?
    console.log('########################');
    console.log('no namepsace is an issue');
    console.log('########################');
    console.log('index:' + type.indexOf(':'));
    console.log(complexTypeArray);
    console.log(elementArray);
    console.log(simpleArray);
    console.log(xsdObject);
    console.log('type:' + type);
    
    console.log(type);
    console.log(parentObject);
    a = ishouldneverarrivehere;
    return null;
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



function resolveSpecialClauseRootElement(rawSchema) {
    //console.log(rawSchema);
    if (rawSchema.filename == 'enterpriseModels/EventNotification/CBE/CommonBaseEvent_1_0_1.xsd') {
        return rawSchema.schema.element[2];
    } else {
        return null;
    }
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

//called with every property and its value
function process(key, value) {
    console.log(key + " : " + value);
}


function addKeysAndNames(listObject, url, release) {
    console.time('addKeysAndNames');
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
    console.timeEnd('addKeysAndNames');
    return listObject;
}

function mergeAutoPopulate(serviceListwithReadme, currentAutoPopulate) {
    //console.log(serviceListwithReadme);
    //console.log(currentAutoPopulate);
    console.time('mergeAutoPopulate');
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
    console.timeEnd('mergeAutoPopulate');
    //console.log(serviceListwithReadme);
    return serviceListwithReadme;
}

function mergeREADME(ServiceObjects, READEMEObjects) {
    if ((ServiceObjects != null) &&(ServiceObjects.length > 0)) {
        if ((READEMEObjects != null) &&(READEMEObjects.files != null) &&(READEMEObjects.files.fileList != null)) {
            var READEMEList = returnArray(READEMEObjects.files.fileList);
            for (var i = 0; i < ServiceObjects.length; i++) {
                var XSDKey = getKeyFromLocation(ServiceObjects[i].directory + '/fakefile.fake');
                ServiceObjects[i].readme = null;
                if ((XSDKey != null) &&(ServiceObjects[i].ServiceNumber != 'CORE')) {
                    for (var k = 0; k < READEMEList.length; k++) {
                        var READEMEfilename = READEMEList[k].filename;
                        if (READEMEfilename != null) {
                            var READMEKey = getKeyFromLocation(READEMEfilename);
                            //console.log(XSDKey);
                            //console.log(READMEKey);
                            //console.log(ServiceObjects[i]);
                            
                            if (XSDKey == READMEKey) {
                                var readmeContents = READEMEList[k].contents;
                                //console.log(readmeContents);
                                //append the contents to the other XSD object
                                ServiceObjects[i].readme = readmeContents;
                                break;
                            }
                        }
                    }
                } else {
                    //XSDfilename is null so ignore
                }
            }
        }
    }
    return ServiceObjects;
}
/*#############################################
New code written for complete processing...
#############################################*/

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
var stopitcounter = 0;

function concatNameSpaces(importObject, namespaces, dupNameSpaces) {
    //now for each key get the key and the value and make an Array of them?
    //only add it if its not already added?
    
    
    for (var i = 0; i < namespaces.length;++ i) {
        //could check for uniqueness but I need to verify that first as it may be incorrect?
        //is this already added?
        var otherNamespace = namespaces[i];
        if (dupNameSpaces.indexOf(otherNamespace) == -1) {
            //that means im adding this in
            for (var key in otherNamespace) {
                namespaceKey = {
                };
                namespaceKey.alias = key;
                namespaceKey.target = otherNamespace[key];
                importObject.namespaces.push(namespaceKey);
            }
        }
    }
}

function isDuplicateImportFlag(allXSDFile, dupXSDs) {
    //console.log(allXSDFile.key);
    //console.log(dupXSDs);
    if (dupXSDs.indexOf(allXSDFile.key) != -1) {
        return true;
    } else {
        return false;
    }
}
function getAllImports(xsdSchema, allXSD, importObject, dupNameSpaces, dupXSDs) {
    //this isnt the first file so check if its a duplicate
    if (isDuplicateImportFlag(xsdSchema, dupXSDs)) {
        //console.log('already have this in the imports');
        return false;
    } else {
        //a=duplicateisfalse;
        importObject.xsdList.push(xsdSchema);
        dupXSDs.push(xsdSchema.key);
    }
    if (xsdSchema.namespaces != null) {
        concatNameSpaces(importObject, returnArray(xsdSchema.namespaces), dupNameSpaces);
    }
    //console.log(importObject);
    //so get an array of imports
    //console.log(xsdSchema['import']);
    var imports = returnArray(xsdSchema[ 'import']);
    var includes = returnArray(xsdSchema[ 'include']);
    if (includes.length > 0) {
        //console.log('######inludesfound##########');
        //console.log(xsdSchema);
        for (var i = 0; i < includes.length;++ i) {
            imports.push(includes[i]);
        }
        
        //console.log(imports);
    }
    var currentFileName = xsdSchema.filename;
    for (var i = 0; i < imports.length;++ i) {
        var importFile = imports[i];
        var importfileLocation = importFile.schemaLocation;
        var resolvedPath = absolute(currentFileName, importfileLocation);
        //console.log(currentFileName + ',' + importfileLocation);
        for (var k = 0; k < allXSD.length;++ k) {
            var allXSDFile = allXSD[k];
            var allXSDFileName = allXSDFile.filename;
            //not sure about adding simple get filename check for speed?
            //console.log(allXSDFile);
            //console.log(importFile);
            //a=stophere;
            //console.log('found the index of...');
            //so now that I have found a maybe match I need to look at its relative paths
            
            //how do I get from currentFileName to see if this matches the importfileLocation path according to absolute rules
            /*console.log('currentFileName:'+currentFileName);
            console.log('importfileLocation:'+importfileLocation);
            console.log('resolvedPath :   ' + resolvedPath);
            console.log('allXSDFileName : '+allXSDFileName);
             */
            if (allXSDFileName == resolvedPath) {
                //this is a match to the import so check if this has imports?
                //console.log('this is a match to the resolved pathing');
                getAllImports(allXSDFile, allXSD, importObject, dupNameSpaces, dupXSDs);
                //there can only be one match....
                break;
            }
        }
    }
}
function processXSD(xsd, allXSD) {
    if (xsd.rootElement != null) {
        stopCounter = 0;
        var xPathList =[];
        xsd.rootElement.targetNamespace = xsd.targetNamespace;
        
        //console.log(xsd);
        //I have to pass in the list of targets to alias names for this schema...
        var namespaceArray = returnArray(xsd.namespaces);
        namespaceKeys =[];
        //now for each key get the key and the value and make an Array of them?
        for (var i = 0; i < namespaceArray.length;++ i) {
            var otherNamespace = namespaceArray[i];
            for (var key in otherNamespace) {
                namespaceKey = {
                };
                namespaceKey.alias = key;
                namespaceKey.target = otherNamespace[key];
                namespaceKeys.push(namespaceKey);
            }
        }
        var importObject = {
        };
        //now add the current file to the list as well...
        importObject.xsdList =[];
        importObject.namespaces =[];
        var dupNameSpaces =[];
        var dupXSDs =[];
        //console.log(xsd);
        //console.time('getAllImports');
        getAllImports(xsd.schema, allXSD, importObject, dupNameSpaces, dupXSDs);
        //console.timeEnd('getAllImports');
        //now add the current file to the list as well...
        //I use to traverse all the xsds but now I only want to traverse the imports
        //var returnObj = traverse(xsd.rootElement, allXSD, '/', xPathList, 1, namespaceKeys);
        a=startingfromhere;
        var returnObj = traverse(xsd.rootElement, importObject.xsdList, '/', xPathList, 1, importObject.namespaces);
        var parentArray =[];
        //if(xsd.schemaName=='UpdatePartyNoteRequest'){
        var xPathList = createXPathList(returnObj, 'root', 'root', '/', 1, parentArray);
        //for(var i=0;i<xPathList.length;i++){
        //   console.log(xPathList[i].xPath);
        // }
        //console.log(xPathList);
        //a=seehwothisturnsou;
        //}
        
        returnObj.xPathList = xPathList;
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
        // console.log(SOAObj);
    }
    return parentArray;
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
        console.log('A choice has been found with no objects under it?');
        console.log(soaObject);
        a = choiceserror;
    } else {
        return choices;
    }
    return choices;
}

function dynamicSortMultiple() {
    /*
     * save the arguments object as it will be overwritten
     * note that arguments object is an array-like object
     * consisting of the names of the properties to sort by
     */
    var props = arguments;
    return function (obj1, obj2) {
        var i = 0, result = 0, numberOfProperties = props.length;
        /* try getting a different result from 0 (equal)
         * as long as we have extra properties to compare
         */
        while (result === 0 && i < numberOfProperties) {
            result = dynamicSort(props[i])(obj1, obj2);
            i++;
        }
        return result;
    }
}

function dynamicSort(property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function (a, b) {
        var result = (a[property] < b[property]) ? -1: (a[property] > b[property]) ? 1: 0;
        return result * sortOrder;
    }
}

function traverse(x, allXSD, xPath, xPathList, order, nameSpaceKeys) {
    if (isArray(x)) {
        traverseArray(x, allXSD, xPath, xPathList, order++, nameSpaceKeys);
    } else if ((typeof x === 'object') && (x !== null)) {
        if (traverseObject(x, allXSD, xPath, xPathList, false, order++, nameSpaceKeys) == false) {
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
function traverseArray(arr, allXSD, xPath, xPathList, order, nameSpaceKeys) {
    //console.log("<array>");
    //current object is an array so I dont need to do much other than process each element
    //update this to a for loop?
    for (var i = 0; i < arr.length; i++) {
        traverse(arr[i], allXSD, xPath, xPathList, order++, nameSpaceKeys);
    }
}
var maxCounter = 500;
function traverseObject(obj, allXSD, xPath, xPathList, maintainXPATH, order, nameSpaceKeys) {
    //stopCounter++;if(stopCounter>maxCounter){a=counterended;}
    //console.log("<object>");
    //is one of these keys a type?
    //I only need to check that type and ref arent null...
    if (obj.base != null) {
        //console.log('object with base');
        //console.log(obj);
        var namedObject = getNamedType(obj.base, obj, obj, allXSD, nameSpaceKeys);
        //console.log(namedObject);
        obj.child = namedObject;
        var newxpath = xPath;
        traverseObject(namedObject, allXSD, newxpath, xPathList, false, order++, nameSpaceKeys);
    }
    if (obj.type != null) {
        //console.log('##########');
        //console.log('obj.type='+ obj.type);
        //console.log('##########');
        var namedObject = getNamedType(obj.type, obj, obj, allXSD, nameSpaceKeys);
        //console.log(namedObject);
        obj.child = namedObject;
        if (maintainXPATH) {
            var newxpath = xPath;
        } else {
            if (isRecursive(obj.name, xPath)) {
                obj.recursive = true;
                delete obj.child;
                //can I mark the parent as recursive?
                
                return false;
            }
            var newxpath = xPath + '/' + obj.name;
            
            //console.log('everytime I do this "xPathList.push" I need to check the properties?');
        }
        //a=typeisntnotnull;
        
        
        traverseObject(namedObject, allXSD, newxpath, xPathList, false, order++, nameSpaceKeys);
    } else if (obj.ref != null) {
        //console.log(obj);
        var namedObject = getNamedType(obj.ref, obj, obj, allXSD, nameSpaceKeys);
        //console.log(namedObject);
        obj.child = namedObject;
        
        var newxpath = xPath + '/' + obj.ref;
        
        
        if (isRecursive(obj.ref, xPath)) {
            obj.recursive = true;
            delete obj.child;
            return false;
            a = isrecursivefountrue;
        }
        traverseObject(namedObject, allXSD, newxpath, xPathList, true, order++, nameSpaceKeys);
    } else {
        for (var key in obj) {
            if ((key != 'type') &&(key != 'base') &&(key != 'ref')) {
                if (obj.hasOwnProperty(key)) {
                    //console.log(key);
                    //console.log(obj[key]);
                    //I only care about objects and arrays but will call generic
                    traverse(obj[key], allXSD, xPath, xPathList, order++, nameSpaceKeys);
                }
            }
        }
    }
}
function replaceAll(str, find, replace) {
    //return str.replace(new RegExp(find, 'g'), replace);
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function getXPathProperties(xsdObject, xPath, existingList) {
    //console.log(order);
    var depth = (xPath.split('/').length) -2;
    xPathObject = {};
    
    xPathObject.refData = undefined;
    xPathObject.depth = depth;
    xPathObject.enumeration = undefined;
    xPathObject.enumerationString = undefined;
    xPathObject.fractionDigits = undefined;
    xPathObject.length = undefined;
    xPathObject.maxExclusive = undefined;
    xPathObject.maxInclusive = undefined;
    xPathObject.maxLength = undefined;
    xPathObject.minExclusive = undefined;
    xPathObject.minInclusive = undefined;
    xPathObject.minLength = undefined;
    xPathObject.pattern = undefined;
    xPathObject.totalDigits = undefined;
    xPathObject.whiteSpace = undefined;
    xPathObject.minOccurs = xsdObject.minOccurs;
    xPathObject.maxOccurs = xsdObject.maxOccurs;
    xPathObject.block = xsdObject.block;
    xPathObject[ 'default'] = xsdObject[ 'default'];
    xPathObject.fixed = xsdObject.fixed;
    xPathObject.nillable = xsdObject.nillable;
    xPathObject.xsType = 'complex';
    if (xsdObject != null) {
        xPathObject.refData = getReferenceDataFromObject(xsdObject);
        if (xsdObject.child != null) {
            var child = xsdObject.child;
            if (child.xsType != null) {
                //I know the hirachy now for this one?
                xPathObject.xsType = child.xsType;
                //TODO add in the restrictions?
            } else if (child.child != null) {
                var grandchild = child.child;
                //dont overide the ref data on a child if its already there
                if ((grandchild.restriction != null) &&(grandchild.restriction.child != null) &&(grandchild.restriction.child.xsType != null)) {
                    //I know the hirachy now for this one?
                    xPathObject.xsType = grandchild.restriction.child.xsType;
                    //this also means that the other 12 have to sit here?
                    var xPathObject = addRestrictions(grandchild.restriction, xPathObject);
                } else if (grandchild.xsType != null) {
                    xPathObject.xsType = grandchild.xsType;
                    //TODO add in the restrictions?
                } else {
                }
            } else {
                //a=dontgonow;
            }
        } else if (xsdObject.restriction != null) {
            console.log(xsdObject);
            a = roothasrstcit;
        }
    } else {
        a = howisthispoissbleandnull;
    }
    xPathObject.xPath = xPath;
    xPathObject.xCompare = JSON.stringify(xPathObject);
    //get the name of the object and the parent name?
    var xPathArray = xPath.split('/');
    var xPathArrayLen = xPathArray.length;
    xPathObject.name = xPathArray[xPathArrayLen -1];
    if (xPathArrayLen > 1) {
        xPathObject.parentName = xPathArray[xPathArrayLen -2];
        xPathObject.uniqueName = xPathObject.parentName + '/' + xPathObject.name;
    } else {
        xPathObject.parentName = null;
        xPathObject.uniqueName = xPathObject.name;
    }
    return xPathObject;
}

function addRestrictions(restrictionObj, returnObject) {
    if (restrictionObj.enumeration != null) {
        var enumerations = returnArray(restrictionObj.enumeration);
        var resultenumerationsArray =[];
        for (var i = 0; i < enumerations.length; i++) {
            var enumeration = enumerations[i].value;
            resultenumerationsArray.push(enumeration);
        }
        returnObject.enumeration = resultenumerationsArray;
        returnObject.enumerationString = JSON.stringify(resultenumerationsArray);
    }
    
    returnObject.fractionDigits = ((restrictionObj || {
    }).fractionDigits || {
    }).value;
    returnObject.length = ((restrictionObj || {
    }).length || {
    }).value;
    returnObject.maxExclusive = ((restrictionObj || {
    }).maxExclusive || {
    }).value;
    returnObject.maxInclusive = ((restrictionObj || {
    }).maxInclusive || {
    }).value;
    returnObject.maxLength = ((restrictionObj || {
    }).maxLength || {
    }).value;
    returnObject.minExclusive = ((restrictionObj || {
    }).minExclusive || {
    }).value;
    returnObject.minInclusive = ((restrictionObj || {
    }).minInclusive || {
    }).value;
    returnObject.minLength = ((restrictionObj || {
    }).minLength || {
    }).value;
    returnObject.pattern = ((restrictionObj || {
    }).pattern || {
    }).value;
    returnObject.totalDigits = ((restrictionObj || {
    }).totalDigits || {
    }).value;
    returnObject.whiteSpace = ((restrictionObj || {
    }).whiteSpace || {
    }).value;
    return returnObject;
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
        if (counter > 1) {
            return true;
        } else {
            return false;
        }
    }
}

function schemaTreeDataLoopTechnicalTest(SOAObj, currentKey, parentKey, parentArray, changesArray) {
    //never process xpathlists in this tree
    if (currentKey != 'xPathList') {
        if (isArray(SOAObj)) {
            for (var i = 0; i < SOAObj.length; i++) {
                schemaTreeDataLoopTechnicalTest(SOAObj[i], 'array', currentKey, parentArray, changesArray);
            }
        } else if ((typeof SOAObj === 'object') && (SOAObj !== null)) {
            //here I want to skip items that arent of interest?
            var currentArray = parentArray;
            if (keepTreeData(currentKey, parentKey) != true) {
                //if I skip an item I have to have the previous ChildArray to continue adding the next item to....
                //I want to maintain the parentKey relationship...
                //parentKey = currentKey;
            } else {
                var newObject = createNamedObject(SOAObj, currentKey, parentKey, true, changesArray);
                parentArray.push(newObject);
                var currentArray = newObject.children;
            }
            //always process the child object first before looping on the keys
            if (SOAObj.child != null) {
                schemaTreeDataLoopTechnicalTest(SOAObj.child, 'child', currentKey, currentArray, changesArray);
            }
            for (var key in SOAObj) {
                if (key != 'child') {
                    schemaTreeDataLoopTechnicalTest(SOAObj[key], key, currentKey, currentArray, changesArray);
                }
            }
        } else {
            //console.log('not an object');
            // console.log(SOAObj);
        }
    }
    
    
    return parentArray;
}

function createNamedObject(SOAObj, currentKey, parentKey, debugFlag, changesArray) {
    var formatNameObject = getSchemaObjectFormattedNameAsObject(SOAObj, currentKey, parentKey, debugFlag, changesArray);
    var childArray =[];
    //does this have reference data? or enumerations
    
    var namedObject = {
        "name": formatNameObject.html, "children": childArray, "type": currentKey, "parentType": parentKey
    };
    
    if ((formatNameObject.elementObj!=null)&&(formatNameObject.elementObj.enumeration != null)) {
        namedObject.enumeration = formatNameObject.elementObj.enumeration;
    }
    if (formatNameObject.refDataObj != null) {
        namedObject.refDataObj = formatNameObject.refDataObj;
    }

    //add children
    //console.log(changesArray);
    //does this object match a deleted object child
    for (var i = 0; i < changesArray.length; i++) {
        var change = changesArray[i];
        if (change.changeType == 'deleted') {
            var xPathArray = change.xPathKey.split('/');
            var lastItem = xPathArray.pop();
            var parentKey = xPathArray.join('/');
            if (parentKey == SOAObj.xPathKey) {
                var formatDeletedName = formatXPathObjectForTree(change.oldObject, change.changeType);
                childArray.push(formatDeletedName);
            }
        }
    }
    
    
    return namedObject;
}

function formatXPathObjectForTree(xPathObject, changeType) {
    //console.log(xPathObject);
    if (changeType == 'deleted') {
        buttonType = 'red';
        changeType = ' deleted ';
    } else {
        buttonType = 'green';
    }
    
    var displayStructure = formatCamelCaseForHumans(xPathObject.name);
    var html = '<a class="button ' + buttonType + changeType + '">';
    html += '<span class="item">';
    html += displayStructure;
    html += '</span>';
    var displayType = formatType(xPathObject.xsType);
    if (displayType != '') {
        html += '<span class="normal"> - ';
        html += displayType;
        html += '</span>';
    }
    var cardinalityObject = getCardinality(xPathObject);
    //console.log(cardinalityObject);
    var cardinalityDisplay = cardinalityObject.display;
    html += '<span class="meta cost">';
    html += cardinalityDisplay;
    html += '</span>';
    html += '</a>';
    return html;
}
function getSchemaObjectFormattedNameAsObject(SOAObj, namedKey, parentKey, debugFlag, changesArray) {
    //is it a base type?
    //console.log('namedKey:' + namedKey);
    //console.log('parentKey:' + parentKey);
    //console.log(SOAObj);
    var returnObject = {};
    
    var buttonType = 'parent';
    var testKey = namedKey;
    if (namedKey == 'array') {
        //inherit the parent for all array objects under the one banner..ie many elements
        testKey = parentKey;
    }
    displayStructure = formatCamelCaseForHumans(formatStructure(findNameFromObj(SOAObj, testKey)));
    var displayType = 'unhandled';
    //has this got a name?
    if (testKey == 'root') {
        buttonType = 'purple';
        debugFlag = false;
        displayType = '';
    } else if (testKey == 'choice') {
        buttonType = 'blue';
        debugFlag = false;
        displayType = '';
        displayStructure = 'Choice between...';
    } else if (testKey == 'refData') {
        buttonType = 'yellow';
        displayStructure = SOAObj.table + '-' + SOAObj.fromcolumn;
    } else if (testKey == 'enumeration') {
        buttonType = 'yellow';
        displayStructure = SOAObj.value;
        debugFlag = false;
        displayType = '';
    } else if (testKey == 'element') {
        buttonType = 'green';
        //console.log('SOAObj:');
        //console.log(SOAObj);
        
        var elementObj = resolveElement(SOAObj);
        //elements can be simple or complex types only
        //complex types just need to be shown...
        displayStructure = elementObj.displayName;
        if (elementObj.type == 'complex') {
            displayType = '';
        } else {
            //for simple type I have to list the base type
            displayType = formatType(elementObj.xsType);
            if (elementObj.enumeration != null) {
                displayType = 'Enumerated ' + formatType(elementObj.xsType) + ' with ' + elementObj.enumeration.length + ' items';
            }
        }
        //cause I have dealt with it
        debugFlag = false;
    } else {
        displayType = formatType(testKey);
        buttonType = 'black';
    }
    if (SOAObj.recursive) {
        displayType += ' This item cannot be shown to to a reference to ' + SOAObj.type + ' being recursive on this parent';
    }
    var changeType = '';
    if (changesArray.length > 0) {
        //this schema has changes so find the one
        //this will find new and modifed items only
        for (var i = 0; i < changesArray.length; i++) {
            var change = changesArray[i];
            var xPathArray = change.xPathKey.split('/');
            var lastItem = xPathArray.pop();
            var parentKey = xPathArray.join('/');
            if ((change.xPathKey != null) &&(SOAObj.xPathKey != null)) {
                if (change.xPathKey == SOAObj.xPathKey) {
                    //a=newfoundhere;
                    for (var m = 0; m < change.report.changes.length;++ m) {
                        displayType = displayType + ' ' + change.report.changes.shortDescriptions + ' ';
                    }
                    if (change.changeType == 'new') {
                        changeType = ' insert ';
                    } else if (change.changeType == 'deleted') {
                        changeType = ' deleted ';
                    } else if (change.changeType == 'changed') {
                        changeType = ' modified ';
                    } else {
                        changeType = ' modified ';
                    }
                } else if (parentKey == SOAObj.xPathKey) {
                    changeType = ' parentofchange ';
                    
                    if (change.changeType == 'deleted') {
                        changeType = ' parentofdeleted ';
                    }
                }
            }
        }
    }
    var html = '<a class="button ' + buttonType + changeType + '">';
    html += '<span class="item">';
    if (debugFlag) {
        html += displayStructure + ' : ' + parentKey + '-' + namedKey;
    } else {
        html += displayStructure;
    }
    html += '</span>';
    if (displayType != '') {
        html += '<span class="normal"> - ';
        html += displayType;
        html += '</span>';
    }
    var enumeration = SOAObj.enumeration;
    if (enumeration!=null) {
        //console.log(SOAEntityType);
        //console.log(enumeration);
        
        var displayEnumeration = enumeration;
        html += '<span class="enum enumerationList">';
        html += displayEnumeration;
        html += '</span>';
    }
    
    if (elementObj != null) {
        var cardinalityDisplay = elementObj.cardinality.display;
        html += '<span class="meta cost">';
        html += cardinalityDisplay;
        html += '</span>';
    }
    
    //only require this on certain types that arent enumerations
    
    if ((SOAObj.type == 'xs:token') &&(enumeration == '')) {
        if (SOAObj.maxLength == undefined) {
            var maxLength = 'unbounded';
        } else {
            var maxLength = SOAObj.maxLength;
        }
        if (SOAObj.minLength == undefined) {
            var minLength = '0';
        } else {
            var minLength = SOAObj.minLength;
        }
        if (maxLength != 'unbounded') {
            html += '<span class="normal">';
            html += " restricted length to " + maxLength + " characters";
            html += '</span>';
        }
    }
    
    
    
    var refDataObj = getReferenceDataFromObject(SOAObj);
    
    if (refDataObj!=null) {
        //console.log(refDataObj);
        var tablelink = 'Ref Data (not enforced) ' + refDataObj.table + '-' + refDataObj.fromcolumn;
        html += '<span class="meta category tablelink">';
        html += tablelink;
        html += '</span>';
    }
    //End of required
    html += '</a>';
    returnObject.html = html;
    if(elementObj!=null){
        returnObject.elementObj = elementObj; 
    }
    if(refDataObj!=null){
        returnObject.refDataObj = refDataObj;
    }
        
    
    return returnObject;
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

function formatStructure(structure) {
    var pos = structure.indexOf(':');
    if (pos != -1) {
        return structure.substr(pos + 1, structure.length - pos + 1);
    } else {
        return structure;
    }
}
function formatType(elementType) {
    
    var resultString = elementType;
    //console.log(resultString);
    if (elementType != null) {
        var pos = elementType.indexOf('xs:');
        //console.log('pos:' + pos);
        if (pos != -1) {
            var displayType = elementType.substr(pos + 3, elementType.length - pos + 3);
            //console.log(displayType);
            if (displayType == 'token') {
                resultString = 'string';
            } else {
                resultString = displayType;
            }
        } else {
            resultString = '';
        }
    } else {
        resultString = elementType;
    }
    //return resultString;
    if ((resultString != null) &&(resultString != '')) {
        return capitalizeFirstLetter(resultString);
    } else {
        return '';
    }
}


function resolveElement(obj) {
    //because this is an elementObject I should have a child
    var elementObject = {
    };
    //the name can come from the child or the parent dpending on it its a ref or a type
    if (obj.ref != null) {
        elementObject.name = obj.ref;
    } else if (obj.base != null) {
        elementObject.name = obj.base;
    } else {
        elementObject.name = obj.name;
    }
    if (obj.recursive) {
        elementObject.recursive = obj.recursive;
    }
    elementObject.displayName = formatCamelCaseForHumans(removeNamespace(elementObject.name));
    //Im not sure that all max and mins arent at this top level?
    if (obj.maxOccurs != null) {
        elementObject.maxOccurs = obj.maxOccurs;
    } else {
        elementObject.maxOccurs = '1';
    }
    if (obj.minOccurs != null) {
        elementObject.minOccurs = obj.minOccurs;
    } else {
        elementObject.minOccurs = '1';
    }
    var cardinalityObject = getCardinality(elementObject);
    elementObject.cardinality = cardinalityObject;
    //console.log(elementObject);
    //if there is no restriction.base then this is not a simple?
    if ((obj.child != null) &&(obj.child.restriction != null) &&(obj.child.restriction.base != null)) {
        var simpleObject = obj.child.restriction;
        elementObject.type = 'simple';
    } else if ((obj.child != null) &&(obj.child.child != null) &&(obj.child.child.restriction != null) &&(obj.child.child.restriction.base != null)) {
        var simpleObject = obj.child.child.restriction;
        elementObject.type = 'simple';
    } else if ((obj.child != null) &&(obj.child.child != null) &&(obj.child.child.xsType != null)) {
        var simpleObject = obj.child;
        elementObject.type = 'simple';
    } else {
        elementObject.type = 'complex';
    }
    if (elementObject.type == 'simple') {
        elementObject.base = simpleObject.base;
        elementObject.xsType = ((simpleObject || {
        }).child || {
        }).xsType;
        elementObject.length = ((simpleObject || {
        }).length || {
        }).value;
        elementObject.minLength = ((simpleObject || {
        }).minLength || {
        }).value;
        elementObject.maxLength = ((simpleObject || {
        }).maxLength || {
        }).value;
        elementObject.length = ((simpleObject || {
        }).length || {
        }).value;
        if (simpleObject.enumeration != null) {
            elementObject.enumeration =[];
            var originaValues = simpleObject.enumeration;
            for (var i = 0; i < originaValues.length; i++) {
                elementObject.enumeration.push(originaValues[i].value);
            }
        }
    } else {
    }
    return elementObject;
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
function findNameFromObj(SOAObj, namedKey) {
    if (SOAObj.name != null) {
        return SOAObj.name;
    } else if (SOAObj.ref != null) {
        return SOAObj.ref;
    } else if (SOAObj.base != null) {
        return SOAObj.base;
    } else if (SOAObj.type != null) {
        return SOAObj.type;
        xsType
    } else if (SOAObj.xsType != null) {
        return SOAObj.xsType;
    } else {
        return namedKey;
    }
}
function removeNamespace(inName) {
    var pos1 = inName.indexOf(':');
    if (pos1 == -1) {
        return inName;
    } else {
        return inName.substring(pos1 + 1, inName.length);
    }
}