const express = require('express');
const multer = require('multer');
const upload = multer({ dest: '/home/gl_user/submissions/' });
const app = express();
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const spawn = require('child_process').spawn;
const bodyParser = require('body-parser');
const os = require('os');
const archiver = require('archiver');
const fs = require('fs');

const username = os.userInfo().username;
console.log('Username:', username);
app.use(bodyParser.json());
const port = 3015;


app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.get('/notebook', (req, res) => {
    const token = req.query.token;
    const initialTime = new Date().toString();

    res.send(`
        <style>
            body {
                padding: 20px;
                font-family: Arial, sans-serif;
            }
            #timer, #absolute-time {
                margin-bottom: 10px;
                font-size: 18px;
                font-weight: bold;
                color: #333;
            }
            #submit-button {
                background-color: #4CAF50; /* Green */
                border: none;
                color: white;
                padding: 15px 32px;
                text-align: center;
                text-decoration: none;
                display: inline-block;
                font-size: 16px;
                margin: 4px 2px;
                cursor: pointer;
            }
        </style>
        <div id="timer">Last Active Before: 0 seconds ago</div>
        <div id="absolute-time">Last Active At: ${initialTime}</div>

        <button id="submit-button">Submit Notebook</button>
        <iframe src="http://localhost:8888/notebooks/notebook.ipynb?token=${token}" width="100%" height="500px"></iframe>
        <script>
            // Initialize the last active time
            var lastActiveTime = Date.now();

            // Update the timer div with the last active time every second
            setInterval(function () {
                var idleTime = Math.floor((Date.now() - lastActiveTime) / 1000);
                document.getElementById('timer').textContent = 'Last Active Before: ' + idleTime + ' seconds ago';
            }, 1000);  

            document.getElementById('submit-button').addEventListener('click', function () {
                // Send a message to the iframe
                var iframe = document.getElementsByTagName('iframe')[0];
                iframe.contentWindow.postMessage('Submit notebook', '*');

                // Call the submit API
                fetch('/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username: 'girish', port: '8888' }) // Replace 'username' and '8888' with the actual username and port
                })
                .then(response => response.blob())
                .then(blob => {
                    var url = window.URL.createObjectURL(blob);
                    var a = document.createElement('a');
                    a.href = url;
                    a.download = 'submissions.zip';
                    document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
                    a.click();    
                    a.remove();  //afterwards we remove the element again         
                });
            });

            
            // Add an event listener for messages from the iframe
            window.addEventListener('message', function(event) {
                // Check the origin of the message
                if (event.origin !== 'http://localhost:8888') {
                    return;
                }

                // Process the message
                console.log('Received message from Jupyter notebook:', event.data);

                // Check if the message indicates that there was activity in the child window
                if (event.data.startsWith("Last activity time: ")) {
                    // Update the last active time
                    lastActiveTime = Date.now();

                    // Update the absolute time div with the absolute time of the last activity
                    var absoluteTime = new Date(lastActiveTime).toString();
                    document.getElementById('absolute-time').textContent = 'Last Active At: ' + absoluteTime;
                }
            }, false);
        </script>
    `);
});

// Write an API to get notebook file and dataset file from request and run the notebook server using the dataset file and notebook file
app.post('/run-notebook', upload.any(), async (req, res) => {
    const username = req.body.username;

    if (!username) {
        res.status(400).json({ status: 'Error', message: 'Username must be provided' });
        return;
    }

    const { notebookFile, datasetFile } = handleFileUpload(req);

    try {
        validateFileUpload(notebookFile, datasetFile);
        console.log('Notebook File path:', notebookFile.path);
        console.log('Dataset File path:', datasetFile.path);

        await createUser(username);
        await createDirectoryAndChangeOwnership(username, `/home/${username}/submissions`);
        await copyFile(datasetFile.path, `/home/${username}/submissions/dataset.csv`, 'dataset file', username);
        await copyFile(notebookFile.path, `/home/${username}/submissions/notebook.ipynb`, 'notebook file', username);
        await createDirectoryAndChangeOwnership(username, `/home/${username}/.jupyter`);
        await createDirectoryAndChangeOwnership(username, `/home/${username}/.jupyter/custom`);
        await copyFile('/root/.jupyter/custom/custom.js', `/home/${username}/.jupyter/custom/custom.js`, 'Jupyter custom config', username);
        await copyFile('/root/.jupyter/jupyter_notebook_config.py', `/home/${username}/.jupyter/jupyter_notebook_config.py`, 'Jupyter notebook config', username);
        await trustNotebook(username);
        console.log('Notebook trusted successfully');

        await startJupyterServer(username);
        console.log('Jupyter server started successfully');


        res.json({ status: 'OK' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: 'Error', message: error.message });
    }

});

