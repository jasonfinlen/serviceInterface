var allData;
var cData;
var pData;
var serviceCount = 100;
var currentQueryStr = "";
var minQueryChar = 3;
var relPath = '../';

var allRefData;
var cRefData;
var pRefData;
var RefCount = 100;
var currentRefQueryStr = "";
var minRefQueryChar = 3;
var searchDialogDataArray = [];

var allTransformationData;
var cTransformationData;
var pTransformationData;
var TransformationCount = 100;
var currentTransformationQueryStr = "";
var minTransformationQueryChar = 3;




function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function filterData(){
	//filter always works from the cData which is the current Search data only but I also have the pData which is the previous query
	//it should reset the cData to allData only if the filters are all removed
	var queryString = $('#filterText').val();

		console.time('filterQuery');
		$("#filterCount").text("Filtering...");
		//before I start I need to make sure you reached the min to start a query
	if (queryString.length>=minQueryChar){
			var currentQueryStrMin = currentQueryStr.substr(0,minQueryChar);
			var queryStringMin = queryString.substr(0,minQueryChar);
			//now I need to see if I use the previous data etc...
			//did the query go backwards and did 
			if(queryStringMin==currentQueryStrMin&&queryString.length<currentQueryStr.length){
				//the min query is still the same but we went backwards
				cData = pData;
			}else if (currentQueryStrMin!=queryStringMin){
				//the min query changed
				//I have to go all the way back now to the original data string
				cData = allData;
				pData = cData;

			}else{
				//query string didnt go backwards so cData can still be used
			}
		//split on spaces
		var qStrArray = queryString.trim().split(' ');
		for (k = 0; k < qStrArray.length; k++) {
			var qStr = qStrArray[k].trim().toLowerCase();
			qData = jQuery.grep(cData, function( element ) {
				//return element.serviceField.toLowerCase().indexOf(qStr.toLowerCase()) >= 0;
				return JSON.stringify(element).toLowerCase().indexOf(qStr) >= 0;
				});
		}
		console.timeEnd('filterQuery');
		currentQueryStr = queryString;
		if(qData.length>0){
			if(queryString.length==minQueryChar){
				pData = qData;
			}
			//make the new cData the current query data
			cData = qData;
		}else{
			//if the query has no results then what do I do with the pData?
		}
		$('tbody#list_example').empty();
		var originalcount=qData.length;
		var count = originalcount;
		$("#filterCount").text(originalcount + " instances found");
		if(count>0){
			//do something
			if(count>serviceCount){
				count = serviceCount;
				$("#filterCount").text(' ' + originalcount + " instances found, showing first " + numberWithCommas(count));
			}
			for (i = 0; i < count; i++) {
				var fieldObj = qData[i];
				if(i<20){
				    console.log(fieldObj);    
				}
				
				
				//var uniqueLink = fieldObj.serviceNumber + '-' + fieldObj.serviceName + '(' + fieldObj.serviceVersion + ')';
                //make many service links
                var namelink = '';
                var numberlink = '';
                var context = '';
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
        		 
        		//need to add some work in what to dosplay here now //need to resolve ref link to table links
        		//var refLink = fieldObj.fieldRefLink;
        		//var refTable = getRefTableFromLink(refLink);
                //var refColumn = getRefColumnFromLink(refLink);
                //var tableLink = getRefTableLink(refTable + ':' + refColumn, refTable);
        		//need to add xpath in as well
        		var TODO = 'TODO';
				$('tbody#list_example').append('<tr><td>' + fieldObj.name + '</td><td>' + context + '</td><td>' + refLink + '</td><td>' + numberlink + '</td><td>' + namelink + '</td></tr>');
			}
		}
		//
	}else{
		$('tbody#list_example').empty();
		cData = allData;
		pData = cData;
		$("#filterCount").text(" Filter must have at least 3 letters...");	
	}
	if(queryString==''){
		//dont do a search
		$('tbody#list_example').empty();
		cData = allData;
		pData = cData;
		$("#filterCount").text(" Parsed " + numberWithCommas(allData.length) + ' fields across ' + numberWithCommas(allData.length) + ' services');
	}
}

function getMacroLinkAsHTML(svName, svLocation){
	//from this I need to create a <a> tage reflink to them if they arent blank?
	var htmlText;
	if (svLocation==''){
		htmlText += svName;
	}else{
		htmlText = '<a href=';
		htmlText += '"' + svLocation + '"';
		htmlText +=  ' target="_blank"';
		htmlText += '>';
		htmlText += svName;
		htmlText += '</a>';	
	}
	//console.log(htmlText);
	return htmlText;	
}

function getRefTableFieldFromLink(refLink){
    if(refLink!=undefined){
        var refLinkArray = refLink.split(',');
        if(refLinkArray.length==3){
            var fullField = refLinkArray[0];
            var partsArray = fullField.split('/');
            return partsArray[partsArray.length-1];
        }else{
            return '';
        }
    }else{
         return '';
    }
}

