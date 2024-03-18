const express = require('express');
const multer = require('multer');
const upload = multer({ dest: '/home/gl_user/submissions/' });
const app = express();
// const { exec } = require('child_process');
// const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const spawn = require('child_process').spawn;

const bodyParser = require('body-parser');
const os = require('os');

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
    res.send(`
      <iframe src="http://localhost:8888/notebooks/notebook.ipynb?token=${token}" width="100%" height="500px"></iframe>
    `);
});


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

async function createDirectoryAndChangeOwnership() {
    try {
        await exec('mkdir -p /home/gl_user/submissions && sudo chown -R gl_user:gl_user /home/gl_user/submissions');
        console.log('Directory created and ownership changed');
    } catch (error) {
        throw new Error(`Failed to create directory or change ownership: ${error.message}`);
    }
}

async function startJupyterServer() {
    const successMsg = 'To access the server, open this file in a browser:';
    return new Promise((resolve, reject) => {

        // Additional parameters to be passed to the notebook server command
        const additionalParams = [
            '--NotebookApp.tornado_settings={"headers": {"Content-Security-Policy": "frame-ancestors \'self\' *"}}'
        ];

        // Concatenate the additional parameters with the existing parameters
        const notebookServerParams = [
            '-u', 'gl_user', 'env', '-i', 'jupyter',
            'notebook', '--ip=*', '--port=8888',
            '--NotebookApp.notebook_dir=/home/gl_user/submissions',
            '--NotebookApp.default_url=/notebooks/notebook.ipynb'
        ].concat(additionalParams);

        const notebookServer = spawn('/usr/bin/sudo', notebookServerParams);


        // const notebookServer = spawn('/usr/bin/sudo', [
        //     '-u', 'gl_user', 'env', '-i', 'jupyter',
        //     'notebook', '--ip=*', '--port=8888',
        //     '--NotebookApp.notebook_dir=/home/gl_user/submissions',
        //     '--NotebookApp.default_url=/notebooks/notebook.ipynb'
        // ]);

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


// Write an API to get notebook file and dataset file from request and run the notebook server using the dataset file and notebook file
app.post('/run-notebook', upload.any(), async (req, res) => {
    let notebookFile;
    let datasetFile;

    for (let i = 0; i < req.files.length; i++) {
        if (req.files[i].fieldname === 'notebookFile') {
            notebookFile = req.files[i];
        } else if (req.files[i].fieldname === 'datasetFile') {
            datasetFile = req.files[i];
        }
    }

    if (notebookFile && datasetFile) {
        console.log('Notebook File path:', notebookFile.path);
        console.log('Dataset File path:', datasetFile.path);
    } else {
        if (!notebookFile) {
            console.error('Notebook file not provided');
        }
        if (!datasetFile) {
            console.error('Dataset file not provided');
        }
        res.status(400).json({ status: 'Error', message: 'Both a notebook file and a dataset file must be provided' });
        return;
    }

    console.log('Notebook File path:', notebookFile.path);
    console.log('Dataset File path:', datasetFile.path);

    copyFile(datasetFile.path, '/home/gl_user/submissions/dataset.csv', 'dataset file', res);
    copyFile(notebookFile.path, '/home/gl_user/submissions/notebook.ipynb', 'notebook file', res);

    try {
        await createUser('gl_user');
        await createDirectoryAndChangeOwnership();
        await copyFile(datasetFile.path, '/home/gl_user/submissions/dataset.csv', 'dataset file');
        await copyFile(notebookFile.path, '/home/gl_user/submissions/notebook.ipynb', 'notebook file');
        await startJupyterServer();
        res.json({ status: 'OK' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: 'Error', message: error.message });
        return;
    }
});

async function copyFile(sourcePath, destinationPath, fileName) {
    console.log(`Copying the ${fileName} to ${destinationPath} directory...`);
    try {
        const { stdout, stderr } = await exec(`cp ${sourcePath} ${destinationPath}`);
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    } catch (error) {
        throw new Error(`Failed to copy ${fileName}: ${error.message}`);
    }
}

app.post('/stop-notebook', (req, res) => {
    console.log('Request body:', req.body);
    console.log('Request body:', JSON.stringify(req.body));

    const port = req.body.port;
    console.log(`Stopping Jupyter notebook server on port ${port}...`);

    const stopServer = spawn('/usr/bin/sudo', [
        '-u', 'gl_user', 'jupyter',
        'notebook', 'stop', port
    ]);


    stopServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    stopServer.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    stopServer.on('error', (error) => {
        console.error(`Failed to stop Jupyter notebook server: ${error.message}`);
        res.status(500).json({ status: 'Error', message: error.message });
    });

    stopServer.on('close', (code) => {
        console.log(`Jupyter notebook server stopped with code ${code}`);
        if (code === 0) {
            res.json({ status: 'OK' });
        }
        res.status(500).json({ status: 'Error', message: `Jupyter notebook server stopped with code ${code}` });
    });
});


app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
