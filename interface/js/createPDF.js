function createPDFButton(macroNumber, macroName, macroVersion, serviceObj) {
    //now I need to get the macro data from the large macro object?
    //console.log(allServices);
    console.log('need to gather a few things to work out what to do');
    var key = getKeyFromServiceObject(serviceObj);
    var pdfSelectType = $("#pdfSelect" + key).val();
    var selected = [];
    
    var pdfOptionsType = $("#pdfOptions" + key + " input:checked").each(function(){
     selected.push($(this).attr('id'));
    });
    var saveFlag = true;
    if(pdfSelectType=='Open'){
        saveFlag = false;
    }
    //now I have enough to do what I need...
    var key = getKeyFromServiceObject(serviceObj);
    var serviceObj = getServiceObjectByKey(key);
    if(serviceObj!=null){
        $('#pdfMessages' + serviceObj.key).text('Generated PDFs');
        createPDFService(serviceObj, saveFlag);
        if(selected.indexOf('pdfSampleXML' + serviceObj.key)!=-1){
            buildPDFSamples(serviceObj, saveFlag);    
        }
        if(selected.indexOf('pdfReferenceData' + serviceObj.key)!=-1){
            buildPDFRefData(serviceObj, saveFlag, false);    
        }
    }else{
        $('#pdfMessages' + serviceObj.key).text('Error in finding correct service');
    }    
}



function referenceDataTimingResponse(soKey){
    console.time('referenceDataTimingResponse');
    var so = getServiceObjectByKey(soKey);
    buildPDFRefData(so, false, true);
    console.timeEnd('referenceDataTimingResponse');
    
}
function buildPDFRefData(serviceObj, saveFlag, timingsOnly) {
    console.time('buildPDFRefData');
    showLoadingBlock();
    var refDataURL = getSelectedRelease().crtLocation + 'fullCrtData.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;
    $.ajax({
        'url': refDataURL,
        'type': 'GET',
        'dataType': 'json',
        'success': function (refData) {
            console.timeEnd('buildPDFRefData');
            createPDFRefData(serviceObj, refData, saveFlag, timingsOnly);
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            hideLoadingBlock(-1);
            console.log('Error fetching reference data for pdfs' + errorThrown);
            console.timeEnd('buildPDFRefData');
        }
    });
}

function buildPDFSamples(serviceObj, saveFlag) {
    console.time('buildPDFSamples');
    showLoadingBlock();
    //I have to get the reference data object before I start...along with the sample xml messages as well?
    //var refDataURL = release.crtLocation + 'fullCrtData.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;
    var sampleXMLListURL = getSelectedRelease().releaseLocation + 'xmlSampleList.json?' + 'buildNumberCache=' + getSelectedRelease().cacheBuster;
    
    var xmlStringList =[];
    //first get the samples list on a single call and then create a multiple calls list for the crt and samples?
    
    $.ajax({
        'url': sampleXMLListURL,
        'type': 'GET',
        'dataType': 'json',
        'success': function (samplesList) {
            //console.log(samplesList);
            if ((samplesList !== undefined)&&(samplesList.macroLocations !== undefined)&&(samplesList.macroLocations.category !== undefined)) {
                var xmlSampleList = returnArray(flattenMacroList(samplesList.macroLocations.category).macroList);
                if (xmlSampleList !== undefined){
                    //now find the one that matches this service?
                    var samplesURLArray = [];
                    //push the ref data url in now as well to the grouping
                    $.each(xmlSampleList, function(xmlIndex, xmlSample){
                        var sampleKey = getKeyFromLocation(xmlSample.location);
                        var serviceKey = getKeyFromLocation(serviceObj.location);
                        if(sampleKey==serviceKey){
                            //console.log(xmlSample.location);
                            xmlSampleURL = getSelectedRelease().releaseLocation + 'enterpriseModels/' + xmlSample.location;
                            //so now I have a list samples that I have to get fetch
                            samplesURLArray.push($.ajax({type: "GET",url: xmlSampleURL,dataType: "xml"}));
                        }
                    });
                    
                    var requests = $.unique(samplesURLArray);
                    //console.log(requests);
                    var defer = $.when.apply($, requests);
                    defer.done(function () {
                        //console.log(arguments);
                        var responseObjectArray = returnArray(arguments);
                        $.each(responseObjectArray[0], function (index, argument) {
                            //console.log(argument[1]);
                            if (argument[1] == 'success') {
                                var xmlSampleObject = argument[0];
                                //console.log(xmlSampleObject);
                                var xmlAsString = xmlToString(xmlSampleObject);
                                xmlStringList.push(xmlAsString);    
                            }
                        });
                        //console.log('serviceObj');
                        //console.log(serviceObj);
                        //console.log('refData');
                        //console.log(refData);
                        //console.log('xmlStringList');
                        //console.log(xmlStringList);
                        createPDFSampleXML(serviceObj, xmlStringList, saveFlag);
                        /*
                        ################################################################ 
                        ################################################################
                        ################################################################
                        createPDF(serviceObj, refData, xmlStringList);
                        
                        ################################################################
                        ################################################################
                        ################################################################
                        */
                        console.timeEnd('buildPDFSamples');
                    }).fail(function (jqXHR, textStatus, errorThrown) {
                        hideLoadingBlock();
                        //console.log('failed');
                        //console.log(jqXHR);
                        console.timeEnd('buildPDFSamples');
                    });
                }
            }
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            hideLoadingBlock();
            console.log('Error fetching xml samples data for pdfs' + errorThrown);
            console.timeEnd('buildPDFSamples');
        }
    });
}