function getRefTableFromLink(refLink){
    if(refLink!=undefined){
        var refLinkArray = refLink.split(',');
        if(refLinkArray.length==3){
            var refTable = refLinkArray[1];
            return refTable;
        }else{
            return '';
        }
    }else{
         return '';
    }
    
} 
function getRefColumnFromLink(refLink){
    if(refLink!=undefined){
        var refLinkArray = refLink.split(',');
        if(refLinkArray.length==3){
            var refColumn = refLinkArray[2].replace(')','');
            return refColumn;
        }else{
            return '';
        }
    }else{
         return '';
    }

} 
                        

function appendServiceReference(refDataObj,allFieldsObj){
    //I need to get an all service fields list and filter it down to fields that have only REFs in them
    console.time('appendServiceReference');
    //console.log('appendServiceReference');
    //console.log(refDataObj);
    //console.log(allFieldsObj);
    var schemasCheckedCount = 0; 
    var serviceFieldsCheckedCount = 0;
    
    //I make it more efficient by getting a table list once
    if((refDataObj!=null)&&(refDataObj.tables!=null)&&(refDataObj.tables.table!=null)){
        var tableList = returnArray(refDataObj.tables.table);
    }else{
        var tableList = null;
    }
    if((allFieldsObj!=null)&&(allFieldsObj.fields!=null)){
        var allFieldsList = returnArray(allFieldsObj.fields);
    }else{
        var allFieldsList = null;
    }
    //####### this should be more efficient now... ######
    //I have a tableList and a allFieldsList
    console.time('efficient');
    if((tableList!=null)&&(allFieldsList!=null)){
        var tableListCount = tableList.length;
        var allFieldsListCount = allFieldsList.length;
        serviceFieldsCheckedCount = allFieldsListCount;
        for (i = 0; i < allFieldsListCount; i++) {
            var field = allFieldsList[i];
            //now check that the field refLink is what I think it should be?
            if((field!=null)&&(field.fieldRefLink!=null)&&(field.fieldRefLink.indexOf('F:REF')!=-1)){
                var refLink = field.fieldRefLink;
                //now a secondary loop through the reference data to see if I can find the table
                for (k = 0; k < tableListCount; k++) {
                    var table = tableList[k];
                    var refTable = getRefTableFromLink(refLink);
                    var tableName = table.name; 
                    //match the tabel name first...
                    if(refTable==tableName){
                        //only of the table matches do I care about the col...
                        var refColumn = getRefColumnFromLink(refLink);
                        //now loop through to find the right column
                        var colList = returnArray(table.column);
                        var colListCount = colList.length; 
                        for (l = 0; l < colListCount; l++){
                            var columnObj = colList[l];
                            var columnName = columnObj.name;
                            if(columnName==refColumn){
                                //this is the low level update I need..
                                //create the object to store under the col?
                                if((columnObj.fieldUsageList===null)||(columnObj.fieldUsageList===undefined)){
                                    var fieldUsageList = [];
                                    columnObj.fieldUsageList = fieldUsageList; 
                                }
                                columnObj.fieldUsageList.push(field);
                                break;//break because the column matches
                            }
                        }
                        break;//break because the table matches
                    }
                }
            }
        }
        //now start loops...
    }
    console.timeEnd('efficient');
    //console.log(tableList);
    //###### end of efficiency ########
    /*
    console.time('EACHLOOP');
    //find the first field with a ref?
    
    if((allFieldsObj!=null)&&(allFieldsObj.macroLocations!=null)&&(allFieldsObj.macroLocations.category!=null)){
        var allFieldsListObj = flattenMacroList(allFieldsObj.macroLocations.category);
        if(allFieldsListObj.macroList!==undefined){
            var allFieldsList = returnArray(allFieldsListObj.macroList);
            $.each(allFieldsList, function(index, Service){
                var serviceName = undefinedToUnknown(Service.name);
                var serviceLocation = undefinedToUnknown(Service.location);
                var serviceNumber = undefinedToUnknown(Service.number);
                var serviceVersion = undefinedToUnknown(Service.version);
                var serviceCategory = undefinedToUnknown(Service.category);
                var serviceSchema = Service.Schema;
                //skip over cores and messaging
                if((serviceNumber!='Core')&&(serviceNumber!='Msg')){
                    //console.log(serviceSchema);
                schemasCheckedCount++
                
                
                if((serviceSchema!==null)&&(serviceSchema!==undefined)){
                    var SOAEntitiesList = JSON.search(serviceSchema,"//SOAEntity");
                    $.each(SOAEntitiesList, function(k, field){
                        serviceFieldsCheckedCount++
                        if((undefinedToEmpty(field.RefLink)!='')&&(undefinedToEmpty(field.Structure!=null))){
                            var refLink = field.RefLink;
                            if(refLink.indexOf('F:REF')!=-1){
                                var refTable = getRefTableFromLink(refLink);
                                var refColumn = getRefColumnFromLink(refLink);
                                //so now I have everything I need to find the first instance of a Table with this data?
                                //use the search to find entries for this table and column?
                                //create a small sv object to store here
                                var smallServiceObject = {};
                                smallServiceObject.serviceName = serviceName;
                                smallServiceObject.serviceLocation = serviceLocation;
                                smallServiceObject.serviceNumber = serviceNumber;
                                smallServiceObject.serviceVersion = serviceVersion;
                                smallServiceObject.serviceCategory = serviceCategory;
                                smallServiceObject.field = field;
                                tableloopcount = 0;
                                if(tableList!=null){
                                    $.each(tableList, function(l, tableObj){
                                        tableloopcount = l;
                                        if(tableObj.name==refTable){
                                            //because the table matched we can exit this loop
                                            $.each(tableObj.column, function(m, columnObj){
                                                if(columnObj.name==refColumn){
                                                    //has this column already got a fieldUsageList?
                                                    if((columnObj.fieldUsageList===null)||(columnObj.fieldUsageList===undefined)){
                                                        var fieldUsageList = [];
                                                        columnObj.fieldUsageList = fieldUsageList; 
                                                    }
                                                    columnObj.fieldUsageList.push(smallServiceObject);
                                                    return false;
                                                }
                                            });
                                            return false;
                                        }
                                    });
                                }
                            }
                        }
                    });
                }    
                }
                
            });
        }
        //this is at the schema object level so now I need nested for loops to get to both request and response objects
        //console.log(tableList);
        //console.log(schemasCheckedCount);
        //console.log(serviceFieldsCheckedCount);
    }else{
        //What do I do as the allFieldsObj isnt what I need? 
        serviceFieldsCheckedCount = -1;
    }
    console.timeEnd('EACHLOOP');
    */
    
    
    console.timeEnd('appendServiceReference');
    tableList.schemasCheckedCount = schemasCheckedCount;
    tableList.serviceFieldsCheckedCount = serviceFieldsCheckedCount;
    //console.log(refDataObj);
    return tableList;
}
function mergeStructureWithRefDataValues(structureWithFields, fullCrtData){
    //create my own array of objects?
    console.time('mergeStructureWithRefDataValues');
    var valuesFoundCount = 0;
    var columnsFoundCount = 0;
    if((structureWithFields!==null)&&(fullCrtData!==null)&&(fullCrtData.tables!==null)&&(fullCrtData.tables.table!==null)){
        //so grab the tables with all the rows of data
        var tableDataList = returnArray(fullCrtData.tables.table);
        var tableStructureList = returnArray(structureWithFields);
        //now loop through the structure and simply append the values of the columns into fields or arrays of fields values
        $.each(tableStructureList, function(i, tableStructure){
            var structureName = tableStructure.name;
            $.each(tableDataList, function(k, tableData){
                var tableDataName = tableData.name;
                if(tableDataName==structureName){
                    //tables match so now we need to append field values to each column?
                    $.each(tableData.row, function(l, tableRow){
                        $.each(tableRow.column, function(m, tableColumn){
                            //do something with the $ value of the data?
                            columnsFoundCount = columnsFoundCount + 1;
                            var columnName = tableColumn.name;
                            var columnValue = tableColumn.$;
                            //console.log(columnValue);
                            //console.log(columnName);
                            $.each(tableStructure.column, function(n,structureColumn){
                                var structureColumnName = structureColumn.name;
                                if(structureColumnName==columnName){
                                    //append this value to the list?
                                    if((structureColumn.values==null)||(structureColumn.values==undefined)){
                                        var values = [];
                                        structureColumn.values = values;
                                    }
                                    /*only push if the values dont exist
                                    if(structureColumn.values.indexOf(columnValue)==-1){
                                        structureColumn.values.push(columnValue);    
                                    }*/
                                    if((columnValue!==null)&&(columnValue!==undefined)&&(columnValue!=='')){
                                        structureColumn.values.push(columnValue);    
                                    }else{
                                        //console.log(tableDataName + ':' + structureColumnName + ':' + columnValue); 
                                    }
                                    valuesFoundCount = valuesFoundCount + 1;
                                }
                            }); 
                        });
                    });
                }
            });
        });
    }
    tableStructureList.valuesFoundCount = valuesFoundCount;
    tableStructureList.columnsFoundCount = columnsFoundCount;
    console.timeEnd('mergeStructureWithRefDataValues');
    return tableStructureList;
}

