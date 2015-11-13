#Tyria 3D Library
Tyria 3D Library is an open source javascript library aimed at accessing and interpreting data from Guild Wars 2 .dat files.

As you can tell this project is just published and I will hopefully spend some time on writing more and better examples,
and updating the documentation pretty soon! If you have any questions, feedback or suggestions feel free to contact me
at tyria3d@gmail.com


##Examples
There are two exmaple applications in the examples folder. I sugest looking at the source of index.html in exmaples/ModelRenderer first!


**IMPORTANT** Note that the application in the examples folder run on their own pre-built libraries that **will not**
be updated when re-building the library!


##Building the library
This project uses gulp browserify for building the output. I'm sorry if the current package.json is bloated with 
unnecessary dependecies.

###Usage:

``npm install``
``gulp formats``
``gulp``

###Building documentation
This project uses YUIDoc for javadoc-ish documentation creation.
See http://yui.github.io/yuidoc/

Usage:
``npm -g install yuidocjs``
``yuidoc``