function createPDFTablesReference(requestEntityArray, responseEntityArray, refDataArray) {
    var EntityArray = requestEntityArray.concat(responseEntityArray);
    uniqueTables =[];
    uniqueFields =[];
    $.each(EntityArray, function (index, field) {
        if ((field.fieldRefLink != undefined) &&(field.fieldRefLink.indexOf('F:') > -1)) {
            var refTable = getRefTableFromLink(field.fieldRefLink);
            var refColumn = getRefColumnFromLink(field.fieldRefLink);
            var fieldMessage = formatCamelCaseForHumans(formatStructure(field.fieldName));
            var refDataObject = {};
            refDataObject.table = refTable;
            refDataObject.column = refColumn;
            refDataObject.field = field.fieldName;
            refDataObject.fieldName = formatStructure(field.fieldName);
            refDataObject.fieldFriendlyName = formatCamelCaseForHumans(refDataObject.fieldName);
            refDataObject.fieldXpath = field.fieldXpath;
            refDataObject.fieldEnumeration = field.fieldEnumeration;
            uniqueFields.push(refDataObject);
            //console.log(fieldMessage, refTable + ', ' + refColumn);
            if (uniqueTables.indexOf(refTable) == -1) {
                uniqueTables.push(refTable);
            }
        }
    });
    var uniqueTableObjects =[];
    //now loop back through and find all the fields that reference these tables
    $.each(uniqueTables, function (i, tableName) {
        var tableObject = {};
        var fields =[];
        tableObject.tableName = tableName;
        //now find each field that referneces this
        $.each(uniqueFields, function (i, field) {
            if (field.table == tableName) {
                fields.push(field);
            }
        });
        tableObject.fields = fields;
        //now I need to go and fetch the actual reference data?
        uniqueTableObjects.push(tableObject);
    });
    enhancedUniqueTableObjects = [];
    $.each(refDataArray, function (l, refTableData) {
        //Im only interested in the subset that match my unique tables list
        $.each(uniqueTableObjects, function (m, tableObject) {
            if (tableObject.tableName == refTableData.name) {
                tableObject.referenceData = refTableData;
                //console.log(tableObject);
                enhancedUniqueTableObjects.push(tableObject);
                return false;
            }
        });
    });
    //now I need to format a table
    //console.log(uniqueTableObjects);
    //console.log(enhancedUniqueTableObjects);
    var pdfTablesArray = [];
    $.each(enhancedUniqueTableObjects, function(tableIndex, tableObject){
        //console.log(tableObject);
        //first work out the Columns I need to keep or care about?
        keepColumnArray = [];
        keepColumnArray.push('DESCRIPTION');
        //dealing with country codes???
        keepColumnArray.push('COUNTRY_CODE');
        keepColumnArray.push('COUNTRY_CODE_TYPE');
        keepColumnArray.push('COUNTRY_CODE_TYPE_DESCRIPTION');
        keepColumnArray.push('COUNTRY_CODE_DESCRIPTION');
        
        
        $.each(tableObject.fields, function(fieldIndex, fieldObject){
            if(keepColumnArray.indexOf(fieldObject.column)==-1){
                keepColumnArray.push(fieldObject.column);
            }
        });
        
        //each table has only one table body. 
        var tableBody = [];
        var tableHeaderRows = [];
        var tableBodyRows = [];
        //console.log(tableObject.referenceData);
        //console.log(tableObject);
        if((tableObject.referenceData==undefined)||(tableObject.referenceData.row==undefined)){
            var refDataRows = [];
        }else{
            var refDataRows = returnArray(tableObject.referenceData.row);
        }
        //console.log(refDataRows);
        //so from this I know how many rows of data I need. 
        $.each(refDataRows, function(rowIndex, rowObject){
            //for every row of data I need to create an array
            var tableBodyRow = [];
            var refDataCols = returnArray(rowObject.column);
            //console.log(rowObject);
            $.each(refDataCols, function(colIndex, colObject){
                //only get the ones Im interested in
                if(keepColumnArray.indexOf(colObject.name)!=-1){
                    //now the field might be description or long or short but I only want one of them?
                    if(rowIndex==0){
                        //console.log(colObject.name);
                        var tableHeaderRow ={text: colObject.name, style: 'tableHeader'};
                        tableHeaderRows.push(tableHeaderRow);
                    }
                    //now check if this data is required as the field is enumerated
                    var tableBodySingle ={text: colObject.$, style: 'tableCell'};
                    tableBodyRow.push(tableBodySingle);    
                }
            });
        if(rowIndex==0){
            tableBodyRows.push(tableHeaderRows);
         }
        tableBodyRows.push(tableBodyRow);
        });
        //So now I have a row for headers and a row for for the data?
        //tableBody.push(tableHeaderRows);
        //create table widths for the number of rows?
        var schemaTableWidths =[];
        $.each(tableHeaderRows, function(tI, tO){
            schemaTableWidths.push('auto');
        });
        
        var msgText = '';
        var seenArray = [];
        $.each(tableObject.fields, function(fieldIndex, fieldObject){
            //Have I seen this key already?
            var key = fieldObject.fieldFriendlyName + fieldObject.table + fieldObject.column;
            if(seenArray.indexOf(key)==-1){
                seenArray.push(key);
                msgText = msgText + 'Reference Data applies to "' + fieldObject.fieldFriendlyName + '" expecting values from "' + fieldObject.column + '"';
                if(fieldObject.fieldEnumeration){
                    msgText = msgText + ' but limted by enumeration to the subset ' + fieldObject.fieldEnumeration + ' only.';
                }
                msgText = msgText + '\n';
                
            }
        });
        if(tableIndex==0){
            var pdfTableTitle = {text:msgText, style: 'normal'};    
        }else{
            var pdfTableTitle = {text:msgText, style: 'normal', pageBreak: 'before'};
        }
        
        var pdfTableObject = { table: {
                    headerRows: 1,
                    widths: schemaTableWidths,
                    body: tableBodyRows
                    }                    
                };
        pdfTablesArray.push(pdfTableTitle);
        pdfTablesArray.push(pdfTableObject);
    });
    return pdfTablesArray;
}



