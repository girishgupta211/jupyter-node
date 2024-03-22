// This is a custom.js file for Jupyter notebook

// This code will be executed when the notebook is loaded
$(document).ready(function () {
    // Log a message to the console
    console.log("Jupyter notebook has loaded custom.js");

    // Add a hidden textarea to the notebook container
    $("#notebook-container").append('<textarea style="display: none" id="custom-textarea" />');

    // Disable pointer events for the notebook name and the IPython notebook
    $("#notebook_name, #ipython_notebook").css("pointer-events", "none");

    // var inactivityTimer;
    // // var longRunningTimer;
    // var inactivityAlertTime = 60000; // Time in milliseconds, 60000ms = 1 minute
    // // var longRunningAlertTime = 200000; // Time in milliseconds, 200000ms = 2 minutes

    //     // longRunningTimer = setTimeout(function () {
    //     //     // Alert the user
    //     //     alert("A code cell has been running for 2 minutes");

    //     //     // Log a message to the console
    //     //     console.log("Long running code cell in Jupyter notebook");

    //     //     // Send a message to the parent window
    //     //     if (window.parent) {
    //     //         window.parent.postMessage("Long running code cell in Jupyter notebook", "*");
    //     //     }
    //     // }, longRunningAlertTime);

    // });
    var inactivityTimer;
    var lastActivityTime = Date.now();
    var inactivityAlertTime = 60000; // Time in milliseconds, 60000ms = 1 minute
    var debounceTimer;

    // Debounce function
    function debounce(func, wait) {
        return function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(func, wait);
        }
    }

    // Reset the timer and update the last activity time whenever there's activity in the notebook
    $(document).on('mousemove keypress click scroll', function () {
        clearTimeout(inactivityTimer);
        lastActivityTime = Date.now();
        inactivityTimer = setTimeout(function () {
            // Check if a code cell is executing
            if (Jupyter.notebook.kernel_busy) {
                console.log("Code cell is executing");
                return;
            }

            // Calculate the idle time
            var idleTime = Date.now() - lastActivityTime;

            // Alert the user
            alert("No activity detected in the Jupyter notebook for " + (idleTime / 1000) + " seconds");

            // Log a message to the console
            console.log("No activity in Jupyter notebook");

            // Send a message to the parent window
            if (window.parent) {
                window.parent.postMessage("No activity in Jupyter notebook for " + (idleTime / 1000) + " seconds", "*");
            }
        }, inactivityAlertTime);

        // Debounce the sending of the last activity time to the parent window
        debounce(function () {
            if (window.parent) {
                window.parent.postMessage("Last activity time: " + lastActivityTime, "*");
            }
        }, 5000)(); // Debounce time is 5000ms = 5 seconds
    });

});

define(["base/js/namespace", "base/js/promises"], function (Jupyter, promises) {

    function disableFileMenu() {
        // Log the start of the function
        console.log('Disabling file menu...');

        // Select the File menu
        console.log('Selecting file menu...');
        var fileMenu = $('#filelink');

        // If the File menu is found, remove it
        if (fileMenu.length > 0) {
            console.log('File menu found, removing...');
            fileMenu.parent().remove();
        } else {
            console.log('File menu not found');
        }

        // Remove the 'f' shortcut from command mode
        console.log('Removing command shortcut...');
        Jupyter.notebook.keyboard_manager.command_shortcuts.remove_shortcut('f');

        // Remove the 'f' shortcut from edit mode
        console.log('Removing edit shortcut...');
        Jupyter.notebook.keyboard_manager.edit_shortcuts.remove_shortcut('f');
    }

    promises.notebook_loaded.then(function () {
        console.log('Notebook loaded...');
        Jupyter.notebook.set_autosave_interval(10000);
        if (Jupyter.notebook !== undefined) {
            setTimeout(disableFileMenu, 1000);  // Delay execution by 1 second
        }
    });
});

