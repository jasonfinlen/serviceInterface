var globalExistingVariableList = [];
function buildTransormationSearchPage(){
    
    showLoadingBlock();
    console.time('buildTransormationSearchPage');
    //temp to get issue
    var release = getSelectedRelease();
    var jsonLinkRel = getSelectedRelease().releaseLocation + 'transformsList.json?' + 'buildNumberCache=' + release.cacheBuster;
    //console.log('jsonLinkRel:' + jsonLinkRel);
	   $.ajax({
		  'url': jsonLinkRel,
		  'type': 'GET',
		  'dataType': 'json',
		  'success': function (data) {
		     loadAllTransformationJSONData(data);
			 console.timeEnd('buildTransormationSearchPage');
			 hideLoadingBlock(-1);
		},
		'error': function(XMLHttpRequest, textStatus, errorThrown) { 
            hideLoadingBlock(-1);
            loadAllTransformationJSONData(XMLHttpRequest);
            //textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            //errorDialog("Error in fetching all schemas fields json Data", "<h3>Status: " + textStatus + "</h3><br>" + "Error: " + errorThrown + '<br>' + jsonLinkRel);
            //$("#searchAllSchemaFields").html("Error in fetching all schemas fields json Data. Status: " + textStatus + " Error: " + errorThrown + ' Link:' + jsonLinkRel);
            //$("#filterText").prop( "disabled", true );
            console.timeEnd('buildTransormationSearchPage');
            hideLoadingBlock(1);
        }  	
	});
}

function loadAllTransformationJSONData(transformationListObject){
    console.time('loadAllTransformationJSONData');
    //console.log(transformationListObject);
    //if I get a valid list back I can parse it
    if((transformationListObject!=null)&&(transformationListObject.transformsLists!=null)&&(transformationListObject.transformsLists.transformsList!=null)){
        var transformList = returnArray(transformationListObject.transformsLists.transformsList);
        //console.log(transformList);
        //each one of this objects is a transformation that needs to be loaded and there could be hundreds to defer....
        var allRequests = [];
        var release = getSelectedRelease();
        var url = getSelectedRelease().releaseLocation;
        $.each(transformList,function (index,transformFile){
            //adding a feature to only load dp resources
            
            if((transformFile.location!=null)&&(transformFile.location.indexOf('dp/local/ondisk/ESB_Services/')!=-1)&&(transformFile.location.indexOf('RetrieveMovementAlertCheck')!=-1)){
                //add it to the service call list
                var jsonFile = transformFile.location.replace('.xsl', '.json');
                allRequests.push($.getJSON(url + jsonFile + '?' + 'buildNumberCache=' + release.cacheBuster));
            }
        });
        var requests = $.unique(allRequests);
    	var defer = $.when.apply($, requests);
	    defer
	       .done(function(){
	       console.timeEnd('loadAllTransformationJSONData');
    	   buildTransformationFieldSearchFunction(arguments);
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            console.timeEnd('loadAllTransformationJSONData');
            buildTransformationFieldSearchFunction(jqXHR);
        }
    );

        
    }else{
        //not a valid list
        console.log('Error Not a valid list object');
    }
    console.timeEnd('loadAllTransformationJSONData');
}

function buildTransformationFieldSearchFunction(allTransforms){
    //console.log(allTransforms);
    var validTransformsList = [];
    if(allTransforms!=null){
        $.each(allTransforms,function (index,transformsObject){
            var transformFile = transformsObject[0];
            //console.log(transformFile);
            if((transformFile!=null)&&(transformFile.xsl_stylesheet!=null)){
                validTransformsList.push(transformFile.xsl_stylesheet);
            }
        });
    }
    console.log('Found ' + validTransformsList.length + ' valid transformation objects.');
    $.each(validTransformsList, function (index, validTransform){
        //console.log(validTransform);
        //now Im not sure how to display this object and what it all means?
        //maybe try a tree data object?
        
        
    });
    
    var newTreeDataArray = [];
    
    console.time('generateTransformTreeData');
    //var resultTreeData = transformTreeDataLoop(validTransformsList[0].xsl_template, newTreeDataArray);
    //iterateXSLTransformation(validTransformsList[1]);
    processXSLTransformation(validTransformsList[1],'xsl_stylesheet');
    //console.log('resultTreeData');
    //console.log(resultTreeData);
    console.timeEnd('generateTransformTreeData');
    
    
}

