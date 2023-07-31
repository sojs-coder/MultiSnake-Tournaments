const AWS = require("aws-sdk");
AWS.config.update({
    region: "us-west-2",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

class DBManager {
    constructor() {
        this.TABLE_NAME = "multisnake";
        const DynamoDB = new AWS.DynamoDB();
        this.dynamoClient = new AWS.DynamoDB.DocumentClient();
        this.schema = {
            "uid": "string",
            "username": "string",
            "email": "string",
            "gamesPlayed": "Integer",
            "gamesWon": "Integer",
            "passwordHash": "string",
            "verified": "boolean",
            "yearBorn": "Integer",
            "api_keys": "String[]"
        }
    }
    async isVerified(uid) {
        const params = {
            TableName: this.TABLE_NAME,
            Key: {
                uid
            },
            ProjectionExpression: "verified"
        };

        try {
            const data = await this.dynamoClient.get(params).promise();
            const isVerified = data.Item.verified;
            return isVerified === true;
        } catch (err) {
            console.log(err);
        }
    }
    async getDataByEmail(email) {
        const params = {
            TableName: this.TABLE_NAME,
            IndexName: "email-index",
            ExpressionAttributeValues: {
                ":e": email
            },
            KeyConditionExpression: "email = :e"
        };
        try {
            const data = await this.dynamoClient.query(params).promise();
            return data;
        } catch (err) {
            console.log(err);
        }
    }
    async getUser(uid) {
        const params = {
            TableName: this.TABLE_NAME,
            Key: {
                uid
            }
        };

        try {
            const data = await this.dynamoClient.get(params).promise();
            return data.Item;
        } catch (err) {
            console.log(err);
        }
    }
}


const dbManager = new DBManager();
module.exports = {
    dbManager
}
