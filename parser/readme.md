# The Service Repository Backend Parser


## Installation and Setup
 - Install nodejs for windows
 - `cd C:\git\BAU\si3\serviceinterface\serviceRepository\src\main\resources\parser`
 - `npm init`
 - `npm i express` (only used tfor a touch file app.get proxy)
 - `npm i cors` (required so anyone can call the app.get)
 - `npm i socket.io` (will be used to ping the middle ware that a new parse has occured)
 - `npm i showdown` (Used to read the readme.md files that are located everywhere)
 - `npm i numeral` (Used to format and parse numbers easily)
 - `npm i moment` (Used to have control over the now statement and have dates in UTC format)
 - `npm i performance-now` (Used to get better control over performance markers, like console.time but better)
 - `npm i winston` (Used for logging)
 - `npm i got` (Used for to make http requests work)
 - `npm install` (Preps everything as root to be used later)
 - `npm install pkg` (This isnt used by the app but used to package the app)

You will need a few directories, files and env files setup as these do not live in source code control....Samples are there as .sampleenv but...
Have a look at the .sampleEnv file in source code control. The basic settings are:
PARSER_PORT=3000
ROUTER_PORT=3001
PARSER_HOSTURL=http://U7019997
ROUTER_HOSTURL=http://U7019997
TOUCH_FILE=c:\Apps\serviceRepo\config\touch.file
RELEASE_FILE=c:\Apps\serviceRepo\config\releases.json
DATA_DIR=c:\Apps\serviceRepo\data
REPO_SITE_DIR=c:\Apps\serviceRepo\serviceRepositorySite
LOGS_DIR=c:\Apps\serviceRepo\logs
LOGS_ENCODING=ucs2`

For these next steps get a cmd window open and create a base directory..
`cd C:`
`mkdir c:\Apps\serviceRepo`
Make a directory for some config files file (I add the touch file here as well for testing
`mkdir c:\Apps\serviceRepo\config`
`echo empty > c:\Apps\serviceRepo\config\touch.file`
Make a directory for the data files that parser will write out
`mkdir c:\Apps\serviceRepo\data`
Make a directory for the log files
`mkdir c:\Apps\serviceRepo\log`
Make a directory for the raw ServiceRepository branch files
`mkdir c:\Apps\serviceRepo\serviceRepositorySite`


Now make a home for the env file and the binaries. 
`mkdir c:\Apps\serviceRepo\bin`
Make an empty environment file
`echo empty > c:\Apps\serviceRepo\bin\.env`
Open this file up in your favourite editor. 
Set the environment properties from above. 
PARSER_PORT=usually 3000 but can be anything...avoiding 80,8080,8090
ROUTER_PORT=usually 3001 but can be anything...avoiding 80,8080,8090 and especially PARSER_PORT when on the same machine
PARSER_HOSTURL=Can be http://localhost but better to get your hostname (on cmd type `hostname` to get it)
ROUTER_HOSTURL=Can be http://localhost but better to get your hostname (on cmd type `hostname` to get it)
TOUCH_FILE=Can be any file but we use the one we created above (c:\Apps\serviceRepo\config\touch.file)
RELEASE_FILE=This is the releases.json data file. We created a config directory for it above (c:\Apps\serviceRepo\config\releases.json)
DATA_DIR=Anywhere that has enough room. I few MB will be OK but 1Gb is better (c:\Apps\serviceRepo\data)
REPO_SITE_DIR=Anywhere that has enough room. I few MB will be OK but 1Gb is better (c:\Apps\serviceRepo\serviceRepositorySite)
LOGS_DIR=Anywhere that has enough room. I few MB will be OK but 1Gb is better (c:\Apps\serviceRepo\logs)
LOGS_ENCODING= usc2 for windows and utf8 for linux

Here is a command that will create this with my settings as above if that makes life easier for you if you created the structure above.
`cd c:\Apps\serviceRepo\bin && echo PARSER_PORT=3021>.env&&echo ROUTER_PORT=3022>>.env&&echo PARSER_HOSTURL=http://%computername%>>.env&&echo ROUTER_HOSTURL=http://%computername%>>.env&&echo TOUCH_FILE=c:\Apps\serviceRepo\config\touch.file>>.env&&echo RELEASE_FILE=c:\Apps\serviceRepo\config\releases.json>>.env&& echo DATA_DIR=c:\Apps\serviceRepo\data>>.env&& echo REPO_SITE_DIR=c:\Apps\serviceRepo\serviceRepositorySite>>.env&& echo LOGS_DIR=c:\Apps\serviceRepo\logs>>.env&& echo LOGS_ENCODING=ucs2>>.env`
Now copy the serviceRepositorySite down locally as a start point.
Using WINSCP logon onto fdclstvci367.s2.linux.stratus.vlab and navigate to the /var/www/html/eis/serviceRepositorySite folder and copy every folder (branch named) to c:\Apps\serviceRepo\serviceRepositorySite.
Copy the releases.json data from the git repo serviceinterface\serviceRepository\src\main\resources\releases.json to c:\Apps\serviceRepo\config\releases.json (you can also point the env file to git but its a bad practice as you might only want a subset of releases.)
Finally, create a touch file that can be used as a reload mech. In the env file settings above create an empty file as `c:\Apps\serviceRepo\config\touch.file`. This command can be adapted as required...
`echo Touche>c:\Apps\serviceRepo\config\touch.file`. Yes I know its not empty....

You should be OK to now build (using pkg) each binary, add it to the `c:\Apps\serviceRepo\bin` location if you want to but this wont allow debugging. If you need it then cd into each of the homes for parser and router and run `npm run winpkg`. You can edit this to your own configuration in the relative package.json files but the basic command this runs is `pkg app.js --target node10-win-x64 --output c:\\Apps\\serviceRepo\\bin\\router.exe` and `pkg app.js --target node10-win-x64 --output c:\\Apps\\serviceRepo\\bin\\parser.exe`


## Server Side setup
You have to install all the dependancies and each time a new one is add also install it as well
sudo su (root login must be used)
 - `cd /home/ciservertesting/eis_uploads/ServiceInterface3/router'
 - `npm i express -g`
 - `npm i cors -g`
 - `npm i socket.io -g`
 - `npm i showdown -g`
 - `npm i numeral -g`
 - `npm i moment -g`
 - `npm i performance-now -g`
 - `npm i winston -g`
 - `npm i bson -g`
 - `npm i got -g`
 - `npm i node-schedule -g`
 - `npm i pkg -g`
 
 - `npm install` (Preps everything as root to be used later)
 - `chmod 777 -R /home/ciservertesting/eis_uploads` (Root as the ownership after install so reset so everyone get delete)
 



