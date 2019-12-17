//increment this if you want to force a chach flush of the buildinfo
var globalStorageKey = 1;
var isIEFlag = false;
var tabCount = 9;
var adminActive = false;
var adminBuilt = false;
var buildMacroPageFlag = false;
var buildReferenceDataPageFlag = true;
var buildServiceArchitecturePageFlag = false;
var buildServiceChangesPageFlag = false;
var buildTransformationsPageFlag = false;
var buildDependencyWheelPageFlag = false;
var buildServiceDesignPrinciplesFlag = false;
var buildSchemaFieldSearchPageFlag = false;
var buildProvidersAndConsumersPageFlag = false;
var allEnterpiseServices = null;
var allEnterpiseCRTTables = null;
var allFields = null;
var globalBuildInfo = {};
var globalSelectedRelease;
var globalReleasesArray;



function loadRelease() {
    //the first thing is to load the releases list json data and then get all the releases into one object...
    if((routerURL==null)||(routerURL.indexOf('http'))){
        console.error("routerURL isnt valid. Check the .env file is valid javascript and located on level above the index.html file");
    }
    console.time('timebeforeloadPage');
    console.log('routerURL:' + routerURL);
    showLoadingBlock();
    setIEFlag();
    //hide the container div?
    //id="container" element.style.visibility = 'hidden';
    
    showMainPage(false);
    
    //var jsonLinkRel = 'data/releases.json?' + cacheBuster;

    //I should get this from the node server now
    var jsonLinkRel = routerURL + '/getSummary' + '?'+ getCacheBuster();
    console.time('getServiceRepo');
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            var orderedReleaseArray = data.serviceRepository;
            console.timeEnd('getServiceRepo');
            //now verify this data is what I expect or throw the releaseList error
            if ((orderedReleaseArray != null)&&($.isArray(orderedReleaseArray))) {
                //now make sure each release has a name and location
                var allRequests =[];
                var releaseLength = orderedReleaseArray.length;
                   
                globalReleasesArray = orderedReleaseArray;
                //set the combo box
                globalSelectedRelease = setRelease(orderedReleaseArray);
                if(globalSelectedRelease==null){
                    hideLoadingBlock();
                    releaseListError('Release Data Corrupt', 'Incorrect format found in json data structure-no release object set to array', globalReleasesArray);
                    return false;
                }
                
                //console.log(orderedReleaseArray);
                $("#releaseSelector").change(function (data) {
                    //console.log('this is changed');
                    var sel = $('#releaseSelector :selected');
                    var path = sel.val();
                    var label = sel.text();
                    //console.log(data);
                    //console.log('path:' + path);
                    //console.log('label:' + label);
                    releaseChangeCombo(path, label);
                });
                //now find the single release thats selected and load that page?
                loadPage(globalSelectedRelease);
                //now I have an ordered release array with the previousrelease built in but I need to get all the buildinfo.json files as they are a must for documentation?
                hideLoadingBlock();
                //I expect 5 branches ie soaBranchName, esbBranchName,crtBranchName,wsgwBranchName,domainBranchName
                
            } else {
                hideLoadingBlock();
                releaseListError('Release Data Insnt loaded yet', 'data structure returned', orderedReleaseArray.description);
            }
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            console.timeEnd('getServiceRepo');
            hideLoadingBlock();
            releaseListError(textStatus, errorThrown, jsonLinkRel);
        }
    });
}

function setJsonQueryDepth(depth){
    return '?depth=' + depth;
}

function getStorageKey(buildInfo){
     var key = buildInfo.releaseCount = globalStorageKey;
     $.each(buildInfo.releases, function(releaseIndex, releaseObj){
         key = key + releaseObj.cacheBuster;
     });
     return key;
}


function setNextRelease(buildInfo){
    //I can trust this object and the release dates
    var executionDateTime = Date.parse(new Date());
    var prevTime = Date.parse(buildInfo.releases[0].releaseDateTime);
    var prevTimeDiff = prevTime - executionDateTime;
    var nextReleaseIndex = 0;
    buildInfo.releases[0].nextRelease=true;
    buildInfo.releases[0].selectedReleaseFlag=true;
    //so check the url first
    //lets check for the URL 
    
    
    
    
    
    $.each(buildInfo.releases, function(releaseIndex, releaseObj){
        buildInfo.releases[releaseIndex].nextRelease=false;
        buildInfo.releases[releaseIndex].selectedReleaseFlag=false;
        
        var releaseDateTime = Date.parse(releaseObj.releaseDateTime);
        var timeDiff = releaseDateTime - executionDateTime;
        if((timeDiff>0)&&(timeDiff<prevTimeDiff)){
            prevTimeDiff = timeDiff;
            nextReleaseIndex = releaseIndex;
            buildInfo.releases[releaseIndex].nextRelease=true;
            buildInfo.releases[releaseIndex].selectedReleaseFlag=true;    
        }
    });
    postsetFlag = false;
    
    $.each(buildInfo.releases, function(releaseIndex, releaseObj){
        if((postsetFlag!=true)&&(releaseObj.selectedReleaseFlag==true)){
            postsetFlag=true;
        }    
    });
    if(postsetFlag==false){
        buildInfo.releases[0].nextRelease=true;
        buildInfo.releases[0].selectedReleaseFlag=true;
    }
    //console.log('postsetFlag=' + postsetFlag);
    return buildInfo;
}

function setLocations(buildInfo){
    $.each(buildInfo.releases, function(releaseIndex, releaseObj){
        var relLocation = '../serviceRepositorySite/';
        releaseObj.releaseLocation= relLocation + releaseObj.projectname + '/';
        releaseObj.previousReleaseLocation= relLocation + releaseObj.previousRelease + '/';
        releaseObj.crtLocation='../identityCRT/';
    });
    return buildInfo;
}

function cleanReleaseObject(OutRelease){
    //check it has the mandatory
    if((OutRelease!==null)&&(OutRelease!== undefined)){
        if((OutRelease.cacheBuster!==null)&&(OutRelease.cacheBuster!== undefined)&&(OutRelease.cacheBuster!=='')){
            OutRelease.cacheBuster = findAndReplace(OutRelease.cacheBuster, '.', '');
        }else{
            OutRelease.cacheBuster = getCacheBuster();
        }
        if((OutRelease.projectname==null)&&(OutRelease.projectname== undefined)&&(OutRelease.projectname=='')){
            return null;
        }
        if(validateDateTime(OutRelease.releaseDateTime)==false){
            OutRelease.releaseDateTime = '1931-01-17T00:00:00';
        }
        return OutRelease;
    }else{
        return null;
    }
}

function findAndReplace(string, target, replacement) {
    var i = 0, length = string.length;
    for (i; i < length; i++) {
        string = string.replace(target, replacement);
    }
 return string;
}

function fixReleaseListPaths(inPath) {
    var outPath = '../serviceRepositorySite/' + inPath;
    outPath = outPath.replace('/target/classes/', '/');
    return outPath;
}

function showMainPage(showPageFlag) {
    if (showPageFlag !== true) {
        $('#container').hide();
    } else {
        $('#container').show();
    }
}

function releaseListError(textStatus, errorThrown, releaseLink) {
    textStatus = textStatus.replace('error', 'Error');
    console.log("Status: " + textStatus + " - " + errorThrown);
    if(typeof releaseLink === 'object' && releaseLink !== null){
        releaseLink = JSON.stringify(releaseLink);
    }
    errorDialog("Error in fetching Macro json Data", "<h3>Status: " + textStatus + "</h3><br>" + "Error: " + errorThrown + '<br><br>' + releaseLink);
    $('#releaseSelector').children('option').remove();
    $('#releaseSelector').append($("<option></option>").attr("disabled", true).attr("selected", true).text(textStatus));
}

function setRelease(releasesArray) {
    console.time('setRelease');
    var returnObject = null;
   //console.log(releasesArray);
    $('#releaseSelector').children('option').remove();
    $.each(releasesArray, function(relIndex, relObj){
        var selectedRelease = false;
        if(relIndex==0){
            selectedRelease = true;
        }    
        $('#releaseSelector').append($("<option></option>").attr("value", relObj.name).attr("disabled", false).attr("selected", selectedRelease).text(relObj.name));
    });
    console.timeEnd('setRelease');
    //always return the first release as the default...
    return releasesArray[0];
}

function getSelectedRelease(buildInfoObj) {
    if((buildInfoObj==null)||(buildInfoObj=='undefined')){
        buildInfoObj = globalBuildInfo;
    }
    var foundFlag = false;
    //var setRelease = buildInfoObj.releases[0];
    var setRelease = null;
    
    $.each(buildInfoObj.releases, function(index, releaseObj){
        if(releaseObj.selectedReleaseFlag==true){
             setRelease = releaseObj;
             return false;
        }
    });
    return setRelease;    
}

function loadPage(selectedReleaseObj) {
    console.time('loadPage');
    //setRelease(releasesArray);
    resetHeadersAndTables();
    //create the maintabs
    $("#maintab").tabs({
        heightStyle: "fill"
    });
    //build each accordion and then refresh them at the end?
    setTabsInitialState();
    //disable the admin tab unless the local storage has my value
    //console.log(buildInfoObj);
    //TODO I cant do this yet as I dont have the buildinfo and Im not sure which one is best yet
    //buildInfoWidget(buildInfoObj);
    //console.log('Finished with buildInfoWidget');
    buildMacroPage(selectedReleaseObj);
    //TODO I cant do this yet as I dont have the buildinfo and Im not sure which one is best yet
    //initializeClock('clockdiv', getSelectedRelease(buildInfoObj).releaseDateTime);
    hideLoadingBlock(-1);
    showMainPage(true);
    console.timeEnd('loadPage');
}

function addEgg(){     
    $(document).easteregg({
        //<kbd>↑</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><kbd>←</kbd><kbd>→</kbd><kbd>B</kbd><kbd>A</kbd>
        sequence:[38, 38, 40, 40, 37, 39, 37, 39, 66, 65]
        //sequence : [38, 38, 40, 40]
        , callback: function () {
            if (adminActive) {
                //deactivate it
                //disable the admin tab
                adminActive = false;
                setTabInitialState();
                //localStorage.setItem('display', 12);
                $('#maintab').tabs("option", "disabled",[tabCount]);
            } else {
                alert('Admin Console Released...Well Done!');
                adminActive = true;
                //enable all tabs
                $('#maintab').tabs("enable");
                //localStorage.setItem('display', 42);
                //set admin tab to the active Tab
                $("div#maintab").tabs("option", "active", tabCount);
            }
        }
    });
}


function setTabsInitialState(){
    //var display = localStorage.getItem('display');
    var display = 0;
    if (display == 42) {
        $("div#maintab").tabs("option", "active", tabCount);
        adminActive = true;
    } else {
        $('#maintab').tabs("option", "disabled",[tabCount]);
    }
    $("#maintab").tabs({
        activate: function (event, ui) {
            //did the admin panel get clicked
            if ((ui != null) &&(ui.newPanel != null) &&(ui.newPanel[0] != null) &&(ui.newPanel[0].id != null) &&(ui.newPanel[0].id.trim() != '')) {
                //a new panel was clicked and has an ID
                var panelID = ui.newPanel[0].id;
                //console.log('panelID:' + panelID);
                if (panelID == 'serviceAdmin-1') {
                    //do load the admin page
                    buildAdmin();
                } else if (panelID == 'crt-1') {
                    //do load the crt page
                    buildReferenceDataPage();
                } else if (panelID == 'serviceArchitecture-1') {
                    //do load the serviceArchitecture page
                    buildServiceArchitecturePage();
                } else if (panelID == 'schemaFieldsSearch-1') {
                    //do load the all fields search page
                    buildSchemaFieldSearchPage();
                } else if (panelID == 'serviceTransformations-1') {
                    //do load the all fields search page
                    buildTransformationsPage();
                } else if (panelID == 'serviceDesignPrinciples-1') {
                    //do load the all fields search page
                    buildServiceDesignPrinciplesPage();
                } else if (panelID == 'dependencyWheel-1') {
                    buildDependencyWheelPage();
                } else if (panelID == 'providers-consumers-1') {
                    buildProvidersAndConsumersPage();
                }
                
            }
        }
    });
    addEgg();
    setTabInitialState();
    $('#maintab').on("tabsactivate", function (event, ui) {
        var tabIndex = ui.newTab.parent().children().index(ui.newTab);
        //console.log('tabIndex:' + tabIndex);
        
        if (tabIndex >= 0 && tabIndex <= tabCount -1) {
            //console.log('localStorageSetTo:' + tabIndex);
            //localStorage.setItem('tabIndex', tabIndex);
        }
    });

}


function resetHeadersAndTables() {
    //get content by class and empty it?
    $(".accordionContent").empty();
    $(".accordionContent").html('<h3>Loading</h3>');
    $('.accordionHeader').children('span').remove();
    $('.accordionHeader').append('<span class="h3subtext">' + 'Loading...' + '</span>');
}

function buildSchemaFieldSearchPage() {
    
    
    //need to update this to create the search fields from the other data I have...
    if (buildSchemaFieldSearchPageFlag != true) {
        //get the selectedRelease?
        //buildALLSearchModels(globalSelectedRelease,'searchXPathAccordion');
        buildSearchALLFields(globalSelectedRelease,'searchXPathAccordion');
        
    }
    buildSchemaFieldSearchPageFlag = true;
}
function buildALLSearchModels(releaseObject, parentID){
    //so I know how many headers to setup and the ID on the object that they belong under?
    //build a header for each serviceModel
    var serviceModels = returnArray(releaseObject.serviceModels);
    var headerAccordion = $('#' + parentID);
    headerAccordion.empty();                
    if(serviceModels!=null){
        for(var i = 0;i<serviceModels.length;i++){
            var serviceModel = serviceModels[i];
            //at this level of object I just have the name....
            //I should add a description to the node based object
            var identifier = serviceModel.name + 'SearchServiceModel';
            var htmlHeader = buildInnerAccordion(identifier, serviceModel.name + ' Search Service Models');
            //append the models data header
            headerAccordion.append(htmlHeader);
            //now style each one?
            headerAccordion.accordion("refresh");
            var childNodes = headerAccordion.find('.' + identifier);
            //now go get the first level of data for each of these with the call backs?
            getSchemasSearchJSONData(serviceModel, releaseObject.name, childNodes);
        }
    }
    //schemaList
}

function getSchemasSearchJSONData(releaseObj, releaseName, accordionObject){
    var uniqueTimerName = 'SearchRequest-' + releaseName + '-' + releaseObj.name;
    console.time(uniqueTimerName);
    
    var jsonLinkRel = releaseObj.searchCallBackURL + '&'+ getCacheBuster();
    //var jsonLinkRel = routerURL + '/getServiceModels' + '?releaseName=' + releaseName + '&serviceModelName='+ releaseObj.name+'&'+ getCacheBuster();
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            console.timeEnd(uniqueTimerName);
            //generically build the models stuff...
            buildSchemaSearchAccordion(data, releaseObj, releaseName, accordionObject);
        },
        'error': function (XMLHttpRequest) {
            console.timeEnd(uniqueTimerName);
            console.log('Error in respone');
            console.log(XMLHttpRequest);
        }
    });
}

function buildSchemaSearchAccordion(allXPathList, releaseObj, releaseName, accordionObjects){    
    console.time('buildSchemaFieldSearchFunction-' + releaseObj.name);
    //might have to extend the button on key press stuff for this releaseName
    if(releaseObj.name!='Enterprise'){
        return false;
    }
    var searchHTML = buildSchemaFieldSearchHTML();
    var headerObject = accordionObjects[0];
    var contentObject = accordionObjects[1];
    appendAccordionHeader(headerObject.id, numberWithCommas(allXPathList.length) + ' objects parsed');
    //need to populate the search header?
    contentObject.innerHTML= searchHTML;
    
    //So regardless of success or not I always add the html to make it look clean and neat
    if ((allXPathList != null) &&(allXPathList.length > 0)) {
        //add the key up function to filter the data from the search
        $("#filterText").keyup(function () {
            filterData();
        });
        allData = allXPathList;
        cData = allXPathList;
        //console.log(allServicesObject);
        //$("#filterCount").text("Parsed " + numberWithCommas(allXPathList.length) + ' fields across ' + numberWithCommas(allServicesObject.length) + ' services');
        $("#filterCount").text("Parsed " + numberWithCommas(allXPathList.length));
    } else {
        //this could be a http reponse object
        buildSchemaFieldSearchError('Unknown Error');
    }
    console.time('buildSchemaFieldSearchFunction-' + releaseName);
    
}



function getTransformationSearchData(){
    console.time('getTransformationSearchData');
    var url = getSelectedRelease().releaseLocation + 'allTransformsContent.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            //console.log(data);
            //now that I have some data I need to make a search filter thing for it?
            buildsearchAllTransformationDataAccordion(data);
            console.timeEnd('getTransformationSearchData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            buildsearchAllTransformationDataAccordion(XMLHttpRequest);
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getTransformationSearchData');
            hideLoadingBlock(-1);
        }
    });
}

function buildSchemaFieldSearchError(ErrorMsg) {
    $("#searchAllSchemaFields").append('ErrorMsg:' + ErrorMsg);
    $("#filterText").prop("disabled", true);
}

function SOAEntityFlatten(SOAEntityArray, ParentServiceObject, fieldArray) {
    serviceName = ParentServiceObject.ServiceName;
    serviceNumber = ParentServiceObject.ServiceNumber;
    serviceVersion = ParentServiceObject.ServiceVersion;
    key = ParentServiceObject.key;
    var SOAEntityArrayCount = SOAEntityArray.length;
    for (var t = 0; t < SOAEntityArrayCount; t++) {
        var EntityObj = SOAEntityArray[t];
        var field = {};
        field.fieldName = EntityObj.Structure;
        field.fieldXpath = EntityObj.SOALink;
        field.fieldType = EntityObj.Type;
        field.fieldEntityType = EntityObj.SOAEntityType;
        field.fieldRange = EntityObj.Range;
        field.fieldCardinality = EntityObj.Cardinality;
        field.fieldminLength = EntityObj.minLength;
        field.fieldmaxLength = EntityObj.maxLength;
        field.fieldPattern = EntityObj.pattern;
        field.fieldEnumeration = EntityObj.enumeration;
        field.fieldRefLink = EntityObj.RefLink;
        field.serviceName = serviceName;
        field.serviceNumber = serviceNumber;
        field.serviceVersion = serviceVersion;
        field.key = key;
        field.fieldkey = key + EntityObj.SOALink;
        fieldArray.push(field);
        //console.log(EntityObj);
        if((EntityObj.SOAEntity!=null)&&(EntityObj.SOAEntity.length!=0)){
            SOAEntityFlatten(EntityObj.SOAEntity, ParentServiceObject, fieldArray);    
        }
    }
}

function flattenFieldList(allServicesObj) {
    console.time('flattenFieldList');
    var fieldArray =[];
    var serviceCount = 0;
    //I need to loop through all Services
    var allServicesObjCount = allServicesObj.length;
    for (var i = 0; i < allServicesObjCount; i++) {
        var serviceObject = allServicesObj[i];
        if (serviceObject != null){
            //there are no cores here anyway?
            serviceCount++;
            //I may have something to process
            var schemaList = serviceObject.schemaList;
            for (var j = 0; j < schemaList.length; j++){
                var macro = schemaList[j].macro;
                var returnFields = SOAEntityFlatten(macro.SOAEntity, serviceObject, fieldArray);
            }
        }
    }
    console.timeEnd('flattenFieldList');
    var fielddlList = {};
    fielddlList.serviceCount = serviceCount;
    fielddlList.fieldCount = fieldArray.length;
    fielddlList.fields = fieldArray;
    allFields = fielddlList;
    return fielddlList;
}

function getxPathNameForContext(fullXPath){
    var xPathArray = fullXPath.replace('//', '').split('/');
    if(xPathArray.length==1){
        return fullXPath;
    }else if(xPathArray.length==2){
        return xPathArray[xPathArray.length-2] + '/' + xPathArray[xPathArray.length-1];
    }else{
        return xPathArray[xPathArray.length-3] + '/' + xPathArray[xPathArray.length-2] + '/' + xPathArray[xPathArray.length-1];
    }
}

function getAllServicesXPathList(allServicesObject){
    console.time('getAllServicesXPathList');
    var returnArray = [];
    //for every service
    for (var i = 0;i<allServicesObject.length;i++){
        var SO = allServicesObject[i];
        var xList = SO.xPathList;
        //now concat this to the next?
        for (var k = 0;k<xList.length;k++){
            xPath = xList[k];
            var searchObject = {};
            searchObject.name = xPath.name; 
            searchObject.xPath = xPath.xPath;
            searchObject.refData = xPath.refData;
            searchObject.uniqueName = xPath.uniqueName;
            searchObject.ServiceName = SO.ServiceName;
            searchObject.ServiceNumber = SO.ServiceNumber;
            searchObject.ServiceVersion = SO.ServiceVersion;
            searchObject.ServiceKey = SO.key;
            searchObject.urlLink = SO.urlLink;
            searchObject.context = getxPathNameForContext(xPath.xPath);
            //console.log(searchObject);
            //console.log(SO);
            //a=styuityiugjkb;
            returnArray.push(searchObject);
            
            
        }
    }
    console.timeEnd('getAllServicesXPathList');
    return returnArray;
}


function removeAllFieldsCoreSchemas(macroFieldListObj, reverseFlag) {
    //console.log('removeAllFieldsCoreSchemas');
    console.time('removeAllFieldsCoreSchemas');
    //this could be a an array of fields or a field list object
    
    if ((macroFieldListObj != null) &&(macroFieldListObj.fieldList != null)) {
        var fieldListArray =[];
        $.each(macroFieldListObj.fieldList, function (index, field) {
            //push a new object into a new array?
            //console.log(field);
            var serviceNumber = undefinedToEmpty(field.serviceNumber);
            var serviceName = undefinedToEmpty(field.serviceName);
            //console.log(serviceName);
            if (reverseFlag) {
                if ((serviceNumber == 'CORE') ||(serviceNumber == 'MSG')) {
                    if ((serviceName != 'ApplicationContextCore') &&(serviceName != 'EnterpriseErrors') &&(serviceName != 'AcknowledgementMessage') &&(serviceName != 'ValidationErrors') &&(serviceName != 'SystemErrors') &&(serviceName != 'SecurityErrors') &&(serviceName != 'LogicErrors') &&(serviceName != 'ErrorMessagesCore')) {
                        fieldListArray.push(field);
                    }
                }
            } else {
                if ((serviceNumber != 'CORE') &&(serviceNumber != 'MSG')) {
                    fieldListArray.push(field);
                }
            }
        });
        newMacroFieldListObj = {
            fieldList: fieldListArray
        };
        //console.log(newMacroFieldListObj);
        console.timeEnd('removeAllFieldsCoreSchemas');
        return newMacroFieldListObj;
    } else {
        console.timeEnd('removeAllFieldsCoreSchemas');
        return macroFieldListObj;
    }
}



function buildReferenceDataPage() {
    if (buildReferenceDataPageFlag != true) {
        //getAllReferenceData();
    }
    buildReferenceDataPageFlag = true;
}
function buildTransformationsPage() {
    if (buildTransformationsPageFlag != true) {
        
        getServiceTransformsListJSONData();
        getTransformationSearchData();
    }
    buildTransformationsPageFlag = true;
}
function buildDependencyWheelPage() {
    if (buildDependencyWheelPageFlag != true) {
        getDependencyWheelData();
    }
    buildDependencyWheelPageFlag = true;
}
function buildProvidersAndConsumersPage() {
    if (buildProvidersAndConsumersPageFlag != true) {
        getConsumerProviderLists(globalSelectedRelease, 'providerconsumersAccordion');
    }
    buildProvidersAndConsumersPageFlag = true;
}

function buildMacroPage(selectedReleaseObj) {
    if (buildMacroPageFlag != true) {
        //I should establish all accorions here and just refresh later as async
        $("#macrosAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#searchXPathAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#refDataAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#changesAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#providerconsumersAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#serviceTransformationsAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#serviceDesignPrinciplesAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        $("#serviceArchitectureAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        //testing
        //do an ajax call to a get the enterpriseServiceSummary
        buildALLServiceModels(selectedReleaseObj,'macrosAccordion');
        buildALLChangesModels(selectedReleaseObj,'changesAccordion');
        
        //getSchemasJSONData('enterpriseModels', 'returnEnterpriseModels');
        //getSchemasJSONData('providerModels', 'buildProviderSchemaListAccordion');
        //getSchemasJSONData('integrationModels', 'buildIntegrationSchemaListAccordion');
        //getSchemasJSONData('wsgw', 'buildWSGWSchemaListAccordion');
        //lets build service changes page too?
        
    }
    buildMacroPageFlag = true;
}

function buildALLServiceModels(releaseObject, parentID){
    //so I know how many headers to setup and the ID on the object that they belong under?
    //build a header for each serviceModel
    var serviceModels = returnArray(releaseObject.serviceModels);
    var headerAccordion = $('#' + parentID);
    headerAccordion.empty();                
    if(serviceModels!=null){
        for(var i = 0;i<serviceModels.length;i++){
            var serviceModel = serviceModels[i];
            //at this level of object I just have the name....
            //I should add a description to the node based object
            var identifier = serviceModel.name + 'ServiceModel';
            var htmlHeader = buildInnerAccordion(identifier, serviceModel.name + ' Service Models');
            //append the models data header
            headerAccordion.append(htmlHeader);
            //now style each one?
            headerAccordion.accordion("refresh");
            var childNodes = headerAccordion.find('.' + identifier);
            //now go get the first level of data for each of these with the call backs?
            getSchemasJSONData(serviceModel, releaseObject.name, childNodes);
        }
    }
    //schemaList
}

function buildALLChangesModels(releaseObject, parentID){
    //so I know how many headers to setup and the ID on the object that they belong under?
    //build a header for each serviceModel
    var serviceModels = returnArray(releaseObject.serviceModels);
    var headerAccordion = $('#' + parentID);
    headerAccordion.empty();                
    if(serviceModels!=null){
        for(var i = 0;i<serviceModels.length;i++){
            var serviceModel = serviceModels[i];
            //at this level of object I just have the name....
            //I should add a description to the node based object
            var identifier = serviceModel.name + 'ServiceChanges';
            var htmlHeader = buildInnerAccordion(identifier, serviceModel.name + ' Changes');
            //append the models data header
            headerAccordion.append(htmlHeader);
            //now style each one?
            headerAccordion.accordion("refresh");
            var childNodes = headerAccordion.find('.' + identifier);
            //now go get the first level of data for each of these with the call backs?
            getSchemaChangesJSONData(serviceModel, releaseObject.name, childNodes);
        }
    }
    //schemaList
}
function buildInnerAccordion(id, title){
    var accordionHTML = '<h3 id="' + id + 'Header" class="accordionHeader modelHeader '+ id + '">' +  title + '<span class="h3subtext"></span></h3>';
    accordionHTML+='<div id="' + id + 'Content" class="accordionContent modelContent '+ id + '"></div>';
    return accordionHTML;
}

function buildServiceChangesPage() {
    if (buildServiceChangesPageFlag != true) {
        
    }        
}
function buildServiceDesignPrinciplesPage() {
    if (buildServiceDesignPrinciplesFlag != true) {
        
        getStandardizedServiceContractData();
        getServiceLooseCouplingData();
        getServiceAbstractionData();
        getServiceReusabilityData();
        getServiceAutonomyData();
        getServiceStatelessnessData();
        getServiceDiscoverabilityData();
        getServiceComposabilityData();
    }
    buildServiceDesignPrinciplesFlag = true;
}


function createProposal() {
    //email?
    /*$(location).attr('href', 'mailto:jason.finlen@border.gov.au?subject='
    + encodeURIComponent("This is my subject")
    + "&body="
    + encodeURIComponent("This is my body")
    );
     */
    dialog.dialog("close");
}


function buildNewProposalForms() {
    $("#newProposalButton").button();
    dialog = $("#newProposalDialog").dialog({
        autoOpen: false,
        height: 400,
        width: 800,
        buttons: {
            "Create Proposal": createProposal,
            Cancel: function () {
                dialog.dialog("close");
            }
        },
        show: {
            effect: "blind",
            duration: 500
        },
        hide: {
            effect: "explode",
            duration: 500
        }
    });
    
    $("#newProposalButton").on("click", function () {
        $("#newProposalDialog").dialog("open");
    });
}
function buildServiceArchitecturePage() {
    if (buildServiceArchitecturePageFlag != true) {
        //buildNewProposalForms();
        
        //getServiceRequestArchitectureJSONData();
        //getProjectListJSONData();
        //getLifecycleServicesJSONData();
        //getServiceAutoPopulateJSONData();
        //getServiceImplementationListJSONData();
        //getUniqueServiceActionNames();
        //getServiceSharedUsageJSONData();
    }
    buildServiceArchitecturePageFlag = true;
}

function setIEFlag() {
    var browserName = getBrowser();
    if (browserName == 'IE') {
        isIEFlag = true;
    } else {
        isIEFlag = false;
    }
}

function getBrowser() {
    var ua = navigator.userAgent, tem,
    M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) ||[];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) ||[];
        //return 'IE '+(tem[1] || '');
        return 'IE';
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    M = M[2] ?[M[1], M[2]]:[navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    //return M.join(' ');
    return M[0];
}



function showLoadingBlock() {
    $.loadingBlockShow({
        imgPath: 'vendors/jQuery-loadingBlock/img/default.svg',
        text: 'loading Schemas ...',
        style: {
            position: 'fixed',
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, .8)',
            left: 0,
            top: 0,
            zIndex: 10000
        }
    });
}
function hideLoadingBlock(currentTab) {
    if (currentTab == -1) {
        //console.log('Hiding loader as -1 sent');
        $.loadingBlockHide();
    } else {
        $.loadingBlockHide();
    }
}



function buildAdmin() {
    //create the additional tab
    //only do this if its not already built?
    if (adminBuilt != true) {
        $("#adminAccordion").accordion({
            heightStyle: "fill",
            collapsible: true,
            active: false
        });
        getAllBuildsListJSONData();
        getServiceEmptyProviderConsumerListJSONData();
        getAllCAPMConsumersJSONData();
        getAllCAPMProvidersJSONData();
        getAllCAPMServicesJSONData();
        getOrphanedFieldsJSONData();
        getSystemListChordJSONData();
        adminBuilt = true;
    }
}

function getSystemListChordJSONData() {
    console.time('getSystemListChordJSONData');
    buildit();
    console.timeEnd('getSystemListChordJSONData');
}

function getOrphanedFieldsJSONData() {
    console.time('getOrphanedFieldsJSONData');
    showLoadingBlock();
    var url = getSelectedRelease().releaseLocation + 'macroFieldList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            buildOrphanedFieldsListAccordion(data);
            hideLoadingBlock(-1);
            console.timeEnd('getOrphanedFieldsJSONData');
        },
        'error': function (XMLHttpRequest) {
            buildOrphanedFieldsListAccordion(XMLHttpRequest);
            hideLoadingBlock(-1);
            console.timeEnd('getOrphanedFieldsJSONData');
        }
    });
}

function getProjectListJSONData() {
    console.time('getProjectListJSONData');
    var cacheBuster = getCacheBuster();
    var url = getSelectedRelease().releaseLocation + 'enterpriseModels/' + 'projectList.json?' + cacheBuster;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            buildProjectListAccordion(data);
            hideLoadingBlock(-1);
            console.timeEnd('getProjectListJSONData');
        },
        'error': function (XMLHttpRequest) {
            buildProjectListAccordion(XMLHttpRequest);
            hideLoadingBlock(-1);
            console.timeEnd('getProjectListJSONData');
        }
    });
}


