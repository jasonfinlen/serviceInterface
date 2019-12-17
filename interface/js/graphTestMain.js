var statusOrders = ['high','medium','low'];
//global object for the UI rendering
var capmURLData = {};

function doFetch(){
    var listURL = 'https://Finlarden2!abc@gearedtd1.herokuapp.com/api/v1/status.json';
    $.ajax({
       url: listURL,
       headers: { "API-SECRET": "Finlarden2!abc" },
       contentType:'application/json',
       crossDomain:true,
       data: {
          format: 'json'
       },
       error: function() {
          console.log('An error has occurred');
       },
       dataType: 'text',
       success: function(data) {
          console.log(data);
          var j = JSON.decode(data);
          console.log(j);
          nightscoutResults(data);
       },
       type: 'GET',
      
       scriptCharset:'UTF-8'
    });
}

function callback(statusObj){
    console.log(statusObj);
}

function nightscoutResults(statusObj){
    console.log(statusObj);
}

function graphTestMain(){
    doFetch();
    
    //set the defaults for CAPM capmURLData
    /*
    setDefaultcapmURLData();
    listAllAvailableServices('e9');
    refreshCAPMData();
    $("#environment").selectmenu();
    $("#service").selectmenu();
    $( "#environment" ).selectmenu({
       change: function( event, data ) {
         capmURLData.env = data.item.value;
         //refreshCAPMData();
       }
     });
    $( "#service" ).selectmenu({
       change: function( event, data ) {
         capmURLData.serviceID = data.item.value;
         capmURLData.serviceName = data.item.label;
         console.log('data');
         console.log(data);
         console.log(capmURLData);
         refreshCAPMData();
       }
     });
    
    
    showDateTimePicker();
    */
}

function populateServicesList(idList){
    console.time('populateServicesList');
    console.log(idList);
    $('#service').children('option').remove();
    var htmlOptions = '';
    $.each(idList, function(index, idObj){
        var selected = false;
        if(index==0){selected = true}
        $('#service').append($("<option></option>").attr("disabled", false).attr("value", idObj.id).attr("selected", selected).text(idObj.name));        
    });
    console.timeEnd('populateServicesList');
    
    
    
}

function listAllAvailableServices(env){
    var listURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?classname=Namespace&name=Namespace&nametype=classes&action=doList&type=JSONP';
    listURL+='&id=' + getCompassTracePointID(env)
    listURL+='&env=' + env;
    listURL+='&domain='+getDomain(env);
    var envDomainURL = '&env=' + env + '&domain=' + getDomain(env);
    //console.log('listURL');
    //console.log(listURL);
    $.ajax({
        'url': listURL,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        'success': function (data){
            listAllAvailableServicesResult(data, envDomainURL);
        }
    });        
}



    
function listAllAvailableServicesResult(capmList, envDomainURL){
    console.time('listAllAvailableServicesResult');
    //console.log(capmList);
    if(capmList.rows!=null){
        var allRequests = [];
        var parentIDArray = returnArray(capmList.rows);
        $.each(parentIDArray, function(index, object){
            object.shortname = getFileNamefromLocation(object.name, true);
            //so if this isnt a real object I have to traverse further by buuilding more urls to call and more do Lists!
            
            var rootURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?classname=rootelement&name=rootelement&nametype=classes&action=doList&type=JSONP';
            rootURL+='&id=' + object.id;
            rootURL+=envDomainURL
            object.url = rootURL;
            
            if(index<3){
                //console.log(object);
            }
            allRequests.push($.ajax({'url': object.url,'type': 'GET','dataType': 'jsonp',jsonp: 'callback', 'id':object.id}));
        });
    //now create a defer object to get back all of the ids!!!
    var requests = $.unique(allRequests);
    //console.log(requests);
    var svObjectIdArray = [];
	var defer = $.when.apply($, requests);
    defer
        .done(function(){
            //console.log(arguments);
            $.each(arguments, function(i, argument){
                var serviceDataObject = argument[0];
                var parentDataObject = parentIDArray[i];
                if(i<3){
                    //console.log('parentDataObject');
                    //console.log(parentDataObject);
                    //console.log('serviceDataObject');
                    //console.log(serviceDataObject);
                    
                    
                }
                //now join the two sets of datas into one object
                var servicesArray = returnArray(serviceDataObject.rows); 
                $.each(servicesArray, function(svIndex, svObj){
                    svObj.contextName = parentDataObject.name;
                    svObjectIdArray.push(svObj); 
                });
            });
            //console.log(svObjectIdArray);
            populateServicesList(svObjectIdArray);
            console.timeEnd('listAllAvailableServicesResult');
        })
        .fail(function(jqXHR, textStatus, errorThrown){
            console.log(jqXHR);
            console.timeEnd('listAllAvailableServicesResult');
            }
        );
    }
}

