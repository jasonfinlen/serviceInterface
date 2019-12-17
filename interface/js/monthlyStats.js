var c_url = 'http://compass-prod-web:8080/CompassWeb/GetObjects?';
var s_url = c_url + 'type=JSONP&env=e9&domain=Production&'
var d_url = s_url + 'action=doAttributes&'

function allServicesDataCollector(){
	var b_url = d_url + 'datasrc=id:Production-%3ee9-%3e%2a-%3edp:serviceCompleted&GROUPBY=1&start=-24h&end=-2h&reportname=query.sql&WHERE=id%20in%20%28%24%7bID%7d%29%20and%20&FIELDS=sampletime-mod%28sampletime%2c3600000%29as%20sampletime%2csum%28sum_elapsed_hits_nr%29%20as%20hit&TABLES=e9_extendedprofilepoint_agg&aggregate_avg_elapsed_hits_nr=sum';
	//console.log('b_url:' + b_url);
	$.ajax({
		url: b_url,
		dataType: 'jsonp',
		jsonpCallback: 'allServicesDataStore',
		jsonp: 'callback'
	});
}

function allServicesDataStore(data){
	//console.log(data);
	//console.log('data.FIELDS:' + data.attributes.FIELDS);
	var serviceList = data.attributes.objectList;
	//console.log(serviceList);
	var serviceCount = Object.keys(serviceList).length;
	displayActiveServiceCount(serviceCount);
	//console.log('serviceCount:' + serviceCount);
}

function displayActiveServiceCount(count){
	if(count>0){
		var htmlMsg = '<p>There have been ' + count + ' different services invoked across the ESB in the last 24 hours.</p>';
		document.getElementById('activeServices').innerHTML = htmlMsg;

		
	}else{
		var htmlMsg = '';
		document.getElementById('activeServices').innerHTML = htmlMsg;
	}
}

function extendedLogPoints(data) {
	//console.log('ExtendedLogPoints now returned');
	//console.log(data);
	//now create a simply table from the json data

	if (data.rows.length == 0) {
		var htmlMsg = '<h5>No stats available at this time</h5>';
		document.getElementById('monthlyStatsTable').innerHTML = htmlMsg;
	}else{
		
		//now I have all the providers written I want to collect the stats tables for every one of the
		//loop though using the ids?
		//console.log('Rows:' + data.rows.length);
		var allRequests = Array();
		for (index = 0; index < data.rows.length;++ index)
		{
			var url = monthlyStatsURL(data.rows[index].id,data.rows[index].name);
			allRequests.push($.getJSON(url));
		}
		var requests = $.unique(allRequests);
		var defer = $.when.apply($, requests);
		defer.done(function(){
			//console.log('defer finished');
			var htmlTables = '';
			$.each(arguments, function(index, responseData){
	        	// "responseData" will contain an array of response information for each specific request
	        	// I need to get the Service Completed one out first
	        	if(responseData[0].attributes.name.indexOf('ServiceCompleted')!=-1){
	        		htmlTables += buildMonthTableHTML(responseData[0]);
	        	}
	    	});
			$.each(arguments, function(index, responseData){
	        	// "responseData" will contain an array of response information for each specific request
	        	// I need to get the Service Completed one out first
	        	if(responseData[0].attributes.name.indexOf('Provider')!=-1){
	        		htmlTables += buildMonthTableHTML(responseData[0]);
	        	}
	    	});
			$.each(arguments, function(index, responseData){
	        	// "responseData" will contain an array of response information for each specific request
	        	// I need to get the Service Completed one out first
	        	if((responseData[0].attributes.name.indexOf('Provider')==-1)&&(responseData[0].attributes.name.indexOf('ServiceCompleted')==-1)){
	        		htmlTables += buildMonthTableHTML(responseData[0]);
	        	}
	    	});
	    	document.getElementById('monthlyStatsTable').innerHTML = htmlTables;
		})
	}	
}