function getServiceRequestArchitectureJSONData() {
    console.time('getServiceRequestArchitectureJSONData');
    //now I need a unique count of all Service Names
    //and I need all the schemas from macroList.json
    //console.log('getServiceRequestArchitectureJSONData');
    showLoadingBlock();
    var release = getSelectedRelease();
    var serviceArchitectureURL = release.crtLocation + 'services_requests.json?' + 'buildNumberCache=' + release.cacheBuster;;
    var serviceSchemas = release.releaseLocation + 'macroList.json?' + 'buildNumberCache=' + release.cacheBuster;;
    var allRequests =[];
    allRequests.push($.getJSON(serviceArchitectureURL));
    allRequests.push($.getJSON(serviceSchemas));
    var requests = $.unique(allRequests);
    var defer = $.when.apply($, requests);
    defer.done(function () {
        //update this to just call no matter if success or fail?
        buildRequestArchitectureListAccordion(arguments[0][0]);
        buildServiceArchitectureListAccordion(arguments[0][0], arguments[1][0]);
        console.timeEnd('getServiceRequestArchitectureJSONData');
        hideLoadingBlock(3);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        buildRequestArchitectureListAccordion(jqXHR);
        buildServiceArchitectureListAccordion(jqXHR, jqXHR);
        hideLoadingBlock(-1);
        console.timeEnd('getServiceRequestArchitectureJSONData');
        //build the accordian anyway?
    });
}

function buildSharedUsageAccordion(systemListData) {
    console.time('buildSharedUsageAccordion');
    var id = 'serviceSharedUsage';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    //now work out what data I have
    if ((systemListData != null) &&(systemListData.serviceList != null) &&(systemListData.systemList != null)) {
        //so first lets just loop through every service and see what we have
        //console.log(systemListData);
        var schemaSharedUsageObj = {
        };
        var consumerCountObjectList =[];
        var providerCountObjectList =[];
        $.each(systemListData.serviceList, function (index, service) {
            var providerCount = 0;
            var consumerCount = 0;
            //console.log(service);
            if (service.consumerList != null) {
                consumerCount = service.consumerList.length;
            }
            if (service.providerList != null) {
                providerCount = service.providerList.length;
            }
            if (consumerCountObjectList[consumerCount] == null) {
                consumerCountObjectList[consumerCount] =[];
            } else {
                //consumerCountList[consumerCount] = consumerCountList[consumerCount] + 1;
            }
            
            if (providerCountObjectList[providerCount] == null) {
                providerCountObjectList[providerCount] =[];
            } else {
                //providerCountList[providerCount] = providerCountList[providerCount] + 1;
            }
            consumerCountObjectList[consumerCount].push(service);
            providerCountObjectList[providerCount].push(service);
        });
        //serviceSharedUsageObj.providerCountList = providerCountList;
        schemaSharedUsageObj.providerCountObjectList = providerCountObjectList;
        schemaSharedUsageObj.consumerCountObjectList = consumerCountObjectList;
        //serviceSharedUsageObj.consumerCountList = consumerCountList;
        //console.log(schemaSharedUsageObj);
        //lets do a graph
        schemaSharedUsageGraph(schemaSharedUsageObj, contentID);
        
        //now I want the same thing by service?
    }
    //update the header?
    appendAccordionHeader(headerID, ' ' + systemListData.serviceList.length + ' services from production verified');
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildSharedUsageAccordion');
}

function buildRequestArchitectureListAccordion(serviceArchitectureObj) {
    console.time('buildrequestArchitectureListAccordion');
    var id = 'requestArchitectureList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    //now work out what data I have and what needs to be done because of success
    if ((serviceArchitectureObj != null) &&(serviceArchitectureObj.services_requests != null) &&(serviceArchitectureObj.services_requests.requests != null) &&(serviceArchitectureObj.services_requests.requests.request != null) &&(serviceArchitectureObj.services_requests.services != null) &&(serviceArchitectureObj.services_requests.services.service != null)) {
        var requestList = returnArray(serviceArchitectureObj.services_requests.requests.request);
        var implementationsList = returnArray(serviceArchitectureObj.services_requests.services.service);
        var requestListCount = requestList.length;
        var implementationsListCount = implementationsList.length;
        var thHTML = buildRequestArchitectureListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Proposal List');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        for (i = 0; i < requestListCount; i++) {
            var requestObj = requestList[i];
            var imphtml = 'Not Implemented';
            if ((requestObj.services != null) &&(requestObj.services.service != null)) {
                var implementationSubList = returnArray(requestObj.services.service);
                var implementationSubListCount = implementationSubList.length;
                imphtml = '';
                for (k = 0; k < implementationSubListCount; k++) {
                    var implementationObj = implementationSubList[k];
                    imphtml += $undefinedToEmpty(implementationObj.service_id) + '-' + $undefinedToEmpty(implementationObj.service_name);
                }
            }
            
            htmlBody += '<tr><td>' + $undefinedToEmpty(requestObj.proposed_name) +
            '</td><td>' + $undefinedToEmpty(requestObj.proposed_service_type) +
            '</td><td>' + $undefinedToEmpty(requestObj.domain) +
            '</td><td>' + $undefinedToEmpty(requestObj.description) +
            '</td><td>' + $undefinedToEmpty(requestObj.request_payload_text) +
            '</td><td>' + $undefinedToEmpty(requestObj.response_payload_text) +
            '</td><td>' + $undefinedToEmpty(requestObj.electronic_file_reference) +
            '</td><td>' + $undefinedToEmpty(requestObj.start_timestamp).substring(0, 10) +
            '</td><td>' + imphtml + '</td></tr>';
            //now append
            $('tbody#' + id + 'TableBody').empty();
            $('tbody#' + id + 'TableBody').append(htmlBody);
            var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
            //I actually want to update the Macro Header?
            appendAccordionHeader(headerID, requestListCount + ' Service Proposals');
        }
    } else {
        //update the header to be in error?
        appendAccordionHeader(headerID, 'No Requests Found');
        //is the object I have a jhttp object?
        if ((serviceArchitectureObj.status != null) &&(serviceArchitectureObj.statusText != null)) {
            $('#' + contentID).html('Status' + serviceArchitectureObj.status + ' - ' + serviceArchitectureObj.statusText);
        } else {
            $('#' + contentID).html('No Requests Found.');
        }
    }
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildrequestArchitectureListAccordion');
}

function buildServiceArchitectureListAccordion(serviceArchitectureObj, serviceSchemasObj) {
    console.time('buildServiceArchitectureListAccordion');
    var id = 'serviceArchitectureList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    
    if ((serviceArchitectureObj != null) &&(serviceArchitectureObj.services_requests != null) &&(serviceArchitectureObj.services_requests.services.service != null)) {
        var serviceList = returnArray(serviceArchitectureObj.services_requests.services.service);
        var serviceListCount = serviceList.length;
        var thHTML = buildServiceArchitectureListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Service Class List');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        var serviceSchemaList =[];
        if ((serviceSchemasObj != null) &&(serviceSchemasObj.macroLocations != null) &&(serviceSchemasObj.macroLocations.category != null)) {
            var serviceSchemaListObj = flattenMacroList(serviceSchemasObj.macroLocations.category);
            if (serviceSchemaListObj.macroList !== undefined) {
                serviceSchemaList = returnArray(serviceSchemaListObj.macroList);
            }
        }
        var serviceSchemaListCount = serviceSchemaList.length;
        for (i = 0; i < serviceListCount; i++) {
            var serviceObj = serviceList[i];
            //now I need to check if any schemas exist
            var schemahtml = '';
            
            for (l = 0; l < serviceSchemaListCount; l++) {
                var schema = serviceSchemaList[l];
                var schemaNumber = undefinedToEmpty(schema.number).toUpperCase();
                var serviceID = pad($undefinedToEmpty(serviceObj.service_id), 3).toString();
                var serviceNumber = $undefinedToEmpty(serviceObj.service_type).toUpperCase() + serviceID;
                if (schemaNumber == serviceNumber) {
                    var schemaName = cleanMacroName(undefinedToEmpty(schema.name));
                    var schemaVersion = undefinedToEmpty(schema.version);
                    var schemaLocation = undefinedToEmpty(schema.location);
                    var uniqueLink = schemaNumber + '-' + cleanMacroName(schemaName) + '-' + cleanSchemaVersion(schemaVersion);
                    var namelink = getMacroLink(uniqueLink, schema.key, service.callBackURL);
                    schemahtml += namelink + '<br>';
                }
            }
            if (schemahtml == '') {
                schemahtml = 'No Schemas Implemented';
            }
            //now I need to check if any proposals exist
            var imphtml = 'No Proposal Captured';
            if ((serviceObj.requests != null) &&(serviceObj.requests.request != null)) {
                //this may be an array
                var requestList = returnArray(serviceObj.requests.request);
                imphtml = '';
                for (k = 0; k < requestList.length; k++) {
                    var request = requestList[k];
                    imphtml += $undefinedToEmpty(request.proposed_name);
                    if ($undefinedToEmpty(request.electronic_file_reference) != '') {
                        imphtml += ' (' + $undefinedToEmpty(request.electronic_file_reference) + ')';
                    }
                    imphtml += ' ';
                }
            }
            
            htmlBody += '<tr><td>' + serviceID +
            '</td><td>' + $undefinedToEmpty(serviceObj.service_name) +
            '</td><td>' + $undefinedToEmpty(serviceObj.service_type) +
            '</td><td>' + $undefinedToEmpty(serviceObj.domain) +
            '</td><td>' + $undefinedToEmpty(serviceObj.service_information_source) +
            '</td><td>' + $undefinedToEmpty(serviceObj.effective_from_timestamp).substring(0, 10) +
            '</td><td>' + imphtml +
            '</td><td>' + schemahtml + '</td></tr>';
        }
        //painty McPaintFace
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, serviceListCount + ' Service Classes');
    } else {
        //update the header to be in error?
        appendAccordionHeader(headerID, 'No Service Classes Found');
        //is the object I have a jhttp object?
        if ((serviceArchitectureObj.status != null) &&(serviceArchitectureObj.statusText != null)) {
            $('#' + contentID).html('Status' + serviceArchitectureObj.status + ' - ' + serviceArchitectureObj.statusText);
        } else {
            $('#' + contentID).html('No Service Classes Found.');
        }
    }
    
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildServiceArchitectureListAccordion');
}

function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n: new Array(width - n.length + 1).join(z) + n;
}

function cleanSchemaVersion(macroVersion) {
    var newMacroVersion = macroVersion.replace('.0', '');
    return newMacroVersion;
}
function setTabInitialState() {
    //var tabIndex = localStorage.getItem('tabIndex');
    var tabIndex = 0;
    if (tabIndex >= 0 && tabIndex <= tabCount -1) {
        //set the active tab
        $("div#maintab").tabs("option", "active", tabIndex);
    } else {
        //default it back to 0
        //localStorage.setItem('tabIndex', 0);
        $("div#maintab").tabs("option", "active", 0);
    }
}

function clearDataUI(){
    $('#accordionContent').html = '';
}


function releaseChangeCombo(releaseLocation, releaseName) {
    //reset the repository stuff?
    clearDataUI();
    for (var i = 0; i < globalReleasesArray.length; i++) {
        //find the labels for this one
        var releaseObj = globalReleasesArray[i];
        if(releaseName==releaseObj.name){
            //do this!
            globalSelectedRelease = releaseObj;
        }
    }    
    
    $('[data-key="removableTab"]').remove();
    setTabInitialState();
    
    $("div#maintab").tabs("refresh");
    
    //I also need to remove all of the filter text values and reset the filter tables as well.
    adminBuilt = false;
    buildReferenceDataPageFlag = false;
    buildMacroPageFlag = false;
    buildServiceArchitecturePageFlag = false;
    buildSchemaFieldSearchPageFlag = false;
    loadPage(globalSelectedRelease);
}

function storeBuildInfo(buildInfoObj){
    globalBuildInfo = buildInfoObj;
    //localStorage.setItem('localBuildInfo',  JSON.stringify(globalBuildInfo));
}



$.urlParam = function (name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results == null) {
        return null;
    } else {
        return decodeURI(results[1]) || 0;
    }
}
function getURLRelease() {
    var release = null;
    var URLrelease = undefinedToEmpty($.urlParam('release'));
    //need to add a local one here
    if (URLrelease != '') {
        release = URLrelease.toUpperCase();
    }
    return release;
}
function getURLjsonLink() {
    var key = undefinedToEmpty($.urlParam('key'));
    if (key != '') {
        //console.log('jsonLink:' + jsonLink);
        //now I need to build the tab for this service name if it exists?
        newMacroTab(key);
    }
}

function createFunctionList(functionList) {
    //console.log('functionList:');
    //console.log(functionList);
    
    var qs = $('input#functionListSearch').quicksearch('table#functionListTable tbody tr', {
        noResults: '#functionListnoresults',
        selector: 'td',
        stripeRows:[ 'odd', 'even'],
        loader: 'span.loading',
        bind: 'keyup click input'
    });
    if (functionList !== undefined) {
        
        var functionListCount = functionList.length;
        //console.log('functionListCount:' + functionListCount);
        if (functionListCount > 0) {
            //do something
            $('tbody#functionListTableBody').empty();
            var html = '';
            for (var i = 0; i < functionListCount; i++) {
                var functionItem = functionList[i];
                //console.log(functionItem);
                html += '<tr><td>' + undefinedToEmpty(functionItem.type) + '</td><td>' + undefinedToEmpty(functionItem.element) + '</td><td>' + undefinedToEmpty(functionItem.table) + '</td><td>' + undefinedToEmpty(functionItem.fromcolumn) + '</td><td>' + undefinedToEmpty(functionItem.tocolumn) + '</td></tr>';
            }
            $('tbody#functionListTableBody').append(html);
            $('#functionListSearchLabel').text(' Parsed ' + functionListCount + ' functions.');
            appendAccordionHeader('h3FunctionList', functionListCount + ' functions');
        }
    }
    qs.cache();
}


function getServiceTransformsListJSONData() {
    console.time('getServiceTransformsListJSONData');
    var allRequests =[];
    //get both sets of transformation files
    var esbURL = getSelectedRelease().releaseLocation + 'transformsList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;
    var wsgwURL = getSelectedRelease().releaseLocation + 'wsgwTransformsList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;
    allRequests.push($.getJSON(esbURL));
    allRequests.push($.getJSON(wsgwURL));
    var defer = $.when.apply($, allRequests);
    defer.done(function () {
        buildTransformsListAccordion(arguments);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('Error in fetching Service Transforms List JSON Data', jqXHR, textStatus, errorThrown);
        hideLoadingBlock(-1);
    });
}
function getServiceAutoPopulateJSONData() {
    console.time('getServiceAutoPopulateJSONData');
    var url = getSelectedRelease().releaseLocation + 'enterpriseModels/' + 'macroAutoPopulate.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            buildAutoPopulateListAccordions(data);
            console.timeEnd('getServiceAutoPopulateJSONData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            buildAutoPopulateListAccordions(data);
            console.timeEnd('getServiceAutoPopulateJSONData');
            hideLoadingBlock(-1);
        }
    });
}

function mainJSONNotFound(url) {
    //console.log('mainJSONNotFound');
    errorDialog("One of the main data files wasnt found.", "<h3>One of the main data files wasnt found</h3><h4>This page will not render correctly</h4><br>" + url);
    //Im not sure what to do now?
    //unset the local storage?
    localStorage.removeItem('release');
}



function indexControlUI(data) {
}



function refreshReadmeHTML(key) {
    var serviceObj = getServiceObjectByKey(key);
    var idKey = 'readme'+ key;
    var html = '';
   //console.log(serviceObj);
    if(serviceObj.HasChanged==true){
        //is one of them documentation
        var changeTypes = returnArray(serviceObj.changeTypes);
        for (var i = 0; i < changeTypes.length; i++) {
            var change = changeTypes[i];
            if(change.Type=='Documentation'){
                //grab the first changes?
                html+= change.changes[0];
                break;
            }
        }
    }
    $('#' + idKey + '> span').html(html);
}
function buildReadmeHTML(serviceObj) {
    var html = '';
    //console.log(serviceObj;
    var idKey = 'readme'+ serviceObj.key;
    html+='<h3 id="' + idKey + '">' + 'Service README';
    html+='<span id="reademespan' + serviceObj.key + '" class="h3subtext">';
    if(serviceObj.HasChanged==true){
        //is one of them documentation
        var changeTypes = returnArray(serviceObj.changeTypes);
        for (var i = 0; i < changeTypes.length; i++) {
            var change = changeTypes[i];
            if(change.Type=='Documentation'){
                var desc = change.changes[0]; 
                if(desc=='Previous documentation didnt exist'){
                    html+= 'New readme created this release';    
                }else{
                    html+= 'Changes in the documentatin exist for this release';
                }
                break;
            }
        }
    }
    html+= '</span>';
    html+= '</h3>'
    html += '<div>';
    
    

    if ((serviceObj!=null)&&(serviceObj.readme!=null)){
        converter = new showdown.Converter();
        //converter.setOption('headerLevelStart', 5);
        //converter.setOption('simpleLineBreaks', true);
		var readmeHTML = serviceObj.readme;
        //if it exists then make sure its an array even if its only one item
        html += readmeHTML;
    }else{
        html += '<h4>No README.md file exists for this service</h4>'
    }
    html += '</div>';
    return html;
}

function buildServiceUsageHTML(UsageObj) {
    return buildGenericContentHTML('Service Usage', UsageObj);
}


function buildServiceExternalLinks(serviceObject) {
    var release = getSelectedRelease();
    var html = '';
    html += '<h4>' + 'External Links' + '</h4>';
    var formatedjsonLink = 'key=' + serviceObject.key;
    var releaseLink = 'release=' + globalSelectedRelease.releaseName;
    var url = window.location.href.split('?')[0];
    var urlLink = url + '?' + formatedjsonLink + '&' + releaseLink;
    var urlEscapedLink = url + '?' + formatedjsonLink + '%26' + releaseLink;
    //%26
    var subject = 'For review';
    var lf = '%0D%0A';
    var dlf = lf + lf;
    //TDOD fix this to use the buildinfo and release
    var release = {};
    release.enterpriseModelsVersion = "1234";
    var body = 'Hi, ' + dlf + 'Please find the following link available for ' + globalSelectedRelease.releaseName + ' review in build number ' + release.enterpriseModelsVersion + ' or greater.' + dlf + urlEscapedLink + dlf + 'Please review and provide feedback.' + dlf + 'Thanks' + dlf + 'EIS Team';
    var emailLink = '<a href="mailto:?subject=' + subject + '&body=' + body + '">' + 'Email Link' + '</a>';
    html += emailLink;
    html += '<br>';
    //html += body;
    html += '<br>';
    html += 'Direct Link';
    html += '<br>';
    //maybe add a button here?
    html += '<button id="copyURLToClipboardButton' + serviceObject.key + '" class="ui-button ui-widget ui-corner-all textareacopybtn">Copy Direct URL to Clipboard</button>';
    html += '<textarea id="copyURLToClipboardText' + serviceObject.key + '" class="copytextarea" rows="1" cols="1">' + serviceObject.urlLink + '</textarea>';
    return html;
}




function buildGenericContentHTML(header, obj) {
    var html = '';
    if ((obj != null) && (obj.Content != null) && (obj.Content != '')) {
        html += '<h4>' + header + '</h4>';
        html += obj.Content;
    } else {
        //console.log('Object is undefined, blank or no content?');
    }
    return html;
}




function buildSampleFilesHTML(svname, uniqueDiv) {
    //TDOD Fix samples
    /*
    var url = getSelectedRelease().releaseLocation;
    var jsonLinkRel = url + 'xmlSampleList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    console.time('buildSampleFilesHTML');
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            handleSampleFilesData(data, svname, uniqueDiv);
            console.timeEnd('buildSampleFilesHTML');
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            errorDialog("Error in fetching Macro json Data", "<h3>Status: " + textStatus + "</h3><br>" + "Error: " + errorThrown + '<br>' + jsonLinkRel);
        }
    });
    */
}

function handleSampleFilesData(data, svname, uniqueDiv) {
    console.time('handleSampleFilesData');
    var html = '<h3>No Generated Samples Exist</h3>';
    //console.log(data);
    if (data !== undefined) {
        if (data.macroLocations !== undefined) {
            var macroLocations = data.macroLocations;
            if (macroLocations.category !== undefined) {
                var categoryObj = macroLocations.category;
                var xmlSampleObj = flattenMacroList(categoryObj);
                
                var xmlSampleList = returnArray(xmlSampleObj.macroList);
                if (xmlSampleList !== undefined) {
                    //console.log('xmlSampleList isnt undefined so move on');
                    xmlSampleListCount = xmlSampleList.length;
                    //console.log('xmlSampleListCount:' + xmlSampleListCount);
                    //now loop through each sample
                    html = '<h4>Generated Sample Messages</h4>';
                    html += '<table class="accordiontable">';
                    html += '<thead>';
                    html += '<tr>';
                    html += '<th width="20%">Name</th>';
                    html += '<th width="20%">Without SOAP</th>';
                    html += '<th width="20%">With SOAP</th>';
                    //html += '<th width="20%">As JSON</th>';
                    //html += '<th width="20%">As JSON with SOAP</th>';
                    html += '</tr>';
                    html += '</thead>';
                    html += '<tbody>';
                    for (var i = 0; i < xmlSampleListCount; i++) {
                        var location = xmlSampleList[i].location;
                        if (location.indexOf(svname + '/') > -1) {
                            //console.log(xmlSampleList[i]);
                            var sampleName = xmlSampleList[i].name;
                            var sampleLocation = getSelectedRelease().releaseLocation + 'enterpriseModels/' + xmlSampleList[i].location;
                            //dont output soap named messages
                            if (sampleName.indexOf('.soap.xml') == -1) {
                                var displayName = sampleName.replace('.xml', '');
                                var sampleNameWithSOAP = sampleName.replace('.xml', '.soap.xml');
                                var sampleLocationWithSOAP = sampleLocation.replace('.xml', '.soap.xml');
                                //var sampleNameJSON = sampleName.replace('.xml', '.json');
                                //var sampleLocationJSON = sampleLocation.replace('.xml', '.json');
                                //var sampleNameJSONWithSOAP = sampleName.replace('.xml', '.soap.json');
                                //var sampleLocationJSONWithSOAP = sampleLocation.replace('.xml', '.soap.json');
                                html += '<tr>';
                                html += '<td>';
                                html += displayName;
                                html += '</td>';
                                html += '<td>';
                                html += createLinkAndDownloadLink(sampleLocation, sampleName);
                                html += '</td>';
                                html += '<td>';
                                html += createLinkAndDownloadLink(sampleLocationWithSOAP, sampleNameWithSOAP);
                                html += '</td>';
                                //html += '<td>';
                                //html += createLinkAndDownloadLink(sampleLocationJSON,sampleNameJSON);
                                //html += '</td>';
                                //html += '<td>';
                                //html += createLinkAndDownloadLink(sampleLocationJSONWithSOAP, sampleNameJSONWithSOAP);
                                //html += '</td>';
                                html += '</tr>';
                            }
                            //this means I can build a table of samples
                        }
                    }
                    html += '</tbody>';
                    html += '</table>';
                }
            }
        }
    }
    
    $("div#" + uniqueDiv).append(html);
    //#TODO
    console.timeEnd('handleSampleFilesData');
}

function buildCompassFilesTableData(macroData, uniqueTable) {
    var sampleCount = 5;
    var period = '5d';
    var envs =[ 'e4', 'e5', 'e6', 'e7'];
    var samples =[];
    
    console.time('buildCompassSampleFilesHTML');
    
    for (var i = 0; i < envs.length; i++) {
        $.ajax({
            dataType: 'JSONP',
            url: compassSampleURL(macroData.ServiceName, envs[i], period, sampleCount),
            success: function (data) {
                handleCompassFilesTableData(data, uniqueTable);
            }
        })
    }
    console.timeEnd('buildCompassSampleFilesHTML');
}

function handleCompassFilesTableData(data, uniqueTable) {
    console.time('handleCompassFilesTableData');
    
    var html = '';
    for (var j = 0; j < data.rows.length; j++) {
        var sample = data.rows[j];
        var logDate = new Date(sample.localendtime);
        
        // http://e4-compass-app01.immi.gov.au:8181/e4/2017-12-21/414d5120494d534f414930312020202059f12c8f26616ce2.xml
        var compassUrl = 'http://'
        compassUrl += data.attributes.env;
        compassUrl += '-compass-app01.immi.gov.au:8181';
        compassUrl += '/' + data.attributes.env;
        compassUrl += '/' + logDate.getFullYear()
        compassUrl += '-' + twoDigitNumber((logDate.getMonth() + 1))
        compassUrl += '-' + twoDigitNumber(logDate.getDate());
        compassUrl += '/' + sample.linkb_nr + '.xml';
        
        html += '<tr>';
        html += '<td>' + data.attributes.env + '</td>';
        html += '<td>' + sample.localendtime + '</td>';
        html += '<td>' + sample.result_nr + '</td>';
        html += '<td>';
        html += '<a href="' + compassUrl + '" target="_blank">' + sample.name_nr + '</a>';
        html += '</td>';
        html += '<td>' + sample.user_nr + '</td>';
        html += '<td>' + sample.consumer_nr + '</td>';
        html += '<td>' + sample.linkb_nr + '</td>';
        html += '</tr>';
    }
    
    // TODO: Would be nice to introduce some kind of sort
    //       so that the service environments are in
    //       numerical order.
    $('#' + uniqueTable + ' > tbody').append(html);
    
    console.timeEnd('handleCompassFilesTableData');
}

function createNewTabLink(link, display) {
    var html = '';
    html += '<a class="newTabLink" target="_blank" ';
    html += 'href="' + link + '" ';
    html += '>';
    html += display;
    html += '</a> ';
    return html;
}

function createLinkAndDownloadLink(link, display) {
    var html = '';
    html += '<a class="newTabLink" target="_blank" ';
    html += 'href="' + link + '" ';
    html += '>';
    html += display;
    html += '</a> ';
    
    html += '<a class="downloadLink" target="_blank" ';
    html += 'href="' + link + '" ';
    html += 'download="' + link + '" ';
    html += '>';
    html += 'Download';
    html += '</a>';
    return html;
}


function buildReturnCodesHTML(svname, uniqueDiv) {
    console.time('buildReturnCodesHTML');
    var html = '';
    html += 'All Error Codes are generated from Corperate Reference Data (CRT as implemented on midrange by CDH) to the ESB.';
    html += '<br>';
    html += 'Error Codes Yet to be resolved...';
    //TODO update this with the global crt?
    var cacheBuster = getCacheBuster();
    var url = '../serviceRepositorySite/' + globalSelectedRelease.crtBranchName + '/';
    
    //var jsonLinkRel = url + 'fullEnterpriseCodes.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;;
    
    var jsonLinkRel = url + 'data_power_error_code_type.json?' + 'buildNumberCache=' + cacheBuster;
    
    //console.log(jsonLinkRel);
    //console.log(svname);
    //adding code to fetch the error codes as json data now that I have what and where
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            handleErrorCodesData(data, svname, uniqueDiv);
            console.timeEnd('buildReturnCodesHTML');
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            //this is non critcal so if not found dont worry?
            
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown + " \n" + jsonLinkRel);
            //errorDialog("Error in fetching Macro json Data", "<h3>Status: " + textStatus + "</h3><br>" + "Error: " + errorThrown + '<br>' + jsonLinkRel);
        }
    });
}

function handleErrorCodesData(ErrorCodes, svName, uniqueDiv) {
    var html = '';
    //try and find some decent data
    //its an array of tables
    if (ErrorCodes !== undefined) {
        if (ErrorCodes.tables !== undefined) {
            if (ErrorCodes.tables.table !== undefined) {
                for (var i = 0; i < ErrorCodes.tables.table.length; i++) {
                    var table = ErrorCodes.tables.table[i];
                    
                    //if the service name contains within the table name then its a match
                    if (table.name.indexOf(svName) > -1) {
                        //console.log('matches as ' + svName + ' exists within' + table.name);
                        
                        //if this matches I need to generate a table with the html data
                        //console.log(table);
                        html += '<table class="mytable">';
                        var rowList = returnArray(table.row);
                        //get the first row and use the headers
                        var firstRow = rowList[0];
                        var firstColList = returnArray(firstRow.column);
                        html += '<thead>';
                        html += '<tr>';
                        for (var l = 0; l < firstColList.length; l++) {
                            html += '<th>'
                            //console.log('firstColList:' + firstColList[l].name);
                            html += firstColList[l].name;
                            html += '</th>'
                        }
                        html += '</tr>'
                        html += '</thead>'
                        html += '<tbody>'
                        for (var k = 0; k < rowList.length; k++) {
                            var row = rowList[k];
                            //console.log('row:');
                            //console.log(row);
                            html += '<tr>'
                            var colList = returnArray(row.column);
                            for (var j = 0; j < colList.length; j++) {
                                var col = colList[j];
                                //console.log('col:');
                                //console.log(col);
                                html += '<td>'
                                html += col.$;
                                html += '</td>'
                            }
                            html += '</tr>'
                        }
                        html += '</tbody>'
                        html += '</table>'
                    }
                }
            }
        }
    }
    $("div#" + uniqueDiv).append(html);
}

function buildRequestHTML(requestSchemaObj) {
    var html = '';
    html += 'Request Schema';
    html += buildSchemaHTML(requestSchemaObj);
    return html;
}
function buildResponseHTML(responseSchemaObj) {
    var html = '';
    html += 'Response Schema';
    html += buildSchemaHTML(responseSchemaObj);
    return html;
}
function buildSchemaHTML(SchemaObj) {
    var html = '';
    html = '<div id="tree1"></div>';
    return html;
}

function enumerationDialog(enumerations) {
    var htmlcontent = '';
    var enumerationArray = returnArray(enumerations);
    $.each(enumerationArray, function (index, enumerationValue) {
        htmlcontent = htmlcontent + '<br>' + enumerationValue;
    });
    var title = 'Enumeration Values';
    $("#div-dialog-warning").html(htmlcontent);
    $("#div-dialog-warning").dialog({
        title: title,
        resizable: false,
        modal: true,
        closeOnEscape: true,
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        }
    });
}