app.post('/stop-notebook', (req, res) => {
    console.log('Request body:', req.body);
    console.log('Request body:', JSON.stringify(req.body));

    const port = req.body.port;
    const username = req.body.username;
    if (!port) {
        res.status(400).json({ status: 'Error', message: 'Port must be provided' });
        return;
    }

    if (!username) {
        res.status(400).json({ status: 'Error', message: 'Username must be provided' });
        return;
    }

    console.log(`Stopping Jupyter notebook server on port ${port} for user ${username}...`);

    const stopServer = spawn('/usr/bin/sudo', [
        '-u', username, 'jupyter',
        'notebook', 'stop', port
    ]);

    stopServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    stopServer.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    stopServer.on('error', (error) => {
        console.error(`Error occurred while trying to stop Jupyter notebook server: ${error.message}`);
        res.status(500).json({ status: 'Error', message: `Error occurred while trying to stop Jupyter notebook server: ${error.message}` });
    });

    stopServer.on('close', (code) => {
        console.log(`Jupyter notebook server stopped with code ${code}`);
        if (code === 0) {
            res.json({ status: 'OK' });
        } else {
            res.status(500).json({ status: 'Error', message: `Failed to stop Jupyter notebook server. Exit code: ${code}` });
        }
    });

});


app.post('/submit', (req, res) => {
    const username = req.body.username;
    const port = req.body.port;

    if (!username) {
        res.status(400).json({ status: 'Error', message: 'Username must be provided' });
        return;
    }

    const directoryPath = `/home/${username}/submissions`;
    const output = fs.createWriteStream(`${username}_submissions.zip`);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    });

    archive.on('error', function (err) {
        throw err;
    });

    archive.pipe(output);
    archive.directory(directoryPath, false);
    archive.finalize();

    console.log(`Stopping Jupyter notebook server on port ${port} for user ${username}...`);

    const stopServer = spawn('/usr/bin/sudo', [
        '-u', username, 'jupyter',
        'notebook', 'stop', port
    ]);

    stopServer.on('close', async (code) => {
        console.log(`Jupyter notebook server stopped with code ${code}`);
        if (code === 0) {
            // const userDeleted = await deleteUser(username);
            // if (userDeleted) {
            res.sendFile(`${__dirname}/${username}_submissions.zip`);
            // } else {
            //     res.sendFile(`${__dirname}/${username}_submissions.zip`);
            //     res.status(500).json({ status: 'Error', message: `Failed to delete user ${username}` });
            // }
        } else {
            res.status(500).json({ status: 'Error', message: `Failed to stop Jupyter notebook server. Exit code: ${code}` });
        }
    });

});

