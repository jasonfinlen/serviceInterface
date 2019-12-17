var domains = ['Alert', 
'BusinessService', 
'Casemanagement', 
'Citizenship', 
'Clearance', 
'Container', 
'Correspondence', 
'Health', 
'Identity', 
'InformationRecord', 
'Integration', 
'IntegrationAdaptor',
'Notification', 
'NotificationAdaptor', 
'OnlineAccount', 
'Orchestration', 
'Party', 
'PassengerCard',
'Referral', 
'Technical', 
'Visa', 
'WorkManagement'];

function getServiceConfig(serviceName, serviceVersion, serviceDomain) {
	// in this function we basically need to build a list
	// of soap actions which are associated with the input
	// data. we check the wsdl, datapower gateway config
	// and any transformations.
	
	var soapActions = [];
	
	// add soap actions defined in wsdl files
	soapActions = getWsdlSoapActions(serviceName, serviceVersion, serviceDomain);

	// add soap actions which are mapped in transformations
	soapActions = soapActions.concat(getTransformMappedSoapActions(soapActions));

	// add soap actions which are mapped in gateway config
	soapActions = soapActions.concat(getGatewayMappedSoapActions(soapActions));

    // add soap actions which map root elements in transformations
	soapActions = soapActions.concat(
	       getTransformMappedElements(serviceName, serviceVersion, serviceDomain, soapActions));
	
	// filter out any duplicates
    soapActions = soapActions.unique();
    //console.log(soapActions);
    
	// we now have the soap actions which means we can marry this 
	// up to the data power routing configuration. 
	var serviceConfigs = [];
	$.each(soapActions, function(i, soapAction) {	
		soapAction = soapAction.replace('http://', 'http_//'); //XSLT2JSON Fix
		
		var domain = soapAction.split('/')[4]; //grab domain from soap action
		
		if(domains.indexOf(domain) != -1) {
			var domainConfig = getDomainConfig(domain); 
			
			// match on the soap action
			var serviceConfig = JSON.search(domainConfig, 
					"//Service[MsgIdentifier/Action/*[1]='" + soapAction + "']");	
			serviceConfigs = serviceConfigs.concat(serviceConfig);
		}
	});
	
	console.log('Matched [' + serviceConfigs.length + '] service configuration(s).');

	return serviceConfigs;
}

function getWsdlSoapActions(serviceName, serviceVersion, serviceDomain) {
	var wsdlVer = 'V' + serviceVersion.toFixed(0) + '_0';       // eg: V1_0
	var wsdlSvcElement = 'msg_' + wsdlVer + '_' + serviceName;  // eg: msg_V1_0_ValidateVisaApplication
	
	var wsdlConfig = getDomainWsdl(serviceDomain);

	var wsdlMsgs = JSON.search(wsdlConfig, 
			"//wsdl_message[wsdl_part/element='" + wsdlSvcElement + "'" +
					" or wsdl_part/element='" + wsdlSvcElement + "Request'" +
					" or wsdl_part/element='" + wsdlSvcElement + "Response']");

	// now we attempt to marry the wsdl message definition up with 
	// their associated operation(s). in a typical scenario there 
	// would be 1 operation for sync services and 2 operations for
    // async services. alternative scenarios you may see more 
	// operations due to different versioning or multiple providers.
	var portOperations = [];
	$.each(wsdlMsgs, function(i, wsdlMsg) {
		var portOperation = JSON.search(wsdlConfig,
				"//wsdl_portType/wsdl_operation[.//message='tns_" + wsdlMsg.name +"']");

		// add each operation to the list, but ignore duplicates
		$.each(portOperation, function(j, operation) {
			if(portOperations.indexOf(operation) < 0) {
				portOperations = portOperations.concat(operation);
			}
		});
	});

	// now we attempt to marry the port operation up with a binding 
	// operation. here we grab the soap actions which can be used
    // to lookup service policy configs in the datapower xml.
	var bindingOperations = [];
	$.each(portOperations, function(i, portOperation) { 
		var bindingOperation = JSON.search(wsdlConfig,
				"//wsdl_binding/wsdl_operation[name='" + portOperation.name + "']");
		bindingOperations = bindingOperations.concat(bindingOperation);
	});

	var soapActions = JSON.search(bindingOperations, 
			"//soap_operation/soapAction");
	
	console.log('Found [' + soapActions.length + '] wsdl defined soap action(s).');

	return soapActions;
}

