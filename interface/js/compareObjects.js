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
            currentXSD.shortChangeDescriptions = [];
            currentXSD.changeList = [];
            for (var k=0;k<previousSO.schemaList.length;k++){
                var previousXSD = previousSO.schemaList[k];
                if(currentXSD.schemaName==previousXSD.schemaName){
                    matchedXSDFlag = true;
                    var resultXSDDiff = diffxPathList(currentXSD.rootElement.xPathList, previousXSD.rootElement.xPathList, currentXSD);
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

function compareReleases(currentAndPreviousObject){
    var current = currentAndPreviousObject.current;
    var previous = currentAndPreviousObject.previous;
    //console.log('calling traverseCompare');
    console.time('traverseCompare');
    //maybe just do each service root?
    for (var i = 0; i < current.length; i++) {
        var currentSO = current[i];
        if(currentSO.ServiceNumber!='CORE'){
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
        }
        
    }
    
    
    for (var i = 0; i < current.length; i++) {
        var currentSO = current[i];
        if(currentSO.ServiceNumber!='CORE'){
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
                            if(previousSO.ServiceNumber!='CORE'){
                                if(previousSO.key==previousKey){
                                    compareServiceObjects(currentSO,previousSO);
                                    matchedPreviousVersion=true;
                                    break;
                                }
                            }
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
        }
    }
    for (var k = 0; k < previous.length; k++) {
        var previousSO = previous[k];
        if(previousSO.ServiceNumber!='CORE'){
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
        }
    }
    console.timeEnd('traverseCompare');
    //console.log(current);
    return current;
    
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
            if(x1item.xPath==x2item.xPath){
                //set both items as matches to the same until I compare them
                x1item.changeType='same';
                x2item.changeType='same';
                //compare the xCompare values
                if(x1item.xCompare!==x2item.xCompare){
                    //console.log('key matched but these not the same : ' + x1item.xCompare + '!=' + x2item.xCompare);
                    diffObject = {};
                    diffObject.newObject = x1item;
                    diffObject.oldObject = x2item;
                    diffObject.changeType='changed'; 
                    diffObject.xPathKey = x1item.xPath;
                    x1item.changeType='changed';
                    x2item.changeType='changed';
                    diffObject.report = diffElementObjects(x1item,x2item, SO); 
                    //get a difference report from a custom function that understands the diffs
                    
                    r1.push(diffObject);
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
            diffObject.xPathKey = x1item.xPath;
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
            diffObject.xPathKey = x2item.xPath;
            diffObject.report = diffElementObjects(null, x2item, SO);
            diffObject.changeType='deleted';
            r1.push(diffObject);
        }
    }
    return r1;
}

function diffArrayOfStrings(A, B) {
    return A.filter(function (a) {
        return B.indexOf(a) == -1;
    });
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
    //so now look at specific keys and do the diff
    if(d2==null){
        changes.push('new item');
        descriptions.push(d1.uniqueName + ' is new.');
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
        	var diffs = diffArrayOfStrings(d1.enumeration,d2.enumeration);
        	descriptions.push(d1.uniqueName + ' has the following adds to the enumeration : ' + diffs.join(',')); 
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
    //looped
    for(var i = 0;i<descriptions.length;i++){
        SO.changeDescriptions.push(descriptions[i]);
    }
    for(var i = 0;i<shortDescriptions.length;i++){
        SO.shortChangeDescriptions.push(shortDescriptions[i]);
    }
    //console.log(report);
    //a=endheretotestdiff;
    
    return report;
}

function diffArray(arr1, arr2) {
 var newArr = [];

  arr1.map(function(val){
   arr2.indexOf(val) < 0 ? newArr.push(val) : '';
  });

  arr2.map(function(val){
   arr1.indexOf(val) < 0 ? newArr.push(val) : '';
  });

  return newArr;
}


function createChangeSummaryObject(changesArray){
    var changeSummary = {};
    changeSummary.NewCount = 0;
    changeSummary.DeletedCount = 0;
    changeSummary.CardinalityCount = 0;
    changeSummary.RangeCount = 0;
    changeSummary.RefLinkCount = 0;
    changeSummary.SOAEntityTypeCount = 0;
    changeSummary.TypeCount = 0;
    changeSummary.minLengthCount = 0;
    changeSummary.maxLengthCount = 0;
    changeSummary.SOALinkCount = 0;
    changeSummary.patternCount = 0;
    changeSummary.enumerationCount = 0;
    changeSummary.DocumentationCount = 0;
    if(changesArray!=null){
        if(changesArray.length>0){
            
            for (var i = 0; i < changesArray.length; i++) {
            var changeType = changesArray[i];
                if(changeType.Type.toLowerCase()=="new"){
               	    changeSummary.NewCount++;
                }
                if(changeType.Type.toLowerCase()=="deleted"){
               	    changeSummary.DeletedCount++;
                }
                if(changeType.Type.toLowerCase()=="cardinality"){
               	    changeSummary.CardinalityCount++;
                }
                if(changeType.Type.toLowerCase()=="range"){
                	changeSummary.RangeCount++;
                }
                if(changeType.Type.toLowerCase()=="reflink"){
               	    changeSummary.RefLinkCount++;
                }
                if(changeType.Type.toLowerCase()=="soaentitytype"){
                	changeSummary.SOAEntityTypeCount++;
                }
                if(changeType.Type.toLowerCase()=="type"){
                	changeSummary.TypeCount++;
                }
                if(changeType.Type.toLowerCase()=="minlength"){
                	changeSummary.minLengthCount++;
                }
                if(changeType.Type.toLowerCase()=="maxlength"){
                	changeSummary.maxLengthCount++;
                }
                if(changeType.Type.toLowerCase()=="soalink"){
                	changeSummary.SOALinkCount++;
                }
                if(changeType.Type.toLowerCase()=="pattern"){
                	changeSummary.patternCount++;
                }
                if(changeType.Type.toLowerCase()=="enumeration"){
                	changeSummary.enumerationCount++;
                }
                if(changeType.Type.toLowerCase()=="documentation"){
                	changeSummary.DocumentationCount++;
                }
            }
        }
    }
    return changeSummary;    
}




function entityDiff(parentSOAEntity, entityListA, entityListB, changeTypesArray){
    //console.log('entityDiff');
    //console.log(parentSOAEntity);
    //now do a recursive loop making sure I match the Structure in each
    //starting with Entity A loop on an array
    //console.log(entityListA);
    rtnMsg = '';
    entityListACount = entityListA.length;
    entityListBCount = entityListB.length;
    entityCountDiff = entityListACount - entityListBCount;      
    
    for (var i = 0; i < entityListA.length; i++) {
        var entityobjA = entityListA[i];
        for (var k = 0; k < entityListB.length; k++) {
            var entityobjB = entityListB[k];
            if(entityobjA.child==entityobjB.child){
                matchedEntities = true;
                entityobjA.checked = true;
                entityobjB.checked = true;
                //same object so compare
                if(deepCompare(entityobjA, entityobjB)!=true){
                    //its different so better check for childers
                    entityobjA = returnEntityDiff(entityobjA,entityobjB, 'Deep compare different');
                    
                    //console.log(entityobjA);
                    if(entityobjA.Difference.ChangeTypes.length>0){
                        for (var l = 0; l < entityobjA.Difference.ChangeTypes.length; l++) {
                        var change = entityobjA.Difference.ChangeTypes[l];
                            var changeobj = {};
                            changeobj.Type = change;
                            changeobj.SOALink = entityobjA.SOALink;
                            changeobj.Structure = entityobjA.Structure;
                            changeTypesArray.push(changeobj);
                        }
                    }
                    if ((entityobjA.child !== null) &&(entityobjA.child !== undefined)) {
                        var childEntityArrayA = returnArray(entityobjA.child);
                        var childEntityArrayB = returnArray(entityobjB.child);
                        entityDiff(childEntityArrayA, childEntityArrayA, childEntityArrayB, changeTypesArray);
                    }else{
                        //I have already logged the difference so it should be OK
                    }
                }else{
                    //objects are identical so mark them?
                    entityobjA.HasChanged = false;
                    entityobjA.Difference = null;
                }
            }else{
                //not the same object but it doesnt yet mean that it wont be later in the array
            }
        }
        if(matchedEntities!=true){
            //console.log('No match on ' + entityobjA.Structure);
            entityobjA = returnEntityDiff(entityobjA,null, 'Nothing matched in the loop');
            if(entityobjA.Difference.ChangeTypes.length>0){
                for (var j = 0; j < entityobjA.Difference.ChangeTypes.length; j++) {
                    var change = entityobjA.Difference.ChangeTypes[j];
                    var changeobj = {};
                    changeobj.Type = change;
                    changeobj.SOALink = entityobjA.SOALink;
                    changeobj.Structure = entityobjA.Structure;
                    changeTypesArray.push(changeobj);
                }
            }
        }
    }
    for (var l = 0; l < entityListA.length; l++) {
        var entityobjA = entityListA[l];
        var matchedEntities = false;
        
    }
    //this is to handle deleted objects from B
        for (var m = 0; m < entityListB.length; m++) {
            var entityobjB = entityListB[m];
            if(entityobjB.checked!=true){
                entityobjA = returnEntityDiff(null,entityobjB, 'Finding deleted items from B');
                //parentSOAEntity.push(entityobjA);
                if(entityobjA.Difference.ChangeTypes.length>0){
                    for (var l = 0; l < entityobjA.Difference.ChangeTypes.length; l++) {
                        var change = entityobjA.Difference.ChangeTypes[l];
                        var changeobj = {};
                        changeobj.Type = change;
                        changeobj.SOALink = entityobjA.SOALink;
                        changeobj.Structure = entityobjA.Structure;
                        changeTypesArray.push(changeobj);
                    }
                }
            }
        }
       
}

function returnEntityDiff(A,B, context){
    var diffTypesArray= [];
    var diffTypes = {};
    var entityReturn = A;
    var hasDiff = false;
    if((B==null)||(B==undefined)){
        //console.log('New field for ' + A.SOALink);
        diffTypesArray.push('New');
        hasDiff = true;
    }
    if((A==null)||(A==undefined)){
        diffTypesArray.push('Deleted');
        hasDiff = true;
        entityReturn = B;
    }
    if((B!=null)&&(B!=undefined)&&(A!=null)&&(A!=undefined)){
        if(A.Cardinality!=B.Cardinality){
            diffTypesArray.push('Cardinality');
            hasDiff = true;
        }
        if(A.Range!=B.Range){
            diffTypesArray.push('Range');
            hasDiff = true;
        }
        if(A.RefLink!=B.RefLink){
            diffTypesArray.push('RefLink');
            hasDiff = true;
        }
        if(A.SOAEntityType!=B.SOAEntityType){
            diffTypesArray.push('SOAEntityType');
            hasDiff = true;
        }
        if(A.Type!=B.Type){
            diffTypesArray.push('Type');
            hasDiff = true;
        }
        if(A.minLength!=B.minLength){
            diffTypesArray.push('minLength');
            hasDiff = true;
        }
        if(A.maxLength!=B.maxLength){
            diffTypesArray.push('maxLength');
            hasDiff = true;
        }
        if(A.SOALink!=B.SOALink){
            diffTypesArray.push('SOALink');
            hasDiff = true;
        }
        if(A.pattern!=B.pattern){
            diffTypesArray.push('pattern');
            hasDiff = true;
        }
        if(A.enumeration!=B.enumeration){
            diffTypesArray.push('enumeration');
            hasDiff = true;
        }    
    }
    //#TODO Fix the ParentOnly
    if(hasDiff==true){
        diffTypes.ParentOnly = false;
    }else{
        diffTypes.ParentOnly = true;
    }
    
    entityReturn.HasChanged = hasDiff;
    diffTypes.ChangeTypes = diffTypesArray;
    entityReturn.Difference = diffTypes;
    return entityReturn;
}

function getStringDifference(a, b)
{
    var i = 0;
    var j = 0;
    var result = "";

    while (j < b.length)
    {
        if (a[i] != b[j] || i == a.length)
            result += b[j];
        else
            i++;
        j++;
    }
    return result;
}

function schemaDiff(macroA, macroB){
    var diffReport = {};
    changeTypesArray = [];
    changeTypes = {};
    diffReport.schemaIdentical = true;
    diffReport.requestIdentical = true;
    diffReport.responseIdentical = true;
    macroA.Identical = true;
    var allChangesSummary = [];
    //console.log(macroA);
    if(deepCompare(macroA, macroB)!=true){
        
        //I have an additional ServiceMap that Im going to skip for now?
        macroA.Identical = false;
        //TODO documentation but get a usage? or something?????
        //var documentationA = macroA.ServiceMap.Macro.Documentation;
        //var documentationB = macroB.ServiceMap.Macro.Documentation;
        //console.log('macroA');
        //console.log(macroA);
        //console.log('macroB');
        //console.log(macroB);
        var documentationA = macroA.readme;
        var documentationB = macroB.readme;
        if(documentationA!==documentationB){
            //I should check why the doco is different first
            if(((documentationB===null)||(documentationB===undefined))&&(documentationA!==null)){
                //resultDiff = getStringDifference(documentationA,'');
                resultDiff = 'Previous documentation didnt exist';
            }else if(((documentationA===null)||(documentationA===undefined))&&(documentationB!==null)){
                //resultDiff = getStringDifference('',documentationB);
                resultDiff = 'Documentation has been removed';
                documentationA = {};
            }else{
                resultDiff = getStringDifference(documentationA,documentationB);    
            }
            if(resultDiff==''){
                resultDiff = documentationA;
            }
            var documentationChangeSummary = [];
            documentationChangeSummary.push(resultDiff); 
            documentationA.Identical = false;
            documentationA.documentationChanges = documentationChangeSummary;
            var docoTypeChange = {};
            docoTypeChange.Type = 'Documentation';
            docoTypeChange.changes = documentationChangeSummary;
            changeTypesArray.push(docoTypeChange);
        }
        
        
        
        
        //console.log(macroA.schemaList[0].macro);
        //I have to get the list of schemas and test how many I have
        var schemaListA = macroA.schemaList;
        var schemaListB = macroB.schemaList;
        //console.log(schemaListA);
        
        
        
        var schemaA = macroA.schemaList[0].rootElement;
        var schemaB = macroB.schemaList[0].rootElement;
        //find the key from the b list
        for (var p = 0; p < schemaListA.length; p++) {
            var schemaA = schemaListA[p];
            for (var q = 0; q < schemaListB.length; q++) {
                var schemaB = schemaListB[q];
                if(schemaA.key==schemaB.key){
                    //these are a match so compare them?
                    schemaA.Identical = true;
                    schemaB.Identical = true;
                    if(deepCompare(schemaA, schemaB)!=true){
                        schemaA.Identical = false;
                        schemaB.Identical = false;
                        if((schemaA.rootElement!=null)&&(schemaB.rootElement!=null)){
                            //console.log(schemaA.macro);
                            entityDiff(schemaA.rootElement, returnArray(schemaA.rootElement), returnArray(schemaB.rootElement),changeTypesArray);
                        }
                    }
                }
            }
        }
    }
    macroA.changeTypes = changeTypesArray;
    //console.log(macroA);
    //console.log(diffReport);
    return diffReport;
    
}

function deepCompare () {
  var i, l, leftChain, rightChain;
    
  function compare2Objects (x, y) {
    var p;
    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
         return true;
    }

    // Compare primitives and functions.     
    // Check if both arguments link to the same object.
    // Especially useful on the step where we compare prototypes
    if (x === y) {
        return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
       (x instanceof Date && y instanceof Date) ||
       (x instanceof RegExp && y instanceof RegExp) ||
       (x instanceof String && y instanceof String) ||
       (x instanceof Number && y instanceof Number)) {
        return x.toString() === y.toString();
    }

    // At last checking prototypes as good as we can
    if (!(x instanceof Object && y instanceof Object)) {
        return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
        return false;
    }

    if (x.constructor !== y.constructor) {
        return false;
    }

    if (x.prototype !== y.prototype) {
        return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
         return false;
    }

    // Quick checking of one object being a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }
    }

    for (p in x) {
        if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
            return false;
        }
        else if (typeof y[p] !== typeof x[p]) {
            return false;
        }

        switch (typeof (x[p])) {
            case 'object':
            case 'function':

                leftChain.push(x);
                rightChain.push(y);

                if (!compare2Objects (x[p], y[p])) {
                    return false;
                }

                leftChain.pop();
                rightChain.pop();
                break;

            default:
                if (x[p] !== y[p]) {
                    return false;
                }
                break;
        }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {

      leftChain = []; //Todo: this can be cached
      rightChain = [];

      if (!compare2Objects(arguments[0], arguments[i])) {
          return false;
      }
  }

  return true;
}

//#########################################################################
function traverseCompare(firstObject, secondobject, parentObject, oldParentObject, changesArray) {
    //do a compare first and exit if the same...
    //console.log(firstObject);
    //console.log(secondobject);
    if(firstObject!=null){
        firstObject.different = false;
        if(secondobject!=null){
            secondobject.different = false;
        }
        if(deepCompare(firstObject, secondobject)==true){
            //console.log('These objects are the same so exit here with a true');
            firstObject.different = false;
            if(secondobject!=null){
                secondobject.different = false;
            }
            return false;
        }else{
            firstObject.different = true;
            if(secondobject!=null){
                secondobject.different = true;
            }
        }
        
        if (isArray(firstObject)) {
            if (isArray(secondobject)) {
                traverseArrayCompare(firstObject, secondobject, parentObject, oldParentObject, changesArray);
            }else{
                firstObject.different = true;
                if(secondobject!=null){
                    secondobject.different = true;
                }
            }
        } else if ((typeof firstObject === 'object') && (firstObject !== null)) {
            traverseObjectCompare(firstObject, secondobject,parentObject, oldParentObject, changesArray);
        } else {
            //this is the only thing that is a different?
            //the current thing isnt an object nor is it an array
            parentObject.realDiff = true;
            if(oldParentObject!=null){
                oldParentObject.realDiff = true;    
            }
            
            var change = {};
            change.type = 'notEnumeration';
            
            change.firstValue = firstObject;
            change.secondValue = secondobject;
            change.firstObject = parentObject;
            change.secondObject = oldParentObject;
            changesArray.push(change);
        }
    }
}
function traverseArrayCompare(firstArray, secondArray, parentObject, oldParentObject, changesArray) {
    //console.log("<array>");
    //current object is an array so I dont need to do much other than process each element
    //update this to a for loop?
    //both are Arrays...do they have the same count?
    if(firstArray.length>secondArray.length){
        //console.log('New items add to this array');
        //so now I need to get items per key?
    }else if(firstArray.length<secondArray.length){
        //console.log('Items deleted from this array');
    }else{
        //console.log('Item count is the same but there is still something different');
    }
    //is this the owner of a enumeration?
    for (var i = 0; i < firstArray.length; i++) {
        //on arrays I want to keep the parentObject as the array is meaningless
        traverseCompare(firstArray[i], secondArray[i], parentObject, oldParentObject, changesArray);
    }

    //regardless always loop?
    
    
    
    
}
function traverseObjectCompare(firstObject, secondObject, parentObject, oldParentObject, changesArray) {
    if((firstObject.restriction!=null)&&(firstObject.restriction.enumeration!=null)){
        compareEnumerationArray(firstObject, secondObject, parentObject, changesArray);
    }
    for (var key in firstObject) {
        if(key!='enumeration'){
            if(secondObject==null){
                //this means that the first object is new?
                traverseCompare(firstObject[key], null, firstObject, secondObject, changesArray);
            }else{
                traverseCompare(firstObject[key], secondObject[key], firstObject, secondObject, changesArray);    
            }    
            //console.log(firstObject[key]);
            //console.log(secondObject[key]);
        }
    }
}

function compareEnumerationArray(firstObject, secondObject, parentObject, changesArray){
    
    if((secondObject==null)||(secondObject.restriction==null)||(secondObject.restriction.enumeration==null)){
        changesArray.push('New Enumeration!');
    }else{
        if(deepCompare(firstObject.restriction.enumeration, secondObject.restriction.enumeration)!=true){
            //
            var change = {};
            change.type = 'enumeration';
            change.currentEnumeration = firstObject.restriction.enumeration;
            change.previousEnumeration = secondObject.restriction.enumeration;
            //now I can get a different list?
            var currentValuesArray = [];
            var previousValuesArray = [];
            for(var i = 0;i<change.currentEnumeration.length;++i){
                currentValuesArray.push(change.currentEnumeration[i].value);
            }
            for(var i = 0;i<change.previousEnumeration.length;++i){
                previousValuesArray.push(change.previousEnumeration[i].value);
            }
            var originalArray = [];
            var loopArray = [];
            
            //now I should have two lists of values. WHo has less?
            if(previousValuesArray.length>currentValuesArray.length){
                //this means that the previous has more and therefore a deletion has occured
                change.operation = 'delete';
                originalArray = previousValuesArray;
                loopArray = currentValuesArray;
            }else if(previousValuesArray.length==currentValuesArray.length){
                change.operation = 'modified';
                originalArray = currentValuesArray;
                loopArray = previousValuesArray;
            }else{
                change.operation = 'add';
                originalArray = currentValuesArray;
                loopArray = previousValuesArray;
            }
            //console.log(change);
            //console.log(loopArray);
            //console.log(originalArray);
            var resultArray = [];
            var k =0;
            for(var i = 0;i<loopArray.length;++i){
                //does this value equal its conterpart?
                //console.log(originalArray[k] + '==' + loopArray[i]);
                if(originalArray[k]!=loopArray[i]){
                    //console.log('adding item');
                    resultArray.push(originalArray[k]);
                    k++;
                }
                k++;
            }
            change.enumerationChanges = resultArray;
            //now make sure that I have no instances of  this anywhere else in the array?
            for(var i = 0;i<change.enumerationChanges.length;++i){
                if(loopArray.indexOf(change.enumerationChanges[i])!=-1){
                    change.operation = 'modified';
                }
            }
            if(change.operation=='add'){
                //console.log(change);
                
                //find the element in the original values array and mark it as an add?
                for(var i = 0;i<change.currentEnumeration.length;++i){
                    //console.log(change.currentEnumeration[i].value);
                    
                    
                    for(var k = 0;k<change.enumerationChanges.length;++k){
                        //console.log(change);
                        //console.log(change.enumerationChanges[k]+ '==' + change.currentEnumeration[i].value);
                        
                        
                        if(resultArray[k]==change.currentEnumeration[i].value){
                            change.currentEnumeration[i].addFlag = true;
                            change.currentEnumeration[i].realDiff = true;
                            change.currentEnumeration[i].different = true;
                            //a=stopherefornow;
                        }
                    }
                }
            }
            //console.log(resultArray);
             
            change.owner = parentObject;
            changesArray.push(change);

        }
    }
    //all enumerations are just values so string them togther and compare?
    //console.log(parentObject);
    
}



