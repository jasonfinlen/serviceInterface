function buildCAPMServiceGraphsHTML(serviceObject){
    console.time('buildCAPMServiceGraphsHTML');
   //console.log('buildCAPMServiceGraphsHTML');
    var uniqueName = serviceObject.key;
   //console.log(serviceObject);
    
    if(serviceObject!=null){
        var serviceNumber = serviceObject.ServiceNumber;
        var serviceName = serviceObject.ServiceName;
        var serviceVersion = serviceObject.SchemaVersionNumber;
        var serviceCategory = serviceObject.ServiceCategory;
        //no service location available from this object
        var serviceLocation = serviceObject.ServiceLocation;
        //console.log(macroData.ServiceMap);
        var b_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes';
    //var b_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes';
        var svType = 'Service';
	   var cacheBuster = '&' + getCacheBuster();
	   var timeframeHour = '&start=-2h&end=now';
	   var timeframe10days = '&start=-230h&end=now';
	   var timeframe12mnths = '&start=-12m&notTimeBased=1';
	
	
	
        var c_url = '&env=e9&domain=Production&type=JSONP';
        var reportname1 = '&reportname=profilepoint_table_summary_singleid_withTime.sql';
        var reportname2 = '&reportname=profilepoint_table_summary_singleid_withTime_monthly.sql';
        var item = 'dp:ServiceCompleted';
        var arrow = '-%3E';
        var myID = serviceObject.CAPM.identifier + arrow + item;
    	var realtimeGraphDiv = '&graphDiv=serviceperformancegraphsrealtime' + uniqueName;
        var hourlyGraphDiv = '&graphDiv=serviceperformancegraphshourly' + uniqueName;
        var monthlyGraphDiv = '&graphDiv=serviceperformancegraphsmonthly' + uniqueName;
        
        var statusDiv = '&statusDiv=serviceperformancegraphsstatus' + uniqueName;
        var expectation = '&expectation=0'
      	//var myID = '&id=1935850';
      	//console.log('myID:' + myID);
      	var realTimeURL = b_url + myID + c_url + timeframeHour + cacheBuster + realtimeGraphDiv + statusDiv + expectation;
      	var hourlyURL = b_url + myID + reportname1 + c_url + timeframe10days + cacheBuster + hourlyGraphDiv + statusDiv + expectation;  
      	var monthlyURL = b_url + myID + reportname2 + c_url + timeframe12mnths + cacheBuster + monthlyGraphDiv + statusDiv + expectation;
      	
       	$.ajax({
       		url: realTimeURL,
       		dataType: 'jsonp',
       		jsonpCallback: 'realtimeSingleServiceData',
       		jsonp: 'callback'
       	});
       	$.ajax({
       		url: hourlyURL,
       		dataType: 'jsonp',
       		jsonpCallback: 'hourlySingleServiceData',
       		jsonp: 'callback'
       	});
       	$.ajax({
       		url: monthlyURL,
       		dataType: 'jsonp',
       		jsonpCallback: 'monthlySingleServiceData',
       		jsonp: 'callback'
       	});
       	
	
    }
}

function getDefaultY(){
    return {min: 0,
            padding:{top:20, bottom:0},
            label: {text: 'Service Response Times', position: 'outer-middle'}
            };
}
function getDefaultY2(){
    return {min: 0,
            padding:{top:20, bottom:0},
            show: true,
            label: {text: 'Requests', position: 'outer-middle'}
            };
}