function getSchemaObjectFormattedName(SOAEntityType, UseFullXPath) {
    //is it a base type?
    //console.log(SOAEntityType.SOAEntityType);
    var buttonType = 'parent';
    var elementType = SOAEntityType.SOAEntityType;
    if (elementType == 'SimpleType') {
        buttonType = 'green'
    } else if (elementType == 'ElementReference') {
        buttonType = 'blue';
    } else if (elementType == 'Choice') {
        buttonType = 'red';
    } else {
        var buttonType = 'parent';
    }
    
    
    //is it a change?
    //console.log('SOAEntityType');
    //console.log(SOAEntityType);
    /*console.log('Difference');
    //console.log(SOAEntityType.Difference);
    //console.log('ChangeTypes');
    //console.log(SOAEntityType.Difference.ChangeTypes);*/
    var diffObject = (SOAEntityType||{}).Difference;
    var changeType = ' ';
    if(diffObject!=null){
        var changesArray = returnArray(((SOAEntityType||{}).Difference||{}).ChangeTypes);
        //var changesArray = SOAEntityType.Difference.ChangeTypes;
        var changesLength = changesArray.length;
        if(diffObject.ParentOnly){
            changeType += 'parentofchange' + ' ';    
        }
        if(changesLength>0){
            for (i = 0; i < changesLength; i++) {
                var change = changesArray[i].toLowerCase();
                //console.log('change:' + change);
                if(change=='new'){
                    change='insert'
                }
                changeType += change + ' ';
            }
         }else {
            changeType += 'nochange';
        }   
    }else{
        changeType += 'nochange';
    }
    
    var html = '<a class="button ' + buttonType + changeType + '">';
    if (UseFullXPath) {
        html += '<span class="normal">';
        html += SOAEntityType.SOALink;
        html += '</span>';
    } else {
        var displayStructure = formatCamelCaseForHumans(formatStructure(SOAEntityType.Structure));
        var displayType = formatType(SOAEntityType.Type);
        html += '<span class="item">';
        html += displayStructure;
        html += '</span>';
        if (displayType != '') {
            html += '<span class="normal"> - ';
            html += displayType;
            html += '</span>';
        }
    }
    var enumeration = undefinedToEmpty(SOAEntityType.enumeration).trim();
    if (enumeration != '') {
        //console.log(SOAEntityType);
        //console.log(enumeration);
        
        var displayEnumeration = enumeration;
        html += '<span class="enum enumerationList">';
        html += displayEnumeration;
        html += '</span>';
    }
    
    //console.log('SOAEntityType.Cardinality:' + SOAEntityType.Cardinality);
    var cardinalityDisplay = formatCardinality(SOAEntityType.Cardinality);
    html += '<span class="meta cost">';
    html += cardinalityDisplay;
    html += '</span>';
    
    //only require this on certain types that arent enumerations
    
    if ((SOAEntityType.Type == 'xs:token') &&(enumeration == '')) {
        if (SOAEntityType.maxLength == undefined) {
            var maxLength = 'unbounded';
        } else {
            var maxLength = SOAEntityType.maxLength;
        }
        if (SOAEntityType.minLength == undefined) {
            var minLength = '0';
        } else {
            var minLength = SOAEntityType.minLength;
        }
        if (maxLength != 'unbounded') {
            html += '<span class="normal">';
            html += " restricted length to " + maxLength + " characters";
            html += '</span>';
        }
        /*
        
        html+= '<span class="meta category">';
        html+= "minLength=" + minLength;
        html+= '</span>';
        html+= '<span class="meta category">';
        html+= "maxLength=" + maxLength;
        html+= '</span>';
         */
    }
    
    var referenceDataLink = SOAEntityType.RefLink;
    //SOAEntityType.Range;
    
    
    if (referenceDataLink !== undefined) {
        //console.log('referenceDataLink: ' + referenceDataLink);
        if (referenceDataLink.indexOf('F:') > -1) {
            var refTable = getRefTableFromLink(referenceDataLink);
            var refColumn = getRefColumnFromLink(referenceDataLink);
            var tablelink = 'Ref Data (not enforced) ' + refTable + '-' + refColumn;
            //var tablelink = '<a>Link</a>';
            //console.log('tablelink:');
            //console.log(tablelink);
            html += '<span class="meta category tablelink">';
            html += tablelink;
            html += '</span>';
        }
    }
    //End of required
    html += '</a>';
    return html;
}


function formatCardinality(card) {
    
    //I just want to match some things?
    if (card == '0..1') {
        return 'Optional';
    } else if (card == '1..1') {
        return 'Mandatory';
    } else if (card == '1..*') {
        return 'Mandatory and Many';
    } else if (card == '0..*') {
        return 'Optional and Many';
    } else {
        return 'Mandatory';
    }
    /*0..1
    1..*
    0..*
    1..1*/
}

function truncateText(str, length, ending) {
    if (length == null) {
        length = 100;
    }
    if (ending == null) {
        ending = '...';
    }
    if (str.length > length) {
        return str.substring(0, length - ending.length) + ending;
    } else {
        return str;
    }
}

function getMappingObjectFormattedName(buttonType, table, link, options) {
    //name will need to be the map object soon enough
    
    var html = '<a class="button ' + buttonType + '">';
    html += '<span class="item">';
    html += table;
    html += '<span class="meta cost">';
    html += options;
    html += '</span><span class="normal"> - ';
    //if((link!=null)&&(link!='')){
    //console.log('Link:' + link);
    //}
    html += link;
    html += '</span>';
    html += '</span>';
    html += '</a>';
    return html;
}
function tagParentObjectChanges(arraySOAEntity) {
    var parentObject = null;
    //console.log('arraySOAEntity');
    //console.log(arraySOAEntity);
    var testResultObject = tagParentObjectChangesLoop(arraySOAEntity.SOAEntity, parentObject)
    //console.log('testResultObject');
    //console.log(testResultObject);
    
    if (testResultObject.SOAEntity == null) {
        var resultObject = {
            "SOAEntity": testResultObject
        };
    } else {
        var resultObject = testResultObject;
    }
    resultObject.hasChanges = false;
    //with all things being equal either of the first two objects should be tagged with a change?
    if (resultObject.SOAEntity != null) {
        if ((resultObject.SOAEntity[0] != null) &&(resultObject.SOAEntity[0].change != null)) {
            resultObject.hasChanges = true;
        }
        if ((resultObject.SOAEntity[1] != null) &&(resultObject.SOAEntity[1].change != null)) {
            resultObject.hasChanges = true;
        }
    }
    return resultObject;
}
function tagParentObjectChangesLoop(arraySOAEntity, parentObject) {
    //console.log('tagParentObjectChangesLoop');
    //console.log(arraySOAEntity);
    if (arraySOAEntity != null) {
        for (var i = 0; i < arraySOAEntity.length; i++) {
            var SOAObj = arraySOAEntity[i];
            //console.log(SOAObj);
            if (SOAObj != null) {
                if (SOAObj.SOAEntity instanceof Array) {
                    //now calling a loop but using child now as the new parent?
                    tagParentObjectChangesLoop(SOAObj.SOAEntity, SOAObj);
                } else if (SOAObj.SOAEntity !== undefined) {
                    //create an array and pretend it is one?
                    var SOAEntityArray =[];
                    SOAEntityArray.push(SOAObj.SOAEntity);
                    tagParentObjectChangesLoop(SOAEntityArray, SOAObj);
                } else {
                    //does this mean there are no children?
                    //console.log('no childers');
                }
                if (SOAObj.change != null) {
                    //console.log('SOAObj.change: ' + SOAObj.change);
                    //now I need to work back up the tree tagging all object that dont have a change type with a change type
                    if (parentObject != null) {
                        if (parentObject.change == null) {
                            parentObject.change = 'parentOfChange';
                        }
                    }
                }
            }
        }
    } else {
        //what do I do if this is now a null?
        //this means a loop was called with a null object?
        //console.log('arraySOAEntity is a null or undefiend');
    }
    return arraySOAEntity;
}

function schemaTreeDataLoop(arraySOAEntity, parentArray, UseFullXPath) {
    for (var i = 0; i < arraySOAEntity.length; i++) {
        var SOAObj = arraySOAEntity[i];
        if (SOAObj.SOAEntity instanceof Array) {
            //before calling back onto itself I need to create new child array
            var childArray =[];
            //now calling a loop but using child now as the new parent?
            schemaTreeDataLoop(SOAObj.SOAEntity, childArray, UseFullXPath);
        } else if (SOAObj.SOAEntity !== undefined) {
            //create an array and pretend it is one?
            var SOAEntityArray =[];
            SOAEntityArray.push(SOAObj.SOAEntity);
            var childArray =[];
            schemaTreeDataLoop(SOAEntityArray, childArray, UseFullXPath);
        } else {
            //does this mean there are no children?
            var childArray =[];
        }
        //always push this object into the parentArray
        var formatName = getSchemaObjectFormattedName(SOAObj, UseFullXPath);
        var parentObject = {
            "name": formatName, "children": childArray
        };
        //now to see if I need to add a URL link?
        if (SOAObj.enumeration != null) {
            parentObject.enumeration = SOAObj.enumeration;
        }
        if (SOAObj.RefLink != null) {
            var referenceDataLink = SOAObj.RefLink;
            //console.log('referenceDataLink: ' + referenceDataLink);
            if (referenceDataLink.indexOf('F:') > -1) {
                var refTable = getRefTableFromLink(referenceDataLink);
                var refColumn = getRefColumnFromLink(referenceDataLink);
                var tableLink = {
                    "table": refTable, "column": refColumn
                };
                parentObject.tableLink = tableLink;
            }
        }
        parentArray.push(parentObject);
    }
    return parentArray;
}


function generateSchemaTreeData(SchemaObj, UseFullXPath) {
    var newTreeDataArray =[];
    //console.log('generateSchemaTreeData start');
    console.time('generateSchemaTreeData');
    var resultTreeData = schemaTreeDataLoop(SchemaObj, newTreeDataArray, UseFullXPath);
   //console.log('SchemaObj');
   //console.log(SchemaObj);
   //console.log('resultTreeData');
   //console.log(resultTreeData);
    
    console.timeEnd('generateSchemaTreeData');
    return resultTreeData;
}

function generateMappingTreeData(mappingObject) {
    var newTreeDataArray =[];
    //console.log('generateMappingTreeData start');
    console.time('generateMappingTreeData');
    //console.log(mappingObject);
    var childArray =[];
    for (var i = 0; i < mappingObject.Map.length; i++) {
        //need to create the new name and children json object
        var Map = mappingObject.Map[i];
        var MapId = Map.MapId;
        var DHUBTable = Map.DHUBTable;
        
        var secondchildArray =[];
        if (Map.Column != null) {
            for (var j = 0; j < Map.Column.length; j++) {
                var Column = Map.Column[j];
                if (Column.DHUBNonNullable == 'true') {
                    options = '1..1';
                } else {
                    options = '0..1';
                }
                var secondChildObject = {
                    "name": getMappingObjectFormattedName('green', Column.DHUBColName, Column.SOALink + '-' + Column.DHUBDataType, options)
                };
                secondchildArray.push(secondChildObject);
            }
        }
        if (Map.Reference != null) {
            for (var k = 0; k < Map.Reference.length; k++) {
                var Reference = Map.Reference[k];
                var tableName = Reference.MapId.split(':')[0];
                
                var secondChildObject = {
                    "name": getMappingObjectFormattedName('blue', tableName, Reference.SOALink, '')
                };
                secondchildArray.push(secondChildObject);
            }
        }
        
        var childObject = {
            "name": getMappingObjectFormattedName('blue', DHUBTable, Map.SOALink, Map.SOAMinOccurs + '..' + Map.SOAMaxOccurs), "children": secondchildArray
        };
        childArray.push(childObject);
    }
    var formatName = getMappingObjectFormattedName('parent', mappingObject.ServiceName, mappingObject.Direction, mappingObject.Completed);
    var parentObject = {
        "name": formatName, "children": childArray
    };
    newTreeDataArray.push(parentObject);
    console.timeEnd('generateMappingTreeData');
    return newTreeDataArray;
}

