const serverless = require('serverless-http');
const bodyParser = require('body-parser');

const express = require('express');
const app = express();

const AWS = require('aws-sdk');

const USERS_TABLE = process.env.USERS_TABLE;

const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000',
    accessKeyId: 'DEFAULT_ACCESS_KEY',  // needed if you don't have aws credentials at all in env
    secretAccessKey: 'DEFAULT_SECRET' // needed if you don't have aws credentials at all in env
  })
  console.log(dynamoDb);
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
};

app.use(bodyParser.json({ strict: false }));

app.get('/api', function (req, res) {
  res.send('Hello World!')
})

app.get('/api/:id', function (req, res) {
  const { id } = req.params;
  res.send(`You ask for "${id}" item`)
})

// Get Users endpoint
app.get('/users', function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Select: "ALL_ATTRIBUTES",
  }

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not get users' });
    } else {
      console.log("Get Users succeeded:", JSON.stringify(result, null, 2));
      res.json(result['Items']);
    }
  });
})

// Get User endpoint
app.get('/users/:userId', function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  }

  dynamoDb.get(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not get user' });
    }
    if (result.Item) {
      const {userId, userName} = result.Item;
      res.json({ userId, userName });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });
})

// Create User endpoint
app.post('/users', function (req, res) {
  const { userId, userName } = req.body;
  if (typeof userId !== 'string') {
    console.log(userId);
    res.status(400).json({ error: `${userId} must be a string` });
  } else if (typeof userName !== 'string') {
    res.status(400).json({ error: '"userName" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      userName: userName,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create user' });
    }
    res.json({ userId, userName });
  });
})

// Update User endpoint
app.put('/users/:userId', function (req, res) {
  const { userId, userName } = req.body;

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
    UpdateExpression: 'set userName = :r',
    ExpressionAttributeValues: {
      ':r': userName,
    },
    ReturnValues: "UPDATED_NEW"
  };

  dynamoDb.update(params, function (err, result) {
    if (err) {
      console.log("err", err);
      res.status(400).json({ error: 'Could not update user' });
    } else {
      console.log("result", result);
      res.send(`Updated username! ${result.Attributes.userName}.`);
    }
  });
})


// Delete User endpoint
app.delete('/users/:userId', function (req, res) {

  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  dynamoDb.delete(params, (error, data) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not delete user' });
    }
    console.log("Successfully deleted!", data);
    res.send('Deleted!');
  });
})

module.exports.handler = serverless(app);