function getDefaultc3Data(c3DataObj, xlabel){
    var overrideColors = getDefaultColors();
    return {x: xlabel,
            columns: c3DataObj,
            axes: {
                requests: 'y2'
                },
            types: {
                requests: 'bar' // ADD
            },
                colors: overrideColors
            }
}
function getDefaultColors(){
    var colorsObject = {};
    colorsObject.expectation = 'red';
    colorsObject.average = '#3498DB';
    colorsObject.percent95 = '#1ABC9C';
    colorsObject.percent75 = '#F1C40F';
    colorsObject.maxelapsed = '#8E44AD';
    colorsObject.minelapsed = '#ABB2B9';
    colorsObject.requests = '#FF7F0E';
    colorsObject.standarddeviation = '#00FF00';
    colorsObject.weightedaverage = '#E4E4E4';
    

    return colorsObject;
}
function getConsumerBasedX(c3DataObj, providerModeFlag){
    textValue = 'Consumers'
    if(providerModeFlag){
        textValue = 'Providers';
    }
    return {type:'category',
            label: {
                text: textValue,
                position: 'outer-middle'
            },
            tick: {
                culling: false,
                format: function (x) { return c3DataObj[0][x+1]; }
            }
        };    
}

function getMonthBasedX(c3DataObj){
    return {type:'category',
            label: {
                text: 'Months',
                position: 'outer-middle'
            },
            tick: {
                culling: false,
                format: function (x) { return c3DataObj[0][x+1]; }
            }
        };    
}

function getTimeBasedX(c3DataObj){
    return {type:'timeseries',
            label: {
                text: 'Time',
                position: 'outer-middle'
            },
            tick: {
                format: '%Y-%m-%d %H:%M'
            }
        };    
}


function monthlySingleServiceData(capmData){
    var statusDiv = capmData.attributes.statusDiv;
    var graphDiv = capmData.attributes.graphDiv;
    var expectation = capmData.attributes.expectation;
    $("#" + statusDiv).html('');

    var c3Data = formatGenericSingleServiceDataAsC3(capmData, expectation);
    var overrideY = getDefaultY();
    var overrideY2 = getDefaultY2();
    var overridec3Data = getDefaultc3Data(c3Data,'month');
    var overrideXMonth = getMonthBasedX(c3Data);
   //console.log(c3Data);
   //console.log(overridec3Data);
   //console.log(overrideXMonth);
    //I cant make the graph generic as I need to customise stuff to have it work per different style
    var chart = c3.generate({
        bindto: '#' + graphDiv,
        title: {text: 'Monthly Average Service Calls (Last 12 months)'},
        data: overridec3Data,
        axis: {
            x: overrideXMonth,
            y: overrideY,
            y2: overrideY2
        }
    });
    //now hide a few of the things that arent that important
    chart.hide('maxelapsed');
    chart.hide('minelapsed');
    chart.hide('percent75');
}