function buildsearchAllRefDataAccordionError(jqXHR){
    //console.log(jqXHR);
    var status = "Unknown";
    var statusText = "Unknown";
    if((jqXHR!=null)&&(jqXHR.status!=null)&&(jqXHR.statusText!=null)){
        status = jqXHR.status;
        statusText = jqXHR.statusText;
    }
    if(status==200){
        //this means the response came back OK but empty?
        statusText = 'Empty json data file retrieved.';
    }
    $('#refDatafilterCount').text('Reference Data failed to load : ' + status + ' - ' + statusText);
    $("#refDatafilterText").prop( "disabled", true );
    $("#refDataTableListSearch").prop( "disabled", true );
    appendAccordionHeader('searchAllRefDataHeader', 'No reference Data Available');
}


function buildsearchAllTransformationDataAccordion(transformationContentList){
     console.time('buildsearchAllTransformationDataAccordion');
     
     var searchAllTransformationDataHTML = buildsearchAllTransformationDataHTML();
     var id = 'searchAllTransformationData';
     var headerID = id + 'Header';
     var contentID = id + 'Content';
     $("#" + contentID).html(searchAllTransformationDataHTML);
     //I need a check if this object is an error object or insnt what I was thinking it should be?
     if((transformationContentList!=null)&&(transformationContentList.allTransformsLists!=null)&&(transformationContentList.allTransformsLists.transformation!=null)&&(transformationContentList.allTransformsLists.transformation.length>0)){
        var transformationDataSearchList = returnArray(transformationContentList.allTransformsLists.transformation)
        var searchTransformationCount = transformationDataSearchList.length;
        //add the key up function to filter the data from the search
        $("#transformationDatafilterText").keyup(function(){
            filterTransformationData();
        });
        allTransformationData = transformationDataSearchList;
        cTransformationData = allTransformationData;
        
        appendAccordionHeader(headerID, numberWithCommas(searchTransformationCount) + ' transformation files.');
        $("#transformationDatafilterCount").text("Parsed " + numberWithCommas(searchTransformationCount) + ' transformation files.');
     }else{
         //error in ref data
         buildsearchAllTransformationDataAccordionError(transformationContentList);
     }
        
    $("#serviceTransformationsAccordion" ).accordion( "refresh" );
    console.timeEnd('buildsearchAllTransformationDataAccordion');

}

