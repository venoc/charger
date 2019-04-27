'use strict';
var Hub = require('./myHub.class');
var hub;
var express = require('express'),
    router = express.Router(),
    bodyParser = require('body-parser'),
    swaggerUi = require('swagger-ui-express'),
    swaggerDocument = require('./swagger.json');
var cors = require('cors');
var app = express();
app.use(cors());
/*
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});*/

const init = () => {
    hub = new Hub();
    hub.init();
}
init();
//rest API requirements
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
//ATLCDIHJPUGEDTJ9KUPORLRJKKMQZXIFMAUBILPQWZ9YVMAPTDOWPHLHTEZCBLXOJERCOINVAQ9FAMTCD
//
/*{
  "seed": "SEED99999999999999999999999999999999999999999999999999999999999999999999999999999",
  "to": "BZO9PCMSVOQ9ZRZXPCAOJOAVCMLFZPTZGJZUQ9GLXJSGOCCAKBNKDJACYNO9PGKKOMJDNO9NAQWBWVCGD",
  "value": "10",
  "tag": "TEST",
  "message": "string"
}*/
const transfer = (req, res, next) => {
    console.log(JSON.stringify(req.body));
    hub.transfer(req.body.seed, req.body.to, req.body.value, req.body.tag, req.body.message).then(result => {
        res.send(result);
    }).catch(err => {
        res.send("err: " + err);
    });
};

const getBalanceOfSeed = (req, res) => {
    hub.getBalanceOfSeed(req.query.seed).then(result => {
        res.send(""+result);
    }).catch(err => {
        res.send("err: " + err);
    });
};

const getBalance = (req, res) => {
    hub.getBalance(req.query.address).then(result => {
        res.send("" + result[0]);
    }).catch(err => {
        res.send("err: " + err);
    });
};

const MAMInit = (req, res) => {
    hub.MAMInit(req.query.key).then(result => {
        res.send(result);
    }).catch(err => {
        res.send("err: " + err);
    });
}

const mamSend = (req, res, next) => {
    console.log("MAM");
    console.log(JSON.stringify(req.body));
    console.log(req.body);
    hub.mamSend(req.body.mamState, req.body.msg).then(result => {
        res.send(result);
    }).catch(err => {
        res.status(400).send("err: " + err);
    });
}
const mamFetch = (req, res, next) => {
    hub.mamFetch(req.query.root, req.query.key).then(result => {
        res.send(result);
    }).catch(err => {
        res.send("err: " + err);
    });
}

const getAddress = (req, res) => {
    hub.getNewAddress(req.query.seed, req.query.index, 1).then(result => {
        res.send(result[0]);
    }).catch(err => {
        res.send("err: " + err);
    });
};






router.route('/transfer')
    .post(transfer)
router.route('/getBalance')
    .get(getBalance)
router.route('/getAddress')
    .get(getAddress)
router.route('/mamInit')
    .post(MAMInit)
router.route('/mamSend')
    .post(mamSend)
router.route('/mamFetch')
    .get(mamFetch)
router.route('/getBalanceOfSeed')
    .get(getBalanceOfSeed)


/* router.route('/users/:name')
    .get(tschau); */


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/', router);

app.listen(3000);
module.exports = app;
