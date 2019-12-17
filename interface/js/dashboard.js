var globalreleaseName = 'BRMAR18'; 
var globalreleaseLocation = '../enterpriseServices/BRMAR18/';
var globalReturnCallsCount = 0;
var servicesDashboardReleaseObject = null;
var globalcapmDataList = [];
var delay = ( function() {
    var timer = 0;
    return function(callback, ms) {
        clearTimeout (timer);
        timer = setTimeout(callback, ms);
    };
})();

function capmChecker(){
    var allProvidersURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?id=-1&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=provider.sql&end=now&start=-4w';
    console.log('checking');
    $("#red-light").hide();
    $("#yellow-light").show();
    $("#green-light").hide();
    delay(function(){
        $("#red-light").hide();
        $("#yellow-light").show();
        $("#green-light").hide();
        $.ajax({
        'url': allProvidersURL,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        'cache':false,
        'timeout':10000,
        'success': function (data){
            console.log(data);
          if((data.rows!=null)&&(data.rows.length==0)){
            $("#yellow-light").hide();
            $("#red-light").show();
            //$('div#servicePerformanceData').html('<h2>Red</h2>');
            $("#green-light").hide();
            //console.log('red');
            delay(function(){
                capmChecker();
            }, 5000 ); // end delay
            //console.log('capmDown');
                  
          }else{
            $("#red-light").hide();
            $("#yellow-light").hide();
            $("#green-light").show();
            //console.log('green');
          }          
        },
        'error': function (xhr,status,error){
            $("#red-light").show();
            $("#yellow-light").hide();
            $("#green-light").hide();
            delay(function(){
                capmChecker();
            }, 5000 );
        }
    });
    }, 500 );
    
}

function buildServiceDashboardPage(){
    //not sure?
    
    //replicate the otherstuff
    var cacheBuster = getCacheBuster();
    var jsonLinkRel = 'data/releases.json?' + cacheBuster;
    $.ajax({
        'url': jsonLinkRel,
        'type': 'GET',
        'dataType': 'json',
        'success': function (releaseData) {
            //now verify this data is what I expect or throw the releaseList error
            if ((releaseData !== null) &&(releaseData !== 'undefined') &&(releaseData.releases !== null) && ($.isArray(releaseData.releases))) {
                //now make sure each release has a name and location
                var releaseArray = returnArray(releaseData.releases);
                forceSortArray(releaseArray, 'order', false, function (releaseIndex, releaseObject) {
                    //just get the selected one for now?
                    if(releaseObject.selected==true){
                        globalSelectedRelease = releaseObject;
                        getAllCAPMServicesJSONData(false);
                        return false;
                    }
                });
            }
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus, errorThrown, jsonLinkRel);
        }
    });        
    
}

function processDashboard(servicesObj, buildInfo){
    var allProvidersURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?id=-1&action=doAttributes&type=JSONP&env=e9&domain=Production&reportname=provider.sql&end=now&start=-4w';
    //now I go and get all the CAPM services I can find...
    $.ajax({
        'url': allProvidersURL,
        'type': 'GET',
        'dataType': 'jsonp',
        jsonp: 'callback',
        'success': function (capmProviders) {
            //now verify this data is what I expect or throw the releaseList error
            if ((capmProviders !== null) &&(capmProviders.rows!==null) &&(capmProviders.rows.length>0)) {
                var capmProviderList = capmProviders.rows;
                //console.log(capmProviderList);
                //now pass to this next function a list of both services and capmstuff
                var capmList = mergeCAPMDatawithServices(capmProviderList,servicesObj);
                //set the global
                globalcapmDataList = capmList;
                mainLoop(false);
            }
        },
        'error': function (XMLHttpRequest, textStatus, errorThrown) {
            console.log(textStatus, errorThrown, jsonLinkRel);
        }
    }); 
}