function buildsearchAllTransformationDataAccordionError(httpErrorObject){
    //console.log(httpErrorObject);
    var statusText = 'Unknown Error';
    var status = '911';
    if((httpErrorObject!=null)&&(httpErrorObject.statusText!=null)&&(httpErrorObject.status!=null)){
        statusText = httpErrorObject.statusText;
        status = httpErrorObject.status;
    }
    appendAccordionHeader('searchAllTransformationDataHeader', ' Error in loading transformation search : ' + status + ' - ' + statusText);
    $("#transformationDatafilterCount").text(' Search disabled');
    $("#transformationDatafilterText").prop("disabled", true);
}

function buildCRTSearchAccordion(crtData){
     console.time('buildCRTSearchAccordion');
     var searchAllRefDataHTML = buildsearchAllRefDataHTML();
     var id = 'searchAllRefData';
     var headerID = id + 'Header';
     var contentID = id + 'Content';
     $("#" + contentID).html(searchAllRefDataHTML);
     //I need a check if this object is an error object or insnt what I was thinking it should be?
     
     
     if((crtData!=null)&&(crtData.tables!=null)&&(crtData.tables.length>0)){
        var searchRefCount = crtData.tables.length;
        //add the key up function to filter the data from the search
        $("#refDatafilterText").keyup(function(){
            filterRefData();
        });
        allRefData = crtData.tables;
        cRefData = allRefData;
        
        appendAccordionHeader(headerID, numberWithCommas(searchRefCount) + ' reference data entries.');
        $("#refDatafilterCount").text("Parsed " + numberWithCommas(searchRefCount) + " reference data entries");
     }else{
         //error in ref data
         buildsearchAllRefDataAccordionError(refDataList);
     }
    $("#refDataAccordion" ).accordion( "refresh" );
    console.timeEnd('buildCRTSearchAccordion');

}
function buildRefDataTableList(fullCrtData){
    console.time('buildRefDataTableList');
    //###########################
    var refDataCount = 0;
    var flatTableDataList = [];
    console.log('fullCrtData');
    console.log(fullCrtData);
    if((fullCrtData!=null)&&(fullCrtData.length>0)){
        console.log(fullCrtData);

        var tableListCount = fullCrtData.length;
        $.each(fullCrtData, function(i, table){
            var tableName = table.name;
            $.each(table.column, function(k, column){
                
                console.log(tableName);
            });
            
        });
        
        
        for (i = 0; i < tableListCount; i++){
            var table = tableList[i];
            //console.log(table);
            if(table.name!=null){
            //if((table.name!=null)&&(table.row!=null)){
                var tableName = table.name;
                var rowList = returnArray(table.row);
                //console.log(tableName);
                //now for each table lets see whats in it?
                //Im not sure if I dont just need the first row only but Im not sure about the service link
                var row =  rowList[0];
                var newColumnList = [];
                var newServiceList = [];
                if(row!=null){
                    var columnList = returnArray(row.column);
                    //console.log(columnList);
                    for (j = 0; j < columnList.length; j++){
                        var column = columnList[j];
                        if((column.name!=null)&&(column.$!=null)){
                            
                            var columnName = column.name;
                            //need to remove date time values?
                            if((columnName!='EFFECTIVE_FROM_TIMESTAMP')&&(columnName!='EFFECTIVE_TO_TIMESTAMP')){
                                var columnObject = {"column":columnName};
                                newColumnList.push(columnObject);
                                
                                //I also need to add the service data
                                if(column.serviceObjectList!=null){
                                    //console.log(refDataObject);
                                    newServiceList = column.serviceObjectList;
                                    //console.log(refDataObject);
                                    //console.log(columnObject);
                                    //console.log(table);
                                    //a=b;
                                }
                            }
                        }
                    }
                }
            var refDataObject = {"table":tableName};
            var searchString = tableName;
            var newColumnListCount = newColumnList.length; 
            if(newColumnListCount>0){
                refDataObject.columnList = newColumnList;
                for(k=0;k<newColumnListCount;k++){
                    searchString += ' ' + newColumnList[k].column;
                }
            }
            if(newServiceList.length>0){
                refDataObject.serviceList = newServiceList;
                //$.each(newServiceList,function (key,value){searchString += value;});
            }
            refDataObject.searchString = searchString.toLowerCase();
            flatTableDataList.push(refDataObject);
            }
        }
    }

    
    
    
    
    
    
    //#############################
    //console.log(flatTableDataList);
    
    console.timeEnd('buildRefDataTableList');
    //now that I have the table list I need to process it and populate the table
    return flatTableDataList;
    
    
}
function refDataTableListTH(){
    var thHTML = '<th width="10%">Table Name</th>';
    thHTML += '<th width="10%">Columns</th>';
    thHTML += '<th width="40%">Field Usage</th>';
    thHTML += '<th width="40%">Service Usage</th>';
    return thHTML;
}

