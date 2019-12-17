var globalreleaseName = 'BRMAR18'; 
var globalreleaseLocation = '../enterpriseServices/BRMAR18/';
var globalReturnCallsCount = 0;
var statusOrders = ['CATASTROPHIC','POOR','FAIR','GOOD','VERY-GOOD','EXCELLENT'];

function queueTransmissionStatsCheck(repeatFlag){
    console.time('CALLTIME');
    //var getQueueURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes&other=PLACEHOLDER&id=IM*-%3ESYSTEM.CLUSTER.TRANSMIT.QUEUE&env=e9&domain=Production&type=JSONP&&nocache=1520303312';
    //var getQueueURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes&other=PLACEHOLDER&id=IM*-%3E&env=e9&domain=Production&type=JSONP&class=queue_local&&nocache=1520303312';
    var getQueueURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?id=10&classname=queuemanager&name=queuemanager&env=e9&domain=Production&nametype=classes&action=doList&type=JSONP&&nocache=1520303312';
    $.ajax({
        'url': getQueueURL,
        'type': 'GET',
        'dataType': 'jsonp',
        'jsonp': 'callback',
        'success': function (data){
            getAllQueueManagers(data, repeatFlag);
        }
    });
}

function getAllQueueManagers(data, repeatFlag){
    console.time('getAllQueueManagers');
    //console.log(data);
    var idMsg = '';
    var queueManagers = [];
    var passback;
    var allRequests = [];
	

    $.each(data.rows, function(index, row){
        //onsole.log(row.id);
        //console.log(row.name);
        var queue = {};
        queue.id = row.id;
        queue.name = row.name;
        queueManagers.push(queue);
        var selector = row.name;
        singleQueueURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doList&NEXT=0&NEXT=1a&other=PLACEHOLDER&id=' + row.id + '&env=e9&domain=Production&type=JSONP&NEXT=2&NEXT=3&NEXT=4&classname=queue_local&start=-24h&end=now&&nocache=1520473153';
        allRequests.push($.ajax({'url': singleQueueURL,'type': 'GET','dataType': 'jsonp',jsonp: 'callback'}));
            
        if(index==0){
            idMsg+=selector;
        }else{
            idMsg+=',' + selector;
        }
        
    });
    
    console.log('queueManagers.length:' + queueManagers.length);
    console.log('allRequests.length:' + allRequests.length);
    //This call gets every queue from every queue manager with a class of queue_local 
    var getQueueURL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doList&NEXT=0&NEXT=1a&other=PLACEHOLDER&id=' + idMsg + '&env=e9&domain=Production&type=JSONP&NEXT=2&NEXT=3&NEXT=4&classname=queue_local&start=-24h&end=now&&nocache=1520473153';
    
	var queueClusterNames = [];
	var queueClusters = [];
	var requests = $.unique(allRequests);
	var defer = $.when.apply($, requests);
	defer
	   .done(function(){
            //update this to just call no matter if success or fail?
   			console.log('arguments.length:'+arguments.length);
   			$.each(arguments, function(i, argument){
   			    var queueData = argument[0];
   			    var queueDataRows = queueData.rows;
   			    var queueManager = queueManagers[i];
   			    var queues = [];
                queueManager.queues = queueDataRows;
   			    //console.log(queueManager);
   			    //now I want to place the queues under a cluster
   			    var qNameLength = queueManager.name.length;
                if(qNameLength>7){
                    var queueClusterName = queueManager.name.substr(0, qNameLength-2) + '';    
                }else{
                    var queueClusterName = queueManager.name.replace('01', '').replace('02', '');
                }
                if(queueClusterNames.indexOf(queueClusterName)==-1){
                    //never seen this service before
                    var queueCluster = {};
                    clusterManagers = [];
                    queueCluster.name = queueClusterName;
                    clusterManagers.push(queueManager);
                    queueCluster.queueManagers = clusterManagers; 
                    if(queueClusterName.indexOf('SOA')!=-1){
                        queueClusterNames.unshift(queueClusterName);
                    }else{
                        queueClusterNames.push(queueClusterName);
                    }
                    queueClusters.push(queueCluster);
                }else{
                    //this means I have seen this queue before.
                    //find the cluster?
                    $.each(queueClusters, function(k, cluster){
                        matchName = cluster.name.toUpperCase();
                        if(matchName==queueClusterName){
                            //console.log(cluster);
                            cluster.queueManagers.push(queueManager);
                        }
                    });
                }
   			});
   			//store this locally so I can retrieve it later
   			//now create on ojject to store this in
   			var queueClusterObject = {};
   			queueClusterObject.clusters = queueClusters;
   			queueClusterObject.lastUpdated = Date.now();
   			
   			localStorage.setItem('queueClusters', JSON.stringify(queueClusterObject));
   			
   			populateComboBox(queueClusterObject,repeatFlag);
   			getAllQueuesByID(false, false, false);
  			console.timeEnd('getAllQueueManagers');
     })
     .fail(function(jqXHR, textStatus, errorThrown){
		console.log(jqXHR);
        hideLoadingBlock(-1);
        console.timeEnd('getAllQueueManagers');
        
     }
     
     );
}