function mergeCAPMDatawithServices(capmList, servicesList){
    //simply loop and find stuff that matches?
    var urlStart = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes&next=4&env=e9&domain=Production&other=PLACEHOLDER&';
    var urlEnd = '&type=JSONP&callback=?&start=-1h&end=now&graph_sampletime=on&graph_avg_elapsed_nr=on&graph_avg_elapsed_hits_nr=on';

    var newCAPMList = [];
    for(var i = 0;i<capmList.length;i++){
        var capmObject = capmList[i];
        //console.log(capmObject);
        //must have rootelement and namepsace
        
        if((capmObject.rootelement!=null)&&(capmObject.namespace!=null)){
            capmObject.id = id = 'id=EnterpriseServices-%3E' + capmObject.namespace + '-%3E' + capmObject.rootelement + '-%3Edp:ServiceCompleted'; 
            capmObject.url = urlStart + capmObject.id + urlEnd;
            //now I can see if I find the service that goes with this one?
            for(var k = 0;k<servicesList.length;k++){
                var serviceObj = servicesList[k];
                if(capmObject.namespace==serviceObj.shortNamespace){
                    //now check of the name matches either of the schemas schemanames
                    for(var m = 0;m<serviceObj.schemaList.length;m++){
                        var schemaObj = serviceObj.schemaList[m];
                        if(schemaObj.schemaName==capmObject.rootelement){
                            capmObject.service = serviceObj;
                            break;        
                        }
                    }
                }
                if(capmObject.service!=null){
                    break;
                }
            }
            newCAPMList.push(capmObject);           
        }
    }
    return newCAPMList;
}

function getAllCAPMServicesJSONData(repeatFlag){
    console.time('getAllCAPMServicesJSONData');
    getSchemasJSONData('enterprise', 'processDashboard');
}


function mainLoop(repeatFlag){
    //console.log(globalcapmDataList);
    //make each of the calls in an ajax and paint it up?
    console.time('mainLoop');
     //$("div#badServices").append(htmlTableMsg);
     //$("div#goodServices").append(htmlTableMsg);
     uiid = 'servicePerformanceData';
     //console.log(divhtml);
     if(repeatFlag!=true){
        var htmlTableMsg = buildCAPMServiceListTH();
         var divhtml = buildAccordionDivWithSearch(uiid,htmlTableMsg);
         $('div#' + uiid).html(divhtml);
         $('tbody#' + uiid+'TableBody').empty();
     }
     
     if((globalcapmDataList!=null)&&(globalcapmDataList.length>0)){
        var totalCalls = globalcapmDataList.length;
        //console.log(totalCalls);
        
        $('#'+'servicePerformanceData'+'SearchLabel').text(' Waiting for CAPM for ' + totalCalls + ' to be made');
        $.each(globalcapmDataList, function(i,capmData){
            var callNumber = i+1;
            
            var cacheBuster = getCacheBuster();
            var invocationTimeStamp = Date.now();
            var addurl = capmData.url + '&cacheBuster=' + cacheBuster; 
            //console.log(capmData.id);
            $.ajax({
            	    'url': addurl,
            		'type': 'GET',
            		'dataType': 'jsonp',
            		'jason': capmData.id,
            		'jsonp': 'callback',
            		'success': function (data){
            		  displaySingleService(data, capmData, callNumber, totalCalls, invocationTimeStamp); 
            		}
            });
        });
    }
}