function getGatewayMappedSoapActions(wsdlActions) {
	// it's possible for an action to be matched on the gateway and then
	// mapped into another action. this is common on integration adaptor
	// services. here we look for action mappings, both to and from 
	// a given action.
	var soapActions = [];
	var gatewayConfig = getGatewayConfigs();
	$.each(wsdlActions, function(i, soapAction) {
		soapAction = soapAction.replace('http_//', 'http://'); //XSLT2JSON Fix
		
		var mapToActions = JSON.search(gatewayConfig,
				"//Service[Destination/HTTPEndpoint/Addressing/Action/*[1]='" + soapAction + "']/MsgIdentifier/Action/*[1]");
		soapActions = soapActions.concat(mapToActions);

		var mapFromActions = JSON.search(gatewayConfig, 
				"//Service[MsgIdentifier/Action/*[1]='" + soapAction + "']/Destination/HTTPEndpoint/Addressing/Action/*[1]");
		soapActions = soapActions.concat(mapFromActions);
	});
	
	console.log('Found [' + soapActions.length + '] gateway mapped soap action(s).');

	return soapActions;
}

function getTransformMappedSoapActions(soapActions) {
	var allTransformMaps = getAllTransformationMaps();

	var transformMaps = [];
	$.each(soapActions, function(i, soapAction) {
		soapAction = soapAction.replace('http://', 'http_//'); // XSLT2JSON Fix
		
		var mapToAction = JSON.search(allTransformMaps, 
				"//TransformMap[MapFromAction='" + soapAction + "']/MapToAction");
		transformMaps = transformMaps.concat(mapToAction);

		var mapFromAction = JSON.search(allTransformMaps, 
				"//TransformMap[MapToAction='" + soapAction + "']/MapFromAction");
		transformMaps = transformMaps.concat(mapFromAction);
	});
	
	console.log('Found [' + transformMaps.length + '] transform mapped soap action(s).');
    
	return transformMaps;
}

function getTransformMappedElements(serviceName, serviceVersion, serviceDomain, soapActions) {
	var namespace = 'http://www.immi.gov.au';
	namespace += '/' + 'Namespace';
	namespace += '/' + serviceDomain;
	namespace += '/' + 'Service';
	namespace += '/' + 'V' + serviceVersion + '.0'; 

	var allTransformMaps = getAllTransformationMaps();
	
	var mappedElementActions = JSON.search(allTransformMaps, 
	   "//TransformMap[" +
	         "(MapFromElement/*[1]='" + serviceName + "Request' and MapFromNamespace/*[1]='" + namespace + "') or " +
	         "(MapToElement/*[1]='" + serviceName + "Request' and MapToNamespace/*[1]='" + namespace + "') or " +
	         "(MapFromElement/*[1]='" + serviceName + "Response' and MapFromNamespace/*[1]='" + namespace + "') or " +
	         "(MapToElement/*[1]='" + serviceName + "Response' and MapToNamespace/*[1]='" + namespace + "') or " +
	         "(MapFromElement/*[1]='" + serviceName + "' and MapFromNamespace/*[1]='" + namespace + "') or " +
	         "(MapToElement/*[1]='" + serviceName + "' and MapToNamespace/*[1]='" + namespace + "')]/ServiceIdentifier/*[1]");

	var transformMaps = [];
	$.each(mappedElementActions, function(i, mappedElementAction) {
		transformMaps = transformMaps.concat(mappedElementAction.replace('http:', 'http_'));
	});
 
	console.log('Found [' + transformMaps.length + '] transform element mapped soap action(s).');

	return transformMaps;
}

function getAllTransformationMaps() {

	var allTransformMaps;
	$.ajax({
        type:'GET',
        url: 'TransformMaps.json',
		async: false,
        success : function(data){
            allTransformMaps = data;
        }, 
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
		     allTransformMaps = [];
		}
    });

	return allTransformMaps;
}