function filterRefData(){
	//console.log('filterRefData');
	//filter always works from the cData which is the current Search data only but I also have the pData which is the previous query
	//it should reset the cData to allData only if the filters are all removed
	var queryString = $('#refDatafilterText').val();
	console.time('filterRefQuery');
	
	$("#refDatafilterCount").text("Filtering...");
	//before I start I need to make sure you reached the min to start a query
	if (queryString.length>=minRefQueryChar){
			var currentQueryStrMin = currentQueryStr.substr(0,minQueryChar);
			var queryStringMin = queryString.substr(0,minQueryChar);
			//now I need to see if I use the previous data etc...
			//did the query go backwards and did 
			if(queryStringMin==currentQueryStrMin&&queryString.length<currentQueryStr.length){
				//the min query is still the same but we went backwards
				cRefData = pRefData;
			}else if (currentQueryStrMin!=queryStringMin){
				//the min query changed
				//I have to go all the way back now to the original data string
				cRefData = allRefData;
				pRefData = cRefData;

			}else{
				//query string didnt go backwards so cData can still be used
			}
		//split on spaces
		//console.log('cRefData');
		//console.log(cRefData);
		//this query takes time
		//I should customise this search to a list of tokens and a list of fields to grep
		//console.log(cRefData);
		var qStrArray = queryString.trim().split(' ');
		for (k = 0; k < qStrArray.length; k++) {
			var qStr = qStrArray[k].trim().toLowerCase();
			//console.log('qStr:' + qStr);
			qData = jQuery.grep(cRefData, function( element ) {
				//console.log(element);
				//return element.searchString.indexOf(qStr) >= 0;
				return JSON.stringify(element).toLowerCase().indexOf(qStr.toLowerCase()) >= 0;
				});
		}
		console.timeEnd('filterRefQuery');
		currentQueryStr = queryString;
		if(qData.length>0){
			if(queryString.length==minRefQueryChar){
				pRefData = qData;
			}
			//make the new cData the current query data
			cRefData = qData;
		}else{
			//if the query has no results then what do I do with the pData?
		}
		$('tbody#refDataFilterlist').empty();
		var originalcount=qData.length;
		var count = originalcount;
		$("#refDatafilterCount").text(' ' + originalcount + " instances found");
		//console.log('qData');
		//console.log(qData);
		if(count>0){
			//do something
			if(count>RefCount){
				count = RefCount;
				$("#refDatafilterCount").text(' ' + originalcount + " instances found, showing first " + numberWithCommas(count));
			}
			var serviceFieldsCheckedCount = undefinedToEmpty(allRefData.serviceFieldsCheckedCount);
			//console.log(serviceFieldsCheckedCount);
            var htmlMsg = '';
            console.time('searchParse');
            var displayLimit = 20;
            
			$.each(qData, function(tableIndex, tableObj){
        		var tablelink = getRefTableLink(tableObj.name, tableObj.name);
        		
        		$.each(tableObj.columns,function (col,colObj){
                    var valuesString = '';
                    var fullvaluesString = '';
                    var addedValues = 0;
                    var totalValues = 0;
                    var moreValuesExistFlag = false;
                    $.each(colObj.data,function (valueIndex,valueObj){
                        var addingValue = valueObj + '<br>'
                        totalValues++;
                        if(addedValues<displayLimit){
                            //only add if unique and not null/blank?
                            if(valuesString.indexOf(addingValue)==-1){
                                valuesString = valuesString + valueObj + '<br>';
                                addedValues++;
                            }
                        }else{
                            //morevalues exist
                            moreValuesExistFlag = true;
                        }
                        
                        fullvaluesString = fullvaluesString + addingValue;
                    });
                    if(moreValuesExistFlag){
                        var moreValuesLink = getRefTableLink((totalValues-addedValues) + ' more values exists...', tableObj.name);
                        valuesString = valuesString +  moreValuesLink + '<br>';                        
                    }
        		    //this is a per column loop
        		    var serviceUsageString = '';
        		    var moreServicesCount = 0;
        		    var htmlDisplayLink = '';
        		    var htmlDisplayDialog = '';
        		    var moreServicesExistFlag = false;
        		    
        		    //Now that I have this data for the column I need to get the usage list as well.
        		    //console.log(tableObj);
        		    if((tableObj.services!=null)&&(tableObj.services.length>0)){
                        forceSortArray(tableObj.services, 'serviceNumber', false, function(sv, field) {
                            //console.log(field);
                            var displayName = field.FormattedDisplayName;
                            var serviceLink =  getMacroLink(displayName, field.key);
                            var htmlDisplayDialogLink =  getMacroLink(displayName, field.key, 'closeLink');
                            serviceUsageString += serviceLink + '<br/>';
                            moreServicesCount++;
                            //console.log('sv:' + sv);
                            if(sv<displayLimit){
                                htmlDisplayLink += undefinedToEmpty(serviceLink) + '<br/>';    
                            }else{
                                //only create a dialog if more?
                                moreServicesExistFlag = true;
                            }       
                            htmlDisplayDialog += undefinedToEmpty(htmlDisplayDialogLink) + '<br/>';
                        });
                        if(moreServicesExistFlag){
                            var searchDialogObject = {};
                            searchDialogObject.uniqueID = tableObj.name + '_' + colObj.name;
                            searchDialogObject.htmlDisplay = htmlDisplayDialog;
                            searchDialogObject.tableName = tableObj.name;
                            searchDialogDataArray.push(searchDialogObject);
                            htmlDisplayLink += '<a id="' + searchDialogObject.uniqueID + '" href="#" class="moreSearchServiceUsages" >' + (moreServicesCount-displayLimit) + ' more instances exist...</a>' +  '<br>';
                        }
                    }
        		    htmlMsg = htmlMsg + '<tr><td>' + tablelink + '</td><td>' + colObj.name + '</td><td>' + valuesString + '</td><td>' + htmlDisplayLink + '</td></tr>';
        		});
        		//this is a per table loop
			});
			console.timeEnd('searchParse');
			console.time('searchDraw');
			$('tbody#refDataFilterlist').append(htmlMsg);
			//now I can attach on onclick event to anything with a particular class ?
            $("a.moreSearchServiceUsages").on( "click", function() {
                var currentID = this.id;
                $.each(searchDialogDataArray, function(f,searchDialogData){
                    //console.log('searchDialogData.uniqueID:' + searchDialogData.uniqueID);
                    //console.log('currentID:' + currentID);
                    if(searchDialogData.uniqueID==currentID){
                        serviceListDialog(searchDialogData.htmlDisplay,searchDialogData.tableName);
                        return false;
                    }
                });
            });
			console.timeEnd('searchDraw');
		}
		//
	}else{
		$('tbody#refDataFilterlist').empty();
		cRefData = allRefData;
		pRefData = cRefData;
		$("#refDatafilterCount").text(" Filter must have at least 3 letters...");	
	}
	if(queryString==''){
		//dont do a search
		$('tbody#refDataFilterlist').empty();
		cRefData = allRefData;
		pRefData = cRefData;
		$("#refDatafilterCount").text(" Parsed " + numberWithCommas(allRefData.length) + ' reference data entries.');
	}
}