function processXSLTransformation(data, rootName){
    //workout what this top level object is
    //console.log(data);
    //Now I need to loop but at each loop I need to work out what the current object has or is?
    var xsltVersion = data.version;
    var xsltTemplateArray = returnArray(data.xsl_template);
    //iterateXSLTransformation(data, rootName);
    processXSLTransformation(data, rootName);
    //console.log(xsltVersion);
    //console.log(xsltTemplateArray);
    //so at the top level I have some templates that could be either matches or names?
    $.each(xsltTemplateArray, function (index, xsltTemplate){
        //console.log(xsltTemplate);
        //can I just write these out for now?
        //interpretXSLFunction(xsltTemplate);
        
    });
}

    

function appendData(text){
    $('#container').append(text + '<br>');
}

function processXSLTransformation(data, objectName){
    //This one is a special version that interprets the functions
    //I wonder if keys works better
    processVariables(data['xsl_variable']);
    console.log(getFirstFunctionObject('normalize-space($REQ_MQMD//MsgId)'));
    removeNormalizeSpace('');
    var testResults = [];
    
    
    testResults.push(removeNormalizeSpace('normalize-space($REQ_MQMD//MsgId)'));
    testResults.push(removeNormalizeSpace('normalize-space(dp:variable($REQ_WSA_MSG_ID_VAR_NAME))'));
    testResults.push(removeNormalizeSpace("normalize-space(*[generate-id(.) = generate-id(key('names', concat(generate-id(..),'/',name()))[1])])"));
    testResults.push(removeNormalizeSpace("*[generate-id(.) = generate-id(key(normalize-space('names'), concat(generate-id(..),'/',name()))[1])]"));
    testResults.push(removeNormalizeSpace("normalize-space(*[generate-id(.) = generate-id(key(normalize-space('names'), concat(generate-id(..),'/',name()))[1])])"));
    console.log(testResults);
   
    a=b;
    
    processStyleSheet(data);
    processAnnotation(data['xs_annotation']);
    processOutput(data['xsl_output']);
    processIncludes(data['xsl_include']);
    processImports(data['xsl_imports']);
    processVariables(data['xsl_variable']);
}
function resolveVariables(variableList, existingVariables, statement){
    var resolvedVariables = {};
    resolvedVariables.variableList = variableList;
    resolvedVariables.existingVariables = existingVariables;
    resolvedVariables.originalStatement = statement;
    resolvedVariables.resolvedStatement = statement;
    resolvedVariablesList = [];
    $.each(variableList, function(k, newVariable){
        $.each(existingVariables, function(index,existingVariable){
            existingVariableSplit = existingVariable.split('=',2);
            existingVariableName = existingVariableSplit[0];
            existingVariableValue = existingVariableSplit[1];
            if(newVariable==existingVariableName){
                resolvedVariablesList.push(existingVariableValue);
                resolvedVariables.resolvedStatement = resolvedVariables.resolvedStatement.replace(newVariable,existingVariableValue);
            }
        }); 
    });
    resolvedVariables.resolvedVariablesList = resolvedVariablesList;
    return resolvedVariables;
} 

function processVariables(xslVariablesObject){
    if(xslVariablesObject!=null){
        //I should get this as an array as it could be an array?
        var variablesList = returnArray(xslVariablesObject);
        var existingVariables = [];
        //first pass I need to simply load all variables but a second pass should replace variables within variables
        $.each(variablesList, function(index, variableObject){
            var value = interpretElement(variableObject, 'xsl_variable', existingVariables);
            existingVariables.push('$' + variableObject.name + '=' + value);
            appendData(variableObject.name + '=' + value);
        });
        globalExistingVariableList = existingVariables; 
    }
}