function schemaSharedUsageGraph(schemaSharedUsageObj, contentID){
        //$('#' + contentID).append('');
        var graphID = contentID + 'graph1';
        var graphID2 = contentID + 'graph2';
        var graphID3 = contentID + 'graph3';
        $('#' + contentID).append('<div class="graphContainer"><span class="sharedUsageGraph" id="' + graphID + '"></span><span class="leftGraphDescription">This graph represents the number of schemas on the Y axis over how many consumers are using that schema.</span></div>');
        $('#' + contentID).append('<div class="graphContainer"><span class="sharedUsageGraph" id="' + graphID2 + '"></span><span class="leftGraphDescription">This graph represents the number of schemas on the Y axis that have either one consumer or more than 1 consumer.</span></div>');
        $('#' + contentID).append('<div class="graphContainer"><span class="sharedUsageGraph" id="' + graphID3 + '"></span><span class="leftGraphDescription">This graph represents the number of times the schema is used. Single consumer shemas are totaled as well as the toal number of invocations by all consumers for services with more then 1.</span></div>');
        //console.log(schemaSharedUsageObj);
        var c3Data = ['Number of Consumers'];
        var c3DataMoreThanOne = ['Multiple Usage', 0];
        var c3DataOne = ['Single Usage', 0];
        var c3DataMoreThanOneByVolume = ['Multiple Usage', 0];
        var c3DataOneByVolume = ['Single Usage', 0];
        
        
        
        $.each(schemaSharedUsageObj.consumerCountObjectList, function(index, ServiceList){
            var consumerCount = 0;
            if(ServiceList!=null){
                consumerCount = ServiceList.length;
            }
            c3Data.push(consumerCount);
            if(index==1){
                c3DataOne[1] = consumerCount;
                //now add up the total hits
                //console.log(ServiceList);
                $.each(ServiceList, function (k, service){
                    c3DataOneByVolume[1] = c3DataOneByVolume[1] + service.totalHits;  
                    //console.log(service.totalHits);
                });
            }else if(index>1){
                c3DataMoreThanOne[1] = c3DataMoreThanOne[1] + consumerCount;
                $.each(ServiceList, function (k, service){
                    c3DataMoreThanOneByVolume[1] = c3DataMoreThanOneByVolume[1] + service.totalHits;  
                    //console.log(service.totalHits);
                });

            }
        });
        
        var total = c3DataOneByVolume[1] + c3DataMoreThanOneByVolume[1];
        var byOneP = Math.round(c3DataOneByVolume[1]/total * 100);
        var byMultiP = Math.round(c3DataMoreThanOneByVolume[1]/total * 100);
        var c3DataOneByVolumePercentage = ['Single Usage Percentage', byOneP];
        var c3DataMoreThanOneByVolumePercentage = ['Multiple Usage Percentage', byMultiP];
        
        
        var chart = c3.generate({
        bindto: '#' + graphID,
        size: {
            width: 1000
        },
        data: {
            columns: [
                c3Data
            ],
            type: 'bar'
            },
            bar: {
                width: {
                    ratio: 0.5 // this makes bar width 50% of length between ticks
                }
                // or
                //width: 100 // this makes bar width 100px
            },
            axis: {
                x: {
                    tick: {
                        culling: false
                    }
                },
                y: {
                    label: 'Number of Services',
                    position: 'outer-middle'
                }
           }
        });
        var chart2 = c3.generate({
            bindto: '#' + graphID2,
            size: {
                width: 500
            },
            data: {
                x : 'x',
                columns: [
                    ['x', 'Service Usage Counts'],c3DataOne, c3DataMoreThanOne
                ],
                type: 'bar'
                },
                axis: {
                    x: {
                        type: 'category' // this needed to load string x value
                    },
                    y:{
                        label: 'Number of Services',
                        position: 'outer-middle'    
                    }
                },
                bar: {
                    width: {
                        ratio: 0.5 // this makes bar width 50% of length between ticks
                    }
                    // or
                    //width: 100 // this makes bar width 100px
                }
            });
            var chart3 = c3.generate({
            bindto: '#' + graphID3,
            size: {
                width: 500
            },
            data: {
                x : 'x',
                columns: [
                    ['x', 'Service Usage by Volume'],c3DataOneByVolumePercentage, c3DataMoreThanOneByVolumePercentage
                ],
                type: 'bar'
                },
                axis: {
                    x: {
                        type: 'category' // this needed to load string x value
                    },
                    y:{
                        label: 'Percentage of Invocations',
                        position: 'outer-middle',
                        max: 100,
                        min:0,
                        padding: 0
                        
                    }
                },
                bar: {
                    width: {
                        ratio: 0.5 // this makes bar width 50% of length between ticks
                    }
                    // or
                    //width: 100 // this makes bar width 100px
                }
            });
}


function realtimeSingleServiceData(capmData){
    //I need to getthe graph div from the attributes?
    var statusDiv = capmData.attributes.statusDiv;
    var graphDiv = capmData.attributes.graphDiv;
    var expectation = capmData.attributes.expectation;
    $("#" + statusDiv).html('');
    var c3Data = formatGenericSingleServiceDataAsC3(capmData, expectation);
    var overrideY = getDefaultY();
    var overrideY2 = getDefaultY2();
    var overridec3Data = getDefaultc3Data(c3Data,'sampletime');
    var overrideXTime = getTimeBasedX(c3Data);
    //I cant make the graph generic as I need to customise stuff to have it work per different style
    var chart = c3.generate({
        bindto: '#' + graphDiv,
        title: {text: '1Min Average Service Calls (Last 90 mins)'},
        data: overridec3Data,
        axis: {
            x: overrideXTime,
            y: overrideY,
            y2: overrideY2
        }
    });
    chart.hide('minelapsed');
    chart.hide('maxelapsed');
    
}