function setDefaultcapmURLData(){
    capmURLData.startDate = $.format.date(new Date().addHours(-2), "yyyy-MM-dd");
    capmURLData.startTime = $.format.date(new Date().addHours(-2), "HH:mm");
    capmURLData.endDate = $.format.date(new Date(), "yyyy-MM-dd");
    capmURLData.endTime = $.format.date(new Date(), "HH:mm");
    capmURLData.env = 'e9';
    capmURLData.serviceID = '3436196';
    capmURLData.serviceName = 'NotifyAlertMatchRequest';
    
}

function test(){
    getCompassTracePointID('e9');
}

function resolveServiceNameEnvironmentToID(ServiceName, Environment){
    var serviceObj = {};
    serviceObj.name
    serviceObj.number
    serviceObj.id
    
}

function refreshCAPMData(){
    $('#menuDiv').html('');
    console.log('startDate:' + capmURLData.startDate);    
    console.log('startTime:' + capmURLData.startTime);
    console.log('EndDate:' + capmURLData.endDate);
    console.log('EndTime:' + capmURLData.endTime);
    console.log('Env:' + capmURLData.env);
    var url = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes&NEXT=4&other=PLACEHOLDER&type=JSONP';
    url+='&id=' + capmURLData.serviceID;
    
    
    url+='&env=' + capmURLData.env;
    //url+='&domain=NonProdE6';
    url+='&domain='+getDomain(capmURLData.env);
    console.log(getDomain(capmURLData.env));
    url+='&filter_name_nr=dp:ServiceCompleted&graph_start=on&graph_end=on&graph_user_nr=on&graph_elapsed_nr=on&graph_consumer_nr=on&count=10000';
    url+='&time_start_date=' + capmURLData.startDate;
    url+='&time_start_time=' + capmURLData.startTime;
    url+='&time_end_date=' + capmURLData.endDate;
    url+='&time_end_time=' + capmURLData.endTime;
    console.log(url);
    console.time('CAPMDataCall');
    $.ajax({
        'url': url,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        'success': function (data){
            console.timeEnd('CAPMDataCall');
            graphTestDataResult(data);
        }
    });
}
function showDateTimePicker(){
     		 jqDateFormat = "yyyy-MM-dd HH:mm";
     		 var dateTimeNow = $.format.date(new Date(), jqDateFormat);
     		 var dateTime2Hours = $.format.date(new Date().addHours(-2), jqDateFormat);
     		 var dateTime4Hours = $.format.date(new Date().addHours(-4), jqDateFormat);
     		 var dateTime8Hours = $.format.date(new Date().addHours(-8), jqDateFormat);
     		 var dateTime24Hours = $.format.date(new Date().addHours(-24), jqDateFormat);
     		 var dateTime2Days = $.format.date(new Date().addHours(-48), jqDateFormat);
     		 var dateTime7Days = $.format.date(new Date().addHours(-168), jqDateFormat);
     		 
			
			$('#config-demo').daterangepicker({
			    "timePicker": true,
			    "timePickerIncrement": 5,
			    "timePickerSeconds": false,
			    "autoApply": true,
			    "autoUpdateInput": true,
			    "locale": {
        			"format": "YYYY-MM-DD HH:mm"
        		},
			    "ranges": {
			        "Last 2 Hours": [
			            dateTime2Hours,
			            dateTimeNow
			        ],
			        "Last 4 Hours": [
			            dateTime4Hours,
			            dateTimeNow
			        ],
			        "Last 8 Hours": [
			            dateTime8Hours,
			            dateTimeNow
			        ],
			        "Last 24 Hours": [
			            dateTime24Hours,
			            dateTimeNow
			        ],
			        "Last 2 Days": [
			            dateTime2Days,
			            dateTimeNow
			        ],
			        "Last 7 Days": [
			            dateTime7Days,
			            dateTimeNow
			        ]
			    },
			    "startDate": dateTime2Hours,
			    "endDate": dateTimeNow
			}, function(start, end, label) {
			     
			     console.log('New date range selected: ' + start.format('YYYY-MM-DD hh:mm') + ' to ' + end.format('YYYY-MM-DD hh:mm') + ' (predefined range: ' + label + ')');
			     
			     capmURLData.startDate = start.format('YYYY-MM-DD');
                 capmURLData.startTime = start.format('HH:mm');
                 capmURLData.endDate = end.format('YYYY-MM-DD');
                 capmURLData.endTime = end.format('HH:mm');
			     refreshCAPMData();
			});
}