function getFirstFunctionObject(statement){
    if((statement==null)||(statement=='')){
        return null;
    }
    var functionObject = {};
    var parms = [];
    functionObject.type = 'function';
    functionObject.fullStatement = statement;
    //console.log(functionObject);
    //this is the full statement
    console.log('statement:'+ statement);
    //find the function by finding the first bracket and working back to the start
    var firstBracketPos = statement.indexOf('(');
    var functionName = statement.substring(0, firstBracketPos);
    
    functionObject.name = functionName;
    console.log(functionObject);
    if(getFirstNonFunctionAlpha(functionObject.name)!=functionObject.name.length){
        return null;
    }
    console.log('this is a perfect function name');        
    
    var lookfor = functionObject.name + '(';
    //now get the between part
    var normpos = statement.indexOf(lookfor);
    var endofnormpos = normpos + lookfor.length;
    if(normpos!=-1){
        //I found something
        //I need a count of how many brackets I had to this point
        var bracketCount = 0;
        var closeBracketCount = 0;
        for (var i = firstBracketPos; i<statement.length;i++) {
            console.log(i);
            console.log(statement[i]);
            if(statement[i]=='('){
                bracketCount = bracketCount+1;
                console.log('found open b so:' +bracketCount);
            }else if(statement[i]==')'){
                closeBracketCount = closeBracketCount+1;
                console.log('found close b so:' +closeBracketCount);
            }
            if(bracketCount==closeBracketCount){
                console.log('bracketCount:' + bracketCount);
                console.log('closeBracketCount:' + closeBracketCount);
                var endPos = i;
                break;
            }
        }
        console.log('endPos:' + endPos);
        var parmsString = statement.substring(endofnormpos, endPos);
        console.log('parmsString:' + parmsString);
        //now split the parms in an array
        var parmList = parmsString.split(',');
        console.log(parmList);
        functionObject.parmsString = parmsString;
        functionObject.parmList = parmList;
        //the parms string may also contain variables so lets list them as well
        var variableList = getVariables(parmsString);
        functionObject.variableList = variableList;
        var resolvedVarsObject = resolveVariables(functionObject.variableList, globalExistingVariableList, functionObject.parmsString);
        console.log('resolvedVarsObject');
        console.log(resolvedVarsObject);
    }
    functionObject.parmsStringResolved = resolvedVarsObject.resolvedStatement;
    functionObject.variableListResolved = resolvedVarsObject.resolvedVariablesList;
    console.log(functionObject);
    return functionObject;

}

function removeNormalizeSpace(statement){
    //this is the full statement
    console.log(statement);
    //getFirstFunctionObject(statement);
    //getFirstFunctionObject("normalize-space(partycore:PartyIdentifier/partycore:IdentifierType) = 'PID'");
    //lets split based on this
    getFirstFunctionObject("normalize-space(partycore:PartyIdentifier/partycore:IdentifierType) = normalize-space('PID')");
    
    //now that I have it...
    a=c;
    //find the norm
    var lookfor = 'normalize-space(';
    var normpos = statement.indexOf(lookfor);
    var endofnormpos = normpos + lookfor.length;
    if(normpos!=-1){
        //I found something
        //I need a count of how many brackets I had to this point
        var bracketCount = 0;
        for (var i = 0; i<normpos;i++) {
            //console.log(i);
            //console.log(statement[i]);
            if(statement[i]=='('){
                bracketCount = bracketCount+1; 
            }
        }
        console.log('bracketCount:' + bracketCount);
        //now starting from the last pos I need to get the nth bracket count
        var foundCount = 0; 
        for (var k = statement.length-1; k>0;k--) {
            //console.log('statement[k]:' + statement[k]);
            if(statement[k]==')'){
                foundCount = foundCount+1; 
            }
            if(foundCount>bracketCount){
                //end here
                matchbracketPos = k;
                break;
            }
        }
        console.log('matchbracketPos:' + matchbracketPos);
        var result = statement.substring(endofnormpos, matchbracketPos);
        console.log(result);
    }
    return result;
}

function interpretElement(elementObject, parentContext, existingVariables){
    console.log(elementObject);
    if(elementObject.xsl_copy_of!=null){
        //copy ofs always have selects
        return interpretSelect(elementObject.xsl_copy_of, existingVariables); 
    }else if(elementObject.xsl_value_of!=null){
        //value ofs always have selects
        return interpretSelect(elementObject.xsl_value_of, existingVariables);
    }
}