function createPDFTableBody(resultEntityLoop, serviceObj) {
    var result =[];
    var headerRow =[ {
        text: 'Field', bold: true
    },
    {
        text: 'Type', bold: true
    },
    {
        text: 'Cardinality', bold: true
    }];
    //now create the body
    result.push(headerRow);
    //now loop thorugh this list
    var tab = '    ';
    $.each(resultEntityLoop, function (index, field) {
        //does it have an enumaeration?
        var fieldMessage = formatCamelCaseForHumans(formatStructure(field.fieldName));
        if (field.fieldEnumeration != undefined) {
            fieldMessage = fieldMessage + ' - Enforced Values : ' + field.fieldEnumeration + '';
        }
        if ((field.fieldEnumeration == undefined) &&(field.fieldRefLink != undefined) &&(field.fieldRefLink.indexOf('F:') > -1)) {
            var refTable = getRefTableFromLink(field.fieldRefLink);
            var refColumn = getRefColumnFromLink(field.fieldRefLink);
            var tablelink = 'Ref Data (not enforced) from ' + formatUnderScoresForHumans(refTable);
            fieldMessage = fieldMessage + ' - ' + tablelink + '';
        }
        
        var marginVal = 10 * field.level;
        var col1 = {
            text: fieldMessage, margin:[marginVal, 0]
        };
        result.push([col1, formatCamelCaseForHumans(formatType(field.fieldType)), formatCardinality(field.fieldCardinality)]);
    });
    return result;
}
function getPDFSampleXML(xmlStringList){
    var pdfXMLSamples = [];
    pdfXMLSamples.push({text: 'Appendix B - Sample XML Messages', style: 'header', pageOrientation: 'portait', pageBreak: 'before'});
    var count = 1;
    $.each(xmlStringList, function(index, xmlString){
        //if its the first one then dont page break before it other we do....
        if(index==0){
            pdfXMLSamples.push({text: 'Sample XML Message ' + count, style: 'normal', pageOrientation: 'portait'});    
        }else{
            pdfXMLSamples.push({text: 'Sample XML Message ' + count, style: 'normal', pageOrientation: 'portait', pageBreak: 'before'});    
        }
        pdfXMLSamples.push({text: xmlString, style: 'xml', pageOrientation: 'portait'});
        count++;
    });
    return pdfXMLSamples;
}