function calculateTimeStatus(milliseconds){
    if(milliseconds<100){
        return statusOrders[2];    
    }else if(milliseconds<1000){
        return statusOrders[1];    
    }else{
        return statusOrders[0];
    }
}

function isSydneyBox(context){
    var checkContext = context.toLowerCase();
    if((checkContext=='imu1.s:immi.esb.service.sv249.reply')||(checkContext=='imp1.s:immi.esb.service.sv249.reply')){
        return true;
    }else if((checkContext=='dpxml0102-mgt')||(checkContext=='dpxml0101-mgt')){
        return true;
    }else{
        return false;
    }
    
}

function graphTestDataResult(capmData){
    //console.log(capmData);
    var htmlMsg = '<br><br><table>';
    htmlMsg+='<tr>';
    htmlMsg+='<th>Date Time</th>';
    htmlMsg+='<th>Response (ms)</th>';
    htmlMsg+='<th>Security User</th>';
    htmlMsg+='<th>Context User</th>';
    htmlMsg+='</tr>';
    var rowCount = 0;
    if((capmData.rows!=null)&&(capmData.rows.length!=null)){
        $.each(capmData.rows, function (rowIndex, rowObject) {
            //console.log(rowObject);
            //skip over the non sydney box ones
            //if(isSydneyBox(rowObject.consumer_nr)!=53){
            if(isSydneyBox(rowObject.consumer_nr)){
                var rowStatus = calculateTimeStatus(rowObject.elapsed_nr);
                
                rowCount++;
                htmlMsg+='<tr>';
                htmlMsg+='<td class="' + '' + '" ' + '>';
                htmlMsg+=rowObject.start;
                htmlMsg+='</td>';
                htmlMsg+='<td class="' + rowStatus + '" ' + '>';
                htmlMsg+=rowObject.elapsed_nr;
                htmlMsg+='</td>';
                htmlMsg+='<td>';
                htmlMsg+=rowObject.user_nr;
                htmlMsg+='</td>';
                htmlMsg+='<td>';
                htmlMsg+=rowObject.consumer_nr;
                htmlMsg+='</td>';
                htmlMsg+='</tr>';
            }
        });
    }
    htmlMsg+='</table>';
    $('#rowCounts').html('Count : ' + rowCount);
    $('#menuDiv').append(htmlMsg);
}

Date.prototype.addHours= function(h){
    this.setHours(this.getHours()+h);
    return this;
}