function buildCAPMCosumerProviderGraphsHTML(ServiceObject){
    console.time('buildCAPMCosumerProviderGraphsHTML');
    //console.log(ServiceObject);
    
    if((ServiceObject!=null)&&(ServiceObject.CAPM!=null)&&(ServiceObject.CAPM.activeEnvironmentsList!=null)){
        
        //so from here I want to build urls for all consumers and providers across all "ACTIVE" environments?
        var activeEnvironmentsArray = ServiceObject.CAPM.activeEnvironmentsList;
        var allRequests = [];
        for (var i = 0; i < activeEnvironmentsArray.length; i++) {
            allRequests.push($.getJSON(compassConsumersURLFromServiceObj(ServiceObject, '90d', activeEnvironmentsArray[i])+'&callback=?'));
            allRequests.push($.getJSON(compassProvidersURLFromServiceObj(ServiceObject, '90d', activeEnvironmentsArray[i])+'&callback=?'));
        }
        var defer = $.when.apply($, allRequests);
        var consumerRows = [];
        var providerRows = [];
        
		defer
		.done(function(){
			//console.log('defer finished');
			//console.log(arguments);
			for (var i = 0;i<arguments.length;i=i+2) {
                var consumerArg = arguments[i];
                var providerArg = arguments[i+1];
                var capmConsumerData = consumerArg[0];
                var env = capmConsumerData.attributes.env;
                var capmProviderData = providerArg[0];
                var key = capmConsumerData.attributes.key;
            //from the key I need to get the serviceObjectback...
                var ServiceObject = {};
                ServiceObject.key = key;
                ServiceObject.consumers = [];
               ServiceObject.providers = [];
               var ServiceObject = cleanRawCAPMConsumerAndProviderData(capmConsumerData, capmProviderData, ServiceObject, env);
               
               
               
            }
            //ad these into the ServiceObject and pass onto a painting routine?
            //console.log(ServiceObject);
            
            buildProviderAndConsumerHTML(ServiceObject);
            console.timeEnd('buildCAPMCosumerProviderGraphsHTML');
        })
		.fail(function(jqXHR, textStatus, errorThrown){
               console.log('buildCAPMCosumerProviderGraphsHTML!', jqXHR, textStatus, errorThrown);
               console.timeEnd('buildCAPMCosumerProviderGraphsHTML');
               hideLoadingBlock(-1);
        });

    }else{
        //dont do anything?
    }
}

function cleanRawCAPMConsumerAndProviderData(capmConsumerData, capmProviderData, ServiceObject, env){
    for (var m = 0;m<capmProviderData.rows.length;++m) {
        if(includeProviderRow(capmProviderData.rows[m], ServiceObject)){
            capmProviderData.rows[m].env = env;
            capmProviderData.rows[m].provider = capmProviderData.rows[m].name.replace('dp:Provider:', ''); 
            ServiceObject.providers.push(capmProviderData.rows[m]);
        }
    }
    for (var k = 0;k<capmConsumerData.rows.length;++k) {
        if(includeConsumerRow(capmConsumerData.rows[k], ServiceObject)){
            capmConsumerData.rows[k].env = env;
            ServiceObject.consumers.push(capmConsumerData.rows[k]);    
        }
    }
    return ServiceObject;
    
}

function includeProviderRow(rowItem, serviceObject){
   //console.log(rowItem.name);
    //1 hit in 90 days doesnt mean enough!
    if(rowItem.name.indexOf(':Provider')==-1){
        return false;
    }
    if(rowItem.name.indexOf(':ESB')!=-1){
        return false;
    }
    if(rowItem.name.indexOf(':DESB')!=-1){
        return false;
    }
    
    return true;
}
function includeConsumerRow(rowItem, serviceObject){
    //1 hit in 90 days doesnt mean enough!
    
    if(rowItem.hits<2){
        return false;
    }
    if(rowItem.consumer.indexOf(serviceObject.ServiceNumber)!=-1){
        return false;
    }
    //does this consumer already exist?
    for (var i = 0; i < serviceObject.consumers.length;++i){
        var consumerObj = serviceObject.consumers[i];
        if(consumerObj.consumer==rowItem.consumer){
            return false;
        }
    }
    //finally if there is an array of providers already make sure thisisnt one of them?
    if((serviceObject.providers!=null)&&(rowItem.consumer!="NONE")){
        for (var i = 0; i < serviceObject.providers.length;++i){
            if(rowItem.consumer==serviceObject.providers[i].provider){
                return false;
            }
        }
    }
    return true;
}