function pdfEntityLoop(SOAEntityArray, fieldArray, level) {
    $.each(SOAEntityArray, function (index, EntityObj) {
        if ((EntityObj.SOALink != "soap:Header/ctx:ApplicationContext") &&(EntityObj.SOALink != "soap:Header/ctx:ApplicationContext/ctx:UserName")) {
            var field = {
            };
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
            field.level = level;
            fieldArray.push(field);
        }
        //now I have to see if there are any child objects and loop call?
        if ((EntityObj.SOAEntity !== null) &&(EntityObj.SOAEntity !== undefined)) {
            var childEntityArray = returnArray(EntityObj.SOAEntity);
            pdfEntityLoop(childEntityArray, fieldArray, level + 1);
        }
    });
}

function createPDFService(serviceObject, saveFlag) {
    console.time('createPDFService');
    var RequestSchema = ((((serviceObject || {
    }).ServiceMap || {
    }).Macro || {
    }).Schema || {
    }).RequestSOAEntities;
    var ResponseSchema = ((((serviceObject || {
    }).ServiceMap || {
    }).Macro || {
    }).Schema || {
    }).ResponseSOAEntities;
    //now I want to build tables for these?
    //now I want to parse through everyting and body out what I want to document
    var requestEntityArray =[];
    var responseEntityArray =[];
    pdfEntityLoop(returnArray(RequestSchema.SOAEntity), requestEntityArray, 0);
    pdfEntityLoop(returnArray(ResponseSchema.SOAEntity), responseEntityArray, 0);
    
    var pdfRequestBody = createPDFTableBody(requestEntityArray, serviceObject);
    var pdfResponseBody = createPDFTableBody(responseEntityArray, serviceObject);
    
    var schemaTableWidths =[ '*', 120, 120];
    var RequestTable = { table: {
            // headers are automatically repeated if the table spans over multiple pages
            // you can declare how many rows should be treated as headers
            headerRows: 1,
            widths: schemaTableWidths,
            body: pdfRequestBody
        }
    }
    var ResponseTable = { table: {
            // headers are automatically repeated if the table spans over multiple pages
            // you can declare how many rows should be treated as headers
            headerRows: 1,
            widths: schemaTableWidths,
            body: pdfResponseBody
        }
    }
    
    var bgImage = getBase64HomeAffairsBackGroundImage();
    var docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portait',
        pageMargins:[40, 60, 40, 60],
        background: {image: bgImage,
            width: 494,
            height: 384,
            alignment: 'center',
            margin:[0, 80]},
        header: {
            text: 'Service Documentation : ' + formatCamelCaseForHumans(serviceObject.ServiceName), margin: 5
        },
        footer: function(currentPage, pageCount) {
            return { text: ('Page ' + currentPage.toString() + ' of ' + pageCount.toString()), style: 'pageCount'};
        },
        
        content:[{
            text: serviceObject.ServiceNumber + ' ' + serviceObject.FormattedServiceName, style: 'title'
        }, {
            text: 'Service Usage', style: 'header', pageBreak: 'before'
        }, { text: (((((serviceObject || {
            }).ServiceMap || {
            }).Macro || {
            }).Documentation || {
            }).ServiceUsage || {
            }).Content, style: 'normal'
        }, { text: (((((serviceObject || {
            }).ServiceMap || {
            }).Macro || {
            }).Documentation || {
            }).ServiceBehaviour || {
            }).Content, style: 'normal', pageOrientation: 'portait'
        }, {
            text: 'Request Service Schema', style: 'header', pageOrientation: 'landscape', pageBreak: 'before'
        },
        RequestTable,
        {
            text: 'Response Service Schema', style: 'header', pageOrientation: 'landscape', pageBreak: 'before'
        },
        ResponseTable,
        {
            text: 'End of Document', style: 'title', pageOrientation: 'portait'
        }
        ],
        styles: getPDFStyles()
    };
    console.timeEnd('createPDFService');
    hideLoadingBlock(-1);
    if(saveFlag){
        pdfMake.createPdf(docDefinition).download(serviceObject.FormattedDisplayName + '.pdf');
    }else{
        pdfMake.createPdf(docDefinition).open();
    }
}
function createPDFRefData(serviceObject, referenceDataObject, saveFlag, timingsOnly) {
    console.time('createPDFRefData');
    console.time('createRequestAndResponseObjects');
    var RequestSchema = ((((serviceObject || {
    }).ServiceMap || {
    }).Macro || {
    }).Schema || {
    }).RequestSOAEntities;
    var ResponseSchema = ((((serviceObject || {
    }).ServiceMap || {
    }).Macro || {
    }).Schema || {
    }).ResponseSOAEntities;
    console.timeEnd('createRequestAndResponseObjects');
    console.time('getRefTablesAsArray');
    var refDataArray = returnArray(referenceDataObject.tables.table);
    console.timeEnd('getRefTablesAsArray');
    var requestEntityArray =[];
    var responseEntityArray =[];
    console.time('pdfEntityLoopRequest');
    pdfEntityLoop(returnArray(RequestSchema.SOAEntity), requestEntityArray, 0);
    console.timeEnd('pdfEntityLoopRequest');
    console.time('pdfEntityLoopResponse');
    pdfEntityLoop(returnArray(ResponseSchema.SOAEntity), responseEntityArray, 0);
    console.timeEnd('pdfEntityLoopResponse');
    console.time('createPDFTablesReference');
    var pdfReference = createPDFTablesReference(requestEntityArray, responseEntityArray, refDataArray);
    console.log(pdfReference);
    var rowsCount = 0;
    var tableCount = 0;
    $.each(pdfReference, function (i, ref){
        if((ref.table!=null)&&(ref.table.body!=null)&&(ref.table.body.length!=null)){
            tableCount++;
            rowsCount+=ref.table.body.length;
        }
    });
    console.log(rowsCount);
    console.log(tableCount);

    if(timingsOnly!=true){
        
        console.timeEnd('createPDFTablesReference');
        var bgImage = getBase64HomeAffairsBackGroundImage();
        console.time('createdocDefinition');
        var docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portait',
            pageMargins:[40, 60, 40, 60],
            background: {image: bgImage,
                width: 494,
                height: 384,
                alignment: 'center',
                margin:[0, 80]},
            header: {
                text: 'Service Documentation : ' + formatCamelCaseForHumans(serviceObject.ServiceName), margin: 5
            },
            footer: function(currentPage, pageCount) {
                return { text: ('Page ' + currentPage.toString() + ' of ' + pageCount.toString()), style: 'pageCount'};
            },
            
            content:[{
                text: serviceObject.ServiceNumber + ' ' + formatCamelCaseForHumans(serviceObject.ServiceName) + ' Reference Data', style: 'title'
            },
            {
                text: 'Appendix A - Reference Data', style: 'header', pageOrientation: 'portait', pageBreak: 'before'
            },
            pdfReference,
            {
                text: 'End of Document', style: 'title', pageOrientation: 'portait'
            }
            ],
            styles: getPDFStyles()
        };
        
        console.timeEnd('createdocDefinition');
        hideLoadingBlock(-1);
        console.timeEnd('createPDFRefData');
        console.time('pdfMake.createPdf.ReferenceData');
        showLoadingBlock();
        if(saveFlag){
            pdfMake.createPdf(docDefinition).download('ReferenceData-'+serviceObject.FormattedDisplayName + '.pdf');
        }else{
            hideLoadingBlock(-1);
            pdfMake.createPdf(docDefinition).open();
        }
        
        hideLoadingBlock(-1);
        return false;
    }else{
        hideLoadingBlock(-1);
        var timeSecs = (rowsCount * 5)/1000;
        console.log('returning data counts');
        $('#pdfMessages' + serviceObject.key).text('About to create ' + tableCount + ' tables and around ' + rowsCount + ' rows of reference data inot a PDF. This could take around ' + timeSecs + ' seconds.');
    }
    console.timeEnd('pdfMake.createPdf.ReferenceData');
}