function filterTransformationData(){
	//console.log('filterTransformationData');
	//filter always works from the cData which is the current Search data only but I also have the pData which is the previous query
	//it should reset the cData to allData only if the filters are all removed
	var queryString = $('#transformationDatafilterText').val();
	console.time('filterTransformationQuery');
	$("#transformationDatafilterCount").text("Filtering...");
	//before I start I need to make sure you reached the min to start a query
	if (queryString.length>=minTransformationQueryChar){
			var currentQueryStrMin = currentQueryStr.substr(0,minQueryChar);
			var queryStringMin = queryString.substr(0,minQueryChar);
			//now I need to see if I use the previous data etc...
			//did the query go backwards and did 
			if(queryStringMin==currentQueryStrMin&&queryString.length<currentQueryStr.length){
				//the min query is still the same but we went backwards
				cTransformationData = pTransformationData;
			}else if (currentQueryStrMin!=queryStringMin){
				//the min query changed
				//I have to go all the way back now to the original data string
				cTransformationData = allTransformationData;
				pTransformationData = cTransformationData;

			}else{
				//query string didnt go backwards so cData can still be used
			}
		//split on spaces
		//console.log('cTransformationData');
		//console.log(cTransformationData);
		//this query takes time
		//I should customise this search to a list of tokens and a list of fields to grep
		//console.log(cTransformationData);
		var qStrArray = queryString.trim().split(' ');
		for (k = 0; k < qStrArray.length; k++) {
			var qStr = qStrArray[k].trim().toLowerCase();
			//console.log('qStr:' + qStr);
			qData = jQuery.grep(cTransformationData, function( element ) {
				//console.log(element);
				//return element.searchString.indexOf(qStr) >= 0;
				return JSON.stringify(element).toLowerCase().indexOf(qStr.toLowerCase()) >= 0;
				});
		}
		console.timeEnd('filterTransformationQuery');
		currentQueryStr = queryString;
		if(qData.length>0){
			if(queryString.length==minTransformationQueryChar){
				pTransformationData = qData;
			}
			//make the new cData the current query data
			cTransformationData = qData;
		}else{
			//if the query has no results then what do I do with the pData?
		}
		$('tbody#transformationDataFilterlist').empty();
		var originalcount=qData.length;
		var count = originalcount;
		$("#transformationDatafilterCount").text(' ' + originalcount + " instances found");
		//console.log('qData');
		//console.log(qData);
		if(count>0){
			//do something
			if(count>TransformationCount){
				count = TransformationCount;
				$("#transformationDatafilterCount").text(' ' + originalcount + " instances found, showing first " + numberWithCommas(count));
			}
			var serviceFieldsCheckedCount = undefinedToEmpty(allTransformationData.serviceFieldsCheckedCount);
			//console.log(serviceFieldsCheckedCount);
            var htmlMsg = '';
            console.time('searchParse');
            var displayLimit = 100;
            var relLocationParent = getSelectedRelease().releaseLocation;
			$.each(qData, function(transformationIndex, transformationObj){
        		//what does this actually match in the file?
        		if(transformationIndex>TransformationCount){
        		    return false;
        		}
        		var matchesArray = []; 
        		returnArrayOfMatchingkeys(transformationObj,qStr, matchesArray);
        		var templates = returnArray(transformationObj.xsl_stylesheet.xsl_template);
        		var templatesStr = '';
                var relativeLocation = undefinedToEmpty(transformationObj.relativeLocation);
                var location = relLocationParent + relativeLocation;
                //console.log(relativeLocation);
                var locationLink = createNewTabLink(location, relativeLocation);
                var nameLink = createNewTabLink(location, transformationObj.name);

        		$.each(matchesArray, function(indexMatches,objMatches){
                    var additionalString = '';
                    var matchesStr = '';
        		    var parentStr = '';

                    if(objMatches.key=='$'){
                        if((objMatches.object.name!==undefined)&&(objMatches.object.name!==null)){
                            additionalString=objMatches.object.name + '=' + objMatches.value;
                        }
                        else{
                            additionalString=objMatches.parentKey + '=' + objMatches.value;    
                        }
                    }else{
                        additionalString=objMatches.key + ' ' + objMatches.value;    
                    }
                    if(additionalString.length>150){
                        additionalString = additionalString.substr(0,150);
                    }
                    matchesStr=objMatches.parentKey+' '+additionalString + "<br>";
                    //only show the parent if its not the whole xslt
                    var parentObject = objMatches.parentObject;
                    
                    if((parentObject.xsl_template!=null)&&(parentObject.xsl_template!=undefined)){
                        //there can be only one template so this must be the parent
                        parentStr=objMatches.parentKey + "<br>";
                        //console.log(objMatches);    
                    }else{
                        parentStr=formatJSONXSLSnippet(objMatches.parentObject) + "<br>";    
                    }
                    //now I want to add a new row for each match
                    htmlMsg = htmlMsg + '<tr><td>' + matchesStr + '</td><td>' + nameLink + '</td><td>' + parentStr + '</td></tr>';
        		});
        		
                
        		
			});
			console.timeEnd('searchParse');
			console.time('searchDraw');
			$('tbody#transformationDataFilterlist').append(htmlMsg);
			//now I can attach on onclick event to anything with a particular class ?
            $("a.moreSearchServiceUsages").on( "click", function() {
                var currentID = this.id;
                $.each(searchDialogDataArray, function(f,searchDialogData){
                    //console.log('searchDialogData.uniqueID:' + searchDialogData.uniqueID);
                    //console.log('currentID:' + currentID);
                    if(searchDialogData.uniqueID==currentID){
                        serviceListDialog(searchDialogData.htmlDisplay,searchDialogData.tableName);
                        return false;
                    }
                });
            });
			console.timeEnd('searchDraw');
		}
		//
	}else{
		$('tbody#transformationDataFilterlist').empty();
		cTransformationData = allTransformationData;
		pTransformationData = cTransformationData;
		$("#transformationDatafilterCount").text(" Filter must have at least 3 letters...");	
	}
	if(queryString==''){
		//dont do a search
		$('tbody#transformationDataFilterlist').empty();
		cTransformationData = allTransformationData;
		pTransformationData = cTransformationData;
		$("#transformationDatafilterCount").text(" Parsed " + numberWithCommas(allTransformationData.length) + ' transformation files.');
	}
}

