const express = require('express');
const multer = require('multer');
const upload = multer({ dest: '/home/gl_jupyter/submissions/' });
const app = express();
const { exec } = require('child_process');
const { spawn } = require('child_process');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
const port = 3015;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.get('/notebook', (req, res) => {
    // gljpc/notebooks/notebook.ipynb
    const token = req.query.token;
    res.send(`
      <iframe src="http://localhost:8888/gljpc/notebooks/notebook.ipynb?token=${token}" width="100%" height="500px"></iframe>
    `);
});

// Write an API to get notebook file and dataset file from request and run the notebook server using the dataset file and notebook file
app.post('/run-notebook', upload.any(), (req, res) => {
    let notebookFile;
    let datasetFile;

    for (let i = 0; i < req.files.length; i++) {
        if (req.files[i].fieldname === 'notebookFile') {
            notebookFile = req.files[i];
        } else if (req.files[i].fieldname === 'datasetFile') {
            datasetFile = req.files[i];
        }
    }

    console.log('Notebook File path:', notebookFile.path);
    console.log('Dataset File path:', datasetFile.path);

    console.log('Running the Jupyter notebook server...');
    exec('id -u gl_jupyter', (error, stdout, stderr) => {
        if (error) {
            // User does not exist, create it
            exec('adduser --disabled-password --gecos "" gl_jupyter', (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        } else {
            // User exists, log a message
            console.log('User gl_jupyter already exists');
        }

        // Proceed with creating directory and changing ownership
        exec('cd /home/gl_jupyter/ && mkdir -p submissions && chown -R gl_jupyter:gl_jupyter submissions', (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    });

    function copyFile(sourcePath, destinationPath, fileName, res) {
        console.log(`Copying the ${fileName} to ${destinationPath} directory...`);
        exec(`cp ${sourcePath} ${destinationPath}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Failed to copy ${fileName}: ${error.message}`);
                res.status(500).json({ status: 'Error', message: error.message });
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    }

    copyFile(datasetFile.path, '/home/gl_jupyter/submissions/dataset.csv', 'dataset file', res);
    copyFile(notebookFile.path, '/home/gl_jupyter/submissions/notebook.ipynb', 'notebook file', res);

    // const notebookServer = spawn('/usr/bin/sudo -u gl_jupyter env -i jupyter', ['notebook', '--ip=*', '--allow-root', '--port=8888', `--NotebookApp.notebook_dir='/home/gl_jupyter/submissions'`, `--NotebookApp.default_url=/notebooks/notebook.ipynb`]);
    const notebookServer = spawn('jupyter', ['notebook', '--ip=*', '--allow-root', '--port=8888', `--NotebookApp.notebook_dir='/home/gl_jupyter/submissions'`, `--NotebookApp.default_url=/notebooks/notebook.ipynb`]);

    const notebookServerPid = notebookServer.pid;
    console.log(`Jupyter notebook server PID: ${notebookServerPid}`);

    notebookServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
        const output = data.toString();
        if (output.includes('The Jupyter Notebook is running at')) {
            res.json({ status: 'OK' });
        }
    });

    notebookServer.stderr.on('data', (data) => {
        console.error(`stderr notebook: ${data}`);
        // res.status(500).json({ status: 'Error', message: `stderr notebook: ${data}` });
    });

    notebookServer.on('error', (error) => {
        console.error(`Failed to start Jupyter notebook server: ${error.message}`);
        res.status(500).json({ status: 'Error', message: error.message });
    });

    notebookServer.on('close', (code) => {
        console.log(`Jupyter notebook server exited with code ${code}`);
    });

    res.json({ status: 'OK' });
});

app.post('/stop-notebook', (req, res) => {
    console.log('Request body:', req.body);
    console.log('Request body:', JSON.stringify(req.body));
    
    const port = req.body.port;
    console.log(`Stopping Jupyter notebook server on port ${port}...`);

    const stopServer = spawn('jupyter', ['notebook', 'stop', port]);

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
        res.json({ status: 'OK' });
    });
});


app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
