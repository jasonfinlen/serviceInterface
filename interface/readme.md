# The Service Repository Interface

The interface is simply static html5 single page set up that requires a simple web server. 
Web servers on windows are everywhere. Apache has several installers and a bunch others but is bloaty, ngnix is OK but has issues restarting on windows.  
To run the node apps you need npm so you might as well use it to get the http-serve module as a light weight server with zero config (maybe a port!).


 - Down load and install node (10.15.3) as this also comes with npm. 
 - `npm i -g http-serve` to make it globally available. 
Run a command line and cd into the git repository location serviceinterface\serviceRepository\src\main\resources
 - `cd C:\git\BAU\si3\serviceinterface\serviceRepository\src\main\resources`
Create an environment file (js) so the UI knows what router URL to use...
 - `echo var routerURL = 'http://%computername%:3001'; > C:\git\BAU\si3\serviceinterface\serviceRepository\src\main\resources\.env`
Now start the http server and use a port other than 80,80. I use 3002 
 - `http-serve -d -p 3002`
Its important to start this server at one level above the index.html so if you want to supply a path make sure its to serviceRepository\src\main\resources where the .env file lives as the browser cant load it outside. 
You should be right to navigate to http://localhost:3002/interface/index.html and see your page. %computername% should also work. 
If you use Visual Studio I like this technique...
Open Visual Studio and Use Open folder to open the folder to the serviceinterface\serviceRepository\src\main\resources\interface directory. 
This gives you access to all the source code to edit and a launch configuration for debug sessions. It doesnt give you a http session though. 
Use the terminal tab at the bottom and the terminal should start you at the interface directory. Mine is C:\git\BAU\si3\serviceinterface\serviceRepository\src\main\resources\interface. 
From here you can do the following steps....
`echo "var routerURL = 'http://localhost:3001';" > ../.env`
`http-serve ../ -p 3002`
This should start the http server correctly. the vscode launch file is setup to use it like this. 
Got to debug mode and click launch program. 