function formatArrayOfObjectsAsTable(arrayOfData){
    //this is an array of Consumers or Providers?
    ///get a list of keys
    var keysArray = [];
    
    for (var key in arrayOfData[0]) {
        var keyName = key;
        keysArray.push(keyName);
        
     }
     keysArray.sort();
     //now use these as the first row of the table
     var html = '<table>';
     html+='<tr>';
        
        for(var i = 0;i<keysArray.length;i++){
            html+='<th>' + formatUnderScoresForHumans(keysArray[i]) + '</th>';
        }
     html+='</tr>';
     
     //now for each of the values in the original array do stuff
     for(var i = 0;i<arrayOfData.length;i++){
         var rowData = arrayOfData[i];
         html+='<tr>';
         for(var k = 0;k<keysArray.length;k++){
            var keyValue = rowData[keysArray[k]];
            html+='<td>' + keyValue + '</td>';
         }
         html+='</tr>';
     }
     html+='</table>';
     return html;
}

function buildProviderAndConsumerHTML(ServiceObject){
    var consumerproviderdivId = 'consumerproviderGraphs' + ServiceObject.key;
    var consumerGraphDivId = 'consumerGraph' + ServiceObject.key;
    var providerGraphDivId = 'providerGraph' + ServiceObject.key;
    var consumerTableDivId = 'consumerTable' + ServiceObject.key;
    var providerTableDivId = 'providerTable' + ServiceObject.key;
    
    //var consumerhtml = '<h4>Raw ' + ServiceObject.MessagePattern.Request + ' Data</h4>';
    //var providerhtml = '<h4>Raw ' + ServiceObject.MessagePattern.Response + ' Data</h4>';
    var consumerhtml = '<h4>Raw ' + 'Request' + ' Data</h4>';
    var providerhtml = '<h4>Raw ' + 'Response' + ' Data</h4>';
    var consumerTable = formatArrayOfObjectsAsTable(ServiceObject.consumers);
    var providerTable = formatArrayOfObjectsAsTable(ServiceObject.providers);
    consumerhtml+=consumerTable;
    providerhtml+=providerTable;
    $("div#" + consumerTableDivId).html(consumerhtml);
    $("div#" + providerTableDivId).html(providerhtml);
    
    var consumerProviderObj = buildConsumerProviderJSONDataObject(ServiceObject);
    var c3Data = formatCAPMConsumerDataAsC3Bar(consumerProviderObj);
    var c3DataProvider = formatCAPMProviderDataAsC3Bar(consumerProviderObj);
    var overridec3Data = getDefaultc3Data(c3Data,'consumer');
    var overridec3DataProvider = getDefaultc3Data(c3DataProvider,'provider');
    var overrideXConsumer = getConsumerBasedX(c3Data, false);
    var overrideXProvider = getConsumerBasedX(c3DataProvider, true);
    
    var overrideY = getDefaultY();
    var overrideY2 = getDefaultY2();
    
    var requestGraphTitle = 'Request';
    var responseGraphTitle = 'Response';

    //var requestGraphTitle = ServiceObject.MessagePattern.Request;
    //var responseGraphTitle = ServiceObject.MessagePattern.Response;

    //if(ServiceObject.MessagePattern.Name=='PublishSubscribe'){
      //  requestGraphTitle+=' Pushed Notifications (Last 90 days)';
        //responseGraphTitle+=' Recieved Notifications (Last 90 days)';
    //}else{
        requestGraphTitle+=' Invocations (Last 90 days)';
        responseGraphTitle+=' Recieved Calls (Last 90 days)';
    //}
    
    var chart = c3.generate({
        bindto: '#' + consumerGraphDivId,
        title: {text: requestGraphTitle},
        data: overridec3Data,
        axis: {
            x: overrideXConsumer,
            y: overrideY,
            y2: overrideY2
        }
    });
    var chart = c3.generate({
        bindto: '#' + providerGraphDivId,
        title: {text: responseGraphTitle},
        data: overridec3DataProvider,
        axis: {
            x: overrideXProvider,
            y: overrideY,
            y2: overrideY2
        }
    });

    
    
}