function hourlySingleServiceData(capmData){
    var statusDiv = capmData.attributes.statusDiv;
    var graphDiv = capmData.attributes.graphDiv;
    var expectation = capmData.attributes.expectation;
    $("#" + statusDiv).html('');
    var c3Data = formatGenericSingleServiceDataAsC3(capmData, expectation);
    var overrideY = getDefaultY();
    var overrideY2 = getDefaultY2();
    var overridec3Data = getDefaultc3Data(c3Data,'sampletime');
    var overrideXTime = getTimeBasedX(c3Data);
    //I cant make the graph generic as I need to customise stuff to have it work per different style
    var chart = c3.generate({
        bindto: '#' + graphDiv,
        title: {text: 'Hourly Average Service Calls (Last 10 Days)'},
        data: overridec3Data,
        axis: {
            x: overrideXTime,
            y: overrideY,
            y2: overrideY2
        }
    });
    chart.hide('minelapsed');
    chart.hide('maxelapsed');
    chart.hide('standarddeviation');
    chart.hide('percent75');

    
}


function getMonthFromString(mon){
   var d = Date.parse(mon + "1, 2012");
   if(!isNaN(d)){
      return new Date(d).getMonth() + 1;
   }
   return -1;
}
function resolveCAPMStatsNames(inName){
    var indexOfReplacementArray = [];
    indexOfReplacementArray.push('requests::requests');
    indexOfReplacementArray.push('hits::requests');
    indexOfReplacementArray.push('sum_elapsed_hits_nr::requests');
    indexOfReplacementArray.push('avg_elapsed_nr::average');
    indexOfReplacementArray.push('avg::average');
    indexOfReplacementArray.push('elapsed_nr::average');
    indexOfReplacementArray.push('p95::percent95');
    indexOfReplacementArray.push('p75::percent75');
    indexOfReplacementArray.push('max_elapsed_max_nr::maxelapsed');
    indexOfReplacementArray.push('min_elapsed_min_nr::minelapsed');
    indexOfReplacementArray.push('wavg::weightedaverage');
    indexOfReplacementArray.push('stddevforavg::standarddeviation');
    indexOfReplacementArray.push('max::maxelapsed');
    indexOfReplacementArray.push('min::minelapsed');
    
    
    $.each(indexOfReplacementArray, function(index, searchAndReplace){
        //these are keyed pairs
        var searchAndReplaceArray = searchAndReplace.split('::',2);
        var searchString = searchAndReplaceArray[0];
        var replaceString = searchAndReplaceArray[1];
        if(inName==searchString){
            inName = replaceString;
        }
    });
    return inName;    
}
function capmDataIgnoreFlag(columnName){
    ignoreArray = [];
    ignoreArray.push('id');
    ignoreArray.push('resolution');
    ignoreArray.push('max_elapsed_hits_nr');
    ignoreArray.push('name');
    ignoreArray.push('avg_elapsed_hits_nr');
    ignoreArray.push('sum_timeovernfr_nr');
    ignoreArray.push('sum_breaches_nr');
    ignoreArray.push('avg_breaches_nr');
    ignoreArray.push('max_breaches_nr');
    ignoreArray.push('localendtime');
    ignoreArray.push('datetime');
    ignoreArray.push('samples');
    
    ignoreFlag = false;
    $.each(ignoreArray, function(index, ignoreName){
       if(ignoreName.toLowerCase()==columnName.toLowerCase()){
           ignoreFlag = true;
           return false;
       } 
    });
    return ignoreFlag;
}