function selectorBySection(macroData, sectionName) {
    if (macroData != null) {
        if (macroData.ServiceMap != null) {
            if (macroData.ServiceMap.Macro != null) {
                if (macroData.ServiceMap.Macro.MacroSection != null) {
                    //its remote maybe valid
                    var MacroSectionList = returnArray(macroData.ServiceMap.Macro.MacroSection);
                    for (var i = 0; i < MacroSectionList.length; i++) {
                        var MacroSection = MacroSectionList[i];
                        //if it matches then step out
                        if (MacroSection.Section != null) {
                            if (MacroSection.Section == sectionName) {
                                return MacroSection;
                            }
                        }
                        if (MacroSection.MacroSection != null) {
                            //we have sub sections
                            var MacroSubSectionList = returnArray(MacroSection.MacroSection);
                            for (var k = 0; k < MacroSubSectionList.length; k++) {
                                var MacroSubSection = MacroSubSectionList[k];
                                //if it matches then step out
                                if (MacroSubSection.Section != null) {
                                    if (MacroSubSection.Section == sectionName) {
                                        return MacroSubSection;
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



function buildSingleMacroHTML(serviceObj) {
    var html = '';
    //console.log(serviceObj);
    html += '<div id="macroHeader" class="macroHeader">';
    html += '<h1>' + serviceObj.FormattedDisplayName + '</h1>';
    //add a button on the right to generate PDFs
    html += '</div>';
    //now lets create a few divs for each section, class="macroaccordion gives me the selector without duplicate IDs
    html += '<div id="macroaccordion" class="macroaccordion">';
    //I know where stuff is so until Long changes it I just need to go and get it all.....
    //start of Service Spec accord...
    
    html += buildReadmeHTML(serviceObj);
    html += '<h3>' + 'Service Links and PDFS' + '</h3>';
    html += '<div>';
    //console.log('macroData');
    //console.log(macroData);
    
    
    
    html += buildServiceExternalLinks(serviceObj);
    html += buildPDFDownloadOptions(serviceObj);
    
    
    
    html += '</div>';
    
    html += '<h3>' + serviceObj.MessagePattern.DisplayName + '</h3>';
    
    var consumerproviderdivId = 'consumerproviderGraphs' + serviceObj.key;
    var consumerGraphDivId = 'consumerGraph' + serviceObj.key;
    var providerGraphDivId = 'providerGraph' + serviceObj.key;
    var consumerTableDivId = 'consumerTable' + serviceObj.key;
    var providerTableDivId = 'providerTable' + serviceObj.key;
    html += '<div id="' + consumerproviderdivId + '">';
    html += '<h4>' + serviceObj.MessagePattern.Request + '</h4>';
    html += '<div id="' + consumerGraphDivId + '"></div>';
    html += '<h4>' + serviceObj.MessagePattern.Response + '</h4>';
    html += '<div id="' + providerGraphDivId + '"></div>';
    html += '<div id="' + consumerTableDivId + '"></div>';
    html += '<div id="' + providerTableDivId + '"></div>';
    html += '</div>';
    html += '<h3>' + 'Service Performance Graphs' + '</h3>';
    var servicePerformanceGraphsDivID = 'serviceperformancegraphs' + serviceObj.key;
    var realtimeGraph = 'serviceperformancegraphsrealtime' + serviceObj.key;
    var hourlyGraph = 'serviceperformancegraphshourly' + serviceObj.key;
    var monthlyGraph = 'serviceperformancegraphsmonthly' + serviceObj.key;
    var consumerGraphContainer = 'serviceperformancegraphsconsumers' + serviceObj.key;
    var consumerGraph1 = 'serviceperformancegraphsconsumer1' + serviceObj.key;
    var consumerGraph2 = 'serviceperformancegraphsconsumer2' + serviceObj.key;
    var consumerGraph3 = 'serviceperformancegraphsconsumer3' + serviceObj.key;
    var status = 'serviceperformancegraphsstatus' + serviceObj.key;
    html += '<div id="' + servicePerformanceGraphsDivID + '">';
    html += '<div id="' + status + '">No Graphs available</div>';
    html += '<div id="' + realtimeGraph + '"></div>';
    html += '<div id="' + hourlyGraph + '"></div>';
    html += '<div id="' + monthlyGraph + '"></div>';
    html += '<div id="' + consumerGraphContainer + '">';
    html += '<div id="' + consumerGraph1 + '"></div>';
    html += '<div id="' + consumerGraph2 + '"></div>';
    html += '<div id="' + consumerGraph3 + '"></div>';
    html += '</div>';
    html += '</div>';
    
    html += '<h3>' + 'Monthly Service Statistics' + '</h3>';
    var monthlyStatsDivID = 'monthlyStats' + serviceObj.key;
    html += '<div id="' + monthlyStatsDivID + '">';
    html += '<h4>Loading...</h4>';
    buildMonthlyStatsHTML(serviceObj, monthlyStatsDivID);
    //console.log('Finished monthly Stats');
    html += '</div>';
    
    
    html += '<h3>' + 'Return Codes & Messages' + '</h3>';
    var errorCodesDivID = 'ErrorCodes' + serviceObj.key;
    html += '<div id="' + errorCodesDivID + '">';
    buildReturnCodesHTML(serviceObj.ServiceName, errorCodesDivID);
    html += '</div>';
    
    /*
    html += '<h3>' + 'Datapower Routing Information' + '</h3>';
    html += '<div>';
    html += 'new';
    html += '</div>';
    
    html += '<h3>' + 'Web Services Definition Language (WSDL)' + '</h3>';
    html += '<div>';
    html += 'new';
    html += '</div>';
     */
    html += '<h3>' + 'Sample XML Messages' + '</h3>';
    var sampleFilesDivID = 'SampleFiles' + serviceObj.key;
    var compassTableId = serviceObj.key + '-compass-logs';
    
    html += '<div id="' + sampleFilesDivID + '">';
    // TODO: This needs to be fixed as it introduces a race condition.
    //       The sampleFilesDivID is not actually created until the end
    //       of this function. buildSampleFilesHTML works at the moment
    //       because of the ajax calls which take long enough to allow
    //       for this function to complete.
    buildSampleFilesHTML(serviceObj.ServiceName, sampleFilesDivID);
    
    html += '<h4>Compass Sample Messages</h4>';
    html += '<table id="' + compassTableId + '" class="accordiontable">';
    html += '<thead>';
    html += '<tr>';
    html += '<th width="8%">Environment</th>';
    html += '<th width="12%">Date/Time</th>';
    html += '<th width="8%">Result</th>';
    html += '<th width="20%">Message</th>';
    html += '<th width="10%">User</th>';
    html += '<th width="20%">Consumer</th>';
    html += '<th width="25%">Identifier</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody></tbody>';
    html += '</table>';
    html += '</div>';
    //end of samples
    html += '</div>';
    //end MacroAccordian
    
    return html;
}
function buildFlatData(SchemaObj, uniqueTreeID, UseFullXPath, refreshMode) {
    console.time('buildFlatData');

    //var treeDataObj = schemaTreeDataLoopTechnicalTest(rootXSD, 'root', 'root', newTreeDataArray, changesArray);    
    var xPathList = SchemaObj.xPathList; 
    console.log(xPathList);
    var html = '';
    for(var i = 0;i<xPathList.length;i++){
        var xPathItem = xPathList[i];
        var newObject = getTreeObjectfromXPathObject(xPathItem, true, true);
        html+=newObject.label;


    }
    //insert this into the object?
    $('#' + uniqueTreeID).html(html);


    
    
    
    console.timeEnd('buildFlatData');
}
function buildTreeData(SchemaObj, uniqueTreeID, UseFullXPath, refreshMode) {
    console.time('buildTreeData');

    //var treeDataObj = schemaTreeDataLoopTechnicalTest(rootXSD, 'root', 'root', newTreeDataArray, changesArray);    
    var jqTreeArray = [];
    var childArray = [];
    var parentArray = [];
    var treeDataObj = xPathList2TreeObject(SchemaObj.xPathList);    
    //var treeDataObj = xPathListTreeDataLoop(SchemaObj.xPathList, jqTreeArray,parentArray, childArray, 0, 0);    
    
    //this could be a schema or a Mapping
    if (treeDataObj != null) {
        //is this IE cause if it is then collpase almost everything?
        var autoOpenNumber = -1;
        if (isIEFlag) {
            autoOpenNumber = 0;
        }
        $(function () {
            $('#' + uniqueTreeID).tree({
                data: treeDataObj,
                selectable: false,
                autoOpen: autoOpenNumber,
                buttonLeft: true,
                autoEscape: false,
                slide: true,
                onCreateLi: function (node, $li) {
                }
            });
        });
        
        if(refreshMode){
            $('#' + uniqueTreeID).tree('loadData', jqTreeArray);    
        }
        
        
        //'tree.dblclick',
        $('#' + uniqueTreeID).bind(
        'tree.dblclick',
        function (event) {
            // The clicked node is 'event.node'
            var node = event.node;
            //alert(node.name);
            //console.log(node);
            if (node.refDataObj != null) {
                schemaTreeToRefDataLink(node.refDataObj);
            } 
        });
    }
    console.timeEnd('buildTreeData');
}

function xPathList2TreeObject(xPathList){
    for (var i = 0;i<xPathList.length;i++){
        var xPathItem = xPathList[i];
        //So if the jqTreeArray is empty this must be the first time ever called?
        var newObject = getTreeObjectfromXPathObject(xPathItem, false, false);
        if(i==0){
            //first ever call this should just create the very first named object...
            var jqTreeArray = [];
            jqTreeArray.push(newObject);
        }else{
            //find the correct parent...
            var matchingDepthObject = returnObjectAtXPathDepth(jqTreeArray, xPathItem, newObject);
        }
    }
    return jqTreeArray;
}


function xPathListTreeDataLoop(xPathList, returnArray, parentArray, childArray, previousDepth, currentIndex) {
    //never process xpathlists in this tree
    //So I never have to worry about the list so much as long as the parent stuff stays in tact...
    //loop until the index is equal to length?
    

    if(currentIndex==xPathList.length){
        return returnArray;
    }else{
        var currentObject = xPathList[currentIndex];
        //if(currentObject.key.indexOf('AddPALProposal choice 1 of 2')!=-1){
        if(currentObject.key.indexOf('PALGroupCode')!=-1){
            
            console.log(currentObject.name);
        }
        //everytime I want to create a new object
        var newObject = getTreeObjectfromXPathObject(currentObject, true, false);
        //var newObject = getTreeObjectfromXPathObject(currentObject, false);
        //now decide if its a child or a prent?
        //Now I need to work out if this is a child or at the same depth or less depth
        var currentDepth = currentObject.depth;
        newObject.depth = currentDepth;
        //go find the previous object that has the currentdepth-1?
        if(currentDepth==1){
            //this is a root element so I need to get back to the parent object?
            returnArray.push(newObject);    
        }else if(currentDepth==previousDepth){
            //I have to push this object under the parent object that I dont have?
            parentArray.push(newObject);
            //keep the same parent array
        }else if(currentDepth>previousDepth){
            childArray.push(newObject);
            parentArray = childArray;
        }else if(currentDepth<previousDepth){
            //go and find the previous object with the right depth?
            //returnArray.length;
            var matchingDepthObjectArray = [];
            var matchingDepthObject = returnObjectAtXPathDepth(returnArray, currentDepth, newObject, matchingDepthObjectArray);
            
            matchingDepthObject.children.push(newObject);
            //So for the nexy loop wahst the correct childarray and the correct parentarray
            
        }else{
            a=shouldneveerhppaen;
            
        }
        
        
        var childArray = newObject.children;
        var newIndex = currentIndex+1;
        
        xPathListTreeDataLoop(xPathList, returnArray, parentArray, childArray, currentDepth, newIndex);
    }
}

function returnObjectAtXPathDepth(jqTreeArray, xPathItem, newObject){
    //fullnamesArray is an array with children arrays
    //loop though everything looking for parent thing that matches this depth?
    //I need to parse this object until I find the depth match and then return the last of the objects in that array? or the array itself
    //get the first name object as the start
    //So I just need to check the depth on the first object
    //get the findObjects named parent
    var findFullName = xPathItem.key.replace('//','');
    var findParentNameArray = findFullName.split('/');
    //now I want the last item and the 
    var lastName = findParentNameArray.pop();
    var findParentNameDepth = '';
    var currentArray = jqTreeArray;
    //if the depth is one then no need to traverse...
    if(xPathItem.depth==1){
        return jqTreeArray.push(newObject);    
    }
    
    //so for each depth I need to get what would be the matched parent name 
    for (var k = 0;k<findParentNameArray.length;k++){
        //get the child?
        findParentNameDepth = findParentNameDepth + '/' + findParentNameArray[k];
        //now for this guys children?

        for (var i = 0;i<currentArray.length;i++){
            var name = '/' + currentArray[i].XPathObject.key.replace('//','');
            if(name==findParentNameDepth){
                //this is the right parent so use it to the next depth
                //is this the end of the line as well?
                if((findParentNameArray.length-1)==k){
                    var resultObject = currentArray[i];

                }else{
                    currentArray = currentArray[i].children;
                }
                break;
            }
        }
    }
    //maybe add this to JQTree Array?
    if(resultObject==null){
        var a=jqTreeArray;
        var b=xPathItem;
        var c=newObject;
        a=thismeansnothigmatchedinthelist;
    }
    return resultObject.children.push(newObject);
}
function getParentXPathName(xPathName){
    //split and drop the last item from the array and return the join...
    var xPathNameArray = xPathName.split('/');
    var parentXPath = xPathNameArray.pop();
    return xPathNameArray.join('/');
}
function getLastXPathName(xPathName){
    //split and drop the last item from the array and return the join...
    var xPathNameArray = xPathName.split('/');
    var parentXPath = xPathNameArray.pop();
    return parentXPath;
}
function loopTillDepthFound(parentArray, matchDepth, findObject){
    //So I just need to check the depth on the first object
    var returnObject = parentArray;
    var name = returnObject[0].name;
    for (var i = 1;i<matchDepth-1;i++){
        //get the child?
        returnObject = returnObject[0].children;
    }
    return returnObject;
}
function loopTillDepthFound2(parentArray, matchDepth, returnObjectArray){
    if(returnObjectArray==null){
        for (var i = 0;i<parentArray.length;i++){
            var rootnameObject = parentArray[i];
            if(rootnameObject.depth==matchDepth){
                returnObjectArray = rootnameObject.children
                break;                
            }else if(rootnameObject.children!=null){
                var matched = loopTillDepthFound2(rootnameObject.children, matchDepth);

            }else{
                //end of the line with no depth match?
                a=thisshouldnthappen;
                return null;
            }
        }
    }else{
        loopTillDepthFound2(rootnameObject.children, matchDepth, returnObjectArray);
    }
    
    return returnObjectArray;
}

function calculateXPathDepth(xPath){
    //sometimes the xpath starts with // so remove them
    for(var i = 0;i<2;++i){
        if(xPath[0]=='/'){
            xPath = xPath.slice(1);
        }
    }
    var xPathArray = xPath.split('/');
    //So what ever the length of this thing return it...
    return xPathArray.length;
    //now split 
}

function isEven(n) {
    return n % 2 == 0;
 }
 
 function isOdd(n) {
    return Math.abs(n % 2) == 1;
 }

function getTreeObjectfromXPathObject(XPathObj, showFullXPathFlag, depthPaddingFlag) {
    //is it a base type?
    //console.log('namedKey:' + namedKey);
    //console.log('parentKey:' + parentKey);
    //console.log(SOAObj);
    var labelName = getLabelName(XPathObj, showFullXPathFlag);
    var returnObject = {};
    returnObject.name = XPathObj.key.replace('//', '');
    returnObject.XPathObject = XPathObj;
    returnObject.children = [];
    var buttonType = getButtonType(XPathObj);
    var html = '';
    
    
    html += '<a class="button ' + buttonType + ' ' + XPathObj.changeType + '">';
    html += '<span class="item">';
    if(depthPaddingFlag){
        for(var i = 1;i<XPathObj.depth;i++){
            html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
        }
    }
    html += labelName;
    html += '</span>';
    if((XPathObj.xsType!=null)&&(showFullXPathFlag!=true)){
        html += '<span class="normal"> - ';
        html += formatxsType(XPathObj.xsType);
        html += '</span>';
    }else if(showFullXPathFlag){
        html += '<span class="normal"> - ';
        html += XPathObj.key;
        html += '</span>';
    
    }

    
    html += '<span class="meta cost">';
    html += XPathObj.cardinality.display;
    html += '</span>';
    html += '</a>';

    returnObject.label = html;
    return returnObject;
}

function formatxsType(xsType){
    var result = xsType;
    if((result=='token')||(result=='normalizedString')||(result=='NMTOKEN')){
        result = 'text (no spaces)';
    }else if((result=='integer')||(result=='long')||(result=='decimal')||(result=='float')||(result=='double')||(result=='int')||(result=='short')||(result=='byte')||(result=='duration')||(result=='unsignedLong')||(result=='unsignedInt')||(result=='unsignedShort')||(result=='unsignedByte')){
        result = 'number';
    }else if((result=='string')||(result=='NMTOKENS')){
        result = 'text';
    }else if(result=='boolean'){
        result = 'flag';
    }else if(result=='date'){
        result = 'date only';
    }else if((result=='dateTime')||(result=='dateTimeStamp')){
        result = 'date and time';
    }else if(result=='time'){
        result = 'time only';
    }else if(result=='gDay'){
        result = 'Day in format ---DD';
    }else if(result=='gMonth'){
        result = 'Month in format --MM';
    }else if(result=='gYear'){
        result = 'Year in format YYYY';
    }else if(result=='gMonthDay'){
        result = 'Month followed by Day in format --MM-DD';
    }else if(result=='gYearMonth'){
        result = 'Year followed by Month in format YYYY-MM';
    }else if((result=='hexBinary')||(result=='base64Binary')){
        result = 'Year followed by Month in format YYYY-MM';
    }else if((result=='anySimpleType')||(result=='anyAtomicType')||(result=='anyAtomicType')){
        result = 'Anything can be placed in this Object';
    }else if(result=='language'){
        result = 'Any language in the format xx (eu)';
    }else if(result=='name'){
        result = 'text in the fomat \i\c*';
    }else if(result=='NCName'){
        result = 'text in the fomat \i\c* ∩ [\i-[:]][\c-[:]]*';
    }else if(result=='nonPositiveInteger'){
        result = 'A negative number including zero';
    }else if(result=='negativeInteger'){
        result = 'A negative number excludng zero';
    }else if(result=='nonNegativeInteger'){
        result = 'A positive number including zero';
    }else if(result=='positiveInteger'){
        result = 'A positive number excludng zero';
    }else if(result=='yearMonthDuration'){
        result = 'A duration usually represented as P2Y6M (P=Period,Y=Year,M=Month)';
    }else if(result=='dayTimeDuration'){
        result = 'A duration usually represented as P1YDT2H (P=Period,D=Day,M=Minutes,H=Hours,T=Time)';
    }else if(result=='duration'){
        result = 'Time durations in format PnYnMnDTnHnMnS';
    }else if(result=='anyURI'){
        result = 'URI (Uniform Resource Identifier)';
    }else if(result=='QName'){
        result = 'Namespaces in XML-qualified names';
    }else if(result=='NOTATION'){
        result = 'Emulation of the XML 1.0 feature';
    }else if(result=='ID'){
        result = 'Definition of unique identifiers';
    }else if(result=='IDREF'){
        result = 'Definition of references to unique identifiers';
    }else if(result=='IDREFS'){
        result = 'Definition of lists of references to unique identifiers';
    }else if(result=='ENTITY'){
        result = 'Reference to an unparsed entity';
    }else if(result=='ENTITIES'){
        result = 'Whitespace-separated list of unparsed entity references';
    }
    
    
    if(result == xsType){
        console.log('Have not yet handled : ' + xsType);
    }
    return upperCaseEveryWord(result);
}

function upperCaseEveryWord(sentence){
    wordsArray = sentence.split(' ');
    for(var i = 0;i<wordsArray.length;i++){
        wordsArray[i] = upperCaseFirstChar(wordsArray[i]);
    }
    return wordsArray.join(' ');
}

function getButtonType(XPathObj){
    var colorOption = 'black';
    //the object can be based from the base or type depending
    objectType = XPathObj.type;     
   
   
    /*based on the type I chnage the button color to one of :
    
    if(XPathObj.xsType!=null){
        objectType = XPathObj.xsType;     
    }else 

    .parent 
    .blue 
    .green 
    .red 
    .black 
    .yellow 
    .pick-up-delivery 
    */
    //create arrays for each of the types and set that to class
    var green = ['green', 'base'];
    var yellow = ['yellow', 'sequence','element'];
    var blue = ['blue', 'choice'];
    var purple = ['purple', 'schema'];
    var allArrays = [green,blue,purple, yellow];
    for(var i = 0;i<allArrays.length;i++){
        var colorArray = allArrays[i];
        for(var k = 1;k<colorArray.length;k++){
            var typeColor = colorArray[k];
            if(typeColor==objectType){
                return colorArray[0];
            }
        }
    }
    console.log('unhandled color option for : ' + objectType);
    return colorOption;
}

function getLabelName(xPathObject, showFullXPathFlag){
    var returnName = xPathObject.key;
    //now get the last item only?
    returnName = getLastXPathName(returnName);

    if(showFullXPathFlag==true){
        //its a techncial view

    }else{
        //do a find on the : and just take everything that follows?
        returnName = formatCamelCaseForHumans(formatStructure(upperCaseFirstChar(returnName)));
    }
    return returnName;
}

function upperCaseFirstChar(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function schemaTreeToRefDataLink(refDataObject) {
    newRefTableTab(refDataObject.table, refDataObject.table);
    $(window).scrollTop(0);
}


function buildTreeAccordion(key, header, headerID, treeID, tabID, SchemaObj, UseFullXPath, refreshMode) {
    if (SchemaObj != null) {
        var html = '';
        html += '<h3 accordionType="schema" id="' + headerID + '" key="' + key + '">' + SchemaObj.FormattedDisplayName + '</h3>';
        html += '<div>';
        html += '<div id="' + treeID + '"></div>';
        html += '</div>';
        html += '</div>';
        //console.log('tabID');
        //console.log(tabID);
        if(refreshMode!=true){
            $("#" + tabID).find('#macroaccordion').append(html);    
        }
        buildTreeData(SchemaObj, treeID, UseFullXPath, refreshMode);
        
    }
}
function buildTreeAccordionFlat(key, header, headerID, treeID, tabID, SchemaObj, UseFullXPath, refreshMode) {
    if (SchemaObj != null) {
        var html = '';
        html += '<h3 accordionType="schema" id="' + headerID + '" key="' + key + '">' + SchemaObj.FormattedDisplayName + '</h3>';
        html += '<div>';
        html += '<div id="' + treeID + '"></div>';
        html += '</div>';
        html += '</div>';
        //console.log('tabID');
        //console.log(tabID);
        if(refreshMode!=true){
            $("#" + tabID).find('#macroaccordion').append(html);    
        }
        buildFlatData(SchemaObj, treeID, UseFullXPath, refreshMode);
        
    }
}
function buildRequestAndResponseSchemas(serviceObj, refreshMode) {
//    console.log('buildRequestAndResponseSchemas');
    console.time('buildRequestAndResponseSchemas');
    
    //I have everything already so I can simplify this down now
    buildChangeLogMappingTree(serviceObj, refreshMode);
    console.timeEnd('buildRequestAndResponseSchemas');
}


function handleMacroData(serviceObject) {
    console.time('handleMacroData');
    //console.log('Successfully got macro data object');
    //console.log(macroData);
    //console.log(serviceObject);
    //console.log('Make sure the macro data is valid');
    if (serviceObject!=null) {
                //forward this onto a generic handler as its a valid chunk now
                //get the tabs object
                //var tabs = $("div#maintab");
                //console.log(tabs);
                
                var num_tabs = $("div#maintab ul li:visible").length + 1;
                //for some reason this tabs count is crazy?
                //console.log('num_tabs:' + num_tabs);
                //if the tab already exists get its index and make it active
                var index = $('div#maintab a[href="#tab' + serviceObject.key + '"]').parent().index();
                //console.log('Index:' + index);
                if (index == -1) {
                    //adding a new tab
                    $("div#maintab ul:first").append(
                    "<li tabType='macro' data-key='removableTab'><a href='#tab" + serviceObject.key + "'>" + serviceObject.FormattedDisplayName + "</a><span class='ui-icon ui-icon-close' role='presentation'></li>");
                    //before I append call to a new function to create the html as this could go crazy!
                    var singleMacroHTML = buildSingleMacroHTML(serviceObject);
                    $("div#maintab").append(
                    "<div id='tab" + serviceObject.key + "' data-key='removableTab'>" + singleMacroHTML + "</div>");
                    
                    //lets function up the creation of schema data to tree data
                    buildRequestAndResponseSchemas(serviceObject, false);
                    //I need to add these back in soon....
                    //buildCAPMSequenceDiagramsHTML(serviceObject, serviceObject.key);
                    buildCAPMCosumerProviderGraphsHTML(serviceObject);
                    //only build this if I have a CAPM object
                    if(serviceObject.CAPM!=null){
                        buildCAPMServiceGraphsHTML(serviceObject);
                    }
                    
                    
                    buildCompassFilesTableData(serviceObject, serviceObject.key + '-compass-logs');
                    
                    $(".macroaccordion").accordion({
                        heightStyle: "content",
                        collapsible: true,
                        active: false
                    });
                    $(".macroaccordion").accordion("refresh");
                    //pdf items
                    
                    $( "#pdfSelect" + serviceObject.key ).selectmenu({
                         classes: {
                           "ui-selectmenu-button": "ui-button-icon-only demo-splitbutton-select"
                         },
                         change: function(){
                            //console.log('the selection changed');
                            $( ".pdfCreateButton" ).text(this.value);
                         }
                   });
                   $( ".controlgroup" ).controlgroup();
                   $( ".pdfCreateButton" ).click(function() {
                         createPDFButton(serviceObject.ServiceNumber, serviceObject.ServiceName, serviceObject.SchemaVersionNumber, serviceObject);
                         
                   });
                    
                    $(".checkboxradio").checkboxradio({
                        icon: true
                    });
                    $( "fieldset.vertical" ).controlgroup({
                        direction: "vertical"
                    });
                    $( "fieldset.horizontal" ).controlgroup({
                        
                    });
                    $('#pdfReferenceData' + serviceObject.key).bind('change', function(){
                        if($(this).is(':checked')){
                            //console.log('box was checked');
                            referenceDataTimingResponse(serviceObject.key);
                        }else{
                            $('#pdfMessages' + serviceObject.key).text('');
                        }
                    });
                    
                    //simple selector to copy the text into the clipboad
                    $( "#copyURLToClipboardButton" + serviceObject.key).click(function() {
                        //have to select the text?
                        var copyTextarea = $( "#copyURLToClipboardText" + serviceObject.key);
                        var copyText = copyTextarea.val();
                        copyTextarea.focus();
                        copyTextarea.select();
                        
                        //console.log($("#alert").length);
                        
                        //now I want to show my own modal dialog?
                        
                        //end of testing
                        try {
                             var successful = document.execCommand('copy');
                             var msg = successful ? 'successful' : 'unsuccessful';
                             copyTextarea.blur();
                             clipboardDialog('Successful Copy To Clipboard', 'Copied the URL to your clipboard...');
                             //alert('Copying text command was ' + msg);
                           } catch (err) {
                             //alert('Oops, unable to copy');
                             errorDialog('Error in Copy', 'Oops, unable to copy..Maybe its the browser?');
                         }
                    });
                    //scroll to top now
                    scrollToMenus();
                    //this has to be done after I have painted all mermaid digrams
                    initMermaid();
                    
                    //add a close button onto this tab?
                    // Close icon: removing the tab on click
                    //$("div#maintab").maintab("refresh");
                    //console.log('refresh');
                    $("div#maintab").on("click", "span.ui-icon-close", function () {
                        //console.log('click event occured');
                        //console.log('Logging this object:');
                        //console.log(this);
                        var panelId = $(this).closest("li").remove().attr("aria-controls");
                        //console.log(panelId);
                        $("#" + panelId).remove();
                        
                        //$( "div#maintab" ).tabs( "option", "active", 0);
                        setTabInitialState();
                        $("div#maintab").tabs("refresh");
                    });
                    //console.log('click added');
                    $("div#maintab").on("keyup", function (event) {
                        //console.log('keyup event occured');
                        if (event.altKey && event.keyCode === $.ui.keyCode.BACKSPACE) {
                            var panelId = $("div#maintab").tabs.find(".ui-tabs-active").remove().attr("aria-controls");
                            $("#" + panelId).remove();
                            $("div#maintab").tabs("refresh");
                        }
                    });
                    //console.log('keyup added');
                    
                    $("div#maintab").tabs("refresh");
                    //console.log('Refreshing tabs');
                    //console.log('Forcing latest created tab to be active at index:' + (num_tabs-1));
                    $("div#maintab").tabs("option", "active", num_tabs -1);
                    //$( "div#maintab" ).tabs( "option", "active", num_tabs-1);
                    $("div#maintab").tabs("refresh");
                } else {
                    //make this tab the active one
                    //console.log('make this tab the active one');
                    $("div#maintab").tabs("option", "active", index);
                }
            
    } else {
        console.log('The ServiceObject is null');
    }
    console.timeEnd('handleMacroData');
}

function serviceListDialog(displayHTML, tablename) {
    //console.log(displayHTML);
    $("#div-service-list").html(displayHTML);
    var titleMsg = 'Services that Reference ' + tablename;
    var serviceListDialog = $("#div-service-list").dialog({
        title: titleMsg,
        resizable: false,
        modal: true,
        draggable: false,
        closeOnEscape: true,
        minWidth: 800,
        maxHeight: 800,
        position: {
            my: "centre top",
            at: "centre top",
            of: window,
            collision: "none"
        },
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        }
    });
    $('.closeLink').click(function () {
        $("#div-service-list").dialog('close');
    });
}
function clipboardDialog(title, htmlcontent) {
    $("#div-dialog-clipboard").html(htmlcontent);
    $("#div-dialog-clipboard").dialog({
        title: title,
        resizable: false,
        modal: true,
        closeOnEscape: true,
        width: 300,
        position : {my: "top",
                    at: "center"},
        show: {effect:"slide", direction:"up"}, 
        hide: {effect:"slide", direction:"down"},
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        },
        open: function() {
            var foo = $(this);
            
            setTimeout(function() {
               foo.dialog('close');
            }, 1500);
        }
    });
}
function errorDialog(title, htmlcontent) {
    $("#div-dialog-warning").html(htmlcontent);
    $("#div-dialog-warning").dialog({
        title: title,
        resizable: false,
        modal: true,
        closeOnEscape: true,
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        }
    });
}

function newMacroTab(releaseName, serviceModelName, key) {
    //This is now a query string of variables....
    tabKey = removalallspecialcahars;
    var qs = '[name="'+ releaseName +'"].serviceModels[name="'+ serviceModelName + '"].models[key="' + key + '"]';
    //console.log('newMacroTab: ' + key);
    //is there any way of getting the existing tab?
    //if the tab already exists get its index and make it active
    //console.log('uniqueName:' + uniqueName);
    

    var index = $('div#maintab a[href="#tab' + key + '"]').parent().index();
    if (index != -1) {
        //console.log('make this tab the active one');
        $("div#maintab").tabs("option", "active", index);
    } else {
        console.time('newMacroTab');
        showLoadingBlock();
        var serviceObject = getServiceObjectByKey(key);
        
        
        handleMacroData(serviceObject);
        hideLoadingBlock(-1);
    }
}

function getMacroLink(display, key, callBackURL, serviceModelName, releaseName, linkClass) {
    //##TODO    http://u7019997:3000/getJsonQuery/serviceRepository[name='JUN19'].serviceModels[name='Provider'].models[different!=false][ServiceNumber!='CORE'].xPathList[changeType!='same']
    
    var result = '<a class=" servicelink'+ ' '+ serviceModelName + ' ' + ' '+ releaseName + ' ' + linkClass + '" href="#tabs-2" key="' + key + '" callBackURL="' + callBackURL + '">' + display + '</a>';
    return result;
}


function displayalternateExposureList(alternateExposureList) {
    var alternateExposure = alternateExposureList.alternateExposure;
    listCount = alternateExposure.length;
    var qs = $('input#alternateExposureListSearch').quicksearch('table#alternateExposureListTable tbody tr', {
        noResults: '#alternateExposureListnoresults',
        selector: 'td',
        stripeRows:[ 'odd', 'even'],
        loader: 'span.loading',
        bind: 'keyup click input'
    });
    if (listCount > 0) {
        //do something
        for (i = 0; i < listCount; i++) {
            
            var alternateExposureEntry = alternateExposure[i];
            $('tbody#alternateExposureListTableBody').append('<tr><td>' + alternateExposureEntry.name + '</td><td>' + alternateExposureEntry.description + '</td></tr>');
        }
    } else {
        $('tbody#alternateExposureListTable').empty();
    }
    qs.cache();
}

function displayconsumerList(consumerList) {
    var consumer = consumerList.consumer;
    listCount = consumer.length;
    var qs = $('input#consumerListSearch').quicksearch('table#consumerListTable tbody tr', {
        noResults: '#consumerListnoresults',
        selector: 'td',
        stripeRows:[ 'odd', 'even'],
        loader: 'span.loading',
        bind: 'keyup click input'
    });
    if (listCount > 0) {
        //do something
        for (i = 0; i < listCount; i++) {
            
            var consumerEntry = consumer[i];
            $('tbody#consumerListTableBody').append('<tr><td>' + consumerEntry.name + '</td><td>' + consumerEntry.description + '</td></tr>');
        }
    } else {
        $('tbody#consumerListListTable').empty();
    }
    qs.cache();
}

function displayproviderList(providerList) {
    var provider = providerList.provider;
    listCount = provider.length;
    var qs = $('input#providerListSearch').quicksearch('table#providerListTable tbody tr', {
        noResults: '#providerListnoresults',
        selector: 'td',
        stripeRows:[ 'odd', 'even'],
        loader: 'span.loading',
        bind: 'keyup click input'
    });
    if (listCount > 0) {
        //do something
        for (i = 0; i < listCount; i++) {
            
            var providerEntry = provider[i];
            $('tbody#providerListTableBody').append('<tr><td>' + providerEntry.name + '</td><td>' + providerEntry.description + '</td></tr>');
        }
    } else {
        $('tbody#providerListListTable').empty();
    }
    qs.cache();
}

function resolveFunctionType(type) {
    var result = type;
    if (type == 'REF') {
        result = 'Reference Data';
    }
    return result;
}

function resolveUndefined(stringObj) {
    var result = stringObj;
    if (stringObj == undefined) {
        result = '';
    }
    return result;
}

function resolvetoURLLink(field, name) {
    var result = field;
    if (field == undefined) {
        result = '';
    } else if (field == '') {
        result = '';
    } else {
        result = '<a href="' + field + '" target="_blank">' + name + '</a>';
    }
    return result;
}

function getRefTableLink(display, tableName) {
    var cacheBuster = getCacheBuster();
    var jsonDataLink = tableName.toLowerCase() + '.json?' + 'buildNumberCache=' + cacheBuster;
    var result = '<a href="#tabs-2" id="my-text-link2" onclick="newRefTableTab(\'' + tableName + '\',\'' + jsonDataLink + '\')">' + display + '</a>';
    return result;
}



function newRefTableTab(uniqueName, jsonLink) {
    console.time('newRefTableTab');
    var cacheBuster = getCacheBuster();
    //console.log(globalSelectedRelease);
    //I have the CRT data loaded but need to access the global for this to work ok...Then add a function to get by unique name...
    //console.log(uniqueName);
    var tableObj = getTableObjectByName(uniqueName);
    //console.log(tableObj);
    
    //now find the table for that key?
    
    
    //console.log(jsonLinkRel);
    //I should call the ajax data then load the page as if i didnt know this was even here?
    var index = $('div#maintab a[href="#tab' + uniqueName + '"]').parent().index();
    if (index != -1) {
        //console.log('make this tab the active one');
        $("div#maintab").tabs("option", "active", index);
    } else {
        handleRefTableData(tableObj);
    }
}

function handleRefTableData(refTableData) {
    //console.log('handleRefTableData');
    console.time('handleRefTableData');
    //console.log(refTableData);
    if((refTableData.name!=null)&&(refTableData.columns!=null)&&(refTableData.columns.length!=null)) {
        var num_tabs = $("div#maintab ul:first li:visible").length + 1;
        //console.log('num_tabs:' + num_tabs);
        var uniqueName = refTableData.name;
        //if the tab already exists get its index and make it active
        var index = $('div#maintab a[href="#tab' + uniqueName + '"]').parent().index();
        //console.log('Index:' + index);
        if (index == -1) {
            $("div#maintab ul:first").append(
                "<li data-key='removableTab'><a href='#tab" + uniqueName + "'>" + uniqueName + "</a><span class='ui-icon ui-icon-close' role='presentation'></li>");
                //before I append call to a new function to create the html as this could go crazy!
                var singleRefTableHTML = buildSingleRefTableHTML(refTableData);
                $("div#maintab").append(
                "<div id='tab" + uniqueName + "' data-key='removableTab'>" + singleRefTableHTML + "</div>");
                $("div#maintab").on("click", "span.ui-icon-close", function () {
                    //console.log('click event occured');
                    var panelId = $(this).closest("li").remove().attr("aria-controls");
                    //console.log(panelId);
                    $("#" + panelId).remove();
                    
                    //$( "div#maintab" ).tabs( "option", "active", 0);
                    setTabInitialState();
                    $("div#maintab").tabs("refresh");
                });
                //console.log('click added');
                $("div#maintab").on("keyup", function (event) {
                    //console.log('keyup event occured');
                    if (event.altKey && event.keyCode === $.ui.keyCode.BACKSPACE) {
                        var panelId = $("div#maintab").tabs.find(".ui-tabs-active").remove().attr("aria-controls");
                        $("#" + panelId).remove();
                        $("div#maintab").tabs("refresh");
                    }
                });
                //console.log('keyup added');
                
                $("div#maintab").tabs("refresh");
                //console.log('Refreshing tabs');
                //console.log('Forcing latest created tab to be active at index:' + (num_tabs-1));
                $("div#maintab").tabs("option", "active", num_tabs -1);
                //$( "div#maintab" ).tabs( "option", "active", num_tabs-1);
                $("div#maintab").tabs("refresh");
                //setup the Search Results key for the reference data
                var qs = $('input#refDataListSearch' + uniqueName).quicksearch('table#refDataListTable' + uniqueName + ' tbody tr', {
                    noResults: '#refDataListListnoresults' + uniqueName,
                    selector: 'td',
                    stripeRows:[ 'odd', 'even'],
                    loader: 'span.loading',
                    bind: 'keyup click input'
                });
                //console.log('qs cached');
                qs.cache();
            } else {
                //make this tab the active one
                //console.log('make this tab the active one');
                $("div#maintab").tabs("option", "active", index);
            }
         
    } else {
        //console.log('The RefDataTable is undefined');
    }
    console.timeEnd('handleRefTableData');
}

//reference data builder
function buildSingleRefTableHTML(refTableData) {
    var html = '';
    
    html += '<h1>' + refTableData.name + '</h1>';
    html += '<form action="" name="refDataListForm' + refTableData.name + '">';
    html += '<fieldset>';
    html += '<input type="text" name="refDataListSearch' + refTableData.name + '" value="" id="refDataListSearch' + refTableData.name + '" /> <span class="loading">Loading...</span>';
    html += '</fieldset>';
    html += '</form>';
    
    //now lets create a table for each entity?
    if((refTableData!=null)&&(refTableData.columns!=null)&&(refTableData.columns.length>0)) {
        //do something with this
        html += '<table class="mytable" id="refDataListTable' + refTableData.name + '">';
            html += '<thead><tr>';
            var colList = returnArray(refTableData.columns);
            var colListLength = colList.length;
            //console.log(rowList);
            for (var i = 0; i < colListLength; i++) {
                html += '<th>' + colList[i].name + '</th>';
            }
            html += '<tbody id="refDataListTableBody' + refTableData.name + '">';
            html += '<tr id="refDataListListnoresults' + refTableData.name + '">';
            html += '<td colspan="6">No Results</td>';
            html += '</tr>';
                    
            //now I need to loop though each row getting the values for each column?
            var dataLength = colList[0].data.length;
            for (var k = 0;k<dataLength; k++) {
                //new row per data
                html += '<tr>';
                for (var m = 0; m < colListLength; m++) {
                    html += '<td>';
                    html += colList[m].data[k];    
                    html += '</td>';
                }
                html += '</tr>';
            }
            
            
            html += '</tbody>';
            html += '</thead></tr>';
            html += '</table>';
            //now I should see if this has service references?
            //console.log(refTableData);
            //a=referencestoservices;
            
            html += '<table width="50%" class="xxmytable" id="refDataListTable' + refTableData.name + 'ServiceList">';
            html += '<thead>'
            html += '<tr>';
            html += '<th>';
            html += 'Used in Service';
            html += '</th>';
            html += '<th>';
            html += 'Used by Field';
            html += '</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody id="refDataListTableBody' + refTableData.name + 'ServiceList">';
            if((refTableData.services!=null)&&(refTableData.services.length>0)){
                for(var t = 0;t<refTableData.services.length;t++){
                    html += '<tr>';
                    html += '<td>';
                    var service = refTableData.services[t];
                    var serviceLink =  getMacroLink(service.FormattedDisplayName, service.key,service.callBackURL);
                    html+= serviceLink;
                    html += '</td>';
                    html += '<td>';
                    //now loop through each field
                    if((service.xPathList!=null)&&(service.xPathList.length>0)){
                        for(var x = 0;x<service.xPathList.length;x++){
                            var field = service.xPathList[x];
                            //console.log(field);
                            var cardinalityObject = getCardinality(field);
                            html+=field.name;
                            if(field.enumeration!=null){
                                html+=' (Enumerated with values : ' + field.enumerationString + ') ';
                            }else{
                                html+=' (' + field.xsType + ') ';
                            }
                            html+= 'is '+ cardinalityObject.display + ' in object ' + field.parentName
                            if(field.changeType!='same'){
                                html+=' (changed in release ' + globalSelectedRelease.releaseName +')';        
                            }
                            html+='<br>';
                        }
                    }
                    html += '</td>';
                    html += '</tr>';
                }
            }
            //now a new row per service
            html += '</body>';
            
    }
    return html;
}

function buildChangeLogMappingTree(serviceObject, refreshMode){
    console.time('buildChangeLogMappingTree');
    var tabID = 'tab' + serviceObject.key;
    var release = serviceObject.release;
    //now I have a number of schemas?
    //console.log(serviceObject);
    var schemaList = serviceObject.schemaList;
    var schemaListCount = schemaList.length;
    //check if the macro has already been processed?
    //now the serviceObject will have the macro populated
    for (var i=0;i<schemaListCount;i++) {
        var schemaObject = schemaList[i];
        //I need the root element now to process the tree data
        
        
        var headerID = 'header' + schemaObject.key;
        var treeID = 'tree' + schemaObject.key;
        
        buildTreeAccordion(serviceObject.key, schemaObject.xPathList, headerID, treeID, tabID, schemaObject, false, refreshMode);
        var headerID = 'headerFlat' + schemaObject.key;
        var treeID = 'treeFlat' + schemaObject.key;
        //Myabe I build this and then hide i later?
        //buildTreeAccordionFlat(serviceObject.key, schemaObject.xPathList, headerID, treeID, tabID, schemaObject, false, refreshMode);


        //a=buildit;
        if(refreshMode!=true){
            appendAccordionHeader(headerID, ' Loading...', '');    
        }
        if(schemaObject.xsdParsed!=true){
            $('#' + headerID + '> span').html(' (Changes have not yet been loaded for ' + serviceObject.release.releaseName + ')');
        }else if((schemaObject.changeList!=null)&&(schemaObject.changeList.length>0)){
            $('#' + headerID + '> span').html(' (Has changes for ' + serviceObject.release.releaseName + ')');
        }
        else{
            //$('#' + headerID + '> span').html(' (No changes for ' + serviceObject.release.releaseName + ')');
            $('#' + headerID + '> span').html('');
        }
    }
    console.timeEnd('buildChangeLogMappingTree');
}

function removeNonChangedElements(entityArray) {
    for (var i = 0; i < entityArray.length; i++) {
        if (entityArray[i].change == null) {
            // no change, remove from the array
            entityArray.splice(i, 1);
            i = i - 1;
        } else if (entityArray[i].SOAEntity != null) {
            if (entityArray[i].SOAEntity.length == null) {
                // single child element, mock an array
                removeNonChangedElements([entityArray[i].SOAEntity]);
            } else {
                removeNonChangedElements(entityArray[i].SOAEntity);
            }
        }
    }
}



function loadMappingLink(uniqueName, macroData) {
    console.time('loadMappingLink');
    var url = getSelectedRelease().releaseLocation + 'dhubMappings/';
    var jsonLinkRel = url + 'mapProperties.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    //console.log(jsonLinkRel);
    //I should call the ajax data then load the page as if i didnt know this was even here?
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            
            //console.log(data);
            dhubMappingCheck(uniqueName, macroData, data);
            //hideLoadingBlock(-1);
            console.timeEnd('loadMappingLink');
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            //errorDialog("Error in fetching Reference json Data", "<h3>Status: " + textStatus + "</h3><br>" + "Error: " + errorThrown + '<br>' + jsonLinkRel);
        }
    });
}

function getRootElements(macroData) {
    //this function gets the root elements and returns a new json data
    console.time('getRootElements');
    //console.log(macroData);
    var responseRootElement = 'unknown';
    var requestRootElement = 'unknown';
    
    var requestObject = (((macroData||{
    }).ServiceMap||{
    }).Macro||{
    }).Schema;
    
    var responseObject = (((macroData||{
    }).ServiceMap||{
    }).Macro||{
    }).Schema;
    
    if (requestObject != null) {
        if (requestObject.RequestSOAEntities != null) {
            if (requestObject.RequestSOAEntities.SOAEntity[1] != null) {
                if (requestObject.RequestSOAEntities.SOAEntity[1].SOALink != null) {
                    requestRootElement = requestObject.RequestSOAEntities.SOAEntity[1].SOALink;
                }
            }
        }
    }
    if (responseObject != null) {
        if (responseObject.ResponseSOAEntities != null) {
            if (responseObject.ResponseSOAEntities.SOAEntity[1] != null) {
                if (responseObject.ResponseSOAEntities.SOAEntity[1].SOALink != null) {
                    var responseRootElement = responseObject.ResponseSOAEntities.SOAEntity[1].SOALink;
                }
            }
        }
    }
    
    //var rootElements = '{"requestRootElement":"' + requestRootElement + '", "responseRootElement":"' + responseRootElement + '"}';
    var rootElements = new Object();
    rootElements.requestRootElement = requestRootElement;
    rootElements.responseRootElement = responseRootElement;
    console.timeEnd('getRootElements');
    return rootElements;
}

function dhubMappingCheck(uniqueName, macroData, mappingListData) {
    console.time('dhubMappingCheck');
    //console.log('mappingListData');
    //console.log(mappingListData);
    //now that I have the mapping list I need to check if there is a mapping for this macro?
    if (mappingListData != null) {
        if (mappingListData.DHUBMappingLocations != null) {
            if (mappingListData.DHUBMappingLocations.DHUBMapping != null) {
                var DHUBMapping = returnArray(mappingListData.DHUBMappingLocations.DHUBMapping);
                //console.log(DHUBMapping);
                //console.log(macroData);
                var ServiceId = macroData.ServiceNumber;
                var SchemaVersionNumber = macroData.SchemaVersionNumber;
                var ServiceName = macroData.ServiceName;
                
                //now find the service id
                for (i = 0; i < DHUBMapping.length; i++) {
                    var DHUBMap = DHUBMapping[i];
                    var number = DHUBMap.number;
                    if (number == ServiceId) {
                        if (DHUBMap.Service != null) {
                            //there could be two of them?
                            var version = DHUBMap.version;
                            //So I really need to just get the root element from the request passed in rather than MacroData as a whole?
                            if (version.toLowerCase() == SchemaVersionNumber.toLowerCase()) {
                                //if everything else matches its time to get the root elements and see if either of these match
                                var rootElements = getRootElements(macroData);
                                var serviceList = returnArray(DHUBMap.Service);
                                var location = DHUBMap.location;
                                //console.log(rootElements.requestRootElement);
                                //console.log(rootElements.responseRootElement);
                                //console.log(serviceList);
                                //there is an array of names?
                                
                                $.each(serviceList, function (index, dhubService) {
                                    if ((dhubService.name.toLowerCase() == rootElements.requestRootElement.toLowerCase()) ||(dhubService.name.toLowerCase() == rootElements.responseRootElement.toLowerCase())) {
                                        //console.log('MAPPING FOUND');
                                        getDHUBMappingTree(uniqueName, macroData, DHUBMap);
                                        
                                        //exit this for loop once one mapping found and generate tree data?
                                    }
                                });
                                return false;
                            }
                        }
                    }
                }
            }
        }
    }
}


function getDHUBMappingTree(uniqueName, macroData, DHUBMap) {
    console.time('getDHUBMappingTree');
    //TODO as this mapping needs a new home? Maybe pull the mappings from latest dhub?
    var url = getSelectedRelease().releaseLocation + 'dhubMappings/';
    //there might be two mappings so add them to array?
    var serviceList = returnArray(DHUBMap.Service);
    var allRequests =[];
    for (i = 0; i < serviceList.length; i++) {
        var service = serviceList[i];
        var urlLocation = url + DHUBMap.location + '/' + service.name + '.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
        allRequests.push($.getJSON(urlLocation));
    }
    var requests = $.unique(allRequests);
    var defer = $.when.apply($, requests);
    defer.done(function () {
        //console.log('defer finished');
        //what data do I have back?
        //console.log('arguments');
        //console.log(arguments[0]);
        //console.log(arguments[1]);
        //each arguments is array of 3 where index 1 is the result
        //console.log(arguments[0][1]);
        var newarguments = returnArray(arguments);
        for (k = 0; k < newarguments.length; k++) {
            var argument = newarguments[k];
            //console.log('argument');
            //console.log(argument);
            if (argument[1] == 'success') {
                buildDHUBMappingTree(uniqueName, macroData, argument[0]);
            } else {
                console.log("Error in fetching DHUB Mapping json Data", "<h3>Status: Failed</h3><br>" + "Error: " + argument[1] + '<br>' + argument[0]);
            }
        }
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.log('getDHUBMappingTree fail!', jqXHR, textStatus, errorThrown);
        hideLoadingBlock(-1);
    });
}

function buildDHUBMappingTree(uniqueName, macroData, mappingData) {
    console.time('buildDHUBMappingTree');
    //console.log('mappingData');
    //console.log(mappingData);
    
    var direction = mappingData.Direction;
    var requestTreeID = 'DHUB' + direction + 'Tree' + uniqueName;
    var tabID = 'tab' + uniqueName;
    var requestHeader = 'DHUB ' + direction + ' Mapping';
    
    //I need to make sure the SOAEntity object isnt undefined
    var requestObject = (((macroData||{
    }).ServiceMap||{
    }).Macro||{
    }).Schema;
    if (requestObject != null) {
        if (requestObject.RequestSOAEntities != null) {
            var requestSchemaObj = requestObject.RequestSOAEntities;
            buildTreeAccordion(requestHeader, requestTreeID, tabID, mappingData);
        }
    }
    //might need a accordion refresh
    $(".macroaccordion").accordion("refresh");
    console.timeEnd('buildDHUBMappingTree');
}

//New section to build a generic accordion with search
function buildServiceImplementationListAccordion(serviceConfigRequestObjectList) {
    //console.log('buildServiceImplementationListAccordion');
    console.time('buildServiceImplementationListAccordion');
    var status = 0;
    var statusText = 'Unknown';
    //console.log(serviceConfigRequestObjectList);
    //console.log('Logging');
    //console.log(serviceConfigRequestObjectList[0][0]);
    //console.log(serviceConfigRequestObjectList[1][0]);
    
    var validserviceConfigRequestList =[];
    if (serviceConfigRequestObjectList != null) {
        $.each(serviceConfigRequestObjectList, function (index, serviceConfigRequestObject) {
            var configFile = serviceConfigRequestObject[0];
            if ((configFile != null) &&(configFile.ServiceConfig != null) &&(configFile.ServiceConfig.Service != null)) {
                var servicesList = returnArray(configFile.ServiceConfig.Service);
                $.each(servicesList, function (i, servicesObject) {
                    //add this object to the list?
                    validserviceConfigRequestList.push(servicesObject);
                });
            }
        });
    }
    //now I can process this into a list
    var id = 'serviceImplementationList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    var changeCount = 0;
    var thHTML = buildServiceImplementationListTH();
    var divhtml = buildAccordionDivWithSearch(id, thHTML);
    $('#' + headerID).text('Service Implementation');
    $('#' + contentID).html(divhtml);
    var serviceConfigCount = validserviceConfigRequestList.length;
    var policyCount = 0;
    if (serviceConfigCount > 0) {
        var htmlBody = '';
        $.each(validserviceConfigRequestList, function (index, serviceConfig) {
            if ((serviceConfig.MsgIdentifier != null) &&(serviceConfig.MsgIdentifier.Action != null) &&(serviceConfig.MsgIdentifier.Action.$ != null)) {
                var parentAction = $undefinedToEmpty(serviceConfig.MsgIdentifier.Action);
            } else {
                var parentAction = '';
            }
            if (serviceConfig.PolicyConfig != null) {
                var policyList = returnArray(serviceConfig.PolicyConfig);
            }
            
            $.each(policyList, function (i, policy) {
                var id = serviceConfig.id;
                var policyid = undefinedToEmpty(policy.id);
                if (policyid.indexOf('_VERIFY_') == -1) {
                    var description = $undefinedToEmpty(policy.Description);
                    htmlBody += '<tr><td>' + id + '</td><td>' + parentAction + '</td><td>' + policyid + '</td><td>' + description + '</td></tr>';
                    policyCount++
                    //console.log(policy);
                }
            });
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        $('#' + id + 'SearchLabel').text('Currently listing ' + policyCount + ' policies.');
        appendAccordionHeader(headerID, policyCount + ' service policies');
    } else {
        appendAccordionHeader(headerID, 'No policeis found');
        $('#' + id + 'SearchLabel').text('No change lists found.' + ' Error : ' + statusText + ' - Code : ' + status);
    }
    //set a few variables for the names of things
    
    //finish with an accordion refresh
    
    $("#serviceArchitectureAccordion").accordion("refresh");
    
    console.timeEnd('buildServiceImplementationListAccordion');
}

function appendAccordionHeader(headerID, text, buildText) {
    $('#' + headerID).children('span').remove();
    $('#' + headerID).append('<span class="h3subtext">' + text + '</span>');
    if((buildText!==null)&&(buildText!=undefined)&&(buildText!='')){
        $('#' + headerID).append('<span class="h3buildtext">' + buildText + '</span>');    
    }
    
    
}

function getHasChangesFlag(techChangeObject) {
    if (techChangeObject == null) {
        return false;
    } else {
        //by passeed until rods bug is fixed
        return ((techChangeObject.modified != '0') ||(techChangeObject.inserted != '0') ||(techChangeObject.deleted != '0') ||(techChangeObject.enumerations != '0') ||(techChangeObject.cardinality != '0') ||(techChangeObject.refLink != '0') ||(techChangeObject.minLength != '0') ||(techChangeObject.maxLength != '0') ||(techChangeObject.pattern != '0') ||(techChangeObject.newMacro != false));
        //return ((techChangeObject.inserted!='0')||(techChangeObject.enumerations!='0')||(techChangeObject.modified!='0'));
    }
}
function getMajorChangesFlag(techChangeObject) {
    if (techChangeObject == null) {
        return false;
    } else {
        //by passeed until rods bug is fixed
        return ((techChangeObject.modified != '0') ||(techChangeObject.inserted != '0') ||(techChangeObject.deleted != '0') ||(techChangeObject.newMacro != false));
        //return ((techChangeObject.inserted!='0')||(techChangeObject.enumerations!='0')||(techChangeObject.modified!='0'));
    }
}

function releaseObjectValid(releaseObjects){
    
if ((releaseObjects==null)||(releaseObjects.files==null)||(releaseObjects.files.fileList==null)){
        return false;
    }
    return true;
}

function calculateSortOder(currentSO){
    
    var sortMajor = currentSO.majorChangeCount*1000000;
    var sortMinor = currentSO.minorChangeCount*1000;
    var sortEnum = currentSO.emumerationChangeCount*10;
    var sortRef = currentSO.refDataChangeCount*1;
    var sortOrder = -1 * (sortMajor + sortMinor + sortEnum + sortRef);
    return sortOrder;
    
}
//New section to build a generic accordion with search
function buildServiceChangeListAccordion(serviceSummaryObj) {
    //console.log('buildServiceChangeListAccordion');
    console.time('buildServiceChangeListAccordion');
    //console.log(serviceChangesArray);
    //can I format this object correctly through the compare?
    //only do this if its the right object?
    var status = 0;
    var statusText = 'Unknown';
    if (serviceChangesArray!=null){
        status = '200';
        statusText = 'Success'
    }else{
    }
    
    //regardless I want to build the accordion
    var id = 'serviceChangeList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    var changeCount = 0;
    
    var thHTML = buildServiceChangeListTH();
    var divhtml = buildAccordionDivWithSearch(id, thHTML);
    
    var release = globalSelectedRelease;
    var releaseName = release.releaseName.toLowerCase();
    $('#' + headerID).text('Schema Changes');
    $('#' + contentID).html(divhtml);
    var sortedChanges = [];
    
    if((serviceSummaryObj!=null)&&(serviceSummaryObj.summaryList!=null)&&(serviceSummaryObj.summaryList.length>0)){
        var serviceChangesArray = serviceSummaryObj.summaryList;
        //start creating the table information
        var htmlBody = '';
        var totalMajorChanges = 0;
        var totalMinorChanges = 0;
        var totalNewServicesCount = 0;
        var totalNewServicesVersionCount = 0;
        var totalDocumentationChanges = 0;
        for (var i = 0; i < serviceChangesArray.length; i++) {
            var currentSO = serviceChangesArray[i];
            currentSO.minorCount = 0;
            currentSO.majorCount = 0;
            currentSO.changesEnumerationOnlyFlag = true;
            if(currentSO.ServiceNumber!='CORE'){
                if(currentSO.different==true){
                    //console.log(currentSO.key);
                    if(currentSO.IsNew==true){
                        currentSO.sortOrder = -1000000000000000000000;
                    }else if(currentSO.VersionChange==true){
                        currentSO.sortOrder = -1000000000000000000;
                    }else{
                        currentSO.sortOrder = calculateSortOder(currentSO);
                        
                    }
                    sortedChanges.push(currentSO);
                    //this is simple now as I have the counts
                }
            }
        }
        //console.log(sortedChanges);
        forceSortArray(sortedChanges, 'sortOrder', false, function (cI, cO) {
            //console.log(cO);
            var changeMsg = '';
            if(cO.IsNew){
                cO.majorClass = 'newcell';
                cO.changeMsgClass = 'newcell';
                changeMsg = 'New Service for this Release';
                totalNewServicesCount++;
            }else if(cO.VersionChange){
                cO.majorClass = 'newversioncell';
                cO.changeMsgClass = 'newversioncell';
                changeMsg = 'New Version for this Release';
                totalNewServicesVersionCount++;
            }else if(cO.majorChangeCount!==0){
                 changeMsg = changeMsg + cO.changeDescriptions.join('<br>');
                 cO.changeMsgClass = 'majorcell';
                 cO.majorClass = 'majorcell';
            }else if(cO.minorChangeCount!=0){
                 changeMsg = changeMsg + cO.changeDescriptions.join('<br>');
                 cO.changeMsgClass = 'majorcell';
                 cO.minorClass = 'minorcell';
            }else if(((cO.majorChangeCount+cO.minorChangeCount)==0)&&(cO.emumerationChangeCount!=0)){
                 changeMsg = changeMsg + cO.changeDescriptions.join('<br>');
                 cO.changeMsgClass = 'enumerationOnly';
            }
            if(cO.minorChangeCount!=0){
                cO.minorClass = 'minorcell';
            }
            if((cO.VersionChange!=true)&&(cO.IsNew!=true)&&(cO.minorChangeCount!=0)&&(cO.majorChangeCount==0)){
                totalMinorChanges++;
            }else if((cO.VersionChange!=true)&&(cO.IsNew!=true)&&(cO.majorChangeCount!=0)){
                totalMajorChanges++;
            }
            //limit change messages
            changeMsg = changeMsg.substr(0, 500);
            //need to create links from the numbers and names
            var numberlink = getMacroLink(cO.ServiceNumber, cO.key, cO.callBackURL);
            var namelink = getMacroLink(cO.ServiceName, cO.key, cO.callBackURL);
            htmlBody += '<tr>' + createTD(numberlink) + createTD(namelink) + createTD(cO.ServiceVersion) + createTD(cO.ServiceCategory) + createTD(changeMsg, cO.changeMsgClass) + createTD(cO.majorChangeCount, cO.majorClass) + createTD(cO.minorChangeCount, cO.minorClass) + '</tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        $('#' + id + 'SearchLabel').text('Currently listing ' + changeCount + ' changes for this release.');
        appendAccordionHeader(headerID, totalNewServicesCount + ' new services, ' + totalNewServicesVersionCount + ' new versions, '+ totalMajorChanges + ' major changes and ' + totalMinorChanges + ' minor changes for this release', release.releaseName + ' compared to '+release.previousRelease.releaseName);
    } else {
        $('#' + id + 'SearchLabel').text('No change lists found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No changes found');
    }
    //set a few variables for the names of things
    
    //finish with an accordion refresh
    
    $("#changesAccordion").accordion("refresh");
    console.timeEnd('buildServiceChangeListAccordion');
}
//New section to build a generic accordion with search
function buildSystemChangeListAccordion(systemChangesArray, headerAccordion, releaseObject) {
    //console.log('buildServiceChangeListAccordion');
    console.time('buildSystemChangeListAccordion');
    var identifier = 'systemChangeList';
    var htmlHeader = buildInnerAccordion(identifier, 'System Changes');
    //append the models data header
    headerAccordion.append(htmlHeader);
    //now style each one?
    headerAccordion.accordion("refresh");
    var accordionObject = headerAccordion.find('.' + identifier);
    var headerObject = accordionObject[0];
    var contentObject = accordionObject[1];

    //can I format this object correctly through the compare?
    //only do this if its the right object?
    var status = 0;
    var statusText = 'Unknown';
    if (systemChangesArray!=null){
        status = '200';
        statusText = 'Success'
    }else{
    }
    
    //regardless I want to build the accordion
    var id = 'systemChangeList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    var changeCount = 0;
    
    var thHTML = buildSystemChangeListTH();
    var divhtml = buildAccordionDivWithSearch(id, thHTML);
    
    var release = globalSelectedRelease;
    var releaseName = release.releaseName.toLowerCase();
    contentObject.innerHTML= divhtml;
    //$('#' + contentID).html(divhtml);
    var systemsChanged = [];
    
    
    if (systemChangesArray!=null) {
        //start creating the table information
        //lets find stuff thats different?
        for (var i = 0; i < systemChangesArray.systemList.length; i++) {
            var systemObj = systemChangesArray.systemList[i];
            var newSystemObj = {};
            newSystemObj.systemName = systemObj.systemName;
            var consumerServiceList = [];
            var providerServiceList = [];
            //now loop for each consumer and porvider
            var different = false;
            for (var j = 0; j < systemObj.consumerServiceList.length; j++) {
                var serviceObj = systemObj.consumerServiceList[j].service;
                if(serviceObj.different){
                    consumerServiceList.push(serviceObj);
                    different = true;
                }
            }
            for (var k = 0; k < systemObj.providerServiceList.length; k++) {
                var serviceObj = systemObj.providerServiceList[k].service;
                if(serviceObj.different){
                    providerServiceList.push(serviceObj);
                    different = true;
                }
            }
            if(different){
                newSystemObj.consumerServiceList = consumerServiceList;
                newSystemObj.providerServiceList = providerServiceList;
                systemsChanged.push(newSystemObj);    
            }
        }
       
        var htmlBody = '';
        var totalMajorChanges = 0;
        var totalMinorChanges = 0;
        var totalNewServicesCount = 0;
        var totalNewServicesVersionCount = 0;
        var totalDocumentationChanges = 0;
        forceSortArray(systemsChanged, 'systemName', false, function (cI, systemObj) {
            //limit change messages
            var consumerServicesHTML = '';
            var providerServicesHTML = '';
            var consumerMajorCountHTML = '';
            var providerMajorCountHTML = '';
            var consumerMinorCountHTML = '';
            var providerMinorCountHTML = '';
            var providerServicesHTML = '';
            for (var i = 0;i<systemObj.consumerServiceList.length;i++){
                var serviceObj = systemObj.consumerServiceList[i];
                var namelink = getMacroLink(serviceObj.FormattedDisplayName, serviceObj.key, serviceObj.callBackURL);
                consumerServicesHTML+='Consumer of : ' + namelink+'<br><br>';
                consumerMajorCountHTML+=serviceObj.majorChangeCount+'<br><br>';
                consumerMinorCountHTML+=serviceObj.minorChangeCount+'<br><br>';
            }
            for (var k = 0;k<systemObj.providerServiceList.length;k++){
                var serviceObj = systemObj.providerServiceList[k];
                var namelink = getMacroLink(serviceObj.FormattedDisplayName, serviceObj.key,serviceObj.callBackURL);
                providerServicesHTML+='Provider of : ' + namelink+'<br><br>';
                providerMajorCountHTML+=serviceObj.majorChangeCount+'<br><br>';
                providerMinorCountHTML+=serviceObj.minorChangeCount+'<br><br>';
            }
            //need to create links from the numbers and names
            htmlBody += '<tr>' + createTD(systemObj.systemName) + createTD(consumerServicesHTML+providerServicesHTML) + createTD(consumerMajorCountHTML+providerMajorCountHTML) + createTD(consumerMinorCountHTML+providerMinorCountHTML) + '</tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        $('#' + id + 'SearchLabel').text('Currently listing ' + systemsChanged.length + ' systems impacted for this release.');
        appendAccordionHeader(headerID, 'Currently listing ' + systemsChanged.length + ' systems impacted for this release.');
    } else {
        $('#' + id + 'SearchLabel').text('No change lists found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No changes found');
    }
    //set a few variables for the names of things
    
    //finish with an accordion refresh
    
    $("#changesAccordion").accordion("refresh");
    console.timeEnd('buildSystemChangeListAccordion');
}


function createTD(tdContents, tdclass){
    var tdResult = '<td';
    if(tdclass!=null){
        tdResult+=' class="' + tdclass + '"';
    }
    tdResult+='>' + tdContents + '</td>';
    return tdResult; 
        
}




function mergeTechnical2Documented(technicalChangeList, documentedChangeList) {
    //console.log('mergeTechnical2Documented');
    console.time('mergeTechnical2Documented');
    //console.log('technicalChangeList');
    //console.log(technicalChangeList);
    //console.log('documentedChangeList');
    //console.log(documentedChangeList);
    $.each(documentedChangeList, function (index, documentSchema) {
        //console.log(documentSchema);
        var docLocation = cleanMacroName(documentSchema.location);
        //console.log(docLocation);
        //console.log(cleanMacroName(technicalChangeList[0].location));
        $.each(technicalChangeList, function (index, technicalSchema) {
            var techLocation = cleanMacroName(technicalSchema.location);
            //console.log(techLocation);
            if (docLocation == techLocation) {
                //append the macroSectionChnageSummary as an array?
                documentSchema.techChange = technicalSchema;
                //console.log('Matched');
                //console.log(documentSchema);
                return false;
            }
        });
    });
    console.timeEnd('mergeTechnical2Documented');
    //console.log(documentedChangeList);
    return documentedChangeList;
}

function getAllServiceImplementationJSONData(serviceConfigListObject) {
    console.time('getServiceImplementationListJSONData');
    var url = getSelectedRelease().releaseLocation + 'dp/';
    //now I need to check it all out and build what I can?
    //console.log(serviceConfigListObject);
    if ((serviceConfigListObject != null) &&(serviceConfigListObject.ServiceConfigLists != null) &&(serviceConfigListObject.ServiceConfigLists.ServiceConfigList != null)) {
        var serviceConfigList = returnArray(serviceConfigListObject.ServiceConfigLists.ServiceConfigList);
        //console.log(serviceConfigList);
        var allRequests =[];
        $.each(serviceConfigList, function (index, serviceConfig) {
            if (serviceConfig.location != null) {
                //add it to the service call list
                //console.log(url + serviceConfig.location);
                
                allRequests.push($.getJSON(url + serviceConfig.location.replace('.xml', '.json') + '?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster));
            }
        });
    } else {
        //console.log('No Service Configs exit');
    }
    var requests = $.unique(allRequests);
    console.time('multipleConfigCalls');
    var defer = $.when.apply($, requests);
    defer.done(function () {
        console.timeEnd('multipleConfigCalls');
        buildServiceImplementationListAccordion(arguments);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.timeEnd('multipleConfigCalls');
        buildServiceImplementationListAccordion(jqXHR);
    });
}

function getServiceImplementationListJSONData() {
    console.time('getServiceImplementationListJSONData');
    var url = getSelectedRelease().releaseLocation;
    var jsonLinkRel = url + 'ServiceConfigList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            getAllServiceImplementationJSONData(data);
            console.timeEnd('getServiceImplementationListJSONData');
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getServiceImplementationListJSONData');
        }
    });
}

function getPreviousServicesJSONData(schemaListObject){
    getSchemasJSONData('enterpriseModels', 'previousEnterpriseSchemas', true);
}

function previousEnterpriseSchemas(schemaListWithReadMe, buildInfoObj, autoPopulateObj){
    console.log('Made it here');
    console.log(schemaListWithReadMe);
    
    //console.log(buildInfoObj);
    buildServiceChangesPage();
    var changesWorker = new Worker("js/schemaChanges.js",{ useCache: false });
    
    var url = window.location.href.split('?')[0];
    var release = getSelectedRelease();
    //console.log('about to call a worker');
    changesWorker.postMessage([allEnterpiseServices, schemaListWithReadMe, url, release]); // Sending message as an array to the worker
    var release = getSelectedRelease();
    
    changesWorker.onmessage = function(e) {
		  var serviceChangesArray = e.data;
		  //console.log(serviceChangesArray);
		  
		  allEnterpiseServices = serviceChangesArray;
		  getURLjsonLink();
		  buildServiceChangeListAccordion(allEnterpiseServices);
		  
		  getConsumerProviderLists(allEnterpiseServices);
		  buildSchemaFieldSearchFunction(allEnterpiseServices);
		  getCRTJSONData(allEnterpiseServices, autoPopulateObj);
		  
		  //So now I need to check if any tabs with macros in them have been opened and try and refresh just those keys?
		  var allSchemaAccordions = $('h3[accordionType="schema"]');
		  if(allSchemaAccordions.length>0){
		      for (var i = 0; i < allSchemaAccordions.length; i++) {
		          var macroAccordion = allSchemaAccordions[i];
		          //console.log('macroAccordion');
		          //console.log(macroAccordion);
		          var attributes = macroAccordion.attributes;
		          //console.log('attributes');
		          //console.log(attributes);
		          var macroAccordionKey = attributes.getNamedItem('key').value;
		          		       
		          
		          if(macroAccordionKey!=null){
        		      
        		     //console.log(macroAccordionKey);
        		      //get the key by name
        		      buildRequestAndResponseSchemas(macroAccordionKey, true);
        		      refreshReadmeHTML(macroAccordionKey);
        		      
		          }
		      }
		  }
    }
}

function getConsumerProviderLists(releaseObject, parentID){
    //I no longer need to do this...just get the data from disk....
    //get the systemListData?
    //Im not sure if I need the releaseObject?
    console.time('getConsumerProviderLists');
    //I now need to create the accorion stuff dynamically but not really...
    var headerAccordion = $('#' + parentID);
    headerAccordion.empty();                
    var jsonLinkRel = routerURL + '/getSystemListData' + '?'+ getCacheBuster();
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            //I have to worry about the current releases services as well?
            console.log(releaseObject);
            buildServiceProviderConsumerListAccordion(data, headerAccordion);
            buildSystemChangeListAccordion(data, headerAccordion, releaseObject);
            $("#providerconsumersAccordion").accordion("refresh");
            console.timeEnd('getConsumerProviderLists');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getConsumerProviderLists');
            hideLoadingBlock(-1);
        }
    });
}

function getAllServicesJSONData(currentReleaseList){
    console.time('getAllServicesJSONData');
    var currentRelease = globalSelectedRelease;
    var previousRelease = globalSelectedRelease.previousRelease;
    var cacheBuster = getCacheBuster();
    var serviceMacrosJSON = 'enterpriseModelsXSDContents.json?' + 'buildNumberCache=' + cacheBuster;
    var serviceREADMEJSON = 'enterpriseModelsREADMEContents.json?' + 'buildNumberCache=' + cacheBuster;
    var autoPopulateJSON = 'macroAutoPopulate.json?' + 'buildNumberCache=' + cacheBuster;
    var soaBranchLocation = '../serviceRepositorySite/' + currentRelease.soaBranchName + '/';
    var previousSoaBranchLocation = '../serviceRepositorySite/' + previousRelease.soaBranchName + '/';
    var currentURL = soaBranchLocation + serviceMacrosJSON;
    var currentREADMEURL = soaBranchLocation + serviceREADMEJSON;
    var currentAutoPopulate = soaBranchLocation + autoPopulateJSON;
    var previousURL = previousSoaBranchLocation + serviceMacrosJSON;
    var previousREADMEURL = previousSoaBranchLocation + serviceREADMEJSON;
    var previousAutoPopulateJSON = previousSoaBranchLocation + autoPopulateJSON;
    
    var allRequests =[];
    //allRequests.push($.getJSON(currentURL));
    allRequests.push($.getJSON(previousURL));
    //allRequests.push($.getJSON(currentREADMEURL));
    allRequests.push($.getJSON(previousREADMEURL));
    allRequests.push($.getJSON(previousAutoPopulateJSON));

    var requests = $.unique(allRequests);
    
    var defer = $.when.apply($, requests);
    defer.done(function () {
        console.timeEnd('getAllServicesJSONData');
        //update this to just call no matter if success or fail?
        //once this is returned I can fire a web worker?
        processAllServicesJSONData(currentReleaseList, arguments[0][0], arguments[1][0], arguments[2][0]);
        
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.timeEnd('getAllServicesJSONData');
        processAllServicesJSONData(jqXHR, this);
    });
}
function getCurrentServicesJSONData(){
    console.time('getCurrentServicesJSONData');
    var currentRelease = globalSelectedRelease;
    var previousRelease = globalSelectedRelease.previousRelease;
   //console.log('currentRelease:');
   //console.log(currentRelease);
   //console.log('previousRelease:');
   //console.log(previousRelease);
    var cacheBuster = getCacheBuster();
    var serviceMacrosJSON = 'enterpriseModelsXSDContents.json?' + 'buildNumberCache=' + cacheBuster;
    var serviceREADMEJSON = 'enterpriseModelsREADMEContents.json?' + 'buildNumberCache=' + cacheBuster;
    var autoPopulateJSON = 'macroAutoPopulate.json?' + 'buildNumberCache=' + cacheBuster;
    var soaBuildInfoJSON = 'buildinfo.json?' + 'buildNumberCache=' + cacheBuster;
    var soaBranchLocation = '../serviceRepositorySite/' + currentRelease.soaBranchName + '/';
    var currentURL = soaBranchLocation + serviceMacrosJSON;
    var currentREADMEURL = soaBranchLocation + serviceREADMEJSON;
    var currentAutoPopulate = soaBranchLocation + autoPopulateJSON;
    var currentSOABuildInfo = soaBranchLocation + soaBuildInfoJSON;
    var allRequests =[];
    allRequests.push($.getJSON(currentURL));
    allRequests.push($.getJSON(currentREADMEURL));
    allRequests.push($.getJSON(currentAutoPopulate));
    allRequests.push($.getJSON(currentSOABuildInfo));
    var requests = $.unique(allRequests);
    
    var defer = $.when.apply($, requests);
    defer.done(function () {
        console.timeEnd('getCurrentServicesJSONData');
        //update this to just call no matter if success or fail?
        processCurrentServicesJSONData(arguments[0][0], arguments[1][0], arguments[2][0], arguments[3][0]);
        
    }).fail(function (jqXHR, textStatus, errorThrown) {
        console.timeEnd('getCurrentServicesJSONData');
        processCurrentServicesJSONData(jqXHR, this);
    });
}




function processCurrentServicesJSONData(currentReleaseObjects, currentReadmeObjects, currentAutoPopulate, currentBuildInfo){
    var serviceChangesArray = null;
    if (releaseObjectValid(currentReleaseObjects)){
        //I can also call a worker to paint this part of the currentrelease
        //I have to format everything?
        //if I get the usage appended first I should be able to paint the list?
        console.time('processServices');
        var processServiceList = schemaListProcessor(currentReleaseObjects);
        console.timeEnd('processServices');
        console.time('serviceList');
        var url = window.location.href.split('?')[0];
        
        var serviceList = addKeysAndNames(processServiceList, url, globalSelectedRelease);
        console.timeEnd('serviceList');
        console.time('addReadme');
        var serviceListwithReadme = mergeREADME(serviceList, currentReadmeObjects);
        console.timeEnd('addReadme');
        //this has to be invoked before the macro creator as the ref data is only pinned to the originating object
        var serviceListwithReadme = mergeAutoPopulate(serviceListwithReadme, currentAutoPopulate);
        
        
        //now I should be ready to paint the list and fire a web worker to parse the rest of the data?
        //paint it?
        
    }
    //maybe I should set this globally now?
    //##serviceChangesArray

    allServices = serviceListwithReadme;
    //at this stage I have all the data I need for everything and the global set so I can do stuff here?
    
    
    
    
    //buildServiceChangeListAccordion(serviceChangesArray);
    //buildServiceProviderConsumerListAccordion(serviceChangesArray);
    //buildSchemaFieldSearchFunction(allServices);
}

        



function getAllBuildNumbersListJSONData(releasesData) {
    console.time('getAllBuildNumbersListJSONData');
    //console.log(releasesData);
    if ((releasesData != null) &&(releasesData.releases != null)) {
        var releaseList = returnArray(releasesData.releases);
        var cacheBuster = getCacheBuster();
        var buildInfoFile = 'buildinfo.json?' + cacheBuster;
        var allRequests =[];
        $.each(releaseList, function (index, release) {
            if ((release.location != null) &&(release.disabled == false)) {
                allRequests.push($.getJSON(release.enterpriseModelsVersion + buildInfoFile));
            }
        });
        
        var requests = $.unique(allRequests);
        var defer = $.when.apply($, requests);
        defer.done(function () {
            buildAllBuildsListAccordion(arguments);
            console.timeEnd('getAllBuildNumbersListJSONData');
            hideLoadingBlock(3);
        }).fail(function (jqXHR, textStatus, errorThrown) {
            buildAllBuildsListAccordion(jqXHR);
            hideLoadingBlock(-1);
            console.timeEnd('getAllBuildNumbersListJSONData');
            //build the accordian anyway?
        });
    }
}

function getAllBuildsListJSONData() {
    console.time('getAllBuildsListJSONData');
    var cacheBuster = getCacheBuster();
    var url = 'data/releases.json?' + cacheBuster;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            getAllBuildNumbersListJSONData(data);
            console.timeEnd('getAllBuildsListJSONData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getAllBuildsListJSONData');
            hideLoadingBlock(-1);
        }
    });
}

function getServiceEmptyProviderConsumerListJSONData() {
    console.time('getServiceEmptyProviderConsumerListJSONData');
    var url = getSelectedRelease().releaseLocation + 'ServiceRequirement.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            buildServiceEmptyProviderConsumerListAccordion(data);
            console.timeEnd('getServiceEmptyProviderConsumerListJSONData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getServiceEmptyProviderConsumerListJSONData');
            hideLoadingBlock(-1);
        }
    });
}

function getEmptyProviderConsumerList(flatServiceListWithConsumerProvider) {
    console.time('flatServiceListWithConsumerProvider');
    var emptyServiceList =[];
    if (flatServiceListWithConsumerProvider.macroList != null) {
        processList = returnArray(flatServiceListWithConsumerProvider.macroList);
        $.each(processList, function (index, service) {
            //skip core and msg?
            var isService = ((service.number != 'Core') &&(service.number != 'Msg'));
            if (isService) {
                var serviceProviderList = getProvidersOrConsumersList(service, 'Provider');
                var serviceConsumerList = getProvidersOrConsumersList(service, 'Consumer');
                var emptyProviderFlag = false;
                var emptyConsumerFlag = false;
                if (serviceProviderList.length == 0) {
                    emptyProviderFlag = true;
                }
                if (serviceConsumerList.length == 0) {
                    emptyConsumerFlag = true;
                }
                if ((emptyProviderFlag) ||(emptyConsumerFlag)) {
                    //console.log('empty Provider');
                    //console.log(service);
                    service.emptyProviderFlag = emptyProviderFlag;
                    service.emptyConsumerFlag = emptyConsumerFlag;
                    emptyServiceList.push(service);
                }
            }
        });
    }
    console.timeEnd('flatServiceListWithConsumerProvider');
    return emptyServiceList;
}

function reverseProviderConsumerList(serviceListWithConsumerProviderList) {
    console.log('serviceListWithConsumerProviderList');
    console.time('serviceListWithConsumerProviderList');
    console.log(serviceListWithConsumerProviderList);
    var uniqueConsumers =[];
    var uniqueProviders =[];
    //loop through this list and create a new list of unique consumers and providers with services objects arrays underneath?
    //console.log(serviceListWithConsumerProviderList.macroList.length);
    //console.log(serviceListWithConsumerProviderList);
    a=stopheronconsumers;
    if (serviceListWithConsumerProviderList != null) {
        $.each(serviceListWithConsumerProviderList, function (index, service) {
            var serviceProviderList = getProvidersOrConsumersList(service, 'Provider');
            uniqueProviders = uniqueProviders.concat(serviceProviderList);
            var serviceConsumerList = getProvidersOrConsumersList(service, 'Consumer');
            uniqueConsumers = uniqueConsumers.concat(serviceConsumerList);
        });
    }
    uniqueConsumers = unique(uniqueConsumers);
    uniqueProviders = unique(uniqueProviders);
    //now join this together!
    var allSystems = unique(uniqueConsumers.concat(uniqueProviders));
    var allSystemsObjectList =[];
    //console.log(allSystems);
    //console.log(uniqueConsumers);
    //Now I need to reprocess this list and find services that are under each ...
    $.each(allSystems, function (index, systemName) {
        var uniqueProviderServiceList =[];
        var uniqueConsumerServiceList =[];
        var systemObject = {
        };
        systemObject.name = systemName;
        if (serviceListWithConsumerProviderList != null) {
            $.each(serviceListWithConsumerProviderList, function (index, service) {
                var serviceProviderList = getProvidersOrConsumersList(service, 'Provider');
                $.each(serviceProviderList, function (index, providerTestName) {
                    if (providerTestName == systemName) {
                        uniqueProviderServiceList.push(service);
                    }
                });
                var serviceConsumerList = getProvidersOrConsumersList(service, 'Consumer');
                $.each(serviceConsumerList, function (index, consumerTestName) {
                    if (consumerTestName == systemName) {
                        uniqueConsumerServiceList.push(service);
                    }
                });
                systemObject.provides = uniqueProviderServiceList;
                systemObject.providerCount = uniqueProviderServiceList.length;
                systemObject.consumes = uniqueConsumerServiceList;
                systemObject.consumerCount = uniqueConsumerServiceList.length;
            });
        }
        allSystemsObjectList.push(systemObject);
    });
    console.timeEnd('serviceListWithConsumerProviderList');
    return allSystemsObjectList;
}

function unique(array) {
    return array.filter(function (el, index, arr) {
        return index === arr.indexOf(el);
    });
}

function getProvidersOrConsumersList(service, type) {
    var returnList =[];
    var ServiceRequirementEntry = ((((service||{
    }).ServiceMap||{
    }).Macro||{
    }).Documentation||{
    }).ServiceRequirement;
    var ServiceRequirementEntryList = returnArray(ServiceRequirementEntry);
    $.each(ServiceRequirementEntryList, function (ind, ServiceRequirementEntry) {
        if (ServiceRequirementEntry.Type == type) {
            var ServiceRequirementList = returnArray(ServiceRequirementEntry.ServiceRequirementEntry);
            if (ServiceRequirementList != null) {
                $.each(ServiceRequirementList, function (ind, ServiceRequirement) {
                    //console.log('ServiceRequirement');
                    //console.log(ServiceRequirement);
                    if ((ServiceRequirement != null) &&(ServiceRequirement.System_Name != null)) {
                        returnList.push(ServiceRequirement.System_Name);
                    }
                });
            }
        }
    });
    
    return returnList;
}

function buildAllBuildsListAccordion(responseObject) {
    //console.log('buildAllBuildsListAccordion');
    console.time('buildAllBuildsListAccordion');
    //console.log(serviceFieldListObject);
    var id = 'allBuildsList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    //console.log('responseObject');
    //console.log(responseObject);
    
    var newarguments = returnArray(responseObject);
    //console.log('newarguments');
    //console.log(newarguments);
    var allBuildsDataList =[];
    $.each(newarguments[0], function (index, argument) {
        //console.log('argument');
        //console.log(argument);
        if (argument[1] == 'success') {
            if ((argument[0].projectversion != null) &&(argument[0].releaseNumber != null) &&(argument[0].projectversion != '') &&(argument[0].releaseNumber != '')) {
                allBuildsDataList.push(argument[0]);
            }
        }
    });
    var allBuildsDataListCount = allBuildsDataList.length;
    if (allBuildsDataListCount > 0) {
        var thHTML = buildAllBuildsListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('All Builds');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        var batchBody = '';
        //ok so now Im ready to loop through every system
        $.each(allBuildsDataList, function (index, buildData) {
            htmlBody += '<tr><td>' + buildData.releaseNumber + '</td><td>' + buildData.projectversion + '</td></tr>';
            batchBody += buildData.releaseNumber + '_' + buildData.projectversion + ' ';
        });
        $('tbody#' + id + 'TableBody').empty();
        appendAccordionHeader(headerID, allBuildsDataListCount + ' builds');
        $('tbody#' + id + 'TableBody').append(htmlBody);
        //console.log(id+'Content');
        $('#' + contentID).append('(' + batchBody.trim() + ')');
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
    } else {
        $('#' + id + 'SearchLabel').text('No builds found.');
        appendAccordionHeader(headerID, 'No builds found');
        $('tbody#' + id + 'TableBody').empty();
    }
    $("#adminAccordion").accordion("refresh");
    console.timeEnd('buildAllBuildsListAccordion');
}

function buildOrphanedFieldsListAccordion(serviceFieldListObject) {
    //console.log('buildOrphanedFieldsListAccordion');
    console.time('buildOrphanedFieldsListAccordion');
    //console.log(serviceFieldListObject);
    var id = 'orphanFieldsList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    
    if ((serviceFieldListObject != null) &&(serviceFieldListObject.fieldList != null)) {
        var orphanedList = getOrphanFieldList(serviceFieldListObject);
        var fieldListCount = orphanedList.length;
        var thHTML = buildOrphanedFieldsListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Orphan Fields');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        if (fieldListCount > 1000) {
            //more than 1000 found error
            appendAccordionHeader(headerID, fieldListCount + ' fields found. Cant display that many.');
            $('tbody#' + id + 'TableBody').empty();
        } else if (fieldListCount < 1) {
            appendAccordionHeader(headerID, 'No orphans fields found');
            $('tbody#' + id + 'TableBody').empty();
        } else {
            $.each(orphanedList, function (index, fieldObj) {
                var field = undefinedToEmpty(fieldObj.Field);
                var serviceName = undefinedToEmpty(fieldObj.serviceName);
                var serviceNumber = undefinedToEmpty(fieldObj.serviceNumber);
                htmlBody += '<tr><td>' + field + '</td><td>' + serviceName + '</td></tr>';
            });
            $('tbody#' + id + 'TableBody').empty();
            $('tbody#' + id + 'TableBody').append(htmlBody);
            var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
            //I actually want to update the Macro Header?
            appendAccordionHeader(headerID, fieldListCount + ' fields');
        }
    } else {
        $('#' + id + 'SearchLabel').text('No orphans abled to be checked.');
        appendAccordionHeader(headerID, 'No orphans abled to be checked');
        $('tbody#' + id + 'TableBody').empty();
    }
    
    $("#adminAccordion").accordion("refresh");
    console.timeEnd('buildOrphanedFieldsListAccordion');
}