function interpretSelect(parentObject, existingVariables){
    var result = null;
    if(parentObject.select!=null){
        //do something with the select?
        var select = parentObject.select;
        if(select.indexOf('dp_variable')!=1){
            select = select.replace('var_//context/ESB_Services', '').replace("dp_variable('/", '').replace("')", "").replace("normalize_space(", "");    
        }
        if(select.indexOf('$')!=-1){
            //if have to perform variable subs
            var newVariables = getVariables(select);
            //now I have to loop to find an existing var
            $.each(newVariables, function(k, newVariable){
                $.each(existingVariables, function(index,existingVariable){
                    existingVariableSplit = existingVariable.split('=',2);
                    existingVariableName = existingVariableSplit[0];
                    existingVariableValue = existingVariableSplit[1];
                    if(newVariable==existingVariableName){
                        select = select.replace(newVariable,existingVariableValue);
                    }
                }); 
            });
        }
        result = select;
    }
    return result;
}

function getVariables(statement){
    //get each of the variables somehow
    //default is an empty array of var names
    var varNames = [];
    
    //find the first $ then get the last char? and make that the variable names
    //split by $ signs...
    if((statement!=null)&&(statement.indexOf('$')!=-1)){
        var statementArray = statement.split('$');
        console.log('statementArray');
        console.log(statementArray);
        $.each(statementArray, function(index, dirtyVariable){
            //now clean this variable
            //throw away the first split as we want nothing before the $
            if(index>0){
                console.log('dirtyVariable:' + dirtyVariable);
                var lastpos = getFirstNonVariableAlpha(dirtyVariable);
                console.log('lastpos:' + lastpos);
                if(lastpos>0){
                    var variableFoundString = '$' + dirtyVariable.substring(0,lastpos)
                    console.log('variableFoundString:' + variableFoundString);
                    varNames.push(variableFoundString);
                }
            }
        });
    }
    return varNames;
}

function getFirstInString(str, checkChars){
    var variableChars = checkChars;
    for (var k = 0; k<str.length;k++) {
        var matchFound = false;
        //console.log('str[k]:' + str[k]);
        for (var i = 0; i<variableChars.length;i++) {
            //console.log('variableChars[i]:' + variableChars[i]);
            if(str[k]==variableChars[i]){
                //this means that the character matchs on of mine so exit this for and the next
                //console.log('match found');
                matchFound = true;
                break;
            }    
        }
        if(matchFound){
            //continue on...
        }else{
            return k;
        }
    }
    return str.length;
}

function getFirstNonVariableAlpha(str){
    return getFirstInString(str, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_)');
}
function getFirstNonFunctionAlpha(str){
    return getFirstInString(str, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-)');
}


function processIncludes(xslIncludeObject){
    if(xslIncludeObject!=null){
        var includeList = returnArray(xslIncludeObject);
        //I should get this as an array as it could be an array?
        appendData('Including the following XSL transformations:');
        $.each(includeList, function(index, includeObject){
            appendData(includeObject.href.replace('local_///ondisk/',''));
        });
    }
}
function processImports(xslImportObject){
    if(xslImportObject!=null){
        var importList = returnArray(xslImportObject);
        //I should get this as an array as it could be an array?
        appendData('Importing the following XSL transformations:');
        $.each(importList, function(index, importObject){
            appendData(importObject.href.replace('local_///ondisk/',''));
        });
    }
}

function processStyleSheet(styleSheetObject){
    //this is just to porcess the high level stylesheet object
    console.log(styleSheetObject);
    if(styleSheetObject!=null){
        if((styleSheetObject.extension_element_prefixes!=null)&&(styleSheetObject.extension_element_prefixes!='')){
            appendData('Extension namespace (override if xmlns) is ' + cleanXSLStatement(styleSheetObject.extension_element_prefixes));    
        }
        if((styleSheetObject.exclude_result_prefixes!=null)&&(styleSheetObject.exclude_result_prefixes!='')){
            appendData('Namespaces that will not be inlcuded in output are ' + cleanXSLStatement(styleSheetObject.exclude_result_prefixes));    
        }
        if((styleSheetObject.version!=null)&&(styleSheetObject.version!='')){
            appendData('StyleSheet at version ' + cleanXSLStatement(styleSheetObject.version));    
        }
    }
}