function detectAndConvertFormat(name, value){
    var result = value;
    var millisecondToSecondsNameArray = [];
    millisecondToSecondsNameArray.push("avg_elapsed_nr");
    millisecondToSecondsNameArray.push("elapsed_nr");
    millisecondToSecondsNameArray.push("min_elapsed_min_nr");
    millisecondToSecondsNameArray.push("max_elapsed_max_nr");
    millisecondToSecondsNameArray.push("sum_timeovernfr_nr");
    millisecondToSecondsNameArray.push("avg");
    //millisecondToSecondsNameArray.push("p75");
    millisecondToSecondsNameArray.push("p95");
    millisecondToSecondsNameArray.push("wavg");
    millisecondToSecondsNameArray.push("max");
    millisecondToSecondsNameArray.push("min");
    millisecondToSecondsNameArray.push("stddevforavg");
    
    
    
    $.each(millisecondToSecondsNameArray, function(index,millisecondToSecondsName){
        if(millisecondToSecondsName==name){
            result = convertMilliseconds2Seconds(value);
        }
    }); 
    return result;
}



function formatGenericSingleServiceDataAsC3(capmData, nfrValue){
    //console.log('capmData');
    //console.log(capmData);
    var c3DataTempArray = [];
    if((capmData!=null)&&(capmData.rows!=null)&&(capmData.columns!=null)){
    var capmDataRows = returnArray(capmData.rows);
    var capmDataCols = returnArray(capmData.columns);
    //now for each row I just want to get generically each attribute but ignoring some?
        for(i=0;i<capmDataCols.length;++i){
            if(capmDataIgnoreFlag(capmDataCols[i])!=true){
                c3DataTempArray.push([capmDataCols[i]]);
            }
        }
        //I also need to push an nfr array for the number of rows...
        if((nfrValue!=null)&&(isNaN(nfrValue)!=true)&&(nfrValue>0)){
            nfrArray = ['expectation'];
            for(i=0;i<capmDataRows.length;++i){
                nfrArray.push(nfrValue);
            }
            //now add the nfr to the series
            //need a way to detect millisecond fields with accuracy
            c3DataTempArray.push(nfrArray);
        }
        //now for each row any that match my array name then add it
        $.each(capmDataRows, function(index, capmDataRow){
            //c3DataTempArray.push([]);
            $.each(capmDataRow, function(name, value){
                //console.log(name + ':' + value);
                $.each(c3DataTempArray, function(k, statArray){
                    if(statArray[0]==name){
                        //add it to this array
                        //console.log(value);
                        //detect from the name if it needs formatting?
                        statArray.push(detectAndConvertFormat(name, value));
                    }
                });
            });
        });
    }
    //now fix up some names to get very consistant
    var removalbyIndexArray = [];
    $.each(c3DataTempArray, function(index, c3DataRow){
        //just get  the first row and update its name
        //also ignore data that is all 0
        var rowName = c3DataRow[0];
        var newRowName = resolveCAPMStatsNames(c3DataRow[0]);
        if(rowName!=newRowName){
            //console.log(rowName + '!=' + newRowName);
            c3DataRow[0] = newRowName;
        }
        var removeRowFlag = false;
        for(k=1;k<c3DataRow.length;++k){
            //console.log(c3DataRow[k]);
            if(c3DataRow[k]!=0){
                removeRowFlag = false;
                //console.log('Not removing due to : ' + c3DataRow[k]);
                //console.log(c3DataRow);
                break;
            }
            //if I get here then all data 0 so remove
            removeRowFlag = true;
        }
        if(removeRowFlag==true){
            //console.log('removing:');
            //console.log(c3DataRow);
            removalbyIndexArray.push(index); 
            
        }
        
    });
    var indexOffSet = 0;
    $.each(removalbyIndexArray, function(l, itemIndex){
        c3DataTempArray.splice(itemIndex+indexOffSet,1);
        indexOffSet = indexOffSet-1
        //after removal I have to get back the correct index
        
    });
    return c3DataTempArray;
}