function getOrphanFieldList(allFieldsListObj) {
    //so create a list of all fields?
    console.time('getOrphanFieldList');
    var orphansList =[];
    var nonCoreMacroFieldListObj = removeAllFieldsCoreSchemas(allFieldsListObj, false);
    var coreMacroFieldListObj = removeAllFieldsCoreSchemas(allFieldsListObj, true);
    var nonCoreMacroFieldList = returnArray(nonCoreMacroFieldListObj.fieldList);
    var coreMacroFieldList = returnArray(coreMacroFieldListObj.fieldList);
    //loop through one and then the other?
    var coreCount = coreMacroFieldList.length;
    var nonCoreCount = nonCoreMacroFieldList.length;
    for (var i = 0; i < coreCount; i++) {
        var coreFieldName = undefinedToEmpty(coreMacroFieldList[i].Field);
        var orphanFlag = true;
        for (var k = 0; k < nonCoreCount; k++) {
            var svFieldName = undefinedToEmpty(nonCoreMacroFieldList[k].Field);
            if (svFieldName == coreFieldName) {
                orphanFlag = false;
                break;
            }
        }
        if (orphanFlag) {
            orphansList.push(coreMacroFieldList[i]);
        }
    }
    console.timeEnd('getOrphanFieldList');
    return orphansList;
}

