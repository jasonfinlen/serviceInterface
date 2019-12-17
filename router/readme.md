# The Service Repository middle man
This relies on the parse having already created all the files im interested in. 

## Installation and Setup
 - Install nodejs for windows
 - `cd C:\git\BAU\si3\serviceinterface\serviceRepository\src\main\resources\router`
 - `npm init`
 - `npm i express` (used heavily to routhe the requests to the right area)
 - `npm i cors` (required so anyone can call the app.get)
 - `npm i socket.io` (will be used to ping the middle ware that a new parse has occured)
 - `npm i numeral` (Used to format and parse numbers easily)
 - `npm i moment` (Used to have control over the now statement and have dates in UTC format)
 - `npm i performance-now` (Used to get better control over performance markers, like console.time but better)
 - `npm i winston` (Used for logging)
 
Copy the data files you want to 
serviceRepository/src/main/serviceRepositorySite/ (WINSCP from the main server is the best way) Dont worry as this has been added to the git .gitignore file
create a data folder for the parser mkdir C:\git\BAU\si3\serviceinterface\serviceRepository\src\main\resources\parser\data (also in .gitignore)
 