function processAnnotation(annotationObject){
    console.log(annotationObject);
    if((annotationObject!=null)&&(annotationObject.xs_appinfo!=null)){
        //now That I have this object I can start processing through it.    
        var xsAppInfo = annotationObject.xs_appinfo;
        appendData(tabClass('Documentation ' + cleanXSLStatement(annotationObject.version)));
        appendData(tabClass('Title : ' + cleanXSLStatement(xsAppInfo.dc_title.$)));
        appendData(tabClass('Subject : ' + cleanXSLStatement(xsAppInfo.dc_subject.$)));
        appendData(tabClass('Publisher : ' + cleanXSLStatement(xsAppInfo.dc_publisher.$)));
        appendData(tabClass('Created by : ' + cleanXSLStatement(xsAppInfo.dc_creator.$)));
        appendData(tabClass('Contributions by : ' + cleanXSLStatement(xsAppInfo.dc_contributor.$)));
        appendData(tabClass('Created Date : ' + cleanXSLStatement(xsAppInfo.dc_date.$)));
    }
}
function processOutput(xsOutputObject){
    console.log(xsOutputObject);
    if(xsOutputObject!=null){
        appendData('This message will be output with the following:');
        appendData(tabClass('Encoded with : ' + cleanXSLStatement(xsOutputObject.encoding)));
        appendData(tabClass('Output as : ' + cleanXSLStatement(xsOutputObject.method)));
        appendData(tabClass('Version as : ' + cleanXSLStatement(xsOutputObject.version)));
        appendData(tabClass('Indented : ' + cleanXSLStatement(xsOutputObject.indent)));
    }
}

function iterateXSLTransformation(data, objectName){
    //so before looking at the keys process this actual object?
    interpretXSLFunction(data, objectName);
    $.each(data, function (index, value){
        if (value.hasOwnProperty(value)){
            console.log('has own propery!');
        }
        if (typeof value == null) {
            console.log('isNull');
        }
        else if (isArray(value)) {
            //console.log('Its an array');
            $.each(value, function(k, object){
                iterateXSLTransformation(object, index);
            });
        }
        else if (typeof value == 'object') {
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    //do nothing for now?
                }
              }
              iterateXSLTransformation(value, index);
        }
        
        else {
             console.log('Its NOT an object and not an array');
             console.log(value);
        }
    });
}