function mergeESBandWSGWTransformLists(allSuccessObjectList){
    console.time('mergeESBandWSGWTransformLists');
    //first figure out which list I have and set a parent variable 
    var resultList = [];
    $.each(allSuccessObjectList, function(allSuccessObjectIndex, allSuccessObject){
        var type = 'unknown';
        var relLocation = getSelectedRelease().releaseLocation;
        var xsltList = [];
        if((allSuccessObject.transformsLists!==undefined)&&(allSuccessObject.transformsLists!==null)&&(allSuccessObject.transformsLists.transformsList!==undefined)&&(allSuccessObject.transformsLists.transformsList!==null)){
            type = 'esb';
            relLocation = relLocation + 'dp/';
            xsltList = allSuccessObject.transformsLists.transformsList;
        }else if((allSuccessObject.wsgwTransformsLists!==undefined)&&(allSuccessObject.wsgwTransformsLists!==null)&&(allSuccessObject.wsgwTransformsLists.wsgwTransformsList!==undefined)&&(allSuccessObject.wsgwTransformsLists.wsgwTransformsList!==null)){
            type = 'wsgw'; 
            relLocation = relLocation + 'wsgw/';
            xsltList = allSuccessObject.wsgwTransformsLists.wsgwTransformsList;
        } 
        $.each(xsltList, function(xsltIndex, xsltObject){
            xsltObject.type = type;
            xsltObject.relativeLocation = relLocation + xsltObject.location;
            resultList.push(xsltObject);
        });
        
    });
    console.timeEnd('mergeESBandWSGWTransformLists');
    return resultList;
}


function buildTransformsListAccordion(responseObject) {
    console.time('buildTransformsListAccordion');
    //first I want to pick out the successful transforms response objects only
    var allSuccessObjectList =[];
    var responseObjectArray = returnArray(responseObject);
    $.each(responseObjectArray[0], function (index, argument) {
        if (argument[1] == 'success') {
            var listObject = argument[0];
            if(((listObject.transformsLists!=='undefined')&&(listObject.transformsLists!==null))||((listObject.wsgwTransformsLists!=='undefined')&&(listObject.wsgwTransformsLists!==null))){
                allSuccessObjectList.push(listObject);    
            }
        }
    });
    //now I need to merge them all into one new object list but with an additional property or two
    var transformsList = mergeESBandWSGWTransformLists(allSuccessObjectList);
    var release = getSelectedRelease();
    var id = 'serviceTransformsList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    
    if ((transformsList!= null)&&(transformsList.length>0)){
        var transformsListCount = transformsList.length;
        var thHTML = buildTransformsListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Transforms List');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        forceSortArray(transformsList, 'name', false, function (i, transformObj) {
            if ((transformObj.name != null) &&(transformObj.location != null)) {
                var name = undefinedToEmpty(transformObj.name);
                var type = undefinedToEmpty(transformObj.type).toUpperCase();
                var location = undefinedToEmpty(transformObj.location);
                var relativeLocation = undefinedToEmpty(transformObj.relativeLocation);
                //I need to create a link from this location?
                //var locationLink = createLinkAndDownloadLink(location, location);
                var locationLink = createNewTabLink(relativeLocation, location.replace('local/ondisk/', '').replace('local/XmlDocStore/', ''));
                //console.log('locationLink:' + locationLink);
                htmlBody += '<tr><td>' + name + '</td><td>' + type + '</td><td>' + locationLink + '</td></tr>';
            }
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, transformsListCount + ' Transforms', 'ESB Build Number : '+release.dp_esb_mainVersion + ' & WSGW Build Number : '+release.wsgw_Version);
    } else {
        $('#' + id + 'SearchLabel').text('No Transformations found.');
        appendAccordionHeader(headerID, 'No Transformations found');
    }
    
    $("#serviceTransformationsAccordion").accordion("refresh");
    console.timeEnd('buildTransformsListAccordion');
}




function getUniqueServiceActionNames() {
    console.time('getUniqueServiceActionNames');
    var url = getSelectedRelease().releaseLocation + 'ServiceUsage.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'json',
        'cache': false,
        'async': false,
        'success': function (data) {
            var uniqueFirstNames =[];
            var macroList = flattenMacroList(data.macroLocations.category);
            var schemaList = returnArray(macroList.macroList);
            $.each(schemaList, function (index, object) {
                var rawName = object.name;
                var isCoreFlag = getIsCoreFromLocation(object.location, object.name);
                //now get the second part
                //console.log(rawName);
                if (isCoreFlag != true) {
                    var firstName = null;
                    for (i = 1; i < rawName.length; i++) {
                        var singleLetter = rawName.charAt(i);
                        if (singleLetter == singleLetter.toUpperCase()) {
                            //console.log(i + singleLetter);
                            var firstName = rawName.substring(0, i);
                            break;
                        }
                    }
                    //now add first name to the list if its not null and it its not unique
                    //console.log(firstName);
                    if (uniqueFirstNames.indexOf(firstName) == -1) {
                        uniqueFirstNames.push(firstName);
                    }
                    //add it unique to an array
                }
            });
            
            uniqueFirstNames.sort();
            $('#action-type').children('option').remove();
            for (i = 0; i < uniqueFirstNames.length; i++) {
                var name = uniqueFirstNames[i];
                $('#action-type').append($("<option></option>").attr("value", name).text(name));
            }
            $("#action-type").change(function (data) {
                updateServiceProposalTitle();
            });
            $("#contentname").keyup(function (data) {
                updateServiceProposalTitle();
            });
            updateServiceProposalTitle();
            
            console.timeEnd('getUniqueServiceActionNames');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getUniqueServiceActionNames');
            hideLoadingBlock(-1);
        }
    });
}

function updateServiceProposalTitle() {
    //get the option box and the text box and combine
    
    var selectedActionType = $('#action-type').find(":selected").text();
    var contentName = $('#contentname').val();
    //console.log(selectedActionType + contentName);
    //var path = $('#releaseSelector :selected').val();
    //var label = $('#releaseSelector :selected').text();
    $('#newProposalDialog').dialog('option', 'title', selectedActionType + contentName);
}

function buildProjectListAccordion(projectListObject) {
    //    //console.log('buildProjectListAccordion');
    console.time('buildProjectListAccordion');
    //console.log(projectListObject);
    var id = 'projectList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    
    if ((projectListObject != null) &&(projectListObject.rows != null) &&(projectListObject.rows.length != null) &&(projectListObject.header != null)) {
        var projectList = returnArray(projectListObject.rows);
        var headerObj = returnArray(projectListObject.header);
        //console.log(projectList);
        var projectListObjCount = projectList.length;
        var thHTML = buildProjectListTH(headerObj);
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Project List');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        forceSortArray(projectList, 'projectbranch', false, function (i, projectObj) {
            var projectRow = projectObj.row;
            //console.log(projectRow);
            var svName = (undefinedToEmpty(projectRow.service) + ' ' + undefinedToEmpty(projectRow.servicename)).trim();
            var month = undefinedToEmpty(projectRow.e5delivery);
            htmlBody += '<tr><td>' + undefinedToEmpty(projectRow.priority) + '</td><td>' + undefinedToEmpty(projectRow.projectbranch) + '</td><td>' + svName + '</td><td>' + undefinedToEmpty(projectRow.size) + '</td><td>' + undefinedToEmpty(projectRow.changedescription) + '</td><td>' + undefinedToEmpty(projectRow.deliverypm) + '</td><td>' + undefinedToEmpty(projectRow.architect) + '</td><td>' + undefinedToEmpty(projectRow.trim) + '</td><td class="' + month + '">' + month + '</td></tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, projectListObjCount + ' Project Services');
    } else {
        $('#' + id + 'SearchLabel').text('No projects found.');
        appendAccordionHeader(headerID, 'No projects found');
    }
    
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildProjectListAccordion');
}



function getCRTJSONData(schemaListObject, macroAutoPopulate){
    console.time('getCRTJSONData');
    var releaseObj = globalSelectedRelease;
    if(releaseObj.crtBranchName!=null){
        var crtlocation = '../serviceRepositorySite/' + releaseObj.crtBranchName + '/';
        var cacheBuster = getCacheBuster();
        var allRequests =[];
        allRequests.push($.getJSON(crtlocation + 'enterpriseCRT_fullCrtData.json?' + 'buildNumberCache=' + cacheBuster));
        var defer = $.when.apply($, allRequests);
        defer.done(function () {
            console.timeEnd('getCRTJSONData');
            processCRTData(arguments[0], macroAutoPopulate, schemaListObject);
            //update this to just call no matter if success or fail?
            }).fail(function (jqXHR, textStatus, errorThrown) {
                console.log('failed to get stuff:' + textStatus);
                console.timeEnd('getCRTJSONData');
            });    
    }else{
        a=nocrtdata;
    }
}

function processCRTData(rawCRTData, rawAutoPopulateData, schemaListObject){
    //this should spawn a new worker...
    console.time('spawncrtWorker');
    var crtWorker = new Worker("js/crtWorker.js",{ useCache: false });
    console.timeEnd('spawncrtWorker');
    var url = window.location.href.split('?')[0];
    crtWorker.postMessage([rawCRTData, rawAutoPopulateData, url, schemaListObject]); // Sending message as an array to the worker
    crtWorker.onmessage = function(r) {
        var crtData = r.data;
        allEnterpiseCRTTables = crtData; 
        //now I can build the reference data search amd the display
        //console.log(crtData);
        buildCRTListAccordion(crtData);
        buildCRTSearchAccordion(crtData);
        
    }
}

function buildWSGWSchemaListAccordion(schemaListObject, buildInfo){
    console.time('buildWSGWSchemaListAccordion');
    var release = getSelectedRelease();
    //as long as I get a list back from the consumerProviderObject Im ok to build something
    if(schemaListObject!=null){
        //now I should be right to start building the UI?
        var id = 'externalSchemaList';
        var headerID = id + 'Header';
        var contentID = id + 'Content';
        var macroListObjCount = 0;
        var thHTML = buildWSGWSchemaListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('External Schemas (WSGW)');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
            //ok so now Im ready to loop through every system
        //console.log(schemaListObject);
        converter = new showdown.Converter();
        converter.setOption('headerLevelStart', 3);
        converter.setOption('simpleLineBreaks', true);
        //So for these ones its better looking at the Schemas for now...
        //treat each Service as a "External Consumer)
        
        forceSortArray(schemaListObject, 'ServiceName', false, function (i, serviceObj) {
            var schemaList = serviceObj.schemaList;
            forceSortArray(schemaList, 'ServiceName', false, function (i, schemaObj) {
                if(schemaObj.core!=true){
                    macroListObjCount++;
                    /*
                    var content = undefinedToEmpty(macroObj.readme);
                    if(content.indexOf('\n')!=-1){
                        var contentArray = content.split('\n');
                        if(contentArray.length>2){
                            var lines = converter.makeHtml(contentArray[0]) +converter.makeHtml(contentArray[1]);       
                        }else{
                            var lines = contentArray[0]; 
                        }
                    }
                    
                    var html = lines;
                    */
                    htmlBody += '<tr><td>' + schemaObj.FormattedDisplayName + '</td><td>' + serviceObj.ServiceName + '</td><td>' + serviceObj.ServiceVersion + '</td><td>' + serviceObj.ServiceCategory + '</td><td>' + schemaObj.filename.replace('local/XmlDocStore/','') + '</td></tr>';    
                    }
                
                
            });    
        });
        console.time('TableBodyempty');
        $('tbody#' + id + 'TableBody').empty();
        console.timeEnd('TableBodyempty');
        console.time('TableBodyappend');
        $('tbody#' + id + 'TableBody').append(htmlBody);
        console.timeEnd('TableBodyappend');
        console.time('buildStandardSearch');
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        console.timeEnd('buildStandardSearch');
        //I actually want to update the Macro Header?
        //TODO Add the version numbers in correctly
        appendAccordionHeader(headerID, macroListObjCount + ' Service Schemas', 'Maven Build Number : '+ buildInfo.projectversion);
    } else {
        $('#' + id + 'SearchLabel').text('No schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No schemas found');
    }
    console.time('macrosAccordionRefresh');
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('macrosAccordionRefresh');
    console.timeEnd('buildSchemaListAccordion');    
}

function returnEnterpriseModels(serviceSummaryObj){
    buildSchemaListAccordion(serviceSummaryObj);
    buildServiceChangeListAccordion(serviceSummaryObj);
}

function buildSchemaListAccordion(serviceSummaryObj) {
    console.time('buildSchemaListAccordion');
    var release = getSelectedRelease();
    console.log(serviceSummaryObj);
    //as long as I get a list back from the consumerProviderObject Im ok to build something
    if((serviceSummaryObj!=null)&&(serviceSummaryObj.summaryList!=null)&&(serviceSummaryObj.summaryList.length>0)){
        var schemaListObject = serviceSummaryObj.summaryList;
        //now I should be right to start building the UI?
        var id = 'schemaList';
        var headerID = id + 'Header';
        var contentID = id + 'Content';
        var macroListObjCount = schemaListObject.length;
        var thHTML = buildSchemaListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Enterprise Schemas');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
            //ok so now Im ready to loop through every system
        //console.log(schemaListObject);
        converter = new showdown.Converter();
        converter.setOption('headerLevelStart', 3);
        converter.setOption('simpleLineBreaks', true);

        forceSortArray(schemaListObject, 'ServiceNumber', false, function (i, macroObj) {
            var numberlink = getMacroLink(macroObj.ServiceNumber, macroObj.key, macroObj.callBackURL);
            var namelink = getMacroLink(macroObj.ServiceName, macroObj.key, macroObj.callBackURL);
            if((macroObj.IsRemoved!=true)&&(macroObj.ServiceNumber!='CORE')){
                var content = undefinedToEmpty(macroObj.readme);
                if(content.indexOf('\n')!=-1){
                    var contentArray = content.split('\n');
                    //now get the lines?
                    if(contentArray.length>2){
                        var lines = converter.makeHtml(contentArray[0]) +converter.makeHtml(contentArray[1]);       
                    }else{
                        var lines = contentArray[0]; 
                    }
                }
                
                var html = lines;
              
                
                htmlBody += '<tr><td>' + numberlink + '</td><td>' + namelink + '</td><td>' + macroObj.ServiceVersion + '</td><td>' + macroObj.ServiceCategory + '</td><td>' + html + '</td></tr>';
            }
                                            
        });
        console.time('TableBodyempty');
        $('tbody#' + id + 'TableBody').empty();
        console.timeEnd('TableBodyempty');
        console.time('TableBodyappend');
        $('tbody#' + id + 'TableBody').append(htmlBody);
        console.timeEnd('TableBodyappend');
        console.time('buildStandardSearch');
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        console.timeEnd('buildStandardSearch');
        //I actually want to update the Macro Header?
        //TODO Add the version numbers in correctly
        
        appendAccordionHeader(headerID, macroListObjCount + ' Service Schemas', 'Maven Build Number : '+ serviceSummaryObj.buildInfo.projectversion);
    } else {
        $('#' + id + 'SearchLabel').text('No schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No schemas found');
    }
    console.time('macrosAccordionRefresh');
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('macrosAccordionRefresh');
    console.timeEnd('buildSchemaListAccordion');
}


