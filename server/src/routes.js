import * as rowController from './controllers/rowController.js';
import * as reportController from './controllers/reportController.js';
import * as tableController from './controllers/tableController.js';



export function registerRoutes(app) {

    //MainPage
    app.get('/', (req, res) => res.json({ok: true}));

    //Session
    //app.post('/session', sessionContoller.)
    //app.post('/session/:id/query')
    //app.post('/session/:id/stop')

    //Auth
    //app.post('/auth/register', (req, res) => res.json({message: 'register'}));
    //app.post('/auth/login', (req, res) => res.json({message: 'login'}));
    //app.post('/auth/refresh', (req, res) => res.json({message: 'refresh'}));
    //app.post('/auth/logout', (req, res) => res.json({message: 'logout'}));

    //Users
    //app.get('/users/me', (req, res) => res.json({message: 'get me'}));
    //app.get('/users/:id', (req, res) => res.json({message: 'get user', id: req.params.id}));
    //app.patch('/users/:id', (req, res) => res.json({message: 'update user', id: req.params.id}));
    //app.delete('/users/:id', (req, res) => res.json({message: 'delete user', id: req.params.id}));

    //Tables
    app.get('/tables',tableController.list);
    app.get('/tables/:tableName', rowController.list, reportController.list);
    app.post('/tables', tableController.create);
    app.delete('/tables/:tableName', tableController.remove)

    //Rows
    app.get('/tables/:tableName/rows', rowController.list);
    app.get('/tables/:tableName/rows/:rowId', rowController.get);
    app.post('/tables/:tableName/rows', rowController.create);
    app.put('/tables/:tableName/rows/:filterColumn/:filterValue', rowController.replace);
    app.delete('/tables/:tableName/rows/:filterColumn/:filterValue', rowController.remove);

    //Reports
    app.post('/tables/:tableName/reports', reportController.create);
    app.get('/tables/:tableName/reports', reportController.list);
    app.get('/tables/:tableName/reports/:reportId/status', reportController.status);
    app.get('/tables/:tableName/reports/:reportId/download', reportController.download);
    app.delete('/tables/:tableName/reports/:reportId', reportController.remove)

    //Optional
    //app.get('/tables/:tableId/permissions', (req, res) => res.json({message: 'get permissions'}));
}