function displaySingleService(argument, capmObject, callNumber, totalCalls, invocationTimeStamp){
    globalReturnCallsCount = globalReturnCallsCount + 1;
    //can I detect that this is the very last call?
    //console.log('testStuffSingle');
    
    $('#'+'servicePerformanceData'+'SearchLabel').text(' ' + globalReturnCallsCount + ' of ' + totalCalls + ' calls made and number ' + callNumber + ' in the list.');
    
    //console.log(capmObject);
    //does the service exist?
    if((capmObject!=null)&&(argument!=null)&&(argument.rows!=null)&&(argument.rows.length>1)){
        //I have something to do
        
        var rootelement = capmObject.rootelement;
        
        var namespace = capmObject.namespace;
        var svNumber = 'Undocumented';
        var provider = capmObject.provider;
        var uniqueID = replaceAll(replaceAll(replaceAll(replaceAll(namespace + rootelement + provider,'/','-'),':','-').split('.').join('-'), '_', '-'), '--', '-');
        if((capmObject.service!=null)&&(capmObject.service.ServiceNumber!=null)){
            svNumber = capmObject.service.ServiceNumber;
        }
        
        //I have rows of data but not sure whats on here?
        var attr = argument.attributes;
        var firstRow = argument.rows[0];
        var secondRow = argument.rows[1];
        //console.log(firstRow);
        //just get the first row of data for now?
        //console.log(argument);
        if((firstRow.avg_elapsed_nr!=null)&&(firstRow.avg_elapsed_nr!=null)){
            var elapsed = firstRow.avg_elapsed_nr;
            var prevElapsed = secondRow.avg_elapsed_nr;
            var diff = elapsed - prevElapsed;
            var trend = '-';
            var trendclass = 'steady';
            var percentageDiff = Math.round(diff/elapsed * 100);
            /*
            console.log('uniqueID:' + uniqueID);
            console.log('percentageDiff:' + percentageDiff);
            console.log('elapsed:' + elapsed);
            console.log('prevElapsed:' + prevElapsed);
              */  
                
            if(percentageDiff>50 && percentageDiff<400){
                trendclass = 'upSingle';
            }else if(percentageDiff>400){
                trendclass = 'upDouble';
            }else if(percentageDiff>0 && percentageDiff<50){
                trendclass = 'up45';
            }else if(percentageDiff<0 && percentageDiff>-50){
                trendclass = 'down45';
            }else if(percentageDiff<-50 && percentageDiff>-400){
                trendclass = 'downSingle';
            }else if(percentageDiff<-400){
                trendclass = 'downDouble';
            }
            //console.log('trendclass:' + trendclass);
            var sampleTimeRaw = firstRow.sampletime;
            var sampleTimeDate = new Date(+sampleTimeRaw);
            var sampleTime = getFormattedTime(sampleTimeDate);
            //console.log(sampleTimeRaw);
            //console.log(sampleTimeDate);
            //console.log(invocationTimeStamp);
            var nowTimeStamp = Date.now();
            //var timeDiff = invocationTimeStamp-sampleTimeRaw;
            var timeDiff = nowTimeStamp-sampleTimeRaw;
            //console.log(timeDiff);
            var timeDiffSecs = Math.round(timeDiff/1000);
            //console.log('timeDiffSecs:' + timeDiffSecs);
            var status = 'unknown';
            //if it is an async event I really need to lower these ratings....
            if((capmObject.service!=null)&&(capmObject.service.MessagePattern.Name=="PublishSubscribe")){
                if(elapsed>1000){
                    status = 'CATASTROPHIC';
                }else if(elapsed>500){
                    status = 'POOR';
                }else if(elapsed>200){
                    status = 'FAIR';
                }else if(elapsed>100){
                    status = 'GOOD';
                }else if(elapsed>50){
                    status = 'VERY-GOOD';
                }else if(elapsed>0){
                    status = 'EXCELLENT';
                }
            }else{
                if(elapsed>15000){
                    status = 'CATASTROPHIC';
                }else if(elapsed>5000){
                    status = 'POOR';
                }else if(elapsed>1000){
                    status = 'FAIR';
                }else if(elapsed>500){
                    status = 'GOOD';
                }else if(elapsed>100){
                    status = 'VERY-GOOD';
                }else if(elapsed>0){
                    status = 'EXCELLENT';
                }    
            }
            
            var hits = firstRow.avg_elapsed_hits_nr;
            //display it?
            elapsed = Math.round(elapsed);
            sortid = elapsed; 
            var htmlMsg = '';
            htmlMsg+='<tr id="' + uniqueID + '" class="' + status + '" order="' + sortid +'">';
                
            htmlMsg+='<td>';
            htmlMsg+=fancyTimeFormat(timeDiffSecs);
            htmlMsg+='</td>';
            htmlMsg+='<td>';
            htmlMsg+=svNumber;
            htmlMsg+='</td>';
            htmlMsg+='<td>';
            htmlMsg+=rootelement;
            htmlMsg+='</td>';
            htmlMsg+='<td>';
            htmlMsg+=namespace;
            htmlMsg+='</td>';
            htmlMsg+='<td>';
            htmlMsg+=provider;
            htmlMsg+='</td>';
            htmlMsg+='<td class="' + trendclass + '">';
            //htmlMsg+=numberWithCommas(elapsed) + ' ms ' + trend;
            htmlMsg+=numberWithCommas(elapsed) + ' ms';
            htmlMsg+='</td>';
            htmlMsg+='<td>';
            htmlMsg+=hits;
            htmlMsg+='</td>';
            htmlMsg+='<td class="' + status.toLowerCase() + '">';
            htmlMsg+=status;
            htmlMsg+='</td>';

            htmlMsg+='</tr>';
            var uiid = 'servicePerformanceData';
            //$('tbody#' + uiid +'TableBody').append(htmlMsg);
            //if this already exists then delete it?
            var existingRow = $('#' + uniqueID);
            $('#' + uniqueID).remove();
            //console.log(existingRow.length);
            
            trRows = $('tbody#' + uiid +'TableBody tr').length;
            //console.log('trRows:' + trRows); 
            if(trRows==0){
                $('tbody#' + uiid +'TableBody').append(htmlMsg);
            }else{
                var inserted = false;
                $('tbody#' + uiid +'TableBody tr').each(function(index, Element) {
                    //console.log('Is ' + sortid + ' greater than ' +  $(Element).attr('order')); 
                    if (Number(sortid) > Number($(Element).attr('order'))) {
                        //console.log('Yes its greater so append');
                        $(Element).before(htmlMsg);
                        inserted = true;
                        return false
                    }
                 });
                if(inserted!=true){
                    //console.log('inserted isnt true so just add this entry to the end of the table');
                    $('tbody#' + uiid +'TableBody').append(htmlMsg);
                }
            }
            var qs = buildStandardSearch(uiid+'Search', uiid+'Table', uiid+'noresults', uiid+'SearchLabel');
        }
    }
    //console.log('globalReturnCallsCount:' + globalReturnCallsCount);
    //console.log('totalCalls:' + totalCalls);
    if(globalReturnCallsCount>=totalCalls){
        globalReturnCallsCount = 0;
        console.log('this is the very last call so repeat everything?');
        $('#'+'servicePerformanceData'+'SearchLabel').text(' All ' + totalCalls + ' calls made.');
        //a=diehereosidontrepeatfornow;
        delay(function(){
        
            mainLoop(true);
        }, 30000 ); // end delay
        
    } 
}