app.get('/list-notebooks', async (req, res) => {
    const username = req.query.username;
    if (!username) {
        res.status(400).json({ status: 'Error', message: 'Username must be provided' });
        return;
    }

    try {
        console.log('username:', username);
        const { stdout, stderr } = await exec(`sudo -u ${username} jupyter notebook list`);
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            if (stderr.includes('unknown user')) {
                res.status(400).json({ status: 'Error', message: `The provided username '${username}' does not exist on the system.` });
            } else {
                res.status(500).json({ status: 'Error', message: stderr });
            }
            return;
        }
        console.log(`stdout: ${stdout}`);
        res.json({ status: 'OK', data: stdout });
    } catch (error) {
        console.error(`Failed to list Jupyter notebook servers: ${error.message}`);
        res.status(500).json({ status: 'Error', message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});

// Function to handle file uploads
function handleFileUpload(req) {
    let notebookFile;
    let datasetFile;

    for (let i = 0; i < req.files.length; i++) {
        if (req.files[i].fieldname === 'notebookFile') {
            notebookFile = req.files[i];
        } else if (req.files[i].fieldname === 'datasetFile') {
            datasetFile = req.files[i];
        }
    }

    return { notebookFile, datasetFile };
}

// Function to validate file uploads
function validateFileUpload(notebookFile, datasetFile) {
    if (!notebookFile) {
        throw new Error('Notebook file not provided');
    }
    if (!datasetFile) {
        throw new Error('Dataset file not provided');
    }
}


async function createUser(username) {
    try {
        await exec(`id -u ${username}`);
        console.log(`User ${username} already exists`);
    } catch (error) {
        console.log(`User ${username} does not exist, creating...`);
        await exec(`sudo adduser --disabled-password --gecos "" ${username}`);
        console.log(`User ${username} created`);
    }
}

async function createDirectoryAndChangeOwnership(username, directory) {
    try {
        await exec(`mkdir -p ${directory} && sudo chown -R ${username}:${username} ${directory}`);

        console.log('Directory created and ownership changed');
    } catch (error) {
        throw new Error(`Failed to create directory or change ownership: ${error.message}`);
    }
}

async function startJupyterServer(username) {
    return new Promise((resolve, reject) => {

        const additionalParams = [
            '--NotebookApp.tornado_settings={"headers": {"Content-Security-Policy": "frame-ancestors \'self\' *"}}'
        ];

        const notebookServerParams = [
            '-u', username, 'env', '-i',
            'JUPYTER_CONFIG_DIR=/home/' + username + '/.jupyter',
            'jupyter',
            'notebook', '--ip=*',
            '--NotebookApp.notebook_dir=/home/' + username + '/submissions',
            '--NotebookApp.default_url=/notebooks/notebook.ipynb',
            '--NotebookApp.trust_xheaders=True'
        ]
            .concat(additionalParams);

        const notebookServer = spawn('/usr/bin/sudo', notebookServerParams);

        const successMsg = 'To access the notebook, open this file in a browser:';

        notebookServer.stderr.on('data', (data) => {
            console.debug(`Notebook: ${data}`);
            if (data.includes(successMsg)) {
                console.log('Jupyter notebook server started successfully');
                resolve();
            }
        });

        notebookServer.stdout.on('data', (data) => {
            console.debug(`Notebook: ${data}`);
            if (data.includes(successMsg)) {
                console.log('Jupyter notebook server started successfully');
                resolve();
            }
        });

        notebookServer.on('error', (error) => {
            console.error(`Failed to start Jupyter notebook server: ${error.message}`);
            reject(error);
        });

        notebookServer.on('close', (code) => {
            console.log(`Jupyter notebook server exited with code ${code}`);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Jupyter notebook server exited with code ${code}`));
            }
        });
    });
}

async function trustNotebook(username) {
    return new Promise((resolve, reject) => {
        const trustNotebookParams = [
            '-u', username,
            'JUPYTER_CONFIG_DIR=/home/' + username + '/.jupyter',
            'jupyter',
            'trust', '/home/' + username + '/submissions/notebook.ipynb'
        ];

        const trustNotebook = spawn('/usr/bin/sudo', trustNotebookParams);

        trustNotebook.on('close', (code) => {
            console.log(`Trusted notebook exited with code ${code}`);
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Trusted notebook exited with code ${code}`));
            }
        });

        trustNotebook.stderr.on('data', (data) => {
            console.error(`Trust notebook: ${data}`);
        });

        trustNotebook.stdout.on('data', (data) => {
            console.log(`Trust notebook: ${data}`);
        });
    });
}

async function copyFile(sourcePath, destinationPath, fileName, username) {
    console.log(`Copying the ${fileName} to ${destinationPath} directory...`);
    try {
        const { stdout, stderr } = await exec(`cp ${sourcePath} ${destinationPath} && sudo chown ${username}:${username} ${destinationPath}`);
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    } catch (error) {
        throw new Error(`Failed to copy ${fileName}: ${error.message}`);
    }
}

async function deleteUser(username) {
    const { stdout, stderr } = await exec(`sudo userdel -r ${username}`);
    if (stderr) {
        console.error(`Error deleting user: ${stderr}`);
    } else {
        console.log(`Deleted user: ${stdout}`);
    }
}