function interpretXSLFunction(xslObject, objectName){
    console.log('interpretXSLFunction:' + objectName);
    var first3Chars = objectName.substring(0, 3);
    console.log('first3Chars');
    console.log(first3Chars);
    if((first3Chars!='xsl')&&(first3Chars!='dc_')&&(first3Chars!='xs_')){
        appendData('<strong>&lt;' + cleanXSLStatement(objectName) + '&gt;</strong>');
    }else if(objectName=='xsl_template'){
        console.log('xsl_template matched');
        //console.log(xslObject);
        
        if(xslObject.match!=null){
                if(xslObject.match=='node()|@*'){
                    //ignore as this is really a catch all style node?
                }else{
                    appendData('When the xml data matches ' + cleanXSLStatement(xslObject.match) + ' do...');    
                }
                
        }else if(xslObject.name!=null){
            //appendData('When the xml data matches ' + xsltTemplate.match + ' do...');
        }else{
            appendData('xsl:template' + ' ERROR with named : ' + name);
            console.log('Error:');
            console.log(xslObject);
        }
         
    }else if (objectName=='xsl_value_of'){
        //console.log('#####################');
        //console.log(xslObject);
        appendData(xslObject.select);
    }
    else if((objectName=='xsl_when')||(objectName=='xsl_choose')){
        console.log('#####################');
        console.log(xslObject);
        if(objectName=='xsl_choose'){
            var whenStatements = returnArray(xslObject.xsl_when);
            //for each when....
            $.each(whenStatements, function(index, when){
                appendData('When ' + cleanXSLStatement(when.test) + ' output ' + when.xsl_value_of.select);
            });
            if(xslObject.xsl_otherwise!=null){
                appendData('Otherwise ' + cleanXSLStatement(xslObject.xsl_otherwise.xsl_value_of.select));
            }
        }
    }else if((objectName=='xsl_include')||(objectName=='href')){
        appendData('Go fetch the included style sheet at ' + cleanXSLStatement(xslObject.href));
    }else if(objectName=='xsl_output'){
        appendData('This message will be output with the following:');
        appendData(tabClass('Encoded with : ' + cleanXSLStatement(xslObject.encoding)));
        appendData(tabClass('Output as : ' + cleanXSLStatement(xslObject.method)));
        appendData(tabClass('Version as : ' + cleanXSLStatement(xslObject.version)));
        appendData(tabClass('Indented : ' + cleanXSLStatement(xslObject.indent)));
    }else if(objectName=='xsl_stylesheet'){
        appendData('StyleSheet at version ' + cleanXSLStatement(xslObject.version));
    }else if((objectName=='xsl_strip-space')||(objectName=='elements')){
        if(xslObject.elements = '*'){
            appendData('All elements will have spaces stripped from thier output');
        }else{
            appendData('The following elements will have spaces stripped from their output : ' + xslObject.elements);
        }
    }else if((objectName=='xs_annotation')||(objectName=='xs_appinfo')||(objectName=='version')||(objectName=='dc_title')||(objectName=='dc_subject')||(objectName=='dc_publisher')||(objectName=='dc_creator')||(objectName=='dc_contributor')||(objectName=='dc_date')){
        if(objectName=='xs_annotation'){
            appendData(tabClass('Documentation ' + cleanXSLStatement(xslObject.version)));
            appendData(tabClass('Title : ' + cleanXSLStatement(xslObject.xs_appinfo.dc_title.$)));
            appendData(tabClass('Subject : ' + cleanXSLStatement(xslObject.xs_appinfo.dc_subject.$)));
            appendData(tabClass('Publisher : ' + cleanXSLStatement(xslObject.xs_appinfo.dc_publisher.$)));
            appendData(tabClass('Created by : ' + cleanXSLStatement(xslObject.xs_appinfo.dc_creator.$)));
            appendData(tabClass('Contributions by : ' + cleanXSLStatement(xslObject.xs_appinfo.dc_contributor.$)));
            appendData(tabClass('Created Date : ' + cleanXSLStatement(xslObject.xs_appinfo.dc_date.$)));
        }
    }else{
        console.log('Not handled');
        console.log(objectName);
        console.log(xslObject);
        appendData('Not yet handled ' + cleanXSLStatement(objectName));
        keyHandler(xslObject);
    }
    
}

function tabClass(msg){
    return '<span class="tab">' + msg + '</p>'
}

function keyHandler(object){
    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            var value = object[key];
            if(typeof value != 'object'){
                appendData(key + object[key]);
            }
        }
    }
}

function cleanXSLStatement(inStatement){
    //console.log(inStatement);
    if((inStatement!=null)&&(inStatement!='')){
        var outStatement =  inStatement.replace('_', ':');
        if(outStatement.indexOf('normalize:space')!=-1){
            outStatement = outStatement.replace('normalize:space', '');
            var pos1 = outStatement.indexOf('('); 
            var pos2 = outStatement.lastIndexOf (')');
            if((pos1!=-1)&&(pos2>pos1)){
                firstpart = outStatement.substring(pos1+1, pos2);
                lastPart = outStatement.substring(pos2+1, outStatement.length);
                outStatement = firstpart + lastPart;  
            }
        }    
    }else{
        var outStatement = '';    
    }
    return outStatement;
}


function isArray(o) {
  return Object.prototype.toString.call(o) === '[object Array]';
}

function transformTreeDataLoop(currentEntityArray, parentArray) {
    $.each(currentEntityArray, function(index, currentEntity){
        //console.log(index);
        //console.log(currentEntity);
        //before calling back onto itself I need to create new child array
            var childArray = [];
            //now calling a loop but using child now as the new parent?
            transformTreeDataLoop(currentEntity, childArray);
            
    });
    return parentArray;
}


function generateSchemaTreeData(SchemaObj, UseFullXPath){
    var newTreeDataArray = [];
    //console.log('generateSchemaTreeData start');
    console.time('generateSchemaTreeData');
    var resultTreeData = schemaTreeDataLoop(SchemaObj, newTreeDataArray, UseFullXPath);
    console.timeEnd('generateSchemaTreeData');
    return resultTreeData;
}