function testStuff(arguments){
    console.log('testStuff');
    //console.log(arguments);
    console.log(arguments[0][0]);
    //console.log(arguments[0][0].rows);
    $.each(arguments, function(i, argument){
        //console.log(argument[0].rows);
        
        if((argument[0].rows!=null)&&(argument[0].rows.length>0)){
            //I have rows of data but not sure whats on here?
            var attr = argument[0].attributes;
            var capmObject = JSON.parse(attr.name);
            var firstRow = argument[0].rows[0];
            console.log(firstRow);
            //just get the first row of data for now?
            if((firstRow.avg_elapsed_nr!=null)&&(firstRow.avg_elapsed_nr!=null)){
                var elapsed = firstRow.avg_elapsed_nr;
                var hits = firstRow.avg_elapsed_hits_nr;
                //display it?
                var htmlMsg = '';
                htmlMsg+='capmObjectRoot=' + capmObject.rootelement;
                htmlMsg+=', elapsed=' + elapsed + 'ms';
                htmlMsg+=', hits=' + hits;
                htmlMsg+='<br>';
                $("div#container").append(htmlMsg);
            }
            
            
            //console.log(argument[0].rows);
        }
    });
}

function mergeServicesData2CAPMServicesData(servicesList,capmList){
    console.time('mergeServicesData2CAPMServicesData');
    //console.log('servicesList');
    //console.log(servicesList);
    //console.log('capmList');
    //console.log(capmList);
    //"provider":"DHUB",	"rootelement":"SearchPartyRequest",	"namespace":"Party/Service/V7.0"}
   
    $.each(capmList,function (index,capmService){
       var rootelement = capmService.rootelement;
       var namespace = capmService.namespace;
       var provider = capmService.provider;
        //console.log('capmService:' + namespace + '/' + rootelement);
        $.each(servicesList,function (index,serviceObject){
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
            if(splitlocation.length==5){
                //core?
                var mocknamespace = splitlocation[0] + '/' + splitlocation[1].replace('Services','Service') + '/' + splitlocation[2]; 
            }else if(splitlocation.length==6){
                //normal?
                //console.log('splitlocation:' + splitlocation);
                var mocknamespace = splitlocation[0] + '/' + splitlocation[1].replace('Services','Service') + '/' + splitlocation[3];
                
            }else{
                //console.log('splitlocation:' + splitlocation);
                //a=b;
                var mocknamespace = null;
            }
            
            if((rootelement==mockRoot3)||(rootelement==mockRoot2)||(rootelement==mockRoot1)){
               //now check version is a match?
               var capmNameSpaceArray = namespace.split('/');
               var capmVersion = capmNameSpaceArray[capmNameSpaceArray.length-1];
               if(version==capmVersion){
                    //console.log('This is a match with CAPM on the Service Object' + index);
                    capmService.serviceObject = serviceObject;
               }
            }
        });
        //now add the capmServiceObject back in to a new list
        
    });
    
    //console.log(capmList);
    console.timeEnd('mergeServicesData2CAPMServicesData');
    return capmList;
}