function buildServiceProviderConsumerListAccordion(serviceChangesArray,headerAccordion) {
    //TODO - Reimplement with CAPM data
    //console.log('buildServiceProviderConsumerListAccordion');
    console.time('buildServiceProviderConsumerListAccordion');
    var status = 0;
    var statusText = 'Unknown';
    //serviceChangesArray is a object containing a systemList and a serviceList
    var identifier = 'consumerproviderList';
    var htmlHeader = buildInnerAccordion(identifier, 'Service Providers and Consumers');
    //append the models data header
    headerAccordion.append(htmlHeader);
    //now style each one?
    headerAccordion.accordion("refresh");
    var accordionObject = headerAccordion.find('.' + identifier);
    var headerObject = accordionObject[0];
    var contentObject = accordionObject[1];

    if ((serviceChangesArray!=null)&&(serviceChangesArray.systemList!=null)&&(serviceChangesArray.systemList.length>0!=null)){
        status = '200';
        statusText = 'Success'
        //flatten and reverse the listing for each provider and consumer?
        //console.log(systemList);
        var systemList = serviceChangesArray.systemList;
        //now I should be right to start building the UI?
        var id = 'serviceSystemList';
        var systemCount = systemList.length;
        var thHTML = buildServiceProviderConsumerListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        //$('#' + headerID).text('Service Providers and Consumers');
        contentObject.innerHTML= divhtml;
        //$('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        //I should do this in some sort of order?
        //Should the no data stuff come at the top?
        
        for(var i=0;i<systemList.length;i++){
            var systemObj = systemList[i];
            var formatSystemName = systemObj.systemName + '<br><span class="tab">Provides ' + systemObj.providerServiceList.length + ' services.</span>';
            formatSystemName += '<br><span class="tab">Consumes ' + systemObj.consumerServiceList.length + ' services.</span>';
            var providerServiceList = '';
            var consumerServiceList = '';
            //now I need to create two lists for provides and consumes...
            for(var j=0;j<systemObj.consumerServiceList.length;j++){
                var cService = systemObj.consumerServiceList[j].service;
                consumerServiceList += getFormatConsumerProviderLinks(cService);
            }
            for(var k=0;k<systemObj.providerServiceList.length;k++){
                var pService = systemObj.providerServiceList[k].service;
                providerServiceList += getFormatConsumerProviderLinks(pService);
            }
            htmlBody += '<tr><td>' + formatSystemName + '</td><td>' + providerServiceList + '</td><td>' + consumerServiceList + '</td></tr>';
        }
       
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        $('#' + id + 'SearchLabel').text('Currently listing ' + systemCount + ' systems consuming or providing services.');
        appendAccordionHeader(headerObject.id, systemCount + ' systems consuming or providing services');
    } else {
        $('#' + id + 'SearchLabel').text('No change lists found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerObject.id, 'No systems found');
    }
    
    
    console.timeEnd('buildServiceProviderConsumerListAccordion');
}

function buildServiceEmptyProviderConsumerListAccordion(consumerProviderObject) {
    //console.log('buildServiceEmptyProviderConsumerListAccordion');
    console.time('buildServiceEmptyProviderConsumerListAccordion');
    //console.log(consumerProviderObject);
    
    //as long as I get a list back from the consumerProviderObject Im ok to build something
    if ((consumerProviderObject != null) &&(consumerProviderObject.macroLocations != null) &&(consumerProviderObject.macroLocations.category != null)) {
        var serviceConsumerProviderList = flattenMacroList(returnArray(consumerProviderObject.macroLocations.category));
        //console.log(serviceConsumerProviderList);
        var emptySystemList = getEmptyProviderConsumerList(serviceConsumerProviderList);
        //now I should be right to start building the UI?
        //console.log(emptySystemList);
        //build the UI
        var id = 'serviceEmptySystemList';
        var headerID = id + 'Header';
        var contentID = id + 'Content';
        var systemCount = emptySystemList.length;
        var thHTML = buildEmptyServiceProviderConsumerListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Empty Providers and Consumers');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        
        //ok so now Im ready to loop through every system
        if (systemCount > 0) {
            $.each(emptySystemList, function (index, serviceObj) {
                var serviceName = cleanMacroName(serviceObj.name);
                var serviceNumber = serviceObj.number;
                var serviceCategory = serviceObj.category;
                var serviceVersion = serviceObj.version;
                var serviceLink = getMacroLinkFromObject(serviceObj);
                var uniqueID = 'getstatsCell' + (serviceName + serviceNumber + serviceVersion.replace('.', '')).toLowerCase();
                var providerText = '';
                var consumerText = '';
                if ((serviceObj.emptyProviderFlag != null) &&(serviceObj.emptyProviderFlag)) {
                    providerText = 'No Providers';
                }
                if ((serviceObj.emptyConsumerFlag != null) &&(serviceObj.emptyConsumerFlag)) {
                    consumerText = 'No Consumers';
                }
                htmlButton = '<div id="' + uniqueID + '" class="getStatslink" serviceName="' + serviceName + '" serviceCategory="' + serviceCategory + '" serviceNumber="' + serviceNumber + '" serviceVersion="' + serviceVersion + '">';
                htmlButton += 'Get Stats';
                htmlButton += '</div>';
                
                //now get each provider and list them
                //now get each consumer and list them
                htmlBody += '<tr><td>' + serviceLink + '</td><td>' + providerText + '</td><td>' + consumerText + '</td><td>' + htmlButton + '</td></tr>';
            });
            $('tbody#' + id + 'TableBody').empty();
            $('tbody#' + id + 'TableBody').append(htmlBody);
            var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
            $('#' + id + 'SearchLabel').text('Currently listing ' + systemCount + ' systems consuming or providing services.');
            appendAccordionHeader(headerID, systemCount + ' systems');
        } else {
            $('#' + id + 'SearchLabel').text('No missing Consumers or Providers found.');
        }
        //now I have hepas of links to add functions to?
        $(".getStatslink").each(function (index, span) {
            span.addEventListener('click', getEmptyConsumerProviderStats, false);
        });
        $("#macrosAccordion").accordion("refresh");
    }
    console.timeEnd('buildServiceChangeListAccordion');
}

function getEmptyConsumerProviderStats() {
    var serviceName = this.getAttribute("serviceName");
    var serviceNumber = this.getAttribute("serviceNumber");
    var serviceCategory = this.getAttribute("serviceCategory");
    var serviceVersion = this.getAttribute("serviceVersion");
    var serviceLocation = this.getAttribute("serviceLocation");
    
    var appendToID = this.getAttribute("id");
    $("#" + appendToID).empty();
    getConsumersAndProvidersFromCAPM(serviceNumber, serviceLocation, serviceName, serviceVersion, serviceCategory, appendToID);
}

function consumerData(data) {
    //console.log(data);
}
function getConsumersAndProvidersFromCAPM(serviceNumber, serviceLocation, serviceName, serviceVersion, serviceCategory, appendToID) {
    console.time('getConsumersAndProvidersFromCAPM');
    //get the consumers and the providers on two different calls
    var consumerURL = compassConsumersURL(serviceNumber, serviceLocation, serviceName + 'Request', serviceVersion, serviceCategory, 'Service', 'e9', '30d');
    var providerURL = compassProvidersURL(serviceNumber, serviceLocation, serviceName + 'Request', serviceVersion, serviceCategory, 'Service', 'e9', '30d');
    //console.log('getConsumersAndProvidersFromCAPM :' + consumerURL + ' , ' + providerURL);
    $.ajax({
        'url': consumerURL,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        //'jsonpCallback': 'extendedLogPoints',
        'success': function (data) {
            buildConsumerHTMLTableCell(data, appendToID);
        }
    });
    //console.log('Completed one call');
    $.ajax({
        'url': providerURL,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        //'jsonpCallback': 'extendedLogPoints',
        'success': function (data) {
            buildProviderHTMLTableCell(data, appendToID);
        }
    });
    //console.log('Completed two calls');
}

function buildConsumerHTMLTableCell(data, appendToID) {
    //console.log('buildConsumerHTMLTableCell');
    //console.log(data);
    if ((data != null) &&(data.rows != null)) {
        var logPointMsg = '';
        var rows = returnArray(data.rows);
        $.each(rows, function (index, row) {
            if (row.name != null) {
                var logPointName = row.consumer.toUpperCase();
                if ((logPointName != null) &&(logPointName != '')) {
                    logPointMsg += 'Sender:' + logPointName + '<br>';
                }
            }
        });
        if (logPointMsg == '') {
            logPointMsg += 'No Senders Found<br>';
        }
        $("div#" + appendToID).append(logPointMsg);
    }
}
function buildProviderHTMLTableCell(data, appendToID) {
    //console.log('buildProviderHTMLTableCell');
    //console.log(data);
    if ((data != null) &&(data.rows != null)) {
        var logPointMsg = '';
        var rows = returnArray(data.rows);
        $.each(rows, function (index, row) {
            if (row.name != null) {
                var logPointName = row.name.toLowerCase();
                if ((logPointName != 'dp:servicecompleted') &&(logPointName != 'dp:responseflow') &&(logPointName != 'dp:requestflow') &&(logPointName != 'dp:request')) {
                    logPointMsg += 'Reciever:' + logPointName.replace('dp:provider:', '').toUpperCase() + '<br>';
                }
            }
        });
        if (logPointMsg == '') {
            logPointMsg += 'No Reciever Found<br>';
        }
        $("div#" + appendToID).append(logPointMsg);
    }
}
function getProvidersFromCAPM(ServiceId, ServiceName, SchemaVersionNumber, ServiceCategory, monthlyStatsDivID) {
    console.time('getProvidersFromCAPM');
    var svType = 'Service';
    myID = ServiceCategory + "/" + svType + '/' + SchemaVersionNumber + '-%3E' + ServiceName + 'Request';
    //console.log('myID:' + myID);
    //myID = '2058089';
    var b_url = s_url + 'id=' + myID + '&classname=extendedprofilepoint&name=extendedprofilepoint&nametype=classes&action=doList&type=JSONP';
    $.ajax({
        'url': b_url,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        //'jsonpCallback': 'extendedLogPoints',
        'success': function (data) {
            //console.log(data);
            //if success just get the rows names?
            if ((data != null) &&(data.rows != null)) {
                var logPointMsg = '';
                var rows = returnArray(data.rows);
                $.each(rows, function (index, row) {
                    if (row.name != null) {
                        var logPointName = row.name.toLowerCase();
                        //console.log(logPointName);
                        
                        if ((logPointName != 'dp:servicecompleted') &&(logPointName != 'dp:responseflow') &&(logPointName != 'dp:requestflow') &&(logPointName != 'dp:request')) {
                            logPointMsg += logPointName + '<br>';
                        }
                    }
                });
                if (logPointMsg == '') {
                    logPointMsg += 'No Stats Found';
                }
                $("div#" + monthlyStatsDivID).append(logPointMsg);
            }
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
        }
    });
    console.timeEnd('getProvidersFromCAPM');
}


function getFormatConsumerProviderLinks(serviceObject) {
    var html = '';
    var htmlChange = '';
    var hasChangesFlag = serviceObject.different;
    var isNewFlag = serviceObject.IsNew;
    var isRemoved = serviceObject.IsRemoved;
    if (isNewFlag) {
        htmlChange += ' (' + globalSelectedRelease.releaseName + ' new)';
    }else if (isRemoved) {
        htmlChange += ' (' + globalSelectedRelease.releaseName + ' removed)';
    }else if (hasChangesFlag) {
        htmlChange += ' (' + globalSelectedRelease.releaseName + ' changes)';
    }

    var namelink = getMacroLinkFromObject(serviceObject);
    html += namelink + htmlChange + '<br>';
    return html;
}

function getMacroLinkFromObject(serviceObject) {
    var namelink = getMacroLink(serviceObject.FormattedDisplayName, serviceObject.key, serviceObject.callBackURL);
    return namelink;
}

function buildsearchAllRefDataHTML() {
    var thHTML = '<input type="text" name="refDatafilterText" value="" id="refDatafilterText" keyup="refDatafilterData()" />';
    thHTML += '<label for="refDatafilterText" id="refDatafilterCount">loading...</label>';
    thHTML += '<table id="refDatafileterTable" width="100%" >';
    thHTML += '<thead>';
    thHTML += '<tr>';
    thHTML += '<th width="10%">Table</th>';
    thHTML += '<th width="10%">Column</th>';
    thHTML += '<th width="20%">Value</th>';
    thHTML += '<th width="60%">Service Usage</th>';
    thHTML += '</tr>';
    thHTML += '</thead>';
    thHTML += '<tbody id="refDataFilterlist">';
    thHTML += '</tbody>';
    thHTML += '</table>';
    return thHTML;
}

function buildsearchAllTransformationDataHTML() {
    var thHTML = '<input type="text" name="transformationDatafilterText" value="" id="transformationDatafilterText" keyup="transformationDatafilterData()" />';
    thHTML += '<label for="transformationDatafilterText" id="transformationDatafilterCount">loading...</label>';
    thHTML += '<table id="transformationDatafileterTable" width="100%" >';
    thHTML += '<thead>';
    thHTML += '<tr>';
    thHTML += '<th width="60%">Match</th>';
    thHTML += '<th width="20%">FileName</th>';
    thHTML += '<th width="20%">Parent Details</th>';
    thHTML += '</tr>';
    thHTML += '</thead>';
    thHTML += '<tbody id="transformationDataFilterlist">';
    thHTML += '</tbody>';
    thHTML += '</table>';
    return thHTML;
}

function buildCAPMConsumerListTH() {
    var thHTML = '<th width="50%">Consumer</th>';
    thHTML += '<th width="50%">Hits</th>';
    return thHTML;
}
function buildAllBuildsListTH() {
    var thHTML = '<th width="50%">Release Name</th>';
    thHTML += '<th width="50%">Project Version</th>';
    return thHTML;
}


function buildOrphanedFieldsListTH() {
    var thHTML = '<th width="50%">Consumer</th>';
    thHTML += '<th width="50%">Hits</th>';
    return thHTML;
}
function buildRequestArchitectureListTH() {
    var thHTML = '<th width="8%">Proposed Name</th>';
    thHTML += '<th width="2%">Type</th>';
    thHTML += '<th width="5%">Domain</th>';
    thHTML += '<th width="20%">Description</th>';
    thHTML += '<th width="20%">Request Payload</th>';
    thHTML += '<th width="20%">Response Payload</th>';
    thHTML += '<th width="10%">Reference</th>';
    thHTML += '<th width="5%">Request Date</th>';
    thHTML += '<th width="10%">Service</th>';
    return thHTML;
}

function buildServiceArchitectureListTH() {
    var thHTML = '<th width="5%">Number</th>';
    thHTML += '<th width="20%">Name</th>';
    thHTML += '<th width="5%">Type</th>';
    thHTML += '<th width="5%">Domain</th>';
    thHTML += '<th width="10%">Source</th>';
    thHTML += '<th width="5%">Created</th>';
    thHTML += '<th width="20%">Proposals</th>';
    thHTML += '<th width="25%">Schemas</th>';
    return thHTML;
}
function buildServiceLifecycleListTH() {
    var thHTML = '<th width="5%">Number</th>';
    thHTML += '<th width="20%">Name</th>';
    thHTML += '<th width="5%">Version</th>';
    thHTML += '<th width="10%">Category</th>';
    thHTML += '<th width="10%">Status</th>';
    thHTML += '<th width="25%">Providers/Subscribers</th>';
    return thHTML;
}
function buildCAPMServiceListTH() {
    var thHTML = '<th width="5%">Last Call</th>';
    thHTML += '<th width="5%">Number</th>';
    thHTML += '<th width="25%">Name</th>';
    thHTML += '<th width="20%">Namespace</th>';
    thHTML += '<th width="10%">Provider</th>';
    thHTML += '<th width="10%">Time (ms)</th>';
    thHTML += '<th width="10%">Hits</th>';
    thHTML += '<th width="15%">Status</th>';
    return thHTML;
}



function buildProviderSchemaListTH() {
    var thHTML = '<th width="20%">Name</th>';
    thHTML += '<th width="5%">Version</th>';
    thHTML += '<th width="20%">Provider</th>';
    thHTML += '<th width="20%">Schema</th>';
    thHTML += '<th width="20%">Interface</th>';
    thHTML += '<th width="15%">Status</th>';
    return thHTML;
}
function buildExternalSchemaListTH() {
    var thHTML = '<th width="20%">Name</th>';
    thHTML += '<th width="5%">Version</th>';
    thHTML += '<th width="20%">External System</th>';
    thHTML += '<th width="20%">Schema</th>';
    thHTML += '<th width="20%">Interface</th>';
    thHTML += '<th width="15%">Status</th>';
    return thHTML;
}
function buildIntegrationSchemaListTH() {
    var thHTML = '<th width="20%">Name</th>';
    thHTML += '<th width="5%">Version</th>';
    thHTML += '<th width="20%">Provider</th>';
    thHTML += '<th width="20%">Schema</th>';
    thHTML += '<th width="20%">Interface</th>';
    thHTML += '<th width="15%">Status</th>';
    return thHTML;
}
function buildIdentitySchemaListTH() {
    var thHTML = '<th width="10%">Number</th>';
    thHTML += '<th width="20%">Name</th>';
    thHTML += '<th width="5%">Version</th>';
    thHTML += '<th width="20%">Category</th>';
    thHTML += '<th width="45%">Schemas</th>';
    return thHTML;
}
function buildProjectListTH(headerObj) {
    if (headerObj != null) {
    }
    var thHTML = '<th width="3%">Priority</th>';
    thHTML += '<th width="10%">Project</th>';
    thHTML += '<th width="10%">Service</th>';
    thHTML += '<th width="2%">Size</th>';
    thHTML += '<th width="35%">Change Description</th>';
    thHTML += '<th width="10%">Project Manager</th>';
    thHTML += '<th width="10%">Architect/Tech Lead</th>';
    thHTML += '<th width="10%">Trim Reference</th>';
    thHTML += '<th width="10%">Delivery</th>';
    return thHTML;
}

function buildTransformsListTH() {
    var thHTML = '<th width="30%">Name</th>';
    thHTML += '<th width="10%">Type</th>';
    thHTML += '<th width="60%">Location</th>';
    return thHTML;
}

function buildCAPMProviderListTH() {
    var thHTML = '<th width="30%">Provider</th>';
    thHTML += '<th width="30%">Root Element</th>';
    thHTML += '<th width="40%">Namespace</th>';
    return thHTML;
}

function buildServiceProviderConsumerListTH() {
    var thHTML = '<th width="20%">System</th>';
    thHTML += '<th width="40%">Provides</th>';
    thHTML += '<th width="40%">Consumes</th>';
    return thHTML;
}

function buildSchemaListTH() {
    var thHTML = '<th width="8%">Number/ID</th>';
    thHTML += '<th width="16%">Name</th>';
    thHTML += '<th width="4%">Version</th>';
    thHTML += '<th width="5%">Category</th>';
    thHTML += '<th width="67%">Description</th>';
    return thHTML;
}
function buildWSGWSchemaListTH() {
    var thHTML = '<th width="30%">Name</th>';
    thHTML += '<th width="10%">Entity</th>';
    thHTML += '<th width="5%">Version</th>';
    thHTML += '<th width="10%">Category</th>';
    thHTML += '<th width="45%">File Name</th>';
    return thHTML;
}
function buildServicePatternListTH() {
    var thHTML = '<th width="25%">Name</th>';
    thHTML += '<th width="75%">Description</th>';
    return thHTML;
}

function buildServiceFunctionListTH() {
    var thHTML = '<th width="20%">Function Type</th>';
    thHTML += '<th width="20%">SOA Service Field</th>';
    thHTML += '<th width="20%">Reference Table</th>';
    thHTML += '<th width="20%">Reference from Column</th>';
    thHTML += '<th width="20%">Reference to Column</th>';
    return thHTML;
}

function buildEmptyServiceProviderConsumerListTH() {
    var thHTML = '<th width="50%">Service</th>';
    thHTML += '<th width="15%">Empty Provider</th>';
    thHTML += '<th width="15%">Empty Consumer</th>';
    thHTML += '<th width="20%">Get Stats</th>';
    return thHTML;
}

function buildServiceChangeListTH() {
    var thHTML = '<th width="2%">#</th>';
    thHTML += '<th width="16%">Name</th>';
    thHTML += '<th width="4%">Version</th>';
    thHTML += '<th width="8%">Category</th>';
    thHTML += '<th width="50%">Change Summary</th>';
    thHTML += '<th width="10%">Major Changes</th>';
    thHTML += '<th width="10%">Minor Changes</th>';
    return thHTML;
}
function buildSystemChangeListTH() {
    var thHTML = '<th width="10%">System Name</th>';
    thHTML += '<th width="70%">Service Changed</th>';
    thHTML += '<th width="10%">Major Changes</th>';
    thHTML += '<th width="10%">Minor Changes</th>';
    return thHTML;
}

function buildServiceImplementationListTH() {
    var thHTML = '<th width="5%">ID</th>';
    thHTML += '<th width="40%">SOAP Action</th>';
    thHTML += '<th width="5%">Policy ID</th>';
    thHTML += '<th width="50%">Description</th>';
    return thHTML;
}

function buildAccordionWithSearch(accordionHeaderID, accordionHeader, formID, searchInputID, searchLabelID, tableID, tableBodyID, noResultsID, tableTHListHTML) {
    var countOfCols = 0;
    countOfCols = countOfHeaderColumns(tableTHListHTML);
    var html = '<h3 id="' + accordionHeaderID + '">' + accordionHeader + '</h3>';
    html += '<div>';
    html += '<form action="" name="' + formID + '">';
    html += '<fieldset>';
    html += '<input type="text" name="search" value="" id="' + searchInputID + '" />';
    html += '<label class="loading" for="' + searchInputID + '" id="' + searchLabelID + '">loading...</label>';
    html += '</fieldset>';
    html += '</form>';
    html += '<table id="' + tableID + '">';
    html += '<thead>';
    html += '<tr>';
    html += tableTHListHTML;
    html += '</thead>';
    html += '</tr>';
    html += '<tbody id="' + tableBodyID + '">';
    html += '<tr id="' + noResultsID + '">';
    html += '<td colspan="' + countOfCols + '">No Results</td>';
    html += '</tr>';
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    return html;
}

function buildAccordionDivWithSearch(id, tableTHListHTML) {
    var formID = id + 'Form';
    var searchInputID = id + 'Search';
    var searchLabelID = id + 'SearchLabel';
    var tableID = id + 'Table';
    var tableBodyID = id + 'TableBody';
    var noResultsID = id + 'noresults';
    
    var countOfCols = 0;
    countOfCols = countOfHeaderColumns(tableTHListHTML);
    var html = '';
    html += '<form action="" name="' + formID + '">';
    html += '<fieldset>';
    html += '<input type="text" name="search" value="" id="' + searchInputID + '" />';
    html += '<label class="loading" for="' + searchInputID + '" id="' + searchLabelID + '">loading...</label>';
    html += '</fieldset>';
    html += '</form>';
    html += '<table id="' + tableID + '">';
    html += '<thead>';
    html += '<tr>';
    html += tableTHListHTML;
    html += '</thead>';
    html += '</tr>';
    html += '<tbody id="' + tableBodyID + '">';
    html += '<tr id="' + noResultsID + '">';
    html += '<td colspan="' + countOfCols + '">No Results</td>';
    html += '</tr>';
    html += '</tbody>';
    html += '</table>';
    return html;
}


function buildStandardSearch(searchInputID, tableID, noResultsID, searchLabelID) {
    console.time('buildStandardSearch');
    //console.log(searchInputID);
    var qs = $('input#' + searchInputID).quicksearch('table#' + tableID + ' tbody tr', {
        noResults: '#' + noResultsID,
        selector: 'td',
        stripeRows:[ 'odd', 'even'],
        bind: 'keyup click input',
        'onAfter': function () {
            if (searchLabelID != null) {
                $('#' + searchLabelID).text(' ' + this.matchedResultsCount + ' results');
            }
        }
    });
    qs.cache();
    return qs;
    console.timeEnd('buildStandardSearch');
}

function countOfHeaderColumns(headerHTML) {
    return countOfStrings(headerHTML, '</th>');
}

function countOfStrings(string, substring) {
    return string.split(substring).length - 1;
}




/*
 * Scroll testing
 */

window.onscroll = function () {
    scrollFunction()
};

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        document.getElementById("menusButton").style.display = "block";
    } else {
        document.getElementById("menusButton").style.display = "none";
    }
}

// When the user clicks on the button, scroll to the top of the document
function scrollToMenus() {
    document.body.scrollTop = 0;
    // For Chrome, Safari and Opera
    document.documentElement.scrollTop = 0;
    // For IE and Firefox
}

function loadproviders() {
    //lets make a call to get providers
    //http://compass-prod-web:8080/CompassWeb/GetObjects?id=dp:serviceCompleted&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=consumer.sql&end=now&start=-4w
    var pm_url = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=-1&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=provider.sql&end=now&start=-4w';
    //var pm_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects?id=dp:serviceCompleted&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=consumer.sql&distinct=1&end=now&start=-4w';
    //console.log('loadproviders:\n' + pm_url);
    $.ajax({
        url: pm_url,
        dataType: 'jsonp',
        jsonpCallback: 'genericDataLogger',
        jsonp: 'callback'
    });
}

function genericDataLogger(data) {
    console.log(data);
}





function getExternalSchemaListJSONData() {
    console.time('getExternalSchemaListJSONData');
    var url = getSelectedRelease().releaseLocation + 'wsgwSchemasList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    $.ajax({
        'url': url,
        'type': 'GET',
        'success': function (data) {
            //console.log(data);
            //build the accordion?
            buildExternalSchemaListAccordion(data);
            console.timeEnd('getExternalSchemaListJSONData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            buildExternalSchemaListAccordion(XMLHttpRequest);
            console.timeEnd('getExternalSchemaListJSONData');
            hideLoadingBlock(-1);
        }
    });
}

function getSchemasJSONData(releaseObj, releaseName, accordionObject) {
    console.time(releaseName + '-' + releaseObj.name);
    
    var jsonLinkRel = releaseObj.callBackURL + '&'+ getCacheBuster();
    //var jsonLinkRel = routerURL + '/getServiceModels' + '?releaseName=' + releaseName + '&serviceModelName='+ releaseObj.name+'&'+ getCacheBuster();
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            console.timeEnd(releaseName + '-' + releaseObj.name);
            //generically build the models stuff...
            buildSchemaModelsListAccordion(data, releaseName, accordionObject);
        },
        'error': function (XMLHttpRequest) {
            console.timeEnd(releaseName + '-' + releaseObj.name);
            console.log('Error in respone');
            console.log(XMLHttpRequest);
        }
    });
}
function getSchemaChangesJSONData(releaseObj, releaseName, accordionObject) {
    var timerName = 'Changes-'+releaseName + '-' + releaseObj.name;
    console.time(timerName);
    var queryString = '[name="'+ releaseName + '"].serviceModels[name="' + releaseObj.name + '"]';
    queryString += '';
    var jsonLinkRel = releaseObj.callBackURL + '&'+ getCacheBuster();
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            console.timeEnd(timerName);
            //generically build the models stuff...
            buildSchemaChangesListAccordion(data, releaseName, accordionObject);
        },
        'error': function (XMLHttpRequest) {
            console.timeEnd(timerName);
            console.log('Error in respone');
            console.log(XMLHttpRequest);
        }
    });
}

function getLifecycleServicesJSONData() {
    console.time('getRetiredServicesJSONData');
    //now I need a unique count of all Service Names
    //and I need all the schemas from macroList.json
    //console.log('getRetiredServicesJSONData');
    showLoadingBlock();
    getProjectListJSONData();
    var allProvidersURL = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=-1&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=provider.sql&end=now&start=-24w';
    var serviceSchemasURL = getSelectedRelease().releaseLocation + 'ChangeSummary.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    var allRequests =[];
    allRequests.push($.ajax({
        'url': allProvidersURL, 'type': 'GET', 'dataType': 'jsonp', jsonp: 'callback'
    }));
    allRequests.push($.getJSON(serviceSchemasURL));
    var requests = $.unique(allRequests);
    var defer = $.when.apply($, requests);
    defer.done(function () {
        buildLifecycleListAccordion(arguments[0][0], arguments[1][0]);
        console.timeEnd('getRetiredServicesJSONData');
        hideLoadingBlock(3);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        buildLifecycleListAccordion(jqXHR, jqXHR);
        hideLoadingBlock(-1);
        console.timeEnd('getRetiredServicesJSONData');
        //build the accordian anyway?
    });
}

function getAllCAPMServicesJSONData() {
    console.time('getAllCAPMServicesJSONData');
    var allProvidersURL = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=-1&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=provider.sql&end=now&start=-4w';
    var serviceSchemasURL = getSelectedRelease().releaseLocation + 'ServiceUsage.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;;
    var allRequests =[];
    allRequests.push($.ajax({
        'url': allProvidersURL, 'type': 'GET', 'dataType': 'jsonp', jsonp: 'callback'
    }));
    allRequests.push($.getJSON(serviceSchemasURL));
    var requests = $.unique(allRequests);
    var defer = $.when.apply($, requests);
    defer.done(function () {
        buildAllCAPMServicesListAccordion(arguments[0][0], arguments[1][0]);
        console.timeEnd('getAllCAPMServicesJSONData');
        hideLoadingBlock(3);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        buildAllCAPMServicesListAccordion(jqXHR, jqXHR);
        hideLoadingBlock(-1);
        console.timeEnd('getAllCAPMServicesJSONData');
    });
}

function getAllCAPMProvidersJSONData() {
    console.time('getAllCAPMProvidersJSONData');
    var url = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=-1&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=provider.sql&end=now&start=-4w';
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'jsonp',
        jsonp: 'callback',
        'success': function (data) {
            //console.log(data);
            //build the accordion?
            buildCAPMProviderListAccordion(data);
            console.timeEnd('getAllCAPMProvidersJSONData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getAllCAPMProvidersJSONData');
            hideLoadingBlock(-1);
        }
    });
}

function mergeIdentitySchemaList(identitySchemaList){
    console.time('mergeIdentitySchemaList');
    var uniqueArray = [];
    var newServiceList = [];
    var matchedFlag = false;
    $.each(identitySchemaList, function(identityIndex, indentitySchema){
        var location = indentitySchema.location;
        var name = indentitySchema.name;
        var dir = location.replace(name,'');
        //now that I have dir I want to loop through the same collection to match anything with the same dir but different name
        $.each(identitySchemaList, function(compareIndex, compareSchema){
            var compLocation = compareSchema.location;
            var compName = compareSchema.name;
            var compDir = compLocation.replace(compName, '');
            if((compDir==dir)&&(compName!=name)&&(uniqueArray.indexOf(location)==-1)){
                //this means I can also add a new service to the list
                var newService = createDomainService(indentitySchema, compareSchema, 'Identity Domain');
                newServiceList.push(newService);
                uniqueArray.push(compLocation);
                matchedFlag = true;
                return false;
            }
            
        });
        if(matchedFlag!=true){
             var newService = createDomainService(indentitySchema, null, 'Identity Domain');
             newServiceList.push(newService);
        }
    });
    console.timeEnd('mergeIdentitySchemaList');
    return newServiceList;
}
function createDomainService(indentitySchema, matchedSchema, domain){
    var newService = {};
    var location = indentitySchema.location;
    var name = indentitySchema.name;
    var dir = location.replace(name,'');
    newService.location = dir;
    newService.category = domain;
    newService.type = location.split('/')[0];
    if((newService.type.toLowerCase()=='core')||(newService.type.toLowerCase()=='msg')){
        newService.name = name.replace('.xsd','');
        newService.number = newService.type;
        newService.version = location.split('/')[1];
    }else{
        newService.name = location.split('/')[1].split('-')[1];
        newService.number = location.split('/')[1].split('-')[0];
        newService.version = location.split('/')[2];
    }
    
    
    var schemaArray = [];
    schemaArray.push(indentitySchema);
    if((matchedSchema!='undefined')&&(matchedSchema!=null)){
        schemaArray.push(matchedSchema);                
    }
    newService.schemas = schemaArray; 
    return newService;
}