function getSoapActionElements(soapActions) {
	
	var soapActionElements = [];
	$.each(soapActions, function(i, soapAction) {
		//soapAction = soapAction.replace('http_//', 'http://'); //XSLT2JSON Fix
		var domain = soapAction.split('/')[4]; //grab domain from soap action
		
		// here we traverse backwards from a soap action to find
		// it's associated messages. this is the opposite of the
		// getWsdlSoapActions() method.
		if(domains.indexOf(domain) != -1) {
			var wsdlConfig = getDomainWsdl(domain); 

			var bindingOperation = JSON.search(wsdlConfig,
					"//wsdl_binding/wsdl_operation[soap_operation/soapAction='" + soapAction + "']/name");

			var portMessages = JSON.search(wsdlConfig,
					"//wsdl_portType/wsdl_operation[name='" + bindingOperation[0] +"']//message");

			$.each(portMessages, function(j, portMessage) {
				// not interested in acknowledgements or errors
				if(portMessage.indexOf('EnterpriseErrors') == -1 &&
					portMessage.indexOf('Acknowledgement') == -1) {
					
					portMessage = portMessage.replace('tns_', '');

					var messageElement = JSON.search(wsdlConfig, 
							"//wsdl_definitions/wsdl_message[name='" + portMessage + "']/wsdl_part/element");
							
					soapActionElements = soapActionElements.concat(messageElement);
				}
			});
		}
	});
	
	return soapActionElements;
}

function getDomainWsdl(serviceDomain) {
	var filePath = '';
	//filePath += '/enterpriseServices';
	//filePath += '/' + globalRelease;
	filePath += getSelectedRelease().releaseLocation;
	filePath += '/' + serviceDomain;
	filePath += '/' + 'WSDL';
	filePath += '/' + 'V1.0';
	filePath += '/' + serviceDomain.replace('PersonIdentity', 'Identity') + '_Services_Interface.json';

	var wsdlConfig;
	$.ajax({
        type:'GET',
        url: filePath,
		async: false,
        success : function(data){
            wsdlConfig = data;
        },
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
		     wsdlConfig = [];
		}
    });
	
	return wsdlConfig;
}	
	
function getDomainConfig(serviceDomain) {
	var filePath = '';
	//filePath += '/enterpriseServices';
	//filePath += '/' + globalRelease
	filePath += getSelectedRelease().releaseLocation;
	filePath += '/' + 'dp/local/ondisk/ESB_Services/config';
	filePath += '/' + serviceDomain + '_Services_Proxy_V1_ServiceConfig.json';
	//console.log('filePath');
	//console.log(filePath);
	var domainConfig;
	$.ajax({
        type:'GET',
        url: filePath,
		async: false,
        success : function(data){
            domainConfig = data.ServiceConfig;
        },
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
		     domainConfig = [];
		}
    });
	
	return domainConfig;
}

function getGatewayConfigs() {
	var fileDirectory = '';
	//fileDirectory += '/enterpriseServices';
	//fileDirectory += '/' + globalRelease
	fileDirectory += getSelectedRelease().releaseLocation;
	fileDirectory += '/' + 'dp/local/ondisk/ESB_Gateway/config';
	
	var requestConfig = fileDirectory + '/' + 'ESB_Gateway_V1_RequestConfig.json';
	var notifyConfig = fileDirectory + '/' + 'ESB_Gateway_V1_NotificationConfig.json';
	
	var gatewayConfig;
	$.ajax({
        type:'GET',
        url: requestConfig,
		async: false,
        success : function(data){
            gatewayConfig = data.GatewayConfig;
        },
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
		     gatewayConfig = [];
		}
    });

	$.ajax({
        type:'GET',
        url: notifyConfig,
		async: false,
        success : function(data){
            gatewayConfig = $.extend(gatewayConfig, data.GatewayConfig);
        },
		error: function(XMLHttpRequest, textStatus, errorThrown) { 
		     gatewayConfig = [];
		}
    });
	
	return gatewayConfig;
}