function formatCAPMConsumerDataAsC3Bar(capmData){
   //console.log(capmData);
    var c3DataTempArray = [];
    if((capmData!=null)&&(capmData.consumerList!=null)){
        var capmDataRows = returnArray(capmData.consumerList);
        var consumerrow = [];
        var hitsrow = [];
        var averagesrow = [];
        consumerrow.push('consumer');
        hitsrow.push('requests');
        averagesrow.push('average');

        $.each(capmDataRows, function(index,row){
           //console.log(row);
            consumerrow.push(row.consumer);
            hitsrow.push(row.hits);
            averagesrow.push(row.elapsed_nr);
        });
        c3DataTempArray.push(consumerrow);
        c3DataTempArray.push(hitsrow);
        c3DataTempArray.push(averagesrow);
    }
    return c3DataTempArray;
}
function formatCAPMProviderDataAsC3Bar(capmData){
    var c3DataTempArray = [];
    if((capmData!=null)&&(capmData.providerList!=null)){
        var capmDataRows = returnArray(capmData.providerList);
        var providerrow = [];
        var hitsrow = [];
        
        providerrow.push('provider');
        hitsrow.push('requests');
        

        $.each(capmDataRows, function(index,row){
           //console.log(row);
            providerrow.push(row.provider);
            hitsrow.push(capmData.totalHits);
            
        });
        c3DataTempArray.push(providerrow);
        c3DataTempArray.push(hitsrow);
        
    }
    return c3DataTempArray;
}
function buildMonthlyStatsCallback(data, ServiceObject, monthlyStatsDivID){
	//console.log('buildMonthlyStatsCallback');
	console.time('buildMonthlyStatsCallback');
	//console.log(monthlyStatsDivID);
	//console.log(ServiceObject);
	//console.log(data);
	var noStatshtml = '<h4>No stats available in CAPM for this time for service ' + ServiceObject.ServiceName + '</h4>';
	//now create a simply table from the json data
	if(data==undefined){
	    $("div#" + monthlyStatsDivID).html(noStatshtml);
	    //console.log('No monthly stats object defined');
	}else if(data.rows.length == 0){
		$("div#" + monthlyStatsDivID).html(noStatshtml);
		//console.log('No rows found in the monthly stats object');
	}else{
		//now I have all the providers written I want to collect the stats tables for every one of the
		//loop though using the ids?
		//console.log('Rows:' + data.rows.length);
		$("div#" + monthlyStatsDivID).html('');
		var allRequests = Array();
		for (index = 0; index < data.rows.length;++ index)
		{
			var url = monthlyStatsURL(data.rows[index].id,data.rows[index].name);
			allRequests.push($.getJSON(url));
		}
		var requests = $.unique(allRequests);
		var defer = $.when.apply($, requests);
		defer.done(function(){
			//console.log('defer finished');
			var htmlTables = '';
            for(var i = 0;i<arguments.length;i++){
                var argument = arguments[i];
                var responseData = argument[0];
                var name = responseData.attributes.name;
                if(name.indexOf('ServiceCompleted')!=-1){
	        		htmlTables += buildMonthTableHTML(responseData);
	        	}
            }
            
            
	    	$("div#" + monthlyStatsDivID).append(htmlTables);
		})
	}

	console.timeEnd('buildMonthlyStatsCallback');
}
function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function buildMonthTableHTML(data){
	//console.log(data);
	var htmlTable = '';
	var title = data.attributes.name;
	if(title=='dp:Request'){
		title = 'ESB Routing';
	}
	if((title.indexOf('RequestFlow')!=-1)||(title.indexOf('ResponseFlow')!=-1)){
		title = 'ESB ' + title + ' Transformation';
	}
	var id = data.attributes.id;
	htmlTable += '<h4>' + title.replace('dp:', '') + '</h4>';
	htmlTable += '<table id="' + id + '" class="monthlyStats">';
	htmlTable += '<thead>';
	htmlTable += '<tr>';
	for (var index = 0; index < data.columns.length;++ index){
		var header = toTitleCase(data.columns[index]);
		htmlTable += '<th>' + header + '</th>';
	}
	htmlTable += '</tr>';
	htmlTable += '</thead>';
	htmlTable += '<tbody>';
	for (var index = 0; index < data.rows.length;++ index){
		htmlTable += '<tr>';
		htmlTable += '<td>' + toTitleCase(data.rows[index].month) + '</td>';
		htmlTable += '<td>' + formatMilliseconds(data.rows[index].average) + '</td>';
		htmlTable += '<td>' + formatMilliseconds(data.rows[index].percent95) + '</td>';
		htmlTable += '<td>' + formatMilliseconds(data.rows[index].percent75) + '</td>';
		htmlTable += '<td>' + formatMilliseconds(data.rows[index].maxelapsed) + '</td>';
		htmlTable += '<td>' + numberWithCommas(data.rows[index].requests) + '</td>';
		htmlTable += '</tr>';
	}

	htmlTable += '</tbody>';
	htmlTable += '</table>';
	return htmlTable;
}