function buildIdentitySchemaListAccordion(identitySchemaData) {
    console.time('buildIdentitySchemaListAccordion');
    var id = 'identitySchemaList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    var release = getSelectedRelease();
    var releaseLocation = release.releaseLocation
    if ((identitySchemaData != null) &&(identitySchemaData.identitySchemaLists != null) &&(identitySchemaData.identitySchemaLists.identitySchemaList != null)) {
        var identitySchemaList = returnArray(identitySchemaData.identitySchemaLists.identitySchemaList);
        var mergedIdentitySchemaList = mergeIdentitySchemaList(identitySchemaList);
        
        var thHTML = buildIdentitySchemaListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Identity Domain Specific Schemas');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //now loop
        var identitySchemaListCount = mergedIdentitySchemaList.length;
        forceSortArray(mergedIdentitySchemaList, 'location', false, function (i, identityService) {
            var schemaMsg = '';
            $.each(identityService.schemas, function(schemaIndex, schemaObj){
                var fileLink = createNewTabLink(releaseLocation + 'indentityModels/' + schemaObj.location, schemaObj.name);
                schemaMsg+=fileLink + '<br>';
            });
            htmlBody += '<tr><td>' + identityService.number + '</td><td>' + identityService.name + '</td><td>' + identityService.version + '</td><td>' + identityService.category + '</td><td>' + schemaMsg + '</td></tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, identitySchemaListCount + ' Identity Services', 'Maven Build Number : '+release.indentityModelsVersion);
    } else {
        //console.log(identitySchemaData);
        if ((identitySchemaData.status != null) &&(identitySchemaData.statusText != null)) {
            var status = identitySchemaData.status;
            var statusText = identitySchemaData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No identity schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Identity Schemas found');
    }
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('buildIdentitySchemaListAccordion');
}

function buildIntegrationSchemaListAccordion(integrationList, buildInfo){
    console.time('buildIntegrationSchemaListAccordion');
    var id = 'integrationSchemaList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    if(integrationList != null){
        //console.log(integrationSchemaList);
        var thHTML = buildIntegrationSchemaListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Integration Schemas');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //now loop
        var integrationSchemaListCount = integrationList.length;
        forceSortArray(integrationList, 'location', false, function (i, integrationSchema) {
            var integrationLocation = undefinedToEmpty(integrationSchema.location);
            htmlBody += '<tr><td>' + integrationSchema.ServiceName + '</td><td>' + integrationSchema.ServiceVersion + '</td><td>' + integrationSchema.ServiceCategory + '</td><td>' + 'fileLink' + '</td><td>' + 'serviceElement'+ '</td><td>' + 'status' + '</td></tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, integrationSchemaListCount + ' Integration Schemas', 'Maven Build Number : '+buildInfo.enterpriseModelsVersion);
    } else {
        //console.log(integrationSchemaData);
        if ((integrationSchemaData.status != null) &&(integrationSchemaData.statusText != null)) {
            var status = integrationSchemaData.status;
            var statusText = integrationSchemaData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No integration schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Integration Schemas found');
    }
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('buildIntegrationSchemaListAccordion');
}

function buildExternalSchemaListAccordion(externalSchemaData) {
    console.time('buildExternalSchemaListAccordion');
    var release = getSelectedRelease();
    var id = 'externalSchemaList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    if ((externalSchemaData != null) &&(externalSchemaData.wsgwSchemasLists != null) &&(externalSchemaData.wsgwSchemasLists.wsgwSchemasList != null)) {
        var externalSchemaList = returnArray(externalSchemaData.wsgwSchemasLists.wsgwSchemasList);
        var thHTML = buildExternalSchemaListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('External Schemas (WSGW)');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //now loop
        var externalSchemaListCount = 0;
        forceSortArray(externalSchemaList, 'location', false, function (i, externalSchema) {
            var externalLocation = undefinedToEmpty(externalSchema.location);
            //console.log(providerLocation);
            if (externalLocation != '') {
                var providerName = getExternalSystemFromLocation(externalLocation);
                var version = getVersionFromLocation(externalLocation);
                var serviceName = getFileNamefromLocation(externalLocation, false);
                var fileName = getFileNamefromLocation(externalLocation, true);
                var fileLink = createNewTabLink(getSelectedRelease().releaseLocation + 'wsgw/' + externalLocation, fileName);
                var isCoreFlag = getIsCoreFromLocation(externalLocation);
                var isExternalInterfaceFlag = getIsExternalInterfaceFromLocation(externalLocation);
                
                var providerMsg = '';
                if ((isCoreFlag)||(isExternalInterfaceFlag==false)) {
                    var serviceElement = '';
                } else {
                    var serviceElement = serviceName;
                    externalSchemaListCount++;
                    htmlBody += '<tr><td>' + serviceName + '</td><td>' + version + '</td><td>' + providerName + '</td><td>' + fileLink + '</td><td>' + serviceElement + '</td><td>' + status + '</td></tr>';
                }
                var status = '';
                
            }
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, externalSchemaListCount + ' External Schemas', 'Maven Build Number : '+release.wsgw_Version);
    } else {
        //console.log(providerSchemaData);
        if ((providerSchemaData.status != null) &&(providerSchemaData.statusText != null)) {
            var status = providerSchemaData.status;
            var statusText = providerSchemaData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No provider schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Provider Schemas found');
    }
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('buildExternalSchemaListAccordion');
}

function processGenericSchemaList(XSDContents, readMeContents, autoPopulateObj, buildInfo){
    console.time('processGenericSchemaList');
    if (releaseObjectValid(XSDContents)){
        var processServiceList = schemaListProcessor(XSDContents);
        var url = window.location.href.split('?')[0];
        var serviceList = addKeysAndNames(processServiceList, url, globalSelectedRelease);
        var serviceListwithReadme = mergeREADME(serviceList, readMeContents);
        var serviceListwithReadme = mergeAutoPopulate(serviceListwithReadme, autoPopulateObj);
        console.timeEnd('processGenericSchemaList');
        return serviceListwithReadme;

    }else{
        console.timeEnd('processGenericSchemaList');
        console.log(XSDContents);
        a=apparentlythereleaseisntvalid;
    }
    return [];
    
}

function buildSchemaModelsListAccordion(serviceModelsObject, releaseName, accordionObjects){    
    console.time('buildSchemaModelsListAccordion' + '-' + serviceModelsObject.name);
    //I have the parent accorion object so get the content and header based on the class and id selector?
    var headerObject = accordionObjects[0];
    var contentObject = accordionObjects[1];
    
    if ((serviceModelsObject.models != null)&&(serviceModelsObject.models.length>0)) {
        var modelCount = serviceModelsObject.models.length;
        appendAccordionHeader(headerObject.id, modelCount);

        var thHTML = buildSchemaListTH();
        var id = serviceModelsObject.name;
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        
        contentObject.innerHTML= divhtml;
        var htmlBody = '';
        //now loop
        
        forceSortArray(serviceModelsObject.models, 'directory', false, function (i, modelObject) {
            //whats the url to get the service?
            var numberlink = getMacroLink(modelObject.ServiceNumber, modelObject.key, modelObject.callBackURL, serviceModelsObject.name, releaseName);
            var namelink = getMacroLink(modelObject.ServiceName, modelObject.key, modelObject.callBackURL, serviceModelsObject.name, releaseName);
            htmlBody += '<tr><td>' + numberlink + '</td><td>' + namelink + '</td><td>' + modelObject.ServiceVersion + '</td><td>' + modelObject.ServiceCategory + '</td><td>' + modelObject.description + '</td></tr>';
        });
        
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        var buildNo = getBuildNumberFromObject(serviceModelsObject);
        appendAccordionHeader(headerObject.id, modelCount + ' Schemas', 'Maven Build Number : '+buildNo);
    } else {
        //console.log(providerSchemaData);
        if ((providerSchemaData.status != null) &&(providerSchemaData.statusText != null)) {
            var status = providerSchemaData.status;
            var statusText = providerSchemaData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No provider schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Provider Schemas found');
    }
    $("#macrosAccordion").accordion("refresh");
    //at this stage I should have built by this
    //selector for all linkClass
    var allServiceLinks = $('.servicelink.'+releaseName +'.' + serviceModelsObject.name);
    for(var i = 0;i<allServiceLinks.length;i++){
        var linkObject = allServiceLinks[i];
        linkObject.addEventListener('click', function(){
            //I need to relate this back to sosme object?
            console.log('event has been click');
            var linkObject = this;
            var serviceKey = $( linkObject ).attr('key');
            var callBackURL = $( linkObject ).attr('callBackURL');
            //call a function to get everything by the query using the key?
            createSingleSchemaView(releaseName, serviceModelsObject.name, serviceKey, callBackURL, 'newTab', null)    
            
        });
    }
    console.timeEnd('buildSchemaModelsListAccordion' + '-' + serviceModelsObject.name);
}
function buildSchemaChangesListAccordion(serviceModelsObject, releaseName, accordionObjects){    
    console.time('buildSchemaModelsListAccordion' + '-' + serviceModelsObject.name);
    //I have the parent accorion object so get the content and header based on the class and id selector?
    var headerObject = accordionObjects[0];
    var contentObject = accordionObjects[1];
    
    if ((serviceModelsObject.models != null)&&(serviceModelsObject.models.length>0)) {
        var changesObjects = getChangesFromServiceModels(serviceModelsObject.models);
        var modelCount = changesObjects.length;
        appendAccordionHeader(headerObject.id, modelCount);

        var thHTML = buildServiceChangeListTH();
        var id = serviceModelsObject.name + 'Changes';
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        
        contentObject.innerHTML= divhtml;
        var htmlBody = '';
        //now loop
        var totalMajorChanges = 0;
        var totalMinorChanges = 0;
        var totalNewServicesCount = 0;
        var totalNewServicesVersionCount = 0;
        var totalDocumentationChanges = 0;

        forceSortArray(changesObjects, 'changeSortOder', false, function (i, modelObject) {
            //whats the url to get the service?
            var numberlink = getMacroLink(modelObject.ServiceNumber, modelObject.key, modelObject.callBackURL, serviceModelsObject.name, releaseName);
            var namelink = getMacroLink(modelObject.ServiceName, modelObject.key, modelObject.callBackURL, serviceModelsObject.name, releaseName);
            var changeMsg = '';
            //this has to be stuff relating to the changes?
            if(modelObject.IsNew){
                modelObject.majorClass = 'newcell';
                modelObject.changeMsgClass = 'newcell';
                changeMsg = 'New Service for this Release';
                totalNewServicesCount++;
            }else if(modelObject.VersionChange){
                modelObject.majorClass = 'newversioncell';
                modelObject.changeMsgClass = 'newversioncell';
                changeMsg = 'New Version for this Release';
                totalNewServicesVersionCount++;
            }else if(modelObject.majorChangeCount!==0){
                 changeMsg = changeMsg + modelObject.changeSummary;
                 modelObject.changeMsgClass = 'majorcell';
                 modelObject.majorClass = 'majorcell';
            }else if(modelObject.minorChangeCount!=0){
                 changeMsg = changeMsg + modelObject.changeSummary;
                 modelObject.changeMsgClass = 'majorcell';
                 modelObject.minorClass = 'minorcell';
            }else if(((modelObject.majorChangeCount+modelObject.minorChangeCount)==0)&&(modelObject.emumerationChangeCount!=0)){
                 changeMsg = changeMsg + modelObject.changeSummary;
                 modelObject.changeMsgClass = 'enumerationOnly';
            }
            if(modelObject.minorChangeCount!=0){
                modelObject.minorClass = 'minorcell';
            }
            if((modelObject.VersionChange!=true)&&(modelObject.IsNew!=true)&&(modelObject.minorChangeCount!=0)&&(modelObject.majorChangeCount==0)){
                totalMinorChanges++;
            }else if((modelObject.VersionChange!=true)&&(modelObject.IsNew!=true)&&(modelObject.majorChangeCount!=0)){
                totalMajorChanges++;
            }
            //limit change messages to 10 lines
            var changeMsgArray = changeMsg.split('\n');
            var changeMsgArray10 = [];
            //keep the first 10 lines only
            for (var i = 0;i<changeMsgArray.length;i++){
                if(i==10){break;}
                changeMsgArray10.push(changeMsgArray[i]);
            }
            var finalChangeMessage = changeMsgArray10.join('<br>');
            changeMsg = changeMsg.substr(0, 500);
            htmlBody += '<tr>' + createTD(numberlink) + createTD(namelink) + createTD(modelObject.ServiceVersion) + createTD(modelObject.ServiceCategory) + createTD(finalChangeMessage, modelObject.changeMsgClass) + createTD(modelObject.majorChangeCount, modelObject.majorClass) + createTD(modelObject.minorChangeCount, modelObject.minorClass) + '</tr>';
            
        });
        
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        var currentRelease = serviceModelsObject.buildInfo.currentRelease;
        var previousRelease = serviceModelsObject.buildInfo.previousRelease;
        
        appendAccordionHeader(headerObject.id, modelCount + ' Schemas', 'Comparing ' + currentRelease + ' to '+ previousRelease);
    } else {
        //console.log(providerSchemaData);
        if ((providerSchemaData.status != null) &&(providerSchemaData.statusText != null)) {
            var status = providerSchemaData.status;
            var statusText = providerSchemaData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No provider schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Provider Schemas found');
    }
    $("#changesAccordion").accordion("refresh");
    //at this stage I should have built by this
    //selector for all linkClass
    var allServiceLinks = $('.servicelink.'+releaseName +'.' + serviceModelsObject.name);
    for(var i = 0;i<allServiceLinks.length;i++){
        var linkObject = allServiceLinks[i];
        linkObject.addEventListener('click', function(){
            //I need to relate this back to sosme object?
            console.log('event has been click');
            var linkObject = this;
            var serviceKey = $( linkObject ).attr('key');
            var callBackURL = $( linkObject ).attr('callBackURL');
            //call a function to get everything by the query using the key?
            createSingleSchemaView(releaseName, serviceModelsObject.name, serviceKey, callBackURL, 'newTab', null)    
            
        });
    }
    console.timeEnd('buildSchemaModelsListAccordion' + '-' + serviceModelsObject.name);
}

function getChangesFromServiceModels(allModels){
    console.time('getChangesFromServiceModels');
    //for each model delete if its not different?
    var changeModels = [];
    for(var i=0;i<allModels.length;i++){
        var model = allModels[i];
        if(model.different){
            changeModels.push(model);
        }
    }
    console.timeEnd('getChangesFromServiceModels');
    return changeModels;
}

function createSingleSchemaView(releaseName, serviceModelsName, serviceKey, callBackURL, showType, parentDOMObjectID){
    var timerKey = releaseName + serviceModelsName + serviceKey;
    console.time(timerKey);
    //create a single call back to get this data from disk now.....
    var queryString = '[name="'+ releaseName + '"].serviceModels[name="' + serviceModelsName + '"].models[key="'+serviceKey+'"]'
    var callLink = encodeURIComponent(callBackURL);
    var jsonLinkRel = callBackURL+ '&'+ getCacheBuster();
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (data) {
            console.timeEnd(timerKey);
            //generically build the models stuff...
            buildSingleSchemaDisplay(data, releaseName, serviceModelsName, showType, parentDOMObjectID);
        },
        'error': function (XMLHttpRequest) {
            console.timeEnd(timerKey);
            console.log('Error in respone');
            console.log(XMLHttpRequest);
        }
    });


}

function buildSingleSchemaDisplay(ServiceObject, releaseName, serviceModelsName, showType, parentDOMObjectID){
    console.log('buildSingleSchemaDisplay');
    //Now I have a Service Object to build some sort of display?
    //Im not sure what the parent Object ID is right now but maybe it should be new tab creation or a mode or something if null
    if(showType=='newTab'){
        //create a new Tab?
        var index = $('div#maintab a[href="#tab' + ServiceObject.key + '"]').parent().index();
        if (index != -1) {
            //console.log('make this tab the active one');
            $("div#maintab").tabs("option", "active", index);
        } else {
            console.time('newMacroTab');
            showLoadingBlock();
            handleMacroData(ServiceObject);
            hideLoadingBlock(-1);
        }
    }
}

function getBuildNumberFromObject(serviceModelsObject){
    var result = '0.0.000';
    if((serviceModelsObject!=null)&&(serviceModelsObject.buildInfo!=null)&&(serviceModelsObject.buildInfo.projectversion!=null)){
        result = serviceModelsObject.buildInfo.projectversion;
    }
    return result;
}
function getExternalSystemFromLocation(location) {
    //split the string based on slash
    var locationArray = location.split('/');
    if (locationArray.length > 3) {
        return locationArray[2].replace('WSGateway_','');
    } else {
        return 'Unknown';
    }
}

function getProviderFromLocation(location) {
    //split the string based on slash
    var locationArray = location.split('/');
    if (locationArray.length > 1) {
        return locationArray[0];
    } else {
        return 'Unknown';
    }
}

function getIntegrationFromLocation(location) {
    //split the string based on slash
    var locationArray = location.split('/');
    if (locationArray.length > 1) {
        return locationArray[0];
    } else {
        return 'Unknown';
    }
}

function getIsCoreFromIntegrationLocation(location, name) {
    //split the string based on slash
    var result = false;
    var lcLocation = location.toLowerCase();
    //console.log(lcLocation);
    if ((lcLocation.indexOf('/core/') > -1) ||(lcLocation.indexOf('xxxx') > -1) ||(lcLocation.indexOf('xxxx') > -1)) {
        return true;
    }
    return false;
}

function getIsExternalInterfaceFromLocation(location, name) {
    //split the string based on slash
    var result = true;
    var locationArray = location.split('/');
    
    var last = locationArray[locationArray.length-1].toLowerCase();
    if ((last.indexOf('errors') > -1)||(last.indexOf('compositetypes.xsd') > -1)) {
        result = false;
    }else{
        result = true;
    }
    return result;
}




function buildLifecycleListAccordion(allProvidersData, allServicesData) {
    console.time('buildLifecycleListAccordion');
    //console.log(allProvidersData);
    //console.log(allServicesData);
    var id = 'serviceLifecycleList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    if ((allServicesData != null) &&(allServicesData.macroLocations != null) &&(allServicesData.macroLocations.category != null) &&(allProvidersData != null) &&(allProvidersData.attributes != null) &&(allProvidersData.rows != null)) {
        var servicesList = returnArray(flattenMacroList(allServicesData.macroLocations.category).macroList);
        //console.log(servicesList);
        var providersList = returnArray(allProvidersData.rows);
        //console.log(providersList);
        //so loop though the service list and the provider list and match and add
        var mergedServicesCAPMList = mergeCAPMProviderData2servicesData(servicesList, providersList);
        //console.log(mergedServicesCAPMList);
        var thHTML = buildServiceLifecycleListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Service Status List');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //now loop
        var macroListObjCount = 0;
        forceSortArray(mergedServicesCAPMList, 'location', false, function (i, macroObj) {
            if ((macroObj.number != 'Core') &&(macroObj.number != 'Msg')) {
                macroListObjCount++;
                var uniqueLink = macroObj.number + '-' + cleanMacroName(macroObj.name) + '-' + cleanSchemaVersion(macroObj.version);
                var numberlink = getMacroLink(macroObj.number, macroObj.key, macroObj.callBackURL);
                var namelink = getMacroLink(cleanMacroName(macroObj.name), macroObj.key, macroObj.callBackURL);
                var status = 'Unknown';
                var providerMsg = '';
                if (macroObj.providerDataList != null) {
                    var providersList = returnArray(macroObj.providerDataList);
                    //console.log(providersList);
                    $.each(providersList, function (indy, provider) {
                        //console.log(provider);
                        if (providerMsg != '') {
                            providerMsg += '<br>';
                        }
                        providerMsg = providerMsg + undefinedToEmpty(provider.provider);
                        //a=b;
                    });
                    status = 'Active';
                } else if (changedInCurrentRelease(macroObj) == true) {
                    //now I want to check the change summary...
                    status = 'Changed this Release';
                } else {
                    status = 'Inactive';
                }
                
                htmlBody += '<tr><td>' + numberlink + '</td><td>' + namelink + '</td><td>' + undefinedToEmpty(macroObj.category) + '</td><td>' + undefinedToEmpty(macroObj.version) + '</td><td>' + status + '</td><td>' + providerMsg + '</td></tr>';
            }
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, macroListObjCount + ' Service Schemas');
    } else {
        //console.log(allProvidersData);
        if ((allProvidersData.status != null) &&(allProvidersData.status != null)) {
            var status = allProvidersData.status;
            var statusText = allProvidersData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No status found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Status found');
    }
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildLifecycleListAccordion');
}

function buildAllCAPMServicesListAccordion(allProvidersData, allServicesData) {
    console.time('buildAllCAPMServicesListAccordion');
    var id = 'capmServiceList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    if ((allServicesData != null) &&(allServicesData.macroLocations != null) &&(allServicesData.macroLocations.category != null) &&(allProvidersData != null) &&(allProvidersData.attributes != null) &&(allProvidersData.rows != null)) {
        var servicesList = returnArray(flattenMacroList(allServicesData.macroLocations.category).macroList);
        //console.log(servicesList);
        var providersList = returnArray(allProvidersData.rows);
        //console.log(providersList);
        //so loop though the service list and the provider list and match and add
        var mergedServicesCAPMList = mergeCAPMProviderData2servicesData(servicesList, providersList);
        //console.log(mergedServicesCAPMList);
        var thHTML = buildServiceLifecycleListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('CAPM Service List');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //now loop
        var macroListObjCount = 0;
        forceSortArray(mergedServicesCAPMList, 'location', false, function (i, macroObj) {
            if ((macroObj.number != 'Core') &&(macroObj.number != 'Msg')) {
                macroListObjCount++;
                var uniqueLink = macroObj.number + '-' + cleanMacroName(macroObj.name) + '-' + cleanSchemaVersion(macroObj.version);
                var numberlink = getMacroLink(macroObj.number, macroObj.key, macroObj.callBackURL);
                var namelink = getMacroLink(cleanMacroName(macroObj.name), macroObj.key, macroObj.callBackURL);
                var status = 'Unknown';
                var providerMsg = '';
                if (macroObj.providerDataList != null) {
                    var providersList = returnArray(macroObj.providerDataList);
                    //console.log(providersList);
                    $.each(providersList, function (indy, provider) {
                        //console.log(provider);
                        if (providerMsg != '') {
                            providerMsg += '<br>';
                        }
                        providerMsg = providerMsg + undefinedToEmpty(provider.provider);
                        //a=b;
                    });
                    status = 'Active';
                } else if (changedInCurrentRelease(macroObj) == true) {
                    //now I want to check the change summary...
                    status = 'Changed this Release';
                } else {
                    status = 'Inactive';
                }
                
                htmlBody += '<tr><td>' + numberlink + '</td><td>' + namelink + '</td><td>' + undefinedToEmpty(macroObj.category) + '</td><td>' + undefinedToEmpty(macroObj.version) + '</td><td>' + status + '</td><td>' + providerMsg + '</td></tr>';
            }
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, macroListObjCount + ' Service Schemas');
    } else {
        //console.log(allProvidersData);
        if ((allProvidersData.status != null) &&(allProvidersData.status != null)) {
            var status = allProvidersData.status;
            var statusText = allProvidersData.statusText;
        } else {
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No status found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Status found');
    }
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildAllCAPMServicesListAccordion');
}

function changedInCurrentRelease(schemaObject) {
    var result = false;
    var releaseName = getSelectedRelease().projectname.toLowerCase();
    if ((schemaObject != null) &&(schemaObject.ChangeSummary != null) &&(schemaObject.ChangeSummary.Change != null)) {
        changesArrays = returnArray(schemaObject.ChangeSummary.Change);
        $.each(changesArrays, function (index, change) {
            //compare this against release.projectname?
            var release = undefinedToEmpty(change.Release);
            //var summary = undefinedToEmpty(change.Summary);
            if (release.toLowerCase() == releaseName) {
                result = true;
                return true;
            }
        });
    }
    return result;
}


function mergeCAPMProviderData2servicesData(servicesList, providersList) {
    console.time('mergeCAPMProviderData2servicesData');
    //console.log('servicesList');
    //console.log(servicesList);
    //console.log('providersList');
    //console.log(providersList);
    //"provider":"DHUB",	"rootelement":"SearchPartyRequest",	"namespace":"Party/Service/V7.0"}
    $.each(servicesList, function (index, serviceObject) {
        
        
        var name = cleanMacroName(serviceObject.name);
        var number = undefinedToEmpty(serviceObject.number).toUpperCase();
        var version = undefinedToEmpty(serviceObject.version).toUpperCase();
        //console.log(name);
        var mockRoot1 = name + 'Request';
        var mockRoot2 = name + 'Response';
        var mockRoot3 = name;
        //console.log('mock_rootelement:' + mockRoot1);
        var location = serviceObject.location;
        var splitlocation = location.split('/');
        if (splitlocation.length == 5) {
            //core?
            var mocknamespace = splitlocation[0] + '/' + splitlocation[1].replace('Services', 'Service') + '/' + splitlocation[2];
        } else if (splitlocation.length == 6) {
            //normal?
            //console.log('splitlocation:' + splitlocation);
            var mocknamespace = splitlocation[0] + '/' + splitlocation[1].replace('Services', 'Service') + '/' + splitlocation[3];
        } else {
            //console.log('splitlocation:' + splitlocation);
            //a=b;
            var mocknamespace = null;
        }
        //console.log('mock_namespace:' + mocknamespace);
        //a=b;
        var providerDataList =[];
        $.each(providersList, function (index, provider) {
            
            //console.log(provider);
            var rootelement = provider.rootelement;
            var namespace = provider.namespace;
            
            
            if ((rootelement == mockRoot3) ||(rootelement == mockRoot2) ||(rootelement == mockRoot1)) {
                //now check version is a match?
                
                var capmNameSpaceArray = namespace.split('/');
                var capmVersion = capmNameSpaceArray[capmNameSpaceArray.length -1];
                if (version == capmVersion) {
                    providerDataList.push(provider);
                }
            } else if (namespace.toUpperCase().indexOf(number) > -1) {
                providerDataList.push(provider);
            }
        });
        if (providerDataList.length > 0) {
            serviceObject.providerDataList = providerDataList;
        }
    });
    console.timeEnd('mergeTechnical2Documented');
    //console.log(servicesList);
    
    return servicesList;
}

function buildCAPMProviderListAccordion(capmProviderData) {
    console.time('buildCAPMProviderListAccordion');
    //console.log(capmProviderData);
    //as long as I get a list back from the ProviderProviderObject Im ok to build something
    var id = 'capmProviderList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    
    if ((capmProviderData != null) &&(capmProviderData.rows != null)) {
        var capmProviderList = returnArray(capmProviderData.rows);
        //console.log('capmProviderList');
        //console.log(capmProviderList);
        //now I should be right to start building the UI?
        var ProviderCount = capmProviderList.length;
        var thHTML = buildCAPMProviderListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('CAPM Providers');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        if (ProviderCount > 0) {
            $.each(capmProviderList, function (index, providerObj) {
                //console.log(providerObj);
                var providerName = undefinedToEmpty(providerObj.provider);
                var providerNamespace = undefinedToEmpty(providerObj.namespace);
                var rootelement = undefinedToEmpty(providerObj.rootelement);
                if (providerName != '') {
                    htmlBody += '<tr><td>' + providerName + '</td><td>' + rootelement + '</td><td>' + providerNamespace + '</td></tr>';
                }
            });
            $('tbody#' + id + 'TableBody').empty();
            $('tbody#' + id + 'TableBody').append(htmlBody);
            var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
            $('#' + id + 'SearchLabel').text('Currently listing ' + ProviderCount + ' Providers.');
            appendAccordionHeader(headerID, ProviderCount + ' Providers');
        } else {
            $('#' + id + 'SearchLabel').text('No Providers.');
        }
    } else {
        appendAccordionHeader(headerID, ProviderCount + ' Providers');
    }
    $("#adminAccordion").accordion("refresh");
    console.timeEnd('buildCAPMProviderListAccordion');
}

function buildCAPMConsumerListAccordion(capmConsumerData) {
    console.time('buildCAPMConsumerListAccordion');
    //console.log(capmConsumerData);
    //as long as I get a list back from the consumerProviderObject Im ok to build something
    var id = 'capmConsumerList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    
    if ((capmConsumerData != null) &&(capmConsumerData.rows != null)) {
        var capmConsumerList = returnArray(capmConsumerData.rows);
        //console.log(capmConsumerList);
        //now I should be right to start building the UI?
        var consumerCount = capmConsumerList.length;
        var thHTML = buildCAPMConsumerListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('CAPM Consumers');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        if (consumerCount > 0) {
            $.each(capmConsumerList, function (index, consumerObj) {
                var consumerName = undefinedToEmpty(consumerObj.consumer);
                var consumerHit = undefinedToEmpty(consumerObj.hits);
                if (consumerName != '') {
                    htmlBody += '<tr><td>' + consumerName + '</td><td>' + consumerHit + '</td></tr>';
                }
            });
            $('tbody#' + id + 'TableBody').empty();
            $('tbody#' + id + 'TableBody').append(htmlBody);
            var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
            $('#' + id + 'SearchLabel').text('Currently listing ' + consumerCount + ' consumers.');
            appendAccordionHeader(headerID, consumerCount + ' consumers');
        } else {
            $('#' + id + 'SearchLabel').text('No consumers.');
            appendAccordionHeader(headerID, 'No consumers');
        }
    } else {
        $('#' + id + 'SearchLabel').text('No consumers.');
        appendAccordionHeader(headerID, 'No consumers');
    }
    $("#adminAccordion").accordion("refresh");
    console.timeEnd('buildCAPMConsumerListAccordion');
}

function getAllCAPMConsumersJSONData() {
    console.time('getAllCAPMConsumersJSONData');
    var url = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=dp:serviceCompleted&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=consumer.sql&distinct=1&end=now&start=-4w';
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'jsonp',
        jsonp: 'callback',
        'success': function (data) {
            buildCAPMConsumerListAccordion(data);
            console.timeEnd('getAllCAPMConsumersJSONData');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('getAllCAPMConsumersJSONData');
            hideLoadingBlock(-1);
        }
    });
}
function loadconsumers() {
    //lets make a call to get consumers
    //http://compass-prod-web:8080/CompassWeb/GetObjects?id=dp:serviceCompleted&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=consumer.sql&end=now&start=-4w
    var pm_url = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=dp:serviceCompleted&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=consumer.sql&distinct=1&end=now&start=-4w';
    //console.log(pm_url);
    $.ajax({
        url: pm_url,
        dataType: 'jsonp',
        jsonpCallback: 'genericDataLogger',
        jsonp: 'callback'
    });
}

function compassAllConsumersRequest (svRequestName, svVersion, svCategory, svType, env, period, divID) {
    var pm_url = compassConsumersURL(svRequestName, svVersion, svCategory, svType, env, period);
    pm_url = pm_url + '&divID=' + divID;
    //console.log(pm_url);
    $.ajax({
        url: pm_url,
        dataType: 'jsonp',
        jsonpCallback: 'genericDataLogger',
        jsonp: 'callback'
    });
}

function buildServicePatternListAccordion(servicePatterns) {
    console.time('buildServicePatternListAccordion');
    //as long as I get a list back from the consumerProviderObject Im ok to build something
    if ((servicePatterns != null) &&(servicePatterns.length > 0)) {
        //now I should be right to start building the UI?
        var id = 'servicePatternList';
        var headerID = id + 'Header';
        var contentID = id + 'Content';
        var patternCount = servicePatterns.length;
        var thHTML = buildServicePatternListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Service Patterns');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        $.each(servicePatterns, function (index, servicePattern) {
            //console.log(servicePattern);
            var name = undefinedToEmpty(servicePattern.name);
            var description = undefinedToEmpty(servicePattern.description);
            htmlBody += '<tr><td>' + name + '</td><td>' + description + '</td></tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').html(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, patternCount + ' Service Patterns');
    } else {
        $('#' + id + 'SearchLabel').text('No schemas found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No patterns found');
    }
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('buildServicePatternListAccordion');
}

function buildServiceFunctionListAccordion(functionList) {
    console.time('buildServiceFunctionListAccordion');
    //as long as I get a list back from the consumerProviderObject Im ok to build something
    if ((functionList != null) &&(functionList.length > 0)) {
        //now I should be right to start building the UI?
        var id = 'serviceFunctionList';
        var headerID = id + 'Header';
        var contentID = id + 'Content';
        var functionCount = functionList.length;
        var thHTML = buildServiceFunctionListTH();
        var divhtml = buildAccordionDivWithSearch(id, thHTML);
        $('#' + headerID).text('Service Functions');
        $('#' + contentID).html(divhtml);
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        $.each(functionList, function (index, functionObj) {
            //console.log(functionObj);
            var type = undefinedToEmpty(functionObj.type);
            var element = undefinedToEmpty(functionObj.element);
            var table = undefinedToEmpty(functionObj.table);
            var fromcolumn = undefinedToEmpty(functionObj.fromcolumn);
            var tocolumn = undefinedToEmpty(functionObj.tocolumn);
            htmlBody += '<tr><td>' + type + '</td><td>' + element + '</td><td>' + table + '</td><td>' + fromcolumn + '</td><td>' + tocolumn + '</td></tr>';
        });
        $('tbody#' + id + 'TableBody').empty();
        $('tbody#' + id + 'TableBody').html(htmlBody);
        var qs = buildStandardSearch(id + 'Search', id + 'Table', id + 'noresults', id + 'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, functionCount + ' Service Functions');
    } else {
        $('#' + id + 'SearchLabel').text('No functions found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No patterns found');
    }
    $("#macrosAccordion").accordion("refresh");
    console.timeEnd('buildServiceFunctionListAccordion');
}


function buildAutoPopulateListAccordions(macroAutoPopulate) {
    console.time('buildAutoPopulateListAccordions:');
    //I actually have two accordians to create depending on the contents
    //console.log(macroAutoPopulate);
    //now I want to create the different lists
    if ((macroAutoPopulate != null) &&(macroAutoPopulate.macroAutoPopulate != null) &&(macroAutoPopulate.macroAutoPopulate.content != null)) {
        //get the service pattern list first
        var content = macroAutoPopulate.macroAutoPopulate.content;
        if ((content.servicePatternList != null) &&((content.servicePatternList.servicePattern != null))) {
            var servicePatterns = returnArray(content.servicePatternList.servicePattern);
            //console.log('servicePatterns:');
            //console.log(servicePatterns);
            buildServicePatternListAccordion(servicePatterns);
        }
        if ((content.functionList != null) &&(eval('content.functionList.function!=null'))) {
            var functionList = returnArray(eval('content.functionList.function'));
            //console.log('functionList:');
            //console.log(functionList);
            buildServiceFunctionListAccordion(functionList);
        }
    } else {
        //nothing is available to create on any of the lists?
    }
    
    
    $("#serviceArchitectureAccordion").accordion("refresh");
    console.timeEnd('buildAutoPopulateListAccordions:');
}

function testnewStuff(){
    
    console.time('testnewStuff');
    var url = 'http://compass-prod-web:8180/CompassWeb/GetObjects?id=dp:serviceCompleted&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=consumer.sql&distinct=1&end=now&start=-4w';
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'jsonp',
        jsonp: 'callback',
        'success': function (data) {
           //console.log(data);
            
            findExternalServices(data);
            console.timeEnd('testnewStuff');
            hideLoadingBlock(-1);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            textStatus = textStatus.replace('error', 'Error');
            console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
            console.timeEnd('testnewStuff');
            hideLoadingBlock(-1);
        }
    });
}
function findExternalServices(data){
console.log(data.attributes.objectList);
console.time('findExternalServices');
var externalServices = [];
$.each(data.attributes.objectList, function(index, idObject){
    //console.log(idObject.fullname);
    
    var originalname = idObject.fullname;
    var cleanname = findAndReplace(originalname.replace('EnterpriseServices->','').replace('->dp:ServiceCompleted', ''), '->', '/');
    
    var id = idObject.id;
    if(originalname.toLowerCase().indexOf('proxy')!=-1){
        var obj = {};
        
        var lastChar = cleanname[cleanname.length-1];
        if(lastChar=='/'){
            cleanname = cleanname.substring(0,cleanname.length-1);
        }
        obj.fulllname = cleanname;
        obj.id = id;
        obj.shortname = cleanname.split('/').slice(-1)[0];
        obj.context
        var var1 = originalname.split('->');
        var shortname = var1[var1.length-2];
 
        externalServices.push(obj);
    }
});
console.timeEnd('findExternalServices');
console.log(externalServices);
}

function buildCRTListAccordion(crtData){
    //console.log('buildCRTListAccordion');
    console.time('buildCRTListAccordion');
    //console.log(crtData);
    //as long as I get a list back from the fullCrtData Im ok to build something
    var id = 'refDataTableList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    var thHTML = refDataTableListTH();
    var dindex = -1;
    var divhtml = buildAccordionDivWithSearch(id,thHTML);
    $('#' + headerID).text('Reference Data Table List');
    $('#' + contentID).html(divhtml);
    
    if ((crtData!=null)&&(crtData.tables!=null)&&(crtData.tables.length>0)){
        var tables = crtData.tables;
        var crtDataCount = tables.length;
        var columnCount = 0;
        var htmlBody = '';
        //ok so now Im ready to loop through every system
        console.time('refdataforceSortArray');
        
        //create an array to hold additional dialog data
        dialogDataArray = [];
        forceSortArray(tables, 'name', false, function(i, tableObject) {
            var columnString = '';
            var htmlDisplayLink = '';
            var htmlDisplayDialog = '';
            var serviceFieldLink = '';
            var tableName = tableObject.name;
            var moreServicesExistFlag = false;
            var moreServicesCount = 0;
            var counter=0;
            var columnString = '';
            var serviceUsageString = '';
            
            var columnCount = tableObject.columns.length;
            var fieldList = '';
            for(var i = 0;i<columnCount;i++){
                var colObj = tableObject.columns[i];
                var columnName = colObj.name;
                columnString += columnName + '<br/>';
                if(tableObject.isReferenced==true){
                    //this just means the table is referenced so get the fields from each column
                    //console.log(colObj.elements);
                    for(var k=0;k<colObj.elements.length;k++){
                        var element = colObj.elements[k];
                        //console.log(element);
                        //element.type could be useful moving forward....all REF for now
                        fieldList = fieldList + '<strong>' + element.element + '</strong> - '  + element.fromcolumn + '<br>';
                    }
                    //a=referencedfound;
                }   
            }
            //now look at the services per table...
            //console.log(tableObject);
            if(tableObject.services!=null){
                for(var m=0;m<tableObject.services.length;m++){
                    var service = tableObject.services[m];
                    var serviceLink =  getMacroLink(service.FormattedDisplayName, service.key, service.callBackURL);
                    var htmlDisplayDialogLink =  getMacroLink(service.FormattedDisplayName, service.key, service.callBackURL,'closeLink');
                    serviceUsageString += serviceLink + '<br/>';
                    moreServicesCount++
                    if(m<columnCount){
                        htmlDisplayLink += undefinedToEmpty(serviceLink) + '<br/>';    
                    }else{
                        moreServicesExistFlag = true;
                    }       
                    htmlDisplayDialog += undefinedToEmpty(htmlDisplayDialogLink) + '<br/>';
                }    
            }
            if(moreServicesExistFlag){
                var dialogObject = {};
                dialogObject.htmlDisplay = htmlDisplayDialog;
                dialogObject.tableName = tableName;
                dialogDataArray.push(dialogObject);
                dindex = dindex + 1;
                htmlDisplayLink += '<a id="' + dindex + '" href="#" class="moreServiceUsages" >' + (moreServicesCount-columnCount) + ' more instances exist...</a>' +  '<br>';
            }
            var tablelink = getRefTableLink(tableObject.name, tableObject.name);
            htmlBody += '<tr><td>' + undefinedToEmpty(tablelink) + '</td><td>' + undefinedToEmpty(columnString) + '</td><td>' + fieldList + '</td><td>' + htmlDisplayLink + '</td></tr>';
        });
        console.timeEnd('refdataforceSortArray');
        $('tbody#' + id+'TableBody').empty();
        $('tbody#' + id+'TableBody').append(htmlBody);
        //now I can attach on onclick event to anything with a particular class ?
        $("a.moreServiceUsages").on( "click", function() {
            var dialogObject = dialogDataArray[this.id];
            console.log(dialogObject);
            serviceListDialog(dialogObject.htmlDisplay,dialogObject.tableName);
        });
           
        var qs = buildStandardSearch(id+'Search', id+'Table', id+'noresults', id+'SearchLabel');
        //I actually want to update the Macro Header?
        appendAccordionHeader(headerID, crtDataCount + ' Reference Tables');

    }else{
        buildRefDataListAccordionError(refDataTableList, headerID, contentID);      
    }
    
    $("#refDataAccordion" ).accordion( "refresh" );
    console.time('buildCRTListAccordion');
}