function createPDFSampleXML(serviceObject, xmlStringList, saveFlag) {
    console.time('createPDFSampleXML');
    var samplePages = getPDFSampleXML(xmlStringList);
    var schemaTableWidths =[ '*', 120, 120];
    var bgImage = getBase64HomeAffairsBackGroundImage();
    var docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portait',
        pageMargins:[40, 60, 40, 60],
        background: {image: bgImage,
            width: 494,
            height: 384,
            alignment: 'center',
            margin:[0, 80]},
        header: {
            text: 'Service Samples : ' + formatCamelCaseForHumans(serviceObject.ServiceName), margin: 5
        },
        footer: function(currentPage, pageCount) {
            return { text: ('Page ' + currentPage.toString() + ' of ' + pageCount.toString()), style: 'pageCount'};
        },
        
        content:[{
            text: serviceObject.ServiceNumber + ' ' + serviceObject.FormattedServiceName, style: 'title'
        },
        samplePages,
        {
            text: 'End of Document', style: 'title', pageOrientation: 'portait'
        }
        ],
        styles: getPDFStyles()
    };
    hideLoadingBlock(-1);
    console.timeEnd('createPDFSampleXML');
    if(saveFlag){
        pdfMake.createPdf(docDefinition).download('Samples-'+serviceObject.FormattedDisplayName + '.pdf');
    }else{
        hideLoadingBlock(-1);
        pdfMake.createPdf(docDefinition).open();
    }
    
}
function getPDFStyles(){
return {header: {
                fontSize: 22,
                bold: true,
                margin:[0, 20]
            },
            title: {
                fontSize: 40,
                bold: true,
                alignment: 'center',
                margin:[0, 200]
            },
            normal: {
                fontSize: 14,
                margin:[0, 10]
            },
            xml: {
                fontSize: 10,
                margin:[0, 10],
                alignment: 'left'
            },
            tableCell: {
                fontSize: 10,
                margin:[0, 0]
            },
            tableHeader: {
                fontSize: 10,
                bold: true,
                margin:[0, 0]
            },
            pageCount: {
                fontSize: 10,
                alignment: 'right',
                margin:[10, 0]
            }
    }
}
function buildPDFDownloadOptions(macroData){
    var html = '';
    var key = macroData.key;
    var parms = "'" + macroData.ServiceNumber + "','" + macroData.ServiceName + "','" + macroData.SchemaVersionNumber + "'";
    html += '<h4>Create Service Specification as PDF</h4>';
    html += '<div class="controlgroup">';
        html += '<fieldset class="horizontal">';
            html += '<legend>Choose Additional PDF Creation Options: </legend>';
            html += '<fieldset class="vertical" id="pdfOptions'+ key + '">';
                html += '<label for="pdfReferenceData'+key+'">Reference Data</label>';
                html += '<input class="checkboxradio" type="checkbox" id="pdfReferenceData'+key+'">';
                html += '<label for="pdfSampleXML'+key+'">Sample XML Messages</label>';
                html += '<input class="checkboxradio" type="checkbox" id="pdfSampleXML'+key+'">';
            html += '</fieldset>';
            html += '<span>'
                html += '<button id="pdfCreateButton" class="pdfCreateButton">Save</button>';
                html += '<select id="pdfSelect' + key + '" class="pdfSelect">';
                    html += '<option>Save</option>';
                    html += '<option>Open</option>';
                html += '</select>';
            html += '</span>'
        html += '</fieldset>';
    html += '</div>';
    html += '<span>';
    html += '<label id="pdfMessages' + key + '">Reference Data</label>';
    html += '</span>';
    
    return html; 
}