function getMonthlyStats(id){
	var callURL = monthlyStatsURL(id);
	$.ajax({
		url: callURL,
		dataType: 'jsonp',
		jsonpCallback: 'monthlyStatsTable'
	});
}

function monthlyStatsTable(data){
	//this is called repeat
	//console.log(data.attributes.id);
	alert(data.attributes.id);
	//htmlTable += id + ':';
}

function monthlyStatsURL(id, name){
	var sql = '&reportname=profilepoint_table_summary_singleid_withTime_monthly.sql';
	var period = '&start=-12m&end=-1d';
	var name = '&name=' + name;
	var callback = '&callback=?';
	var my_url = d_url + '&id=' + id + sql + period + name + callback;
	return my_url;
}

function buildMonthlyStatsHTML(serviceObject, monthlyStatsDivID){
    console.time('buildMonthlyStatsHTML');
    var svType = 'Service';
    
	//console.log(serviceObject.CAPM.extendedProfilePointJSON);
	//console.log('b_url:' + b_url);
    if(serviceObject.CAPM!=null){
        $.ajax({
            'url': serviceObject.CAPM.extendedProfilePointJSON,
            'type': 'GET',
            'dataType': 'jsonp',
            'jsonp': 'callback',
            //'jsonpCallback': 'extendedLogPoints', 
            'success': function (data){
                $("div#" + monthlyStatsDivID).html('<h4>Loading...</h4>');
                buildMonthlyStatsCallback(data, serviceObject, monthlyStatsDivID);
            },
            'error': function(XMLHttpRequest, textStatus, errorThrown) { 
                textStatus = textStatus.replace('error', 'Error');
                console.log("Status: " + textStatus + " \n" + "Error: " + errorThrown);
                //errorDialog("Error in fetching Macro json Data", "<h3>Status: " + textStatus + "</h3><br>" + "Error: " + errorThrown + '');
                var noStatshtml = '<h4>No stats available in CAPM for this time for service ' + serviceObject.ServiceName + '</h4>';
                $("div#" + monthlyStatsDivID).html(noStatshtml);
            }       
        });
    }
	console.timeEnd('buildMonthlyStatsHTML');
}

function monthlyStatsCollector(svCategory,svType,svVersion,svRequestName) {
	console.time('monthlyStatsCollector');
	//var svCategory = 'Health';
	//var svType = 'Service';
	//var svVersion = 'V1.0';
	//var svRequestName = 'RegisterMedicalExaminationsResultsRequest';
	myID = svCategory + "/" + svType + '/' + svVersion + '-%3E' + svRequestName + 'Request';
	//console.log('myID:' + myID);
	//myID = '2058089';
	var b_url = s_url + 'id=' + myID + '&classname=extendedprofilepoint&name=extendedprofilepoint&nametype=classes&action=doList&type=JSONP';
	//console.log('b_url:' + b_url);
	$.ajax({
		url: b_url,
		dataType: 'jsonp',
		jsonpCallback: 'extendedLogPoints',
		jsonp: 'callback'
	});
	console.timeEnd('monthlyStatsCollector');
}