function returnArrayOfMatchingkeys(jsonObject, searchStr, matchesArray, parentObject, parentKey){
    for (var key in jsonObject) {
        if (jsonObject.hasOwnProperty(key)) {
            //console.log(typeof jsonObject[key]);
            if(typeof jsonObject[key]=='object'){
                //console.log('#################OBJECT#########');
                //is the object an array?
                if(Array.isArray(jsonObject[key])){
                    //console.log('#################ARRAY#########');
                    //console.log(jsonObject[key]);
                    $.each(jsonObject[key], function(arrayIndex, ArrayObject){
                        returnArrayOfMatchingkeys(ArrayObject, searchStr, matchesArray, jsonObject, key);                        
                    });
                }else{
                    returnArrayOfMatchingkeys(jsonObject[key], searchStr, matchesArray, jsonObject, key);    
                }
            }else{
                var stringKey = JSON.stringify(key).toLowerCase();
                var stringVal = JSON.stringify(jsonObject[key]).toLowerCase();
                var stringSearch = searchStr.toLowerCase();
                //console.log(stringSearch + ' looked in ' + stringKey + "||" + stringVal);
                if((stringKey.indexOf(stringSearch)>0)||(stringVal.indexOf(stringSearch)>0)){
                    //console.log(searchStr + ' found in ' + key + "||" + jsonObject[key]);
                    //console.log(parentObject);
                    var matchedObject = {};
                    matchedObject.key = key;
                    matchedObject.value = jsonObject[key];
                    matchedObject.object = jsonObject;
                    matchedObject.parentKey = parentKey.replace('_',':');
                    matchedObject.parentObject = parentObject;
                    matchesArray.push(matchedObject);
                }
            }
        }
    }
}

