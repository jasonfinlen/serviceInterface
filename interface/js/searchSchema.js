//this file handles the search aspect for all massive search things...
function buildSearchALLFields(releaseObject, parentID){
    //so I know how many headers to setup and the ID on the object that they belong under?
    //build a header for each serviceModel
    console.log(releaseObject);
    var releaseName = returnArray(releaseObject.releaseName);
    var headerAccordion = $('#' + parentID);
    headerAccordion.empty();                
            //I should add a description to the node based object
    var identifier = releaseName + 'SearchServiceModel';
    var htmlHeader = buildInnerAccordion(identifier, releaseName + ' Search Service Models');
    //append the models data header
    headerAccordion.append(htmlHeader);
    //now style each one?
    
    var accordionObjects = headerAccordion.find('.' + identifier);
    var searchHTML = buildSchemaFieldSearchHTML();
    var headerObject = accordionObjects[0];
    var contentObject = accordionObjects[1];
    //get a count of some sort...
    var totalmodelCount = 0;
    if ((releaseObject.serviceModels!=null)&&(releaseObject.serviceModels.length>0)){
        var modelCount = releaseObject.serviceModels.length;
        for (var i=0;i<modelCount;i++) {
            totalmodelCount = totalmodelCount + releaseObject.serviceModels[i].modelCount;
        }
    }
    appendAccordionHeader(headerObject.id, numberWithCommas(totalmodelCount) + ' models parsed across ' + numberWithCommas(modelCount) + ' repositories');
    //need to populate the search header?
    contentObject.innerHTML= searchHTML;
    //now go get the first level of data for each of these with the call backs?
    //getSchemasSearchJSONData(serviceModel, releaseObject.name, childNodes);
    $("#xPathSearchText").keyup(function () {
        xPathFuzzySearch();
    });
    headerAccordion.accordion("refresh");
    
}

function xPathFuzzySearch(){
    //do stuff
    console.time('fuzzySearchUICall');
    var queryString = $('#xPathSearchText').val().trim().toLowerCase();
    var limit = 20;
    $("#filterCount").text(" Search using " + queryString  + " against" + numberWithCommas(580464) + " Items");
    if(queryString!=""){
        var jsonLinkRel = routerURL + '/getSystemListData' + '?'+ getCacheBuster();
        var url = routerURL + "/fuzzySearch/" + queryString  + '?'+ "limit=" + limit;
        //Do the ajax call?
        $.ajax({
            'url': url,
            'type': 'GET',
            'dataType': 'json',
            'success': function (matchedFieldsArray) {
                var matchCountStr = " more the " + limit;
                if(matchedFieldsArray.length<limit){
                    matchCountStr = numberWithCommas(matchedFieldsArray.length);
                }
                $("#filterCount").text(" Search using " + queryString  + " found " + matchCountStr + " fields");
                buildSchemaFieldSearchResults(matchedFieldsArray);
                console.timeEnd('fuzzySearchUICall');
            },
            'error': function (XMLHttpRequest) {
                console.error("Search failed in calling " + url)            
                console.timeEnd('fuzzySearchUICall');
            }
        });
    }
}
function buildSchemaFieldSearchHTML() {
    var html = '<h1>Search All SOA Schema Fields</h1>';
    html += '<input type="text" name="xPathSearchText" value="" id="xPathSearchText"/>';
    html += '<label for="filterText" id="filterCount"></label>';
    html += '<table id="table_example2" width="100%" >';
    html += '<thead>';
    html += '<tr>';
    html += '<th width="15%">Field</th>';
    html += '<th width="30%">Context</th>';
    html += '<th width="20%">RefLink</th>';
    html += '<th width="10%">Service Number</th>';
    html += '<th width="25%">Service Name</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody id="list_example">';
    html += '</tbody>';
    html += '</table>';
    return html;
}

function buildSchemaFieldSearchResults(matchedFieldsArray){
    $('tbody#list_example').empty();
    var htmlTableBody = '';
    var namelink = '';
    var numberlink = '';
    var context = '';
    for(var i = 0;i<matchedFieldsArray.length;i++){
        var fieldObj = matchedFieldsArray[i];
        for(var j = 0;j<fieldObj.usageList.length;j++){
            var serviceObject = fieldObj.usageList[j];
            namelink = namelink + getMacroLink(serviceObject.ServiceName, serviceObject.key) + ', ';
            numberlink = numberlink + getMacroLink(serviceObject.ServiceNumber + ' (' + serviceObject.ServiceVersion + ')', serviceObject.key) + ', ';
            for(var k = 0;k<serviceObject.shortnameList.length;k++){
                var shortname = serviceObject.shortnameList[k];
                context = context + shortname + '<br>';
            }
        }
        
        if(fieldObj.refData!=null){
          var refLink = getRefTableLink(fieldObj.refData.table,fieldObj.refData.table);    
        }else{
          var refLink = '';    
        }
        htmlTableBody+='<tr><td>' + fieldObj.name + '</td><td>' + context + '</td><td>' + refLink + '</td><td>' + numberlink + '</td><td>' + namelink + '</td></tr>';
    }
    var TODO = 'TODO';
    $('tbody#list_example').append(htmlTableBody);
}