function populateComboBox(queueClusters, repeatFlag){
    var selectedIndex = 0;
    $.each(queueClusters.clusters, function(k, clusterObj){
        if(clusterObj.name.indexOf('IMSOA')>-1){
            selectedIndex = k;
        }
    });
    //console.log(queueClusters);
    //console.log('selected:' + selected);
    $('#queueQuerySelector').children('option').remove();
    var selected = false;
    $.each(queueClusters.clusters, function(index, cluster){
        if(index==selectedIndex){
            selected = true;
        }else{
            selected = false;
        }
        var displayName = cluster.name;
        $('#queueQuerySelector')
            .append($("<option></option>")
            .attr("value",cluster.name)
            .attr("selected",selected)
            .text(displayName));
    });
    //console.log($('#queueQuerySelector'));
    $( "input[type=checkbox]" ).on( "click", uiFilterControlChanged );
    $( "#queueQuerySelector" ).change(uiFilterControlChanged );
}

function uiFilterControlChanged(){
    getAllQueuesByID(true, false, true);
}

function getAllQueuesByID(repeatFlag, timerCallFlag, uiControlChangedFlag){
    var retrievedObject = null;
    var retrievedObject = localStorage.getItem('queueClusters');
    var filterCluster = $('#queueQuerySelector :selected').val();
    var showNormalQueues = $("#showNormalQueues").is(':checked');
    var showSystemQueues = $("#showSystemQueues").is(':checked');
    var showExceptionQueues = $("#showExceptionQueues").is(':checked');
    var filterCluster = $('#queueQuerySelector :selected').val();
    //console.log('repeatFlag:' + repeatFlag);
    //console.log('timerCallFlag:' + timerCallFlag);
    //console.log('uiControlChangedFlag:' + uiControlChangedFlag);
    console.log('repeatFlag:' + repeatFlag + ', timerCallFlag:' + timerCallFlag + ', uiControlChangedFlag:' + uiControlChangedFlag);
    if(retrievedObject!=null){
        var queueClusters = JSON.parse(retrievedObject);    
    }else{
        var queueClusters = null;
    }
    //now I need to test this...
    if((queueClusters!=null)&&(queueClusters.lastUpdated!=null)&&(queueClusters.lastUpdated>52)){
        //this means that I have found a local object that I can use 
        if((queueClusters.clusters!=null)&&(queueClusters.clusters.length>0)){
            //this means we have a queue cluster with hopefully some queues
            var uiid = 'queuePerformanceData';
            if((!repeatFlag)&&(!timerCallFlag)&&(!uiControlChangedFlag)){
                
            }
            if((repeatFlag==true)&&(timerCallFlag!=true)){
                $('tbody#' + uiid+'TableBody').empty();    
            }else if(repeatFlag!=true){
                
                var htmlTableMsg = buildCAPMQueuePSTListTH();
                var divhtml = buildAccordionDivWithSearch(uiid,htmlTableMsg);
                $('div#' + uiid).html(divhtml);
                    
             }
            //empty the body even on repeat?
            
            
            //I have queues 
            var callIndex = 0;
            
            //now I want to apply filtering to the queue calls as the total calls is way too many
            //just get my filters from the UI for now
            var queueURLs = [];
            $.each(queueClusters.clusters, function(i, cluster){
                //so lets apply some filtering for the cluster
                if(filterCluster.toUpperCase()==cluster.name.toUpperCase()){
                    //console.log('Matched the selected');
                    $.each(cluster.queueManagers, function(k, queueManager){
                        var queueManagerName = queueManager.name;
                        //console.log('queueManager:' + queueManager);
                        $.each(queueManager.queues, function(l, queue){
                            var queueId = queue.id;
                            var queueName = queue.name;
                            //console.log('queueId:' + queueId);
                            queue.URL = 'http://compass-prod-web:8080/CompassWeb/GetObjects?action=doAttributes&other=PLACEHOLDER&id=' + queueId + '&env=e9&domain=Production&type=JSONP&start=-4h&end=now&&nocache=1520303312';
                            queue.parentManager = queueManagerName;
                            //now apply some filters on the queue?
                            if(showNormalQueues){
                                if(isNormalQueue(queue.name)){
                                    //console.log('showNormalQueuesOnly:' + showNormalQueuesOnly);
                                    queueURLs.push(queue);
                                }
                            }
                            if(showSystemQueues){
                                if(queue.name.indexOf('SYSTEM.')>-1){
                                    queueURLs.push(queue);
                                }
                            }
                            if(showExceptionQueues){
                                if(!(isNormalQueue(queue.name))){
                                    //console.log('showNormalQueuesOnly:' + showNormalQueuesOnly);
                                    queueURLs.push(queue);
                                }
                            }
                        });
                    });
                }
            });
            
            //now make the calls that I need....
            var callsRequired = queueURLs.length;
            
            $.each(queueURLs, function(i, queue){
                $.ajax({
                    'url': queue.URL,
                    'type': 'GET',
                    'dataType': 'jsonp',
                    'jsonp': 'callback',
                    'success': function (data){
                        getQueueByID(data, uiid, callIndex, callsRequired, queue.id, queue.parentManager, queue.name); 
                    }
                });
            });
            
            
            }else{
                alert('No queues Found at this time...');
            }
    }else{
        alert('No local data at this time...');
    }
}