function formatJSONXSLSnippet(xslSnippetAsJSONObject){
    var formattedSnippet = JSON.stringify(xslSnippetAsJSONObject);
    //replace xsl_ with : xsl:
    //console.log(formattedSnippet);
    formattedSnippet = replaceAll(formattedSnippet, '{\\"\\$\\"\\:','');
    formattedSnippet = replaceAll(formattedSnippet, '{','<br>&nbsp;&nbsp;&nbsp;&nbsp;');
    formattedSnippet = replaceAll(formattedSnippet, '}','<br>');
    formattedSnippet = replaceAll(formattedSnippet, 'xsl_','xsl:');
    formattedSnippet = replaceAll(formattedSnippet, '\\[','');
    formattedSnippet = replaceAll(formattedSnippet, '\\]','');
    formattedSnippet = replaceAll(formattedSnippet, ',','');
    
    formattedSnippet = replaceAll(formattedSnippet, '"xsl:','<br>"xsl:');
    
    formattedSnippet = replaceAll(formattedSnippet, '<br><br><br>','<br>');
    formattedSnippet = replaceAll(formattedSnippet, '<br><br>','<br>');
    formattedSnippet = replaceAll(formattedSnippet, '<br><br>','<br>');
    formattedSnippet = replaceAll(formattedSnippet, '<br>&nbsp;&nbsp;&nbsp;&nbsp;<br>','&nbsp;&nbsp;&nbsp;&nbsp;<br>');
    
    //now I want to fix the fomratting at the start so take each char and get rid of it until I hot something I think is ok
    if(formattedSnippet.substr(0,28)=='<br>&nbsp;&nbsp;&nbsp;&nbsp;'){
        formattedSnippet = formattedSnippet.substr(28, formattedSnippet.length);
    }
    if(formattedSnippet.substr(0,4)=='<br>'){
        formattedSnippet = formattedSnippet.substr(4, formattedSnippet.length);
    }
    if(formattedSnippet.substr(0,28)=='&nbsp;&nbsp;&nbsp;&nbsp;<br>'){
        formattedSnippet = formattedSnippet.substr(28, formattedSnippet.length);
    }
    
    
    return formattedSnippet;    
}



