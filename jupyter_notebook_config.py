# Configuration file for jupyter-notebook.
c = get_config()  #noqa
print("Loading jupyter_notebook_config.py")
print(c)
c.ServerApp.base_url = '/' 
c.ServerApp.terminals_enabled = False
c.ServerApp.tornado_settings = {                                         
     'headers': {                                                              
         'Content-Security-Policy': "frame-ancestors 'self' *"
     }                                                                        
  }

c.NotebookNotary.db_file = ':memory:'