function isNormalQueue(queueName){
    //nomral until proven otherwise....
    var isNormal = true;
    inStrFilteringArray = ['.ERROR', '.LOG', 'SYSTEM.', '.DEAD.LETTER', '.BACKOUT', '.RETRY', '.EXCEPTION', '.FAIL', '.BO'];
    
    if(queueName!=''){
        if(queueName.indexOf('.')==-1){
            //no dot in the queuename so is not valid
            return false
        }
        $.each(inStrFilteringArray, function(i, matchString){
            if(queueName.indexOf(matchString)!=-1){
                isNormal = false;
                return false
            }    
        });
        
    }
    return isNormal;
}


function getQueueByID(queueData, uiid, callNumber, totalCalls, uniqueID, qManager, qName){
    //console.log(queueData);
    //console.log(qManager);
    globalReturnCallsCount = globalReturnCallsCount + 1;
    var attrID = queueData.attributes.id;
    var objNamed = queueData.attributes.objectList['id_' + attrID];
    var fullName = objNamed.fullname;
    var queueManager = fullName.split('->',1)[0].trim();
    //get the UI values for now?
    
    

    if((queueData!=null)&&(queueData.rows!=null)&&(queueData.rows.length>1)&&(queueData.rows[0]!=null)&&(queueData.rows[0].q_max_depth_nr!=null)){
        $('#'+uiid+'SearchLabel').text(' ' + globalReturnCallsCount + ' of ' + totalCalls + ' calls made and number ' + callNumber + ' in the list.');
        var firstRow = queueData.rows[0];
        var secondRow = queueData.rows[0];
        pWait = convertMicroSeconds2Seconds(firstRow.avg_q_time_np_nr);
        npWait = convertMicroSeconds2Seconds(firstRow.avg_q_time_p_nr);
        pWait1 = convertMicroSeconds2Seconds(secondRow.avg_q_time_np_nr);
        npWait1 = convertMicroSeconds2Seconds(secondRow.avg_q_time_p_nr);
        maxQueueDepth = firstRow.q_max_depth_nr;
        minQueueDepth = firstRow.q_min_depth_nr;
        diffpWait = pWait - pWait1;   
        diffnpWait = npWait - npWait1;
        var status = 'UNRATED';
        var pWaitStatus = 'UNRATED';
        var npWaitStatus = 'UNRATED';
        var minQueueStatus = 'UNRATED';
        var maxQueueStatus = 'UNRATED';
        var minQueueCat = (minQueueDepth>1000);
        var minQueuePoor = (minQueueDepth>10);
        var minQueueFair = (minQueueDepth>2);
        var minQueueExcellent = (minQueueDepth==0);
        var pWaitCat = pWait>30;
        var npWaitCat = npWait>30;
        var pWaitPoor = pWait>0.5;
        var npWaitPoor = npWait>0.5;
        var pWaitFair = pWait>0.2;
        var npWaitFair = npWait>0.2;
        var pWaitGood = pWait>0.1;
        var npWaitGood = npWait>0.1;
        var pWaitVeryGood = pWait>0.001;
        var npWaitVeryGood = npWait>0.001;
        var pWaitExcellent = pWait>-1;
        var npWaitExcellent = npWait>-1;
        
        if(minQueueCat||pWaitCat||npWaitCat){
            status = statusOrders[0];
        }else if(minQueuePoor||pWaitPoor||npWaitPoor){
            status = statusOrders[1];
        }else if(minQueueFair||pWaitFair||npWaitFair){
            status = statusOrders[2];
        }else if(pWaitGood||npWaitGood){
            status = statusOrders[3];
        }else if(pWaitVeryGood||npWaitVeryGood){
            status = statusOrders[4];
        }else if(minQueueExcellent||pWaitExcellent||npWaitExcellent){
            status = statusOrders[5];
        }
        if(minQueueCat){minQueueStatus = statusOrders[0];}
        else if(minQueuePoor){minQueueStatus = statusOrders[1];}
        else if(minQueueFair){minQueueStatus = statusOrders[2];}
        else if(minQueueExcellent){minQueueStatus = statusOrders[5];};
        
        if(pWaitCat){pWaitStatus = statusOrders[0];}
        else if(pWaitPoor){pWaitStatus = statusOrders[1];}
        else if(pWaitFair){pWaitStatus = statusOrders[2];}
        else if(pWaitGood){pWaitStatus = statusOrders[3];}
        else if(pWaitVeryGood){pWaitStatus = statusOrders[4];}
        else if(pWaitExcellent){pWaitStatus = statusOrders[5];}
        
        if(npWaitCat){npWaitStatus = statusOrders[0];}
        else if(npWaitPoor){npWaitStatus = statusOrders[1];}
        else if(npWaitFair){npWaitStatus = statusOrders[2];}
        else if(npWaitGood){npWaitStatus = statusOrders[3];}
        else if(npWaitVeryGood){npWaitStatus = statusOrders[4];}
        else if(npWaitExcellent){npWaitStatus = statusOrders[5];}
        
        var rowStatus = calculateOverallStatus([minQueueStatus,pWaitStatus,npWaitStatus]);
        //console.log('status:' + status);
        var rowStatusRank = calculateOverallStatusRank(status);
        //console.log('rowStatusRank:' + rowStatusRank);
        //now I want to remove some formatting from cells
        //console.log('rowStatusRank:'+rowStatusRank);
        
        var sortValue = rowStatusRank + pWait + npWait;
        var sampleTimeRaw = firstRow.sampletime;
        var sampleTimeDate = new Date(+sampleTimeRaw);
        var sampleTime = getFormattedTime(sampleTimeDate);
        var nowTimeStamp = Date.now();
        var timeDiff = nowTimeStamp-sampleTimeRaw;
        var timeDiffSecs = Math.round(timeDiff/1000);
        
        var htmlMsg = '';
        htmlMsg+='<tr id="' + uniqueID + '" class="' + rowStatus + '" order="' + sortValue +'">';
        htmlMsg+='<td>';
        htmlMsg+=fancyTimeFormat(timeDiffSecs);
        htmlMsg+='</td>';
        htmlMsg+='<td>';
        htmlMsg+=qManager;
        htmlMsg+='</td>';
        htmlMsg+='<td>';
        htmlMsg+=qName;
        htmlMsg+='</td>';
        htmlMsg+='<td class="' + pWaitStatus.toLowerCase() + ' number">';
        htmlMsg+=pWait;
        htmlMsg+='</td>';
        htmlMsg+='<td class="' + npWaitStatus.toLowerCase() + ' number">';
        htmlMsg+=npWait;
        htmlMsg+='</td>';
        htmlMsg+='<td class="' + minQueueStatus.toLowerCase() + ' number">';
        htmlMsg+=minQueueDepth;
        htmlMsg+='</td>';
        htmlMsg+='<td class="' + maxQueueStatus.toLowerCase() + ' number">';
        htmlMsg+=maxQueueDepth;
        htmlMsg+='</td>';
        htmlMsg+='<td class="' + status.toLowerCase() + ' status">';
        htmlMsg+=status;
        htmlMsg+='</td>';
        htmlMsg+='</tr>';
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
                if (Number(sortValue) > Number($(Element).attr('order'))) {
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
    //console.log('globalReturnCallsCount:' + globalReturnCallsCount + ' is not greater or equal to totalCalls:' + totalCalls); 
    if(globalReturnCallsCount>=totalCalls){
        globalReturnCallsCount = 0;
        delay(function(){
            getAllQueuesByID(true, true, false);
        }, 30000 ); // end delay
    } 
}

function calculateOverallStatus(arrayOfStatus){
    $.each(arrayOfStatus, function(index, status){
        $.each(statusOrders, function(k, orderedStatus){
            if(orderedStatus==status.toUpperCase()){
                return orderedStatus;
            }
        });
    });
    return 'UNRATED';
}
function calculateOverallStatusRank(status){
    var reverseStatusRank = statusOrders.indexOf(status);
    return statusOrders.length-reverseStatusRank;
}


function buildCAPMQueuePSTListTH(){
    var thHTML = '<th width="5%">Last Call</th>';
    thHTML += '<th width="20%">Queue</th>';
    thHTML += '<th width="20%">Name</th>';
    thHTML += '<th width="10%">Wait Persistent (secs)</th>';
    thHTML += '<th width="10%">Wait Non-Persistent (secs)</th>';
    thHTML += '<th width="10%">Min Depth</th>';
    thHTML += '<th width="10%">Max Depth</th>';
    thHTML += '<th width="10%">STATUS</th>';
    return thHTML;
}