function buildAllCAPMServicesListAccordion(allProvidersData,allServicesData){
    console.time('buildAllCAPMServicesListAccordion');
    var id = 'capmServiceList';
    var headerID = id + 'Header';
    var contentID = id + 'Content';
    if((allServicesData!=null)&&(allServicesData.macroLocations!=null)&&(allServicesData.macroLocations.category!=null)&&(allProvidersData!=null)&&(allProvidersData.attributes!=null)&&(allProvidersData.rows!=null)){
        var servicesList = returnArray(flattenMacroList(allServicesData.macroLocations.category).macroList);
        console.log('servicesList');
        console.log(servicesList);
        var providersList = returnArray(allProvidersData.rows);
        console.log('providersList');
        console.log(providersList);
        //so loop though the service list and the provider list and match and add
        var mergedServicesCAPMList = mergeServicesData2CAPMServicesData(servicesList,providersList);
        console.log('mergedServicesCAPMList');
        console.log(mergedServicesCAPMList);
        console.log(mergedServicesCAPMList[0]);
        var thHTML = buildCAPMServiceListTH();
        var divhtml = buildAccordionDivWithSearch(id,thHTML);
        //$('#' + headerID).text('CAPM Service List');
        $('#' + 'container').html(divhtml);
        var htmlBody = '';
        //now loop
        var macroListObjCount = 0;
        forceSortArray(mergedServicesCAPMList, 'location', false, function(i, capmObj) {
            console.log(capmObj);
            var macroObj = capmObj.serviceObject;
            if((macroObj!=null)&&(macroObj.number!='Core')&&(macroObj.number!='Msg')){
                var svNumber = undefinedToEmpty(macroObj.number);
                var svCategory = undefinedToEmpty(macroObj.category);
                var svVersion = undefinedToEmpty(macroObj.version);
            }
            else{
                var svNumber = '?';
                var svCategory = '?';
                var svVersion = '?';
            };
           	var status = 'Unknown';
           	var providerMsg = '';
            if(changedInCurrentRelease(macroObj)==true){
       	    //now I want to check the change summary...
       	        status = 'Changed this Release';
            }else{
            	    status = 'unChanged';
            	}
           	htmlBody += '<tr><td>' + svNumber + '</td><td>' + capmObj.rootelement + '</td><td>' + svCategory + '</td><td>' + svVersion + '</td><td>' + status + '</td><td>' + providerMsg + '</td></tr>';
        });
        $('tbody#' + id+'TableBody').empty();
        $('tbody#' + id+'TableBody').append(htmlBody);
        var qs = buildStandardSearch(id+'Search', id+'Table', id+'noresults', id+'SearchLabel');
        //I actually want to update the Macro Header?
        //appendAccordionHeader(headerID, macroListObjCount + ' Service Schemas');

    }else{
        //console.log(allProvidersData);
        if((allProvidersData.status!=null)&&(allProvidersData.status!=null)){
            var status = allProvidersData.status;
            var statusText = allProvidersData.statusText;
        }else{
            var status = 'unknown';
            var statusText = 'unknown';
        }
        $('#' + contentID).html('No status found.' + ' Error : ' + statusText + ' - Code : ' + status);
        appendAccordionHeader(headerID, 'No Status found');
        
    }
    $("#serviceArchitectureAccordion" ).accordion( "refresh" );
    console.timeEnd('buildAllCAPMServicesListAccordion');
}

